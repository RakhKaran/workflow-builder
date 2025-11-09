import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import multer from 'multer';
import path from 'path';
import {EmailManagerBindings, FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY} from './keys';
import {MySequence} from './sequence';
import {AgendaService} from './services/agenda/agenda.service';
import {Connections} from './services/connections.service';
import {CRMHubSpot} from './services/crm/crm-hubspot.service';
import {EmailService} from './services/email.service';
import {MCPService} from './services/mcp.service';
import {APIService} from './services/nodes/api.service';
import {CaseService} from './services/nodes/case.service';
import {AirflowDagService} from './services/nodes/dag-creation.service';
import {IngestionService} from './services/nodes/ingestion.service';
import {IteratorService} from './services/nodes/iterator.service';
import {Main} from './services/nodes/main.service';
import {NotificationService} from './services/nodes/notification.service';
import {TimeService} from './services/nodes/time.service';
import {VariableService} from './services/nodes/variable.service';
import {WaitService} from './services/nodes/wait.service';
import {WebhookService} from './services/nodes/webhook.service';

export {ApplicationConfig};

export class WorkflowBuilderApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.lifeCycleObserver(AgendaService);
    this.sequence(MySequence);
    this.setUpBinding();

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);
    this.configureFileUpload(options.fileStorageDirectory);


    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  setUpBinding(): void {
    this.bind(EmailManagerBindings.SEND_MAIL).toClass(EmailService);
    // nodes services
    this.bind('services.Main').toClass(Main);
    this.bind('services.IngestionService').toClass(IngestionService);
    this.bind('services.NotificationService').toClass(NotificationService);
    this.bind('services.CaseService').toClass(CaseService);
    this.bind('services.WebhookService').toClass(WebhookService);
    this.bind('services.APIService').toClass(APIService);
    this.bind('services.VariableService').toClass(VariableService);
    this.bind('services.IteratorService').toClass(IteratorService);
    this.bind('services.TimeService').toClass(TimeService);
    this.bind('services.AirflowDagService').toClass(AirflowDagService);
    this.bind('services.AgendaService').toClass(AgendaService);
    this.bind('services.WaitService').toClass(WaitService);
    this.bind('services.CRMHubSpot').toClass(CRMHubSpot);
    this.bind('services.MCPService').toClass(MCPService);
    this.bind('services.Connections').toClass(Connections);
  }

  protected configureFileUpload(destination?: string) {
    // Upload files to `dist/.sandbox` by default
    destination = destination ?? path.join(__dirname, '../.sandbox');
    this.bind(STORAGE_DIRECTORY).to(destination);

    const multerOptions: multer.Options = {
      storage: multer.diskStorage({
        destination,
        // Use the original file name with a timestamp prefix
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
          const fileName = `${timestamp}_${file.originalname}`;
          cb(null, fileName);
        },
      }),
    };

    // Configure the file upload service with multer options
    this.configure(FILE_UPLOAD_SERVICE).to(multerOptions);
  }
}
