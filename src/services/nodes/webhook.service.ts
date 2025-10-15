import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository, WorkflowOutputsRepository} from '../../repositories';
import {Main} from './main.service';

export class WebhookService {
  constructor(
    @repository(WorkflowOutputsRepository)
    public workflowOutputsRepository: WorkflowOutputsRepository,
    @repository(NodeOutputRepository)
    public nodeOutputRepository: NodeOutputRepository,
    @inject('services.Main')
    public mainService: Main,
  ) { }

  async webhookTrigger(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const nodeOutput = await this.nodeOutputRepository.findOne({
        where: {
          and: [
            {nodeId: data.id},
            {workflowOutputsId: outputDataId}
          ]
        }
      });

      if (!nodeOutput || (nodeOutput && !nodeOutput.output)) {
        throw HttpErrors[404]("No webhook output found");
      }

      return {
        status: "success",
        timestamp: new Date().toISOString(),
        data: nodeOutput.output,
      };
    } catch (error) {
      console.error("Webhook service error:", error);
      throw new Error(`Webhook failed: ${error.message}`);
    }
  }

  async webhookValidations(
    webhookId: string,
    workflowInstance: any,
    headers: Record<string, string>,
    body: Record<string, any>
  ): Promise<{success: boolean; message: string; statusCode: number}> {
    try {
      if (
        !workflowInstance ||
        !workflowInstance.workflow ||
        !workflowInstance.workflow.workflowBlueprint
      ) {
        throw new HttpErrors.InternalServerError('Invalid workflow instance');
      }

      const workflow = workflowInstance.workflow;
      const blueprint = workflow.workflowBlueprint;
      const webhookNode = blueprint.bluePrint?.find(
        (node: any) => node.component?.webhookId === webhookId
      );

      if (!webhookNode) {
        throw new HttpErrors.NotFound(`Webhook ${webhookId} not found in blueprint`);
      }

      const component = webhookNode.component;

      // ✅ 1. Check if advanced options are enabled
      if (component.isAdvancedOptions) {
        const requiredHeaders = component.customHeaders || [];

        // Convert all header keys to lowercase for case-insensitive comparison
        const lowerHeaders = Object.keys(headers).reduce((acc, key) => {
          acc[key.toLowerCase()] = headers[key];
          return acc;
        }, {} as Record<string, string>);

        // ✅ Validate required headers
        for (const {key, value} of requiredHeaders) {
          const headerValue = lowerHeaders[key.toLowerCase()];
          if (!headerValue) {
            throw new HttpErrors.BadRequest(`Missing required header: ${key}`);
          }
          if (headerValue !== value) {
            throw new HttpErrors.Forbidden(`Invalid value for header: ${key}`);
          }
        }
      }

      // ✅ 2. Validate request body (if user defined one)
      if (component.requestBody) {
        const expectedBody = JSON.parse(component.requestBody);

        // Deep compare objects
        const isSameBody = this.deepCompareObjects(expectedBody, body);
        if (!isSameBody) {
          throw new HttpErrors.BadRequest('Request body does not match expected schema');
        }
      }

      // ✅ 3. If validation passed, return success
      const createdOutput = await this.workflowOutputsRepository.create({
        workflowInstancesId: workflowInstance.id,
        status: 0
      });

      if (!createdOutput) {
        throw new HttpErrors[500](`Failed to trigger flow`);
      }

      const nodeOutput = await this.nodeOutputRepository.create({
        workflowOutputsId: createdOutput.id,
        nodeId: webhookNode.id,
        output: body,
        status: 0
      });

      if (!nodeOutput) {
        throw new HttpErrors[500](`Something went wrong`);
      }

      if (createdOutput.id) {
        this.mainService.main(createdOutput.id);
      };

      return {
        success: true,
        message: 'Webhook validated successfully',
        statusCode: component.responseStatus || 200,
      };
    } catch (error) {
      console.error('Error while validating webhook:', error);

      const webhookNode = workflowInstance?.workflow?.workflowBlueprint.bluePrint?.find(
        (node: any) => node.component?.webhookId === webhookId
      );

      const webhookNodeId = webhookNode.id;

      const createdOutput = await this.workflowOutputsRepository.create({
        workflowInstancesId: workflowInstance.id,
        status: 2
      });

      await this.nodeOutputRepository.create({
        workflowOutputsId: createdOutput.id,
        nodeId: webhookNodeId,
        error: error.message || JSON.stringify(error),
        status: 1
      });

      throw error;
    }
  }

  /**
   * Utility function for deep comparison between two objects
   */
  private deepCompareObjects(obj1: any, obj2: any): boolean {
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!this.deepCompareObjects(obj1[key], obj2[key])) return false;
    }

    return true;
  }
}
