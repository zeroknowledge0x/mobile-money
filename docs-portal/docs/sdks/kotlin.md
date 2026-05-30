---
sidebar_position: 1
title: Kotlin SDK
description: Kotlin/Android SDK for Mobile Money API
---

# Kotlin SDK

A Kotlin SDK for integrating Mobile Money into Android applications.

## Installation

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.mobilemoney:sdk:1.2.0")
}
```

## Quick Start

```kotlin
import com.mobilemoney.MobileMoneyClient

val client = MobileMoneyClient(
    apiKey = "sk_live_abc123",
    environment = Environment.SANDBOX
)

// Check balance
val balance = client.getBalance()
println("Balance: ${balance.amount} ${balance.currency}")

// Send money
val transfer = client.transfer(
    amount = 10_000,
    currency = "TZS",
    recipient = "+255751234567",
    provider = Provider.VODACOM
)
println("Transfer ID: ${transfer.id}")
```

## Error Handling

```kotlin
try {
    val transfer = client.transfer(...)
} catch (e: MobileMoneyException) {
    when (e.code) {
        ErrorCode.INSUFFICIENT_BALANCE -> // Handle low balance
        ErrorCode.INVALID_RECIPIENT -> // Handle bad number
        else -> // Handle other errors
    }
}
```

## Package Import Issues

If you experience import drift with the Kotlin SDK, see [issue #993](https://github.com/sublime247/mobile-money/issues/993) for the correct package structure.
