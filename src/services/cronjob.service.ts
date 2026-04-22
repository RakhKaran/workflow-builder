import {CronJob, cronJob} from '@loopback/cron';

@cronJob()
export class CheckDailyEntriesAtNoon extends CronJob {
  constructor(
  ) {
    super({
      cronTime: '0 12 * * *', // Every 30 seconds
      onTick: async () => {
        await this.runJob();
      },
      start: true,
    });
  }

  async runJob() {
    console.log('Cron job everyday at 12 is running at', new Date());
  }
}

@cronJob()
export class CheckDailyEntriesAtEvening extends CronJob {
  constructor(
  ) {
    super({
      cronTime: '0 18 * * *', // At 6 PM daily
      onTick: async () => {
        await this.runJob();
      },
      start: true,
    });
  }

  async runJob() {
    console.log('Cron job at 6 PM is running at', new Date());
  }
}
