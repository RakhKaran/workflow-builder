import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {Workflow} from '../models';
import {WorkflowRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {PermissionKeys} from '../authorization/permission-keys';

export class WorkflowController {
  constructor(
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
  ) { }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @post('/workflows')
  @response(200, {
    description: 'Workflow model instance',
    content: {'application/json': {schema: getModelSchemaRef(Workflow)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Workflow, {
            title: 'NewWorkflow',
            exclude: ['id'],
          }),
        },
      },
    })
    workflow: Omit<Workflow, 'id'>,
  ): Promise<Workflow> {
    return this.workflowRepository.create(workflow);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @get('/workflows/count')
  @response(200, {
    description: 'Workflow model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Workflow) where?: Where<Workflow>,
  ): Promise<Count> {
    return this.workflowRepository.count(where);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @get('/workflows')
  @response(200, {
    description: 'Array of Workflow model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Workflow, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Workflow) filter?: Filter<Workflow>,
  ): Promise<Workflow[]> {
    return this.workflowRepository.find(filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @patch('/workflows')
  @response(200, {
    description: 'Workflow PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Workflow, {partial: true}),
        },
      },
    })
    workflow: Workflow,
    @param.where(Workflow) where?: Where<Workflow>,
  ): Promise<Count> {
    return this.workflowRepository.updateAll(workflow, where);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @get('/workflows/{id}')
  @response(200, {
    description: 'Workflow model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Workflow, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Workflow, {exclude: 'where'}) filter?: FilterExcludingWhere<Workflow>
  ): Promise<Workflow> {
    return this.workflowRepository.findById(id, filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @patch('/workflows/{id}')
  @response(204, {
    description: 'Workflow PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Workflow, {partial: true}),
        },
      },
    })
    workflow: Workflow,
  ): Promise<void> {
    await this.workflowRepository.updateById(id, workflow);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @put('/workflows/{id}')
  @response(204, {
    description: 'Workflow PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() workflow: Workflow,
  ): Promise<void> {
    await this.workflowRepository.replaceById(id, workflow);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @del('/workflows/{id}')
  @response(204, {
    description: 'Workflow DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowRepository.deleteById(id);
  }
}
