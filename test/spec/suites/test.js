jasmine.getFixtures().fixturesPath = 'test/spec/fixtures';


var sessionOwner = {
	username: "sessionOwner",
	securityProfile: 1,
	profileName: "sessionOwner"
};

var contributor = {
	username: "contributor",
	securityProfile: 2,
	profileName: "contributor"
};

var watcher = {
	username: "watcher",
	securityProfile: 3,
	profileName: "watcher"
};

var setup = function(username) {
	loadFixtures('platform-test-fixture.html');
	switch (username) {
		case 'sessionOwner':
			user = sessionOwner;
			break;
		case 'contributor':
			user = sessionOwner;
			break;
		case 'watcher':
			user = sessionOwner;
			break;
		default:
			user = sessionOwner;
			break;
	}

	platform.layers.globalLayers = {};
	platform.layers.localLayers = {};
	platform.activeLayer = {};
	platform.stage = {};
	platform.history.userHistory = [];
	platform.history.globalHistory = [];
	platform.history.userRedo = [];
	platform.history.globalRedo = [];
	platform.init();
};

describe('Initialisation tests', function() {
	beforeEach(function() {
		setup();
	});

	afterEach(function() {
		setup();
	});

	it('Brush tool selected', function() {
		expect(platform.brush.brushType).toBe('round');
		expect(platform.brush.isErasing).toBe(false);
		expect($('#brushToolButton').hasClass('btn-success')).toBe(true);
	});

	it('Default brush size', function() {
		expect(platform.brush.brushSize).toEqual(3);
		expect($('#brushSizeInput').val()).toBe('3');
	});

	it('Default brush color', function() {
		expect(platform.brush.brushColorHex).toBe('000000');
		expect(platform.brush.prevBrushColor).toBe('000000');
		expect($('#brushColorLabel').css('color')).toBe('rgb(0, 0, 0)');
		expect($('#brushColorHex').val()).toBe('000000');
		expect($('#brushColorRed').val()).toBe('0');
		expect($('#brushColorGreen').val()).toBe('0');
		expect($('#brushColorBlue').val()).toBe('0');
		expect($('#brushColorHue').val()).toBe('0');
		expect($('#brushColorSat').val()).toBe('0');
		expect($('#brushColorVal').val()).toBe('0');
	});

	it('Default layers', function() {
		expect(platform.layers.localLayers).toEqual({});
		expect(Object.keys(platform.layers.globalLayers).length).toEqual(1);
		expect(Object.keys(platform.layers.globalLayers)[0]).toMatch('globalLayer1');
		expect(typeof platform.layers.globalLayers.globalLayer1).toBe('object');
		expect(platform.layers.globalLayers.globalLayer1.getType()).toBe('Layer');
	});
});

