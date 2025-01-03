// selectable-model.js — a component and primitive with UI to load a 3-D model
// Copyright © 2025 by Doug Reeder under the MIT License

const FILE_INPT_ID = 'fileInput';

AFRAME.registerComponent('selectable-model', {
	dependencies: [],

	schema: { type: 'asset' },

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.openModelFile = this.openModelFile.bind(this);
		this.handlers.fileInptChange = this.fileInptChange.bind(this);
		this.handlers.modelLoaded = this.modelLoaded.bind(this);
		this.handlers.modelError = this.modelError.bind(this);

		const openFileBtn = document.createElement('button');
		openFileBtn.style.height = '40px';
		openFileBtn.style.position = 'absolute';
		openFileBtn.style.left = '1em';
		openFileBtn.style.bottom = '1em';
		openFileBtn.innerText = "Select model file";
		document.body.appendChild(openFileBtn);
		openFileBtn.addEventListener('click', this.handlers.openModelFile);

		const fileInpt = document.createElement('input');
		fileInpt.setAttribute('id', FILE_INPT_ID);
		fileInpt.setAttribute('type', 'file');
		fileInpt.setAttribute('accept', 'model/gltf+json,model/gltf-binary,.gltf,.glb');
		document.body.appendChild(fileInpt);
		fileInpt.addEventListener("change", this.handlers.fileInptChange);
		this.fileInpt = fileInpt;

		this.el.addEventListener('model-loaded', this.handlers.modelLoaded);
		this.el.addEventListener('model-error', this.handlers.modelError);
	},

	handlers: {},

	openModelFile: function (evt) {
		console.log(`openModelFile`, evt.detail);
		this.fileInpt.click();
	},

	fileInptChange: async function (_evt) {
		console.log(`fileInptChange`, this.fileInpt.files)
		try {
			if (this.fileInpt.files.length > 0) {
				const dataUrl = await fileToDataUrl(this.fileInpt.files[0]);
				if (dataUrl.length > 16384) {
					this.showPersistentMsg(`“${this.fileInpt.files[0].name}” is too big to sync to other users; upload it somewhere and use the URL`);
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
	update: function () {
		if (!this.data) { return; }
		let value = this.data;
		if (! value.startsWith('url(')) {
			value = 'url(' + value + ')';
		}
		console.log(`selectable-model update “${value?.slice(0, 60)}...”`)
		this.el.setAttribute('gltf-model', value);
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
