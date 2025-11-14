import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
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
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {PermissionKeys} from '../authorization/permission-keys';
import {WorkflowBlueprint} from '../models';
import {WorkflowBlueprintRepository, WorkflowRepository} from '../repositories';

export class WorkflowBlueprintController {
  constructor(
    @repository(WorkflowBlueprintRepository)
    public workflowBlueprintRepository: WorkflowBlueprintRepository,
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
  ) { }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @post('/workflow-blueprints')
  @response(200, {
    description: 'WorkflowBlueprint model instance',
    content: {'application/json': {schema: getModelSchemaRef(WorkflowBlueprint)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowBlueprint, {
            title: 'NewWorkflowBlueprint',
            exclude: ['id'],
          }),
        },
      },
    })
    workflowBlueprint: Omit<WorkflowBlueprint, 'id'>,
  ): Promise<WorkflowBlueprint> {
    const existingBluePrint = await this.workflowBlueprintRepository.findOne({where: {workflowId: workflowBlueprint.workflowId}});

    if (!existingBluePrint) {
      const bluePrintData = await this.workflowBlueprintRepository.create(workflowBlueprint);

      if (bluePrintData?.workflowId) {
        await this.workflowRepository.updateById(bluePrintData.workflowId, {workflowBlueprintId: bluePrintData.id});
      }

      return bluePrintData;
    }

    await this.workflowBlueprintRepository.updateById(existingBluePrint.id, workflowBlueprint);
    const bluePrintData = await this.workflowBlueprintRepository.findById(existingBluePrint.id);
    return bluePrintData;
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @get('/workflow-blueprints/count')
  @response(200, {
    description: 'WorkflowBlueprint model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(WorkflowBlueprint) where?: Where<WorkflowBlueprint>,
  ): Promise<Count> {
    return this.workflowBlueprintRepository.count(where);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @get('/workflow-blueprints')
  @response(200, {
    description: 'Array of WorkflowBlueprint model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowBlueprint, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(WorkflowBlueprint) filter?: Filter<WorkflowBlueprint>,
  ): Promise<WorkflowBlueprint[]> {
    return this.workflowBlueprintRepository.find(filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @patch('/workflow-blueprints')
  @response(200, {
    description: 'WorkflowBlueprint PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowBlueprint, {partial: true}),
        },
      },
    })
    workflowBlueprint: WorkflowBlueprint,
    @param.where(WorkflowBlueprint) where?: Where<WorkflowBlueprint>,
  ): Promise<Count> {
    return this.workflowBlueprintRepository.updateAll(workflowBlueprint, where);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @get('/workflow-blueprints/{id}')
  @response(200, {
    description: 'WorkflowBlueprint model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(WorkflowBlueprint, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(WorkflowBlueprint, {exclude: 'where'}) filter?: FilterExcludingWhere<WorkflowBlueprint>
  ): Promise<WorkflowBlueprint> {
    return this.workflowBlueprintRepository.findById(id, filter);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @patch('/workflow-blueprints/{id}')
  @response(204, {
    description: 'WorkflowBlueprint PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowBlueprint, {partial: true}),
        },
      },
    })
    workflowBlueprint: WorkflowBlueprint,
  ): Promise<void> {
    await this.workflowBlueprintRepository.updateById(id, workflowBlueprint);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @put('/workflow-blueprints/{id}')
  @response(204, {
    description: 'WorkflowBlueprint PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() workflowBlueprint: WorkflowBlueprint,
  ): Promise<void> {
    await this.workflowBlueprintRepository.replaceById(id, workflowBlueprint);
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN],
    },
  })
  @del('/workflow-blueprints/{id}')
  @response(204, {
    description: 'WorkflowBlueprint DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowBlueprintRepository.deleteById(id);
  }


  // Get blue print by process id
  @authenticate({
    strategy: 'jwt',
    options: {required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN, PermissionKeys.COMPANY]}
  })
  @get('/workflow-blueprints/workflow/{id}')
  async getBluePrintById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
  ): Promise<{success: boolean; message: string; data: {} | null}> {
    const bluePrint: any = await this.workflowBlueprintRepository.findOne({
      where: {
        workflowId: id,
      },
      include: [
        {relation: 'workflow'}
      ]
    });

    if (!bluePrint)
      return {
        success: false,
        message: `No blue print found for workflow id ${id}`,
        data: null
      }

    if (currentUser && currentUser?.permissions?.includes('super_admin') || bluePrint?.workflow?.userId === currentUser.id) {
      return {
        success: true,
        message: `Blue print for workflow id ${id}`,
        data: bluePrint
      }
    }

    throw new HttpErrors.Unauthorized('Unauthorized access');
  }
}
