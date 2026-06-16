# Webhook Notifier

Send notifications via webhooks.

```javascript
async function sendWebhook(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.ok;
}
```

Use with Slack, Teams, or custom webhook endpoints.
