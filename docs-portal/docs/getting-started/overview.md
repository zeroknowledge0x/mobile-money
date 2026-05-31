---
sidebar_position: 1
title: Overview
slug: /getting-started/overview
---

# Mobile Money ↔ Stellar Bridge

A backend service that bridges African mobile money providers (MTN MoMo, Airtel Money, Orange Money) with the [Stellar](https://stellar.org) blockchain network — enabling low-cost cross-border payments and remittances across Africa and beyond.

## The Problem

Sending money across African borders is expensive and slow. Traditional remittance services charge 7–10% in fees and take hours to days. Meanwhile, **500+ million people** across Africa already use mobile money for everyday transactions — but mobile money stops at the border.

## The Solution

This platform connects mobile money wallets to the Stellar blockchain, allowing users to:

1. **Deposit** mobile money (XAF) → receive Stellar tokens (XLM, USDC)
2. **Transfer** tokens across Stellar's network in ~5 seconds, for fractions of a cent
3. **Withdraw** Stellar tokens → receive mobile money in the destination country

## Key Features

- **Mobile Money Integration** — MTN MoMo, Airtel Money, Orange Money with circuit breaker, failover, and batch payouts
- **Stellar Blockchain** — XLM, USDC, and custom asset support via Stellar SDK + Horizon API
- **Dual API** — REST (40+ endpoints) and GraphQL (queries, mutations, and real-time subscriptions)
- **Real-time Processing** — BullMQ job queues with Redis, admin dashboard at `/admin/queues`
- **WebSocket** — Live transaction updates with JWT auth, per-user rooms, and Redis pub/sub for horizontal scaling

## Quick Links

- [Architecture Overview](./architecture.md)
- [Docker Development Setup](./docker-dev.md)
- [API Reference](/api)
- [Contributing Guide](./contributing.md)
