---
sidebar_position: 3
title: API Versioning
slug: /api/versioning
---

# API Versioning

:::info
See the full [API Versioning Guide](https://github.com/sublime247/mobile-money/blob/main/docs/API_VERSIONING.md) in the repository.
:::

## Version Strategy

The API uses URL-based versioning:

```
/v1/transactions
/v2/transactions
```

## Deprecation Policy

- Deprecated endpoints return `Sunset` header
- Minimum 6-month deprecation period
- Migration guides provided for breaking changes
