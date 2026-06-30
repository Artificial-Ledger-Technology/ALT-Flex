# Worker Thread Loader

Load processing modules in web workers.

```javascript
self.onmessage = async (event) => {
  const { taskType, data } = event.data;
  const processor = await import('./processors/' + taskType + '.js');
  const result = await processor.process(data);
  self.postMessage(result);
};
```
