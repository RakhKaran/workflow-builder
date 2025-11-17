from airflow import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.utils import timezone

with DAG(
    dag_id="run_main_workflow",
    description="Run LB4 Main Service via Node.js",
    start_date=timezone.datetime(2023, 1, 1),
    schedule=None,
    catchup=False,
    tags=["lb4", "workflow"],
) as dag:

    run_main = BashOperator(
        task_id="run_main_service",
        bash_command="node /opt/airflow/dist/scripts/run-main.js",
        env={
            "MONGO_CONNECTION_STRING": "mongodb://admin:Admin%40123@host.docker.internal:27017/workflow?authSource=admin",
            "NODE_ENV": "production"
        }
    )

    run_main
