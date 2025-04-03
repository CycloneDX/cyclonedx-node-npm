# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build-dev` (with source maps), `npm run build` (production)
- Lint: `npm run lint` (TypeScript check), `npm run test:standard` (ESLint)
- Code style fix: `npm run cs-fix`
- Test all: `npm test`
- Test Jest only: `npm run test:jest`
- Test single file: `npx jest tests/path/to/file.test.js`
- Test specific test: `npx jest -t "test name pattern"`

## Code Style

- TypeScript with strict typing and explicit return types
- ESLint for code quality and consistency
- CommonJS modules for .js files, Node16 module system for TypeScript
- LF line endings
- Max complexity: 15
- No unused variables or parameters
- Always use strict mode
- Sign off commits with DCO
- File naming: camelCase for source files
- Follow existing patterns for imports and error handling
- Use ES2023 features with Node.js 20.18.0+ compatibility