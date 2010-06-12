var http = require("http"),
    sys = require("sys"),
    ws = require("ws/lib/ws"),
    fs = require("fs"),
    wu = require("wu").wu,
    parseURL = wu.partial(require("url").parse, wu.___, true);

function print(msg) {
    return sys.puts(msg + "\n");
}

var server = ws.createServer({
    debug: true,
    version: "auto"
});

server.addListener("listening", function () {
    print("Server is listening.");
});

server.addListener("connection", function(conn) {
    print("connected");
    server.broadcast("<"+conn._id+"> connected");

    conn.addListener("close", function(){
        print("closing");
        server.broadcast("<"+conn._id+"> disconnected");
    });

    conn.addListener("message", function(message){
        print([message.length, JSON.stringify(message)].join(" | "));
        server.broadcast("<"+conn._id+"> "+message);
    });
});

function staticServe(filename, mimetype, response) {
    fs.readFile(filename, function (err, data) {
        if (err) {
            throw err;
        }
        else {
            response.writeHeader(200, {
                "Content-Type": mimetype
            });
            response.end(data);
        }
    });
}
        
server.addListener("request", function (request, response) {
    switch (parseURL(request.url).pathname) {
        case "/client.js":
            staticServe("client.js", "text/javascript", response);
            break;
        default:
            staticServe("client.html", "text/html", response);
            break;
    }
});

server.listen(8000, "localhost");