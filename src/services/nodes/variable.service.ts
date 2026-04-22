import {repository} from '@loopback/repository';
import {NodeOutputRepository, WorkflowLogEntryRepository} from '../../repositories';
import {createWorkflowLog, resolveNodeName} from '../../utils/workflow-log.util';

export class VariableService {
  constructor(
    @repository(NodeOutputRepository)
    public nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,
  ) { }

  async setVariables(
    data: any,
    previousOutputs: any[],
    workflowInstanceData: any,
    outputDataId: string
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
      const variablesData = data?.component?.variables || [];
      const resolvedVariables: {variableName: string; variableValue: any}[] = [];

      for (const variable of variablesData) {
        const name = variable.variableName?.trim();
        if (!name) continue;

        let value = variable.variableValue;

        // Check if value is dynamic (enclosed in {{}})
        // Support dynamic expressions like {{apiResponse[0].email}} or {{data.user.name}}
        const dynamicMatch = typeof value === 'string' && value.match(/^{{(.*?)}}$/);
        if (dynamicMatch) {
          const path = dynamicMatch[1].trim();

          let foundValue = null;

          for (const prev of previousOutputs) {
            if (prev.output && prev.output.data) {
              try {
                // Allow access to nested properties and array indices safely
                const dataContext = {...prev.output.data};

                // Evaluate the path safely
                const fn = new Function("data", `return data?.${path}`);
                const result = fn(dataContext);

                if (result !== undefined) {
                  foundValue = result;
                  break;
                }
              } catch (err) {
                // If path is invalid, skip
                continue;
              }
            }
          }

          value = foundValue ?? null;
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
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node completed successfully`,
        logType: 2,
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
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node failed: ${error.message || error}`,
        logType: 1,
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
