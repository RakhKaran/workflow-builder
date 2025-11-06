from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import requests

API_URL = "http://31.97.224.212:3058/workflow/time-trigger"
WORKFLOW_INSTANCE_ID = "6909ab7985a71c4404e4c34e"
NODE_ID = "2"

def call_workflow_api():
    payload = {
        "workflowInstanceId": WORKFLOW_INSTANCE_ID,
        "nodeId": NODE_ID
    }
    headers = {"Content-Type": "application/json"}

    try:
        print(f"🚀 Calling API: {API_URL}")
        response = requests.post(API_URL, json=payload, headers=headers, timeout=60)

        if response.status_code != 200:
            raise Exception(f"API call failed: {response.status_code}, Response: {response.text}")

        print("✅ API call successful")
        print("Response:", response.text)
        return response.text

    except requests.exceptions.RequestException as e:
        print("❌ API request failed:", e)
        raise

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": datetime(2025, 9, 19),
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="Time_Trigger_6909ab7985a71c4404e4c34e",
    default_args=default_args,
    schedule="*/1 * * * *",
    catchup=False,
) as dag:

    trigger_workflow = PythonOperator(
        task_id="call_workflow_api",
        python_callable=call_workflow_api,
    )

    trigger_workflow
