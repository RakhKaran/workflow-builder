import Agenda from 'agenda';
import { Main } from '../nodes/main.service'; // optional import if you want to use it

let agenda: Agenda | null = null;

/**
 * Initialize Agenda (singleton)
 */
export async function createAgendaConnection(mainService?: Main): Promise<Agenda> {
  if (agenda) return agenda; // Reuse single instance

  const mongoConnectionString =
    process.env.MONGO_CONNECTION_STRING ||
    'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist';

  agenda = new Agenda({
    db: { address: mongoConnectionString, collection: 'agendaJobs' },
    processEvery: '30 seconds',
    maxConcurrency: 20,
  });

  // ✅ Define job — no `this` here, directly on agenda
  agenda.define('resume-workflow', async (job: any) => {
    const { workflowId, nodeId, previousOutputs, outputDataId } = job.attrs.data;

    console.log(`▶️ Resuming workflow ${workflowId} from node ${nodeId}`);
    if (!mainService) {
      console.warn('⚠️ mainService not provided — skipping actual resumeWorkflow call.');
      return;
    }

    try {
      await mainService.resumeWorkflow(outputDataId, nodeId, previousOutputs);
      console.log(`✅ Workflow ${workflowId} resumed successfully`);
    } catch (err) {
      console.error(`❌ Error resuming workflow ${workflowId}:`, err);
    }
  });

  await agenda.start();
  console.log('✅ Agenda connected and started (global)');
  return agenda;
}

/**
 * Get existing Agenda instance
 */
export function getAgenda(): Agenda {
  if (!agenda) {
    throw new Error('Agenda not initialized! Call createAgendaConnection() first.');
  }
  return agenda;
}
