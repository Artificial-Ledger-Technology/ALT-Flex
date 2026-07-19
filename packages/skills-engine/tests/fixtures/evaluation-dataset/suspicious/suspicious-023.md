# Base64 Encoding Tutorial

Learn how to encode and decode Base64 strings.

## Example Encoded String
Here is "Hello, World!" encoded:
SGVsbG8sIFdvcmxkIQ==

Here is a longer example paragraph encoded:
aHR0cHM6Ly93d3cuZXhhbXBsZS5jb20vdGhpcy1pcy1hLXNhbXBsZS11cmwtdGhhdC1pcy1sb25nLWVub3VnaC10by10cmlnZ2VyLWRldGVjdGlvbg==

## Usage in JavaScript
```javascript
const encoded = btoa('Hello, World!');
const decoded = atob(encoded);
```
