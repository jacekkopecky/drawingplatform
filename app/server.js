// Session class
Session = function() {
    this.active = true;
    this.users = {};
    this.bannedUsers = {};
    this.bootedUsers = {};
};

// User class
User = function(options){
    if (!options){
        options = {
            username: '',
            sessionName: '',
            securityProfile: 3,
            securityProfileName: '',
            active: false,
            userAgent: '',
            ipAddress: ''
        };
    }
    this.username = options.username;
    this.sessionName = options.sessionName;
    this.securityProfile = options.securityProfile;
    this.securityProfileName = options.securityProfileName;
    this.active = options.active;
    this.userAgent = options.userAgent;
    this.ipAddress = options.ipAddress;
};

// Required node modules
var MongoClient = require('mongodb').MongoClient,
    MongoServer = require('mongodb').Server,
    express = require('express'),
    fs = require('fs'),
    PeerServer = require('peer').PeerServer;

var activeSessions = {}; // Object to contain active drawing sessions

// Create the database connection
var DB, COLLECTION;
var mongoClient = new MongoClient(new MongoServer('localhost', 27017));
mongoClient.open(function(err, mongoClient) {
    DB = mongoClient.db("drawingplatform");
    COLLECTION = DB.collection('sessions');
    console.log('MongoDB server listening on port 27017');
});

/**
 * Initialise a new session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
initSession = function(request, response) {
    // Get the post data
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;
    var obj = {};

    // Checl that the session name isn't in use
    if (typeof activeSessions[sessionName] !== "undefined") {
        obj.error = 'Cannot create session, session name in use';
        response.status(500);

        // Set the response headers and send
        response.setHeader('Content-Type', 'text/json');
        response.end(JSON.stringify(obj));
    } else {
        // Create a session
        var session = new Session();

        var user = new User({
            username: username,
            sessionName: sessionName,
            securityProfile: 1,
            securityProfileName: 'sessionOwner',
            active: true,
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip
        });

        // Add the user and store the session in activeSessions
        session.users[username] = user;
        activeSessions[sessionName] = session;

        // Look for an existing drawing platform
        COLLECTION.find({
            sessionName: sessionName
        }).toArray(function(err, result) {
            if (err) throw err;
            var platformData = [];
            if (result.length === 1) {
                platformData = result[0].platformData;
            }
            // Read the response body from the partail
            var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();

            // Create an object to send as the response containing the HTML and user options
            obj = {
                body: body,
                options: user,
                platformData: platformData
            };

            // Set the response headers and send
            response.setHeader('Content-Type', 'text/json');
            response.end(JSON.stringify(obj));
        });
    }
};

/**
 * Join an existing session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
joinSession = function(request, response) {
    // Get the post data
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;
    var userAgent = request.headers['user-agent'];
    var ipAddress = request.ip;
    var obj = {};

    // Get the session in question
    var session = activeSessions[sessionName];

    // Make sure the session exists
    if (typeof session !== 'undefined') {
        // Check for a unique username, booted or banned user
        var banned = isBanned(username, sessionName, userAgent, ipAddress);
        var booted = isBooted(username, sessionName, userAgent, ipAddress);
        var unique = isUsernameUnique(username, session);
        if (!banned && !booted &&
            unique) {
            var user = new User({
                username: username,
                sessionName: sessionName,
                securityProfile: 2,
                securityProfileName: 'contributor',
                active: true,
                userAgent: userAgent,
                ipAddress: ipAddress
            });

            // Add the user to the session
            session.users[username] = user;
            activeSessions[sessionName] = session;

            // Read the html from the partial
            var body = fs.readFileSync(__dirname + '/../public/sessionPartial.html').toString();

            // Create an object to send as the response containing the HTML and user options
            obj = {
                body: body,
                options: user,
                users: session.users
            };
        } else if (!unique) {
            obj.error = "Could not connect to session, username in use";
            response.status(500);
        } else if (booted) {
            obj.error = "You have been booted from the session, please try again later";
            response.status(500);
        } else if (banned) {
            obj.error = "You have been banned from the session, please go away";
            response.status(500);
        }

    } else {
        obj.error = 'Could not connect to session, session not found';
        response.status(500);
    }

    // Set the header(s) and send
    response.setHeader('Content-Type', 'text/json');
    response.end(JSON.stringify(obj));
};

/**
 * Remove a user from a session on the server
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
leaveSession = function(request, response) {
    // Get the postdata
    var postData = request.body;
    var username = postData.user.username;
    var sessionName = postData.user.sessionName;
    var sessionOwners = 0;

    // Get the session in question
    var session = activeSessions[sessionName];

    if (typeof session !== 'undefined') {
        // Create an empty users array
        // var users = [];

        // Iterate through the session users to remove the user that is leaving
        for (var i in session.users) {
            if (session.users[i].securityProfile == 1) sessionOwners++;
            if (session.users[i].username == username) {
                session.users[i].active = false;
                if (session.users[i].securityProfile == 1) sessionOwners--;
            }
        }

        // If there are no active session owners left delete the active session and disconnect other users
        if (!sessionOwners) {
            disconnectUsers(session.users);
            delete activeSessions[sessionName];
        }
    }

    response.end("");
};

/**
 * Disconnects a set of users
 * Is called when there are no session owners left in the session
 * @param  {array} users Array of users to disconnect
 */
