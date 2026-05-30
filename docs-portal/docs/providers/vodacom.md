---
sidebar_position: 1
title: Vodacom M-Pesa
description: Vodacom M-Pesa integration guide for Tanzania
---

# Vodacom M-Pesa

Vodacom is the largest mobile money provider in Tanzania, supporting M-Pesa for P2P transfers, merchant payments, and bill payments.

## Supported Operations

| Operation | Status | Endpoint |
|-----------|--------|----------|
| P2P Transfer | ✅ Live | `POST /v1/transfers` |
| Balance Check | ✅ Live | `GET /v1/balance` |
| Transaction Status | ✅ Live | `GET /v1/transactions/{id}` |
| Merchant Payment | ✅ Live | `POST /v1/payments` |

## Phone Number Format

Vodacom Tanzania numbers use the following prefixes:

- `+25575` — Vodacom
- `+25576` — Vodacom
- `+25577` — Vodacom

All numbers must be in international format (`+255...`).

## Rate Limits

- Sandbox: 100 requests/minute
- Production: 1000 requests/minute
- Webhooks: No rate limit (incoming)

## Webhooks

Register a webhook URL to receive payment confirmations:

```json
{
  "event": "transfer.completed",
  "data": {
    "id": "txn_abc123",
    "status": "completed",
    "completed_at": "2026-01-15T10:30:00Z"
  }
}
```
