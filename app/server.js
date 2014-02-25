Session = function(){
    this.active = true;
    this.users = [];
};

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
    var obj = {};

    // Checl that the session name isn't in use
    if (typeof activeSessions[sessionName] !== "undefined") {
        obj.error = 'Cannot create session, session name in use';
        response.status(500);
    } else {
        // Create a session
        var session = new Session();
        
        var user = {
                username: username, 
                sessionName: sessionName,
                securityProfile: 1,
                securityProfileName: 'sessionOwner'
            };
        
        // Add the user and store the session in activeSessions
        session.users.push(user);
        activeSessions[sessionName] = session;
        
        // Read the response body from the partail
        var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();

        // Create an object to send as the response containing the HTML and user options
        obj = {
            body: body, 
            options: user
        };
    }

    // Set the response headers and send
    response.setHeader('Content-Type', 'text/json');
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
    var obj = {};

    // Get the session in question
    var session = activeSessions[sessionName];

    // Make sure the session exists
    if (typeof session !== 'undefined') {
        // Check for a unique username
        if (isUsernameUnique(username, session)) {
            var user = {
                username: username, 
                sessionName: sessionName,
                securityProfile: 2,
                securityProfileName: 'contributor'
            };

            // Add the user to the session
            session.users.push(user);

            // Read the html from the partial
            var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();
            
            // Create an object to send as the response containing the HTML and user options
            obj = {
                body: body, 
                options: user,
                users: session.users
            };
        } else {
            obj.error = "Could not connect to session, username in use";
            response.status(500);
        }
        
    } else {
        obj.error = 'Could not connect to session, session not found';
        response.status(500);
    }
    
    // Set the header(s) and send
    response.setHeader('Content-Type', 'text/json');
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
    var sessionOwners = 0;

    // Get the session in question
    var session = activeSessions[sessionName];

    if (typeof session !== 'undefined') {
        // Create an empty users array
        var users = [];

        // Iterate through the session users to remove the user that is leaving
        for (var i in session.users) {

            if (session.users[i].username != username) {
                users.push(session.users[i]);
                if (session.users[i].securityProfile == 1) sessionOwners++;
            }
        }

        // If there are users still in the session
        if (users.length && sessionOwners){
            // Store the remaining users in the session object
            activeSessions[sessionName].users = users;
        } else {
            // If not delete the session from the active sessions object
            delete activeSessions[sessionName];

            if (!sessionOwners) {
                disconnectUsers(users);
            }
        }
    }
    
    response.end("");
}

/**
 * Disconnects a set of users
 * Is called when there are no session owners left in the session
 * @param  {array} users Array of users to disconnect
 */
disconnectUsers = function(users){
    var clients = peerServer._clients.peerjs;
    for (var i in users){
        for (var j in clients){
            if (clients[j] && j.split('_')[0] == users[i].sessionName){
                var message = {
                    type: 'DISCONNECTED_FROM_SESSION'
                };
                clients[j].socket.send(JSON.stringify(message));
                // Client-to-user == one-to-one so remove the disconnecting client to prevent
                // receival of multiple disconnection messages
                clients[j] = null;
            }
        }
    }
        
};

/**
 * Checks to see if a username already exists in a given session
 * @param  {String}   username The username being checked
 * @param  {Session}  session  The session to check
 * @return {Boolean}
 */
isUsernameUnique = function(username, session){
    for (var i in session.users) {
        if (session.users[i].username.toLowerCase() == username.toLowerCase()) {
            return false;
        }
    }
    return true;
};

checkSessionOwners = function(request, response){
    var postData = request.body;
    var sessionName = postData.sessionName;
    var username = postData.username;

    var session = activeSessions[sessionName];
    var ownerCount = 0;

    for (var i in session.users) {
        if (session.users[i].username !== username && session.users[i].securityProfile == 1) {
            ownerCount++;
        }
    }

    // Set the header(s) and send
    response.setHeader('Content-Type', 'text/json');
    response.end(JSON.stringify({count: ownerCount}));
};

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
});

app.post('/checkSessionOwners', function(request, response){
    checkSessionOwners(request, response);
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
    var clients = this._clients.peerjs;

    // For peers in the same session send a CONNECT_TO_PEER message with the ID of the new peer
    for (var i in clients){
        if (clients[i] && i.split('_')[0] == sessionID && i != id){
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
    var clients = this._clients.peerjs;

    // For peers in the same session send a DISCONNECT_PEER message with the ID of the disconnected peer
    for (var i in clients){
        if (clients[i] && i.split('_')[0] == sessionID && i != id){
            var message = {
                type: 'DISCONNECT_PEER',
                peerID: id
            };

            clients[i].socket.send(JSON.stringify(message));
        }
    }
});