"use strict";
// http://aidiary.hatenablog.com/entry/20040918/1251373370

// the bfxr create sound effects.
// http://www.bfxr.net/

const STONE_EMPTY = 0;
const STONE_WHITE = -1;
const STONE_BLACK = 1;

class Score {
    constructor(board) {
        this.countOfWhite = 0;
        this.countOfBlack = 0;
        this.board = board;
    }
    
    calcCount() {
        this.countOfWhite = 0;
        this.countOfBlack = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.board[y][x] == STONE_WHITE) {
                    this.countOfWhite++;
                }
                if (this.board[y][x] == STONE_BLACK) {
                    this.countOfBlack++;
                }
            }
        }
    }
    draw(g) {
        g.globalAlpha = 0.5;
        let posX = 400 + 50;
        g.fillStyle = "#000";
        g.fillRect(posX, 0, 150, 50);
        
        g.globalAlpha = 1.0;
        g.font = "16pt Ariel";
        g.fillStyle = "#fff";
        g.fillText("WHITE: " + this.countOfWhite, posX + 8, 22);
        g.fillText("BLACK: " + this.countOfBlack, posX + 8, 44);
    }
}

const SEARCH_LEVEL = 2;

// Attificial Intelligence
class AI {
    constructor(reversi) {
        this.reversi = reversi;
        this.valueOfPlace = [
            [120, -20, 20,  5,  5, 20, -20, 120],
            [-20, -40, -5, -5, -5, -5, -40, -20],
            [ 20,  -5, 15,  3,  3, 15,  -5,  20],
            [  5,  -5,  3,  3,  3,  3,  -5,   5],
            [  5,  -5,  3,  3,  3,  3,  -5,   5],
            [ 20,  -5, 15,  3,  3, 15,  -5,  20],
            [-20, -40, -5, -5, -5, -5, -40, -20],
            [120, -20, 20,  5,  5, 20, -20, 120]
        ];
    }
    compute() {
        let tmp = this.minimax(true, SEARCH_LEVEL);
        let x = tmp % 8;
        let y = Math.floor(tmp / 8);
        
        let undo = new Undo(x, y);
        this.reversi.putStone(x, y);
        this.reversi.reverse(undo);
        this.reversi.nextTurn();
        // ここで手番が移る
        if (this.reversi.countCanPutStone() == 0) {
            console.log("Player PASS!");
            this.reversi.nextTurn();
            this.compute();
        }
    }
    
    minimax(flagIsAI, level) {
        let value, childValue, bestX = 0, bestY = 0;
        
        if (level == 0) {
            // 盤面評価
            return this.valueBoard();
        }
        
        if (flagIsAI) {
            // AIの時は、最大評価値を付けたいので、最初は最小値を設定
            value = -9999;
        } else {
            // Playerの時は、最小評価値を付けたいので、最初は最大値を設定
            value = 9999;
        }
        // 掘り下げているときにパスする状態になったら盤面評価を返す。
        if (this.reversi.countCanPutStone() == 0) {
            return this.valueBoard();
        }
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.reversi.canPutStone(x, y)) {
                    // 描画せずに試しに打つ
                    let undo = new Undo(x, y);
                    this.reversi.putStone(x, y);
                    this.reversi.reverse(undo);
                    this.reversi.nextTurn();
                    
                    // 再帰
                    childValue = this.minimax(!flagIsAI, level -1);
                    if (flagIsAI) {
                        if (childValue > value) {
                            value = childValue;
                            bestX = x;
                            bestY = y;
                        }
                    } else {
                        if (childValue < value) {
                            value = childValue;
                            bestX = x;
                            bestY = y;
                        }
                    }
                    
                    // この時点ではボードはひっくり返したままの状態なので、
                    // this.minmaxで一番白が多いものが評価値が高くなる。
                    
                    // 打つ前に戻す
                    this.reversi.undoBoard(undo);
                }
            }
        }
        
        if (level == SEARCH_LEVEL) {
            return bestX + bestY * 8;
        }
        return value;
    }
    
    valueBoard() {
        let value = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                value += this.reversi.getBoard(x, y) * this.valueOfPlace[y][x];
            }
        }
        // 白石（AI）が有利なときは負になるので符合を反転する
        return -1 * value;
    }
    // 評価関数
    valueBoard1() {
        // 盤面に白が多いと評価が高い
        return this.reversi.score.countOfWhite;
    }
}

