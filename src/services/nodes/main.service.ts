import {Getter, inject} from "@loopback/core";
import {repository} from "@loopback/repository";
import {WorkflowInstancesRepository, WorkflowOutputsRepository} from "../../repositories";
import {APIService} from './api.service';
import {CaseService} from "./case.service";
import {CRMService} from './crm.service';
import {IngestionService} from "./ingestion.service";
import {IteratorService} from './iterator.service';
import {NotificationService} from "./notification.service";
import {TimeService} from './time.service';
import {VariableService} from './variable.service';
import {WaitService} from './wait.service';
import {WebhookService} from './webhook.service';

export class Main {
  constructor(
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowOutputsRepository)
    public workflowOutputsRepository: WorkflowOutputsRepository,
    @inject('services.IngestionService')
    private ingestionService: IngestionService,
    @inject('services.NotificationService')
    private notificationService: NotificationService,
    @inject('services.CaseService')
    private caseService: CaseService,
    @inject.getter('services.WebhookService')
    private getWebhookService: Getter<WebhookService>,
    @inject('services.APIService')
    private apiService: APIService,
    @inject('services.VariableService')
    private variableService: VariableService,
    @inject('services.IteratorService')
    private iteratorService: IteratorService,
    @inject.getter('services.TimeService')
    private getTimeService: Getter<TimeService>,
    @inject.getter('services.WaitService')
    private getWaitService: Getter<WaitService>,
    @inject('services.CRMService')
    private crmService: CRMService,
  ) { }

  // Register available services
  async servicesMapper() {
    const webhookService = await this.getWebhookService();
    const timeService = await this.getTimeService();
    const waitService = await this.getWaitService();
    return [
      {nodeType: "ingestion", service: this.ingestionService.ingestion.bind(this.ingestionService)},
      {nodeType: "notification", service: this.notificationService.notification.bind(this.notificationService)},
      {nodeType: "case", service: this.caseService.caseFunction.bind(this.caseService)},
      {nodeType: "webhook", service: webhookService.webhookTrigger.bind(webhookService)},
      {nodeType: "api", service: this.apiService.api.bind(this.apiService)},
      {nodeType: "variable", service: this.variableService.setVariables.bind(this.variableService)},
      {nodeType: "iterator", service: this.iteratorService.iterator.bind(this.iteratorService)},
      {nodeType: "timeTrigger", service: timeService.timeTriggerNode.bind(timeService)},
      {nodeType: "waitTrigger", service: waitService.waitService.bind(waitService)},
      {nodeType: "crm", service: this.crmService.crm.bind(this.crmService)},
    ];
  }

  async executeNode(
    node: any,
    workflowBlueprint: any,
    nodesData: any[],
    outputData: any[],
    currentRunningWorkflowInstance: any,
    outputId: string
  ) {
    const servicesArray = await this.servicesMapper();

    const serviceDef = servicesArray.find(
      (item) => item.nodeType === node.type
    );
    if (!serviceDef)
      throw new Error(`No service mapped for nodeType: ${node.type}`);

    const nodeConfig = workflowBlueprint?.bluePrint?.find(
      (item: any) => item.id === node.id
    );

    const result: any = await serviceDef.service(
      nodeConfig,
      outputData,
      currentRunningWorkflowInstance,
      outputId
    );

    outputData.push({
      nodeId: node.id,
      nodeName: node.name,
      type: node.type,
      output: result,
    });

    return result;
  }

  async executeDecisionNode(
    node: any,
    workflowBlueprint: any,
    nodesData: any[],
    outputData: any[],
    currentRunningWorkflowInstance: any,
    outputId: string
  ) {
    const servicesArray = await this.servicesMapper();

    const caseNodeIds = workflowBlueprint?.edges
      .filter((edge: any) => edge.source === node.id)
      .map((edge: any) => edge.target);

    let caseResultNodeId: string | null = null;
    for (const caseId of caseNodeIds) {
      const caseNode = nodesData.find((n: any) => n.id === caseId);
      if (!caseNode) continue;

      const serviceDef = servicesArray.find(
        (item) => item.nodeType === caseNode.type
      );
      if (!serviceDef)
        throw new Error(`No service mapped for nodeType: ${caseNode.type}`);

      const caseNodeConfig = workflowBlueprint?.bluePrint?.find(
        (item: any) => item.id === caseId
      );

      const result: any = await serviceDef.service(
        caseNodeConfig,
        outputData,
        currentRunningWorkflowInstance,
        outputId
      );

      outputData.push({
        nodeId: caseNode.id,
        nodeName: caseNode.name,
        output: result,
      });

      if (result?.input?.success === true || result?.data?.success === true) {
        caseResultNodeId = caseNode.id;
        break;
      }
    }

    // Trace path from the successful case
    let nextNodeId = caseResultNodeId;
    while (nextNodeId) {
      const edge = workflowBlueprint?.edges.find((e: any) => e.source === nextNodeId);
      if (!edge) break;

      const nextNode = nodesData.find((n: any) => n.id === edge.target);
      if (!nextNode) break;

      if (nextNode.type === 'decision') {
        // 🌀 Recursive call for nested decision
        await this.executeDecisionNode(
          nextNode,
          workflowBlueprint,
          nodesData,
          outputData,
          currentRunningWorkflowInstance,
          outputId
        );
      } else {
        // Normal node execution
        await this.executeNode(
          nextNode,
          workflowBlueprint,
          nodesData,
          outputData,
          currentRunningWorkflowInstance,
          outputId
        );
      }

      nextNodeId = edge.target;
    }
  }

  async main(outputId: string) {
    try {
      const workflowOutput = await this.workflowOutputsRepository.findById(outputId);
      const currentRunningWorkflowInstance =
        await this.workflowInstancesRepository.findById(workflowOutput.workflowInstancesId, {
          include: [
            {
              relation: "workflow",
              scope: {include: [{relation: "workflowBlueprint"}]},
            },
          ],
        });

      if (!currentRunningWorkflowInstance) {
        return {
          message: "No workflow instance found",
        };
      }

      // Run each workflow instance sequentially
      let executionResult: any = {};
      const workflow = (currentRunningWorkflowInstance as any).workflow;
      const workflowBlueprint = workflow?.workflowBlueprint;

      const nodesData = workflowBlueprint?.nodes ?? [];
      const outputData: Array<{
        nodeId: string;
        nodeName: string;
        output: any;
        error?: string;
      }> = [];

      let waitNodeEncountered = false;
      // Sequential execution of nodes
      for (const node of nodesData) {
        try {
          if (node.type === 'decision') {
            await this.executeDecisionNode(
              node,
              workflowBlueprint,
              nodesData,
              outputData,
              currentRunningWorkflowInstance,
              outputId
            );
            break;
          } else {
            await this.executeNode(
              node,
              workflowBlueprint,
              nodesData,
              outputData,
              currentRunningWorkflowInstance,
              outputId
            );

            if (node.type === 'waitTrigger') {
              console.log('wait node encountered');
              waitNodeEncountered = true;
              break;
            }
          }
        } catch (err: any) {
          outputData.push({
            nodeId: node.id,
            nodeName: node.name,
            output: null,
            error: err.message,
          });
          break;
        }
      }

      if (waitNodeEncountered) {
        executionResult = {
          workflowInstanceId: currentRunningWorkflowInstance.id,
          status: outputData.some((n) => n.error) ? "failed" : "completed",
          results: outputData,
        };

        await this.workflowOutputsRepository.updateById(outputId, {status: 3});
      } else {
        executionResult = {
          workflowInstanceId: currentRunningWorkflowInstance.id,
          status: outputData.some((n) => n.error) ? "failed" : "completed",
          results: outputData,
        };

        await this.workflowOutputsRepository.updateById(outputId, {status: executionResult.status === "completed" ? 1 : 0});
      }
      return {
        message: "Workflow execution finished",
      };
    } catch (error) {
      await this.workflowOutputsRepository.updateById(outputId, {status: 2});
      throw error;
    }
  }

  async executeFromNode(nodeId: string, blueprint: object[], nodes: object[], edges: object[], outputData: object[], instance: object, outputId: string) {
    const node: any = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;

    if (node.type === 'decision') {
      await this.executeDecisionNode(node, blueprint, nodes, outputData, instance, outputId);
    } else {
      await this.executeNode(node, blueprint, nodes, outputData, instance, outputId);
    }

    // Check if it’s a wait/time node
    if (node.type === 'wait' || node.type === 'timeTrigger') {
      console.log(`🕒 Workflow paused at ${node.type} node`);
      return; // stop further execution
    }

    // Continue to next connected nodes
    const nextEdges = edges.filter((e: any) => e.source === node.id);
    for (const edge of nextEdges as any[]) {
      await this.executeFromNode(edge.target, blueprint, nodes, edges, outputData, instance, outputId);
    }
  }

  async resumeWorkflow(outputId: string, resumeNodeId: string, previousOutputs: any[]) {
    const workflowOutput = await this.workflowOutputsRepository.findById(outputId);
    const instance: any = await this.workflowInstancesRepository.findById(workflowOutput.workflowInstancesId, {
      include: [{relation: "workflow", scope: {include: [{relation: "workflowBlueprint"}]}}],
    });

    const blueprint = instance.workflow?.workflowBlueprint;
    const nodes = blueprint?.nodes ?? [];
    const edges = blueprint?.edges ?? [];
    const outputData = [...previousOutputs];

    const nextNodeId = edges.find((edge: any) => edge.source === resumeNodeId).target;

    console.log('flow restarted', nextNodeId);

    await this.executeFromNode(nextNodeId, blueprint, nodes, edges, outputData, instance, outputId);

    await this.workflowOutputsRepository.updateById(outputId, {status: 1});
    console.log("✅ Workflow resumed and continued successfully");
  }
}
