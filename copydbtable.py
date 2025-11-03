import boto3
import json
import sys
from botocore.exceptions import ClientError

SOURCE_TABLE = "spookydecs_ideas_dev"
DEST_TABLE = "spookydecs_ideas_prod"
REGION = "us-east-2"
FAIL_LOG = "fail-log.txt"

def log_failure(message):
    """Append failure message to log and print it."""
    with open(FAIL_LOG, "a") as f:
        f.write(message + "\n")
    print(message)

def copy_table():
    dynamodb = boto3.client("dynamodb", region_name=REGION)

    print(f"Starting copy from {SOURCE_TABLE} to {DEST_TABLE} ...")

    try:
        last_evaluated_key = None
        total_copied = 0

        while True:
            if last_evaluated_key:
                response = dynamodb.scan(
                    TableName=SOURCE_TABLE,
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = dynamodb.scan(TableName=SOURCE_TABLE)

            items = response.get("Items", [])
            if not items:
                print("No items found in source table.")
                break

            for item in items:
                try:
                    dynamodb.put_item(TableName=DEST_TABLE, Item=item)
                    total_copied += 1
                except ClientError as e:
                    msg = f"Failed to insert item: {json.dumps(item)} | Error: {str(e)}"
                    log_failure(msg)

            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break

        print(f"✅ {total_copied} items copied from {SOURCE_TABLE} to {DEST_TABLE}!")

    except ClientError as e:
        log_failure(f"Critical error during scan/copy: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    copy_table()
