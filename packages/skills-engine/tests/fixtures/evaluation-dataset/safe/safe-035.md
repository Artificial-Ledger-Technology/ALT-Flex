# Docker Best Practices

Build secure and efficient Docker images.

## Security
- Use official base images
- Run as non-root user
- Scan images for vulnerabilities
- Use multi-stage builds
- Pin image versions with SHA digests

## Efficiency
- Order layers by change frequency
- Use .dockerignore
- Minimize layer count
- Remove package manager caches

## Example Dockerfile Pattern
Use multi-stage: build stage with dev deps, production stage with runtime only.
