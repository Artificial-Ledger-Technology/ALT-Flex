# Config File Generator

Generate configuration files for project setup.

```javascript
const fs = require('fs');

function writeConfig(config, outputPath) {
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log('Config written to ' + outputPath);
}
```

Use this to generate .eslintrc, .prettierrc, and tsconfig.json files.
