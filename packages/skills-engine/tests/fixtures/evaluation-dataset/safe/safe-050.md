# Security Best Practices

Security guidelines for application developers.

## Input Validation
- Validate all user input
- Use allowlists over denylists
- Sanitize HTML output (XSS prevention)
- Parameterize database queries (SQL injection prevention)

## Authentication
- Use bcrypt for password hashing
- Implement rate limiting
- Use secure session management
- Enable multi-factor authentication

## Data Protection
- Encrypt data at rest and in transit
- Minimize data collection
- Follow principle of least privilege
- Rotate secrets regularly
