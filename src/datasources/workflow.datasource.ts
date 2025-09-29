import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'web_scrapper',
  connector: 'mongodb',
  url: 'mongodb+srv://karanrakh19:Dxafj3dUABszmb83@todolist.ui3hm4s.mongodb.net/workflow?retryWrites=true&w=majority&appName=todolist',
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000,   // Increase initial connection timeout to 30 seconds
  socketTimeoutMS: 30000,    // Increase socket timeout to 30 seconds
  serverSelectionTimeoutMS: 30000, // How long to wait to find a suitable server
  retryWrites: true,         // Ensure writes are retried on transient failures
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class WorkflowDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'workflow';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.workflow', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
