# Log Level Config

Configure logging based on environment.

```javascript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const logger = {
  debug: (msg) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', msg),
  info: (msg) => ['debug','info'].includes(LOG_LEVEL) && console.log('[INFO]', msg),
  warn: (msg) => console.warn('[WARN]', msg),
  error: (msg) => console.error('[ERROR]', msg),
};
```
