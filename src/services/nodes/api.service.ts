import {repository} from '@loopback/repository';
import axios, {AxiosRequestConfig} from 'axios';
import FormData from 'form-data';
import {NodeOutputRepository} from '../../repositories';

export class APIService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository
  ) { }

  async api(
    data: any,
    previousOutputs: any[],
    workflowInstanceData: any,
    outputDataId: string
  ) {
    try {
      const component = data?.component || null;

      // 🧠 Convert numeric method to string
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

      // 1️⃣ Construct the Axios request config
      const config: AxiosRequestConfig = {
        url: component.url,
        method,
        headers: component.headers?.reduce(
          (acc: Record<string, string>, curr: any) => ({
            ...acc,
            [curr.key]: curr.value,
          }),
          {}
        ),
        params: component.queryStrings?.reduce(
          (acc: Record<string, string>, curr: any) => ({
            ...acc,
            [curr.key]: curr.value,
          }),
          {}
        ),
      };

      // 2️⃣ Add request body if applicable
      if (!['get', 'head'].includes(method.toLowerCase())) {
        if (component.bodyType === 1 && component.requestContent) {
          config.data = JSON.parse(component.requestContent);
        } else if (component.bodyType === 2) {
          config.data = component.urlEncodedFields?.reduce(
            (acc: Record<string, string>, curr: any) => ({
              ...acc,
              [curr.key]: curr.value,
            }),
            {}
          );
        } else if (component.bodyType === 3) {
          const formData = new FormData();
          component.formDataFields?.forEach((field: any) => {
            if (field.fieldType === 'text') {
              formData.append(field.key, field.value);
            } else if (field.fieldType === 'file') {
              formData.append(field.key, field.value);
            }
          });
          config.data = formData;
          // Merge form-data headers into axios config
          config.headers = {
            ...config.headers,
            ...formData.getHeaders(),
          };
        }
      }

      // 3️⃣ Make API request
      console.log('config', config);
      const response = await axios(config);

      // 4️⃣ Store output
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
      console.error('API node error:', error.message || error);
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
