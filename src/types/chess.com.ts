export type TEventType =
    // meta
    | "all"
    // APIEvents (game lifecycle)
    | "AddMove"
    | "BlinkHighlight"
    | "ClearMarkings"
    | "CreateContinuation"
    | "CreateGame"
    | "DeletePosition"
    | "DrawAgreed"
    | "DrawClaimed"
    | "GameResigned"
    | "IllegalMove"
    | "LineCommentUpdated"
    | "LineUpdated"
    | "Load"
    | "Mark"
    | "Move"
    | "MoveBackward"
    | "MoveForward"
    | "MoveNotAllowed"
    | "MoveRejected"
    | "MoveVariation"
    | "NodeUpdated"
    | "NodeLimitsUpdated"
    | "OutOfTime"
    | "PromoteVariation"
    | "Reload"
    | "ResetGame"
    | "ResetToMainLine"
    | "SelectLineEnd"
    | "SelectLineStart"
    | "SelectNode"
    | "SetBoardPosition"
    | "SetPlayingAs"
    | "TurnSet"
    | "Undo"
    | "Unmark"
    | "UpdatePGNHeaders"
    // InstanceEvents (board instance lifecycle)
    | "Create"
    | "Destroy"
    | "ModeChanged"
    | "RendererSet"
    | "RendererSetFailed"
    | "WebGLAssetsInitialized"
    | "StylesSetFailed"
    // OptionsEvents
    | "UpdateOptions"
    | "UpdateModeOptions"
    // SoundEvents
    | "PlaySound"
    // BoardEvents
    | "PromotionAreaClosePointerdown"
    | "PromotionPiecePointerdown"
    // UIEvents
    | "Resize"
    | "ToggleHotkeyLegend"
    // Legacy
    | "TimeControlUpdated"
    | "PluginAdded"
    | "PluginRemoved";

export interface IGameEvent {
    data: any;
    type: TEventType;
}

export type TEffectType =
    | "Custom"
    | "BestMove"
    | "Blunder"
    | "Book"
    | "Brilliant"
    | "CheckmateBlack"
    | "CheckmateWhite"
    | "Correct"
    | "Critical"
    | "DrawBlack"
    | "DrawWhite"
    | "Excellent"
    | "FastWin"
    | "Forced"
    | "FreePiece"
    | "Gamechanger"
    | "Good"
    | "GreatFind"
    | "Inaccuracy"
    | "Incorrect"
    | "Mate"
    | "Miss"
    | "MissedWin"
    | "Mistake"
    | "ResignBlack"
    | "ResignWhite"
    | "Sharp"
    | "Takeback"
    | "Threat"
    | "TimeoutBlack"
    | "TimeoutWhite"
    | "Undo"
    | "Winner"
    | "WinnerWhite"
    | "Interesting"
    | "Warning"
    | "Equal"
    | "Stalemate"
    | "Abandon"
    | "BughouseWhite"
    | "BughouseBlack";

export type TMarkingType = "arrow" | "effect" | "highlight";

export interface IMarking {
    type: TMarkingType;
    key?: string; // "arrow|e2e4", "effect|e4"
    /**
     * Node binding. `true` binds to the current node; `{line, move}` binds to
     * a specific node and is internally keyed as `${key}-(${move})|(${line})`.
     * Set to `true` to make the marking hidden when navigating forward/backward.
     */
    node?: boolean | { line: number; move: number };
    persistent?: boolean; // set to false when you want it to be removed when user interact with the board
    /**
     * Internal id assigned when a marking is bound to a specific node
     * (format: `${key}-(${move})|(${line})`). Read-only from consumer code.
     */
    id?: string;
    data: {
        // arrow fields
        from?: string;
        to?: string;
        // highlight / effect fields
        square?: string;
        color?: string;
        keyPressed?: "alt" | "ctrl" | "shift" | "none" | string;
        // alternative to color: render a pointing finger cursor
        pointerFinger?: boolean;
        opacity?: number; // between 0 and 1
        type?: TEffectType;
        animated?: boolean;
        path?: string; // svg path for effect
        // custom-color override
        customColor?: string;
        // animated removal
        removalClass?: string;
        removalTimeout?: number; // ms, default 400
        // custom image / sprite frame
        frame?: {
            imageURL: string;
            imageAnimated?: boolean;
            positionRatioX?: number;
            positionRatioY?: number;
            widthRatio?: number;
            heightRatio?: number;
        };
        // arbitrary extension fields (e.g. guess-the-move payload)
        [key: string]: any;
    };
    tags?: string[];
}

