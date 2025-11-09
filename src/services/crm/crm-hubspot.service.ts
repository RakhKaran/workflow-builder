import {HttpErrors} from '@loopback/rest';
import axios from 'axios';
import {config} from 'dotenv';

config();

export class CRMHubSpot {
  constructor() { }

  // Step 1: Generate HubSpot Authorization URL
  async hubspotAuthentication(connectionName: string, workflowId: string) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    const scope = 'oauth';

    if (!clientId || !redirectUri) {
      throw new HttpErrors.BadRequest('Missing Credentials');
    }

    const state = Buffer.from(
      JSON.stringify({connectionName, workflowId})
    ).toString('base64');

    const authUrl = `https://app-na2.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

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
}
