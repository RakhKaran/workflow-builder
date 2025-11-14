import {repository} from '@loopback/repository';
import {WorkflowConnections} from '../models';
import {WorkflowConnectionsRepository} from '../repositories';

export class Connections {
  constructor(
    @repository(WorkflowConnectionsRepository)
    private workflowConnectionsRepository: WorkflowConnectionsRepository,
  ) { }

  // validate connection name...
  async validateConnectionName(connectionName: string, workflowId: string): Promise<boolean> {
    try {
      const connection = await this.workflowConnectionsRepository.findOne({
        where: {
          and: [
            {connectionName: connectionName},
            {workflowId: workflowId}
          ]
        }
      });

      if (connection) {
        return false;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // create new connection...
  async createConnection(connectionObject: WorkflowConnections): Promise<WorkflowConnections> {
    try {
      const newConnection = await this.workflowConnectionsRepository.create(connectionObject);
      return newConnection;
    } catch (error) {
      console.log('Error while creating connection: ', error);
      throw error;
    }
  }

  // get connection...
  async getConnection(connectionId: string): Promise<WorkflowConnections> {
    try {
      const connection = await this.workflowConnectionsRepository.findById(connectionId);
      return connection;
    } catch (error) {
      console.log('Error while fetching connection: ', error);
      throw error;
    }
  }

  // update connection...
  async updateConnection(connectionId: string, updatedData: Partial<WorkflowConnections>) {
    try {
      await this.workflowConnectionsRepository.updateById(connectionId, updatedData);
    } catch (error) {
      console.log('Error while updating connection: ', error);
      throw error;
    }
  }
}
