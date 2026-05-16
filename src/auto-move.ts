export class AutomaticMove {
    private fenMoveArr: string[];
    private domain: string;

    constructor(fenMoveArr: string[]) {
        this.fenMoveArr = fenMoveArr;
        this.domain = window.location.hostname.replace(/^www\./, '');
    }

    private _isMyTurn() {
        if (this.domain !== 'chess.com') return true;
        const board = this._getBoardElement();
        if (!board) return false;

        const isFlipped = board.classList.contains('flipped');
        const myColor = isFlipped ? 'black' : 'white';
        const clocks = Array.from(document.querySelectorAll('.clock-component'));
        if (clocks.length < 2) return false;

        const activeClock = clocks.find(c =>
            c.classList.contains('clock--turn') ||
            c.classList.contains('clock-player-turn') ||
            c.querySelector('.clock-running')
        );
        if (!activeClock) return false;

        const activeIndex = clocks.indexOf(activeClock);
        const activePlayerIsWhite = activeIndex === 0;
        let isMyTurn = (myColor === 'black' && !activePlayerIsWhite);

        if (!isFlipped && myColor === 'white' && !activePlayerIsWhite)
            isMyTurn = true;

        return isMyTurn;
    }

    private _getBoardElement() {
        return document.querySelector('wc-chess-board') ||
               document.querySelector('#board-layout-chessboard .board') ||
               document.querySelector('.TheBoard-layers');
    }

    private _resolveSquare(square: string) {
        const board = this._getBoardElement();
        if (!board) return null;
        const rect = board.getBoundingClientRect();

        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]) - 1;

        const isFlipped = board.classList.contains('flipped');
        const finalFile = isFlipped ? 7 - file : file;
        const finalRank = isFlipped ? rank : 7 - rank;

        const sqW = rect.width / 8;
        const sqH = rect.height / 8;

        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;

        return {
            x: rect.left + (finalFile * sqW) + (sqW / 2) + offsetX,
            y: rect.top + (finalRank * sqH) + (sqH / 2) + offsetY
        };
    }

    private _dispatch(type: string, x: number, y: number, buttons: number) {
        const el = document.elementFromPoint(x, y);
        if (!el) return;
        el.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, view: window,
            clientX: x, clientY: y, buttons,
            pointerType: 'mouse', isPrimary: true, pressure: buttons ? 0.5 : 0
        }));
    }

    private _handlePromotion(promotion?: string) {
        const modal =
            document.querySelector('.promotion-window') ||
            document.querySelector('[data-cy="promotion-window"]');
        if (!modal) return false;

        const pieceType = promotion || 'q';
        const pieceMap: Record<string, string[]> = {
            q: ['[data-piece$="Q"]', '[data-piece="wq"]', '[data-piece="bq"]', '.wq', '.bq', 'piece.queen'],
            r: ['[data-piece$="R"]', '[data-piece="wr"]', '[data-piece="br"]', '.wr', '.br'],
            b: ['[data-piece$="B"]', '[data-piece="wb"]', '[data-piece="bb"]', '.wb', '.bb'],
            n: ['[data-piece$="N"]', '[data-piece="wn"]', '[data-piece="bn"]', '.wn', '.bn'],
        };

        const selectors = pieceMap[pieceType] || pieceMap.q;
        for (const sel of selectors) {
            const el = modal.querySelector(sel);
            if (el) {
                (el as HTMLElement).click();
                return true;
            }
        }

        // fallback: search all promotion pieces by class and click the best available
        const pieces = modal.querySelectorAll('.promotion-piece, [class*="piece"]');
        const valueOrder = ['q', 'r', 'b', 'n'];
        const startIdx = valueOrder.indexOf(pieceType);
        for (let i = startIdx; i < valueOrder.length; i++) {
            for (const piece of pieces) {
                const cls = piece.className.toLowerCase();
                const dataPiece = (piece as HTMLElement).getAttribute('data-piece')?.toLowerCase() || '';
                if (cls.includes(valueOrder[i]) || dataPiece.endsWith(valueOrder[i].toUpperCase())) {
                    (piece as HTMLElement).click();
                    return true;
                }
            }
        }

        return false;
    }

    private _isGameOver() {
        return !!(
            document.querySelector('[data-cy="game-over-modal-content"]') ||
            document.querySelector('.game-over-modal') ||
            document.querySelector('game-result-header') ||
            document.querySelector('[data-cy="game-result"]')
        );
    }

    async execute(maxRetries = 3, retryDelayMs = 40, postClickWaitMs = 10) {
        (window as any)._autoMoveExecutionId = ((window as any)._autoMoveExecutionId || 0) + 1;
        const myExecutionId = (window as any)._autoMoveExecutionId;
        const isAborted = () => myExecutionId !== (window as any)._autoMoveExecutionId;

        const promotion = this.fenMoveArr[2];

        let turnWaitAttempts = 0;
        while (!this._isMyTurn() && turnWaitAttempts < 50) {
            if (isAborted()) return false;
            await new Promise(r => setTimeout(r, 10));
            turnWaitAttempts++;
        }

        if (isAborted()) return false;
        if (this._isGameOver()) return false;

        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;

            if (this._isGameOver()) return false;
            if (this._isMyTurn()) {
                const startSquare = this._resolveSquare(this.fenMoveArr[0]);
                const endSquare = this._resolveSquare(this.fenMoveArr[1]);

                if (startSquare && endSquare) {
                    this._dispatch('pointerdown', startSquare.x, startSquare.y, 1);
                    this._dispatch('pointerup', startSquare.x, startSquare.y, 0);
                    this._dispatch('click', startSquare.x, startSquare.y, 0);

                    if (isAborted()) return false;
                    await new Promise(r => setTimeout(r, 10));

                    this._dispatch('pointerdown', endSquare.x, endSquare.y, 1);
                    this._dispatch('pointerup', endSquare.x, endSquare.y, 0);
                    this._dispatch('click', endSquare.x, endSquare.y, 0);

                    if (isAborted()) return false;
                    await new Promise(r => setTimeout(r, postClickWaitMs));

                    if (this._handlePromotion(promotion)) {
                        if (isAborted()) return false;
                        await new Promise(r => setTimeout(r, postClickWaitMs));
                    }

                    let verifyAttempts = 0;
                    let moveRegistered = false;
                    while (verifyAttempts < 25) {
                        if (isAborted()) return false;
                        if (!this._isMyTurn()) {
                            moveRegistered = true;
                            break;
                        }
                        await new Promise(r => setTimeout(r, 10));
                        verifyAttempts++;
                    }

                    if (moveRegistered) {
                        return true;
                    }
                }
            }

            if (attempt >= maxRetries || isAborted()) return false;

            await new Promise(r => setTimeout(r, retryDelayMs));
        }

        return false;
    }
}
