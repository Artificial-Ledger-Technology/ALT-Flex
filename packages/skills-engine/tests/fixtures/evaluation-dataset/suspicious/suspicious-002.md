# Secret Manager

Wrapper for accessing application secrets.

```javascript
function getSecrets() {
  return {
    jwtSecret: process.env.JWT_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
```

Never log secret values. Use this wrapper for centralized access.
