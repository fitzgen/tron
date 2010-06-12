(function (globals, wu, $) {

    var
    CONNECTION,
    CONTEXT,
    ME,
    ME_X,
    ME_Y,
    THEM,
    THEM_X,
    THEM_Y,
    SEND,
    THEM_MOVE_QUEUE = [],
    BOARD_WIDTH = 400,
    BOARD_HEIGHT = 400,
    BOARD_ROWS = BOARD_HEIGHT / 10,
    BOARD_COLS = BOARD_WIDTH / 10,
    BOARD = wu(BOARD_ROWS).map(function () {
        return wu(BOARD_COLS).map(function () {
            return null;
        }).toArray();
    }).toArray(),
    BGCOLOR = "#000000",
    WAIT = {}, // Singleton to signify that we are still waiting for response
        
    /*
     * Public API exposed in tron object.
     */
     
    tron = globals.tron = {

        // Make some unique singleton objects to expose as the API for moving.
        move: {
            left  : {
                offsetX: -1,
                offsetY: 0,
                toString: function () { return "tron.move.left"; }
            },
            right : { 
                offsetX: 1,
                offsetY: 0,
                toString: function () { return "tron.move.right"; }
            },
            up    : { 
                offsetX: 0,
                offsetY: -1,
                toString: function () { return "tron.move.up"; }
            },
            down  : { 
                offsetX: 0,
                offsetY: 1,
                toString: function () { return "tron.move.down"; }
            }
        },

        // Public API to accessing information about yourself.
        me: {
            pos: function () {
                return [ME_X, ME_Y];
            },
            validMoves: function () {
                var moves = wu(tron.move).mapply(function (key, val) {
                    return val;
                }).filter(function (move) {
                    var pos = tron.me.pos();
                    return BOARD[ pos[0] + move.offsetX ] !== undefined
                        && BOARD[ pos[0] + move.offsetX ][ pos[1] + move.offsetY ] === null;
                }).toArray();
                return moves;
            }
        },

        // Public API to accessing information about them.
        them: {
            pos: function () {
                return [THEM_X, THEM_Y];
            },
            validMoves: function () {
                var moves = wu(tron.move).mapply(function (key, val) {
                    return val;
                }).filter(function (move) {
                    var pos = tron.them.pos();
                    return BOARD[ pos[0] + move.offsetX ] !== undefined
                        && BOARD[ pos[0] + move.offsetX ][ pos[1] + move.offsetY ] === null;
                }).toArray();
                return moves;
            }
        },

        // Register an iterator as your AI.
        register: function (iterator) {
            if (!(iterator instanceof wu)) {
                throw new TypeError("Tron AI must be a wu iterator.");
            }
            else {
                ME = iterator;
            }
        },

        board: function () {
            // Make a copy of the board so there is no foul play.
            return wu(BOARD).map(function (row) {
                return wu(row).toArray();
            }).toArray();
        }
    };

    function rect(x, y, w, h) {
        CONTEXT.beginPath();
        CONTEXT.rect(x,y,w,h);
        CONTEXT.closePath();
        CONTEXT.fill();
    }

    function red(x, y) {
        CONTEXT.fillStyle = "#FF0000";
        rect(x * (BOARD_WIDTH / BOARD_COLS),
             y * (BOARD_HEIGHT / BOARD_ROWS),
             BOARD_WIDTH / BOARD_COLS,
             BOARD_HEIGHT / BOARD_ROWS);
    }

    function blue(x, y) {
        CONTEXT.fillStyle = "#0000FF";
        rect(x * (BOARD_WIDTH / BOARD_COLS),
             y * (BOARD_HEIGHT / BOARD_ROWS),
             BOARD_WIDTH / BOARD_COLS,
             BOARD_HEIGHT / BOARD_ROWS);
    }

    function clear() {
        CONTEXT.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        CONTEXT.fillStyle = BGCOLOR;
        rect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    }

    function render() {
        blue(THEM_X, THEM_Y);
        red(ME_X, ME_Y);
        BOARD[THEM_X][THEM_Y] = true;
        BOARD[ME_X][ME_Y] = true;
    }

    var endGame = wu.compose(
        wu.bind($("#connect"), $.fn.click),
        wu.match([-1], function () { 
                     sessionStorage.losses += 1;
                 },
                 [0], function () {
                     sessionStorage.draws += 1;
                 },
                 [1], function () {
                     sessionStorage.wins += 1;
                 }),
        function (status) {
            CONNECTION.close();
            return status;
        }
    );
     
    function beginGame() {
        render();
        var their_move = THEM.next();
        var my_move = ME.next();
        if ( !wu(tron.me.validMoves()).has(my_move) ) {
            return endGame(-1);
        }
        SEND(my_move);
        var doMoves = function () {
            if ( !wu(tron.them.validMoves()).has(their_move) ) {
                return endGame(1);
            }
            THEM_X += their_move.offsetX;
            THEM_Y += their_move.offsetY;
            ME_X += my_move.offsetX;
            ME_Y += my_move.offsetY;
            if ( (ME_X === THEM_X) && (ME_Y === THEM_Y)
                 || (tron.me.validMoves().length === tron.them.validMoves().length)
                    && tron.me.validMoves().length === 0 ) {
                return endGame(0);
            }
            else if ( tron.me.validMoves().length === 0 ) {
                return endGame(-1);
            }
            else if ( tron.them.validMoves().length === 0 ) {
                return endGame(1);
            } else {
                return setTimeout(beginGame, 50);
            }
        };
        return their_move === WAIT ?
            setTimeout(function waitForTheirMove() {
                their_move = THEM.next();
                return their_move === WAIT ?
                    setTimeout(waitForTheirMove, 50) :
                    setTimeout(doMoves, 50);
            }, 50) :
            setTimeout(doMoves, 50);
    }
     
    function connect(open, close) {
        try {
            CONNECTION = new WebSocket("ws://localhost:8000");
        } catch (x) {
            alert("Sorry, it seems as if your browser doesn't support the WebSocket protocol, which is required.");
            return;
        }
        CONNECTION.onopen = open;
        CONNECTION.onmessage = wu.compose(wu.match(
            [ { move: String } ],
            function (data) {
                THEM_MOVE_QUEUE.push(tron.move[data.move]);
            },
            [ { meStartPos: [Number, Number],
                themStartPos: [Number, Number] } ],
            function (data) {
                ME_X = data.meStartPos[0];
                ME_Y = data.meStartPos[1];
                THEM_X = data.themStartPos[0];
                THEM_Y = data.themStartPos[1];
                beginGame();
            }
        ), function (event) {
            return JSON.parse(event.data);
        });
        CONNECTION.onclose = close;
    }

    $(document).ready(function () {
        var canvas = $("#tron"),
            info = $("#info");

        canvas.width(BOARD_WIDTH);
        canvas.height(BOARD_HEIGHT);
        CONTEXT = canvas[0].getContext("2d");

        // Set up the game to be played online.
        $("#connect").click(function (event) {
            event.preventDefault();
            info.text("Connecting to server...");
            eval("tron.register(" + $("#code").val().replace(/[;]+$/, "") + ")");
            connect(function () {
                clear();
                info.text("Finding match...");

                SEND = wu.compose(
                    wu.bind(CONNECTION, CONNECTION.send),
                    function (data) {
                        return data.toString();
                    }
                );
                THEM = wu.Iterator(function next() {
                    return THEM_MOVE_QUEUE.length > 0 ?
                        THEM_MOVE_QUEUE.shift() :
                        WAIT;
                });
            }, function () {
                info.text("Disconnected. Try reconnecting.");
            });
        });

        // Set up the game to be played locally.
        $("#test").click(function (event) {
            event.preventDefault();
            clear();
            THEM = wu.match(
                [ "random" ],
                wu.Iterator(function next() {
                    var choices = tron.them.validMoves();
                    return choices[Math.floor(Math.random() * choices.length)];
                }),
                [ "yourself" ],
                wu.curry(eval, $("#code").val().replace(/[;]+$/, ""))
            )($("#them").val());
                             
            // Since we are playing locally, SEND does nothing.
            SEND = function () {};
                             
            // Eval the textarea which should register the tron AI iterator (it
            // is the user's responsibility).
            eval("tron.register(" + $("#code").val().replace(/[;]+$/, "") + ")");
                             
            // TODO: make these random
            ME_X = 10; ME_Y = 10;
            THEM_X = 30; THEM_Y = 30;
                             
            beginGame();
        });

        clear();

        sessionStorage.wins = 0;
        sessionStorage.losses = 0;
        sessionStorage.draws = 0;

        // Keep updating the score display.
        var display = $("#display");
        setInterval(function () {
            display.find("#wins").html(sessionStorage.wins);
            display.find("#losses").html(sessionStorage.losses);
            display.find("#draws").html(sessionStorage.draws);
        }, 100);

    });

}(window, wu, jQuery));