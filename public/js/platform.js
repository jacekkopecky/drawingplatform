/**
 * User class
 *
 * @param {object} options Options used to create a user
 */
function User(options) {
	// Basic user details
	this.options = options;
	this.username = options.username;
	this.sessionName = options.sessionName;
	this.securityProfile = options.securityProfile;
	this.securityProfileName = options.securityProfileName;

	// Create the peer object and assign it's event handler(s)
	var peerName = options.sessionName + "_" + options.username;
	this.peer = new Peer(peerName, {
		host: '/',
		port: 9000
	});

	this.peer.on('connection', function(conn) {
		conn.on('data', function(data) {
			if (!data) {
				return;
			}
			console.log(data);
			var layer;
			if (typeof data.data !== 'undefined') {
				layer = platform.layers.getLayer(data.data.layerName, data.data.global);
			}

			switch (data.message) {
				case 'GET_PLATFORM_DATA':
					user.setIntervalTimer = setInterval(function() {
						platform.session.sendEverything(data.sendTo);
					}, 100);
					break;
				case 'GOT_PLATFORM_DATA':
					if (user.setIntervalTimer) clearInterval(user.setIntervalTimer);
					if (!platform.gotPlatformData) {
						platform.gotPlatformData = data.data;
					}
					platform.init();
					break;
				case 'RECEIVED_LAYER':
					platform.layers.updateReceivedLayer(data.data);
					break;
				case 'DELETE_LAYER':
					platform.layers.deleteLayer(layer, true, true);
					$('#' + data.data.layerName).remove();
					break;
				case 'LOCK_LAYER':
					platform.layers.lockLayer(layer, true);
					$('#' + data.data.layerName + ' .lockLayer').toggleClass('active');
					break;
				case 'UPDATE_HISTORIES':
					platform.history.updateHistoriesAfterSessionAction(data.data);
					break;
				case 'UNDO_LAST_ACTION':
					platform.history.updateHistoriesAfterSessionAction(data.data);
					platform.history.undoLastAction(data.global, true, true);
					break;
				case 'REDO_LAST_ACTION':
					platform.history.updateHistoriesAfterSessionAction(data.data);
					platform.history.redoLastAction(data.global, true, true);
					break;
				case 'REMOVE_CONNECTION':
					user.removeConnection(data.data.username);
					$('#' + user.sessionName + '_' + data.data.username + 'Row').remove();
					break;
				case 'CHANGE_USER_SECURITY_PROFILE':
					user.changeSecurityProfile(data.data);
					break;
				default:
					console.log(data);
					break;
			}
		});
	});

	this.connections = {};
	/**
	 * Function to connect to another peer
	 *
	 * @param  {String} peerID The id of the peer to connect to
	 */
	this.connectToPeer = function(peerID, securityProfile) {
		this.connections[peerID] = this.peer.connect(peerID);
		platform.util.addUserToUserList(peerID, securityProfile);
	};

	/**
	 * Function to disconnect from a peer
	 * @param  {String} peerID The id of the peer to disconnect
	 */
	this.disconnectPeer = function(peerID) {
		for (var i in this.connections) {
			if (this.connections[i].peer === peerID) {
				this.connections[i].close();
				delete this.connections[i];
			}
		}

		$('#' + peerID + 'Row').remove();
	};

	/**
	 * Function which is called when the user is disconnected from the
	 * session by the server
	 * @param  {String} disconnectType The type of disconnect that occurred
	 */
	this.disconnectedFromSession = function(disconnectType) {
		// Select and alert the correct disconnect message
		var message = 'Session closed by server';
		if (disconnectType === 'ban') {
			message = 'You have been banned from the session, please go away!';
		} else if (disconnectType === 'boot') {
			message = 'You have been booted from the session, please calm down and try again later';
		}
		alert(message);

		// Destroy all peer connections
		this.peer.destroy();
		for (var i in this.connections) {
			this.connections[i].close();
		}
		this.connections = {};

		// Disable the drawing platform
		platform.uninit();

		// If banned or booted redirect to the login screen
		if (disconnectType) {
			window.location = '/';
		}
	};

	/**
	 * Function to remove a peer connection
	 * @param  {String} username Username of peer
	 */
	this.removeConnection = function(username) {
		this.connections[this.sessionName + '_' + username].close();
		delete this.connections[this.sessionName + '_' + username];
	};

	this.changeSecurityProfile = function(data) {
		if (data.username === this.username) {
			this.securityProfile = data.securityProfile;
			switch (data.securityProfile) {
				case "1":
					this.securityProfileName = "sessionOwner";
					$('#globalUndoButton, #globalRedoButton').prop('disabled', false);
					break;
				case "2":
					this.securityProfileName = "contributor";
					$('#globalUndoButton, #globalRedoButton').prop('disabled', true);
					break;
				case "3":
					this.securityProfileName = "watcher";
					$('#globalUndoButton, #globalRedoButton').prop('disabled', true);
					break;
			}
		}

		$('#' + this.sessionName + '_' + data.username + 'Row').find('option[value=' + data.securityProfile + ']').prop('selected', true);
	};
}

var user;

/**
 * Platform object
 * The platform contains all functions related to the drawing platform including:
 * - drawing
 * - layers
 * - history
 * - session setup and teardown
 *
 * @type {Object}
 */
