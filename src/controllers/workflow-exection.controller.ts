import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, param, post, Request, requestBody, RestBindings} from '@loopback/rest';
import {IncomingHttpHeaders} from 'http';
import {WorkflowInstancesRepository} from '../repositories';
import {WebhookService} from '../services/nodes/webhook.service';

export class WorkflowExecutionController {
  constructor(
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @inject('services.WebhookService')
    public webhookService: WebhookService,
  ) { }

  normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) result[key] = value.join(', ');
      else if (typeof value === 'string') result[key] = value;
    }
    return result;
  }

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
}
