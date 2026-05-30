---
sidebar_position: 2
title: Tigo Pesa
description: Tigo Pesa integration guide for Tanzania
---

# Tigo Pesa

Tigo Pesa is the second-largest mobile money service in Tanzania.

## Supported Operations

| Operation | Status | Endpoint |
|-----------|--------|----------|
| P2P Transfer | ✅ Live | `POST /v1/transfers` |
| Balance Check | ✅ Live | `GET /v1/balance` |
| Transaction Status | ✅ Live | `GET /v1/transactions/{id}` |

## Phone Number Format

Tigo Tanzania numbers use the prefix `+25565` through `+25569`.

## Differences from Vodacom

- Tigo uses a different callback format for webhooks
- Transaction limits may differ — check your partner agreement
- USSD confirmation is required for amounts above 500,000 TZS
