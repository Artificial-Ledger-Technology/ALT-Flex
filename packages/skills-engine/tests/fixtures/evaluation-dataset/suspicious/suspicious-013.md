# Log Rotator

Rotate application log files.

```javascript
const fs = require('fs');
const path = require('path');

function rotateLogs(logDir, maxFiles) {
  const logs = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .sort();
  while (logs.length > maxFiles) {
    const oldest = logs.shift();
    fs.unlinkSync(path.join(logDir, oldest));
  }
}
```