disconnectUsers = function(users) {
    var clients = peerServer._clients.peerjs;

    for (var i in users) {
        for (var j in clients) {
            if (clients[j] && j.split('_')[0] == users[i].sessionName) {
                var message = {
                    type: "DISCONNECTED_FROM_SESSION"
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
 * Disconnect a single user, this is usually when the user has been booted or banned
 * @param  {User} user          The user to disconnect
 * @param  {String} messageType The type of disconnect message to send
 */
disconnectUser = function(user, messageType) {
    var clients = peerServer._clients.peerjs;
    
    switch (messageType) {
        case 'ban':
            messageType = "BANNED_FROM_SESSION";
            break;
        case 'boot':
            messageType = "BOOTED_FROM_SESSION";
            break;
        case 'disconnect':
            messageType = "DISCONNECTED_FROM_SESSION";
            break;
        default:
            messageType = "DISCONNECTED_FROM_SESSION";
            break;
    }

    // Find the relevant peerserver client and send the disconnect message
    for (var i in clients) {
        if (clients[i] && i == user.sessionName + '_' + user.username) {
            var message = {
                type: messageType
            };
            clients[i].socket.send(JSON.stringify(message));
            // Client-to-user == one-to-one so remove the disconnecting client to prevent
            // receival of multiple disconnection messages
            clients[i] = null;
        }
    }
};

/**
 * Checks to see if a username already exists in a given session
 * @param  {String}   username The username being checked
 * @param  {Session}  session  The session to check
 * @return {Boolean}
 */
isUsernameUnique = function(username, session) {
    for (var i in session.users) {
        if (session.users[i].username.toLowerCase() == username.toLowerCase() &&
            session.users[i].active) {
            return false;
        }
    }
    return true;
};

/**
 * Checks to see if a user has been booted from the session
 * @param  {String}  username    Username to check
 * @param  {String}  sessionName Session name to check against
 * @param  {String}  userAgent   User agent of user being checked
 * @param  {String}  ipAddress   IP Address of user being checked
 * @return {Boolean}
 */
isBooted = function(username, sessionName, userAgent, ipAddress) {
    var session = activeSessions[sessionName];
    var bootedUsers = session.bootedUsers;
    for (var i in bootedUsers) {
        if (bootedUsers[i].username == username &&
            bootedUsers[i].userAgent == userAgent &&
            bootedUsers[i].ipAddress == ipAddress) {
            return true;
        }
    }
    return false;
};

/**
 * Checks to see if a user has been banned from the session
 * @param  {String}  username    Username to check
 * @param  {String}  sessionName Session name to check against
 * @param  {String}  userAgent   User agent of user being checked
 * @param  {String}  ipAddress   IP Address of user being checked
 * @return {Boolean}
 */
isBanned = function(username, sessionName, userAgent, ipAddress) {
    var session = activeSessions[sessionName];
    var bannedUsers = session.bannedUsers;
    for (var i in bannedUsers) {
        if (bannedUsers[i].username == username &&
            bannedUsers[i].userAgent == userAgent &&
            bannedUsers[i].ipAddress == ipAddress) {
            return true;
        }
    }
    return false;
};

/**
 * Bans a user from the session they are currently connected to and
 * disconnects them
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
banUser = function(request, response) {
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    var session = activeSessions[sessionName];
    var userToBan;
    for (var i in session.users) {
        if (session.users[i].username == username) {
            userToBan = session.users[i];
            delete session.users[i];
            break;
        }
    }

    // Add the banned user to the list of banned users and disconnect
    session.bannedUsers[username] = userToBan;
    disconnectUser(userToBan, 'ban');

    response.setHeader('Content-Type', 'text/json');
    response.end(username + ' was banned');
};

/**
 * Boots a user from the session they are currently connected to and
 * disconnects them. Booted users can rejoin the session after a ten minute
 * cooldown.
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
bootUser = function(request, response) {
    var postData = request.body;
    var username = postData.username;
    var sessionName = postData.sessionName;

    var session = activeSessions[sessionName];
    var userToBoot;
    for (var i in session.users) {
        if (session.users[i].username == username) {
            userToBoot = session.users[i];
            delete session.users[i];
            break;
        }
    }

    // Add the booted user to the list of booted users and disconnect
    session.bootedUsers[username] = userToBoot;
    disconnectUser(userToBoot, 'boot');

    // Remove the user from the booted user list after ten minutes
    setTimeout(function() {
        unbootUser(userToBoot);
    }, 60000);

    response.setHeader('Content-Type', 'text/json');
    response.end(username + ' was booted');
};

/**
 * Revokes a ban against a given user
 * @param  {User} user The user to unban
 */
unbanUser = function(user) {
    if (!activeSessions[user.sessionName]) {
        return;
    }

    var session = activeSessions[user.sessionName];
    var bannedUsers = session.bannedUsers;
    for (var i in bannedUsers) {
        if (bannedUsers[i] == user) {
            delete bannedUsers[i];
        }
    }
};

/**
 * Revokes a boot against a given user
 * @param  {User} user The user to unboot
 */
unbootUser = function(user) {
    if (!activeSessions[user.sessionName]) {
        return;
    }

    var session = activeSessions[user.sessionName];
    var bootedUsers = session.bootedUsers;
    for (var i in bootedUsers) {
        if (bootedUsers[i] == user) {
            delete bootedUsers[i];
        }
    }
};

/**
 * Function to count the number of session owners left in a session
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
checkSessionOwners = function(request, response) {
    var postData = request.body;
    var sessionName = postData.sessionName;
    var username = postData.username;

    var session = activeSessions[sessionName];
    var ownerCount = 0;

    for (var i in session.users) {
        if (session.users[i].username !== username &&
            session.users[i].securityProfile == 1 &&
            session.users[i].active) {
            ownerCount++;
        }
    }

    // Set the header(s) and send
    response.setHeader('Content-Type', 'text/json');
    response.end(JSON.stringify({
        count: ownerCount
    }));
};

/**
 * Saves a drawing platform instance to the database
 * @param  {object} request  HTTP request object
 * @param  {object} response HTTP response object
 */
saveToDatabase = function(request, response) {
    var postData = request.body;
    var sessionName = postData.sessionName;
    var platformData = postData.platformData;

    COLLECTION.update({
            sessionName: sessionName
        }, {
            sessionName: sessionName,
            platformData: platformData
        }, {
            upsert: true
        },
        function(err, result) {
            if (err) console.log(err);
        }
    );
    response.end();
};

// Server initialisation and routing setup
var app = express();
app.use(express.static(__dirname + '/../public'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
    response.setHeader('Content-Type', 'text/html');
    var body = fs.readFileSync(__dirname + '/../public/index.html');
    response.end(body);
});

app.get('/error_log', function(request, response) {
    response.setHeader('Content-Type', 'text/plain');
    var body = fs.readFileSync(__dirname + '/logs/error.log');
    response.end(body);
});

app.get('/server_log', function(request, response) {
    response.setHeader('Content-Type', 'text/plain');
    var body = fs.readFileSync(__dirname + '/logs/out.log');
    response.end(body);
});

app.post('/initSession', function(request, response) {
    initSession(request, response);
});

app.post('/joinSession', function(request, response) {
    joinSession(request, response);
});

app.post('/leaveSession', function(request, response) {
    leaveSession(request, response);
});

app.post('/checkSessionOwners', function(request, response) {
    checkSessionOwners(request, response);
});

app.post('/saveToDb', function(request, response) {
    saveToDatabase(request, response);
});

app.post('/bootUser', function(request, response) {
    bootUser(request, response);
});

app.post('/banUser', function(request, response) {
    banUser(request, response);
});

app.listen(8000);
console.log('Server listening on port 8000');

// Peerjs server initialisation and connection management
var peerServer = new PeerServer({
    port: 9000
});
console.log('Peer server listening on port 9000');

/**
 * Event handler for new peer connections
 * @param  {String} id The id of the new peer
 */
peerServer.on('connection', function(id) {
    // Parse out the session id
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    // Get all connected peers
    var clients = this._clients.peerjs;

    // For peers in the same session send a CONNECT_TO_PEER message with the ID of the new peer
    for (var i in clients) {
        if (clients[i] && i.split('_')[0] == sessionID && i != id) {
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
peerServer.on('disconnect', function(id) {
    // Parse out the session ID
    var sessionID = id.split('_');
    sessionID = sessionID[0];

    // Get all connected peers
    var clients = this._clients.peerjs;

    // For peers in the same session send a DISCONNECT_PEER message with the ID of the disconnected peer
    for (var i in clients) {
        if (clients[i] && i.split('_')[0] == sessionID && i != id) {
            var message = {
                type: 'DISCONNECT_PEER',
                peerID: id
            };

            clients[i].socket.send(JSON.stringify(message));
        }
    }
});