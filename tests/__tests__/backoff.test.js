const RetryManager = require('../../worker/src/retryManager');

describe('4. Exponential Backoff Formula & Max Boundary Tests', () => {
    test('Calculates correct exponential delays up to max cap', () => {
        const policy = {
            strategy: 'exponential',
            base_delay_seconds: 2,
            max_delay_seconds: 30,
        };

        // Attempt 1: 2 * 2^0 = 2
        expect(RetryManager.calculateNextRetryDelay(policy, 1)).toBe(2);
        // Attempt 2: 2 * 2^1 = 4
        expect(RetryManager.calculateNextRetryDelay(policy, 2)).toBe(4);
        // Attempt 3: 2 * 2^2 = 8
        expect(RetryManager.calculateNextRetryDelay(policy, 3)).toBe(8);
        // Attempt 4: 2 * 2^3 = 16
        expect(RetryManager.calculateNextRetryDelay(policy, 4)).toBe(16);
        // Attempt 5: 2 * 2^4 = 32 -> capped at max_delay_seconds 30
        expect(RetryManager.calculateNextRetryDelay(policy, 5)).toBe(30);
    });

    test('Defaults to exponential strategy if policy is undefined', () => {
        expect(RetryManager.calculateNextRetryDelay(null, 1)).toBe(5);
        expect(RetryManager.calculateNextRetryDelay(null, 2)).toBe(10);
    });
});
