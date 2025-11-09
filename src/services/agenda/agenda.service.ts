import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {Main} from '../nodes/main.service';
import {getAgenda} from './agenda-connection.service';

@lifeCycleObserver('agenda')
export class AgendaService implements LifeCycleObserver {
  constructor(
    @inject('services.Main')
    private mainService: Main,
  ) { }

  /**
   * Called automatically when app starts
   */
  async start(): Promise<void> {
    const agenda = getAgenda();

    // ✅ Define jobs once
    agenda.define('resume-workflow', async (job: any) => {
      const {workflowId, nodeId, previousOutputs, outputDataId} = job.attrs.data;

      console.log(`▶️ [Agenda] Resuming workflow ${workflowId} from node ${nodeId}`);
      try {
        await this.mainService.resumeWorkflow(outputDataId, nodeId, previousOutputs);
        console.log(`✅ Workflow ${workflowId} resumed successfully`);
      } catch (err) {
        console.error(`❌ Error resuming workflow ${workflowId}:`, err);
      }
    });

    console.log('📦 [AgendaService] Jobs registered automatically');
  }

  /**
   * Schedule a job for later
   */
  async scheduleJob(resumeAt: Date, data: any) {
    const agenda = getAgenda();
    if (!agenda || !(agenda as any)._collection) {
      console.warn('⚠️ Agenda not ready yet, skipping schedule');
      return;
    }

    console.log('🕒 Scheduling job for', resumeAt.toISOString());
    await agenda.schedule(resumeAt, 'resume-workflow', data);
    console.log('✅ Wait node scheduled for', resumeAt.toISOString());
  }
}
