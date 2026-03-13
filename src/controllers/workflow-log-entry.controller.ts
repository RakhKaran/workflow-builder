import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {WorkflowLogEntry} from '../models';
import {WorkflowLogEntryRepository} from '../repositories';

export class WorkflowLogEntryController {
  constructor(
    @repository(WorkflowLogEntryRepository)
    public workflowLogEntryRepository: WorkflowLogEntryRepository,
  ) {}

  @post('/workflow-log-entries')
  @response(200, {
    description: 'WorkflowLogEntry model instance',
    content: {'application/json': {schema: getModelSchemaRef(WorkflowLogEntry)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowLogEntry, {
            title: 'NewWorkflowLogEntry',
            exclude: ['id'],
          }),
        },
      },
    })
    workflowLogEntry: Omit<WorkflowLogEntry, 'id'>,
  ): Promise<WorkflowLogEntry> {
    return this.workflowLogEntryRepository.create(workflowLogEntry);
  }

  @get('/workflow-log-entries/count')
  @response(200, {
    description: 'WorkflowLogEntry model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(WorkflowLogEntry) where?: Where<WorkflowLogEntry>,
  ): Promise<Count> {
    return this.workflowLogEntryRepository.count(where);
  }

  @get('/workflow-log-entries')
  @response(200, {
    description: 'Array of WorkflowLogEntry model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowLogEntry, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(WorkflowLogEntry) filter?: Filter<WorkflowLogEntry>,
  ): Promise<WorkflowLogEntry[]> {
    return this.workflowLogEntryRepository.find(filter);
  }

  @get('/workflow-log-entries/workflow-output/{workflowOutputsId}')
  @response(200, {
    description: 'Workflow log entries by workflow output',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowLogEntry, {includeRelations: true}),
        },
      },
    },
  })
  async findByWorkflowOutput(
    @param.path.string('workflowOutputsId') workflowOutputsId: string,
    @param.query.string('nodeId') nodeId?: string,
    @param.query.string('nodeName') nodeName?: string,
    @param.query.number('limit') limit = 20,
    @param.query.number('skip') skip = 0,
  ): Promise<WorkflowLogEntry[]> {
    const andFilters: object[] = [{workflowOutputsId}];

    if (nodeId) andFilters.push({nodeId});
    if (nodeName) andFilters.push({nodeName});

    return this.workflowLogEntryRepository.find({
      where: {and: andFilters} as never,
      limit,
      skip,
      order: ['createdAt DESC'],
    });
  }

  @patch('/workflow-log-entries')
  @response(200, {
    description: 'WorkflowLogEntry PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowLogEntry, {partial: true}),
        },
      },
    })
    workflowLogEntry: WorkflowLogEntry,
    @param.where(WorkflowLogEntry) where?: Where<WorkflowLogEntry>,
  ): Promise<Count> {
    return this.workflowLogEntryRepository.updateAll(workflowLogEntry, where);
  }

  @get('/workflow-log-entries/{id}')
  @response(200, {
    description: 'WorkflowLogEntry model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(WorkflowLogEntry, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(WorkflowLogEntry, {exclude: 'where'})
    filter?: FilterExcludingWhere<WorkflowLogEntry>,
  ): Promise<WorkflowLogEntry> {
    return this.workflowLogEntryRepository.findById(id, filter);
  }

  @patch('/workflow-log-entries/{id}')
  @response(204, {
    description: 'WorkflowLogEntry PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowLogEntry, {partial: true}),
        },
      },
    })
    workflowLogEntry: WorkflowLogEntry,
  ): Promise<void> {
    await this.workflowLogEntryRepository.updateById(id, workflowLogEntry);
  }

  @put('/workflow-log-entries/{id}')
  @response(204, {
    description: 'WorkflowLogEntry PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() workflowLogEntry: WorkflowLogEntry,
  ): Promise<void> {
    await this.workflowLogEntryRepository.replaceById(id, workflowLogEntry);
  }

  @del('/workflow-log-entries/{id}')
  @response(204, {
    description: 'WorkflowLogEntry DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowLogEntryRepository.deleteById(id);
  }

  @post('/workflow-log-entries/logs-by-node')
  async logsByNode(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              workflowOutputsId: {type: 'string'},
              workflowInstancesId: {type: 'string'},
              nodeId: {type: 'string'},
              nodeName: {type: 'string'},
              limit: {type: 'number', default: 10},
              skip: {type: 'number', default: 0},
            },
            required: ['workflowOutputsId'],
          },
        },
      },
    })
    requestBody: {
      workflowOutputsId: string;
      workflowInstancesId?: string;
      nodeId?: string;
      nodeName?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<WorkflowLogEntry[]> {
    const {workflowOutputsId, workflowInstancesId, nodeId, nodeName, limit = 10, skip = 0} = requestBody;
    const andFilters: object[] = [{workflowOutputsId}];

    if (workflowInstancesId) andFilters.push({workflowInstancesId});
    if (nodeId) andFilters.push({nodeId});
    if (nodeName) andFilters.push({nodeName});

    return this.workflowLogEntryRepository.find({
      where: {and: andFilters} as never,
      limit,
      skip,
      order: ['createdAt DESC'],
    });
  }
}
