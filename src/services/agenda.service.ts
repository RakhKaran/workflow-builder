import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import Agenda from 'agenda';
import {Main} from './nodes/main.service';

@lifeCycleObserver('agenda')
export class AgendaService implements LifeCycleObserver {
  private agenda: Agenda;
  private isReady = false;

  constructor(
    @inject('services.Main')
    private mainService: Main,
  ) { }

  async init(): Promise<void> {
    const mongoConnectionString =
      process.env.MONGO_CONNECTION_STRING ||
      'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist';

    this.agenda = new Agenda({
      db: {address: mongoConnectionString, collection: 'agendaJobs'},
      processEvery: '30 seconds',
      maxConcurrency: 20,
    });

    // ✅ Define job once
    this.agenda.define('resume-workflow', async (job: any) => {
      const {workflowId, nodeId, previousOutputs, outputDataId} = job.attrs.data;

      console.log(`▶️ Resuming workflow ${workflowId} from node ${nodeId}`);
      try {
        await this.mainService.resumeWorkflow(
          outputDataId,
          nodeId,
          previousOutputs,
        );
        console.log(`✅ Workflow ${workflowId} resumed successfully`);
      } catch (err) {
        console.error(`❌ Error resuming workflow ${workflowId}:`, err);
      }
    });

    // ✅ Proper start (await ensures Mongo connected)
    await this.agenda.start();
    this.isReady = true;
    console.log('✅ Agenda connected and started');
  }

  async stop() {
    if (this.agenda) {
      await this.agenda.stop();
      console.log('🛑 Agenda stopped');
    }
  }

  async scheduleJob(resumeAt: Date, data: any) {
    if (!this.isReady || !this.agenda._collection) {
      console.warn('⚠️ Agenda not ready yet, skipping schedule');
      return;
    }
    await this.agenda.schedule(resumeAt, 'resume-workflow', data);
  }
}
