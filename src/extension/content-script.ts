document.documentElement.dataset.chessmintBaseUrl = chrome.runtime.getURL('');

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

// --- WebSocket bridge ---
let bridgeSocket: WebSocket | null = null;

window.addEventListener('ChessMintWsConnect', ((e: CustomEvent) => {
    const port = (e.detail as { port: number }).port || 8000;
    if (bridgeSocket) bridgeSocket.close();

    bridgeSocket = new WebSocket(`ws://localhost:${port}/ws`);
    bridgeSocket.onopen = () => window.dispatchEvent(new CustomEvent('ChessMintWsOpen'));
    bridgeSocket.onmessage = (event) => window.dispatchEvent(new CustomEvent('ChessMintWsMessage', { detail: event.data }));
    bridgeSocket.onerror = () => window.dispatchEvent(new CustomEvent('ChessMintWsError'));
    bridgeSocket.onclose = () => { window.dispatchEvent(new CustomEvent('ChessMintWsClose')); bridgeSocket = null; };
}) as EventListener);

window.addEventListener('ChessMintWsSend', ((e: CustomEvent) => {
    if (bridgeSocket && bridgeSocket.readyState === WebSocket.OPEN) {
        bridgeSocket.send(e.detail as string);
    }
}) as EventListener);

// --- Worker bridge ---
const workers = new Map<string, Worker>();

window.addEventListener('ChessMintWorkerCreate', ((e: CustomEvent) => {
    const { id, url } = e.detail as { id: string; url: string };
    try {
        const worker = new Worker(url);
        workers.set(id, worker);
        worker.onmessage = (msg) => {
            window.dispatchEvent(new CustomEvent('ChessMintWorkerMsg', { detail: { id, data: msg.data } }));
        };
        worker.onerror = (err) => {
            window.dispatchEvent(new CustomEvent('ChessMintWorkerErr', { detail: { id, message: err.message } }));
        };
    } catch (err: any) {
        window.dispatchEvent(new CustomEvent('ChessMintWorkerErr', {
            detail: { id, message: err?.message || 'Failed to create Worker' }
        }));
    }
}) as EventListener);

window.addEventListener('ChessMintWorkerSend', ((e: CustomEvent) => {
    const { id, cmd } = e.detail as { id: string; cmd: string };
    const worker = workers.get(id);
    if (worker) worker.postMessage(cmd);
}) as EventListener);

window.addEventListener('ChessMintWorkerKill', ((e: CustomEvent) => {
    const id = (e.detail as { id: string }).id;
    const worker = workers.get(id);
    if (worker) { worker.terminate(); workers.delete(id); }
}) as EventListener);
