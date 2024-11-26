// group-viewer.js — A component and primitive to re-scale a presentation, provide markers
// and share with a group using Croquet
// Copyright © 2024 by Doug Reeder under the MIT License

/* global AFRAME, THREE */

const SCALING_FACTOR = 1.1;
const MIN_BOUNDING_BOX = new THREE.Vector3(0.000001, 0.000001, 0.000001);

AFRAME.registerComponent('group-viewer', {
	dependencies: [],

	schema: {
		fly: {default: false},
		presentationId: {default: 'presentation'},
		frameSize: {default: {x: 2, y: 2, z: 2}},
		frameCenter: {default: {x: 0, y: 1, z: 0}},

		log: {default: false}
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.horizontalLarger = this.horizontalLarger.bind(this);
		this.handlers.horizontalSmaller = this.horizontalSmaller.bind(this);
		this.handlers.verticalLarger = this.verticalLarger.bind(this);
		this.handlers.verticalSmaller = this.verticalSmaller.bind(this);

		this.scaleH = 1;
		this.scaleV = 1;
		this.offset = new THREE.Vector3();

		const data = this.data;
		const el = this.el;

		let camera = document.querySelector('[camera]');
		camera.parentElement.removeChild(camera);

		camera = document.createElement('a-camera');
		camera.setAttribute('wasd-controls-enabled', false);
		camera.setAttribute('position', {x: 0, y: 1.6, z: 0});

		const leftController = document.createElement('a-entity');
		leftController.setAttribute('id', 'leftController');
		leftController.setAttribute('oculus-touch-controls', {hand: 'left'});
		const rightController = document.createElement('a-entity');
		rightController.setAttribute('id', 'rightController');
		rightController.setAttribute('oculus-touch-controls', {hand: 'right'});

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

		this.scaleH *= SCALING_FACTOR;
		this.offset.x *= SCALING_FACTOR;
		this.offset.z *= SCALING_FACTOR;

		const presentationObj = document.getElementById(data.presentationId).object3D;
		presentationObj.scale.set(this.scaleH, this.scaleV, this.scaleH);
		presentationObj.position.copy(this.offset).add(data.frameCenter);
	},

	horizontalSmaller: function (_evt) {
		const data = this.data;

		this.scaleH /= SCALING_FACTOR;
		this.offset.x /= SCALING_FACTOR;
		this.offset.z /= SCALING_FACTOR;

		const presentationObj = document.getElementById(data.presentationId).object3D;
		presentationObj.scale.set(this.scaleH, this.scaleV, this.scaleH);
		presentationObj.position.copy(this.offset).add(data.frameCenter);
	},

	verticalLarger: function (_evt) {
		const data = this.data;

		this.scaleV *= SCALING_FACTOR;
		this.offset.y *= SCALING_FACTOR;

		const presentationObj = document.getElementById(data.presentationId).object3D;
		presentationObj.scale.setY(this.scaleV);
		presentationObj.position.y = this.offset.y + data.frameCenter.y;
	},

	verticalSmaller: function (_evt) {
		const data = this.data;

		this.scaleV /= SCALING_FACTOR;
		this.offset.y /= SCALING_FACTOR;

		const presentationObj = document.getElementById(data.presentationId).object3D;
		presentationObj.scale.setY(this.scaleV);
		presentationObj.position.y = this.offset.y + data.frameCenter.y;
	},

	/** Called when properties are changed, incl. right after init */
	update: function () {
		const data = this.data;

		const presentation = document.getElementById(data.presentationId);
		const presentationObj = presentation.object3D;
		if (data.log) {
			console.log("group-viewer update", data, presentation, presentationObj);
		}
		const boundingBox = new THREE.Box3(MIN_BOUNDING_BOX);
		boundingBox.setFromObject(presentationObj);

		const bbSize = new THREE.Vector3();
		boundingBox.getSize(bbSize);
		this.scaleH = this.scaleV = Math.min(data.frameSize.x / bbSize.x, data.frameSize.y / bbSize.y, data.frameSize.z / bbSize.z );

		boundingBox.getCenter(this.offset);
		this.offset.multiplyScalar(-this.scaleH);

		if (data.log) {
			console.log(`scaleH: ${this.scaleH} scaleV: ${this.scaleV}, offset: ${this.offset.x} ${this.offset.y} ${this.offset.z}`);
		}

		presentationObj.scale.set(this.scaleH, this.scaleV, this.scaleH);
		presentationObj.position.copy(this.offset).add(data.frameCenter);

		boundingBox.setFromObject(presentationObj);
		if (data.log) {
			const helper = new THREE.Box3Helper( boundingBox, 0xffff00 );
			document.querySelector('a-scene')?.object3D?.add( helper );
		}
	},

	tick: function (time, timeDelta) {
	},

	pause: function () {
		const data = this.data;
		if (data.log) {
			console.log(`pause`)
		}

		const rightController = document.getElementById('rightController');
		rightController.removeEventListener('abuttondown', this.handlers.horizontalLarger)
		rightController.removeEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById('leftController');
		leftController.removeEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController.removeEventListener('ybuttondown', this.handlers.verticalSmaller);
	},

	play: function () {
		const data = this.data;
		if (data.log) {
			console.log(`play`, this.handlers);
		}

		const rightController = document.getElementById('rightController');
		rightController.addEventListener('abuttondown', this.handlers.horizontalLarger);
		rightController.addEventListener('bbuttondown', this.handlers.horizontalSmaller);

		const leftController = document.getElementById('leftController');
		leftController.addEventListener('xbuttondown', this.handlers.verticalLarger);
		leftController.addEventListener('ybuttondown', this.handlers.verticalSmaller);
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

		log: 'group-viewer.log'
	}
});
