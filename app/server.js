var express = require('express'),
    fs = require('fs'),
    PeerServer = require('peer').PeerServer;

var activeSessions = {};

function initSession(request, response){
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    var session = {
        active: true,
        users: []
    };

    session.users.push(username);
    activeSessions[sessionName] = session;
    
    response.setHeader('Content-Type', 'text/json');

    var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();
    var obj = {
        body: body, 
        options: {
            username: username, 
            sessionName: sessionName,
            securityProfile: 1,
            securityProfileName: 'sessionOwner'
        }
    };
    response.end(JSON.stringify(obj));
}

function joinSession(request, response){
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    var session = activeSessions[sessionName];
    session.users.push(username);
    
    response.setHeader('Content-Type', 'text/json');

    var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();
    var obj = {
        body: body, 
        options: {
            username: username, 
            sessionName: sessionName,
            securityProfile: 2,
            securityProfileName: 'contributor'
        },
        users: session.users
    };
    response.end(JSON.stringify(obj));
}

function leaveSession(request, response){
    var postData = request.body;
    var username = postData.user.username;
    var sessionName = postData.user.sessionName;

    var session = activeSessions[sessionName];
    var users = [];
    for (var i in session.users) {
        console.log(typeof session.users[i]);
        console.log(typeof username);
        if (session.users[i] != username) {
            users.push(session.users[i]);
        }
    }

    if (users.length){
        activeSessions[sessionName].users = users;
    } else {
        delete activeSessions[sessionName];
    }

    response.end("");
}

// -----------
// |  SERVER |
// -----------
var app = express();
app.use(express.static(__dirname + '/../public'));
app.use(express.bodyParser());

app.get('/', function(request, response){
    response.setHeader('Content-Type', 'text/html');
    var body = fs.readFileSync(__dirname + '/../public/index.html');
    response.end(body);
});

app.post('/initSession', function(request, response){
    initSession(request, response);
});

app.post('/joinSession', function(request, response){
    joinSession(request, response);
});

app.post('/leaveSession', function(request, response){
    leaveSession(request, response);
    console.log(activeSessions);
});

app.listen(8000);
console.log('Server listening on port 8000');

//  _________________
// |   PEER SERVER   |
// |-----------------|
// |WebRTC signalling|
// |_________________|

var peerServer = new PeerServer({port: 9000});
console.log('Peer server listening on port 9000');

peerServer.on('connection', function(id){
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    var clients = this._clients['peerjs'];
    for (var i in clients){
        if (i.split('_')[0] == sessionID && i != id){
            var message = {
                type: 'CONNECT_TO_PEER',
                peerID: id
            };
            clients[i].socket.send(JSON.stringify(message));
        }
    }
});

peerServer.on('disconnect', function(id){
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    var clients = this._clients['peerjs'];
    for (var i in clients){
        if (i.split('_')[0] == sessionID && i != id){
            var message = {
                type: 'DISCONNECT_PEER',
                peerID: id
            };
            clients[i].socket.send(JSON.stringify(message));
        }
    }
});