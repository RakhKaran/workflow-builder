import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import axios, {AxiosRequestConfig} from 'axios';
import FormData from 'form-data';
import {NodeOutputRepository} from '../../repositories';
import {VariableService} from './variable.service';

export class APIService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
  ) { }

  async api(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const component = data?.component || null;

      // 🧠 Map numeric methods to string
      const methodMap: Record<number, string> = {
        1: 'get',
        2: 'post',
        3: 'put',
        4: 'patch',
        5: 'delete',
      };

      const method =
        typeof component.method === 'number'
          ? methodMap[component.method]
          : component.method?.toLowerCase?.() || 'get';

      // 🔄 Resolve variables in all dynamic fields
      const resolveValue = async (value: any): Promise<any> => {
        if (typeof value !== 'string') return value;
        const matches = value.match(/{{(.*?)}}/g);
        if (!matches) return value;

        let resolved = value;
        for (const match of matches) {
          const variableKey = match.replace(/[{}]/g, '').trim();
          const foundValue = await this.variableService.getVariableValue(`{{${variableKey}}}`, previousOutputs);

          let replacementValue = foundValue;
          // 👇 If it's a string and not already quoted, add quotes
          if (typeof foundValue === 'string' && !/^".*"$/.test(foundValue)) {
            replacementValue = `"${foundValue}"`;
          }

          resolved = resolved.replace(match, replacementValue ?? '""');
        }
        return resolved;
      };


      // 1️⃣ Build Axios config with resolved values
      const config: AxiosRequestConfig = {
        url: await resolveValue(component.url),
        method,
        headers: {},
      };

      // 🔹 Resolve headers
      if (component.headers?.length) {
        for (const {key, value} of component.headers) {
          if (key) {
            config.headers![await resolveValue(key)] = await resolveValue(value);
          }
        }
      }

      // 🔹 Resolve query strings
      if (component.queryStrings?.length) {
        config.params = {};
        for (const {key, value} of component.queryStrings) {
          if (key) {
            config.params[await resolveValue(key)] = await resolveValue(value);
          }
        }
      }

      // 2️⃣ Handle body based on type
      if (!['get', 'head'].includes(method.toLowerCase())) {
        if (component.bodyType === 1 && component.requestContent) {
          // JSON Raw
          const resolvedBody = await resolveValue(component.requestContent);
          console.log('resolved body 1', resolvedBody);
          try {
            config.data = JSON.parse(resolvedBody);
            console.log('resolved body', resolvedBody);
          } catch {
            config.data = resolvedBody; // fallback
          }
        } else if (component.bodyType === 2) {
          // x-www-form-urlencoded
          const obj: Record<string, string> = {};
          for (const field of component.urlEncodedFields || []) {
            obj[await resolveValue(field.key)] = await resolveValue(field.value);
          }
          config.data = obj;
        } else if (component.bodyType === 3) {
          // form-data
          const formData = new FormData();
          for (const field of component.formDataFields || []) {
            if (field.fieldType === 'text') {
              formData.append(await resolveValue(field.key), await resolveValue(field.value));
            } else if (field.fieldType === 'file') {
              formData.append(await resolveValue(field.key), field.value);
            }
          }
          config.data = formData;
          config.headers = {...config.headers, ...formData.getHeaders()};
        }
      }

      // 🧾 Debug log
      console.log('✅ Final resolved API config:', config);

      // 3️⃣ Execute API request
      const response = await axios(config);

      // 4️⃣ Save output
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 1,
        nodeId: data.id,
        output: response.data,
      });

      return {
        status: 'success',
        timestamp: new Date().toISOString(),
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ API node error:', error.message || error);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error.message || JSON.stringify(error),
      });
      throw error;
    }
  }
}