describe('UI tests', function() {
	beforeEach(function() {
		spyOn(platform.brush, 'eraser').and.callThrough();
		spyOn(platform.brush, 'brush').and.callThrough();
		spyOn(platform.brush, 'changeBrushSize').and.callThrough();
		spyOn(platform.brush, 'changeBrushColorHex').and.callThrough();
		spyOn(platform.brush, 'hexToRGB').and.callThrough();
		spyOn(platform.brush, 'RGBToHex').and.callThrough();
		spyOn(platform.brush, 'RGBToHSV').and.callThrough();
		spyOn(platform.brush, 'HSVToRGB').and.callThrough();
		spyOn(platform.history, 'undoLastAction').and.callThrough();
		spyOn(platform.history, 'redoLastAction').and.callThrough();
		spyOn(platform.util, 'isSessionOwner').and.callThrough();
		spyOn(platform.util, 'isContributor').and.callThrough();
		spyOn(platform.util, 'saveToPNG');
		spyOn(platform.layers, 'addLayer').and.callThrough();
		spyOn(platform.layers, 'addLayerPreview').and.callThrough();
		spyOn(window, 'alert');
		setup();
	});

	afterEach(function() {
		setup();
	});

	describe('Tool tests', function() {
		it('Eraser tool button', function() {
			$('#eraserToolButton').click();
			expect(platform.brush.eraser).toHaveBeenCalled();
			expect($('#eraserToolButton').hasClass('btn-success')).toBeTruthy();
			expect(platform.brush.isErasing).toBeTruthy();
		});

		it('Brush tool button', function() {
			$('#brushToolButton').click();
			expect(platform.brush.brush).toHaveBeenCalled();
			expect($('#brushToolButton').hasClass('btn-success')).toBeTruthy();
			expect(platform.brush.isErasing).toBeFalsy();
		});
	});

	describe('Brush tests', function() {
		it('Change brush size', function() {
			var brushSize = '7';
			$('#brushSizeInput').val(brushSize).change();
			expect(platform.brush.changeBrushSize).toHaveBeenCalledWith(brushSize);
			expect(platform.brush.brushSize).toEqual(brushSize);
		});

		it('Change brush colour hex', function() {
			var hex = 'ff4488';
			var notHex = 'h00000';

			$('#brushColorHex').val(hex).change();
			expect(platform.brush.changeBrushColorHex).toHaveBeenCalled();
			expect(platform.brush.hexToRGB).toHaveBeenCalledWith(hex, true);
			expect(platform.brush.RGBToHSV).toHaveBeenCalled();
			expect(platform.brush.brushColorHex).toBe(hex);
			expect($('#brushColorLabel').css('color')).toBe('rgb(255, 68, 136)');
			expect($('#brushColorRed').val()).toBe('255');
			expect($('#brushColorGreen').val()).toBe('68');
			expect($('#brushColorBlue').val()).toBe('136');
			expect($('#brushColorHue').val()).toBe('338');
			expect($('#brushColorSat').val()).toBe('73');
			expect($('#brushColorVal').val()).toBe('100');

			$('#brushColorHex').val(notHex).change();
			expect(platform.brush.changeBrushColorHex).toHaveBeenCalled();
			expect(window.alert).toHaveBeenCalledWith('Please enter a valid hex color value, not: ' + notHex);
		});

		it('Change brush colour RGB', function() {
			var red = 255,
				green = 68,
				blue = 136;
			$('#brushColorRed').val(red).change();
			$('#brushColorGreen').val(green).change();
			$('#brushColorBlue').val(blue).change();

			expect(platform.brush.RGBToHex.calls.count()).toEqual(3);
			expect(platform.brush.RGBToHSV).toHaveBeenCalledWith(red, green, blue);
			expect(platform.brush.changeBrushColorHex).toHaveBeenCalled();
			expect($('#brushColorLabel').css('color')).toBe('rgb(255, 68, 136)');
			expect($('#brushColorHex').val()).toBe('ff4488');
			expect($('#brushColorHue').val()).toBe('338');
			expect($('#brushColorSat').val()).toBe('73');
			expect($('#brushColorVal').val()).toBe('100');
		});

		it('Change brush color HSV', function() {
			var hue = 338,
				sat = 73,
				val = 100;
			$('#brushColorHue').val(hue);
			$('#brushColorSat').val(sat);
			$('#brushColorVal').val(val).change();

			expect(platform.brush.HSVToRGB).toHaveBeenCalled();
			expect(platform.brush.RGBToHex).toHaveBeenCalled();
			expect(platform.brush.changeBrushColorHex).toHaveBeenCalled();
			expect($('#brushColorLabel').css('color')).toBe('rgb(255, 69, 137)');
			expect($('#brushColorHex').val()).toBe('ff4589');
			expect($('#brushColorRed').val()).toBe('255');
			expect($('#brushColorGreen').val()).toBe('69');
			expect($('#brushColorBlue').val()).toBe('137');
		});
	});

	describe('Undo/redo tests', function() {
		describe('Global undo button', function() {
			it('As a session owner', function() {
				$('#globalUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
				expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			});

			it('As a contributor', function() {
				user = contributor;
				$('#globalUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
				expect(platform.util.isSessionOwner).toThrow();
			});


			it('As a watcher', function() {
				user = watcher;
				$('#globalUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toThrow();
				expect(platform.util.isSessionOwner).toThrow();
			});
		});

		describe('Global redo button', function() {
			it('As a session owner', function() {
				$('#globalRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
				expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			});

			it('As a session owner', function() {
				user = contributor;
				$('#globalRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
				expect(platform.util.isSessionOwner).toThrow();
			});

			it('As a session owner', function() {
				user = watcher;
				$('#globalRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalledWith(true);
				expect(platform.util.isContributor).toThrow();
				expect(platform.util.isSessionOwner).toThrow();
			});

		});

		describe('User undo button', function() {
			it('As a session owner', function() {
				$('#userUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			});

			it('As a session owner', function() {
				user = contributor;
				$('#userUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			});

			it('As a session owner', function() {
				user = watcher;
				$('#userUndoButton').click();
				expect(platform.history.undoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toThrow();
			});
		});

		describe('User redo button', function() {
			it('As a session owner', function() {
				$('#userRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			});

			it('As a session owner', function() {
				user = contributor;
				$('#userRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			});

			it('As a session owner', function() {
				user = watcher;
				$('#userRedoButton').click();
				expect(platform.history.redoLastAction).toHaveBeenCalled();
				expect(platform.util.isContributor).toThrow();
			});
		});
	});

	it('Save to png button', function() {
		$('#saveToPNG').click();
		expect(platform.util.saveToPNG).toHaveBeenCalled();
	});

	describe('New layer button', function() {
		it('As a contributor or higher', function() {
			$('#newLayerButton').click();
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview).toHaveBeenCalled();
			expect(platform.util.isContributor).toHaveBeenCalled();
			expect($('.layerPanel').length).toEqual(2);
			expect(platform.stage.children.length).toEqual(2);
		});

		it('As a watcher', function() {
			user = watcher;
			$('#newLayerButton').click();
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.util.isContributor).toThrow();
		});
	});
});

describe('Layer tests', function() {
	beforeEach(function() {
		spyOn(platform.layers, 'addLayer').and.callThrough();
		spyOn(platform.layers, 'toggleGlobalLayer').and.callThrough();
		spyOn(platform.layers, 'lockLayer').and.callThrough();
		spyOn(platform.layers, 'deleteLayer').and.callThrough();
		spyOn(platform.layers, 'addLayerPreview').and.callThrough();
		spyOn(platform.layers, 'updateLayerPreview').and.callThrough();
		spyOn(platform.layers, 'createLayerPreviewStage').and.callThrough();
		spyOn(platform.util, 'isSessionOwner').and.callThrough();
		spyOn(platform.util, 'isContributor').and.callThrough();
		spyOn(window, 'alert');
		setup();
	});

	afterEach(function() {
		setup();
	});

	describe('Add a global layer', function() {
		it('Add a global layer as session owner', function() {
			// Global as session owner
			platform.layers.addLayer(false, true, false, false);
			expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(2);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(2);
		});

		it('Add a global layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, true, false, false);
			expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			expect(platform.util.isSessionOwner).toThrow();
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(1);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(1);
		});

		it('Add a global layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, true, false, false);
			expect(platform.util.isContributor).toThrow();
			expect(platform.util.isSessionOwner).not.toHaveBeenCalledWith(watcher);
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(1);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(1);
		});
	});

	describe('Add a local layer', function() {
		it('Add a local layer as session owner', function() {
			// Global as session owner
			platform.layers.addLayer(false, false, false, false);
			expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(2);
			expect(Object.keys(platform.layers.localLayers).length).toEqual(1);
		});

		it('Add a local layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, false, false, false);
			expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(2);
			expect(Object.keys(platform.layers.localLayers).length).toEqual(1);
		});

		it('Add a local layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, false, false, false);
			expect(platform.util.isContributor).toThrow();
			expect(platform.layers.addLayer).toHaveBeenCalled();
			expect(platform.layers.addLayerPreview.calls.count()).toEqual(1);
			expect(Object.keys(platform.layers.localLayers).length).toEqual(0);
		});
	});

	describe('Delete a global layer', function() {
		it('Delete a global layer as session owner', function() {
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(1);
		});

		it('Delete a global layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(contributor);
			expect(platform.util.isSessionOwner).toThrow();
			expect(platform.layers.deleteLayer).toHaveBeenCalledWith(layer);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(2);
		});

		it('Delete a global layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(watcher);
			expect(platform.util.isSessionOwner).toThrow();
			expect(platform.layers.deleteLayer).toHaveBeenCalledWith(layer);
			expect(Object.keys(platform.layers.globalLayers).length).toEqual(2);
		});
	});

	describe('Delete a local layer', function() {
		it('Delete a local layer as session owner', function() {
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			expect(Object.keys(platform.layers.localLayers).length).toEqual(0);
		});

		it('Delete a local layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			expect(Object.keys(platform.layers.localLayers).length).toEqual(0);
		});

		it('Delete a local layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.deleteLayer(layer);
			expect(platform.util.isContributor).toThrow();
			expect(Object.keys(platform.layers.localLayers).length).toEqual(1);
		});
	});

	describe('Toggle a global layer', function() {
		it('Toggle a global layer as session owner', function() {
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.toggleGlobalLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(layer.getAttr('global')).toBeTruthy();

			platform.layers.toggleGlobalLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(layer.getAttr('global')).toBeFalsy();
		});

		it('Toggle a global layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.toggleGlobalLayer(layer);
			expect(platform.util.isSessionOwner).toThrow();
			expect(layer.getAttr('global')).toBeFalsy();
		});

		it('Toggle a global layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.toggleGlobalLayer(layer);
			expect(platform.util.isSessionOwner).toThrow();
			expect(layer.getAttr('global')).toBeFalsy();
		});
	});

	it('Toggle layer visibility', function() {
		expect(platform.layers.globalLayers.globalLayer1.isVisible()).toBeTruthy();
		$('#globalLayer1 .toggleVisible').click();
		expect(platform.layers.globalLayers.globalLayer1.isVisible()).toBeFalsy();
	});

	describe('Lock a global layer', function() {
		it('Toggle layer lock on a global layer as session owner', function() {
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.lockLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(layer.getAttr('locked')).toBeTruthy();

			platform.layers.toggleGlobalLayer(layer);
			expect(platform.util.isSessionOwner).toHaveBeenCalledWith(sessionOwner);
			expect(layer.getAttr('global')).toBeFalsy();
		});

		it('Toggle layer lock on a global layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.lockLayer(layer);
			expect(platform.util.isSessionOwner).toThrow();
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(layer.getAttr('locked')).toBeFalsy();
		});

		it('Toggle layer lock on a global layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, true, true, false);
			var layer = platform.layers.globalLayers.globalLayer2;

			platform.layers.lockLayer(layer);
			expect(platform.util.isSessionOwner).toThrow();
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(layer.getAttr('locked')).toBeFalsy();
		});
	});

	describe('Lock a local layer', function() {
		it('Toggle layer lock on a local layer as session owner', function() {
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.lockLayer(layer);
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			expect(layer.getAttr('locked')).toBeTruthy();

			platform.layers.lockLayer(layer);
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(platform.util.isContributor).toHaveBeenCalledWith(sessionOwner);
			expect(layer.getAttr('locked')).toBeFalsy();
		});

		it('Toggle layer lock on a local layer as contributor', function() {
			user = contributor;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.lockLayer(layer);
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			expect(layer.getAttr('locked')).toBeTruthy();

			platform.layers.lockLayer(layer);
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(platform.util.isContributor).toHaveBeenCalledWith(contributor);
			expect(layer.getAttr('locked')).toBeFalsy();
		});

		it('Toggle layer lock on a local layer as a watcher', function() {
			user = watcher;
			platform.layers.addLayer(false, false, true, false);
			var layer = platform.layers.localLayers.localLayer1;

			platform.layers.lockLayer(layer);
			expect(platform.util.isContributor).toThrow();
			expect(platform.layers.lockLayer).toHaveBeenCalled();
			expect(layer.getAttr('locked')).toBeFalsy();
		});
	});

	it('Set active layer', function() {
		platform.layers.addLayer(false, false, true, false);
		var layer = platform.layers.localLayers.localLayer1;

		expect(platform.activeLayer).toEqual(layer);
		$('#globalLayer1').click();
		expect(platform.activeLayer).toEqual(platform.layers.globalLayers.globalLayer1);
	});
});

describe('History tests', function() {
	describe('Undo local action', function() {
		it('Undo last local action as a session owner', function() {
			pending();
		});

		it('Undo last local action as a contributor', function() {
			pending();
		});

		it('Undp last local action as a watcher', function() {
			pending();
		});

		it('Undo last 2 local actions as a session owner', function() {
			pending();
		});

		it('Undo last 2 local actions as a contributor', function() {
			pending();
		});
	});

	describe('Redo local action', function() {
		it('Redo last local action as a session owner', function() {
			pending();
		});

		it('Redo last local action as a contributor', function() {
			pending();
		});

		it('Redo last local action as a watcher', function() {
			pending();
		});
	});

	describe('Undo global action', function() {
		it('Undo last global action as a session owner', function() {
			pending();
		});

		it('Undo last global action as a contributor', function() {
			pending();
		});

		it('Undp last global action as a watcher', function() {
			pending();
		});

		it('Undo last 2 global actions as a session owner', function() {
			pending();
		});

		it('Undo last 2 global actions as a contributor', function() {
			pending();
		});
	});

	describe('Redo global action', function() {
		it('Redo last global action as a session owner', function() {
			pending();
		});

		it('Redo last global action as a contributor', function() {
			pending();
		});

		it('Redo last global action as a watcher', function() {
			pending();
		});
	});

});

describe('Drawing tests', function() {
	it('Draw a line', function() {
		pending();
	});
});