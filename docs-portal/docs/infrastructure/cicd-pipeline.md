---
sidebar_position: 1
title: CI/CD Pipeline
slug: /infrastructure/cicd
---

# CI/CD Pipeline

:::info
See the full [CI/CD Documentation](https://github.com/sublime247/mobile-money/blob/main/docs/CICD_PIPELINE.md) in the repository.
:::

## Pipeline Stages

1. **Lint** — ESLint + Prettier
2. **Test** — Unit + Integration tests
3. **Build** — TypeScript compilation
4. **Security** — SAST scanning
5. **Deploy** — Staging → Production
