---
sidebar_position: 3
title: Airtel Money
description: Airtel Money integration guide for East Africa
---

# Airtel Money

Airtel Money operates across East Africa with API differences between regions.

## Regional Differences

| Region | Currency | Prefix |
|--------|----------|--------|
| Tanzania | TZS | `+25568`, `+25569` |
| Kenya | KES | `+25473`, `+25478` |
| Uganda | UGX | `+25670`, `+25675` |

## Currency Handling

The API automatically converts between TZS and KES using live exchange rates. Specify the `currency` field explicitly to avoid ambiguity:

```json
{
  "amount": 50000,
  "currency": "TZS",
  "recipient": "+255681234567"
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| `INSUFFICIENT_BALANCE` | Sender has insufficient funds |
| `INVALID_RECIPIENT` | Phone number not registered with Airtel |
| `LIMIT_EXCEEDED` | Daily transaction limit reached |
