from airflow import DAG
from airflow.operators.bash import BashOperator
import pendulum

with DAG(
    dag_id="run_main_workflow",
    description="Run LB4 Main Service via Node.js",
    start_date=pendulum.datetime(2023, 1, 1, tz="UTC"),
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

