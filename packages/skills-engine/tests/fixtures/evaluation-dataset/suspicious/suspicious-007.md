# Locale Loader

Load translation files dynamically based on user locale.

```javascript
async function loadLocale(lang) {
  const locale = await import('./locales/' + lang + '.json');
  return locale.default;
}
```

Supported languages: en, es, fr, de, ja, zh.
