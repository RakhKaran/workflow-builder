import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository, WorkflowInstancesRepository, WorkflowOutputsRepository} from '../../repositories';
import {Main} from './main.service';

export class TimeService {
  constructor(
    @repository(WorkflowInstancesRepository)
    private workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowOutputsRepository)
    private workflowOutputsRepository: WorkflowOutputsRepository,
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @inject('services.Main')
    private mainService: Main,
  ) { }

  // trigger from airflow...
  async timeTrigger(workflowInstanceId: string, nodeId: string) {
    try {
      const workflowInstance = await this.workflowInstancesRepository.findById(workflowInstanceId);

      if (!workflowInstance) {
        throw new HttpErrors.NotFound('Workflow Instance not found');
      }

      const createdOutput = await this.workflowOutputsRepository.create({
        workflowInstancesId: workflowInstance.id,
        status: 0
      });

      if (!createdOutput) {
        throw new HttpErrors[500](`Failed to trigger flow`);
      }

      const nodeOutput = await this.nodeOutputRepository.create({
        workflowOutputsId: createdOutput.id,
        nodeId: nodeId,
        output: {success: true},
        status: 0
      });

      if (!nodeOutput) {
        throw new HttpErrors[500](`Something went wrong`);
      }

      if (createdOutput.id) {
        this.mainService.main(createdOutput.id);
      };

      return {
        success: true,
        message: 'Workflow triggered successfully',
      };

    } catch (error) {
      console.log('error while triggering workflow using time trigger', error);
      const createdOutput = await this.workflowOutputsRepository.create({
        workflowInstancesId: workflowInstanceId,
        status: 2
      });

      await this.nodeOutputRepository.create({
        workflowOutputsId: createdOutput.id,
        nodeId: nodeId,
        error: error.message || JSON.stringify(error),
        status: 1
      });

      throw error;
    }
  }

  // trigger from main service
  async timeTriggerNode(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const nodeOutput = await this.nodeOutputRepository.findOne({
        where: {
          and: [
            {nodeId: data.id},
            {workflowOutputsId: outputDataId}
          ]
        }
      });

      if (!nodeOutput || (nodeOutput && !nodeOutput.output)) {
        throw HttpErrors[404]("No webhook output found");
      }


      console.log('returning success');
      return {
        status: "success",
        timestamp: new Date().toISOString(),
        data: nodeOutput.output,
      };
    } catch (error) {
      console.error("Time service error:", error);
      throw new Error(`Time trigger failed: ${error.message}`);
    }
  }
}
