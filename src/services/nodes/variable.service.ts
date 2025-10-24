import {repository} from '@loopback/repository';
import {NodeOutputRepository} from '../../repositories';

export class VariableService {
  constructor(
    @repository(NodeOutputRepository)
    public nodeOutputRepository: NodeOutputRepository,
  ) { }

  async setVariables(
    data: any,
    previousOutputs: any[],
    workflowInstanceData: any,
    outputDataId: string
  ) {
    try {
      const variablesData = data?.component?.variables || [];
      const resolvedVariables: {variableName: string; variableValue: any}[] = [];

      for (const variable of variablesData) {
        const name = variable.variableName?.trim();
        if (!name) continue;

        let value = variable.variableValue;

        // Check if value is dynamic (enclosed in {{}})
        const dynamicMatch = typeof value === 'string' && value.match(/^{{(.*?)}}$/);
        if (dynamicMatch) {
          const path = dynamicMatch[1].trim(); // variable path inside {{}}, e.g., "userId" or "data.user.id"

          // search previousOutputs for this path
          let foundValue = null;

          for (const prev of previousOutputs) {
            if (prev.output && prev.output.data) {

              // Support nested paths like 'user.id'
              const parts = path.split('.');
              let temp = prev.output.data;
              for (const part of parts) {
                if (temp && Object.prototype.hasOwnProperty.call(temp, part)) {
                  temp = temp[part];
                } else {
                  temp = undefined;
                  break;
                }
              }

              if (temp !== undefined) {
                foundValue = temp;
                break;
              }
            }
          }

          value = foundValue ?? null; // if not found, set null
        }

        resolvedVariables.push({
          variableName: name,
          variableValue: value,
        });
      }

      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 1, // success
        nodeId: data.id,
        output: resolvedVariables
      });

      return {
        status: "success",
        timestamp: new Date().toISOString(),
        data: resolvedVariables,
      };
    } catch (error) {
      console.error("NotificationService.setVariables error:", error);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error.message || error,
      });
      throw new Error(`Notification failed: ${error.message}`);
    }
  }
}
