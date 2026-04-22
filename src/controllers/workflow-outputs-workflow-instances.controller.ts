import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  WorkflowOutputs,
  WorkflowInstances,
} from '../models';
import {WorkflowOutputsRepository} from '../repositories';

export class WorkflowOutputsWorkflowInstancesController {
  constructor(
    @repository(WorkflowOutputsRepository)
    public workflowOutputsRepository: WorkflowOutputsRepository,
  ) { }

  @get('/workflow-outputs/{id}/workflow-instances', {
    responses: {
      '200': {
        description: 'WorkflowInstances belonging to WorkflowOutputs',
        content: {
          'application/json': {
            schema: getModelSchemaRef(WorkflowInstances),
          },
        },
      },
    },
  })
  async getWorkflowInstances(
    @param.path.string('id') id: typeof WorkflowOutputs.prototype.id,
  ): Promise<WorkflowInstances> {
    return this.workflowOutputsRepository.workflowInstances(id);
  }
}
