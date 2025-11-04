import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, HttpErrors, param, post, Request, requestBody, RestBindings} from '@loopback/rest';
import {IncomingHttpHeaders} from 'http';
import {WorkflowOutputs} from '../models';
import {WorkflowBlueprintRepository, WorkflowInstancesRepository, WorkflowOutputsRepository, WorkflowRepository} from '../repositories';
import {TimeService} from '../services/nodes/time.service';
import {WebhookService} from '../services/nodes/webhook.service';

export class WorkflowExecutionController {
  constructor(
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
    @repository(WorkflowBlueprintRepository)
    public workflowBlueprintRepository: WorkflowBlueprintRepository,
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowOutputsRepository)
    public workflowOutputsRepository: WorkflowOutputsRepository,
    @inject('services.WebhookService')
    public webhookService: WebhookService,
    @inject('services.TimeService')
    private timeService: TimeService,
  ) { }

  normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) result[key] = value.join(', ');
      else if (typeof value === 'string') result[key] = value;
    }
    return result;
  }

  // webhook trigger
  @post('/workflow/webhook/{workflowInstanceId}/{webhookId}')
  async workflowWebhook(
    @param.path.string('workflowInstanceId') workflowInstanceId: string,
    @param.path.string('webhookId') webhookId: string,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      }
    })
    body: Record<string, any>,
    @inject(RestBindings.Http.REQUEST) req: Request
  ): Promise<object> {
    try {
      const headers = this.normalizeHeaders(req.headers);

      console.log(`Webhook triggered for workflow: ${workflowInstanceId}`);
      console.log('Headers:', headers);
      console.log('Body:', body);

      const workflowInstance = await this.workflowInstancesRepository.findById(
        workflowInstanceId,
        {
          include: [
            {
              relation: "workflow",
              scope: {include: [{relation: "workflowBlueprint"}]},
            },
          ]
        }
      );

      const response = await this.webhookService.webhookValidations(
        webhookId,
        workflowInstance,
        headers,
        body,
      )

      return {
        message: `Workflow ${workflowInstanceId} triggered successfully`,
        receivedBody: body,
        receivedHeaders: headers,
      };
    } catch (error) {
      console.error('Error executing webhook:', error);
      throw new HttpErrors.InternalServerError(error);
    }
  }

  // logs by instance Id
  @get('/workflow-instances/logs/{instanceId}')
  async workflowInstanceOutputLogs(
    @param.path.string('instanceId') instanceId: string,
  ): Promise<WorkflowOutputs[]> {
    const outputs = await this.workflowOutputsRepository.find({
      where: {
        workflowInstancesId: instanceId
      },
      include: [
        {relation: 'workflowInstances'},
        // {relation: 'nodeOutputs'}
      ],
      order: ['createdAt desc']
    });

    return outputs;
  }

  // exxecution logs by outputId
  @get('/workflow-instances/execution-logs/{outputId}')
  async workflowInstanceOutputExecutionLogs(
    @param.path.string('outputId') outputId: string,
  ): Promise<WorkflowOutputs> {
    const outputData = await this.workflowOutputsRepository.findById(outputId, {
      include: [
        {relation: 'workflowInstances'},
        {relation: 'nodeOutputs'}
      ],
      order: ['createdAt desc']
    });

    return outputData;
  }

  // trigger from idp process
  @post('/workflow/process')
  async workflowTriggerFromProcess(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              workflowId: {
                type: 'string',
              },
              processInstanceName: {
                type: 'string',
              }
            }
          }
        }
      }
    })
    requestBody: {
      workflowId: string;
      processInstanceName: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      workFlowId: string;
      workflowInstanceId: string;
      webhookId: string;
    }
  }> {
    try {
      const workflow = await this.workflowRepository.findById(requestBody.workflowId);

      if (!workflow) {
        throw new HttpErrors.BadRequest('Workflow not found');
      }

      const createdWorkflowInstance = await this.workflowInstancesRepository.create({
        workflowInstanceName: `${requestBody.processInstanceName}-${workflow.name}`,
        workflowInstanceDescription: `workflow instance created for process instance of IDP ${requestBody.processInstanceName}`,
        workflowId: requestBody.workflowId,
        isActive: true,
        isDeleted: false,
        isInstanceRunning: false,
      });

      if (workflow.id && createdWorkflowInstance.id) {
        const workflowBlueprint: any = await this.workflowBlueprintRepository.findById(workflow.workflowBlueprintId);
        const blueprint = workflowBlueprint.bluePrint;
        const component = blueprint[0]?.component;
        const webhookId = component.webhookId;
        return {
          success: true,
          message: "string",
          data: {
            workFlowId: workflow.id,
            workflowInstanceId: createdWorkflowInstance.id,
            webhookId: webhookId
          }
        }
      } else {
        throw new HttpErrors[500]('Internal server error');
      }
    } catch (error) {
      throw error;
    }
  }

  // time trigger
  @post('/workflow/time-trigger')
  async workflowTimeTrigger(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              workflowInstanceId: {
                type: 'string'
              },
              nodeId: {
                type: 'string'
              }
            }
          }
        }
      }
    })
    requestBody: {
      workflowInstanceId: string;
      nodeId: string;
    }
  ): Promise<{success: boolean; message: string}> {
    try {
      const response = await this.timeService.timeTrigger(requestBody.workflowInstanceId, requestBody.nodeId);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // test-apis
  // ----------------------------------------------------------------------------------------------
  @get('/test')
  async testAPI(): Promise<{success: boolean; message: string}> {
    try {
      return {
        success: true,
        message: "API success"
      }
    } catch (error) {
      throw error;
    }
  }

  @get('/access-token')
  async accessToken(): Promise<{success: boolean; message: string; token: string}> {
    try {
      return {
        success: true,
        message: "Access Token retrived successfully.",
        token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJuYW1lIjoiS2FyYW4iLCJlbWFpbCI6ImthcmFucmFraDE5QGdtYWlsLmNvbSIsInBlcm1pc3Npb25zIjpbInN1cGVyX2FkbWluIl0sInVzZXJUeXBlIjoiYWRtaW4iLCJpYXQiOjE3NjEzNjgzMTYsImV4cCI6MTc2MTM5MzUxNn0.TePnyg7XixbXEAyK816nxJv6JfP58fZbDGMU2NmIE3I"
      }
    } catch (error) {
      throw error;
    }
  }

  // -----------------------------------------------------------------------------------------------
}
