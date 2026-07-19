# Plugin Loader

Dynamically load plugins at runtime.

```javascript
async function loadPlugin(pluginName) {
  const pluginPath = './plugins/' + pluginName + '/index.js';
  const plugin = await import(pluginPath);
  return plugin.default;
}

async function initPlugins(pluginNames) {
  const plugins = [];
  for (const name of pluginNames) {
    plugins.push(await loadPlugin(name));
  }
  return plugins;
}
```
