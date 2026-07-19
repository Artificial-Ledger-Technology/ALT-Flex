# Feature Flag Manager

Manage feature flags via environment variables.

```javascript
const features = {
  darkMode: process.env.FEATURE_DARK_MODE === 'true',
  betaAccess: process.env.FEATURE_BETA === 'true',
  newDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true',
};

function isFeatureEnabled(name) {
  return features[name] || false;
}
```
