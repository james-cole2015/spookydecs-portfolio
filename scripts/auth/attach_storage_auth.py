#!/usr/bin/env python3
"""
Attach Cognito authorizer to all storage API Gateway routes (dev stage).
Run once; safe to re-run (update-method is idempotent).

Usage:
    python3 scripts/auth/attach_storage_auth.py
"""

import boto3

REST_API_ID = "miinu7boec"
AUTHORIZER_ID = "ulqk4z"
REGION = "us-east-2"
STAGE = "dev"

ROUTES = [
    ("8xc1tb", ["GET"]),                    # /storage
    ("1ibhjx", ["GET", "POST"]),            # /storage/pack
    ("d0wpq4", ["POST"]),                   # /storage/pack-single
    ("hjnxdi", ["POST"]),                   # /storage/self
    ("jr7m2q", ["POST"]),                   # /storage/totes
    ("amqkcv", ["DELETE", "GET", "PUT"]),   # /storage/{id}
    ("9z6x3z", ["DELETE", "POST"]),         # /storage/{id}/contents
]

client = boto3.client("apigateway", region_name=REGION)

patch_ops = [
    {"op": "replace", "path": "/authorizationType", "value": "COGNITO_USER_POOLS"},
    {"op": "replace", "path": "/authorizerId", "value": AUTHORIZER_ID},
]

total = sum(len(methods) for _, methods in ROUTES)
done = 0

for resource_id, methods in ROUTES:
    for method in methods:
        client.update_method(
            restApiId=REST_API_ID,
            resourceId=resource_id,
            httpMethod=method,
            patchOperations=patch_ops,
        )
        done += 1
        print(f"  [{done}/{total}] {method} {resource_id} ✓")

print(f"\nDeploying {STAGE} stage...")
client.create_deployment(restApiId=REST_API_ID, stageName=STAGE)
print("Done. Smoke-test: curl -s https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev/storage | python3 -m json.tool")
