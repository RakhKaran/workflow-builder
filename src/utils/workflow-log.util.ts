import {WorkflowLogEntryRepository} from '../repositories';

type WorkflowLogInput = {
  workflowOutputsId?: string;
  workflowInstancesId?: string;
  nodeId?: string;
  nodeName?: string;
  logsDescription: string;
  logType: number;
  remark?: string;
};

export function resolveNodeName(node: any): string {
  return node?.nodeName ?? node?.name ?? node?.label ?? node?.id ?? 'Unknown Node';
}

export async function createWorkflowLog(
  workflowLogEntryRepository: WorkflowLogEntryRepository,
  input: WorkflowLogInput,
): Promise<void> {
  if (!input.workflowOutputsId || !input.nodeId || !input.nodeName) {
    return;
  }

  try {
    await workflowLogEntryRepository.create({
      workflowOutputsId: input.workflowOutputsId,
      workflowInstancesId: input.workflowInstancesId,
      nodeId: input.nodeId,
      nodeName: input.nodeName,
      logsDescription: input.logsDescription,
      logType: input.logType,
      remark: input.remark,
      isActive: true,
      isDeleted: false,
    });
  } catch (error) {
    console.error('Failed to persist workflow log entry:', error);
  }
}
