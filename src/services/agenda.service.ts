import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import Agenda from 'agenda';
import {Main} from './nodes/main.service'; // adjust the import path as needed

@lifeCycleObserver('agenda')
export class AgendaService implements LifeCycleObserver {
  private agenda: Agenda;

  constructor(
    @inject('services.Main')
    private mainService: Main,
  ) {
    const mongoConnectionString =
      process.env.MONGO_CONNECTION_STRING ||
      'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist';

    this.agenda = new Agenda({
      db: {address: mongoConnectionString, collection: 'agendaJobs'},
      processEvery: '30 seconds',
      maxConcurrency: 20,
    });

    // ✅ Define job
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

    this.agenda.on('ready', async () => {
      await this.agenda.start();
      console.log('✅ Agenda connected and started');
    });

    this.agenda.on('error', (err) => {
      console.error('❌ Agenda connection error:', err);
    });
  }

  // 🧹 Optional — gracefully stop agenda when app stops
  async stop() {
    await this.agenda.stop();
    console.log('🛑 Agenda stopped');
  }

  // ✅ expose schedule method for other services to call
  async scheduleJob(resumeAt: Date, data: any) {
    await this.agenda.schedule(resumeAt, 'resume-workflow', data);
  }
}
