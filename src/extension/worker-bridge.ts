export class WorkerBridge {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    private id: string;
    private handler: EventListener;

    constructor(url: string) {
        this.id = 'sf-' + Math.random().toString(36).slice(2, 8);

        this.handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { id: string; data?: string; message?: string };
            if (detail.id !== this.id) return;

            if ((e as CustomEvent).type === 'ChessMintWorkerMsg') {
                this.onmessage?.({ data: detail.data } as MessageEvent);
            } else if ((e as CustomEvent).type === 'ChessMintWorkerErr') {
                this.onerror?.(new ErrorEvent('error', { message: detail.message }));
            }
        };

        window.addEventListener('ChessMintWorkerMsg', this.handler);
        window.addEventListener('ChessMintWorkerErr', this.handler);

        window.dispatchEvent(new CustomEvent('ChessMintWorkerCreate', {
            detail: { id: this.id, url }
        }));
    }

    postMessage(cmd: string): void {
        window.dispatchEvent(new CustomEvent('ChessMintWorkerSend', {
            detail: { id: this.id, cmd }
        }));
    }

    terminate(): void {
        window.dispatchEvent(new CustomEvent('ChessMintWorkerKill', {
            detail: { id: this.id }
        }));
        window.removeEventListener('ChessMintWorkerMsg', this.handler);
        window.removeEventListener('ChessMintWorkerErr', this.handler);
    }
}
