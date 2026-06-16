# Local Development API Client

Connect to local development servers.

```javascript
const DEV_API = 'http://127.0.0.1:3000/api';
const STAGING_API = 'http://192.168.1.100:3000/api';

async function fetchData(endpoint) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.API_URL 
    : DEV_API;
  return fetch(baseUrl + endpoint);
}
```
