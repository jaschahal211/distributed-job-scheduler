# Testing & Verification Guide

Comprehensive automated testing suite for verifying concurrency correctness, retry policies, and Dead Letter Queue (DLQ) operations.

---

## 🧪 Test Suite 1: Atomic Concurrency Test

### Script Path
`tests/concurrencyTest.js`

### What it Tests
1. Seeds 30 queued jobs into a test queue with `concurrency_limit = 3`.
2. Spawns 10 parallel `QueuePoller` instances simulating 10 distributed worker processes claiming simultaneously.
3. Validates that **ZERO duplicate claims** occur.
4. Validates that **EXACTLY 3 jobs** are claimed, matching the queue `concurrency_limit = 3`.

### Execution
```bash
node tests/concurrencyTest.js
```

---

## 🧪 Test Suite 2: Retry Policy & DLQ Integration Test

### Script Path
`tests/retryAndDlqTest.js`

### What it Tests
1. **Exponential Backoff Calculation**: Verifies mathematical calculation (`delay * 2^(attempt - 1)`).
2. **Max Attempts & DLQ Transition**: Simulates job failure at attempt #3 (`max_attempts = 3`), verifies job status transitions to `'failed'`, and asserts entry creation in `dead_letter_queue` table.

### Execution
```bash
node tests/retryAndDlqTest.js
```
