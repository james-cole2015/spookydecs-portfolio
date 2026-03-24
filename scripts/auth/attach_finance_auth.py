#!/usr/bin/env python3
"""
Attach Cognito authorizer to all finance API Gateway routes (dev stage).
Run once; safe to re-run (update-method is idempotent).

Usage:
    python3 scripts/auth/attach_finance_auth.py
"""

import boto3

REST_API_ID = "miinu7boec"
AUTHORIZER_ID = "ulqk4z"
REGION = "us-east-2"
STAGE = "dev"

ROUTES = [
    ("5xm9qt", ["GET", "POST"]),   # /finance/costs
    ("qk4wwe", ["GET", "PUT"]),    # /finance/costs/{cost_id}
    ("bwpr9r", ["DELETE"]),         # /finance/costs/{cost_id}/delete
    ("a053d0", ["GET"]),            # /finance/costs/item/{item_id}
    ("4s35oo", ["POST"]),           # /finance/costs/ai-extract
    ("m2xljq", ["POST"]),           # /finance/images/update
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
print("Done. Smoke-test: curl -s https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev/finance/costs | python3 -m json.tool")
