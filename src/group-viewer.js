// group-viewer.js — A component and primitive to re-scale a presentation, provide cursors & markers
// and share with a group using Croquet
// Copyright © 2024 by Doug Reeder under the MIT License

/* global AFRAME, THREE */

const SCALING_FACTOR = 1.1;
const MIN_BOUNDING_BOX = new THREE.Vector3(0.000001, 0.000001, 0.000001);
const CROQUET_DELAY = 17;
const FALLBACK_COLOR = '#ccc';
const CONTROLLER_NAME_LEFT = 'controllerLeft';
const CONTROLLER_NAME_RIGHT = 'controllerRight';
const CURSOR_PREFIX_LEFT = 'cursor-left-';
const CURSOR_PREFIX_RIGHT = 'cursor-right-';

AFRAME.registerComponent('group-viewer', {
	dependencies: [],

	schema: {
		fly: {default: false},
		presentationId: {default: 'presentation'},
		frameSize: {default: {x: 2, y: 2, z: 2}},
		frameCenter: {default: {x: 0, y: 1, z: 0}},
		tps: {type: 'number', default: 20},   // Croquet OS ticks per second

		log: {default: false},
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.horizontalLarger = this.horizontalLarger.bind(this);
		this.handlers.horizontalSmaller = this.horizontalSmaller.bind(this);
		this.handlers.verticalLarger = this.verticalLarger.bind(this);
		this.handlers.verticalSmaller = this.verticalSmaller.bind(this);
		this.handlers.keyDown = this.keyDown.bind(this);
		this.handlers.beginCursorLeft = this.beginCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.beginCursorRight = this.beginCursor.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.endCursorLeft = this.endCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.endCursorRight = this.endCursor.bind(this, CURSOR_PREFIX_RIGHT);

		const data = this.data;
		const el = this.el;

		let camera = document.querySelector('[camera]');
		camera.parentElement.removeChild(camera);

		camera = document.createElement('a-camera');
		camera.setAttribute('wasd-controls-enabled', false);
		camera.setAttribute('position', {x: 0, y: 1.6, z: 0});

		const controlsConfiguration = {hand: 'left'};
		const leftController = document.createElement('a-entity');
		leftController.setAttribute('id', CONTROLLER_NAME_LEFT);
		leftController.setAttribute('laser-controls', controlsConfiguration);
		leftController.setAttribute('raycaster', {objects: '#' + data.presentationId});
		leftController.addEventListener('raycaster-intersection', this.handlers.beginCursorLeft);
		leftController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorLeft);

		controlsConfiguration.hand = 'right';
		const rightController = document.createElement('a-entity');
		rightController.setAttribute('id', CONTROLLER_NAME_RIGHT);
		rightController.setAttribute('laser-controls', controlsConfiguration);
		rightController.setAttribute('raycaster', {objects: '#' + data.presentationId});
		rightController.addEventListener('raycaster-intersection', this.handlers.beginCursorRight);
		rightController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorRight);

		const rig = document.createElement('a-entity');
		rig.setAttribute('id', 'rig');
		rig.setAttribute('movement-controls', {fly: data.fly, speed: 0.1})
		rig.setAttribute('position', {x: 0, y: 0, z: data.frameSize.z / 2 + data.frameCenter.z + 2});
		rig.appendChild(camera);
		rig.appendChild(leftController);
		rig.appendChild(rightController);
		el.sceneEl.appendChild(rig);

		if (data.log) {
			const frame = document.createElement('a-box');
			frame.setAttribute('wireframe', true);
			frame.setAttribute('width', data.frameSize.x);
			frame.setAttribute('height', data.frameSize.y);
			frame.setAttribute('depth', data.frameSize.z);
			frame.setAttribute('position', data.frameCenter);
			frame.setAttribute('color', 'black');
			el.sceneEl.appendChild(frame);
		}
	},

	handlers: {
	},

	horizontalLarger: function (_evt) {
		const data = this.data;

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;

		const scale = {x: presentationObj.scale.x * SCALING_FACTOR, y: presentationObj.scale.y, z: presentationObj.scale.z * SCALING_FACTOR}

		const offset = new THREE.Vector3();
		offset.copy(presentationObj.position).sub(data.frameCenter)
		offset.x *= SCALING_FACTOR;
		offset.z *= SCALING_FACTOR;
		if (data.log) {
			console.log(`group-viewer horizontalLarger scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}
		offset.add(data.frameCenter);

		presentation.setAttribute('scale', scale);
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}
	},

	horizontalSmaller: function (_evt) {
		const data = this.data;

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;

		const scale = {x: presentationObj.scale.x / SCALING_FACTOR, y: presentationObj.scale.y, z: presentationObj.scale.z / SCALING_FACTOR}

		const offset = new THREE.Vector3();
		offset.copy(presentationObj.position).sub(data.frameCenter)
		offset.x /= SCALING_FACTOR;
		offset.z /= SCALING_FACTOR;
		if (data.log) {
			console.log(`group-viewer horizontalSmaller scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}
		offset.add(data.frameCenter);

		presentation.setAttribute('scale', scale);
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}
	},

	verticalLarger: function (_evt) {
		const data = this.data;

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;

		const scale = {x: presentationObj.scale.x, y: presentationObj.scale.y * SCALING_FACTOR, z: presentationObj.scale.z}

		const offset = new THREE.Vector3();
		offset.copy(presentationObj.position).sub(data.frameCenter)
		offset.y *= SCALING_FACTOR;
		if (data.log) {
			console.log(`group-viewer verticalLarger scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}
		offset.add(data.frameCenter);

		presentation.setAttribute('scale', scale);
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}
	},

	verticalSmaller: function (_evt) {
		const data = this.data;

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;

		const scale = {x: presentationObj.scale.x, y: presentationObj.scale.y / SCALING_FACTOR, z: presentationObj.scale.z};

		const offset = new THREE.Vector3();
		offset.copy(presentationObj.position).sub(data.frameCenter)
		offset.y /= SCALING_FACTOR;
		if (data.log) {
			console.log(`group-viewer verticalSmaller scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}
		offset.add(data.frameCenter);

		presentation.setAttribute('scale', scale);
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}
	},

	keyDown: function (evt) {
		if (evt.metaKey || document.activeElement !== document.body) {
			return;
		}
		switch (evt.key) {
			case "[":
				this.horizontalLarger(evt);
				break;
			case "]":
				this.horizontalSmaller(evt);
				break;
			case "{":
				this.verticalLarger(evt);
				break;
			case "}":
				this.verticalSmaller(evt);
				break;
			// default:
			// 	console.log(`no handling for “${evt.key}”`)
		}
	},

	quaternion: new THREE.Quaternion(),

	beginCursor: function (cursorPrefix, evt) {
		const detail = evt.detail;
		if (detail.intersections?.length >= 1) {
			const viewId = document.querySelector('a-scene')?.dataset?.viewId;
			if (!viewId) { return; }
			const userColor = document.querySelector('a-scene')?.dataset?.userColor || FALLBACK_COLOR;
			let cursor = document.getElementById(cursorPrefix + viewId);
			if (!cursor) {
				cursor = document.createElement('a-cone');
				cursor.setAttribute('radius-top', 0.01);
				cursor.setAttribute('radius-bottom', -0.01);
				cursor.setAttribute('height', 0.60);
				cursor.setAttribute('color', userColor);
				cursor.setAttribute('id', cursorPrefix + viewId);
				cursor.setAttribute('multiuser', 'anim:false');
				this.el.sceneEl.appendChild(cursor);
				console.log(`beginCursor ${evt.type} added ${userColor} ${cursorPrefix}`, cursor);
			} else {
				console.log(`beginCursor ${evt.type} using existing ${userColor} ${cursorPrefix}`, cursor);
			}
			cursor.setAttribute('visible', true);
			cursor.setAttribute('position', detail.intersections[0].point);
			this.quaternion.setFromUnitVectors(cursor.object3D.up, detail.intersections[0].normal);
			cursor.setAttribute('rotationquaternion', this.quaternion);
		} else {
			if (CURSOR_PREFIX_LEFT === cursorPrefix) {
				this.handlers.endCursorLeft(evt)
			} else {
				this.handlers.endCursorRight(evt)
			}
		}
	},

	lastCroquetUpdate: 0,

	updateCursors: function (time) {
		if (time - this.lastCroquetUpdate < 1000/this.data.tps) { return; }
		this.lastCroquetUpdate = time;

		for (const [controllerName, cursorPrefix] of [[CONTROLLER_NAME_LEFT, CURSOR_PREFIX_LEFT], [CONTROLLER_NAME_RIGHT, CURSOR_PREFIX_RIGHT]]) {
			const controller = document.getElementById(controllerName);
			if (controller?.components?.raycaster?.intersectedEls?.length > 0) {
				const raycaster = controller.components.raycaster;
				const intersection = raycaster.getIntersection(raycaster?.intersectedEls[0])

				if (intersection) {
					const viewId = document.querySelector('a-scene')?.dataset?.viewId;
					if (!viewId) { continue; }
					const userColor = document.querySelector('a-scene')?.dataset?.userColor || FALLBACK_COLOR;
					let cursor = document.getElementById(cursorPrefix + viewId);

					if (cursor) {
						cursor.setAttribute('position', intersection.point);
						this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.normal);
						cursor.setAttribute('rotationquaternion', this.quaternion);
						console.debug(`updateCursors ${userColor} ${cursorPrefix}:`, intersection.point, intersection.normal, this.quaternion, cursor);
					} else {
						console.error(`updateCursors ${controllerName} intersection, but no ${userColor} ${cursorPrefix}`, intersection.point, intersection.normal, raycaster?.intersectedEls[0])
					}
				} else {
					console.log(`updateCursors ${controllerName} intersectedEl, but no intersection`, raycaster?.intersectedEls[0])
				}
			}
		}
	},

	endCursor: function (cursorPrefix, evt) {
		const viewId = document.querySelector('a-scene')?.dataset?.viewId;
		if (!viewId) { return; }
		const userColor = document.querySelector('a-scene')?.dataset?.userColor || FALLBACK_COLOR;
		console.log(`endCursor ${evt.type} hiding ${userColor} ${cursorPrefix}`, evt.detail, evt.detail?.clearedEls)
		let cursor = document.getElementById(cursorPrefix + viewId);
		cursor?.setAttribute('visible', false);
	},

	/** Called when properties are changed, incl. right after init */
	update: function () {
		const data = this.data;

		console.log(`presentation:`, document.querySelectorAll('#' + data.presentationId));

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;
		if (data.log) {
			console.log("group-viewer update", data, presentation, presentationObj);
		}
		const boundingBox = new THREE.Box3(MIN_BOUNDING_BOX);
		boundingBox.setFromObject(presentationObj);

		const bbSize = new THREE.Vector3();
		boundingBox.getSize(bbSize);
		const scale = Math.min(data.frameSize.x / bbSize.x, data.frameSize.y / bbSize.y, data.frameSize.z / bbSize.z );

		const offset = new THREE.Vector3();
		boundingBox.getCenter(offset);
		offset.multiplyScalar(-scale);

		if (data.log) {
			console.log(`group-viewer update scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}

		presentation.setAttribute('scale', {x: scale, y: scale, z: scale});
		offset.add(data.frameCenter);
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}

		// if (data.log) {
		// 	boundingBox.setFromObject(presentation.object3D);
		// 	const helper = new THREE.Box3Helper( boundingBox, 0xffff00 );
		// 	document.querySelector('a-scene')?.object3D?.add( helper );
		// }
	},

	tick: function (time, timeDelta) {
		this.updateCursors(time);
	},

	pause: function () {
		const data = this.data;
		if (data.log) {
			console.log(`pause`, this.handlers);
		}

		const rightController = document.getElementById(CONTROLLER_NAME_RIGHT);
		rightController.removeEventListener('abuttondown', this.handlers.horizontalLarger)
		rightController.removeEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById(CONTROLLER_NAME_LEFT);
		leftController.removeEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController.removeEventListener('ybuttondown', this.handlers.verticalSmaller);

		window.removeEventListener('keydown', this.handlers.keyDown);
	},

	play: function () {
		const data = this.data;
		if (data.log) {
			console.log(`play`, this.handlers);
		}

		const rightController = document.getElementById(CONTROLLER_NAME_RIGHT);
		rightController.addEventListener('abuttondown', this.handlers.horizontalLarger);
		rightController.addEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById(CONTROLLER_NAME_LEFT);
		leftController.addEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController.addEventListener('ybuttondown', this.handlers.verticalSmaller);

		window.addEventListener('keydown', this.handlers.keyDown);
	},

	/** Called when a component is removed (e.g., via removeAttribute). */
	remove: function () {
	}

});


AFRAME.registerPrimitive('a-group-viewer', {
	defaultComponents: {
		'group-viewer': {}
	},

	mappings: {
		fly: 'group-viewer.fly',
		presentationId: 'group-viewer.presentationId',
		frameSize: 'group-viewer.frameSize',
		frameCenter: 'group-viewer.frameCenter',
		tps: 'group-viewer.tps',

		log: 'group-viewer.log'
	}
});
