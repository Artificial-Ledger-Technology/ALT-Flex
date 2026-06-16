# Environment Config Loader

Load configuration from environment variables.

```javascript
const config = {
  dbHost: process.env.DATABASE_HOST,
  dbPort: parseInt(process.env.DATABASE_PORT || '5432'),
  apiKey: process.env.API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
```

Ensure all required variables are set before starting the application.
