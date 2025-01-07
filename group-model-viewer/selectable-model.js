// selectable-model.js — a component and primitive with UI to load a 3-D model
// Copyright © 2025 by Doug Reeder under the MIT License

const FILE_INPT_ID = 'fileInput';
// maximum size of base64-encoded data url w/ 13 required chars + MIME type
const BASE64_CROQUET_MAX = 16384/4*3 - 13 - 255;

AFRAME.registerComponent('selectable-model', {
	dependencies: [],

	schema: { type: 'asset' },

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.openUrl = this.openUrl.bind(this);
		this.handlers.openModelFile = this.openModelFile.bind(this);
		this.handlers.fileInptChange = this.fileInptChange.bind(this);
		this.handlers.modelLoaded = this.modelLoaded.bind(this);
		this.handlers.modelError = this.modelError.bind(this);

		const controlStrip = document.createElement('div');
		controlStrip.style.height = '40px';
		controlStrip.style.width = '95%';
		controlStrip.style.position = 'absolute';
		controlStrip.style.left = '1em';
		controlStrip.style.bottom = '1em';
		controlStrip.style.display = 'flex';
		controlStrip.style.justifyContent = 'flex-start'
		document.body.appendChild(controlStrip);

		const urlInput = document.createElement('input');
		urlInput.setAttribute('id', 'urlInput');
		urlInput.setAttribute('type', 'url');
		urlInput.setAttribute('placeholder', "Paste a URL to a .GLB model");
		urlInput.style.width = '30em';
		controlStrip.appendChild(urlInput);
		urlInput.addEventListener('change', this.handlers.openUrl);

		const openUrlBtn = document.createElement('button');
		openUrlBtn.style.marginLeft = '0.5em';
		openUrlBtn.innerText = "Fetch model from URL";
		controlStrip.appendChild(openUrlBtn);
		openUrlBtn.addEventListener('click', this.handlers.openUrl);

		const openFileBtn = document.createElement('button');
		openFileBtn.style.marginLeft = '2em';
		openFileBtn.innerText = "Select model file";
		controlStrip.appendChild(openFileBtn);
		openFileBtn.addEventListener('click', this.handlers.openModelFile);

		const fileInpt = document.createElement('input');
		fileInpt.setAttribute('id', FILE_INPT_ID);
		fileInpt.setAttribute('type', 'file');
		fileInpt.setAttribute('accept', 'model/gltf-binary,.glb');
		document.body.appendChild(fileInpt);
		fileInpt.addEventListener("change", this.handlers.fileInptChange);
		this.fileInpt = fileInpt;

		this.el.addEventListener('model-loaded', this.handlers.modelLoaded);
		this.el.addEventListener('model-error', this.handlers.modelError);
	},

	handlers: {},

	openUrl: function (evt) {
		const urlInpt = document.querySelector('input[type=url]');
		console.log(`openUrl`, evt, `“${urlInpt?.value}”`);
		this.el.setAttribute('selectable-model', urlInpt.value);
		this.modelNeedsScaling = true;
	},

	openModelFile: function (evt) {
		console.log(`openModelFile`, evt.detail);
		this.fileInpt.click();
	},

	fileInptChange: async function (_evt) {
		console.log(`fileInptChange`, this.fileInpt.files)
		try {
			if (0 === this.fileInpt.files.length) { return; }
			const file = this.fileInpt.files[0];
			const dataIF = this.el.sceneEl.croquetSession?.data;
			if (typeof dataIF?.store === 'function' && file.size > BASE64_CROQUET_MAX) {
				const buffer = await file.arrayBuffer();
				const handle = await dataIF.store(buffer, {});
				const croquetId = dataIF.toId(handle);
				this.el.setAttribute('selectable-model', `croquet:` + croquetId);
				this.modelNeedsScaling = true;
			} else {
				if (typeof dataIF?.store !== 'function') {
					this.showPersistentMsg(`The Croquet API for syncing files has changed`);
				}
				const dataUrl = await fileToDataUrl(file);
				if (dataUrl.length > 16384) {
					this.showPersistentMsg(`“${file.name}” is too big to sync to other users; upload it somewhere and paste the URL below`);
				}
				this.el.setAttribute('selectable-model', dataUrl);
				this.modelNeedsScaling = true;
			}
		} catch (err) {
			this.showPersistentMsg(err);
		}

		function fileToDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = function (evt) {
					const dataUrl = evt.target.result;
					resolve(dataUrl);
				};
				reader.onerror = evt => {
					console.error("fileToDataUrl:", reader.error);
					reject(evt.target.error);
				}
				reader.readAsDataURL(file);
			});
		}
	},

	/** Called when properties are changed, incl. right after init */
	update: async function () {
		try {
			if (!this.data) { return; }
			if (this.objectUrl) {
				URL.revokeObjectURL(this.objectUrl);
				this.objectUrl = null;
			}

			let modelUrl = this.data;

			if (modelUrl.startsWith('croquet:')) {
				const dataIF = this.el.sceneEl.croquetSession?.data;
				const handle = dataIF.fromId(modelUrl.slice('croquet:'.length));
				const byteArray = await dataIF.fetch(handle);
				const blob = new Blob([byteArray], {type: 'model/gltf-binary'});
				this.objectUrl = URL.createObjectURL(blob);
				modelUrl = this.objectUrl;
			}

			// if (! value.startsWith('url(')) {
			// 	value = 'url(' + value + ')';
			// }
			console.log(`selectable-model update GLTF src: “${modelUrl}”`)
			if (!this.gltfEl) {
				this.gltfEl = document.createElement('a-gltf-model');
				this.gltfEl.classList.add(PRESENTATION_CLASS);
				this.el.appendChild(this.gltfEl);
			}
			this.gltfEl.setAttribute('src', modelUrl);
		} catch (err) {
			console.log(`selectable-model update error:`, err);
		}
	},

	modelLoaded: function () {
		if (this.modelNeedsScaling) {
			const groupViewerEl = document.querySelector('[group-viewer]')
			groupViewerEl.emit('scalepresentation');
		}
		this.modelNeedsScaling = false;
	},

	modelError: function (evt) {
		console.error(`selectable-model modelError:`, evt.detail);
		const msg = evt.detail.format ?
			`not a valid ${evt.detail.format} file` :
			`error while loading model: ` + JSON.stringify(evt.detail);
		this.showPersistentMsg(msg);
	},

	pause: function () {
	},

	play: function () {
	},

	/** Called when a component is removed (e.g., via removeAttribute). */
	remove: function () {
		this.el.removeEventListener('model-loaded', this.handlers.modelLoaded);
		this.el.removeEventListener('model-error', this.handlers.modelError);
	},

	showPersistentMsg: function (msg) {
		if (msg instanceof Error) {
			msg = msg.message || msg.name || msg?.toString();
		}

		setTimeout( () => {
			const dialog = document.querySelector('dialog');
			if (! dialog) {
				alert(msg);
			}
			const msgElmt = dialog.firstElementChild ?? dialog;
			msgElmt.innerText = msg;
			dialog.show();
		}, 100);
	},
});
