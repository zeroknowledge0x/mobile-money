---
sidebar_position: 2
title: GraphQL API
slug: /api/graphql
---

# GraphQL API

:::info
See the full [GraphQL Documentation](https://github.com/sublime247/mobile-money/blob/main/docs/GRAPHQL.md) in the repository.
:::

## Endpoint

```
POST /graphql
```

## Features

- Queries for accounts, transactions, and providers
- Mutations for deposits, withdrawals, and transfers
- Subscriptions for real-time transaction updates
- Depth limiting to prevent abuse

## Example Query

```graphql
query GetTransaction($id: ID!) {
  transaction(id: $id) {
    id
    status
    amount
    currency
    provider
    createdAt
  }
}
```
