import {inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import axios from 'axios';
import {config} from 'dotenv';
import {Connections} from '../connections.service';
import {MCPService} from '../mcp.service';

config();

export class CRMHubSpot {
  constructor(
    @inject('services.Connections')
    private connectionService: Connections,
    @inject('services.MCPService')
    private mcpService: MCPService,
  ) { }

  // -------------------------------- authentication for hubspot ----------------------------------------------
  // Step 1: Generate HubSpot Authorization URL
  async hubspotAuthentication(connectionName: string, workflowId: string) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'content',
      'oauth'
    ];

    if (!clientId || !redirectUri) {
      throw new HttpErrors.BadRequest('Missing Credentials');
    }

    const state = Buffer.from(
      JSON.stringify({connectionName, workflowId})
    ).toString('base64');

    const authUrl = `https://app-na2.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scopes.join(' '))}&state=${encodeURIComponent(state)}`;

    // Return the authorization URL to frontend
    return {authUrl};
  }

  // Step 2: Exchange authorization code for access token
  async exchangeCodeForToken(code: string) {
    const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

    if (!clientId || !redirectUri || !clientSecret) {
      throw new HttpErrors.BadRequest('Missing Credentials');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });

    return response.data;
  }

  // step 3: Regenerate new token using refresh token
  async refreshToken(connectionId: string) {
    try {
      const connectionData = await this.connectionService.getConnection(connectionId);

      if (!connectionData || !connectionData.refreshToken) {
        throw new HttpErrors.BadRequest('No refresh token found for this connection');
      }

      const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
      const clientId = process.env.HUBSPOT_CLIENT_ID;
      const clientSecret = process.env.HUBSPOT_CLIENT_SECRET!;

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: connectionData.refreshToken,
      });

      const response = await axios.post(tokenUrl, params, {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      });

      // ✅ Update the new tokens in your database
      const updatedData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || connectionData.refreshToken, // sometimes refresh token is not returned
        expiresIn: response.data.expires_in,
      };

      await this.connectionService.updateConnection(connectionId, updatedData);

      return {
        message: 'Access token refreshed successfully',
        data: updatedData,
      };
    } catch (error: any) {
      console.error('Error while generating new token:', error.response?.data || error.message);
      throw new HttpErrors.InternalServerError('Failed to refresh HubSpot token');
    }
  }

  // --------------------------------- Contacts CRUD -----------------------------------------------------
  async createContact(connectionId: string, contactData: object) {
    try {
      const updatedConnectionData = await this.refreshToken(connectionId);
      if (updatedConnectionData) {
        const env = {
          "HUBSPOT_API_KEY": updatedConnectionData.data.accessToken
        }
        const connectionResponse = await this.mcpService.mcpInitialConnection(env);
        console.log('connection response', connectionResponse);
        console.log('contact data', contactData);

        const response = await this.mcpService.mcpCallTool('HubSpot.create_contact', contactData);
        return response;
      }
    } catch (error) {
      console.error('Error while adding new contact: ', error.response?.data || error.message);
      throw new HttpErrors.InternalServerError('Failed to refresh HubSpot token');
    }
  }
}
