# Sandbox Preview Link - Proxy Error Fixes

## Issues Found & Resolved

### 1. **Router Proxy Middleware Incomplete** (CRITICAL)
**File:** `Sandbox/router/src/app.js`

**Problem:**
- Router had multiple commented code sections mixed with incomplete implementation
- Missing comprehensive error handling in proxy middleware
- No host header validation (could crash with malformed requests)
- Insufficient logging for debugging connection issues

**Solution:**
✅ Cleaned up and rebuilt router with:
- Proper try-catch blocks for error handling
- Host header validation with detailed error messages
- Comprehensive logging with `[PROXY]`, `[ROUTER]` prefixes for easy debugging
- Proper timeout configuration (30s for both proxy and connection)
- Detailed `onProxyReq`, `onProxyRes`, and `onError` callbacks
- Returns proper JSON error responses with status 502 when connection fails

### 2. **Pod Readiness Not Properly Checked** (HIGH)
**File:** `Sandbox/server/src/kubernetes/waitForPod.js`

**Problem:**
- Only checked if pod phase was "Running"
- Didn't verify containers were actually ready
- Could return before app was serving traffic on port 5173
- Led to 502 "Bad Gateway" errors when preview link was accessed immediately after creation

**Solution:**
✅ Enhanced pod wait logic to:
- Check for "Ready" condition status
- Verify all containers are ready before returning
- Add detailed logging showing pod phase and condition status
- Extended timeout messages for clarity
- Better error reporting during wait period

### 3. **Ingress Configuration Mismatch** (HIGH)
**File:** `k8s/ingress.yml`

**Problem:**
- First rule routed `/api/sandbox` to non-existent `sandbox-service` on port 80
- Dynamic sandbox services created as `sandbox-service-${sandboxId}` don't match this reference
- Routes weren't properly isolated by hostname
- Could cause requests to hit wrong services

**Solution:**
✅ Restructured ingress to:
- Handle all routes under `*.preview.localhost` host
- `/api/sandbox` routes to `sandbox-service` on port 3000 (if needed)
- All other paths (`/`) route through `router-service` on port 80
- Router then proxies to appropriate `sandbox-service-${sandboxId}` based on hostname

### 4. **Insufficient Service Logging** (MEDIUM)
**File:** `Sandbox/server/src/kubernetes/service.js`

**Problem:**
- Minimal logging made debugging difficult
- No service IP information in logs
- Couldn't verify service creation details

**Solution:**
✅ Added comprehensive logging:
- Log service name being created
- Log selector labels used for pod matching
- Log assigned ClusterIP after creation
- Log fully qualified service DNS name

### 5. **Pod Creation Missing Details** (MEDIUM)
**File:** `Sandbox/server/src/kubernetes/pod.js`

**Problem:**
- No logging of pod creation parameters
- Couldn't verify pod configuration
- Limited error diagnosis information

**Solution:**
✅ Enhanced with detailed logging:
- Log pod name and sandbox ID
- Log container image and port configuration
- Log requested resources (CPU/memory)
- Log pod UID after successful creation
- Better error code reporting

## Request Flow After Fixes

```
Browser requests: https://abc-123.preview.localhost
                         ↓
Kubernetes Ingress (*.preview.localhost)
                         ↓
Router Service (port 80 → 3000)
                         ↓
Router Pod (app.js)
  - Extracts hostname: abc-123.preview.localhost
  - Gets sandbox ID: abc-123
  - Creates/retrieves proxy for: http://sandbox-service-abc-123:80
                         ↓
Kubernetes Service: sandbox-service-abc-123
  (selector: app=sandbox-app, sandboxId=abc-123)
  (port: 80 → 5173)
                         ↓
Sandbox Pod: sandbox-pod-abc-123
  - Running Vite dev server on port 5173
  - Ready condition checked before routing
```

## Testing the Fix

1. **Create a new sandbox:**
   ```bash
   curl -X POST http://localhost/api/sandbox/create
   ```
   Response will include: `"previewUrl":"http://abc-123.preview.localhost"`

2. **Access preview link:**
   - Open browser to the preview URL
   - Should now load without proxy errors
   - Check router logs for `[PROXY-RES] 200` indicating successful response

3. **Check logs for debugging:**
   - Router logs will show: `[PROXY-REQ]` and `[PROXY-RES]` for each request
   - Pod logs will show: `[POD] Pod created successfully`
   - Service logs will show: `[SERVICE] Service created successfully`
   - Wait logs will show: `[WAIT-POD] Pod is Running and Ready!`

## Debugging Checklist if Issues Persist

- [ ] Verify router pod is running: `kubectl get pods -l app=router`
- [ ] Check router logs: `kubectl logs -l app=router -f`
- [ ] Verify template image exists: `docker images | grep template`
- [ ] Check DNS resolution: `kubectl exec router-pod -- nslookup sandbox-service-{id}`
- [ ] Verify Vite app listens on 0.0.0.0: Check template/vite.config.js
- [ ] Check service selectors match pod labels exactly
- [ ] Verify network policies aren't blocking traffic

## Key Changes Summary

| File | Changes | Impact |
|------|---------|--------|
| `router/src/app.js` | Complete rewrite with error handling | Fixes proxy errors, adds debugging |
| `server/src/kubernetes/waitForPod.js` | Check Ready condition | Prevents premature routing |
| `server/src/kubernetes/service.js` | Add detailed logging | Better diagnostics |
| `server/src/kubernetes/pod.js` | Add configuration logging | Better diagnostics |
| `k8s/ingress.yml` | Fix route structure | Proper request routing |

All changes maintain backward compatibility and improve observability for future debugging.
