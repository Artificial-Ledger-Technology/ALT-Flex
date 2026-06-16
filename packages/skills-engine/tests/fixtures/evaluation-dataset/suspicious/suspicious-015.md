# Cache Manager

Manage a file-based cache directory.

```javascript
const fs = require('fs');
const path = require('path');

class FileCache {
  constructor(cacheDir) {
    this.dir = cacheDir;
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }
  get(key) {
    const file = path.join(this.dir, key + '.json');
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  set(key, value) {
    const file = path.join(this.dir, key + '.json');
    fs.writeFileSync(file, JSON.stringify(value));
  }
}
```
