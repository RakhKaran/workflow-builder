import { repository } from "@loopback/repository";
import { WorkflowInstancesRepository } from "../../repositories";
import { IngestionService } from "./ingestion.service";
import { inject } from "@loopback/core";
import { NotificationService } from "./notification.service";
import { CaseService } from "./case.service";

export class Main {
  constructor(
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @inject('services.IngestionService')
    private ingestionService: IngestionService,
    @inject('services.NotificationService')
    private notificationService: NotificationService,
    @inject('services.CaseService')
    private caseService: CaseService,
  ) { }

  // Register available services
  servicesMapper = [
    { nodeType: "ingestion", service: this.ingestionService.ingestion.bind(this.ingestionService) },
    { nodeType: "notification", service: this.notificationService.notification.bind(this.notificationService) },
    { nodeType: "case", service: this.caseService.caseFunction.bind(this.caseService) },
  ];

  async main() {
    try {
      const currentRunningWorkflowInstances =
        await this.workflowInstancesRepository.find({
          where: { isInstanceRunning: true },
          include: [
            {
              relation: "workflow",
              scope: { include: [{ relation: "workflowBlueprint" }] },
            },
          ],
        });

      if (currentRunningWorkflowInstances.length === 0) {
        return {
          message: "No workflow instance is running",
          count: 0,
          instances: [],
        };
      }

      // Run each workflow instance sequentially
      const executionResults = [];
      for (const workflowInstance of currentRunningWorkflowInstances) {
        const workflow = (workflowInstance as any).workflow;
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

                const serviceDef = this.servicesMapper.find(
                  (item) => item.nodeType === caseNode.type
                );
                if (!serviceDef) throw new Error(`No service mapped for nodeType: ${caseNode.type}`);

                const caseNodeConfig = workflowBlueprint?.bluePrint?.find(
                  (item: any) => item.id === caseId
                );

                const result: any = await serviceDef.service(caseNodeConfig, outputData, workflowInstance);

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

                const serviceDef = this.servicesMapper.find(
                  (item) => item.nodeType === nextNode.type
                );
                if (!serviceDef) throw new Error(`No service mapped for nodeType: ${nextNode.type}`);

                const nextNodeConfig = workflowBlueprint?.bluePrint?.find(
                  (item: any) => item.id === nextNode.id
                );

                const result: any = await serviceDef.service(nextNodeConfig, outputData, workflowInstance);

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
            const serviceDef = this.servicesMapper.find(
              (item) => item.nodeType === node.type
            );
            if (!serviceDef) {
              throw new Error(`No service mapped for nodeType: ${node.type}`);
            }

            const nodeConfig = workflowBlueprint?.bluePrint?.find(
              (item: any) => item.id === node.id
            );

            const result: any = await serviceDef.service(nodeConfig, outputData, workflowInstance);

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

        executionResults.push({
          workflowInstanceId: workflowInstance.id,
          status: outputData.some((n) => n.error) ? "failed" : "completed",
          results: outputData,
        });
      }

      return {
        message: "Workflow execution finished",
        count: executionResults.length,
        instances: executionResults,
      };
    } catch (error) {
      throw error;
    }
  }
}
