#!/usr/bin/env python3
"""
Attach Cognito authorizer to all deployments API Gateway routes (dev stage).
Run once; safe to re-run (update-method is idempotent).

Usage:
    python3 scripts/auth/attach_deployments_auth.py
"""

import boto3

REST_API_ID = "miinu7boec"
AUTHORIZER_ID = "ulqk4z"
REGION = "us-east-2"
STAGE = "dev"

ROUTES = [
    ("vveh5x", ["GET", "POST"]),            # /deployments
    ("muvqou", ["GET"]),                    # /deployments/{deployment_id}
    ("5eat6g", ["GET"]),                    # /deployments/historical
    ("owxgu8", ["GET"]),                    # /deployments/historical/{id}
    ("apj1bk", ["POST"]),                   # /deployments/{deployment_id}/complete
    ("u1e7pw", ["POST", "PUT"]),            # /deployments/{deployment_id}/sessions
    ("zbiagt", ["GET", "POST", "PUT"]),     # /deployments/{deployment_id}/sessions/{sid}
    ("yfpx1x", ["GET"]),                    # /deployments/{deployment_id}/sessions/active
    ("kvztok", ["GET"]),                    # /deployments/{deployment_id}/zones/{zone}/sessions
    ("il5lwn", ["GET"]),                    # /deployments/{deployment_id}/sessions/{sid}/connections
    ("mlgr5d", ["GET"]),                    # /deployments/{deployment_id}/sessions/{sid}/connections/{connection_id}
    ("pku7pg", ["DELETE", "GET", "POST"]), # /deployments/{deployment_id}/connections
    ("3kow8t", ["DELETE", "PATCH"]),        # /deployments/{deployment_id}/connections/{cid}
    ("2qv1rj", ["PATCH"]),                  # /deployments/{deployment_id}/connections/{cid}/photos
    ("ajxduo", ["GET", "POST"]),            # /deployments/{deployment_id}/stage
    ("vizgcy", ["POST"]),                   # /deployments/{deployment_id}/teardown/start
    ("98blgb", ["POST"]),                   # /deployments/{deployment_id}/teardown/item
    ("iss5ig", ["POST"]),                   # /deployments/{deployment_id}/teardown/complete
    ("r848ne", ["GET"]),                    # /deployments/{deployment_id}/zones
    ("b8ujdw", ["GET"]),                    # /deployments/{deployment_id}/zones/{zone}/ports
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
print("Done. Smoke-test: curl -s https://miinu7boec.execute-api.us-east-2.amazonaws.com/dev/deployments | python3 -m json.tool")
