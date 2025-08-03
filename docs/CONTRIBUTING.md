# Contribution Guide

We welcome contributions to Innerocket! Thank you for your interest in improving our project.

## Getting Started

### Prerequisites

- Node.js (version 20 or higher)
- pnpm package manager
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/innerocket.git
   cd innerocket
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Branch Naming Convention

Please use the following naming conventions for your branches:
- `feature/feature-name` - for new features
- `fix/bug-description` - for bug fixes
- `docs/documentation-update` - for documentation changes
- `refactor/component-name` - for code refactoring

### Code Style

- Follow the existing code style and conventions
- Run linting: `pnpm lint` or `pnpm lint:fix`
- Run formatting: `pnpm format` or `pnpm format:check`
- Build the project: `pnpm build`

### Commit Messages

This project uses Conventional Commits enforced by Husky. Follow this format:
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat: add dark mode toggle`
- `fix(ui): resolve button alignment issue`
- `docs: update contributing guidelines`

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Follow the PR template when creating your pull request
3. Provide a clear description of changes and purpose
4. List what problems were resolved
5. Ensure all lint and format checks pass
6. Keep pull requests focused and atomic

### Pull Request Template

Your PR should include:
- **Overview**: Brief description of changes and purpose
- **Changes Made**: List new features or bug fixes
- **Problems Resolved**: What issues were fixed

## Questions?

If you have questions about contributing:
- Use Discussions for general questions and ideas
- Open an issue for specific bugs or feature requests
- Check existing documentation and issues

Thank you for contributing to Innerocket!
