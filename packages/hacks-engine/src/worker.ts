

console.log('Hacks worker started in dev mode!');
console.log('Using DefiLlama API:', process.env.DEFILLAMA_API_URL);

// Simple stub to keep the worker running
setInterval(() => {
  console.log('Hacks worker heartbeat...');
}, 30000);
