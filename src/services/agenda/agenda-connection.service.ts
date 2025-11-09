import Agenda from 'agenda';
import {Main} from '../nodes/main.service'; // optional import if you want to use it

let agenda: Agenda | null = null;

/**
 * Initialize Agenda (singleton)
 */
export async function createAgendaConnection(): Promise<Agenda> {
  if (agenda) return agenda; // Reuse single instance

  const mongoConnectionString =
    process.env.MONGO_CONNECTION_STRING ||
    'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist';

  agenda = new Agenda({
    db: {address: mongoConnectionString, collection: 'agendaJobs'},
    processEvery: '30 seconds',
    maxConcurrency: 20,
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