export interface IGameNode {
    // Position of this node in the move tree.
    ids: { move: number; line: number };
    // Parent node reference (undefined for the root).
    previous?: { line: number; move: number };
    // 0-indexed ply (0 = start position).
    moveNumber: number;
    // Display move number (1, 2, 3, ...). 
    wholeMoveNumber: number;
    // Same as moveNumber in most contexts. 
    ply?: number;
    // 1 = white, 2 = black. 
    color: number;
    san: string;
    fen: string;
    beforeFen?: string;
    time?: number;
    annotation?: string;
    additionalAnnotation?: string;
    comment?: string;
    isBeforeComment?: boolean;
    customColor?: string;
    [key: string]: any;
}

export interface IGameHistory {
    from: TSquare;
    to: TSquare;
    promotion: TPromotionPiece;
    san: string;

    beforeFen: string;
    fen: string;

    piece: TPiece;
    flags: number;

    hash: number[];
    wholeMoveNumber: number; // move number in notation (floor(num/2))
}

// game eco theory
export interface IGameECO {
    ml: string; // moves by theory, in full notation, ex: "e2e4 c7c5 g1f3 a7a6 c2c3 b7b5"
    m: string; // moves by theory, in san, ex: "1.e4 c5 2.Nf3 a6 3.c3 b5"
    n: string; // theory name, ex: "Sicilian Defense: O'Kelly, Venice, Ljubojević Line"
    u: string; // theory name, ex: "Sicilian-Defense-OKelly-Venice-Ljubojevic-Line"
}

export interface IGameOptions {
    allowMarkings: boolean;
    analysisHighlightColors: {
        alt: string;
        ctrl: string;
        default: string;
        shift: string;
    };

    analysisHighlightOpacity: 0.8;
    animationType: string; // "default"
    arrowColors: {
        alt: string;
        ctrl: string;
        default: string;
        shift: string;
    };
    aspectRatio: 1;
    autoClaimDraw: boolean;
    autoPromote: boolean;
    autoResize: boolean;
    boardStyle: string; // "green"
    captureKeyStrokes: boolean;
    checkBlinkingSquareColor: string; // "#ff0000"
    coordinates: string; // "inside"
    darkMode: boolean;
    diagramStyle: boolean;
    enabled: boolean;
    fadeSetup: number; // 0
    flipped: boolean;
    highlightLegalMoves: boolean;
    highlightMoves: boolean;
    highlightOpacity: number; // 0.5
    hoverSquareOutline: boolean;
    id: string;
    moveListContextMenuEnabled: boolean;
    moveListDisplayType: string; // "figurine"
    moveMethod: string; // "drag"
    overlayInAnalysisMode: boolean;
    pieceStyle: string; // "neo"
    playSounds: boolean;
    premoveDelay: number; // 200
    premoveHighlightColor: string; // "#f42a32"
    premoveHighlightOpacity: number; // 0.5
    rounded: boolean;
    soundTheme: string; // "default"
    threatSquareColor: string; // "#ff0000"
    threatSquareOpacity: number; // 0.8
    useSharedStyleTag: boolean;
    boardSize: string; // "auto"
    isWhiteOnBottom: boolean;
    showTimestamps: boolean;
    test: boolean;
}

export interface IMoveDetail {
    animate: boolean;
    lineDiff: number;
    linesReordered: boolean;
    move: {
        from: string;
        to: string;
        san?: string;
        promotion?: string;
        piece?: string;

        time?: number; // only available when play online

        // only own move
        color?: number; // 1 for white, 2 for black
        lines?: null; // unk
        userGenerated?: boolean;
        userGeneratedDrop?: boolean;

        // ANY_CAPTURE: 5
        // BIG_PAWN: 2 // pawn move 2 steps
        // CAPTURE: 1
        // DROP: 64
        // DROP_OR_PROMOTE: 72
        // EP_CAPTURE: 4
        // KQSIDE_CASTLE: 48
        // KSIDE_CASTLE: 16
        // PROMOTION: 8
        // QSIDE_CASTLE: 32
        flags?: number;
    };
}

export interface IGameMarkings {
    addOne(marking: IMarking): string; // return the key, ex: "arrow|e2e4"
    addMany(markings: IMarking[]): void;
    removeOne(key: string): void;
    removeMany(keys: string[]): void;
    getAll(): IMarking[];
    removeAll(): void;
    removeAllWhere(match: any): void;
}

