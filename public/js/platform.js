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
			this.globalLayers["background"] = background;
		},
		/**
		 * Function to add a layer to the canvas
		 *
		 * @param Kinetic.Layer layer (optional)
		 * @param bool global
		 */
		addLayer: function(layer, global, securityOverride){
			try {
				if (!securityOverride) {
					platform.util.isContributor(user);
				}

				if (!layer){
					layer = new Kinetic.Layer();
					
					var key;

					if (global) {
						if (!securityOverride) {
							platform.util.isSessionOwner(user);
						}
						layer.setAttr('global', true);
						key = Object.keys(this.globalLayers).length;
						while (typeof this.globalLayers["globalLayer" + key] === "object"){
							key++;
						}
						this.globalLayers["globalLayer" + key] = layer;
					} else {
						layer.setAttr('local', true);
						layer.setAttr('owner', user.username);

						key = Object.keys(this.localLayers).length;
						while (typeof this.localLayers["localLayer" + key] === "object"){
							key++;
						}
						this.localLayers["localLayer" + key] = layer;
					}
				}
				platform.stage.add(layer);
				layer.drawScene();
				platform.activeLayer = layer;
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
							return true;
						}
					}
				}
				
			} catch(error){
				alert(error.message);
				return false;
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

			// Flag the mouse button as unpressed if a mouseup event
			if (event.type === "mouseup") {
				platform.mouseDown = false;
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
			platform.layers.addLayer(platform.layers.globalLayers[i], true, true);
		}

		// Set the active layer
		platform.activeLayer = platform.layers.globalLayers.background;

		var stageContent  = $(platform.stage.getContent());

		// Add event listeners
		stageContent.on("mousedown mouseenter", platform.drawLine.onMouseDown);
		stageContent.on("mouseup mouseleave", platform.drawLine.onMouseUp);
		stageContent.on("mousemove", platform.drawLine.onMouseMove);
	}
};

var user = {
	username: "Will",
	securityProfile: 1,
	profileName: "sessionOwner"
};

$(document).ready(platform.init);