// aframe-presenter.js — A component and primitive to re-scale a presentation, provide cursors & markers
// and present to a group using the Multisynq network
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
const HELP_TEXT =
`Organize meetings using your existing software.

Click “Share session”, or “Copy session URL” then paste the URL into your meeting chat.
While presenting, continue to use your meeting audio.

Any user in VR can display pointers using controllers or hand-tracking.`;

AFRAME.registerComponent('presenter', {
	dependencies: [],

	schema: {
		fly: {default: false},
		presentationId: {default: 'presentation'},
		pointerModelId: {default: 'pointerModel'},
		frameSize: {type: 'vec3', default: {x: 2, y: 2, z: 2}},
		frameCenter: {type: 'vec3', default: {x: 0, y: 1, z: 0}},
		tps: {type: 'number', default: 20},   // Multisynq network ticks per second

		log: {default: false},
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.shareSession = this.shareSession.bind(this);
		this.handlers.copySessionUrl = this.copySessionUrl.bind(this);
		this.handlers.showHelp = this.showPersistentMsg.bind(this, HELP_TEXT);
		this.handlers.userAdded = this.userAdded.bind(this);
		this.handlers.userExit = this.userExit.bind(this);
		this.handlers.horizontalLarger = this.horizontalLarger.bind(this);
		this.handlers.horizontalSmaller = this.horizontalSmaller.bind(this);
		this.handlers.verticalLarger = this.verticalLarger.bind(this);
		this.handlers.verticalSmaller = this.verticalSmaller.bind(this);
		this.handlers.keyDown = this.keyDown.bind(this);
		this.handlers.beginCursorLeft = this.beginCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.beginCursorRight = this.beginCursor.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.updateCursorHandLeft = this.updateCursorHand.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.updateCursorHandRight = this.updateCursorHand.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.endCursorLeft = this.endCursor.bind(this, CURSOR_PREFIX_LEFT);
		this.handlers.endCursorRight = this.endCursor.bind(this, CURSOR_PREFIX_RIGHT);
		this.handlers.enterXR = this.enterXR.bind(this);
		this.handlers.sessionVisibilityChange = this.sessionVisibilityChange.bind(this);
		this.handlers.scalePresentation = this.scalePresentation.bind(this);

		const controlStrip = document.createElement('div');
		controlStrip.style.height = '40px';
		controlStrip.style.width = '95%';
		controlStrip.style.position = 'absolute';
		controlStrip.style.left = '1em';
		controlStrip.style.top = '1em';
		controlStrip.style.display = 'flex';
		controlStrip.style.justifyContent = 'flex-start'
		document.body.appendChild(controlStrip);

		if ('function' === typeof navigator.share) {
			const shareBtn = document.createElement('button');
			shareBtn.innerText = "Share session";
			controlStrip.appendChild(shareBtn);
			shareBtn.addEventListener('click', this.handlers.shareSession);
		}

		const copyBtn = document.createElement('button');
		copyBtn.style.marginLeft = '0.5em';
		copyBtn.innerText = "Copy session URL";
		controlStrip.appendChild(copyBtn);
		copyBtn.addEventListener('click', this.handlers.copySessionUrl);

		const helpBtn = document.createElement('button');
		helpBtn.style.height = '40px';
		helpBtn.style.position = 'absolute';
		helpBtn.style.right = '1em';
		helpBtn.style.top = '1em';
		helpBtn.innerText = "Help";
		document.body.appendChild(helpBtn);
		helpBtn.addEventListener('click', this.handlers.showHelp);

		const data = this.data;
		const el = this.el;

		let camera = document.querySelector('[camera]');
		camera?.parentElement.removeChild(camera);   // replaces any existing camera

		if (AFRAME.utils.device.checkHeadsetConnected() && ! AFRAME.utils.device.isMobile()) {
			camera = document.createElement('a-camera');
			camera.setAttribute('wasd-controls-enabled', false);
			camera.setAttribute('position', {x: 0, y: 1.6, z: 0});

			el.sceneEl.addEventListener('enter-vr', this.handlers.enterXR);

			const controlsConfiguration = {hand: 'left'};
			const leftController = document.createElement('a-entity');
			leftController.setAttribute('id', CONTROLLER_NAME_LEFT);
			leftController.setAttribute('laser-controls', controlsConfiguration);
			leftController.setAttribute('raycaster', {
				objects: '.' + PRESENTATION_CLASS,
				lineOpacity: 0.667,
				far: 10
			});
			leftController.addEventListener('raycaster-intersection', this.handlers.beginCursorLeft);
			leftController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorLeft);
			const leftHand = document.createElement('a-entity');
			leftHand.setAttribute('hand-tracking-controls', 'hand: left; modelColor: gray');
			leftHand.addEventListener('pinchstarted',  this.handlers.updateCursorHandLeft);
			leftHand.addEventListener('pinchmoved', this.handlers.updateCursorHandLeft);
			leftHand.addEventListener('pinchended', this.handlers.endCursorLeft);
			el.sceneEl.addEventListener('exit-vr', this.handlers.endCursorLeft);

			controlsConfiguration.hand = 'right';
			const rightController = document.createElement('a-entity');
			rightController.setAttribute('id', CONTROLLER_NAME_RIGHT);
			rightController.setAttribute('laser-controls', controlsConfiguration);
			rightController.setAttribute('raycaster', {
				objects: '.' + PRESENTATION_CLASS,
				lineOpacity: 0.667,
				far: 10
			});
			rightController.addEventListener('raycaster-intersection', this.handlers.beginCursorRight);
			rightController.addEventListener('raycaster-intersection-cleared', this.handlers.endCursorRight);
			const rightHand = document.createElement('a-entity');
			rightHand.setAttribute('hand-tracking-controls', 'hand: right; modelColor: gray');
			rightHand.addEventListener('pinchstarted',  this.handlers.updateCursorHandRight);
			rightHand.addEventListener('pinchmoved', this.handlers.updateCursorHandRight);
			rightHand.addEventListener('pinchended', this.handlers.endCursorRight);
			el.sceneEl.addEventListener('exit-vr', this.handlers.endCursorRight);

			this.rig = document.createElement('a-entity');
			this.rig.setAttribute('id', 'rig');
			this.rig.setAttribute('movement-controls', {fly: data.fly, speed: 0.1})
			this.rig.setAttribute('position', {x: 0, y: 0, z: data.frameSize.z / 2 + data.frameCenter.z + 2});
			this.rig.appendChild(camera);
			this.rig.appendChild(leftController);
			this.rig.appendChild(leftHand);
			this.rig.appendChild(rightController);
			this.rig.appendChild(rightHand);
			el.sceneEl.appendChild(this.rig);
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

	shareSession: async function (_evt) {
		try {
			const data = {
				title: "Model Presentation",
				text: "Follow this URL to join",
				url: window.location.href
			};
			await navigator.share(data);
		} catch (err) {
			if ("AbortError" !== err.name) {
				this.showTransientMsg(`Sharing failed: ` + (err.message || err.name || err?.toString()));
			}
		}
	},

	copySessionUrl: async function (_evt) {
		try {
			await navigator.clipboard.writeText(window.location.href);
			this.showTransientMsg(`Paste the URL into your meeting chat`);
		} catch (err) {
			this.showTransientMsg(`Copy failed: ` + (err.message || err.name || err?.toString()));
		}
	},

	userAdded: function (evt) {
		console.log(`presenter userAdded`, evt.detail);
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
				console.error(`presenter userAdded can't set initial quaternion nor rotation of rig:`, qInit, rInit);
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
Y button: reduce vertically

In hand-tracking mode, pinch to display pointer.`;
		}

		this.showTransientMsg(`Your color is ${evt.detail.color}.` + controlHelp, evt.detail.color);
	},

	userExit: function (evt) {
		console.log(`presenter userExit`, evt.detail);
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
			console.log(`presenter horizontalLarger scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
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
			console.log(`presenter horizontalSmaller scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
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
			console.log(`presenter verticalLarger scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
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
			console.log(`presenter verticalSmaller scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
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

	/** laser-controls */
	beginCursor: function (cursorPrefix, evt) {
		const detail = evt.detail;
		if (detail.intersections?.length >= 1) {
			const cursor = this.showCursor(cursorPrefix, evt);
			const intersection = detail.intersections[0];
			if (intersection?.point?.isVector3) {
				cursor.setAttribute('position', intersection.point);
			} else {
				console.debug(`presenter: beginCursor: intersection has no point:`, intersection);
			}
			if (intersection?.normal?.isVector3) {
				this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.normal);
				cursor.setAttribute('rotationquaternion', this.quaternion);
			} else if (intersection?.face?.normal?.isVector3) {
				this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.face.normal);
				cursor.setAttribute('rotationquaternion', this.quaternion);
			} else {
				console.debug(`presenter: beginCursor: intersection has no normal:`, intersection);
			}
		} else {
			if (CURSOR_PREFIX_LEFT === cursorPrefix) {
				this.handlers.endCursorLeft(evt)
			} else {
				this.handlers.endCursorRight(evt)
			}
		}
	},

	vector3: new THREE.Vector3(),

	lastCroquetHandUpdate: 0,

	/** hand-tracking-controls */
	updateCursorHand: function(cursorPrefix, evt) {
		const isSyncTime = Date.now() - this.lastCroquetHandUpdate > 1000/this.data.tps
		if (isSyncTime) {
			this.lastCroquetHandUpdate = Date.now();
		}

		let cursor;
		if ('pinchstarted' === evt.type) {
			cursor = this.showCursor(cursorPrefix, evt);
			console.log(`presenter ${evt.type}:`, cursorPrefix, evt.detail.position, evt.detail.wristRotation);
		} else {
			const viewId = document.querySelector('a-scene')?.dataset?.viewId;
			cursor = document.getElementById(cursorPrefix + viewId);
			console.debug(`presenter ${evt.type}:`, cursorPrefix, evt.detail.position, evt.detail.wristRotation);
		}
		if (evt.detail.position) {
			evt.detail.position.applyMatrix4(this.rig.object3D.matrixWorld)
			if (isSyncTime) {
				cursor?.setAttribute?.('position', evt.detail.position);
			} else {
				cursor?.setAttributeAFrame?.('position', evt.detail.position);
			}
		}
		if (evt.detail.wristRotation?.isQuaternion) {
			this.quaternion.setFromRotationMatrix(this.rig.object3D.matrixWorld);
			evt.detail.wristRotation.multiply(Q.FLIP_Z).multiply(this.quaternion);
			if (isSyncTime) {
				cursor?.setAttribute?.('rotationquaternion', evt.detail.wristRotation);
			} else {
				cursor?.setAttributeAFrame?.('rotationquaternion', evt.detail.wristRotation);
			}
		}
	},

	showCursor: function(cursorPrefix, evt) {
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
			console.log(`showCursor ${evt.type} added ${userColor} ${cursorPrefix}`, cursor);
		} else {
			console.log(`showCursor ${evt.type} using existing ${userColor} ${cursorPrefix}`, cursor);
		}
		cursor.setAttribute('visible', true);
		return cursor;
	},

	lastCroquetUpdate: 0,

	/** laser-controls */
	updateCursors: function (time) {
		const isSyncTime = time - this.lastCroquetUpdate > 1000/this.data.tps;
		if (isSyncTime) {
			this.lastCroquetUpdate = time;
		}

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
							if (isSyncTime) {
								cursor?.setAttribute?.('position', intersection.point);
							} else {
								cursor?.setAttributeAFrame?.('position', intersection.point);
							}
						} else {
							console.debug(`presenter: updateCursors: intersection has no point:`, intersection);
						}
						if (intersection?.normal?.isVector3) {
							this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.normal);
							if (isSyncTime) {
								cursor?.setAttribute?.('rotationquaternion', this.quaternion);
							} else {
								cursor?.setAttributeAFrame?.('rotationquaternion', this.quaternion);
							}
						} else if (intersection?.face?.normal?.isVector3) {
							this.quaternion.setFromUnitVectors(cursor.object3D.up, intersection.face.normal);
							if (isSyncTime) {
								cursor?.setAttribute?.('rotationquaternion', this.quaternion);
							} else {
								cursor?.setAttributeAFrame?.('rotationquaternion', this.quaternion);
							}
						} else {
							console.debug(`presenter: updateCursors: intersection has no normal:`, intersection);
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

	/** both laser-controls and hand-tracking-controls */
	endCursor: function (cursorPrefix, evt) {
		const viewId = document.querySelector('a-scene')?.dataset?.viewId;
		if (!viewId) { return; }
		const userColor = document.querySelector('a-scene')?.dataset?.userColor || FALLBACK_COLOR;
		console.log(`endCursor ${evt.type} hiding ${userColor} ${cursorPrefix}`, evt.detail, evt.detail?.clearedEls)
		let cursor = document.getElementById(cursorPrefix + viewId);
		cursor?.setAttribute('visible', false);
	},

	enterXR: function (evt) {
		this.el.sceneEl.xrSession.addEventListener('visibilitychange', this.handlers.sessionVisibilityChange);
	},

	/** handles both left & right cursors */
	sessionVisibilityChange: function (evt) {
		console.debug(`presenter visibilitychange:`, evt.session.visibilityState, evt.session);
		switch (evt.session.visibilityState) {
			case "hidden":
			case "visible-blurred":
				this.endCursor(CURSOR_PREFIX_LEFT, evt);
				this.endCursor(CURSOR_PREFIX_RIGHT, evt);
				break;
			case "visible":
				const viewId = document.querySelector('a-scene')?.dataset?.viewId;
				for (const [controllerName, cursorPrefix] of [[CONTROLLER_NAME_LEFT, CURSOR_PREFIX_LEFT], [CONTROLLER_NAME_RIGHT, CURSOR_PREFIX_RIGHT]]) {
					const controller = document.getElementById(controllerName);
					if (controller?.components?.raycaster?.intersectedEls?.length > 0) {
						const cursor = document.getElementById(cursorPrefix + viewId);
						cursor?.setAttribute('visible', true);
					}
				}
				break;
			default:
				break;
		}
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
			console.log(`presenter update presentation:`, document.querySelectorAll('#' + this.data.presentationId));
		}
	},

	scalePresentation: function (_evt) {
		const data = this.data;
		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;
		if (data.log) {
			console.log("presenter scalePresentation", data, presentation, presentationObj);
		}
		presentationObj.scale.x = presentationObj.scale.y = presentationObj.scale.z = 1;
		presentationObj.position.x = presentationObj.position.y = presentationObj.position.z = 0;
		const boundingBox = new THREE.Box3();
		boundingBox.setFromObject(presentationObj);

		const bbSize = new THREE.Vector3();
		boundingBox.getSize(bbSize);
		let scale = Math.min(data.frameSize.x / bbSize.x, data.frameSize.y / bbSize.y, data.frameSize.z / bbSize.z);
		console.log(`presenter scalePresentation boundingBox:`, scale, bbSize, JSON.stringify(boundingBox));
		if (Infinity === scale) {
			scale = 1;
		}

		const offset = new THREE.Vector3();
		boundingBox.getCenter(offset);
		offset.multiplyScalar(-scale);
		offset.add(data.frameCenter);

		if (data.log) {
			console.log(`presenter scalePresentation scale: ${JSON.stringify(scale)}  offset: ${JSON.stringify(offset)}`);
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
		const leftController = document.getElementById(CONTROLLER_NAME_LEFT);
		leftController?.parentElement.removeChild(leftController);
		const rightController = document.getElementById(CONTROLLER_NAME_RIGHT);
		rightController?.parentElement.removeChild(rightController);

		this.el.sceneEl.removeEventListener('user-added', this.handlers.userAdded);
		this.el.sceneEl.removeEventListener('user-exit', this.handlers.userExit);
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
				this.transientDialog.style.right = '1em';
				this.transientDialog.style.marginRight = '0';
				this.transientDialog.style.left = '1em';
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
				this.persistentDialog.style.left = '1em';
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


AFRAME.registerPrimitive('a-presenter', {
	defaultComponents: {
		'presenter': {}
	},

	mappings: {
		fly: 'presenter.fly',
		presentationId: 'presenter.presentationId',
		frameSize: 'presenter.frameSize',
		frameCenter: 'presenter.frameCenter',
		tps: 'presenter.tps',

		log: 'presenter.log'
	}
});
