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
		background: new Kinetic.Layer(),
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
		getPointerPosition: function(event){
			var position = {
				x: event.pageX - $(platform.stage.getContent()).offset().left,
				y: event.pageY - $(platform.stage.getContent()).offset().top
			};
			return position;
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

		// Add the layers to the stage
		for (var i in platform.layers) {
			platform.stage.add(platform.layers[i]);
			platform.layers[i].drawScene();
		}

		// Set the active layer
		platform.activeLayer = platform.layers.background;

		var stageContent  = $(platform.stage.getContent());

		// Add event listeners
		stageContent.on("mousedown mouseenter", platform.drawLine.onMouseDown);
		stageContent.on("mouseup mouseleave", platform.drawLine.onMouseUp);
		stageContent.on("mousemove", platform.drawLine.onMouseMove);
	}
};

$(document).ready(platform.init);