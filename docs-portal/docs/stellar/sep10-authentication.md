---
sidebar_position: 1
title: SEP-10 Authentication
slug: /stellar/sep10
---

# SEP-10: Stellar Authentication

:::info
See the full [SEP-10 Documentation](https://github.com/sublime247/mobile-money/blob/main/docs/SEP10_AUTHENTICATION.md) in the repository.
:::

## Overview

SEP-10 defines a standard authentication flow for Stellar accounts. It uses challenge-response to verify account ownership.

## Flow

1. Client requests challenge transaction
2. Client signs challenge with their Stellar key
3. Client submits signed challenge
4. Server verifies signature and issues JWT
