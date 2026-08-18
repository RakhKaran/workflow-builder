import axios from 'axios';
import {get, HttpErrors, response} from '@loopback/rest';

/**
 * Proxy controller for the monorepo agents api.
 *
 * The agents api is served over plain http, so calling it directly from the
 * portal (https) gets blocked by the browser. The ui calls this endpoint on the
 * workflow host instead and the request to the agents api happens server side.
 */
export class AgentsController {
  constructor() {}

  private getAgentsApiUrl(): string {
    const agentsApiUrl = process.env.AGENTS_API_URL ?? process.env.AGENTS_API;

    if (!agentsApiUrl) {
      throw new HttpErrors.InternalServerError(
        'AGENTS_API_URL is not configured on the workflow host',
      );
    }

    return agentsApiUrl.replace(/\/+$/, '');
  }

  // Map to `GET /agents`
  @get('/agents')
  @response(200, {
    description: 'List of agents from the monorepo agents api',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {type: 'object', additionalProperties: true},
        },
      },
    },
  })
  async getAgents(): Promise<object[]> {
    const agentsApiUrl = this.getAgentsApiUrl();

    try {
      const {data} = await axios.get(`${agentsApiUrl}/agents`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error(
        'Error while fetching agents from agents api :',
        error.response?.data ?? error.message,
      );

      const statusCode = error.response?.status;

      if (statusCode && statusCode >= 400 && statusCode < 500) {
        throw new HttpErrors.BadRequest(
          error.response?.data?.message ?? 'Failed to fetch agents',
        );
      }

      throw new HttpErrors.BadGateway('Failed to fetch agents');
    }
  }
}
