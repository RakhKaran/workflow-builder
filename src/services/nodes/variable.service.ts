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

              if (path === "data") {
                foundValue = prev.output.data; // ✅ direct match
                break;
              }

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

  async getVariableValue(
    variableStr: string,
    previousOutputs: any[]
  ) {
    try {
      console.log('variableStr', variableStr);
      if (!variableStr || typeof variableStr !== 'string') return null;

      // Check if variableStr is dynamic and matches {{nodeId.variableName}}
      const match = variableStr.match(/^{{(.+?)\.(.+?)}}$/);
      if (!match) return variableStr; // if not dynamic, return as-is

      const nodeId = match[1].trim();
      const varName = match[2].trim();

      // Find previous output for this nodeId
      const nodeOutput = previousOutputs.find(
        (prev) => prev.nodeId?.toString() === nodeId
      );

      console.log('nodeOutput', nodeOutput.output);

      if (!nodeOutput) return null;

      // Find the variable value inside the output
      const variable = nodeOutput.output.data.find(
        (v: any) => v.variableName === varName
      );

      return variable?.variableValue ?? null;
    } catch (error) {
      console.log(error);
      throw new Error(`getVariableValue failed: ${error.message}`);
    }
  }
}
