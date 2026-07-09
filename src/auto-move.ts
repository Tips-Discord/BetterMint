export class AutomaticMove {
    private fenMoveArr: string[];
    private domain: string;

    constructor(fenMoveArr: string[]) {
        this.fenMoveArr = fenMoveArr;
        this.domain = window.location.hostname.replace(/^www\./, '');
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

        return {
            x: rect.left + (finalFile * sqW) + (sqW / 2),
            y: rect.top + (finalRank * sqH) + (sqH / 2)
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

    private _selectPromotionPiece(pieceType: string): boolean {
        const idx2D: Record<string, number> = { b: 0, n: 1, q: 2, r: 3 };

        // 3D renderer
        const el3d = document.querySelector(
            `.promotion-piece[data-pieceType="${pieceType}"]`
        );
        if (el3d && (el3d as HTMLElement).offsetParent !== null) {
            el3d.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true, cancelable: true, view: window,
                pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1
            }));
            return true;
        }

        // 2D renderer
        const all = document.querySelectorAll('.promotion-piece');
        if (all.length === 4 && !(all[0] as HTMLElement).getAttribute('data-pieceType')) {
            const el2d = all[idx2D[pieceType] || 2] as HTMLElement;
            if (el2d.offsetParent !== null) {
                el2d.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true, cancelable: true, view: window,
                    pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1
                }));
                return true;
            }
        }

        return false;
    }

    private _isMyTurn(): boolean {
        const checkTurn = (): boolean => {
            if (this.domain !== 'chess.com') return true;

            const board = this._getBoardElement();
            if (!board) return false;

            const game = (board as any)?.game;
            if (!game) return false;

            // Game over -> never move.
            if (typeof game.isGameOver === 'function' && game.isGameOver()) {
                return false;
            }

            try {
                const mode = typeof game.getMode === 'function' ? game.getMode() : null;
                if (mode && typeof mode.isAllowedToMove === 'function') {
                    return !!mode.isAllowedToMove();
                }
            } catch {
                // fall through to manual check
            }

            if (typeof game.getPlayingAs === 'function' && typeof game.getTurn === 'function') {
                const playingAs = game.getPlayingAs();
                if (playingAs === undefined || playingAs === null) {
                    return true;
                }
                return playingAs === game.getTurn();
            }

            return true;
        };

        const isMyTurn = checkTurn();
        // this returns true only on our turn but i have no idea why :/
        // i might just be stupid so yeah. but atleast it "works" for now. if it breaks in the future, this is probably the culprit.
        // console.log(`Is it my turn?`, isMyTurn, `[${performance.now().toFixed(0)}ms]`);
        return isMyTurn;
    }

    async execute() {
        const from = this.fenMoveArr[0];
        const to = this.fenMoveArr[1];
        const promotion = this.fenMoveArr[2];

        const startSquare = this._resolveSquare(from);
        const endSquare = this._resolveSquare(to);
        if (!startSquare || !endSquare) return false;

        if (!this._isMyTurn()) return false;

        (window as any).__chessmintAutoMoving = true;

        if (promotion) {
            this._dispatch('pointerdown', startSquare.x, startSquare.y, 1);
            await new Promise(r => setTimeout(r, 15));

            // Drag to destination
            const steps = 3;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                this._dispatch('pointermove',
                    startSquare.x + (endSquare.x - startSquare.x) * t,
                    startSquare.y + (endSquare.y - startSquare.y) * t, 1);
                await new Promise(r => setTimeout(r, 5));
            }

            this._dispatch('pointerup', endSquare.x, endSquare.y, 0);

            // Poll for promotion piece
            for (let i = 0; i < 15; i++) {
                if (this._selectPromotionPiece(promotion || 'q')) break;
                await new Promise(r => setTimeout(r, 10));
            }
        } else {
            this._dispatch('pointerdown', startSquare.x, startSquare.y, 1);
            this._dispatch('pointerup', startSquare.x, startSquare.y, 0);
            this._dispatch('click', startSquare.x, startSquare.y, 0);

            await new Promise(r => setTimeout(r, 5));

            this._dispatch('pointerdown', endSquare.x, endSquare.y, 1);
            this._dispatch('pointerup', endSquare.x, endSquare.y, 0);
            this._dispatch('click', endSquare.x, endSquare.y, 0);
        }

        return true;
    }
}