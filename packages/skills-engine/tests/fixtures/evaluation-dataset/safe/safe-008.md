# API Response Formatter

Format API responses into consistent structures.

## Standard Response
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

## Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```