class Undo {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.count = 0;
        this.position = []; // max length is 8 x 8 = 64.
    }
}

class Othello {
    
    constructor(w, h) {
        this.w = w;
        this.h = h;
        // create canvas element.
        this.canvas = document.createElement("canvas");
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext("2d");
        if (this.ctx == null) {
            console.error("could not get context 2d on canvas.");
            return;
        } else {
            console.info("canvas ready.");
        }
        document.body.appendChild(this.canvas);
        
        // load audio files.
        this.audio = {
            "hit": new Audio("assets/Pickup_Coin.wav")
        };
        
        this.ai = new AI(this);
        
        // init touch
        document.addEventListener('keydown', this.inputKeyHandler.bind(this));
        this.canvas.addEventListener("click", this.clickHandler.bind(this));
        
        this.resetGame();
    }
    
    getBoard(x, y) {
        return this.board[y][x];
    }
    
    resetGame() {
        // clear board.
        this.initBoard();
        this.score = new Score(this.board);
        this.flagTurn = false; // false is black.
    }
    
    inputKeyHandler(e) {
        console.log(e);
        if (e.keyCode == 82) { // R
            this.resetGame();
        }
    }
    
    initBoard() {
        this.board = [];
        for (let y = 0; y < 8; y++) {
            this.board[y] = [];
            for (let x = 0; x < 8; x++) {
                this.board[y][x] = STONE_EMPTY;
            }
        }
        this.board[3][3] = STONE_WHITE;
        this.board[3][4] = STONE_BLACK;
        this.board[4][3] = STONE_BLACK;
        this.board[4][4] = STONE_WHITE;
        //this.showBoardOnConsole();
    }
    
    undoBoard(undo) {
        console.log('undoBoard');
        let c = 0;
        while (undo.position[c] != null) {
            let x = undo.position[c].x;
            let y = undo.position[c].y;
            this.board[y][x] *= -1; // black is -1, white is 1.
            c++;
        }
        this.board[undo.y][undo.x] = STONE_EMPTY;
        this.nextTurn();
    }
    
    clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        
        let rect = e.target.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;
        let x = Math.floor(mouseX / 50);
        let y = Math.floor(mouseY / 50);
        // gard
        if (0 <= x && x <= 7 && 0 <= y && y <= 7) {
            // check can put stone.
            if (this.canPutStone(x, y)) {
                let undo = new Undo(x, y);
                this.putStone(x, y);
                this.audio.hit.play();
                this.reverse(undo);
                this.nextTurn();
                // TODO: Finished?
                // ここでAIに手番が移る
                if (this.countCanPutStone() == 0) {
                    console.log("AI PASS!");
                    this.nextTurn();
                } else {
                    this.ai.compute();
                }
            }
            console.debug(x, y);
        }
    }
    
    nextTurn() {
        this.flagTurn = !this.flagTurn;
    }
    
    canPutStone(x, y) {
        if (this.board[y][x] !== STONE_EMPTY) {
            return false;
        }
        // check 8 way.
        if (this._canPutStone(x, y, 1, 0))
            return true;
        if (this._canPutStone(x, y, 0, 1))
            return true;
        if (this._canPutStone(x, y, -1, 0))
            return true;
        if (this._canPutStone(x, y, 0, -1))
            return true;
        if (this._canPutStone(x, y, 1, 1))
            return true;
        if (this._canPutStone(x, y, -1, -1))
            return true;
        if (this._canPutStone(x, y, 1, -1))
            return true;
        if (this._canPutStone(x, y, -1, 1))
            return true;
        
        return false;
    }
    
    _canPutStone(x, y, offsetX, offsetY) {
        let stone = this.flagTurn ? STONE_WHITE : STONE_BLACK;
        
        let tmpX = x;
        let tmpY = y;
        tmpX += offsetX;
        tmpY += offsetY;
        // if a stone is out of board, cant put stone.
        if (tmpX < 0 || tmpX >= 8 || tmpY < 0 || tmpY >= 8) {
            return false;
        }
        // if next position has same color stone, cant put stone.
        if (this.board[tmpY][tmpX] == stone) {
            return false;
        }
        if (this.board[tmpY][tmpX] == STONE_EMPTY) {
            return false;
        }
        
        tmpX += offsetX;
        tmpY += offsetY;
        while (0 <= tmpX && tmpX < 8 && 0 <= tmpY && tmpY < 8) {
            if (this.board[tmpY][tmpX] == STONE_EMPTY) {
                return false;
            }
            if (this.board[tmpY][tmpX] == stone) {
                return true;
            }
            tmpX += offsetX;
            tmpY += offsetY;
        }
        
        return false;
    }
    
    putStone(x, y) {
        let stone = this.flagTurn ? STONE_WHITE : STONE_BLACK;
        console.log(this.board);
        this.board[y][x] = stone;
    }
    
    reverse(undo) {
        let x = undo.x;
        let y = undo.y;
        // check 8 way.
        if (this._canPutStone(x, y, 1, 0)) {
            this._reverse(undo, 1, 0);
        }
        if (this._canPutStone(x, y, 0, 1)) {
            this._reverse(undo, 0, 1);
        }
        if (this._canPutStone(x, y, -1, 0)) {
            this._reverse(undo, -1, 0);
        }
        if (this._canPutStone(x, y, 0, -1)) {
            this._reverse(undo, 0, -1);
        }
        if (this._canPutStone(x, y, 1, 1)) {
            this._reverse(undo, 1, 1);
        }
        if (this._canPutStone(x, y, -1, -1)) {
            this._reverse(undo, -1, -1);
        }
        if (this._canPutStone(x, y, 1, -1)) {
            this._reverse(undo, 1, -1);
        }
        if (this._canPutStone(x, y, -1, 1)) {
            this._reverse(undo, -1, 1);
        }
    }
    
    _reverse(undo, offsetX, offsetY) {
        let stone = this.flagTurn ? STONE_WHITE : STONE_BLACK;
        let x = undo.x + offsetX;
        let y = undo.y + offsetY;
        while (this.board[y][x] != stone) {
            // do reverse
            this.board[y][x] = stone;
            undo.position[undo.count++] = {'x':x, 'y':y };
            this.audio.hit.play();
            
            x += offsetX;
            y += offsetY;
        }
    }
    
    // debug.
    showBoardOnConsole() {
        for (let y = 0; y < 8; y++) {
            let st = "";
            for (let x = 0; x < 8; x++) {
                st += "" + this.board[y][x] + ",";
            }
            console.log(st);
        }
    }
    
    countCanPutStone() {
        let count = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.canPutStone(x, y)) {
                    count++;
                }
            }
        }
        return count;
    }
    
    input() {
        
    }
    
    update() {
        this.score.calcCount();
    }
    
    drawStone(stat, x, y) {
        if (stat === STONE_WHITE) {
            this.ctx.fillStyle = "#fff";
        } else if (stat === STONE_BLACK) {
            this.ctx.fillStyle = "#000";
        } else {
            return;
        } 
        this.ctx.beginPath();
        let halfSize = 50 / 2;
        this.ctx.arc(x * 50 + halfSize, y * 50 + halfSize, halfSize, 0, 2 * Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
    }
    render() {
        this.ctx.clearRect(0, 0, this.w, this.h);
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                // draw board.
                this.ctx.fillStyle = "#009900";
                this.ctx.fillRect(x * 50, y * 50, 50, 50);
                this.ctx.fillStyle = "#000";
                this.ctx.strokeRect(x * 50, y * 50, 50, 50);
                
                this.drawStone(this.board[y][x], x, y);
            }
        }
        
        this.score.draw(this.ctx);
    }
    run() {
        window.requestAnimationFrame(()=> this.run());
        this.input();
        this.update();
        this.render();
    }
}
var app = new Othello(600, 400);
app.run();
