import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {NodeOutputRepository} from '../../repositories';
import {VariableService} from './variable.service';

export class IteratorService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
  ) { }

  async iterator(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const component = data?.component || null;

      if (component) {
        if (component.isMapped) {
          const variable = component.variable;
          const resolvedValue = await this.variableService.getVariableValue(`{{${variable.nodeId}.${variable.variableName}}}`, previousOutputs);
          await this.nodeOutputRepository.create({
            workflowOutputsId: outputDataId,
            status: 1,
            nodeId: data.id,
            output: resolvedValue,
          });

          return {
            status: 'success',
            timestamp: new Date().toISOString(),
            data: resolvedValue,
          };
        } else {
          await this.nodeOutputRepository.create({
            workflowOutputsId: outputDataId,
            status: 1,
            nodeId: data.id,
            output: component.array,
          });

          return {
            status: 'success',
            timestamp: new Date().toISOString(),
            data: component.array,
          };
        }
      }

      throw new HttpErrors.NotFound('Component not found');
    } catch (error) {
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
