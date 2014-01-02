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
		brushColor: 'black',
		brushSize: 3,
		brushType: 'round'
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
					stroke: platform.brush.brushColor,
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
							fill: platform.brush.brushColor,
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
			var history = platform.history.userHistory,
				redo    = platform.history.userRedo,
				stage   = platform.stage;

			// if (global) {
			// 	history = platform.history.globalHistory;
			// 	redo = platform.history.globalRedo;
			// }

			// If we are at the beginning of the history we can't undo so show an alert
			if (history.length === 1) {
				alert('Nothing to undo!');
				return false;
			}

			// Get the last action and move it to the redo array
			var action = history.pop();
			redo.push(action);

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
			var history = platform.history.userHistory,
				redo    = platform.history.userRedo,
				stage   = platform.stage;

			// if (global) {
			// 	history = platform.history.globalHistory;
			// 	redo = platform.history.globalRedo;
			// }

			// If no redo array then there is nothing to redo!
			if (!redo.length) {
				alert('Nothing to redo!');
				return false;
			}

			// Get the action that is being restored and add it to the history
			var action = redo.pop();
			history.push(action);

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
	}
};

var user = {
	username: "Will",
	securityProfile: 1,
	profileName: "sessionOwner"
};

$(document).ready(platform.init);