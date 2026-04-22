import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import axios, {AxiosRequestConfig, Method} from 'axios';
import {promises as fs} from 'fs';
import path from 'path';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository, WorkflowLogEntryRepository} from '../../repositories';
import {createWorkflowLog, resolveNodeName} from '../../utils/workflow-log.util';
import {GoogleAuthService} from '../google-auth.service';
import {VariableService} from './variable.service';

export class MonorepoService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
    @inject('services.GoogleAuthService')
    private googleAuthService: GoogleAuthService,
  ) {}

  async monorepo(
    data: any,
    previousOutputs: any[],
    workflowInstanceData: any,
    outputDataId: string,
  ) {
    const nodeName = resolveNodeName(data);

    try {
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `Started ${nodeName} node execution`,
        logType: 0,
      });

      const component = data?.component ?? {};
      const agentDefinition = await this.getAgentDefinition(component);
      const execution = component.execution ?? agentDefinition?.execution;

      if (!execution?.endpoint) {
        throw new HttpErrors.BadRequest('Monorepo agent execution metadata is missing');
      }

      const resolvedComponent = await this.resolveComponentValues(component, previousOutputs);
      const requestConfig = await this.buildRequestConfig(execution, resolvedComponent, previousOutputs);
      console.log('request config', requestConfig.data);
      const response = await axios(requestConfig);

      const output = {
        agentId: component.agentId,
        endpoint: requestConfig.url,
        method: requestConfig.method,
        statusCode: response.status,
        data: response.data,
      };

      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 1,
        nodeId: data.id,
        output,
      });

      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node completed successfully`,
        logType: 2,
      });

      return {
        status: 'success',
        timestamp: new Date().toISOString(),
        data: output,
      };
    } catch (error: any) {
      console.error('MonorepoService.monorepo error:', error.response?.data || error.message || error);

      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error.response?.data || error.message || JSON.stringify(error),
      });

      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node failed: ${error.message || JSON.stringify(error)}`,
        logType: 1,
      });

      throw error;
    }
  }

  private async getAgentDefinition(component: any) {
    if (!component?.agentId) {
      return null;
    }

    const agentsFilePath = path.resolve(
      process.cwd(),
      '../workflow-monorepo/my-turborepo/packages/idp-agents/agents.json',
    );

    try {
      const fileContent = await fs.readFile(agentsFilePath, 'utf8');
      const agents = JSON.parse(fileContent);
      return agents.find((agent: any) => agent.id === component.agentId) ?? null;
    } catch (error) {
      console.warn('Unable to read monorepo agents.json for fallback execution lookup', error);
      return null;
    }
  }

  private async resolveComponentValues(component: any, previousOutputs: any[]) {
    const resolvedAuth = await this.resolveVariablesInObject(component.auth ?? {}, previousOutputs);
    const refreshedAuth = await this.refreshGoogleAccessTokenIfNeeded(resolvedAuth);

    return {
      ...component,
      config: await this.resolveVariablesInObject(component.config ?? {}, previousOutputs),
      auth: refreshedAuth,
    };
  }

  private async refreshGoogleAccessTokenIfNeeded(auth: any) {
    if (!auth?.google_refresh_token) {
      console.log('refresh token not found');
      return auth;
    }

    const refreshedToken = await this.googleAuthService.refreshAccessToken(auth.google_refresh_token);

    return {
      ...auth,
      google_access_token: refreshedToken.access_token,
      token_type: refreshedToken.token_type || auth.token_type,
      expiry_date: refreshedToken.expires_in
        ? new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString()
        : auth.expiry_date,
    };
  }

  private async resolveVariablesInObject(obj: any, previousOutputs: any[]): Promise<any> {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      const resolvedArray = [];
      for (const item of obj) {
        resolvedArray.push(await this.resolveVariablesInObject(item, previousOutputs));
      }
      return resolvedArray;
    }

    if (typeof obj === 'object') {
      const resolvedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolvedObj[key] = await this.resolveVariablesInObject(value, previousOutputs);
      }
      return resolvedObj;
    }

    if (typeof obj === 'string') {
      const matches = obj.match(/{{(.*?)}}/g);
      if (!matches) return obj;

      let resolvedValue = obj;

      for (const match of matches) {
        const variableValue = await this.variableService.getVariableValue(match, previousOutputs);
        resolvedValue = resolvedValue.replace(match, variableValue ?? '');
      }

      return resolvedValue;
    }

    return obj;
  }

  private async buildRequestConfig(
    execution: any,
    component: any,
    previousOutputs: any[],
  ): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {
      url: execution.endpoint,
      method: (execution.method || 'POST').toLowerCase() as Method,
      headers: {},
      timeout: execution.timeoutMs ?? 30000,
    };

    const resolveTemplate = async (value: any): Promise<any> => {
      if (Array.isArray(value)) {
        const resolvedArray = [];
        for (const item of value) {
          resolvedArray.push(await resolveTemplate(item));
        }
        return resolvedArray;
      }

      if (value && typeof value === 'object') {
        const resolvedObject: any = {};
        for (const [key, nestedValue] of Object.entries(value)) {
          resolvedObject[key] = await resolveTemplate(nestedValue);
        }
        return resolvedObject;
      }

      if (typeof value !== 'string') {
        return value;
      }

      const matches = value.match(/{{(.*?)}}/g);

      if (!matches) {
        return value;
      }

      if (matches.length === 1 && value.trim() === matches[0]) {
        return this.resolvePlaceholder(matches[0], component, previousOutputs);
      }

      let resolvedString = value;
      for (const match of matches) {
        const replacement = await this.resolvePlaceholder(match, component, previousOutputs);
        resolvedString = resolvedString.replace(match, replacement ?? '');
      }
      return resolvedString;
    };

    const resolvedHeaders = await resolveTemplate(execution.headers ?? {});
    config.headers = resolvedHeaders;

    if (execution.queryParams) {
      config.params = await resolveTemplate(execution.queryParams);
    }

    if (execution.bodyTemplate) {
      config.data = await resolveTemplate(execution.bodyTemplate);
    }

    return config;
  }

  private async resolvePlaceholder(
    placeholder: string,
    component: any,
    previousOutputs: any[],
  ) {
    const token = placeholder.replace(/[{}]/g, '').trim();

    if (token.startsWith('config.')) {
      const key = token.replace('config.', '');
      return component?.config?.[key] ?? '';
    }

    if (token.startsWith('auth.')) {
      const key = token.replace('auth.', '');
      return component?.auth?.[key] ?? '';
    }

    if (token === 'partnerApiKey') {
      return (
        process.env.PARTNER_API_KEY ??
        process.env.MONOREPO_PARTNER_API_KEY ??
        ''
      );
    }

    return this.variableService.getVariableValue(`{{${token}}}`, previousOutputs);
  }
}
