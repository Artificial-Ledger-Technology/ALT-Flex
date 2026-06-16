# Log Analysis Helper

Analyze application logs to diagnose issues.

## Structured Logging
- Use JSON format
- Include correlation IDs
- Log level: ERROR, WARN, INFO, DEBUG
- Include timestamps in ISO 8601

## Common Patterns
- Error spikes: check recent deployments
- Slow queries: check database logs
- Memory growth: look for leak patterns
- Connection errors: check network/DNS

## Tools
- grep for quick searches
- jq for JSON log parsing
- Log aggregators (ELK, Loki)
