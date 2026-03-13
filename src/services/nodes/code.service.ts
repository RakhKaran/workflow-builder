import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {VM, VMScript} from 'vm2';
import {NodeOutputRepository, WorkflowLogEntryRepository} from '../../repositories';
import {createWorkflowLog, resolveNodeName} from '../../utils/workflow-log.util';
import {VariableService} from './variable.service';

export class CodeService {
  constructor(
    @repository(NodeOutputRepository)
    private nodeOutputRepository: NodeOutputRepository,
    @repository(WorkflowLogEntryRepository)
    private workflowLogEntryRepository: WorkflowLogEntryRepository,

    @inject('services.VariableService')
    private variableService: VariableService,
  ) { }

  /**
   * Resolve variables recursively in strings/objects/arrays.
   * (Keeps your existing behavior.)
   */
  private resolveVariablesInObject = async (obj: any, previousOutputs: any[]): Promise<any> => {
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
        const variableKey = match.replace(/[{}]/g, '').trim();
        const foundValue = await this.variableService.getVariableValue(
          `{{${variableKey}}}`,
          previousOutputs,
        );
        // Convert foundValue to string for replacement; if object/array, JSON stringify
        const substitute =
          foundValue === null || foundValue === undefined
            ? ''
            : typeof foundValue === 'string'
              ? foundValue
              : JSON.stringify(foundValue);
        resolvedValue = resolvedValue.replace(match, substitute);
      }
      return resolvedValue;
    }

    // primitives (number, boolean, etc.)
    return obj;
  }

  /**
   * Public entrypoint for executing the Code node
   */
  public code = async (data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) => {
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
      const component = data?.component ?? null;

      if (component?.code) {
        // 1) Resolve variables inside the "code" string (and any other fields you might want)
        const resolvedCode = await this.resolveVariablesInObject(component.code, previousOutputs);

        // 2) Execute code in vm2 sandbox
        const result = await this.executeCodeInSandbox(
          String(resolvedCode),
          previousOutputs,
          workflowInstanceData,
        );

        console.log('result1111', result);

        // 3) Persist success output
        await this.nodeOutputRepository.create({
          workflowOutputsId: outputDataId,
          status: 1,
          nodeId: data.id,
          output: result,
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
          data: result,
        };
      }

      throw new HttpErrors.NotFound('No code found in omponent');
    } catch (error: any) {
      console.error('❌ Code node error:', error?.message ?? error);

      // Save error output
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data?.id,
        error: error?.message ?? JSON.stringify(error),
      });
      await createWorkflowLog(this.workflowLogEntryRepository, {
        workflowOutputsId: outputDataId,
        workflowInstancesId: workflowInstanceData?.id,
        nodeId: data?.id,
        nodeName,
        logsDescription: `${nodeName} node failed: ${error?.message ?? JSON.stringify(error)}`,
        logType: 1,
      });

      // Re-throw so upstream can handle it too
      throw error;
    }
  }

  /**
   * Execute user code safely in vm2
   *
   * - Supports returning a value or a Promise (async code)
   * - Uses a timeout to prevent infinite loops
   * - Does NOT provide require / network / fs access
   */
  private executeCodeInSandbox = async (
    userCode: string,
    previousOutputs: any[],
    workflowInstanceData: any,
    options?: {timeoutMs?: number},
  ): Promise<any> => {
    const timeoutMs = options?.timeoutMs ?? 1000; // default 1s; adjust as needed

    try {
      // Build a small wrapper so users can optionally define a function `main` and call it,
      // or just return a value directly. We return whichever the user returns.
      // We also freeze the provided objects inside the sandbox to avoid accidental mutation.
      console.log('userCode', userCode);
      const wrappedCode = `
        // user code starts here
        (async function(previousOutputs, workflowInstance) {
          "use strict";
          // make previousOutputs and workflowInstanceData available as read-only-ish
          const __previousOutputs = previousOutputs;
          const __workflowInstanceData = workflowInstance;

          // expose them with friendly names too (but as aliases)
          const previousOutputsData = __previousOutputs;
          const workflowInstanceData = __workflowInstanceData;

          // User code begins
          try {
            const __result = await (async () => {
              ${userCode}
            })();

            return __result;
          } catch (e) {
            throw e;
          }
          // If user code does not return anything, this wrapper returns undefined.
        })
      `;

      // Compile script (optional performance benefit)
      const script = new VMScript(wrappedCode);

      // VM options: no require, no external access. Timeout enforced on run.
      const vm = new VM({
        timeout: timeoutMs,
        sandbox: {}, // no globals except what we pass to the function call
      });

      // run the script to get the wrapper function
      const wrapperFn = vm.run(script) as any; // wrapperFn is an async function

      // Call wrapperFn within vm - but note: vm.run created it inside the VM; to execute safely,
      // we use vm.run to call the function as well, passing serialized inputs.
      // However, we cannot directly pass complex objects across the VM boundary without copying.
      // vm2 will copy simple objects; that is acceptable for typical workflows.
      // We'll pass copies for safety.

      // Deep-copy inputs (avoid letting user mutate host memory)
      const previousOutputsCopy = this.deepCopy(previousOutputs);
      const workflowInstanceDataCopy = this.deepCopy(workflowInstanceData);

      // Execute wrapperFn inside the vm with provided args.
      // Because wrapperFn was created inside the VM, invoking wrapperFn.call/ apply from host may not work as expected.
      // So we use vm.run to execute a small invocation script that calls the wrapper with our data injected into the sandbox.
      // Instead: vm.run can accept the script (function) and then we call it directly as wrapperFn(previousOutputs, workflowInstanceData)
      // vm2 allows calling functions returned by vm.run with host-provided args (it will perform a copy).
      const resultOrPromise = wrapperFn(previousOutputsCopy, workflowInstanceDataCopy);

      // Support Promise or plain value
      if (resultOrPromise && typeof resultOrPromise.then === 'function') {
        // Wait for resolution, but put an extra guard: race with timeout in host (in case vm's timeout didn't catch)
        const hostTimeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error('Code execution timeout (host guard)')), timeoutMs + 200),
        );
        return await Promise.race([resultOrPromise, hostTimeout]);
      }

      return resultOrPromise;
    } catch (err: any) {
      // normalize error for DB and caller
      const message = err?.message ?? String(err);
      // Throw same error up
      throw new Error(`Sandbox execution error: ${message}`);
    }
  }

  /**
   * Helper to deep copy data to avoid sharing Node host memory with VM.
   * Uses structured clone via JSON for simplicity — if you need Dates/Maps, replace with a better cloner.
   */
  private deepCopy = <T>(obj: T): T => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // fallback shallow copy
      return Object.assign({}, obj) as T;
    }
  }
}
