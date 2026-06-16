# NPM Package Info

Check npm package details and versions.

```javascript
async function getPackageInfo(packageName) {
  const response = await fetch('https://registry.npmjs.org/' + packageName);
  const data = await response.json();
  return {
    name: data.name,
    latest: data['dist-tags'].latest,
    description: data.description,
  };
}
```
