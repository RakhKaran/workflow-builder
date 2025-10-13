/* eslint-disable @typescript-eslint/no-explicit-any */
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
  HttpErrors,
} from '@loopback/rest';
import { WorkflowInstances } from '../models';
import { WorkflowInstancesRepository, WorkflowRepository } from '../repositories';
import { authenticate } from '@loopback/authentication';
import { PermissionKeys } from '../authorization/permission-keys';
import path from 'path';
import fs from 'fs';

export class WorkflowInstancesController {
  constructor(
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
  ) { }

  slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // replace non-alphanumeric with hyphens
      .replace(/-+/g, '-')         // remove multiple hyphens
      .replace(/^-|-$/g, '');      // trim hyphens
  }

  async createProcessFolder(instanceName: string): Promise<string> {
    const slugifyName = this.slugify(instanceName);

    // Always resolve to absolute paths
    const sandboxRoot = path.resolve(__dirname, '../../.sandbox');
    const folderPath = path.resolve(sandboxRoot, slugifyName); // normalized, safe path

    console.log('slugify name:', slugifyName);

    // Validate: prevent directory traversal
    if (!folderPath.startsWith(sandboxRoot)) {
      throw new HttpErrors.BadRequest('Invalid process ID');
    }

    // Check if already exists
    if (fs.existsSync(folderPath)) {
      throw new HttpErrors.BadRequest(`Process instance with name "${instanceName}" already exists.`);
    }

    // Create the folder
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Created folder: ${folderPath}`);

    return slugifyName;
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @post('/workflow-instances')
  @response(200, {
    description: 'WorkflowInstances model instance',
    content: { 'application/json': { schema: getModelSchemaRef(WorkflowInstances) } },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowInstances, {
            title: 'NewWorkflowInstances',
            exclude: ['id'],
          }),
        },
      },
    })
    workflowInstances: Omit<WorkflowInstances, 'id'>,
  ): Promise<WorkflowInstances> {
    const workflowData: any = await this.workflowRepository.findById(
      workflowInstances.workflowId,
      {
        include: [{ relation: 'workflowBlueprint' }],
      },
    );

    if (!workflowData) {
      throw new HttpErrors.BadRequest('Process not found.');
    }

    if (!workflowData.workflowBlueprint) {
      throw new HttpErrors.NotFound(
        `Blueprint is missing for workflow ${workflowData.name}`,
      );
    }

    const ingestionType = workflowData.workflowBlueprint?.bluePrint?.find(
      (node: any) => node.nodeName === 'Ingestion',
    );

    if (!ingestionType) {
      throw new HttpErrors.BadRequest(
        'Blueprint is missing the "Ingestion" node.',
      );
    }

    const newWorkflowInstanceData: any = {
      ...workflowInstances,
    };

    if (
      ingestionType?.component?.channelType === 'ui' ||
      ingestionType?.component?.channelType === 'api'
    ) {
      const folderString = await this.createProcessFolder(
        workflowInstances.workflowInstanceName,
      );
      newWorkflowInstanceData.workflowInstanceFolderName = folderString;
    }

    const createdWorkflowInstance = await this.workflowInstancesRepository.create(newWorkflowInstanceData);

    const workflowInstanceData = await this.workflowInstancesRepository.findById(
      createdWorkflowInstance.id,
      {
        include: [
          {
            relation: 'workflow',
            scope: {
              include: [{ relation: 'workflowBlueprint' }],
            },
          },
        ],
      },
    );

    return workflowInstanceData;
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @get('/workflow-instances/count')
  @response(200, {
    description: 'WorkflowInstances model count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async count(
    @param.where(WorkflowInstances) where?: Where<WorkflowInstances>,
  ): Promise<Count> {
    return this.workflowInstancesRepository.count(where);
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @get('/workflow-instances')
  @response(200, {
    description: 'Array of WorkflowInstances model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(WorkflowInstances, { includeRelations: true }),
        },
      },
    },
  })
  async find(
    @param.filter(WorkflowInstances) filter?: Filter<WorkflowInstances>,
  ): Promise<WorkflowInstances[]> {
    return this.workflowInstancesRepository.find({...filter, include: [{relation: 'workflow'}]});
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @patch('/workflow-instances')
  @response(200, {
    description: 'WorkflowInstances PATCH success count',
    content: { 'application/json': { schema: CountSchema } },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowInstances, { partial: true }),
        },
      },
    })
    workflowInstances: WorkflowInstances,
    @param.where(WorkflowInstances) where?: Where<WorkflowInstances>,
  ): Promise<Count> {
    return this.workflowInstancesRepository.updateAll(workflowInstances, where);
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @get('/workflow-instances/{id}')
  @response(200, {
    description: 'WorkflowInstances model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(WorkflowInstances, { includeRelations: true }),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(WorkflowInstances, { exclude: 'where' }) filter?: FilterExcludingWhere<WorkflowInstances>
  ): Promise<WorkflowInstances> {
    return this.workflowInstancesRepository.findById(id,
      {...filter,
        include: [
          {relation: 'workflow',
            scope: {
              include: [
                {relation: 'workflowBlueprint'}
              ]
            }
          }
        ]
      }
    );
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @patch('/workflow-instances/{id}')
  @response(204, {
    description: 'WorkflowInstances PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(WorkflowInstances, { partial: true }),
        },
      },
    })
    workflowInstances: WorkflowInstances,
  ): Promise<void> {
    await this.workflowInstancesRepository.updateById(id, workflowInstances);
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @put('/workflow-instances/{id}')
  @response(204, {
    description: 'WorkflowInstances PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() workflowInstances: WorkflowInstances,
  ): Promise<void> {
    await this.workflowInstancesRepository.replaceById(id, workflowInstances);
  }

  @authenticate({
    strategy: 'jwt',
    options: { required: [PermissionKeys.ADMIN, PermissionKeys.SUPER_ADMIN] }
  })
  @del('/workflow-instances/{id}')
  @response(204, {
    description: 'WorkflowInstances DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowInstancesRepository.deleteById(id);
  }
}
