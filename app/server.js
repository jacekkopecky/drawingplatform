Session = function(){
    this.active = true;
    this.users = [];
}

var express = require('express'),
    fs = require('fs'),
    PeerServer = require('peer').PeerServer;

var activeSessions = {}; // Object to contain active drawing sessions

/**
 * Initialise a new session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
function initSession(request, response){
    // Get the post data
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    // Create a session
    var session = new Session();

    // Add the user and store the session in activeSessions
    session.users.push(username);
    activeSessions[sessionName] = session;
    
    // Set the response header(s)
    response.setHeader('Content-Type', 'text/json');

    // Read the response body from the partail
    var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();

    // Create an object to send as the response containing the HTML and user options
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

/**
 * Join an existing session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
function joinSession(request, response){
    // Get the post data
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    // Get the session in question
    var session = activeSessions[sessionName];

    // Add the user to the session
    session.users.push(username);
    
    // Set the header(s)
    response.setHeader('Content-Type', 'text/json');

    // Read the html from the partial
    var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();
    
    // Create an object to send as the response containing the HTML and user options
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

/**
 * Remove a user from a session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
function leaveSession(request, response){
    // Get the postdata
    var postData = request.body;
    var username = postData.user.username;
    var sessionName = postData.user.sessionName;

    // Get the session in question
    var session = activeSessions[sessionName];

    // Create an empty users array
    var users = [];

    // Iterate through the session users to remove the user that is leaving
    for (var i in session.users) {
        if (session.users[i] != username) {
            users.push(session.users[i]);
        }
    }

    // If there are users still in the session
    if (users.length){
        // Store the remaining users in the session object
        activeSessions[sessionName].users = users;
    } else {
        // If not delete the session from the active sessions object
        delete activeSessions[sessionName];
    }

    response.end("");
}

// Server initialisation and routing setup
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

// Peerjs server initialisation and connection management
var peerServer = new PeerServer({port: 9000});
console.log('Peer server listening on port 9000');

/**
 * Event handler for new peer connections
 * @param  {String} id The id of the new peer
 */
peerServer.on('connection', function(id){
    // Parse out the session id
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    // Get all connected peers
    var clients = this._clients['peerjs'];

    // For peers in the same session send a CONNECT_TO_PEER message with the ID of the new peer
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

/**
 * Event handler for peer disconnections
 * @param  {String} id The id of the disconnected peer
 */
peerServer.on('disconnect', function(id){
    // Parse out the session ID
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    // Get all connected peers
    var clients = this._clients['peerjs'];

    // For peers in the same session send a DISCONNECT_PEER message with the ID of the disconnected peer
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