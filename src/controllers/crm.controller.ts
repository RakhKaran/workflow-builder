import {inject} from '@loopback/core';
import {get, HttpErrors, param, post, requestBody, response} from '@loopback/rest';
import {WorkflowConnections} from '../models';
import {Connections} from '../services/connections.service';
import {CRMHubSpot} from '../services/crm/crm-hubspot.service';

export class CrmController {
  constructor(
    @inject('services.CRMHubSpot')
    private crmHubSpotService: CRMHubSpot,
    @inject('services.Connections')
    private connectionService: Connections,
  ) { }

  // ----------------------------------------HubSpot-----------------------------------------------

  // authentication...
  @post('/crm/hubspot-authentication')
  @response(200, {
    description: 'Get HubSpot OAuth URL',
  })
  async authenticateHubSpotConnection(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              connectionName: {type: 'string'},
              workflowId: {type: 'string'}
            }
          }
        }
      }
    })
    requestBody: {
      connectionName: string;
      workflowId: string;
    }
  ) {
    try {
      const verifyConnectionName = await this.connectionService.validateConnectionName(requestBody.connectionName, requestBody.workflowId);
      if (!verifyConnectionName) {
        throw new HttpErrors.BadRequest('Same connection name is already present');
      }
      const result = await this.crmHubSpotService.hubspotAuthentication(requestBody.connectionName, requestBody.workflowId);
      return result;
    } catch (error) {
      console.error('Error while authenticating HubSpot:', error);
      throw error;
    }
  }

  @get('/crm/hubspot-callback')
  @response(200, {
    description: 'Handle HubSpot OAuth callback',
  })
  async hubspotCallback(
    @param.query.string('code') code: string,
    @param.query.string('state') state: string,
  ) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      const {connectionName, workflowId} = decoded;
      const tokens = await this.crmHubSpotService.exchangeCodeForToken(code);
      const expiresInSeconds = tokens.expires_in ?? 0;
      const expiredAt = new Date(Date.now() + expiresInSeconds * 1000);

      const connectionObject = new WorkflowConnections({
        connectionName,
        workflowId,
        connectionType: 'hubspot',
        isConnectionEstablished: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiredAt,
        remark: 'HubSpot connection established successfully',
        isDeleted: false,
      });

      await this.connectionService.createConnection(connectionObject);
    } catch (error) {
      console.error('Error during HubSpot callback:', error);
      throw error;
    }
  }

  // Contacts Management...
  @get('/crm/hubspot-contacts/list/{connectionId}')
  async hubSpotContactsList(
    @param.path.string('connectionId') connectionId: string,
  ) {
    try {
      //
    } catch (error) {
      console.error('Error during HubSpot contact list:', error);
      throw error;
    }
  }
  // --------------------------------------HubSpot End----------------------------------------------
}
