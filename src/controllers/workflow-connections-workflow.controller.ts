import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  WorkflowConnections,
  Workflow,
} from '../models';
import {WorkflowConnectionsRepository} from '../repositories';

export class WorkflowConnectionsWorkflowController {
  constructor(
    @repository(WorkflowConnectionsRepository)
    public workflowConnectionsRepository: WorkflowConnectionsRepository,
  ) { }

  @get('/workflow-connections/{id}/workflow', {
    responses: {
      '200': {
        description: 'Workflow belonging to WorkflowConnections',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Workflow),
          },
        },
      },
    },
  })
  async getWorkflow(
    @param.path.string('id') id: typeof WorkflowConnections.prototype.id,
  ): Promise<Workflow> {
    return this.workflowConnectionsRepository.workflow(id);
  }
}
