import fs from "fs";
import path from "path";

interface NodeConfig {
  dagName: string;
  taskId: string;
  schedulerType: string; // e.g., "seconds" | "minutes" | "hours" | "days" | "weeks" | "months"
  config: any; // trigger details like { minutes: 5 } or { dayHour: 2, minuteTrigger: 30 }
  id: string | number; // scheduler or workflow ID
  nodeId: string
}

export class AirflowDagService {
  async createDagFile(nodeConfig: NodeConfig) {
    const {dagName, taskId, schedulerType, config, id, nodeId} = nodeConfig;

    const projectRoot = path.resolve(__dirname, "../../../");
    const dagsPath = path.join(projectRoot, "dags");

    if (!fs.existsSync(dagsPath)) {
      fs.mkdirSync(dagsPath, {recursive: true});
    }

    // --- Determine cron expression based on scheduler type ---
    const scheduleInterval = this.buildCronExpression(schedulerType, config);

    // --- Create DAG File Content ---
    const dagFileName = `${dagName}.py`;

    const dagContent = `
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2025, 9, 19),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='${dagName}',
    default_args=default_args,
    schedule=${scheduleInterval},
    catchup=False,
) as dag:
    task1 = BashOperator(
        task_id='${taskId}',
        bash_command='node /opt/airflow/dist/scripts/run-workflow.js ${id} ${nodeId}'
    )

    task1
`;

    // --- Write DAG file ---
    fs.writeFileSync(path.join(dagsPath, dagFileName), dagContent.trim());
    console.log(`✅ DAG file created: ${dagFileName}`);

    return dagFileName;
  }

  // Helper to generate cron based on type
  private buildCronExpression(type: string, config: any): string {
    switch (type) {
      case "seconds":
        // Airflow doesn’t support second-level triggers directly, use every N minutes
        return `"*/${Math.ceil(config.seconds / 60) || 1} * * * *"`;

      case "minutes":
        return `"*/${config.minutes} * * * *"`;

      case "hours":
        // Every N hours at a specific minute
        return `"${config.minuteTrigger} */${config.hoursBetween} * * *"`;

      case "days":
        // Every N days at given hour:minute
        return `"${config.minuteTrigger} ${config.dayHour} */${config.daysBetween} * *"`;

      case "weeks":
        // Specific days of week (0–6, where 0 = Sunday)
        const daysOfWeek = Array.isArray(config.daysOfWeek)
          ? config.daysOfWeek.join(",")
          : "0";
        return `"${config.minuteTrigger} ${config.dayHour} * * ${daysOfWeek}"`;

      case "months":
        // Every N months on specific day/hour/minute
        return `"${config.minuteTrigger} ${config.dayHour} ${config.monthDayAt} */${config.monthsBetween} *"`;

      default:
        // Fallback to daily
        return `"0 1 * * *"`;
    }
  }
}
