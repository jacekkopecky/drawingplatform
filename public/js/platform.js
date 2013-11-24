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
			// Flag the mouse as being down
			platform.mouseDown = true;

			// Reset the points array and add the start position
			platform.drawLine.points = [];
			platform.drawLine.points.push(platform.stage.getPointerPosition());

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
			platform.mouseDown = false;

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
	/**
	 * Function to initialise the drawing platform
	 */
	init: function(){
		// Create the stage
		platform.stage = new Kinetic.Stage({
			container: 'stage',
			width: 720,
			height: 405
		});

		// Add the layers to the stage
		for (var i in platform.layers) {
			platform.stage.add(platform.layers[i]);
			platform.layers[i].drawScene();
		}

		// Set the active layer
		platform.activeLayer = platform.layers.background;

		// Add event listeners
		$(platform.stage.getContent()).on("mousedown", platform.drawLine.onMouseDown);
		$(platform.stage.getContent()).on("mouseup", platform.drawLine.onMouseUp);
		$(platform.stage.getContent()).on("mousemove", platform.drawLine.onMouseMove);
	}
};

$(document).ready(platform.init);