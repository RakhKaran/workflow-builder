import {Getter, inject} from "@loopback/core";
import {repository} from "@loopback/repository";
import {WorkflowInstancesRepository, WorkflowOutputsRepository} from "../../repositories";
import {APIService} from './api.service';
import {CaseService} from "./case.service";
import {IngestionService} from "./ingestion.service";
import {NotificationService} from "./notification.service";
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
  ) { }

  // Register available services
  async servicesMapper() {
    const webhookService = await this.getWebhookService();

    return [
      {nodeType: "ingestion", service: this.ingestionService.ingestion.bind(this.ingestionService)},
      {nodeType: "notification", service: this.notificationService.notification.bind(this.notificationService)},
      {nodeType: "case", service: this.caseService.caseFunction.bind(this.caseService)},
      {nodeType: "webhook", service: webhookService.webhookTrigger.bind(webhookService)},
      {nodeType: "api", service: this.apiService.api.bind(this.apiService)},
    ];
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
      let executionResult = {};
      const workflow = (currentRunningWorkflowInstance as any).workflow;
      const workflowBlueprint = workflow?.workflowBlueprint;

      const nodesData = workflowBlueprint?.nodes ?? [];
      const outputData: Array<{
        nodeId: string;
        nodeName: string;
        output: any;
        error?: string;
      }> = [];

      // Sequential execution of nodes
      for (const node of nodesData) {
        try {
          const servicesArray = await this.servicesMapper();
          if (node.type === 'decision') {
            // 1️⃣ Get all case node IDs from edges
            const caseNodeIds = workflowBlueprint?.edges
              .filter((edge: any) => edge.source === node.id)
              .map((edge: any) => edge.target);

            // 2️⃣ Execute each case node
            let caseResultNodeId: string | null = null;
            for (const caseId of caseNodeIds) {
              const caseNode = nodesData.find((n: any) => n.id === caseId);
              if (!caseNode) continue;

              const serviceDef = servicesArray.find(
                (item) => item.nodeType === caseNode.type
              );
              if (!serviceDef) throw new Error(`No service mapped for nodeType: ${caseNode.type}`);

              const caseNodeConfig = workflowBlueprint?.bluePrint?.find(
                (item: any) => item.id === caseId
              );

              const result: any = await serviceDef.service(caseNodeConfig, outputData, currentRunningWorkflowInstance, outputId);

              outputData.push({
                nodeId: caseNode.id,
                nodeName: caseNode.name,
                output: result,
              });

              // If the case returns true, we will trace this path
              console.log('result', result?.input);
              if (result?.input?.success === true) {
                caseResultNodeId = caseNode.id;
                break; // Stop after first true case
              }
            }

            // 3️⃣ Trace next nodes based on edges from the true case
            let nextNodeId = caseResultNodeId;
            console.log('nextNodeId', nextNodeId);
            while (nextNodeId) {
              console.log('nextNodeId', nextNodeId);
              const edge = workflowBlueprint?.edges.find((e: any) => e.source === nextNodeId);
              if (!edge) break;

              const nextNode = nodesData.find((n: any) => n.id === edge.target);
              if (!nextNode) break;

              const serviceDef = servicesArray.find(
                (item) => item.nodeType === nextNode.type
              );
              if (!serviceDef) throw new Error(`No service mapped for nodeType: ${nextNode.type}`);

              const nextNodeConfig = workflowBlueprint?.bluePrint?.find(
                (item: any) => item.id === nextNode.id
              );

              const result: any = await serviceDef.service(nextNodeConfig, outputData, currentRunningWorkflowInstance, outputId);

              outputData.push({
                nodeId: nextNode.id,
                nodeName: nextNode.name,
                output: result,
              });

              nextNodeId = nextNode.id;
            }

            continue;
          }

          // Normal execution for non-decision nodes
          const serviceDef = servicesArray.find(
            (item) => item.nodeType === node.type
          );
          if (!serviceDef) {
            throw new Error(`No service mapped for nodeType: ${node.type}`);
          }

          const nodeConfig = workflowBlueprint?.bluePrint?.find(
            (item: any) => item.id === node.id
          );

          const result: any = await serviceDef.service(nodeConfig, outputData, currentRunningWorkflowInstance, outputId);

          outputData.push({
            nodeId: node.id,
            nodeName: node.name,
            output: result,
          });
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

      executionResult = {
        workflowInstanceId: currentRunningWorkflowInstance.id,
        status: outputData.some((n) => n.error) ? "failed" : "completed",
        results: outputData,
      };

      await this.workflowOutputsRepository.updateById(outputId, {status: 1});
      return {
        message: "Workflow execution finished",
      };
    } catch (error) {
      await this.workflowOutputsRepository.updateById(outputId, {status: 2});
      throw error;
    }
  }
}
