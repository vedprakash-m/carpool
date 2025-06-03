# Contributing to vCarpool

Thank you for your interest in contributing to vCarpool! This document provides guidelines for contributing to our smart carpool management platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [License Agreement](#license-agreement)
- [Contact](#contact)

## Getting Started

Before contributing, please:

1. Read this contributing guide thoroughly
2. Review the [README.md](README.md) to understand the project
3. Check existing [issues](https://github.com/vedprakashmishra/vcarpool/issues) and [pull requests](https://github.com/vedprakashmishra/vcarpool/pulls)
4. Set up your development environment

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please be respectful and professional in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots or code snippets if applicable
- Your environment details (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed feature
- Use cases and benefits
- Any implementation ideas you may have

### Your First Code Contribution

Look for issues labeled `good first issue` or `help wanted`. These are great starting points for new contributors.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Azure CLI (for infrastructure)
- Git

### Local Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/vcarpool.git
   cd vcarpool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env.local
   # Fill in your environment variables
   ```

4. **Start the development servers:**
   ```bash
   # Frontend (in one terminal)
   cd frontend
   npm run dev

   # Backend (in another terminal)
   cd backend
   npm run start
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Code Style Guidelines

### General Principles

- Write clean, readable, and maintainable code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for code formatting (run `npm run format`)
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use async/await over Promises where possible

### React/Next.js

- Use functional components with hooks
- Follow React best practices
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Use semantic HTML elements
- Ensure accessibility (WCAG 2.1 AA compliance)

### CSS/Styling

- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Use CSS custom properties for theming
- Maintain consistent spacing and typography

### Backend/API

- Follow RESTful API conventions
- Use proper HTTP status codes
- Implement proper error handling
- Add input validation for all endpoints
- Use TypeScript interfaces for data models

## Testing Requirements

### Frontend Testing

- Write unit tests for utilities and hooks using Jest
- Write component tests using React Testing Library
- Write end-to-end tests using Playwright
- Aim for >80% code coverage

### Backend Testing

- Write unit tests for all functions
- Write integration tests for API endpoints
- Test error handling scenarios
- Mock external dependencies

### Test Guidelines

- Test files should be in `__tests__` directories or use `.test.ts` suffix
- Write descriptive test names
- Test both success and failure scenarios
- Keep tests independent and deterministic

### Running Tests

```bash
# All tests
npm test

# Frontend tests only
cd frontend && npm test

# Backend tests only
cd backend && npm test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Commit Message Guidelines

Use the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples

```
feat(auth): add Google OAuth integration
fix(trips): resolve trip date validation issue
docs(api): update authentication endpoint documentation
test(carpool): add unit tests for matching algorithm
```

## Pull Request Process

### Before Submitting

1. Ensure your code follows the style guidelines
2. Run all tests and ensure they pass
3. Update documentation if needed
4. Add or update tests for your changes
5. Update the changelog if applicable

### Submitting a Pull Request

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

4. **Create a pull request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Test instructions

### Review Process

- All PRs require review from maintainers
- Address feedback promptly
- Keep PRs focused and reasonably sized
- Ensure CI checks pass
- Maintain backwards compatibility

## License Agreement

### Important: AGPLv3 License Requirements

By contributing to vCarpool, you agree that your contributions will be licensed under the GNU Affero General Public License version 3 (AGPLv3). This means:

1. **Your contributions become part of AGPLv3-licensed software**
2. **Network copyleft applies** - anyone who runs modified versions of this software as a network service must provide the source code to users
3. **You retain copyright** to your contributions but grant rights under AGPLv3
4. **Commercial use is allowed** but must comply with AGPLv3 requirements

### Contribution License Agreement

By submitting a contribution, you certify that:

- You have the right to submit the work under AGPLv3
- You understand the implications of the AGPLv3 license
- Your contribution is original work or properly attributed
- You agree to the Developer Certificate of Origin (DCO)

### Developer Certificate of Origin

```
Developer Certificate of Origin
Version 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

### For Corporate Contributors

If you're contributing on behalf of your employer, ensure you have the necessary permissions and that your employer agrees to the AGPLv3 license terms.

## Security Issues

Please do not open GitHub issues for security vulnerabilities. Instead, email security concerns directly to the maintainers.

## Documentation

- Update relevant documentation for any changes
- Use clear, concise language
- Include code examples where helpful
- Maintain consistency with existing docs

## Performance Considerations

- Consider performance impact of changes
- Use React.memo() and useMemo() where appropriate
- Optimize database queries
- Minimize bundle size impact

## Accessibility

- Ensure WCAG 2.1 AA compliance
- Test with screen readers
- Provide proper ARIA labels
- Maintain keyboard navigation
- Use semantic HTML

## Internationalization

- Use i18next for translations
- Extract all user-facing strings
- Test with different locales
- Consider RTL language support

## Contact

- **Project Repository:** https://github.com/vedprakashmishra/vcarpool
- **Discussions:** Use GitHub Discussions for questions
- **Issues:** Use GitHub Issues for bugs and feature requests

Thank you for contributing to vCarpool! 🚗✨ 