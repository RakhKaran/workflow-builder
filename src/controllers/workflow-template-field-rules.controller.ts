import {authenticate} from '@loopback/authentication';
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
import {PermissionKeys} from '../authorization/permission-keys';
import {WorkflowTemplateFieldRules} from '../models';
import {WorkflowTemplateFieldRulesRepository} from '../repositories';

export class WorkflowTemplateFieldRulesController {
  constructor(
    @repository(WorkflowTemplateFieldRulesRepository)
    public workflowTemplateFieldRulesRepository: WorkflowTemplateFieldRulesRepository,
  ) {}

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY]},
  })
  @post('/workflow-template-field-rules')
  @response(200, {
    description: 'WorkflowTemplateFieldRules model instance',
    content: {'application/json': {schema: getModelSchemaRef(WorkflowTemplateFieldRules)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplateFieldRules, {
            title: 'NewWorkflowTemplateFieldRules',
            exclude: ['id'],
          }),
        },
      },
    })
    workflowTemplateFieldRule: Omit<WorkflowTemplateFieldRules, 'id'>,
  ): Promise<WorkflowTemplateFieldRules> {
    return this.workflowTemplateFieldRulesRepository.create(workflowTemplateFieldRule);
  }

  @get('/workflow-template-field-rules/count')
  @response(200, {
    description: 'WorkflowTemplateFieldRules model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(WorkflowTemplateFieldRules) where?: Where<WorkflowTemplateFieldRules>,
  ): Promise<Count> {
    return this.workflowTemplateFieldRulesRepository.count(where);
  }

  @get('/workflow-template-field-rules')
  @response(200, {
    description: 'Array of WorkflowTemplateFieldRules model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowTemplateFieldRules, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(WorkflowTemplateFieldRules) filter?: Filter<WorkflowTemplateFieldRules>,
  ): Promise<WorkflowTemplateFieldRules[]> {
    return this.workflowTemplateFieldRulesRepository.find(filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY]},
  })
  @patch('/workflow-template-field-rules')
  @response(200, {
    description: 'WorkflowTemplateFieldRules PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplateFieldRules, {partial: true}),
        },
      },
    })
    workflowTemplateFieldRule: WorkflowTemplateFieldRules,
    @param.where(WorkflowTemplateFieldRules) where?: Where<WorkflowTemplateFieldRules>,
  ): Promise<Count> {
    return this.workflowTemplateFieldRulesRepository.updateAll(workflowTemplateFieldRule, where);
  }

  @get('/workflow-template-field-rules/{id}')
  @response(200, {
    description: 'WorkflowTemplateFieldRules model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(WorkflowTemplateFieldRules, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(WorkflowTemplateFieldRules, {exclude: 'where'})
    filter?: FilterExcludingWhere<WorkflowTemplateFieldRules>,
  ): Promise<WorkflowTemplateFieldRules> {
    return this.workflowTemplateFieldRulesRepository.findById(id, filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY]},
  })
  @patch('/workflow-template-field-rules/{id}')
  @response(204, {
    description: 'WorkflowTemplateFieldRules PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowTemplateFieldRules, {partial: true}),
        },
      },
    })
    workflowTemplateFieldRule: WorkflowTemplateFieldRules,
  ): Promise<void> {
    await this.workflowTemplateFieldRulesRepository.updateById(id, workflowTemplateFieldRule);
  }

  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.SUPER_ADMIN]},
  })
  @del('/workflow-template-field-rules/{id}')
  @response(204, {
    description: 'WorkflowTemplateFieldRules DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowTemplateFieldRulesRepository.deleteById(id);
  }
}
