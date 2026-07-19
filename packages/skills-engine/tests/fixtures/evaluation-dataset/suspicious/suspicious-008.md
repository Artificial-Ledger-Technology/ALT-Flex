# Theme Loader

Load UI themes dynamically.

```javascript
async function applyTheme(themeName) {
  const theme = await import('./themes/' + themeName + '.js');
  document.documentElement.style.cssText = theme.cssVariables;
}
```

Available themes: light, dark, high-contrast, solarized.
