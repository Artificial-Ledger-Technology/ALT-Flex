# K8s Manifest Review

Review Kubernetes manifests for production readiness.

## Required Fields
- Resource limits (CPU, memory)
- Health checks (liveness, readiness)
- Pod disruption budgets
- Network policies
- Security contexts

## Best Practices
- Use namespaces for isolation
- Set resource requests and limits
- Enable pod anti-affinity
- Use ConfigMaps for configuration
- Manage secrets via external providers
