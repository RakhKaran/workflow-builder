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
  requestBody,
  response,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {PermissionKeys} from '../authorization/permission-keys';
import {WorkflowTemplates} from '../models';
import {WorkflowTemplatesRepository} from '../repositories';

export class WorkflowTemplateController {
  constructor(
    @repository(WorkflowTemplatesRepository)
    public workflowTemplatesRepository: WorkflowTemplatesRepository,
  ) {}

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY]},
  })
  @post('/workflow-templates')
  @response(200, {
    description: 'WorkflowTemplates model instance',
    content: {'application/json': {schema: getModelSchemaRef(WorkflowTemplates)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplates, {
            title: 'NewWorkflowTemplates',
            exclude: ['id'],
          }),
        },
      },
    })
    workflowTemplate: Omit<WorkflowTemplates, 'id'>,
  ): Promise<WorkflowTemplates> {
    return this.workflowTemplatesRepository.create(workflowTemplate);
  }

  @get('/workflow-templates/count')
  @response(200, {
    description: 'WorkflowTemplates model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(WorkflowTemplates) where?: Where<WorkflowTemplates>,
  ): Promise<Count> {
    return this.workflowTemplatesRepository.count(where);
  }

  @get('/workflow-templates')
  @response(200, {
    description: 'Array of WorkflowTemplates model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowTemplates, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(WorkflowTemplates) filter?: Filter<WorkflowTemplates>,
  ): Promise<WorkflowTemplates[]> {
    return this.workflowTemplatesRepository.find({
      ...filter,
      include: [{relation: 'workflow'}],
    });
  }

  @patch('/workflow-templates')
  @response(200, {
    description: 'WorkflowTemplates PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplates, {partial: true}),
        },
      },
    })
    workflowTemplate: WorkflowTemplates,
    @param.where(WorkflowTemplates) where?: Where<WorkflowTemplates>,
  ): Promise<Count> {
    return this.workflowTemplatesRepository.updateAll(workflowTemplate, where);
  }

  @get('/workflow-templates/{id}')
  @response(200, {
    description: 'WorkflowTemplates model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(WorkflowTemplates, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(WorkflowTemplates, {exclude: 'where'})
    filter?: FilterExcludingWhere<WorkflowTemplates>,
  ): Promise<WorkflowTemplates> {
    return this.workflowTemplatesRepository.findById(id, {
      ...filter,
      include: [{relation: 'workflow'}],
    });
  }

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY]},
  })
  @patch('/workflow-templates/{id}')
  @response(204, {
    description: 'WorkflowTemplates PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplates, {partial: true}),
        },
      },
    })
    workflowTemplate: WorkflowTemplates,
  ): Promise<void> {
    await this.workflowTemplatesRepository.updateById(id, workflowTemplate);
  }

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN]},
  })
  @del('/workflow-templates/{id}')
  @response(204, {
    description: 'WorkflowTemplates DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowTemplatesRepository.deleteById(id);
  }
}
