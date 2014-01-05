/**
 * Frontend drawing platform object
 *
 * @author Will Albone
 */
var platform = {
	// Flag to check if the mouse is down
	mouseDown: false,

	// Brush object settings
	brush: {
		brushColorHex: '000000',
		brushSize: 3,
		brushType: 'round',
		changeBrushSize: function(brushSize){
			this.brushSize = brushSize;
		},
		/**
		 * Function to change the color of the brush using a hex value
		 *
		 * @param String brushColorHex
		 * @param boolean updateRGB
		 * @param boolean updateHSL
		 * @return boolean
		 */
		changeBrushColorHex: function(brushColorHex, updateRGB, updateHSL){
			// If color is an object then we need to get the value
			if (typeof brushColorHex === 'object') {
				brushColorHex = $('#brushColorHex').val();
				updateRGB = true;
				updateHSL = true;
			}

			if (brushColorHex.length < 6) {
				return false;
			}

			// Test if the hex is valid and change the brush color
			if (/^([0-9a-f]{6})$/i.test(brushColorHex)){
				platform.brush.brushColorHex = brushColorHex;
				if (updateRGB) platform.brush.hexToRGB(brushColorHex, updateHSL);
				$('#brushColorLabel').css('color', '#' + brushColorHex);
				return true;
			} else {
				alert('Please enter a valid hex color value, not: ' + brushColorHex);
				return false;
			}
		},
		/** 
		 * Converts a hex color value to RGB
		 *
		 * @param String hex
		 * @param boolean updateHSL
		 */
		hexToRGB: function(hex, updateHSL){
			var r = parseInt(hex.slice(0,2), 16);
			var g = parseInt(hex.slice(2,4), 16);
			var b = parseInt(hex.slice(4,6), 16);

			$('#brushColorRed').val(r);
			$('#brushColorGreen').val(g);
			$('#brushColorBlue').val(b);

			if (updateHSL) platform.brush.RGBToHSL(r, g, b);
		},
		/**
		 * Converts RGB values to a hex color
		 */
		RGBToHex: function(updateHSL){
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

			// Update the HSL values if needed
			if (updateHSL) platform.brush.RGBToHSL(r, g, b);

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
		 * Function to convert from RGB to HSL
		 *
		 * @param int r
		 * @param int g
		 * @param int b
		 * @return boolean
		 */
		RGBToHSL: function(r, g, b){
			var hue, sat, lum, max, min;

			// Check that RGB are all numbers
			if (isNaN(r) || isNaN(g) || isNaN(b)){
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

			// Find the max and min rgb value
			max = Math.max(r, g, b);
			min = Math.min(r, g, b);

			// Calculate the hue and saturation
			if (max === min) {
				hue = 0;
				sat = 0;
			} else {
				if (r === max) {
					hue = (g - b) / (max - min) / 1;
				} else if (g === max) {
					hue = 2 + (b - r) / 1 / (max - min) / 1;
				} else if (b === max) {
					hue = 4 + (r - g) / (max - min) / 1;
				}
				sat = (max - min) / max;
			}
			hue = hue * 60;
			lum = max;
			if (hue < 0) hue += 360;

			$('#brushColorHue').val(Math.round(hue));
			$('#brushColorSat').val(Math.round(sat * 100));
			$('#brushColorLum').val(Math.round(lum * 100));
		},
		/**
		 * Function to convert HSL value to RGB
		 */
		HSLToRGB: function(){
			var r, g, b;
			var hue = $('#brushColorHue').val();
			var sat = $('#brushColorSat').val();
			var lum = $('#brushColorLum').val();

			// Check that HSL are all numbers
			if (isNaN(hue) || isNaN(sat) || isNaN(lum)){
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

			if (lum > 100) {
				lum = 100;
				$('#brushColorLum').val(lum);
			}

			var hueInterval = Math.floor(hue / 60);

			var f = hue / 60 - hueInterval;
			
			if (sat > 1) sat = sat / 100;
			if (lum > 1) lum = lum / 100;
			
			var p = (lum * (1 - sat));
			var q = (lum * (1 - (f * sat)));
			var t = (lum * (1 - ((1 - f) * sat)));

			switch (hueInterval) {
				case 0:
					r = lum;
					g = t;
					b = p;
					break;
				case 1:
					r = q;
					g = lum;
					b = p;
					break;
				case 2:
					r = p;
					g = lum;
					b = t;
					break;
				case 3:
					r = p;
					g = q;
					b = lum;
					break;
				case 4:
					r = t;
					g = p;
					b = lum;
					break;
				default:
					r = lum;
					g = p;
					b = q;
					break;
			}

			if (!sat) {
				r = lum;
				g = lum;
				b = lum;
			}

			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);

			$('#brushColorRed').val(r);
			$('#brushColorGreen').val(g);
			$('#brushColorBlue').val(b);
			platform.brush.RGBToHex(false);

		},

	},

	// Collection of layers
	layers: {
		/**
		 * Function to create a white background layer the size of the canvas
		 */
		createBackgroundLayer: function(){
			var background = new Kinetic.Layer().setAttr('global', true);
			var height = platform.stage.getHeight();
			var width = platform.stage.getWidth();
			var rectangle = new Kinetic.Rect({
				height: height,
				width: width,
				fill: 'white',
			});
			background.add(rectangle);
			this.globalLayers['globalLayer0'] = background;
		},
		/**
		 * Function to add a layer to the canvas
		 *
		 * @param Kinetic.Layer layer (optional)
		 * @param bool global
		 */
		addLayer: function(layer, global, securityOverride, historyOverride){
			try {
				if (!securityOverride) {
					platform.util.isContributor(user);
				}
				var key = Object.keys(this.globalLayers).length + Object.keys(this.localLayers).length;

				if (!layer){
					layer = new Kinetic.Layer();
					

					if (global) {
						if (!securityOverride) {
							platform.util.isSessionOwner(user);
						}
						layer.setAttr('global', true);

						while (typeof this.globalLayers["globalLayer" + key] === "object"){
							key++;
						}

						this.globalLayers["globalLayer" + key] = layer;
					} else {
						layer.setAttr('local', true);
						layer.setAttr('owner', user.username);

						while (typeof this.localLayers["localLayer" + key] === "object"){
							key++;
						}
						this.localLayers["localLayer" + key] = layer;
					}
				}
				platform.stage.add(layer);
				layer.drawScene();
				layer.setAttr('zIndex', layer.getZIndex());
				layer.setAttr('layerObjectKey', key);
				platform.activeLayer = layer;
				if (!historyOverride) platform.history.addToHistory();
			} catch(error) {
				alert(error.message);
			}
			
		},
		/**
		 * Function to lock or unlock a given layer
		 *
		 * @param Kinetic.Layer layer
		 * @return boolean
		 */
		lockLayer: function(layer){
			try{
				if (layer.getAttr('global')) {
					// Check user can lock global layers
					platform.util.isSessionOwner(user);
				} else {
					// Check the user is able to lock local layers
					platform.util.isContributor(user);

					// Check that the user owns the layer they are trying to lock
					platform.util.isLayerOwner(layer, user);
				}

				if (layer.getAttr('locked')) {
					layer.setAttr('locked', false);
				} else {
					layer.setAttr('locked', true);
				}
				platform.history.addToHistory();
				return true;
				
			} catch(error){
				alert(error.message);
				return false;
			}
		},
		/**
		 * Function to delete a given layer
		 *
		 * @param Kinetic.Layer layer
		 * @return boolean
		 */
		deleteLayer: function(layer){
			try{
				platform.util.isLayerLocked(layer);

				if (layer.getAttr('global')) {
					// Check user can delete global layers
					platform.util.isSessionOwner(user);

					// Delete the layer from the global layers and the canvas
					for (var g in this.globalLayers) {
						if (this.globalLayers[g] === layer) {
							delete this.globalLayers[g];
							layer.destroy();
							platform.history.addToHistory();
							return true;
						}
					}
				} else {
					// Check the user is able to delete local layers
					platform.util.isContributor(user);

					// Check that the user owns the layer they are trying to delete
					platform.util.isLayerOwner(layer, user);

					// Delete the layer from the local layers and the canvas
					for (var i in this.localLayers) {
						if (this.localLayers[i] === layer) {
							delete this.localLayers[i];
							layer.destroy();
							platform.history.addToHistory();
							return true;
						}
					}
				}
				
			} catch(error){
				alert(error.message);
				return false;
			}
		},
		/**
		 * Function to rebuild the layer model for referencing purposes after an undo or redo
		 */
		rebuildLayerModel: function(){
			// Empty the layer model
			this.globalLayers = {};
			this.localLayers  = {};

			// Get the current layers
			var currentLayers = platform.stage.getChildren();
			
			// Restore the layers to their correct positions in the layer model
			for (var i in currentLayers){
				// Ignore anything that is not an object
				if (typeof currentLayers[i] !== 'object') continue;

				if (currentLayers[i].getAttr('global')) {
					this.globalLayers['globalLayer' + currentLayers[i].getAttr('layerObjectKey')] = currentLayers[i];
				} else {
					this.localLayers['localLayer' + currentLayers[i].getAttr('layerObjectKey')] = currentLayers[i];
				}
			}
		},
		globalLayers: {},
		localLayers: {}
	},
	activeLayer: {},
	stage: {},

	// Draw line object
	drawLine: {
		newLine: {},
		points: [],
		/**
		 * Mouse down event callback
		 *
		 * @param Event event
		 */
		onMouseDown: function(event){
			// We have entered the stage but aren't flagged as having the mouse down
			// so do nothing
			if (event.type === "mouseenter" && platform.mouseDown === false) {
				return false;
			}

			// Flag the mouse as being within the platform
			if (event.type === "mouseenter") {
				platform.outOfBounds = false;
			}

			try{
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
					stroke: platform.brush.brushColorHex,
					strokeWidth: platform.brush.brushSize,
					lineCap: platform.brush.brushType,
					lineJoin: platform.brush.brushType
				});

				// Add the new line to the active layer
				platform.activeLayer.add(platform.drawLine.newLine);
			} catch(error){
				alert(error.message);
			}
		},
		/**
		 * Mouse up event callback
		 *
		 * @param Event event
		 */
		onMouseUp: function(event){
			// If the mouse leaves the stage and isn't currently doing anything
			// ignore it
			if (event.type === "mouseleave" && platform.mouseDown === false){
				return false;
			}

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
			if (platform.drawLine.points.length === 1){
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

			// add updated layer to history
			if (addToHistory) {
				platform.history.addToHistory(platform.activeLayer);
			}
		},
		/**
		 * Mouse move event callback
		 *
		 * @param Event event
		 */
		onMouseMove: function(event){
			// If the mouse button is down add points to the points array
			// and redraw the active layer
			if (platform.mouseDown) {
				platform.drawLine.points.push(platform.stage.getPointerPosition());
				platform.activeLayer.drawScene();
			}
		}
	},

	util: {
		/**
		 * Function to get the mouse position when entering the stage as KineticJS doesn't
		 * detect the position onmouseenter
		 *
		 * @param jQueryEvent event
		 * @return Object position
		 */
		getPointerPosition: function(event){
			var position = {
				x: event.pageX - $(platform.stage.getContent()).offset().left,
				y: event.pageY - $(platform.stage.getContent()).offset().top
			};
			return position;
		},
		/**
		 * Function to check that the current user is a session owner
		 *
		 * @param Object user
		 * @param Object callback //optional callback function
		 * @throws Error
		 */
		isSessionOwner: function(user, callback){
			if (user.securityProfile > 1) {
				throw new Error('Must be session owner');
			}

			if (callback) callback();
		},
		/**
		 * Function to check that the current user is a contributor or higher
		 *
		 * @param Object user
		 * @param Object callback //optional callback function
		 * @throws Error
		 */
		isContributor: function(user, callback){
			if (user.securityProfile > 2) {
				throw new Error('Must be contributor or higher');
			}
			if (callback) callback();
		},
		/**
		 * Function to check that the layer is owned by the given user
		 *
		 * @param Kinetic.Layer layer
		 * @param Object user
		 * @param Object callback //optional callback function
		 * @throws Error
		 */
		isLayerOwner: function(layer, user, callback){
			if (layer.getAttr('owner') !== user.username) {
				throw new Error('Must own layer to make changes');
			}
			if (callback) callback();
		},
		/**
		 * Function to check if a layer is locked
		 *
		 * @param Kinetic.Layer layer
		 * @throws Error
		 */
		isLayerLocked: function(layer){
			if(layer.getAttr('locked')) {
				throw new Error('Layer is locked');
			}
		},
		addEventListeners: function(){
			
			var stageContent  = $(platform.stage.getContent());

			// Add event listeners
			stageContent.on("mousedown mouseenter", platform.drawLine.onMouseDown);
			stageContent.on("mouseup mouseleave", platform.drawLine.onMouseUp);
			stageContent.on("mousemove", platform.drawLine.onMouseMove);

			$('#userUndoButton').on('click', platform.history.undoLastAction);
			$('#userRedoButton').on('click', platform.history.redoLastAction);
			$('#globalUndoButton').on('click', function(){platform.history.undoLastAction(true);});
			$('#globalRedoButton').on('click', function(){platform.history.redoLastAction(true);});

			$('form').on('submit', function(event){event.preventDefault();});

			$('#brushSizeInput').val(platform.brush.brushSize);
			$('#brushSizeInput').on('change keyup', function(){platform.brush.changeBrushSize($(this).val());});

			$('#brushColorHex').on('change keyup', platform.brush.changeBrushColorHex);
			$('#brushColorHex').val(platform.brush.brushColorHex).change();

			$('#brushColorRed, #brushColorGreen, #brushColorBlue').on('change keyup', platform.brush.RGBToHex);

			$('#brushColorHue, #brushColorSat, #brushColorLum').on('change keyup', platform.brush.HSLToRGB);

			$('#saveToPNG').on('click', platform.util.saveToPNG);

		},
		restrictToNumericInput: function(){
			// Only allow numeric key entry for fields with .numericOnly class
			$('input[type="number"]').keydown(function(e) {
				
				if ((e.keyCode >= 48 && e.keyCode <= 57) //numbers
						|| (e.keyCode >= 96 && e.keyCode <= 105)  //numpad number              
						|| e.keyCode == 8 //backspace
						|| e.keyCode == 9 //tab
						|| e.keyCode == 13 //enter
						|| e.keyCode == 16 //shift
						|| e.keyCode == 37 //arrow left
						|| e.keyCode == 39 //arrow right
						|| e.keyCode == 46 //delete
						|| e.keyCode == 110 //decimal point
						|| e.keyCode == 190 //full stop
					) {
					
				} else {
					return false;
				}
			});
		},
		saveToPNG: function(){
			platform.stage.toDataURL({
				mimeType: 'image/png',
				callback: function(dataUrl){
					window.open(dataUrl);
				}
			});
		}
	},

	// Undo / redo functionality for user actions and all actions on session
	history: {
		userHistory: [],
		globalHistory: [],
		userRedo: [],
		globalRedo: [],
		/**
		 * Function to add an action to the histories.
		 * Should be called whenever the canvas is modified
		 */
		addToHistory: function(){
			var localLayers   = {},
				globalLayers  = {},
				userHistory   = platform.history.userHistory,
				userRedo      = platform.history.userRedo,
				globalHistory = platform.history.globalHistory,
				globalRedo    = platform.history.globalRedo;

			// JSONify the local layers
			for (var i in platform.layers.localLayers){
				if (typeof platform.layers.localLayers[i] === 'object') {
					localLayers[i] = platform.layers.localLayers[i].toJSON();
				}
			}

			// JSONify the global layers
			for (var j in platform.layers.globalLayers){
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
		},
		/**
		 * Function to undo the last action. By default undoes the user's last
		 * action. If undoing a global action, the last change made to the canvas
		 * will be undone.
		 *
		 * @param boolean global -- Global undo?
		 * @return boolean
		 * @TODO - add support for global undo
		 */
		undoLastAction: function(global){
			var history      = platform.history.userHistory,
				redo         = platform.history.userRedo,
				otherHistory = platform.history.globalHistory,
				otherRedo    = platform.history.globalRedo,
				stage        = platform.stage;

			if (global === true) {
				history      = platform.history.globalHistory;
				redo         = platform.history.globalRedo;
				otherHistory = platform.history.userHistory;
				otherRedo    = platform.history.userRedo;
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
			otherHistory = otherHistory.filter(function(element){
				return element !== action;
			});

			// Update the action to reference the previous canvas state
			action = history[history.length-1];

			// Remove the existing layers from the canvas
			stage.destroyChildren();

			// Restore the local layers from the JSON
			for (var i in action.localLayers){
				stage.add(Kinetic.Node.create(action.localLayers[i]));
				stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('zIndex'));
			}

			// Restore the global layers from the JSON
			for (var j in action.globalLayers){
				stage.add(Kinetic.Node.create(action.globalLayers[j]));
				stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('zIndex'));
			}

			// Restore the active layer
			for (var k in stage.children){
				if (typeof stage.children[k] === 'object' &&
					stage.children[k].getAttr('zIndex') === platform.activeLayer.getAttr('zIndex')){
					platform.activeLayer = stage.children[k];
				}
			}

			// Rebuild the layer model used by the platform
			platform.layers.rebuildLayerModel();

			// Redraw the canvas
			stage.drawScene();
		},
		/**
		 * Function to redo the last action. By default redoes the user's last
		 * action. If redoing a global action, the last change made to the canvas
		 * will be redone.
		 *
		 * @param boolean global -- Global redo?
		 * @return boolean
		 * @TODO - add support for global redo
		 */
		redoLastAction: function(global){
			var history      = platform.history.userHistory,
				redo         = platform.history.userRedo,
				otherHistory = platform.history.globalHistory,
				otherRedo    = platform.history.globalRedo,
				stage        = platform.stage;

			if (global === true) {
				history      = platform.history.globalHistory;
				redo         = platform.history.globalRedo;
				otherHistory = platform.history.userHistory;
				otherRedo    = platform.history.userRedo;
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
			otherRedo = otherRedo.filter(function(element){
				return element !== otherRedo[i];
			});

			if (history.length === 1) {
				action = redo.pop();
			}

			// Remove the curent layers
			stage.destroyChildren();

			// Restore the local layers
			for (var i in action.localLayers){
				stage.add(Kinetic.Node.create(action.localLayers[i]));
				stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('zIndex'));
			}

			// Restore the global layers
			for (var j in action.globalLayers){
				stage.add(Kinetic.Node.create(action.globalLayers[j]));
				stage.children[stage.children.length - 1].setZIndex(stage.children[stage.children.length - 1].getAttr('zIndex'));
			}

			// Restore the active layer
			for (var k in stage.children){
				if (typeof stage.children[k] === 'object' &&
					stage.children[k].getAttr('index') === platform.activeLayer.getAttr('index')){
					
					platform.activeLayer = stage.children[k];
				}
			}

			// Rebuild the layer model used by the platform
			platform.layers.rebuildLayerModel();

			// Redraw the scene
			stage.drawScene();
		}
	},

	/**
	 * Function to initialise the drawing platform
	 */
	init: function(){
		// Create the stage
		platform.stage = new Kinetic.Stage({
			container: 'stage',
			width: 900,
			height: 506
		});

		// Create the background layer
		platform.layers.createBackgroundLayer();

		// Add the layers to the stage
		for (var i in platform.layers.globalLayers) {
			platform.layers.addLayer(platform.layers.globalLayers[i], true, true, true);
		}

		platform.history.addToHistory();

		// Set the active layer
		platform.activeLayer = platform.layers.globalLayers['globalLayer0'];

		platform.util.addEventListeners();
		platform.util.restrictToNumericInput();

		$('button').tooltip();
		if (user.securityProfile > 1) {
			$('.owner').prop('disabled', true);
		}
	}
};

var user = {
	username: "Will",
	securityProfile: 1,
	profileName: "sessionOwner"
};

$(document).ready(platform.init);