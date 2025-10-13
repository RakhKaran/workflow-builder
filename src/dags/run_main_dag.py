from airflow import DAG
from airflow.providers.standard.operators.bash import BashOperator
from datetime import datetime

with DAG(
    dag_id="run_main_workflow",
    description="Run LB4 Main Service via Node.js",
    start_date=datetime(2023, 1, 1),
    schedule=None,
    catchup=False,  
    tags=["lb4", "workflow"],
) as dag:
    
    run_main = BashOperator(
        task_id="run_main_service",
        bash_command="node /opt/airflow/dist/scripts/run-main.js",
    )

    run_main
