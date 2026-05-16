import { onOptionsUpdated, options } from "./options";
import { WsBridge } from "./extension/ws-bridge";
import { WorkerBridge } from "./extension/worker-bridge";
import stockfishSrc from "./assets/stockfish/stockfish-18-lite-single.js?raw";
import wasmUrl from "./assets/stockfish/stockfish-18-lite-single.wasm?inline";

export interface IEnginePv {
    lan: TLANotation;
    line: TLANotation[];
    from: TSquare;
    to: TSquare;
    promotion?: TPromotionPiece;
    depth: number;
    seldepth: number;
    multipv: number;
    score: number;
    absoluteScore: number;
    isMate: boolean;
    nodes: number;
    nps: number;
}

export interface IEngineHandler {
    onUpdatePv(moveNumber: number, pv: IEnginePv): void
    onBestMoveFound(moveNumber: number, lan: TLANotation): void
}

export const MIN_ENGINE_MULTI_PV = 3;
const REGEX_BESTMOVE = /^bestmove (?<bestmove>[a-h][1-8][a-h][1-8][qrbn]?)?/;
const REGEX_PV =
    /^info depth (?<depth>\d+) seldepth (?<seldepth>\d+) multipv (?<multipv>\d+) score (?<scoreType>cp|mate) (?<score>-?\d+) nodes (?<nodes>-?\d+) nps (?<nps>\d+)(?:.*?) pv (?<pv>.+)/;


export class Engine {
    private readonly handler: IEngineHandler;
    private worker!: Worker | WebSocket | WsBridge | WorkerBridge;
    private currentMoveNumber: number = 0;
    private isLoaded: boolean;
    private isReady: boolean;
    private isEvaluating: boolean;
    private isRequestedStop: boolean;
    private readyCallback?: { (): void };
    private bestmoveCallback?: { (): void };

    private options: { [opt: string]: string | number | boolean };
    private reconnectAttempts: number = 0;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private externalUrl: string = "";

