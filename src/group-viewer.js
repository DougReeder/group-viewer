// group-viewer.js — A component and primitive to re-scale a presentation, provide cursors & markers
// and share with a group using Croquet
// Copyright © 2024–2025 by Doug Reeder under the MIT License

/* global AFRAME, THREE */

const SCALING_FACTOR = 1.1;
const CROQUET_DELAY = 17;
const FALLBACK_COLOR = '#ccc';
const PRESENTATION_CLASS = 'presentation';
const CONTROLLER_NAME_LEFT = 'controllerLeft';
const CONTROLLER_NAME_RIGHT = 'controllerRight';
const CURSOR_PREFIX_LEFT = 'cursor-left-';
const CURSOR_PREFIX_RIGHT = 'cursor-right-';

AFRAME.registerComponent('group-viewer', {
	dependencies: [],

	schema: {
		fly: {default: false},
		presentationId: {default: 'presentation'},
		pointerModelId: {default: 'pointerModel'},
		frameSize: {type: 'vec3', default: {x: 2, y: 2, z: 2}},
		frameCenter: {type: 'vec3', default: {x: 0, y: 1, z: 0}},
		tps: {type: 'number', default: 20},   // Croquet OS ticks per second

		log: {default: false},
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.userAdded = this.userAdded.bind(this);
		this.handlers.userExit = this.userExit.bind(this);
		this.handlers.horizontalLarger = this.horizontalLarger.bind(this);
		this.handlers.horizontalSmaller = this.horizontalSmaller.bind(this);
		this.handlers.verticalLarger = this.verticalLarger.bind(this);
		this.handlers.verticalSmaller = this.verticalSmaller.bind(this);
		this.handlers.keyDown = this.keyDown.bind(this);
		this.handlers.beginCursorLeft = this.beginCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.beginCursorRight = this.beginCursor.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.endCursorLeft = this.endCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.endCursorRight = this.endCursor.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.scalePresentation = this.scalePresentation.bind(this);

		const data = this.data;
		const el = this.el;

		let camera = document.querySelector('[camera]');
		camera?.parentElement.removeChild(camera);   // replaces any existing camera

		if (AFRAME.utils.device.checkHeadsetConnected() && ! AFRAME.utils.device.isMobile()) {
			camera = document.createElement('a-camera');
			camera.setAttribute('wasd-controls-enabled', false);
			camera.setAttribute('position', {x: 0, y: 1.6, z: 0});

			const controlsConfiguration = {hand: 'left'};
			const leftController = document.createElement('a-entity');
			leftController.setAttribute('id', CONTROLLER_NAME_LEFT);
			leftController.setAttribute('laser-controls', controlsConfiguration);
			leftController.setAttribute('raycaster', {objects: '.' + PRESENTATION_CLASS});
			leftController.addEventListener('raycaster-intersection', this.handlers.beginCursorLeft);
			leftController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorLeft);
			el.sceneEl.addEventListener('exit-vr', this.handlers.endCursorLeft);

			controlsConfiguration.hand = 'right';
			const rightController = document.createElement('a-entity');
			rightController.setAttribute('id', CONTROLLER_NAME_RIGHT);
			rightController.setAttribute('laser-controls', controlsConfiguration);
			rightController.setAttribute('raycaster', {objects: '.' + PRESENTATION_CLASS});
			rightController.addEventListener('raycaster-intersection', this.handlers.beginCursorRight);
			rightController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorRight);
			el.sceneEl.addEventListener('exit-vr', this.handlers.endCursorRight);

			const rig = document.createElement('a-entity');
			rig.setAttribute('id', 'rig');
			rig.setAttribute('movement-controls', {fly: data.fly, speed: 0.1})
			rig.setAttribute('position', {x: 0, y: 0, z: data.frameSize.z / 2 + data.frameCenter.z + 2});
			rig.appendChild(camera);
			rig.appendChild(leftController);
			rig.appendChild(rightController);
			el.sceneEl.appendChild(rig);
		} else {
			camera = document.createElement('a-camera');
			camera.setAttribute('look-controls-enabled', false);
			camera.setAttribute('wasd-controls-enabled', false);
			const theta = Math.random() * 2 * Math.PI;   // temporary position not same as other users
			camera.setAttribute('orbit-controls', {
				minDistance: 0.75,
				maxDistance: 50,
				target: data.frameCenter,
				cursor: data.frameCenter,
				initialPosition: {x: 2 * Math.sin(theta), y: 1.6, z: 2 * Math.cos(theta)},
				rotateSpeed: 0.2,
				zoomSpeed: 0.2,
			});
			camera.setAttribute('position', {x: 0, y: 0, z: 0});
			el.sceneEl.appendChild(camera);
		}
		el.sceneEl.addEventListener('user-added', this.handlers.userAdded);
		el.sceneEl.addEventListener('user-exit', this.handlers.userExit);

		el.addEventListener('scalepresentation', this.handlers.scalePresentation);

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

	userAdded: function (evt) {
		console.log(`group-viewer userAdded`, evt.detail);
		if (evt.detail.viewId !== this.el.sceneEl.dataset.viewId) { return; }

		const cameraEnt = document.querySelector('[camera]');
		const orbitControls = AFRAME.utils.entity.getComponentProperty(cameraEnt, 'orbit-controls');

		if (orbitControls) {
			const position = {x: evt.detail.position?.x ?? 0, y: evt.detail.position?.y ?? 1.6, z: evt.detail.position?.z ?? -2.5};
			const cameraObj = cameraEnt.getObject3D('camera');
			cameraObj?.position?.copy(position);
		} else {
			const rigEnt = cameraEnt.parentElement;
			const position = {x: evt.detail.position?.x ?? 0, y: 0, z: evt.detail.position?.z ?? -2.5};
			rigEnt.setAttribute('position', position);

			const qInit = evt.detail.rotationquaternion;
			const rInit = evt.detail.rotation;
			if (Number.isFinite(qInit?.x) && Number.isFinite(qInit?.y) &&
				Number.isFinite(qInit?.z) && Number.isFinite(qInit?.w)) {
				rigEnt.setAttribute('rotationquaternion', qInit);
			} else if (Number.isFinite(rInit?.x) && Number.isFinite(rInit?.y) && Number.isFinite(rInit?.z)) {
				const rotation = {x: rInit.x, y: rInit.y - 180, z: rInit.z};
				rigEnt.setAttribute('rotation', rotation);
			} else {
				console.error(`group-viewer userAdded can't set initial quaternion nor rotation of rig:`, qInit, rInit);
			}
		}

		let controlHelp = "";
		if (orbitControls) {
			if (AFRAME.utils.device.isMobile()) {
				controlHelp = `

Drag to orbit.
Two-finger drag up-down to zoom.
Two-finger drag sideways to pan.`;
			} else {
				controlHelp = `

Drag to orbit.
Mousewheel to zoom.
Drag with right mouse button to pan.`;
			}

			if (AFRAME.utils.device.isMobile()) {
				controlHelp = `

Drag to orbit.
Two-finger drag up-down to zoom.
Two-finger drag sideways to pan.`;
			} else {
				controlHelp = `

Drag to orbit.
Mousewheel to zoom.
Drag with right mouse button to pan.`;
			}
		} else {
			controlHelp = `

left joystick: move
right joystick: rotate
A button: enlarge horizontally
B button: reduce horizontally
X button: enlarge vertically
Y button: reduce vertically`;
		}

		this.showTransientMsg(`Your color is ${evt.detail.color}.` + controlHelp, evt.detail.color);
	},

	userExit: function (evt) {
		console.log(`group-viewer userExit`, evt.detail);
		// Hides cursors of *other* user.
		for (const cursorPrefix of [CURSOR_PREFIX_LEFT, CURSOR_PREFIX_RIGHT]) {
			const cursor = document.getElementById(cursorPrefix + evt.detail.viewId);
			cursor?.setAttribute('visible', false);
		}
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
			case "-":
				this.verticalLarger(evt);
				break;
			case "=":
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
				if (document.getElementById(this.data.pointerModelId)) {
					cursor = document.createElement('a-gltf-model');
					cursor.setAttribute('src', '#' + this.data.pointerModelId);
					cursor.setAttribute('object-tint', userColor);
				} else {   // falls back to cones on both sides of each face
					cursor = document.createElement('a-cone');
					cursor.setAttribute('radius-top', 0.01);
					cursor.setAttribute('radius-bottom', -0.01);
					cursor.setAttribute('height', 0.60);
					cursor.setAttribute('color', userColor);
				}
				cursor.setAttribute('id', cursorPrefix + viewId);
				cursor.setAttribute('multiuser', 'anim:false');
				this.el.sceneEl.appendChild(cursor);
				console.log(`beginCursor ${evt.type} added ${userColor} ${cursorPrefix}`, cursor);
			} else {
				console.log(`beginCursor ${evt.type} using existing ${userColor} ${cursorPrefix}`, cursor);
			}
			cursor.setAttribute('visible', true);
			const intersection = detail.intersections[0];
			if (intersection?.point?.isVector3) {
				cursor.setAttribute('position', intersection.point);
			} else {
				console.debug(`group-viewer: beginCursor: intersection has no point:`, intersection);
			}
			if (intersection?.normal?.isVector3) {
				this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.normal);
				cursor.setAttribute('rotationquaternion', this.quaternion);
			} else if (intersection?.face?.normal?.isVector3) {
				this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.face.normal);
				cursor.setAttribute('rotationquaternion', this.quaternion);
			} else {
				console.debug(`group-viewer: beginCursor: intersection has no normal:`, intersection);
			}
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
						if (intersection?.point?.isVector3) {
							cursor.setAttribute('position', intersection.point);
						} else {
							console.debug(`group-viewer: updateCursors: intersection has no point:`, intersection);
						}
						if (intersection?.normal?.isVector3) {
							this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.normal);
							cursor.setAttribute('rotationquaternion', this.quaternion);
						} else if (intersection?.face?.normal?.isVector3) {
							this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.face.normal);
							cursor.setAttribute('rotationquaternion', this.quaternion);
						} else {
							console.debug(`group-viewer: updateCursors: intersection has no normal:`, intersection);
						}
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
	update: function (oldData) {
		const oldPresentation = document.getElementById(oldData.presentationId);
		oldPresentation?.classList.remove(PRESENTATION_CLASS);
		const newPresentation = document.getElementById(this.data.presentationId);
		newPresentation?.classList.add(PRESENTATION_CLASS);
		if (!newPresentation) {
			this.showPersistentMsg(`no element with presentation id “${this.data.presentationId}”`);
		}

		if (this.data.log) {
			console.log(`group-viewer update presentation:`, document.querySelectorAll('#' + this.data.presentationId));
		}
	},

	scalePresentation: function (_evt) {
		const data = this.data;
		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;
		if (data.log) {
			console.log("group-viewer scalePresentation", data, presentation, presentationObj);
		}
		presentationObj.scale.x = presentationObj.scale.y = presentationObj.scale.z = 1;
		presentationObj.position.x = presentationObj.position.y = presentationObj.position.z = 0;
		const boundingBox = new THREE.Box3();
		boundingBox.setFromObject(presentationObj);

		const bbSize = new THREE.Vector3();
		boundingBox.getSize(bbSize);
		let scale = Math.min(data.frameSize.x / bbSize.x, data.frameSize.y / bbSize.y, data.frameSize.z / bbSize.z);
		console.log(`group-viewer scalePresentation boundingBox:`, scale, bbSize, JSON.stringify(boundingBox));
		if (Infinity === scale) {
			scale = 1;
		}

		const offset = new THREE.Vector3();
		boundingBox.getCenter(offset);
		offset.multiplyScalar(-scale);
		offset.add(data.frameCenter);

		if (data.log) {
			console.log(`group-viewer scalePresentation scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
		}

		presentation.setAttribute('scale', {x: scale, y: scale, z: scale});
		if (! offset.equals(presentationObj.position)) {
			presentation.setAttribute('position', offset);
		}

		if (this.boxHelper) {
			this.el.sceneEl.object3D?.remove?.(this.boxHelper);
		}
		if (data.log) {
			boundingBox.setFromObject(presentationObj);
			if (!boundingBox.isEmpty()) {
				this.boxHelper = new THREE.Box3Helper( boundingBox, 0xffff00 );
				this.el.sceneEl.object3D?.add?.(this.boxHelper);
			}
		}
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
		rightController?.removeEventListener('abuttondown', this.handlers.horizontalLarger)
		rightController?.removeEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById(CONTROLLER_NAME_LEFT);
		leftController?.removeEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController?.removeEventListener('ybuttondown', this.handlers.verticalSmaller);

		window.removeEventListener('keydown', this.handlers.keyDown);
	},

	play: function () {
		const data = this.data;
		if (data.log) {
			console.log(`play`, this.handlers);
		}

		const rightController = document.getElementById(CONTROLLER_NAME_RIGHT);
		rightController?.addEventListener('abuttondown', this.handlers.horizontalLarger);
		rightController?.addEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById(CONTROLLER_NAME_LEFT);
		leftController?.addEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController?.addEventListener('ybuttondown', this.handlers.verticalSmaller);

		window.addEventListener('keydown', this.handlers.keyDown);
	},

	/** Called when a component is removed (e.g., via removeAttribute). */
	remove: function () {
		this.el.removeEventListener('scalepresentation', this.handlers.scalePresentation);
	},

	showTransientMsg: function (msg, colorName) {
		if (msg instanceof Error) {
			msg = msg.message || msg.name || msg?.toString();
		}

		setTimeout( () => {
			if (!this.transientDialog) {
				this.transientDialog = document.createElement('dialog');
				this.transientDialog.style.top = '1em';
				this.transientDialog.style.left = '1em';
				this.transientDialog.style.marginLeft = '0';
				document.body.appendChild(this.transientDialog);
				const div = document.createElement('div');
				this.transientDialog.appendChild(div);
			}
			const msgElmt = this.transientDialog.firstElementChild ?? this.transientDialog;
			msgElmt.innerText = msg;
			let contrastColor;
			if (colorName) {
				contrastColor = ['red', 'green', 'blue', 'purple', 'black'].includes(colorName) ? 'white' : 'black';
			} else {
				colorName = 'white';
				contrastColor = 'black';
			}
			this.transientDialog.style.backgroundColor = colorName;
			this.transientDialog.style.color = contrastColor;
			this.transientDialog.show();

			setTimeout(this.transientDialog.close.bind(this.transientDialog),7000);
		}, 100);
	},

	showPersistentMsg: function (msg) {
		if (msg instanceof Error) {
			msg = msg.message || msg.name || msg?.toString();
		}

		setTimeout( () => {
			if (!this.persistentDialog) {
				this.persistentDialog = document.createElement('dialog');
				this.persistentDialog.style.top = '1em';
				this.persistentDialog.style.right = '1em';
				this.persistentDialog.style.marginRight = '0';
				document.body.appendChild(this.persistentDialog);
				const div = document.createElement('div');
				this.persistentDialog.appendChild(div);
				const form = document.createElement('form');
				form.setAttribute('method', 'dialog');
				this.persistentDialog.appendChild(form);
				const button = document.createElement('button');
				button.innerText = 'OK';
				button.autofocus = true;
				button.style.marginBlockStart = '1em';
				form.appendChild(button);
			}
			const msgElmt = this.persistentDialog.firstElementChild ?? this.persistentDialog;
			msgElmt.innerText = msg;
			this.persistentDialog.show();
		}, 100);
	},
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