var platform = {
	gotPlatformData: false,
	activeLayer: {}, // Contains the layer currently selected for editing
	stage: {}, // Contains the Kinetic.Stage object

	mouseDown: false, // Flag to check if the mouse is down
	temp: false,
	/**
	 * The brush object
	 * Stores all parameters and functions associated with the brush tool
	 *
	 * @type {Object}
	 */
	brush: {
		isErasing: false, // Flag for being in 'eraser' mode
		prevBrushColor: '000000', // The previous brush color, used when toggling between eraser and brush
		brushColorHex: '000000', // The hex value of the brush
		brushSize: 3, // The brush size in pixels
		brushType: 'round', // Type of brush being used

		/**
		 * Function to change the brush size
		 * @param  {int} brushSize Brush size in pixels
		 */
		changeBrushSize: function(brushSize) {
			this.brushSize = brushSize;
		},

		/**
		 * Function that changes the hex color value of the brush
		 * @param  {String}  brushColorHex The hex value to change to
		 * @param  {boolean} updateRGB     Whether the RGB color fields should be updated
		 * @param  {boolean} updateHSV     Whether the HSV color fields should be updated
		 * @return {boolean}               Whether the change was successful
		 */
		changeBrushColorHex: function(brushColorHex, updateRGB, updateHSV) {
			// If we are 'erasing' set the brush to white and don't update the color values
			if (brushColorHex === 'eraser') {
				platform.brush.brushColorHex = 'ffffff';
				return true;
			}

			// If color is an object then we need to get the value
			if (typeof brushColorHex === 'object') {
				if (brushColorHex.currentTarget.id === "colorPicker") {
					brushColorHex = brushColorHex.currentTarget.value.replace('#', '');
					$('#brushColorHex').val(brushColorHex);
				} else {
					brushColorHex = brushColorHex.currentTarget.value;
					$('#colorPicker').val('#' + brushColorHex);
					if (window.jQuery.spectrum) $('#colorPicker').spectrum({
						color: '#' + brushColorHex
					});
				}

				updateRGB = true;
				updateHSV = true;
			}

			if (brushColorHex.length < 6) {
				return false;
			}

			// Test if the hex is valid and change the brush color
			if (/^([0-9a-f]{6})$/i.test(brushColorHex)) {
				platform.brush.brushColorHex = brushColorHex;
				if (updateRGB) platform.brush.hexToRGB(brushColorHex, updateHSV);
				$('#brushColorLabel').css('color', '#' + brushColorHex);
				return true;
			} else {
				alert('Please enter a valid hex color value, not: ' + brushColorHex);
				return false;
			}
		},

		/**
		 * Converts a hex color value to RGB
		 * @param  {String}  hex       The hex value to convert
		 * @param  {boolean} updateHSV Whether the HSV values should be updated as well
		 */
		hexToRGB: function(hex, updateHSV) {
			// Separate the hex string and convert to integers
			var r = parseInt(hex.slice(0, 2), 16);
			var g = parseInt(hex.slice(2, 4), 16);
			var b = parseInt(hex.slice(4, 6), 16);

			$('#brushColorRed').val(r);
			$('#brushColorGreen').val(g);
			$('#brushColorBlue').val(b);

			if (updateHSV) platform.brush.RGBToHSV(r, g, b);
		},

		/**
		 * Convert an RGB value to hex
		 * @param {boolean} updateHSV Whether the HSV values should be updated as well
		 */
		RGBToHex: function(updateHSV) {
			// Get the RGB values
			var r = parseInt($('#brushColorRed').val(), 10);
			var g = parseInt($('#brushColorGreen').val(), 10);
			var b = parseInt($('#brushColorBlue').val(), 10);

			// Do nothing if NaNs are present
			if (isNaN(r) || isNaN(g) || isNaN(b)) {
				return false;
			}

			// Set any numbers greater than 255 to 255
			if (r > 255) {
				r = 255;
				$('#brushColorRed').val(r);
			}

			if (g > 255) {
				g = 255;
				$('#brushColorGreen').val(g);
			}

			if (b > 255) {
				b = 255;
				$('#brushColorBlue').val(b);
			}

			// Update the HSV values if needed
			if (updateHSV) platform.brush.RGBToHSV(r, g, b);

			// Convert from dec to hex
			r = r.toString(16);
			g = g.toString(16);
			b = b.toString(16);

			// Pad any hex numbers that are less than 10
			if (r.length === 1) {
				r = '0' + r;
			}

			if (g.length === 1) {
				g = '0' + g;
			}

			if (b.length === 1) {
				b = '0' + b;
			}

			// Create the hex string and change the brush color
			var hex = r + g + b;

			if (platform.brush.changeBrushColorHex(hex)) $('#brushColorHex').val(hex);
		},

		/**
		 * Convert from RGB to HSV
		 * Conversion function ported from Python colorsys
		 * @param {int} r The red value
		 * @param {int} g The green value
		 * @param {int} b The blue value
		 */
		RGBToHSV: function(r, g, b) {
			var hue, sat, val, max, min;

			// Check that RGB values are all numbers
			if (isNaN(r) || isNaN(g) || isNaN(b)) {
				return false;
			}

			// Set any numbers greater than 255 to 255
			if (r > 255) {
				r = 255;
				$('#brushColorRed').val(r);
			}

			if (g > 255) {
				g = 255;
				$('#brushColorGreen').val(g);
			}

			if (b > 255) {
				b = 255;
				$('#brushColorBlue').val(b);
			}

			// Convert RGB to percentages
			r = r / 255;
			g = g / 255;
			b = b / 255;

			// Conversion from RGB to HSV ported from Python colorsys
			// http://hg.python.org/cpython/file/2.7/Lib/colorsys.py
			max = Math.max(r, g, b);
			min = Math.min(r, g, b);

			hue = max;
			sat = max;
			val = max;

			if (max == min) {
				hue = 0;
				sat = 0;
				val = max;
			} else {
				sat = (max - min) / max;
				var rc = (max - r) / (max - min);
				var gc = (max - g) / (max - min);
				var bc = (max - b) / (max - min);
				if (r == max) {
					hue = bc - gc;
				} else if (g == max) {
					hue = 2.0 + rc - bc;
				} else {
					hue = 4.0 + gc - rc;
				}
				hue = (hue / 6.0) % 1.0;
			}
			hue = hue * 360;
			if (hue < 0) {
				hue += 360;
			}
			sat = sat * 100;
			val = val * 100;

			$('#brushColorHue').val(Math.round(hue));
			$('#brushColorSat').val(Math.round(sat));
			$('#brushColorVal').val(Math.round(val));
		},
		/**
		 * Convert from HSV to RGB values
		 * Conversion function ported from Python colorsys
		 */
		HSVToRGB: function() {
			var r, g, b;
			var hue = $('#brushColorHue').val();
			var sat = $('#brushColorSat').val();
			var val = $('#brushColorVal').val();

			// Check that HSV are all numbers
			if (isNaN(hue) || isNaN(sat) || isNaN(val)) {
				return false;
			}

			// Set any numbers greater than upper limit to upper limit
			if (hue < 0 || hue >= 360) {
				hue = 0;
				$('#brushColorHue').val(hue);
			}

			if (sat > 100) {
				sat = 100;
				$('#brushColorSat').val(sat);
			}

			if (val > 100) {
				val = 100;
				$('#brushColorVal').val(val);
			}

			// Convert integers to a percentage
			hue /= 360;
			sat /= 100;
			val /= 100;

			// Conversion from RGB to HSV ported from Python colorsys
			// http://hg.python.org/cpython/file/3.3/Lib/colorsys.py
			var i = Math.floor(hue * 6);
			var f = (hue * 6) - i;
			var p = val * (1 - sat);
			var q = val * (1 - f * sat);
			var t = val * (1 - sat * (1 - f));

			switch (i % 6) {
				case 0:
					r = val;
					g = t;
					b = p;
					break;
				case 1:
					r = q;
					g = val;
					b = p;
					break;
				case 2:
					r = p;
					g = val;
					b = t;
					break;
				case 3:
					r = p;
					g = q;
					b = val;
					break;
				case 4:
					r = t;
					g = p;
					b = val;
					break;
				case 5:
					r = val;
					g = p;
					b = q;
					break;
			}

			r = r * 255;
			g = g * 255;
			b = b * 255;

			r = Math.round(r);
			g = Math.round(g);
			b = Math.round(b);

			$('#brushColorRed').val(r);
			$('#brushColorGreen').val(g);
			$('#brushColorBlue').val(b);
			platform.brush.RGBToHex(false);

		},
		/**
		 * Function to enable the brush tool
		 */
		brush: function() {
			$("#brushToolButton").addClass('btn-success').removeClass('btn-primary');
			$("#eraserToolButton").addClass('btn-primary').removeClass('btn-success');
			platform.brush.brushColorHex = platform.brush.prevBrushColor;
			platform.brush.isErasing = false;
		},
		/**
		 * Function to enable the eraser tool
		 */
		eraser: function() {
			$("#eraserToolButton").addClass('btn-success').removeClass('btn-primary');
			$("#brushToolButton").addClass('btn-primary').removeClass('btn-success');
			if (!platform.brush.isErasing) {
				platform.brush.prevBrushColor = platform.brush.brushColorHex;
			}
			platform.brush.isErasing = true;
			platform.brush.changeBrushColorHex('eraser', false, false);
		}
	},

	/**
	 * The draw line object
	 * Stores all functionality used to draw lines on the stage
	 * @type {Object}
	 */
	drawLine: {
		newLine: {}, // Contains the Kinetic.Line that is being drawn
		points: [], // Stores the points that will make up the line

		/**
		 * Mousedown event callback for line drawing
		 * @param  {Event} event The mouse down event
		 */
		onMouseDown: function(event) {
			// We have entered the stage but aren't flagged as having the mouse down
			// so do nothing
			if (event.type === "mouseenter" && platform.mouseDown === false) {
				return false;
			}

			// Flag the mouse as being within the platform
			if (event.type === "mouseenter") {
				platform.outOfBounds = false;
			}

			try {
				//Check if the layer is locked
				platform.util.isLayerLocked(platform.activeLayer);

				// Check the user can make changes to the canvas
				platform.util.isContributor(user);

				// If the layer is local check the user owns it
				if (platform.activeLayer.getAttr('local')) {
					platform.util.isLayerOwner(platform.activeLayer, user);
				}

				// Set the mouse position
				var mousePosition = platform.stage.getPointerPosition();

				// Mouseenter doesn't work with getPointerPosition so we have to work it out
				if (mousePosition === undefined) {
					mousePosition = platform.util.getPointerPosition(event);
				}

				// Flag the mouse as being down
				platform.mouseDown = true;

				// Reset the points array and add the start position
				platform.drawLine.points = [];
				platform.drawLine.points.push(mousePosition);

				// Initialise the new line
				platform.drawLine.newLine = new Kinetic.Line({
					points: platform.drawLine.points,
					stroke: '#' + platform.brush.brushColorHex,
					strokeWidth: platform.brush.brushSize,
					lineCap: platform.brush.brushType,
					lineJoin: platform.brush.brushType
				});

				// Add the new line to the active layer
				platform.activeLayer.add(platform.drawLine.newLine);
			} catch (error) {
				alert(error.message);
			}
		},

		/**
		 * Mouseup event callback for line drawing
		 * @param  {Event} event The mouseup event
		 */
		onMouseUp: function(event) {
			// If the mouse leaves the stage and isn't currently doing anything
			// ignore it
			if (event.type === "mouseleave" && platform.mouseDown === false) {
				return false;
			}

			// Make sure mouseleave events aren't added to the history
			var addToHistory = false;

			// Flag the mouse button as unpressed if a mouseup event
			if (event.type === "mouseup") {
				platform.mouseDown = false;
				addToHistory = true;
			} else {
				platform.outOfBounds = true;
			}

			// If there is only one point the mouse did not move draw the correct shape 
			// at the start position
			if (platform.drawLine.points.length === 1) {
				switch (platform.brush.brushType) {
					case 'round':
						var circle = new Kinetic.Circle({
							x: platform.drawLine.points[0].x,
							y: platform.drawLine.points[0].y,
							fill: platform.brush.brushColorHex,
							radius: platform.brush.brushSize / 2
						});
						platform.activeLayer.add(circle);
						break;
					default:
						break;
				}
			} else {
				// Add the points to the line being drawn
				platform.drawLine.newLine.setPoints(platform.drawLine.points);
			}

			// Redraw the active layer
			platform.activeLayer.drawScene();
			platform.layers.updateLayerPreview(platform.activeLayer);
			// add updated layer to history
			if (addToHistory) {
				platform.history.addToHistory();
			}
			platform.session.sendLayerToAll(platform.activeLayer);
		},

		/**
		 * Mousemove event callback for line drawing
		 * @param  {Event} event The mousemove event
		 */
		onMouseMove: function(event) {
			// If the mouse button is down add points to the points array
			// and redraw the active layer
			if (platform.mouseDown) {
				platform.drawLine.points.push(platform.stage.getPointerPosition());
				platform.activeLayer.drawScene();
			}
		}
	},

	/**
	 * The layers object
	 * Contains both the layers themselves and all functions associated with layers
	 * @type {Object}
	 */
	layers: {
		// Code snippet used for creating layer preview panels
		layerPreviewSnippet: '<div class="layerPanel" id="[LAYER_NAME]"><div class="layerPreview" id="[LAYER_NAME]Preview"></div><label>[LAYER_NAME]</label><div class="layerButtons"><button type="button" class="btn btn-default btn-xs toggleVisible"><span class="glyphicon glyphicon-eye-open"></span></button><button type="button" class="btn btn-default btn-xs toggleGlobalLayer"><span class="glyphicon glyphicon-globe"></span></button><button type="button" class="btn btn-default btn-xs lockLayer"><span class="glyphicon glyphicon-lock"></span></button><button type="button" class="btn btn-default btn-xs deleteLayer"><span class="glyphicon glyphicon-trash"></span></button></div><div style="clear:both"></div></div>',

		/**
		 * Function that creates the global background layer
		 */
		createBackgroundLayer: function() {
			var background = new Kinetic.Layer().setAttr('global', true);
			var height = platform.stage.getHeight();
			var width = platform.stage.getWidth();
			var rectangle = new Kinetic.Rect({
				height: height,
				width: width,
				fill: 'white',
			});
			background.add(rectangle);
			this.globalLayers.globalLayer1 = background;
		},

		/**
		 * Function that creates a new layer and adds it to the canvas
		 * @param {Kinetic.Layer} layer            The layer being created or added
		 * @param {boolean}       global           Whether the layer is global
		 * @param {boolean}       securityOverride Whether security checks should be ignored
		 * @param {boolean}       historyOverride  Whether the action should be added to the histories
		 */
		addLayer: function(layer, global, securityOverride, historyOverride) {
			try {
				// Check if user can add layeres
				if (!securityOverride) {
					platform.util.isContributor(user);
				}

				// Work out the layer's key
				var key = Object.keys(platform.layers.globalLayers).length + Object.keys(platform.layers.localLayers).length;

				var layerName = '';
				// Check if the passed layer variable is a Kinetic.Layer
				if (layer.nodeType !== 'Layer') {
					layer = new Kinetic.Layer();

					// Work out layer name is and add to the correct layers object
					if (global === true) {
						layerName = 'globalLayer';
						if (!securityOverride) {
							platform.util.isSessionOwner(user);
						}
						layer.setAttr('global', true);

						while (typeof platform.layers.globalLayers["globalLayer" + key] === "object") {
							key++;
						}
						layerName += key;
						platform.layers.globalLayers[layerName] = layer;
					} else {
						layerName = 'localLayer';
						layer.setAttr('local', true);
						layer.setAttr('owner', user.username);

						while (typeof platform.layers.localLayers["localLayer" + key] === "object") {
							key++;
						}
						layerName += key;
						platform.layers.localLayers[layerName] = layer;
					}
				} else {
					// Work out the layer name
					if (layer.getAttr('global')) {
						layerName += 'globalLayer';
					} else {
						layerName += 'localLayer';
					}
					layerName += key;
				}

				// Add the layer to the stage and redraw
				platform.stage.add(layer);
				layer.drawScene();

				// Store the zindex and key number so that we can keep things organised when undo / redo-ing
				layer.setAttr('Z-Index', layer.getZIndex());
				layer.setAttr('layerObjectKey', key);
				layer.setAttr('layerName', layerName);

				// Make the new layer the active layer
				platform.activeLayer = layer;

				// Create a preview of the new layer
				platform.layers.addLayerPreview(layer, layerName);

				// Add to history
				if (!historyOverride) platform.history.addToHistory();

				platform.session.sendLayerToAll(layer);
			} catch (error) {
				alert(error.message);
			}

		},

		/**
		 * Function to toggle whether a layer is locked.
		 * Locked layers cannot be altered.
		 * @param  {Kinetic.Layer} layer The layer to be toggled
		 * @return {boolean}       Was the toggle successful?
		 */
		lockLayer: function(layer, securityOverride) {
			try {
				if (!securityOverride) {
					if (layer.getAttr('global')) {
						// Check user can lock global layers
						platform.util.isSessionOwner(user);
					} else {
						// Check the user is able to lock local layers
						platform.util.isContributor(user);

						// Check that the user owns the layer they are trying to lock
						platform.util.isLayerOwner(layer, user);
					}
				}

				if (layer.getAttr('locked')) {
					layer.setAttr('locked', false);
				} else {
					layer.setAttr('locked', true);
				}
				return true;

			} catch (error) {
				alert(error.message);
				return false;
			}
		},

		/**
		 * Function to toggle whether a layer is global.
		 * Global layers can be edited by any user.
		 * @param  {Kinetic.Layer} layer The layer to be toggled
		 * @return {boolean}       Was the toggle successful?
		 */
		toggleGlobalLayer: function(layer) {
			try {
				// Check user can modify global layers
				platform.util.isSessionOwner(user);

				if (layer.getAttr('global')) {
					layer.setAttr('global', false);
				} else {
					layer.setAttr('global', true);
				}
				return true;

			} catch (error) {
				alert(error.message);
				return false;
			}
		},

		/**
		 * Function to delete a given layer.
		 * @param  {Kinetic.Layer} layer The layer to be delete
		 * @return {boolean}       Was the delete successful?
		 */
		deleteLayer: function(layer, securityOverride, ignoreSend) {

			try {
				var layerName = layer.getAttr('layerName');
				var global = layer.getAttr('global');

				if (!securityOverride) platform.util.isLayerLocked(layer);

				// Make sure we always have a layer on the stage
				if ((Object.keys(this.globalLayers).length === 1 && !Object.keys(this.localLayers).length) ||
					(Object.keys(this.localLayers).length === 1 && !Object.keys(this.globalLayers).length)) {
					throw new Error('Can\'t delete as there would be no layers left!');
				}

				if (global) {
					// Check user can delete global layers
					if (!securityOverride) platform.util.isSessionOwner(user);

					this.globalLayers[layerName].destroy();
					delete this.globalLayers[layerName];

				} else {
					// Check the user is able to delete local layers
					if (!securityOverride) platform.util.isContributor(user);

					// Check that the user owns the layer they are trying to delete
					if (!securityOverride) platform.util.isLayerOwner(layer, user);

					// Delete the layer from the local layers and the canvas
					this.localLayers[layerName].destroy();
					delete this.localLayers[layerName];
				}

				if (!ignoreSend) platform.session.sendLayerToDelete(layerName, global);
				platform.history.addToHistory();
				return true;

			} catch (error) {
				alert(error.message);
				return false;
			}
		},

		/**
		 * Function to rebuild the layer model
		 * This is used after an undo or redo action and is mainly used to restore correct references
		 */
		rebuildLayerModel: function(activeLayerName) {
			// Empty the layer model
			this.globalLayers = {};
			this.localLayers = {};

			// Get the current layers
			var currentLayers = platform.stage.getChildren();

			// Restore the layers to their correct positions in the layer model
			for (var i in currentLayers) {
				// Ignore anything that is not an object
				if (typeof currentLayers[i] !== 'object') continue;

				currentLayers[i].setZIndex(currentLayers[i].getAttr('Z-Index'));

				var layerName = currentLayers[i].getAttr('layerName');
				if (layerName === activeLayerName) platform.activeLayer = currentLayers[i];

				if (currentLayers[i].getAttr('global')) {
					this.globalLayers[layerName] = currentLayers[i];
				} else {
					this.localLayers[layerName] = currentLayers[i];
				}

			}

			// Rejig the layer preview panels to work with updated stage
			this.rebuildLayerPreviews(currentLayers);

			$('#' + activeLayerName).click();
		},

		/**
		 * Function that adds a new layer preview panel to the right hand nav
		 * @param {Kinetic.Layer} layer     The layer being previewed
		 * @param {String}        layerName The name of the layer
		 */
		addLayerPreview: function(layer, layerName) {
			// Update the preview panel snippet and add it to the DOM
			var layerPreview = platform.layers.layerPreviewSnippet.replace(/\[LAYER_NAME\]/g, layerName);
			$('.layerSection').prepend(layerPreview);

			if (layerName === 'globalLayer1') {
				$('#globalLayer1 label').text('background');
			}

			// Create the preview panel's stage and add event listeners to the buttons
			platform.layers.createLayerPreviewStage(layer, layerName);
			platform.util.addLayerButtonEvents(layerName);
		},

		/**
		 * Function to update the preview of a given layer.
		 * Called after any edit to a layer e.g. drawing / erasing
		 * @param  {Kinetic.Layer} layer The layer being previewed
		 */
		updateLayerPreview: function(layer) {
			// Get the preview stage and clone the layer
			var layerPreviewStage = layer.getAttr('preview');
			var clone = layer.clone({
				preview: null
			});

			// Shrink the preview layer to fit in the provided space
			clone.setScale(0.09);

			// Remove the existing preview, add the new one and redraw
			layerPreviewStage.destroyChildren();
			layerPreviewStage.add(clone);
			clone.drawScene();
		},

		/**
		 * Function to create the stage needed to display a layer preview
		 * @param  {Kinetic.Layer} layer     The layer being previewed
		 * @param  {String}        layerName The name of the layer
		 */
		createLayerPreviewStage: function(layer, layerName) {
			// Create the stage
			var layerPreviewStage = new Kinetic.Stage({
				container: layerName + 'Preview',
				width: 75,
				height: 50
			});

			// Clone the layer
			var clone = layer.clone({
				preview: null
			});

			// Shrink the clone to fit in the space provided and add to preview stage
			clone.setScale(0.09);
			layerPreviewStage.add(clone);
			clone.drawScene();

			// Reference the preview stage in the original layer
			layer.setAttr('preview', layerPreviewStage);

			// Toggle the panel's global toggle button if required
			if (layer.getAttr('global')) {
				$('#' + layerName + ' .toggleGlobalLayer').addClass('active');
			}
		},

		/**
		 * Function to rebuild the layer preview panels after an undo / redo action
		 * @param  {[Kinetic.Layer]} layers Array of layers to preview
		 */
		rebuildLayerPreviews: function(layers) {
			// Initialise arrays of panel and layer names
			var panelNames = [],
				layerNames = [];

			// Get all the panel names
			$('.layerPanel').each(function() {
				panelNames.push(this.id);
			});

			for (var i in layers) {
				// Ignore anything that isn't a layer
				if (typeof layers[i] !== 'object') continue;

				// Work out the layer name
				var layerName = '';
				if (layers[i].getAttr('global')) {
					layerName += 'globalLayer' + layers[i].getAttr('layerObjectKey');
				} else {
					layerName += 'localLayer' + layers[i].getAttr('layerObjectKey');
				}

				// Store the layer name
				layerNames.push(layerName);

				// Remove the existing preview stage
				layerPreview = $('#' + layerName);
				layerPreview.find('.layerPreview').children().remove();

				// Add a new preview stage
				if (panelNames.indexOf(layerName) === -1) {
					platform.layers.addLayerPreview(layers[i], layerName);
				} else {
					platform.layers.createLayerPreviewStage(layers[i], layerName);
				}
			}

			// Remove any panels that are no longer required
			for (var j in panelNames) {
				if (layerNames.indexOf(panelNames[j]) === -1) {
					$('#' + panelNames[j]).remove();
				}
			}
		},

		/**
		 * Function to get a later
		 * @param  {String}  layerName The name of the layer being retrieved
		 * @param  {boolean} global    Is the layer global?
		 * @return {Kinetic.Layer}
		 */
		getLayer: function(layerName, global) {
			if (global) {
				return platform.layers.globalLayers[layerName];
			} else {
				return platform.layers.localLayers[layerName];
			}
		},

		updateReceivedLayer: function(json) {
			var layer = Kinetic.Node.create(json);
			var layerName = layer.getAttr('layerName');
			var activeLayerName = platform.activeLayer.getAttr('layerName');

			if (layer.getAttr('global')) {
				if (platform.layers.globalLayers[layerName]) {
					platform.layers.globalLayers[layerName].destroy();
				}
				platform.layers.globalLayers[layerName] = layer;
			} else {
				if (platform.layers.localLayers[layerName]) {
					platform.layers.localLayers[layerName].destroy();
				}
				platform.layers.localLayers[layerName] = layer;
			}

			platform.stage.add(layer);
			platform.layers.rebuildLayerModel(activeLayerName);
		},
		globalLayers: {},
		localLayers: {}
	},

	/**
	 * The history object
	 * Contains all functionality associated with undo / redo
	 * @type {Object}
	 */
	history: {
		userHistory: [], // Actions the user has performed
		globalHistory: [], // Actions that all users have performed
		userRedo: [], // Actions the user can redo
		globalRedo: [], // Global actions that can be re-done

		/**
		 * Function to add an action to the histories.
		 * Should be called whenever the canvas is modified
		 */
		addToHistory: function(noSend) {
			var localLayers = {},
				globalLayers = {},
				userHistory = platform.history.userHistory,
				userRedo = platform.history.userRedo,
				globalHistory = platform.history.globalHistory,
				globalRedo = platform.history.globalRedo;

			// JSONify the local layers
			for (var i in platform.layers.localLayers) {
				if (typeof platform.layers.localLayers[i] === 'object') {
					localLayers[i] = platform.layers.localLayers[i].toJSON();
				}
			}

			// JSONify the global layers
			for (var j in platform.layers.globalLayers) {
				if (typeof platform.layers.globalLayers[j] === 'object') {
					globalLayers[j] = platform.layers.globalLayers[j].toJSON();
				}
			}

			// Create an action object consisting of the current instances of local
			// and global layers
			var action = {
				localLayers: localLayers,
				globalLayers: globalLayers
			};

			// If more than 20 actions are already stored, remove the oldest
			if (userHistory.length > 20) userHistory.shift();
			if (globalHistory.length > 20) globalHistory.shift();

			// Add the action to the histories
			userHistory.push(action);
			globalHistory.push(action);

			// Empty the redo arrays as they have become obsolete
			userRedo.splice(0);
			globalRedo.splice(0);

			if (!noSend) platform.session.sendGlobalHistoryAction();
		},

		/**
		 * Function to undo the last action. By default undoes the user's last
		 * action. If undoing a global action, the last change made to the canvas
		 * will be undone.
		 *
		 * @param {boolean} global Undo a global action?
		 * @return {boolean}
		 */
		undoLastAction: function(global, securityOverride, noSend) {
			var history = platform.history.userHistory,
				redo = platform.history.userRedo,
				otherHistory = platform.history.globalHistory,
				otherRedo = platform.history.globalRedo,
				stage = platform.stage;

			try {
				if (!securityOverride) platform.util.isContributor(user);

				if (global === true) {
					platform.util.isSessionOwner(user);
					history = platform.history.globalHistory;
					redo = platform.history.globalRedo;
					otherHistory = platform.history.userHistory;
					otherRedo = platform.history.userRedo;
				} else {
					global = false;
				}

				// If we are at the beginning of the history we can't undo so show an alert
				if (history.length === 1) {
					alert('Nothing to undo!');
					return false;
				}

				// Get the last action and move it to the redo array
				var action = history.pop();
				redo.push(action);

				// If the action exists in the other history get rid of it
				otherHistory = otherHistory.filter(function(element) {
					return element !== action;
				});

				// Update the action to reference the previous canvas state
				action = history[history.length - 1];

				// Remove the existing layers from the canvas
				stage.destroyChildren();

				// Restore the local layers from the JSON
				for (var i in action.localLayers) {
					stage.add(Kinetic.Node.create(action.localLayers[i]));
					stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('Z-Index'));
				}

				// Restore the global layers from the JSON
				for (var j in action.globalLayers) {
					stage.add(Kinetic.Node.create(action.globalLayers[j]));
					stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('Z-Index'));
				}

				// Restore the active layer
				var madeActive = false;
				for (var k in stage.children) {
					if (typeof stage.children[k] === 'object' &&
						stage.children[k].getAttr('Z-Index') === platform.activeLayer.getAttr('Z-Index')) {
						platform.activeLayer = stage.children[k];
						madeActive = true;
					}
				}

				if (!madeActive) {
					platform.activeLayer = stage.children[stage.children.length - 1];
				}

				// Rebuild the layer model used by the platform
				platform.layers.rebuildLayerModel(platform.activeLayer.getAttr('layerName'));

				// Redraw the canvas
				stage.drawScene();

				if (!noSend) platform.session.undoLastAction(global);
			} catch (e) {
				alert(e.message);
			}
		},

		/**
		 * Function to redo the last action. By default redoes the user's last
		 * action. If redoing a global action, the last change made to the canvas
		 * will be redone.
		 *
		 * @param {boolean} global Redo a global action?
		 * @return {boolean}
		 */
		redoLastAction: function(global, securityOverride, noSend) {
			var history = platform.history.userHistory,
				redo = platform.history.userRedo,
				otherHistory = platform.history.globalHistory,
				otherRedo = platform.history.globalRedo,
				stage = platform.stage;
			try {
				if (!securityOverride) platform.util.isContributor(user);
				if (global === true) {
					platform.util.isSessionOwner(user);
					history = platform.history.globalHistory;
					redo = platform.history.globalRedo;
					otherHistory = platform.history.userHistory;
					otherRedo = platform.history.userRedo;
				} else {
					global = false;
				}

				// If no redo array then there is nothing to redo!
				if (!redo.length) {
					alert('Nothing to redo!');
					return false;
				}

				// Get the action that is being restored and add it to the history
				var action = redo.pop();
				history.push(action);

				// If the action exists in the other redo get rid of it
				otherRedo = otherRedo.filter(function(element) {
					return element !== otherRedo[i];
				});

				if (history.length === 1) {
					action = redo.pop();
				}

				// Remove the curent layers
				stage.destroyChildren();

				// Restore the local layers
				for (var i in action.localLayers) {
					stage.add(Kinetic.Node.create(action.localLayers[i]));
					stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('Z-Index'));
				}

				// Restore the global layers
				for (var j in action.globalLayers) {
					stage.add(Kinetic.Node.create(action.globalLayers[j]));
					stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('Z-Index'));
				}

				// Restore the active layer
				var madeActive = false;
				for (var k in stage.children) {
					if (typeof stage.children[k] === 'object' &&
						stage.children[k].getAttr('Z-Index') === platform.activeLayer.getAttr('Z-Index')) {

						platform.activeLayer = stage.children[k];
						madeActive = true;
					}
				}

				if (!madeActive) {
					platform.activeLayer = stage.children[stage.children.length - 1];
				}

				// Rebuild the layer model used by the platform
				platform.layers.rebuildLayerModel(platform.activeLayer.getAttr('layerName'));

				// Redraw the scene
				stage.drawScene();

				if (!noSend) platform.session.redoLastAction(global);

			} catch (exception) {
				alert(exception.message);
			}
		},
		updateHistoriesAfterSessionAction: function(data) {
			platform.history.globalHistory = data.globalHistory;
			platform.history.globalRedo = data.globalRedo;
		}
	},

	/**
	 * The session object
	 * Handles client side functionality to initialise, join or leave a session
	 * @type {Object}
	 */
	session: {
		/**
		 * Client side session initialisation
		 */
		initSession: function() {
			var username = $('#username').val();
			var sessionName = $('#sessionName').val();

			if (username === "" || sessionName === "") {
				platform.util.alert("Please enter a username and session name");
				return;
			}

			$.ajax({
				url: '/initSession',
				dataType: 'json',
				data: {
					username: username,
					sessionName: sessionName
				},
				method: "POST",
				success: function(data) {
					// Replace the body with the drawing platform
					$('body').html(data.body);

					if (data.platformData) {
						if (!data.platformData.localLayers) data.platformData.localLayers = {};
						if (!data.platformData.globalLayers) data.platformData.globalLayers = {};
						if (!data.platformData.globalHistory) data.platformData.globalHistory = [];
						if (!data.platformData.globalRedo) data.platformData.globalRedo = [];
						platform.gotPlatformData = data.platformData;
					}

					// Create the use object
					user = new User(data.options);

					// Initialise the drawing platform
					platform.init();
					platform.dbIntervalTimer = setInterval(function() {
						platform.session.sendEverything('DATABASE');
					}, 30000);
				},
				error: function(jqXHR) {
					platform.util.alert(jqXHR.responseJSON.error);
				}
			});
		},

		/**
		 * Client side setup when joining an exisiting session
		 * @return {[type]} [description]
		 */
		joinSession: function() {
			var username = $('#username').val();
			var sessionName = $('#sessionName').val();

			if (username === "" || sessionName === "") {
				platform.util.alert("Please enter a username and session name");
				return;
			}

			$.ajax({
				url: '/joinSession',
				dataType: 'json',
				data: {
					username: username,
					sessionName: sessionName
				},
				method: "POST",
				success: function(data) {
					// Replace the body with the drawing platform
					$('body').html(data.body);

					// Create the use object
					user = new User(data.options);

					// Connect to the other users in the session
					for (var i in data.users) {
						if (data.users[i].username !== user.username) {
							user.connectToPeer(data.options.sessionName + '_' + data.users[i].username, data.users[i].securityProfile);
						}
					}

					for (var j in user.connections) {

						var conn = user.connections[j];
						conn.on('open', function() {
							conn.send({
								message: 'GET_PLATFORM_DATA',
								sendTo: user.peer.id
							});
						});

					}
				},
				error: function(jqXHR) {
					platform.util.alert(jqXHR.responseJSON.error);
				}
			});
		},

		/**
		 * Client side tear down of a session
		 */
		leaveSession: function() {
			platform.session.sendEverything("DATABASE");
			$.ajax({
				url: '/leaveSession',
				data: {
					user: user.options
				},
				method: 'POST',
				async: false
			});
		},

		/**
		 * Check session owners
		 */
		checkSessionOwners: function() {
			var response = "Are you sure you want to leave the session?";
			$.ajax({
				url: '/checkSessionOwners',
				data: {
					sessionName: user.sessionName,
					username: user.username
				},
				method: 'POST',
				async: false,
				success: function(data) {
					if (!data.count) {
						response = 'You are about to the leave the session. \n' +
							'You are the only session owner. \n' +
							'All other users will be disconnected';
					}
				}
			});
			return response;
		},

		sendEverything: function(connectionID) {
			var globalLayers = {};
			var localLayers = {};

			for (var i in platform.layers.globalLayers) {
				globalLayers[i] = platform.layers.globalLayers[i].toJSON();
			}

			for (var j in platform.layers.localLayers) {
				localLayers[j] = platform.layers.localLayers[j].toJSON();
			}

			var toSend = {
				message: 'GOT_PLATFORM_DATA',
				data: {
					globalLayers: globalLayers,
					localLayers: localLayers,
					globalHistory: platform.history.globalHistory,
					globalRedo: platform.history.globalRedo
				}
			};

			if (connectionID === 'DATABASE') {
				$.ajax({
					url: '/saveToDb',
					method: 'POST',
					data: {
						sessionName: user.sessionName,
						platformData: toSend.data
					}
				});
				return;
			}

			if (user.connections[connectionID].open) {
				clearInterval(user.setIntervalTimer);
			}

			user.connections[connectionID].send(toSend);

		},

		sendLayerToAll: function(layer) {
			var JSONlayer = layer.toJSON();
			var toSend = {
				message: 'RECEIVED_LAYER',
				data: JSONlayer
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		sendLayerToDelete: function(layerName, global) {
			var toSend = {
				message: 'DELETE_LAYER',
				data: {
					layerName: layerName,
					global: global
				}
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		sendLayerToLock: function(layerName, global) {
			var toSend = {
				message: 'LOCK_LAYER',
				data: {
					layerName: layerName,
					global: global
				}
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		sendGlobalHistoryAction: function() {
			var toSend = {
				message: 'UPDATE_HISTORIES',
				data: {
					globalHistory: platform.history.globalHistory,
					globalRedo: platform.history.globalRedo
				}
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		undoLastAction: function(global) {
			var toSend = {
				message: 'UNDO_LAST_ACTION',
				data: {
					global: global,
					globalHistory: platform.history.globalHistory,
					globalRedo: platform.history.globalRedo
				}
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		redoLastAction: function(global) {
			var toSend = {
				message: 'REDO_LAST_ACTION',
				data: {
					global: global,
					globalHistory: platform.history.globalHistory,
					globalRedo: platform.history.globalRedo
				}
			};

			for (var i in user.connections) {
				user.connections[i].send(toSend);
			}
		},

		/**
		 * Bans a user from the current session
		 * @param  {String} username
		 */
		banUser: function(username, userListRow) {
			try {
				platform.util.isSessionOwner(user);
				$.ajax({
					url: '/banUser',
					method: 'post',
					dataType: 'json',
					data: {
						username: username,
						sessionName: user.sessionName
					}
				});
				user.removeConnection(username);

				var toSend = {
					message: 'REMOVE_CONNECTION',
					data: {
						username: username
					}
				};

				for (var i in user.connections) {
					user.connections[i].send(toSend);
				}

				if (userListRow) {
					var rows = userListRow.parent().children().length;
					userListRow.slideUp().remove();
					if (rows === 1) {
						$('#userList .close').click();
					}
				}

			} catch (e) {
				alert(e.message);
			}
		},

		/**
		 * Boots a user from the current session
		 * @param  {String} username
		 */
		bootUser: function(username, userListRow) {
			try {
				platform.util.isSessionOwner(user);
				$.ajax({
					url: '/bootUser',
					method: 'post',
					dataType: 'json',
					data: {
						username: username,
						sessionName: user.sessionName
					}
				});

				user.removeConnection(username);

				var toSend = {
					message: 'REMOVE_CONNECTION',
					data: {
						username: username
					}
				};

				for (var i in user.connections) {
					user.connections[i].send(toSend);
				}

				if (userListRow) {
					var rows = userListRow.parent().children().length;
					userListRow.slideUp().remove();
					if (rows === 1) {
						$('#userList .close').click();
					}
				}

			} catch (e) {
				console.error(e);
				alert(e.message);
			}
		},

		changeUserSecurityProfile: function(username, securityProfile) {
			try {
				platform.util.isSessionOwner(user);
				$.ajax({
					url: '/changeUserSecurityProfile',
					method: 'post',
					dataType: 'json',
					data: {
						username: username,
						sessionName: user.sessionName,
						securityProfile: securityProfile
					}
				});

				var toSend = {
					message: 'CHANGE_USER_SECURITY_PROFILE',
					data: {
						username: username,
						securityProfile: securityProfile
					}
				};

				for (var i in user.connections) {
					user.connections[i].send(toSend);
				}

			} catch (e) {
				console.error(e);
				alert(e.message);
			}
		}
	},

	/**
	 * Utility functions
	 * @type {Object}
	 */
	util: {
		_ALERT: '<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Error!</strong> ERROR_TEXT</div>',
		_WARNING_CONTAINER: $('#warningContainer'),
		_USER_TABLE_ROW: '<tr id="PEERID"><td><input type="text" class="form-control" disabled /></td><td><select class="form-control"><option value="1">Session owner</option><option value="2">Contributor</option><option value="3">Watcher</option></select></td><td><button type="button" class="btn btn-warning form-control">Boot user</button></td><td><button type="button" class="btn btn-danger form-control">Ban user</button></td></tr>',
		/**
		 * Function to get the mouse position when entering the stage as KineticJS doesn't
		 * detect the position onmouseenter
		 *
		 * @param  {jQueryEvent} event
		 * @return {Object} position
		 */
		getPointerPosition: function(event) {
			var position = {
				x: event.pageX - $(platform.stage.getContent()).offset().left,
				y: event.pageY - $(platform.stage.getContent()).offset().top
			};
			return position;
		},

		/**
		 * Function to check that the current user is a session owner
		 *
		 * @param {Object} user     The user being checked
		 * @param {function} callback Optional callback function
		 * @throws Error
		 */
		isSessionOwner: function(user, callback) {
			if (user.securityProfile > 1) {
				throw new Error('Must be session owner');
			}

			if (callback) callback();
		},

		/**
		 * Function to check that the current user is a contributor or higher
		 *
		 * @param {Object} user     The user being checked
		 * @param {function} callback Optional callback function
		 * @throws Error
		 */
		isContributor: function(user, callback) {
			if (user.securityProfile > 2) {
				throw new Error('Must be contributor or higher');
			}
			if (callback) callback();
		},

		/**
		 * Function to check that the layer is owned by the given user
		 *
		 * @param {Kinetic.Layer} layer    The layer being checked
		 * @param {User}        user     The user being checked
		 * @param {function}        callback Optional callback function
		 * @throws Error
		 */
		isLayerOwner: function(layer, user, callback) {
			if (layer.getAttr('owner') !== user.username && user.securityProfile > 1) {
				throw new Error('Must own layer to make changes');
			}
			if (callback) callback();
		},

		/**
		 * Function to check if a layer is locked
		 *
		 * @param {Kinetic.Layer} layer The layer being checked
		 * @throws Error
		 */
		isLayerLocked: function(layer) {
			if (layer.getAttr('locked')) {
				throw new Error('Layer is locked');
			}
		},

		/**
		 * Adds event listeners to the stage and UI elements
		 */
		addEventListeners: function() {
			// Event listeners for leaving a session
			$(window).on('beforeunload', platform.session.checkSessionOwners);
			$(window).on('unload', platform.session.leaveSession);

			var stageContent = $(platform.stage.getContent());

			// Drawing events
			stageContent.on("mousedown mouseenter", platform.drawLine.onMouseDown);
			stageContent.on("mouseup mouseleave", platform.drawLine.onMouseUp);
			stageContent.on("mousemove", platform.drawLine.onMouseMove);

			// Undo / redo buttons
			$('#userUndoButton').on('click', platform.history.undoLastAction);
			$('#userRedoButton').on('click', platform.history.redoLastAction);
			$('#globalUndoButton').on('click', function() {
				platform.history.undoLastAction(true);
			});
			$('#globalRedoButton').on('click', function() {
				platform.history.redoLastAction(true);
			});

			// Prevent form submits
			$('form').on('submit', function(event) {
				event.preventDefault();
			});

			// Brush size events
			$('#brushSizeInput').val(platform.brush.brushSize);
			$('#brushSizeInput').on('change keyup', function() {
				platform.brush.changeBrushSize($(this).val());
			});

			// Brush color events
			$('#brushColorHex').on('change keyup', platform.brush.changeBrushColorHex);
			$('#brushColorHex').val(platform.brush.brushColorHex).change();

			$('#brushColorRed, #brushColorGreen, #brushColorBlue').on('change keyup', platform.brush.RGBToHex);

			$('#brushColorHue, #brushColorSat, #brushColorVal').on('change keyup', platform.brush.HSVToRGB);
			$('#colorPicker').on('change', platform.brush.changeBrushColorHex);

			// Save to PNG button
			$('#saveToPNG').on('click', platform.util.saveToPNG);

			// Save to PNG button
			$('#saveToDB').on('click', platform.util.manualSaveToDb);

			// New layer button
			$('#newLayerButton').on('click', platform.layers.addLayer);

			// Drawing tool buttons
			$('#brushToolButton').on('click', platform.brush.brush);
			$('#brushToolButton').click();

			$('#eraserToolButton').on('click', platform.brush.eraser);
		},

		/**
		 * Function to add event listeners to the buttons on a layer preview panel
		 *
		 * @param {string} layerName
		 */
		addLayerButtonEvents: function(layerName) {
			if (!layerName) return false;

			// Check if layer is global
			var global = false;
			if (layerName.indexOf('global') !== -1) {
				global = true;
			}

			// Get the preview panel's UI elements
			var previewDiv = $('#' + layerName);
			var toggleVisibleButton = previewDiv.find('.toggleVisible');
			var toggleGlobalLayerButton = previewDiv.find('.toggleGlobalLayer');
			var lockLayerButton = previewDiv.find('.lockLayer');
			var deleteLayerButton = previewDiv.find('.deleteLayer');

			// Event to select the active layer
			previewDiv.on('click', function() {
				var layer = platform.layers.getLayer(layerName, global);
				$('.layerSection .layerPanel label.active').removeClass('active');
				previewDiv.find('label').addClass('active');
				platform.activeLayer = layer;
			});
			previewDiv.click();

			// Event to toggle layer visibility
			toggleVisibleButton.on('click', function() {
				var layer = platform.layers.getLayer(layerName, global);
				if (layer.isVisible()) {
					layer.hide();
				} else {
					layer.show();
				}
				$(this).toggleClass('active');

			});

			// Event to toggle global status
			toggleGlobalLayerButton.on('click', function() {
				var layer = platform.layers.getLayer(layerName, global);
				if (platform.layers.toggleGlobalLayer(layer)) {
					$(this).toggleClass('active');
				}
			});

			// Event to toggle layer lock
			lockLayerButton.on('click', function() {
				var layer = platform.layers.getLayer(layerName, global);
				if (platform.layers.lockLayer(layer)) {
					platform.session.sendLayerToLock(layerName, global);
					$(this).toggleClass('active');
				}
			});

			// Event to delete a layer
			deleteLayerButton.on('click', function() {
				if (layerName === 'globalLayer1') {
					alert('This layer cannot be deleted');
					return false;
				}
				if (confirm('Are you sure you want to delete this layer?')) {
					var layer = platform.layers.getLayer(layerName, global);
					if (platform.layers.deleteLayer(layer)) {
						previewDiv.remove();
					}
				}
			});
		},

		addUserToUserList: function(peerID, securityProfile) {
			var username = peerID.split('_')[1];
			$('#userListBody').append(this._USER_TABLE_ROW.replace('PEERID', peerID + 'Row'));
			var userListRow = $('#' + peerID + 'Row');
			userListRow.find('input').val(username);
			userListRow.find('select').val(securityProfile).on('change', function() {
				platform.session.changeUserSecurityProfile(username, $(this).val());
			});
			userListRow.find('.btn-warning').on('click', function() {
				platform.session.bootUser(username, userListRow);
			});
			userListRow.find('.btn-danger').on('click', function() {
				platform.session.banUser(username, userListRow);
			});
		},

		/**
		 * Function to prevent non-numeric data being entered into numeric input fields
		 */
		restrictToNumericInput: function() {
			// Only allow numeric key entry for fields with .numericOnly class
			$('input[type="number"]').keydown(function(e) {

				if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105) || e.keyCode == 8 || e.keyCode == 9 || e.keyCode == 13 || e.keyCode == 16 || e.keyCode == 37 || e.keyCode == 39 || e.keyCode == 46 || e.keyCode == 110 || e.keyCode == 190) {

				} else {
					return false;
				}
			});
		},

		/**
		 * Export the current stage to a .png and open it in a new window for downloading
		 */
		saveToPNG: function() {
			platform.stage.toDataURL({
				mimeType: 'image/png',
				callback: function(dataUrl) {
					window.open(dataUrl);
				}
			});
		},

		manualSaveToDb: function() {
			try {
				platform.util.isContributor(user);
				platform.session.sendEverything("DATABASE");
			} catch (e) {
				alert(e.message);
			}
		},

		/**
		 * Removes event listeners from the stage and UI elements
		 * @param  {boolean} removeSave
		 */
		removeEventListeners: function(removeSave) {
			// Event listeners for leaving a session
			$(window).off('beforeunload');
			$(window).off('unload');

			var stageContent = $(platform.stage.getContent());

			// Drawing events
			stageContent.off("mousedown mouseenter");
			stageContent.off("mouseup mouseleave");
			stageContent.off("mousemove");

			// Undo / redo events
			$('#userUndoButton').off('click');
			$('#userRedoButton').off('click');
			$('#globalUndoButton').off('click');
			$('#globalRedoButton').off('click');

			// Brush events
			$('#brushSizeInput').off('change keyup');
			$('#brushColorHex').off('change keyup');
			$('#brushColorRed, #brushColorGreen, #brushColorBlue').off('change keyup');
			$('#brushColorHue, #brushColorSat, #brushColorVal').off('change keyup');

			if (removeSave) {
				// Save to PNG button
				$('#saveToPNG').off('click');
			}

			// New layer button
			$('#newLayerButton').off('click');

			// Drawing tool buttons
			$('#brushToolButton').off('click');
			$('#eraserToolButton').off('click');

			// Layer preview events
			$('.layerPanel').off('click');
			$('.toggleVisible').off('click');
			$('.toggleGlobalLayer').off('click');
			$('.lockLayer').off('click');
			$('.deleteLayer').off('click');
		},

		/**
		 * Disables all of the UI elements
		 * @param  {boolean} disableSave
		 */
		disableUIElements: function(disableSave) {
			// Undo / redo buttons
			$('#userUndoButton').prop('disabled', true);
			$('#userRedoButton').prop('disabled', true);
			$('#globalUndoButton').prop('disabled', true);
			$('#globalRedoButton').prop('disabled', true);

			// Brush size events
			$('#brushSizeInput').prop('disabled', true);

			// Brush color events
			$('#brushColorHex').prop('disabled', true);
			$('#brushColorRed, #brushColorGreen, #brushColorBlue').prop('disabled', true);
			$('#brushColorHue, #brushColorSat, #brushColorVal').prop('disabled', true);

			if (disableSave) {
				// Save to PNG button
				$('#saveToPNG').prop('disabled', true);
			}

			// New layer button
			$('#newLayerButton').prop('disabled', true);

			// Drawing tool buttons
			$('#brushToolButton').prop('disabled', true);
			$('#eraserToolButton').prop('disabled', true);

			// Layer preview buttons
			$('.toggleVisible').prop('disabled', true);
			$('.toggleGlobalLayer').prop('disabled', true);
			$('.lockLayer').prop('disabled', true);
			$('.deleteLayer').prop('disabled', true);
		},
		alert: function(message) {
			if (!this._WARNING_CONTAINER.length) {
				this._WARNING_CONTAINER = $('#warningContainer');
			}

			var alert = this._ALERT;
			alert = alert.replace('ERROR_TEXT', message);
			this._WARNING_CONTAINER.html(alert);
		}
	},

	/**
	 * Function that initialises the drawing platform
	 */
	init: function() {
		// Create the stage
		platform.stage = new Kinetic.Stage({
			container: 'stage',
			width: 900,
			height: 506
		});

		if (!platform.gotPlatformData || Array.isArray(platform.gotPlatformData)) {
			// Create the background layer
			platform.layers.createBackgroundLayer();

			// Add the layers to the stage
			for (var i in platform.layers.globalLayers) {
				platform.layers.addLayer(platform.layers.globalLayers[i], true, true, true);
			}

		} else {
			platform.history.globalHistory = platform.gotPlatformData.globalHistory;
			platform.history.globalRedo = platform.gotPlatformData.globalRedo;

			platform.layers.globalLayers = platform.gotPlatformData.globalLayers;
			platform.layers.localLayers = platform.gotPlatformData.localLayers;

			platform.stage.destroyChildren();

			for (var gl in platform.layers.globalLayers) {
				platform.stage.add(Kinetic.Node.create(platform.layers.globalLayers[gl]));
				platform.stage.children[platform.stage.children.length - 1].setZIndex(platform.stage.children[platform.stage.children.length - 1].getAttr('Z-Index'));
			}

			for (var ll in platform.layers.localLayers) {
				platform.stage.add(Kinetic.Node.create(platform.layers.localLayers[ll]));
				platform.stage.children[platform.stage.children.length - 1].setZIndex(platform.stage.children[platform.stage.children.length - 1].getAttr('Z-Index'));
			}


			// Rebuild the layer model used by the platform
			platform.layers.rebuildLayerModel('globalLayer1');

			// Redraw the canvas
			platform.stage.drawScene();
		}

		// Add a history entry so there is always an initial state to go back to
		platform.history.addToHistory(true);

		platform.brush.changeBrushSize(3);
		platform.brush.changeBrushColorHex('000000');

		// Set the active layer
		for (var first in platform.layers.globalLayers) break;
		platform.activeLayer = platform.layers.globalLayers[first];

		if (window.jQuery.spectrum) $('#colorPicker').spectrum({
			color: '#000'
		});

		platform.util.addEventListeners();
		platform.util.restrictToNumericInput();

		$('button').tooltip();
		if (user.securityProfile > 1) {
			$('.owner').prop('disabled', true);
		}
	},
	/**
	 * Function that uninitialises the drawing platform
	 */
	uninit: function() {
		platform.util.removeEventListeners();
		platform.util.disableUIElements();
	},
};