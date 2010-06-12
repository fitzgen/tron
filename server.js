var http = require("http"),
    sys = require("sys"),
    ws = require("ws/lib/ws"),
    fs = require("fs"),
    wu = require("wu").wu,
    parseURL = wu.partial(require("url").parse, wu.___, true);

function print(msg) {
    return sys.puts(msg);
}

var server = ws.createServer({
    debug: true,
    version: "auto"
});

var matches = {};
var freeConnections = [];

wu.fn.pairs = function pairs() {
    var that = this;
    return wu.Iterator(function next() {
        return [that.next(), that.next()];
    });
};

// As long as there is at least 2 users to match, keep making game matches.
setInterval(function () {
    wu(freeConnections).pairs().eachply(function (p1, p2) {
        matches[p1] = p2;
        matches[p2] = p1;

        // Remove them from the pool of free connections since we are matching
        // them now.
        freeConnections.splice(freeConnections.indexOf(p1), 1);
        freeConnections.splice(freeConnections.indexOf(p2), 1);
        
        // TODO: non hardcoded
        var p1start = [ 10, 10 ], p2start = [ 30, 30 ];
        
        // Send starting positions.
        server.send(p1, JSON.stringify({
            meStartPos: p1start,
            themStartPos: p2start
        }));
        server.send(p2, JSON.stringify({
            meStartPos: p2start,
            themStartPos: p1start
        }));
    });
}, 50);

server.addListener("connection", function(conn) {

    // Add this connection to the freeConnections pool so that the setInterval
    // can match it to a game.
    freeConnections.push(conn._id);
                       
    conn.addListener("close", function(){
        // Remove the game from the matches table.
        var match = matches[conn._id];
        if (match !== undefined) {
            delete matches[match];
            delete matches[conn._id];
        }
                         
        // If the connection was still in the freeConnections pool, remove it.
        if (wu(freeConnections).has(conn._id)) {
            freeConnections.splice(freeConnections.indexOf(conn._id), 1);
        }
    });

    conn.addListener("message", function (msg) {
        print("Info: Received: " + msg);
        return wu.match(
            [ /tron\.move\.(up|down|left|right)/ ], function (str) {
                try {
                    return server.send(
                        matches[conn._id],
                        JSON.stringify({ move: str.replace(/tron\.move\./, "") })
                    );
                } catch (x) {
                    // The connection has most likely disconnected.
                    return null;
                }
            },
            [ wu.___ ], function (message) {
                print("Error: Bad message: " + message);
            }
        )(msg);
    });
});

function staticServe(filename, mimetype, response) {
    fs.readFile(filename, function (err, data) {
        if (err) {
            throw err;
        }
        else {
            response.writeHead(200, {
                "Content-Type": mimetype
            });
            response.end(data);
        }
    });
}
        
server.addListener("request", function (request, response) {
    wu.match(
        [ "/client.js" ],
        wu.curry(staticServe, "client.js", "text/javascript", response),
        [ "/wu.js" ],
        wu.curry(staticServe, "wu.js", "text/javascript", response),
        [ wu.___ ],
        wu.curry(staticServe, "client.html", "text/html", response)
    )(parseURL(request.url).pathname);
});

var PORT = process.argv[2] || 8000;
server.listen(PORT, "localhost");
print("Server is listening on port " + PORT);