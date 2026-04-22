import {
  repository
} from '@loopback/repository';
import {
  del,
  param,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {WorkflowConnections} from '../models';
import {WorkflowConnectionsRepository} from '../repositories';

export class WorkflowConnectionsController {
  constructor(
    @repository(WorkflowConnectionsRepository)
    public workflowConnectionsRepository: WorkflowConnectionsRepository,
  ) { }

  // validate connection...
  @post('/workflow-connections/validate')
  async validateWorkflowConnection(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              connectionName: {type: 'string'},
              workflowId: {type: 'string'}
            }
          }
        }
      }
    })
    requestBody: {
      connectionName: string;
      workflowId: string;
    }
  ) {
    try {
      const connection = await this.workflowConnectionsRepository.findOne({
        where: {
          connectionName: requestBody.connectionName,
          workflowId: requestBody.workflowId
        },
        fields: {
          id: true,
          connectionName: true,
          connectionType: true,
          isConnectionEstablished: true,
          expiredAt: true,
          createdAt: true,
          updatedAt: true,
          remark: true,
          accessToken: false,
        },
        order: ['createdAt DESC'],
      });

      return connection;
    } catch (error) {
      throw error;
    }
  }

  // get connections...
  @post('/workflow-connections')
  @response(200, {
    description: 'Get workflow connections by type and workflowId',
  })
  async getWorkflowConnections(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              connectionType: {type: 'string'},
              workflowId: {type: 'string'},
            },
            required: ['connectionType', 'workflowId'],
          },
        },
      },
    })
    requestBody: {
      connectionType: string;
      workflowId: string;
    },
  ): Promise<WorkflowConnections[]> {
    try {
      const connections = await this.workflowConnectionsRepository.find({
        where: {
          and: [
            {connectionType: requestBody.connectionType},
            {workflowId: requestBody.workflowId},
            {isDeleted: false},
          ],
        },
        fields: {
          id: true,
          connectionName: true,
          connectionType: true,
          isConnectionEstablished: true,
          expiredAt: true,
          createdAt: true,
          updatedAt: true,
          remark: true,
          accessToken: false,
        },
        order: ['createdAt DESC'],
      });

      return connections;
    } catch (error) {
      console.error('Error fetching workflow connections:', error);
      throw error;
    }
  }

  // delete connection...
  @del('/workflow-connections/{id}')
  @response(204, {
    description: 'WorkflowConnections DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.workflowConnectionsRepository.deleteById(id);
  }
}
