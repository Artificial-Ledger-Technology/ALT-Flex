# Route Code Splitting

Lazy-load route components for performance.

```javascript
const routes = {
  '/dashboard': () => import('./pages/Dashboard'),
  '/settings': () => import('./pages/Settings'),
  '/profile': () => import('./pages/Profile'),
};

async function loadRoute(path) {
  const loader = routes[path];
  if (!loader) throw new Error('Route not found');
  const module = await loader();
  return module.default;
}
```
