# Regex Builder

Help users construct and understand regular expressions.

## Common Patterns
- Email: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- URL: `https?://[^\s]+`
- Phone: `\+?[1-9]\d{1,14}$`
- IPv4: `\d{1,3}(\.\d{1,3}){3}`

## Tips
- Use non-capturing groups (?:) when you do not need backreferences
- Prefer possessive quantifiers to avoid backtracking
- Always test with edge cases
