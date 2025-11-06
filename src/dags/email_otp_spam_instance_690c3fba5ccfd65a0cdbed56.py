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
    dag_id='email_otp_spam_instance_690c3fba5ccfd65a0cdbed56',
    default_args=default_args,
    schedule="*/2 * * * *",
    catchup=False,
) as dag:
    task1 = BashOperator(
        task_id='email_otp_spam_instance',
        bash_command='node /opt/airflow/dist/scripts/run-workflow.js 690c3fba5ccfd65a0cdbed56 2'
    )

    task1
