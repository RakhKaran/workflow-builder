import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository} from '../../repositories';
import {CRMHubSpot} from '../crm/crm-hubspot.service';
import {VariableService} from './variable.service';

export class CRMService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
    @inject('services.CRMHubSpot')
    private crmHubSpotService: CRMHubSpot,
  ) { }

  private async resolveVariablesInObject(obj: any, previousOutputs: any[]): Promise<any> {
    if (obj === null || obj === undefined) return obj;

    // Case 1: Array → resolve each element
    if (Array.isArray(obj)) {
      const resolvedArray = [];
      for (const item of obj) {
        resolvedArray.push(await this.resolveVariablesInObject(item, previousOutputs));
      }
      return resolvedArray;
    }

    // Case 2: Object → resolve each key/value
    if (typeof obj === 'object') {
      const resolvedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolvedObj[key] = await this.resolveVariablesInObject(value, previousOutputs);
      }
      return resolvedObj;
    }

    // Case 3: String → resolve any {{variable}} inside it
    if (typeof obj === 'string') {
      const matches = obj.match(/{{(.*?)}}/g);
      if (!matches) return obj;

      let resolvedValue = obj;
      for (const match of matches) {
        const variableKey = match.replace(/[{}]/g, '').trim();
        const foundValue = await this.variableService.getVariableValue(`{{${variableKey}}}`, previousOutputs);

        resolvedValue = resolvedValue.replace(match, foundValue ?? '');
      }
      return resolvedValue;
    }

    // Default: return as-is
    return obj;
  }

  async crm(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const component = data?.component ?? null;

      if (component.valueRef === 1 && component.crmType) {
        const result = await this.promptAction(component, previousOutputs);

        await this.nodeOutputRepository.create({
          workflowOutputsId: outputDataId,
          status: 1,
          nodeId: data.id,
          output: result,
        });

        return {
          status: 'success',
          timestamp: new Date().toISOString(),
          data: result,
        };
      }

      if (component?.crmType === 'hubspot') {
        const result = await this.hubspot(component, previousOutputs);

        await this.nodeOutputRepository.create({
          workflowOutputsId: outputDataId,
          status: 1,
          nodeId: data.id,
          output: result,
        });

        return {
          status: 'success',
          timestamp: new Date().toISOString(),
          data: result,
        };
      }
    } catch (error) {
      console.error('❌ CRM node error:', error.message || error);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error.message || JSON.stringify(error),
      });
      throw error;
    }
  }

  // --------------------------------------------prompt action------------------------------------------
  async promptAction(component: any, previousOutputs: any[]) {
    try {
      let result: any;

      if (component.crmType === 'hubspot') {
        const resolvedPrompt = await this.resolveVariablesInObject(
          component.prompt,
          previousOutputs,
        );

        console.log('✅ Resolved Contact Details:', resolvedPrompt);
        result = await this.crmHubSpotService.promptActions(component.selectedConnection, resolvedPrompt);
      }

      return result;
    } catch (error) {
      console.log('Error in prompt action function: ', error);
      throw error;
    }
  }

  // --------------------------------------------hubspot section------------------------------------------
  async hubspot(component: any, previousOutputs: any[]) {
    try {
      let result: any;

      if (!component?.selectedConnection) {
        throw new HttpErrors.BadRequest('Connection token is missing');
      };

      if (component.hubspotTask === 1) {
        result = await this.hubspotContactOperations(component, previousOutputs);
      }

      return result;
    } catch (error) {
      console.log('Error in hubspot function: ', error);
      throw error;
    }
  }

  async hubspotContactOperations(component: any, previousOutputs: any[]) {
    try {
      let result: any;

      if (component.contactTask === 1) {
        const resolvedContactDetails = await this.resolveVariablesInObject(
          component.contactDetails,
          previousOutputs,
        );

        console.log('✅ Resolved Contact Details:', resolvedContactDetails);
        result = await this.crmHubSpotService.fetchContacts(component.selectedConnection, resolvedContactDetails);
      }

      // create contact..
      if (component.contactTask === 3) {
        const resolvedContactDetails = await this.resolveVariablesInObject(
          component.contactDetails,
          previousOutputs,
        );

        console.log('✅ Resolved Contact Details:', resolvedContactDetails);
        result = await this.crmHubSpotService.createContact(component.selectedConnection, resolvedContactDetails);
      }

      // update contact..
      if (component.contactTask === 4) {
        const resolvedContactDetails = await this.resolveVariablesInObject(
          component.contactDetails,
          previousOutputs,
        );

        console.log('✅ Resolved Contact Details:', resolvedContactDetails);
        result = await this.crmHubSpotService.updateContact(component.selectedConnection, resolvedContactDetails);
      }

      return result;
    } catch (error) {
      console.log('Error in hubspot contact function: ', error);
      throw error;
    }
  }


  // --------------------------------------------Upcoming sections------------------------------------------

}
