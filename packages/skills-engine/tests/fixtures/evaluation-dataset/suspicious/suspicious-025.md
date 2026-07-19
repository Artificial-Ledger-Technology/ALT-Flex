# Development Environment Setup

Set up your development environment with required tools.

## Shell Configuration
Add these to your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Set default Node version
nvm use 20
```

## Verify Installation
Run these commands to verify:
```bash
node --version
npm --version
```
