import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {
  WorkflowOutputs,
  NodeOutput,
} from '../models';
import {WorkflowOutputsRepository} from '../repositories';

export class WorkflowOutputsNodeOutputController {
  constructor(
    @repository(WorkflowOutputsRepository) protected workflowOutputsRepository: WorkflowOutputsRepository,
  ) { }

  @get('/workflow-outputs/{id}/node-outputs', {
    responses: {
      '200': {
        description: 'Array of WorkflowOutputs has many NodeOutput',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(NodeOutput)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<NodeOutput>,
  ): Promise<NodeOutput[]> {
    return this.workflowOutputsRepository.nodeOutputs(id).find(filter);
  }

  @post('/workflow-outputs/{id}/node-outputs', {
    responses: {
      '200': {
        description: 'WorkflowOutputs model instance',
        content: {'application/json': {schema: getModelSchemaRef(NodeOutput)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof WorkflowOutputs.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NodeOutput, {
            title: 'NewNodeOutputInWorkflowOutputs',
            exclude: ['id'],
            optional: ['workflowOutputsId']
          }),
        },
      },
    }) nodeOutput: Omit<NodeOutput, 'id'>,
  ): Promise<NodeOutput> {
    return this.workflowOutputsRepository.nodeOutputs(id).create(nodeOutput);
  }

  @patch('/workflow-outputs/{id}/node-outputs', {
    responses: {
      '200': {
        description: 'WorkflowOutputs.NodeOutput PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NodeOutput, {partial: true}),
        },
      },
    })
    nodeOutput: Partial<NodeOutput>,
    @param.query.object('where', getWhereSchemaFor(NodeOutput)) where?: Where<NodeOutput>,
  ): Promise<Count> {
    return this.workflowOutputsRepository.nodeOutputs(id).patch(nodeOutput, where);
  }

  @del('/workflow-outputs/{id}/node-outputs', {
    responses: {
      '200': {
        description: 'WorkflowOutputs.NodeOutput DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(NodeOutput)) where?: Where<NodeOutput>,
  ): Promise<Count> {
    return this.workflowOutputsRepository.nodeOutputs(id).delete(where);
  }
}
