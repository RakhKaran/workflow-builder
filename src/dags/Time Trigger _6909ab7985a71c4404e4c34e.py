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
    dag_id='Time_Trigger_6909ab7985a71c4404e4c34e',
    default_args=default_args,
    schedule="*/1 * * * *",
    catchup=False,
) as dag:
    task1 = BashOperator(
        task_id='Time_Trigger',
        bash_command='node /opt/airflow/dist/scripts/run-workflow.js 6909ab7985a71c4404e4c34e 2'
    )

    task1
