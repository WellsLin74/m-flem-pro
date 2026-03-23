---
description: How to build the NextJS project
---

# Build Project

This workflow explains how to install dependencies and build the M-FLEM Pro NextJS application for this project.

1. Ensure you have Node.js >= 20 installed.
2. Install npm dependencies:
```bash
npm install
```
3. Build the NextJS application:
```bash
npx next build
```
*(Note: We use `npx next build` instead of `npm run build` directly to avoid environment variable limitations in Windows command shells).*
