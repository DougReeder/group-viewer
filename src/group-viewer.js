// group-viewer.js — A component and primitive to re-scale a presentation, provide markers
// and share with a group using Croquet
// Copyright © 2024 by Doug Reeder under the MIT License

/* global AFRAME, THREE */

const MIN_BOUNDING_BOX = new THREE.Vector3(0.000001, 0.000001, 0.000001);

AFRAME.registerComponent('group-viewer', {
	dependencies: [],

	schema: {
		presentationId: {default: 'presentation'},
		frameSize: {default: {x: 2, y: 2, z: 2}},
		frameCenter: {default: {x: 0, y: 1, z: 0}},

		log: {default: false}
	},

	events: {

	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
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
		rig.setAttribute('movement-controls', {fly: true, speed: 0.1})
		rig.setAttribute('position', {x: 0, y: 0, z: data.frameSize.z / 2 + data.frameCenter.z + 2});
		rig.appendChild(camera);
		rig.appendChild(leftController);
		rig.appendChild(rightController);
		el.sceneEl.appendChild(rig);
	},

	/** Called when properties are changed, incl. right after init */
	update: function () {
		const data = this.data;
		const el = this.el;

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

		const offset = new THREE.Vector3();
		boundingBox.getCenter(offset);
		offset.multiplyScalar(-this.scaleH);

		if (data.log) {
			console.log(`scaleH: ${this.scaleH} scaleV: ${this.scaleV}, offset: ${offset.x} ${offset.y} ${offset.z}`);
		}

		presentationObj.scale.set(this.scaleH, this.scaleV, this.scaleH);
		presentationObj.position.copy(offset).add(data.frameCenter);

		boundingBox.setFromObject(presentationObj);
		if (data.log) {
			const helper = new THREE.Box3Helper( boundingBox, 0xffff00 );
			document.querySelector('a-scene')?.object3D?.add( helper );
		}
	},

	tick: function (time, timeDelta) {
	},

	pause: function () {
	},

	play: function () {
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
		presentationId: 'group-viewer.presentationId',
		frameSize: 'group-viewer.frameSize',
		frameCenter: 'group-viewer.frameCenter',

		log: 'group-viewer.log'
	}
});