export interface IGamePlugin {
    name: string;

    match: {
        condition: { (a: any): boolean };
        handler: { (e: any, t: any): void };
    }[];

    api(e: any): any;
    create(e: any): any;
    destroy(e: any): any;
    destroyAPIMethods(): void;
}

export interface IGamePluginManager {
    add(plugin: IGamePlugin): void;
    addMany(plugins: IGamePlugin): void;
    get(): IGamePlugin[];
    has(plugin: IGamePlugin): void;
    remove(pluginName: string): void;
    setCreatePluginContext(e: any): void;
}

export interface IGameMode {
    name: string;
    isAllowedToMove?(): boolean;
    getOptions(): IGameModeOptions;
    setOption?(key: string, value: any): void;
}

export interface IGameModeOptions {
    canAddMovesToMainLine?: boolean;
    canMoveWhenGameIsOver?: boolean;
    canMoveWhenNotPlayerTurn?: boolean;
    canModifyExistingMovesOnMainLine?: boolean;
    usePlayingAs?: boolean;
    [key: string]: any;
}

export interface IGame {
    // move a piece on the board
    move(move: IMoveDetail): void;

    // change the game mode
    setMode(mode: any): any;

    // emit game events
    emit(event: string, data: any): any;

    // unsubscribe from a game event (mirror of `on`)
    off?: (event: TEventType, fn: (event: IGameEvent) => void) => void;

    // be aware that this will return false if the game hasn't started
    isGameOver(): boolean;

    // is end of theory openings
    // isAtEndOfLine(): boolean;

    eco: {
        get(): IGameECO | null;
        update(): Promise<void>;
        _update(): Promise<void>;
    };

    markings: IGameMarkings;

    plugins: IGamePluginManager;

    // get raw history
    getRawLines(): IGameHistory[][];

    getCurrentFullLine(): IGameHistory[];

    getLastMove(): IGameHistory | undefined;

    getContext(): any;

    getOptions(): IGameOptions;

    // get the current FEN
    getFEN(): string;

    // get current turn, 1 is white, 2 is black
    getTurn(): number;
    getPlayingAs(): number | undefined;
    setPlayingAs?(color: number): void;

    // get the current game mode (playing, analysis, observing, etc.)
    getMode(): IGameMode;

    // get all legal moves on the board
    getLegalMoves(): IMoveDetail[];

    getNodeIds(): { move: number; line: number };

    // Currently selected node (richer than `getNodeIds()`).
    getSelectedNode?(): IGameNode | undefined;

    // Look up a specific node by `{line, move}`. 
    getNodeByIds?(ids: { line: number; move: number }): IGameNode | undefined;

    // Starting move number used for SAN rendering (usually 1).
    getStartingMoveNumber?(): number;

    // Get the position object at a given node (defaults to current).
    getPosition?(move?: number, line?: number): any;

    // Programmatic node navigation.
    selectNode?(line: number, move: number): void;
    selectLineStart?(line?: number): void;
    selectLineEnd?(line?: number): void;

    // Get or set the current turn (omit arg to get).
    turn?(color?: number): number;

    /** Game result (e.g. "1-0", "0-1", "1/2-1/2", "*"). */
    getResult?(): any;

    /** Position fingerprints cache (e.g. `{ startingFen: string }`). */
    getFingerprints?(): { startingFen: string; [key: string]: any };

    // Manual animation control (used internally by the animation queue).
    setAnimatingStatus?(status: boolean): void;

    // PGN header accessor (omit name to get all headers). 
    header?(name?: string): any;

    // Update a comment on a specific line.
    updateLineComment?(lineId: any, comment: any): void;

    // Move a variation up (direction=-1) or down (direction=1) in the tree. 
    moveVariation?(line: number, direction: number): boolean;

    // Reset the move tree back to the main line.
    resetToMainLine?(): void;

    // Clock info accessor (present on timed games).
    timeControl?: { get(): { baseTime: number; [key: string]: any } | null };

    // Observer-mode helpers (present when game is being observed).
    observing?: { isAnalyzing(): boolean };

    isAnimating(): boolean;

    // used for debugging only, calling this will hook all function of the game controller
    debug_hook(): void;

    on: (event: TEventType, fn: (event: IGameEvent) => void) => void;
}

export interface IBoardElement extends HTMLElement {
    game: IGame;
}
