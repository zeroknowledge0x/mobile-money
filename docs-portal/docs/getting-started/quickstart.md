---
sidebar_position: 1
title: Quickstart
description: Get started with the Mobile Money API in minutes
---

# Quickstart

Get up and running with the Mobile Money API in under 5 minutes.

## Prerequisites

- An active partner account with API credentials
- Node.js 18+ or Python 3.10+ (for SDK usage)
- A test environment sandbox key

## 1. Get Your API Key

Contact your account manager or visit the partner dashboard to generate an API key for the sandbox environment.

## 2. Make Your First Request

```bash
curl -X POST https://sandbox.mobile-money.api/v1/transfers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "TZS",
    "recipient": "+255751234567",
    "provider": "vodacom"
  }'
```

## 3. Verify the Response

A successful transfer returns:

```json
{
  "id": "txn_abc123",
  "status": "pending",
  "amount": 1000,
  "currency": "TZS",
  "recipient": "+255751234567",
  "provider": "vodacom"
}
```

## Next Steps

- Read the [API Reference](/api) for full endpoint documentation
- Explore [Provider Guides](/docs/providers/vodacom) for provider-specific details
- Check out the [Kotlin SDK](/docs/sdks/kotlin) for mobile integration
