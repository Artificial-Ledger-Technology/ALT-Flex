# Database Connection Builder

Build database connection strings from environment.

```javascript
function buildConnectionString() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const pass = process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME || 'mydb';
  return 'postgresql://' + user + ':' + pass + '@' + host + ':' + port + '/' + name;
}
```
