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
    dag_id='new_time_trigger_690c53905ccfd65a0cdbed59',
    default_args=default_args,
    schedule="*/2 * * * *",
    catchup=False,
) as dag:
    task1 = BashOperator(
        task_id='new_time_trigger',
        bash_command='node /opt/airflow/dist/scripts/run-workflow.js 690c53905ccfd65a0cdbed59 2'
    )

    task1
