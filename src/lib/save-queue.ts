/**
 * A simple async queue to serialize operations (like saving)
 * ensuring they run one after another.
 */
export class SaveQueue {
    private queue: { task: () => Promise<any>; resolve: (val: any) => void; reject: (err: any) => void }[] = [];
    private isProcessing = false;

    /**
     * Add a task to the queue.
     * @param task A function that returns a promise.
     * @returns A promise that resolves with the task's result.
     */
    add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    /**
     * Check if the queue is currently processing or has pending items.
     */
    get isBusy(): boolean {
        return this.isProcessing || this.queue.length > 0;
    }

    private async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item) {
                try {
                    const result = await item.task();
                    item.resolve(result);
                } catch (err) {
                    item.reject(err);
                }
            }
        }

        this.isProcessing = false;
    }
}
