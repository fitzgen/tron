(function (wu, $) {

    /*
     * Initialization of websocket connection, setup event handlers, and grab
     * context.
     */
     
    var CONNECTION,
        CONTEXT,
        WIDTH,
        HEIGHT;

    $(document).ready(function () {
        try {
            CONNECTION = new WebSocket("ws://localhost:8000");
        } catch (x) {
            alert("Sorry, it seems as if your browser doesn't support the WebSocket protocol, which is required.");
            return;
        }

        var canvas = $("#tron")[0];

        CONTEXT = canvas.getContext("2d");
        WIDTH = canvas.width();
        HEIGHT = canvas.height();

        CONNECTION.onopen = function (event) {

        };
        CONNECTION.onmessage = function (event) {

        };
        CONNECTION.onclose = function (event) {

        };

        // TODO jquery event handlers

        // TODO wu().asyncEach for game?
    });

    /*
     * Canvas library code. http://billmill.org/static/canvastutorial/
     */

//     function circle(x,y,r) {
//       ctx.beginPath();
//       ctx.arc(x, y, r, 0, Math.PI*2, true);
//       ctx.closePath();
//       ctx.fill();
//     }

    function rect(x, y, w, h) {
        CONTEXT.beginPath();
        CONTEXT.rect(x,y,w,h);
        CONTEXT.closePath();
        CONTEXT.fill();
    }

    function clear() {
        CONTEXT.clearRect(0, 0, WIDTH, HEIGHT);
    }

    /*
     * Tron
     */

    function tron() {
    }
}(wu, jQuery));