    private resolveStockfishUrl(): string {
        const wasmDataUrl = wasmUrl.replace('application/wasm', 'application/octet-stream');
        const patched = stockfishSrc.replace(
            /['"]stockfish\.wasm['"]/,
            `'${wasmDataUrl}'`
        );

        return URL.createObjectURL(new Blob([patched], { type: 'application/javascript' }));
    }

    constructor(handler: IEngineHandler) {
        this.handler = handler;
        this.isLoaded = false;
        this.isReady = false;
        this.isEvaluating = false;
        this.isRequestedStop = false;
        this.readyCallback = undefined;
        this.bestmoveCallback = undefined;

        this.options = {};

        if (options.engineUseExternal) {

            this.externalUrl = `ws://localhost:${options.engineExternalPort}/ws`;
            this.connectExternal();

        } else {
            this.initBuiltinWorker();
        }

        onOptionsUpdated(() => {
            this.updateOptions();
        });
    }

    private initBuiltinWorker() {
        const url = this.resolveStockfishUrl();
        if (!url) return; // content script hasn't prepared the blob URL yet

        try {
            this.worker = new WorkerBridge(url);
            this.worker.onmessage = (e) => {
                this.processMessage(e);
            };
        } catch (e) {
            alert("Failed to load stockfish");
            throw e;
        }

        this.send("uci");
        this.updateOptions();
    }

    private connectExternal() {
        this.worker = new WsBridge(this.externalUrl);
        this.worker.onmessage = (e) => {
            this.processMessage(e);
        }
        this.worker.onopen = () => {
            this.reconnectAttempts = 0;
            this.send("uci");
            this.updateOptions();
        }
        this.worker.onerror = () => {
            (window as any).toaster?.add?.({
                id: "chess.com",
                duration: 5000,
                icon: "circle-exclamation",
                content: `Failed to connect to external engine on port ${options.engineExternalPort}`,
            });
        }
        this.worker.onclose = () => {
            if (this.isLoaded) {
                (window as any).toaster?.add?.({
                    id: "chess.com",
                    duration: 5000,
                    icon: "circle-exclamation",
                    content: "External engine disconnected",
                });
                this.isLoaded = false;
                this.isReady = false;
            }

            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            this.reconnectTimer = setTimeout(() => this.connectExternal(), delay);
        }
    }

    public newGame() {
        this.isReady = false;
        this.send("ucinewgame");
    }

    public go(lanMoves: TLANotation[], depth: number = options.engineDepth) {
        if (!this.worker) {
            this.initBuiltinWorker();
        }

        let fn = () => {
            this.isEvaluating = true;
            this.currentMoveNumber = lanMoves.length - 1;
            if (this.currentMoveNumber == -1) {
                this.send(`position startpos`);
            } else {
                this.send(`position startpos moves ${lanMoves.join(" ")}`);
            }

            if (depth) {
                this.send(`go depth ${depth}`);
            } else {
                this.send(`go`);
            }
        };

        this.onReady(() => {
            if (this.isEvaluating) this.stop(fn);
            else fn();
        });
    }

    private onReady(callback: { (): void }) {
        if (this.isReady) callback();
        else {
            this.readyCallback = callback;
            this.send("isready");
        }
    }

    private stop(callback: { (): void }) {
        if (this.isEvaluating) {
            this.isRequestedStop = true;
            this.bestmoveCallback = callback;
            this.send("stop");
        } else {
            callback();
        }
    }

    private send(cmd: string): void {
        if (!this.worker) return;
        if (this.worker instanceof WorkerBridge) {
            this.worker.postMessage(cmd);
        } else if (this.worker instanceof Worker) {
            this.worker.postMessage(cmd);
        } else if (this.worker.readyState === WebSocket.OPEN) {
            this.worker.send(cmd);
        }
    }

    private updateOptions() {
        this.options["Hash"] = options.engineHash;
        this.options["Threads"] = options.engineThreads;
        this.options["Ponder"] = options.enginePonder;
        this.options["MultiPV"] = options.engineDisableMinOptions
            ? options.multiPv
            : Math.max(options.multiPv, MIN_ENGINE_MULTI_PV);

        Object.keys(this.options).forEach((key) => {
            this.send(`setoption name ${key} value ${this.options[key]}`);
        });
    }

    private processMessage(event: MessageEvent<any>) {
        let line: string =
            event && typeof event === "object" ? event.data : event;

        // console.log("SF: " + line);

        if (line == "uciok") {
            this.isLoaded = true;
            (window as any).toaster.add({
                id: "chess.com",
                duration: 3000,
                icon: "circle-info",
                content: `ChessMint is enabled!`,
            });
        } else if (line === "readyok") {
            this.isReady = true;
            if (this.readyCallback) {
                let copy = this.readyCallback;
                this.readyCallback = undefined;
                copy();
            }
        } else if (this.isEvaluating && line === "Load eval file success: 1") {
            // we have sent the "go" command before stockfish loaded the eval file
            // this.isEvaluating will be stuck at true, this fixes it.
            this.isEvaluating = false;
            this.isRequestedStop = false;
            if (this.bestmoveCallback) {
                let copy = this.bestmoveCallback;
                this.bestmoveCallback = undefined;
                copy();
            }
        } else {
            let match = REGEX_PV.exec(line);

            if (match && match.groups) {
                if (!this.isRequestedStop) {
                    const line = match.groups["pv"].split(" ") as TLANotation[];
                    const score = parseInt(match.groups["score"]);
                    const absoluteScore =
                        this.currentMoveNumber % 2 == 0 ? -score : score;

                    const promotion =
                        line[0].length == 5
                            ? (line[0].substring(4, 5) as TPromotionPiece)
                            : undefined;

                    let pv: IEnginePv = {
                        lan: line[0],
                        line: line,
                        from: line[0].substring(0, 2) as TSquare,
                        to: line[0].substring(2, 4) as TSquare,
                        promotion: promotion,
                        depth: parseInt(match.groups["depth"]),
                        seldepth: parseInt(match.groups["seldepth"]),
                        multipv: parseInt(match.groups["multipv"]),
                        score: score,
                        absoluteScore: absoluteScore,
                        isMate: match.groups["scoreType"] == "mate",
                        nodes: parseInt(match.groups["nodes"]),
                        nps: parseInt(match.groups["nps"]),
                    };
                    this.handler.onUpdatePv(this.currentMoveNumber, pv);
                }
            } else if ((match = REGEX_BESTMOVE.exec(line))) {
                this.isEvaluating = false;
                if (this.bestmoveCallback) {
                    let copy = this.bestmoveCallback;
                    this.bestmoveCallback = undefined;
                    copy();
                }

                if (!this.isRequestedStop && match[1] !== undefined) {
                    this.handler.onBestMoveFound(
                        this.currentMoveNumber,
                        match[1] as TLANotation
                    );
                }

                this.isRequestedStop = false;
            }
        }
    }
}
