# Health Check Client

Check service health endpoints.

```javascript
async function checkHealth(serviceUrl) {
  const response = await fetch(serviceUrl + '/health');
  const data = await response.json();
  return {
    status: data.status,
    latencyMs: Date.now() - startTime,
    healthy: response.ok,
  };
}
```

Use this to monitor your microservices.
