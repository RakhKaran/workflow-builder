import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository, WorkflowLogEntryRepository} from '../../repositories';
import {createWorkflowLog, resolveNodeName} from '../../utils/workflow-log.util';
import {VariableService} from './variable.service';

export class IteratorService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
  ) { }

  async iterator(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    const nodeName = resolveNodeName(data);
    try {
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `Started ${nodeName} node execution`,
        logType: 0,
      });
      const component = data?.component || null;

      if (component) {
        if (component.isMapped) {
          const variable = component.variable;
          const resolvedValue = await this.variableService.getVariableValue(`{{${variable.nodeId}.${variable.variableName}}}`, previousOutputs);
          await this.nodeOutputRepository.create({
            workflowOutputsId: outputDataId,
            status: 1,
            nodeId: data.id,
            output: resolvedValue,
          });
          await createWorkflowLog(this.workflowLogEntryRepository, {
            workflowOutputsId: outputDataId,
            workflowInstancesId: workflowInstanceData?.id,
            nodeId: data?.id,
            nodeName,
            logsDescription: `${nodeName} node completed successfully`,
            logType: 2,
          });

          return {
            status: 'success',
            timestamp: new Date().toISOString(),
            data: resolvedValue,
          };
        } else {
          await this.nodeOutputRepository.create({
            workflowOutputsId: outputDataId,
            status: 1,
            nodeId: data.id,
            output: component.array,
          });
          await createWorkflowLog(this.workflowLogEntryRepository, {
            workflowOutputsId: outputDataId,
            workflowInstancesId: workflowInstanceData?.id,
            nodeId: data?.id,
            nodeName,
            logsDescription: `${nodeName} node completed successfully`,
            logType: 2,
          });

          return {
            status: 'success',
            timestamp: new Date().toISOString(),
            data: component.array,
          };
        }
      }

      throw new HttpErrors.NotFound('Component not found');
    } catch (error) {
      console.error('❌ API node error:', error.message || error);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error.message || JSON.stringify(error),
      });
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node failed: ${error.message || JSON.stringify(error)}`,
        logType: 1,
      });
      throw error;
    }
  }
}
