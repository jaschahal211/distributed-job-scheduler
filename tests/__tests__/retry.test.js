const RetryManager = require('../../worker/src/retryManager');

describe('3. Retry Manager Policy Tests', () => {
    test('Fixed Backoff Calculation', () => {
        const policy = { strategy: 'fixed', base_delay_seconds: 5 };
        expect(RetryManager.calculateNextRetryDelay(policy, 1)).toBe(5);
        expect(RetryManager.calculateNextRetryDelay(policy, 2)).toBe(5);
        expect(RetryManager.calculateNextRetryDelay(policy, 3)).toBe(5);
    });

    test('Linear Backoff Calculation', () => {
        const policy = { strategy: 'linear', base_delay_seconds: 5 };
        expect(RetryManager.calculateNextRetryDelay(policy, 1)).toBe(5);
        expect(RetryManager.calculateNextRetryDelay(policy, 2)).toBe(10);
        expect(RetryManager.calculateNextRetryDelay(policy, 3)).toBe(15);
    });

    test('Exponential Backoff Calculation', () => {
        const policy = { strategy: 'exponential', base_delay_seconds: 5 };
        // 5 * 2^(1-1) = 5
        expect(RetryManager.calculateNextRetryDelay(policy, 1)).toBe(5);
        // 5 * 2^(2-1) = 10
        expect(RetryManager.calculateNextRetryDelay(policy, 2)).toBe(10);
        // 5 * 2^(3-1) = 20
        expect(RetryManager.calculateNextRetryDelay(policy, 3)).toBe(20);
        // 5 * 2^(4-1) = 40
        expect(RetryManager.calculateNextRetryDelay(policy, 4)).toBe(40);
    });
});
