#!/usr/bin/env node
import axios from 'axios';

async function runWorkflow(workflowInstanceId: string, nodeId: string) {
  try {
    const response = await axios.post(`http://31.97.224.212:3058/workflow/time-trigger`, {
      workflowInstanceId,
      nodeId
    });

    return response;
  } catch (err: any) {
    console.error(JSON.stringify({error: err.message}));
    process.exit(1);
  } finally {
    console.log("Stopping the app");
  }
}

const [, , workflowInstanceId, nodeId] = process.argv;
if (!workflowInstanceId || !nodeId) {
  console.error("Usage: node run-time-trigger.js <workflowInstanceId> <nodeId>");
  process.exit(1);
}

runWorkflow(workflowInstanceId, nodeId).catch(err => {
  console.error("Unhandled error in workflow script:", err);
  process.exit(1);
});
