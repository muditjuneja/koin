import { describe, it, expect } from 'vitest';
import { SaveQueue } from '../src/lib/save-queue';

describe('SaveQueue Concurrency & Fault Tolerance', () => {
    it('executes tasks in strict sequential FIFO order', async () => {
        const queue = new SaveQueue();
        const executionLog: number[] = [];

        const task1 = queue.add(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            executionLog.push(1);
            return 'result-1';
        });

        const task2 = queue.add(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            executionLog.push(2);
            return 'result-2';
        });

        const task3 = queue.add(async () => {
            executionLog.push(3);
            return 'result-3';
        });

        const [r1, r2, r3] = await Promise.all([task1, task2, task3]);

        expect(r1).toBe('result-1');
        expect(r2).toBe('result-2');
        expect(r3).toBe('result-3');
        expect(executionLog).toEqual([1, 2, 3]);
    });

    it('isolates task errors: a failing task does not deadlock or corrupt subsequent queue items', async () => {
        const queue = new SaveQueue();
        const executionLog: string[] = [];

        const t1 = queue.add(async () => {
            executionLog.push('first');
            return 'ok-1';
        });

        const t2 = queue.add(async () => {
            executionLog.push('failing');
            throw new Error('Save corrupted in slot');
        });

        const t3 = queue.add(async () => {
            executionLog.push('recovered');
            return 'ok-3';
        });

        const r1 = await t1;
        expect(r1).toBe('ok-1');

        await expect(t2).rejects.toThrow('Save corrupted in slot');

        const r3 = await t3;
        expect(r3).toBe('ok-3');

        expect(executionLog).toEqual(['first', 'failing', 'recovered']);
        expect(queue.isBusy).toBe(false);
    });

    it('handles heavy concurrent bursts without dropping any operations', async () => {
        const queue = new SaveQueue();
        const count = 50;
        const results: number[] = [];

        const promises = Array.from({ length: count }, (_, i) =>
            queue.add(async () => {
                await new Promise(r => setTimeout(r, 1));
                results.push(i);
                return i;
            })
        );

        expect(queue.isBusy).toBe(true);

        const resolved = await Promise.all(promises);

        expect(queue.isBusy).toBe(false);
        expect(resolved.length).toBe(count);
        expect(results).toEqual(Array.from({ length: count }, (_, i) => i));
    });

    it('accurately reports isBusy flag throughout the queue lifecycle', async () => {
        const queue = new SaveQueue();
        expect(queue.isBusy).toBe(false);

        let finishFirstTask!: () => void;
        const task1Promise = queue.add(
            () => new Promise(resolve => { finishFirstTask = () => resolve('done'); })
        );

        expect(queue.isBusy).toBe(true);

        finishFirstTask();
        await task1Promise;

        expect(queue.isBusy).toBe(false);
    });
});
