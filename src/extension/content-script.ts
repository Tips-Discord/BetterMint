import { options, optionsRegisterContentScript } from "@/options";

/// #if DEVELOPMENT
const wsDev = new WebSocket(`ws://localhost:48152`);
wsDev.addEventListener("message", (event) => {
    if (event.data === "reload") {
        chrome.runtime.sendMessage("reload");
        window.location.reload();
    }
});
/// #endif
optionsRegisterContentScript();

let bridgeSocket: WebSocket | null = null;

window.addEventListener('ChessMintWsConnect', ((e: CustomEvent) => {
    const port = (e.detail as { port: number }).port || 8000;

    if (bridgeSocket) {
        bridgeSocket.close();
    }

    bridgeSocket = new WebSocket(`ws://localhost:${port}/ws`);

    bridgeSocket.onopen = () => {
        window.dispatchEvent(new CustomEvent('ChessMintWsOpen'));
    };

    bridgeSocket.onmessage = (event) => {
        window.dispatchEvent(new CustomEvent('ChessMintWsMessage', { detail: event.data }));
    };

    bridgeSocket.onerror = () => {
        window.dispatchEvent(new CustomEvent('ChessMintWsError'));
    };

    bridgeSocket.onclose = () => {
        window.dispatchEvent(new CustomEvent('ChessMintWsClose'));
        bridgeSocket = null;
    };
}) as EventListener);

window.addEventListener('ChessMintWsSend', ((e: CustomEvent) => {
    if (bridgeSocket && bridgeSocket.readyState === WebSocket.OPEN) {
        bridgeSocket.send(e.detail as string);
    }
}) as EventListener);
