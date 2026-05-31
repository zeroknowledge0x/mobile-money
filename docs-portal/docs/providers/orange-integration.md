---
sidebar_position: 1
title: Orange Money
slug: /providers/orange
---

# Orange Money Integration

:::info
See the full [Orange Money Integration](https://github.com/sublime247/mobile-money/blob/main/docs/ORANGE_INTEGRATION.md) in the repository.
:::

## Supported Countries

- Cameroon (XAF)
- Senegal (XOF)
- Mali (XOF)
- Côte d'Ivoire (XOF)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/providers/orange/deposit` | Initiate deposit |
| POST | `/v1/providers/orange/withdraw` | Initiate withdrawal |
| GET | `/v1/providers/orange/status/:id` | Check transaction status |
