export class WsBridge {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState: number = 0;

    private listeners: Array<{ type: string; handler: EventListener }> = [];

    constructor(url: string) {
        const portMatch = url.match(/:(\d+)/);
        const port = portMatch ? parseInt(portMatch[1]) : 8000;

        this.addListener('ChessMintWsOpen', () => {
            this.readyState = 1;
            this.onopen?.();
        });

        this.addListener('ChessMintWsMessage', ((e: CustomEvent) => {
            this.onmessage?.({ data: e.detail } as MessageEvent);
        }) as EventListener);

        this.addListener('ChessMintWsError', (() => {
            this.readyState = 3;
            this.onerror?.();
        }) as EventListener);

        this.addListener('ChessMintWsClose', (() => {
            this.readyState = 3;
            this.onclose?.();
            this.cleanup();
        }) as EventListener);

        window.dispatchEvent(new CustomEvent('ChessMintWsConnect', { detail: { port } }));
    }

    send(data: string): void {
        window.dispatchEvent(new CustomEvent('ChessMintWsSend', { detail: data }));
    }

    private addListener(type: string, handler: EventListener) {
        window.addEventListener(type, handler);
        this.listeners.push({ type, handler });
    }

    private cleanup() {
        for (const { type, handler } of this.listeners) {
            window.removeEventListener(type, handler);
        }
        this.listeners = [];
    }
}
