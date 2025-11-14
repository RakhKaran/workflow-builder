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
import {Workflow} from '../models';
import {WorkflowRepository} from '../repositories';

export class WorkflowController {
  constructor(
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
  ) { }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @post('/workflows')
  @response(200, {
    description: 'Workflow model instance',
    content: {'application/json': {schema: getModelSchemaRef(Workflow)}},
  })
  async create(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
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
    return this.workflowRepository.create({...workflow, userId: currentUser.id});
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
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
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
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
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.filter(Workflow) filter?: Filter<Workflow>,
  ): Promise<Workflow[]> {
    if (currentUser && currentUser?.permissions?.includes('super_admin')) {
      return this.workflowRepository.find(filter);
    }

    return this.workflowRepository.find({
      ...filter,
      where: {
        ...filter?.where,
        userId: currentUser.id
      }
    });
  }

  // @authenticate({
  //   strategy: 'jwt',
  //   options: {
  //     required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
  //   },
  // })
  // @patch('/workflows')
  // @response(200, {
  //   description: 'Workflow PATCH success count',
  //   content: {'application/json': {schema: CountSchema}},
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Workflow, {partial: true}),
  //       },
  //     },
  //   })
  //   workflow: Workflow,
  //   @param.where(Workflow) where?: Where<Workflow>,
  // ): Promise<Count> {
  //   return this.workflowRepository.updateAll(workflow, where);
  // }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
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
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
    @param.path.string('id') id: string,
    @param.filter(Workflow, {exclude: 'where'}) filter?: FilterExcludingWhere<Workflow>
  ): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(id);

    if (currentUser && (currentUser?.permissions?.include('super_admin') || workflow.userId === currentUser.id)) {
      return this.workflowRepository.findById(id, filter);
    }

    throw new HttpErrors.Unauthorized('Unauthorized access');
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [PermissionKeys.SUPER_ADMIN, PermissionKeys.ADMIN, PermissionKeys.COMPANY],
    },
  })
  @patch('/workflows/{id}')
  @response(204, {
    description: 'Workflow PATCH success',
  })
  async updateById(
    @inject(AuthenticationBindings.CURRENT_USER) currentUser: UserProfile,
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
    const workflowData = await this.workflowRepository.findById(id);

    if (currentUser && (currentUser?.permissions?.include('super_admin') || workflowData.userId === currentUser.id)) {
      await this.workflowRepository.updateById(id, workflow);

    }

    throw new HttpErrors.Unauthorized('Unauthorized access');
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
