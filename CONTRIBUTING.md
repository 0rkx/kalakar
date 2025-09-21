# Contributing to Kalakar

Thank you for your interest in contributing to Kalakar! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/kalakar-app.git`
3. Install dependencies: `npm run setup`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## 🛠️ Development Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   cp backend/.env.example backend/.env
   ```

2. Fill in your API keys and configuration

3. Start development servers:
   ```bash
   # Frontend
   npm run dev
   
   # Backend (in another terminal)
   npm run backend:dev
   ```

## 📝 Code Style

- Use TypeScript for all new code
- Follow existing code formatting
- Add tests for new features
- Update documentation as needed

## 🧪 Testing

Run tests before submitting:
```bash
npm test
npm run test:coverage
```

## 📋 Pull Request Process

1. Ensure all tests pass
2. Update README.md if needed
3. Add a clear description of changes
4. Reference any related issues

## 🐛 Bug Reports

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/environment details
- Screenshots if applicable

## 💡 Feature Requests

For new features:
- Describe the problem you're solving
- Explain your proposed solution
- Consider backward compatibility
- Discuss implementation approach

## 📞 Questions?

- Open an issue for discussion
- Check existing issues first
- Be respectful and constructive

Thank you for contributing! 🎉