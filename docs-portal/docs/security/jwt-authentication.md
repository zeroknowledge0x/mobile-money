---
sidebar_position: 1
title: JWT Authentication
slug: /security/jwt
---

# JWT Authentication

:::info
See the full [JWT Authentication Documentation](https://github.com/sublime247/mobile-money/blob/main/docs/JWT_AUTHENTICATION.md) in the repository.
:::

## Overview

The API uses JSON Web Tokens (JWT) for authentication. Tokens are issued after successful login or SEP-10 authentication.

## Token Structure

```json
{
  "sub": "user_123",
  "iat": 1717171200,
  "exp": 1717257600,
  "scope": ["read", "write"]
}
```
