import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository, WorkflowInstancesRepository, WorkflowLogEntryRepository, WorkflowOutputsRepository} from '../../repositories';
import {createWorkflowLog} from '../../utils/workflow-log.util';
import {Main} from './main.service';

export class TimeService {
  constructor(
    @repository(WorkflowInstancesRepository)
    private workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowOutputsRepository)
    private workflowOutputsRepository: WorkflowOutputsRepository,
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,
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
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: createdOutput.id,
        workflowInstancesId: workflowInstance.id,
        nodeId,
        nodeName: 'Time Trigger',
        logsDescription: 'Time trigger started workflow execution',
        logType: 0,
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
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: createdOutput.id,
        workflowInstancesId: workflowInstanceId,
        nodeId,
        nodeName: 'Time Trigger',
        logsDescription: `Time trigger failed: ${error.message || JSON.stringify(error)}`,
        logType: 1,
      });

      throw error;
    }
  }

  // trigger from main service
  async timeTriggerNode(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName: data?.nodeName ?? 'Time Trigger',
        logsDescription: 'Resolving time trigger output for workflow execution',
        logType: 0,
      });
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
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName: data?.nodeName ?? 'Time Trigger',
        logsDescription: 'Time trigger output resolved successfully',
        logType: 2,
      });
      return {
        status: "success",
        timestamp: new Date().toISOString(),
        data: nodeOutput.output,
      };
    } catch (error) {
      console.error("Time service error:", error);
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName: data?.nodeName ?? 'Time Trigger',
        logsDescription: `Time trigger failed: ${error.message}`,
        logType: 1,
      });
      throw new Error(`Time trigger failed: ${error.message}`);
    }
  }
}
