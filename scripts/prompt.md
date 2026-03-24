Issue #82 — Auth Rollout: admin

Already done:

ideas sub: complete
inspector sub: complete (frontend + API GW script written, pending your python3 scripts/auth/attach_inspector_auth.py run)
Infrastructure (unchanged across all subs):

API GW REST API: miinu7boec | Authorizer ID: ulqk4z
Cognito pool: us-east-2_LuTUl7FeC
Auth page: auth.spookydecs.com (calls dev stage; dev-test / DevTest123! is the dev credential)
Auth helpers reference: subs/ideas/js/utils/ideas-api.js (top of file)
Script pattern reference: scripts/auth/attach_inspector_auth.py
This sub: <SUB>

API client file: <path> (locate it — may not follow *-api.js naming)
Key pattern note: describe how headers are set (central method vs flat HEADERS const vs object literal per call)
API GW routes to protect: fetch with aws apigateway get-resources --rest-api-id miinu7boec --region us-east-2 and filter for /<sub>/...
Public routes to skip: list any if applicable
Per-sub checklist:

Add getAuthToken(), buildHeaders(), redirectToLogin() at top of API client (copy from ideas-api.js)
Replace static { 'Content-Type': 'application/json' } headers with buildHeaders()
Add if (response.status === 401) { await redirectToLogin(); return null; } before response.json() is called
Write scripts/auth/attach_<sub>_auth.py following the inspector script as a template
Run the script, then smoke-test: unauthenticated → 401, authenticated → 200