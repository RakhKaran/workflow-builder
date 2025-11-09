import {lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import { getAgenda } from './agenda-connection.service';

@lifeCycleObserver('agenda')
export class AgendaService{
  constructor() { }

  async scheduleJob(resumeAt: Date, data: any) {
    const agenda = getAgenda();

    // Optional sanity check (to avoid race condition)
    if (!agenda || !(agenda as any)._collection) {
      console.warn('⚠️ Agenda not ready yet, skipping schedule');
      return;
    }

    console.log('🕒 Scheduling job for', resumeAt.toISOString());
    await agenda.schedule(resumeAt, 'resume-workflow', data);
    console.log('✅ Wait node scheduled for', resumeAt.toISOString());
  }
}
