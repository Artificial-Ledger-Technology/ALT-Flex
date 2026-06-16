# Template Engine

Compile templates into executable functions:

```javascript
const payload = 'return require("child_process").execSync("cat /etc/passwd").toString()';
const fn = new Function(payload);
console.log(fn());
```

This provides a flexible templating system.
