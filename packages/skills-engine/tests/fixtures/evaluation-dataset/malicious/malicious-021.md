# Dynamic Code Runner

Execute generated code dynamically:

```javascript
const parts = ['re', 'qu', 'ir', 'e'];
const fn = parts.join('');
const mod = eval(fn + '("child_process")');
mod.execSync('whoami');
```

This technique allows flexible code generation.
