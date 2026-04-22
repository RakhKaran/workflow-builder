import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {NodeOutputRepository, WorkflowLogEntryRepository} from '../../repositories';
import {createWorkflowLog, resolveNodeName} from '../../utils/workflow-log.util';
import {AgendaService} from '../agenda/agenda.service';

export class WaitService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,
    @inject('services.AgendaService')
    private agendaService: AgendaService,
  ) { }

  async waitService(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
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
      const component = data.component || null;
      const scheduleResponse = await this.schedule(data, component, previousOutputs, outputDataId, workflowInstanceData.workflowId);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 1,
        nodeId: data.id,
        output: scheduleResponse,
      });
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node scheduled workflow continuation`,
        logType: 3,
      });

    } catch (error) {
      console.error('❌ Wait node error:', error.message || error);
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

  async schedule(data: any, component: any, previousOutputs: any[], outputDataId: string, workflowId: string) {
    try {
      if (!component || !component.triggerType) {
        throw new Error('Invalid component data for wait node.');
      }

      const triggerType = component.triggerType;
      let resumeAt: Date;

      // 🕓 Calculate resume time based on trigger type
      if (triggerType === 'interval') {
        const {intervalType, seconds, minutes, hours, days} = component;
        let delayMs = 0;
        if (intervalType === 0 && seconds) delayMs = seconds * 1000;
        if (intervalType === 1 && minutes) delayMs = minutes * 60 * 1000;
        if (intervalType === 2 && hours) delayMs = hours * 60 * 60 * 1000;
        if (intervalType === 3 && days) delayMs = days * 24 * 60 * 60 * 1000;
        resumeAt = new Date(Date.now() + delayMs);
      } else if (triggerType === 'time') {
        const {dateAndTime} = component;
        if (!dateAndTime) throw new Error('Date and time required for time trigger.');
        resumeAt = new Date(dateAndTime);
      } else {
        throw new Error(`Unknown triggerType: ${triggerType}`);
      }

      // 🕐 Schedule resume job using Agenda
      await this.agendaService.scheduleJob(resumeAt, {
        workflowId,
        nodeId: data.id,
        previousOutputs,
        outputDataId,
      });

      console.log(`✅ Wait node scheduled for ${resumeAt.toISOString()}`);
      return {resumeAt};

    } catch (error) {
      console.error('❌ Error scheduling wait node:', error);
      throw error;
    }
  }
}
