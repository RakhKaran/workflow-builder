import Agenda from 'agenda';

let agenda: Agenda | null = null;

/**
 * Initialize Agenda (singleton)
 */
export async function createAgendaConnection(): Promise<Agenda> {
  if (agenda) {
    console.log('⚙️ Agenda already initialized, reusing existing instance');
    return agenda;
  }

  const mongoConnectionString =
    process.env.MONGO_CONNECTION_STRING ||
    'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist';

  console.log('⏳ Connecting to Agenda MongoDB...');

  agenda = new Agenda({
    db: { address: mongoConnectionString, collection: 'agendaJobs' },
    processEvery: '30 seconds',
    maxConcurrency: 20,
  });

  // Log key Agenda events for visibility
  agenda.on('ready', () => console.log('⚡ Agenda Mongo ready'));
  agenda.on('start', job => console.log('🚀 Job started:', job.attrs.name));
  agenda.on('complete', job => console.log('✅ Job done:', job.attrs.name));
  agenda.on('fail', (err, job) => console.log('❌ Job failed:', job.attrs.name, err.message));

  // 💥 Start only after definitions are guaranteed to exist (AgendaService.start() defines them)
  // So usually this is called before app.start(), then AgendaService.start() runs right after.
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
