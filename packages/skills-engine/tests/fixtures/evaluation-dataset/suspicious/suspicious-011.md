# Temp File Cleaner

Clean up temporary files older than 24 hours.

```javascript
const fs = require('fs');
const path = require('path');

function cleanTempFiles(dir) {
  const files = fs.readdirSync(dir);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const ageMs = now - stats.mtimeMs;
    if (ageMs > 24 * 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
    }
  }
}
```
