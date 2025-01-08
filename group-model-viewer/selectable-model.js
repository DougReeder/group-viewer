// selectable-model.js — a component and primitive with UI to load a 3-D model
// Copyright © 2025 by Doug Reeder under the MIT License

const FILE_INPT_ID = 'fileInput';
// maximum size of base64-encoded data url w/ 13 required chars + MIME type
const BASE64_CROQUET_MAX = 16384/4*3 - 13 - 255;
const ANIMATE_ID = 'animateChkbox';
const SPINNER_ID = 'spinner';
const SPINNER_URL = `data:application/octet-stream;base64,Z2xURgIAAACAEwAAZAgAAEpTT057ImFzc2V0Ijp7ImdlbmVyYXRvciI6Iktocm9ub3MgZ2xURiBCbGVuZGVyIEkvTyB2NC4yLjYwIiwidmVyc2lvbiI6IjIuMCJ9LCJzY2VuZSI6MCwic2NlbmVzIjpbeyJuYW1lIjoiU2NlbmUiLCJub2RlcyI6WzBdfV0sIm5vZGVzIjpbeyJtZXNoIjowLCJuYW1lIjoiQ3ViZSIsInJvdGF0aW9uIjpbMC4zNjU1NDU0NTE2NDEwODI3NiwtMC4xNzU4MTkyOTI2NjQ1Mjc5LC0wLjM0MTE0MDAzMTgxNDU3NTIsMC44NDc5OTAzMzQwMzM5NjYxXX1dLCJhbmltYXRpb25zIjpbeyJjaGFubmVscyI6W3sic2FtcGxlciI6MCwidGFyZ2V0Ijp7Im5vZGUiOjAsInBhdGgiOiJ0cmFuc2xhdGlvbiJ9fSx7InNhbXBsZXIiOjEsInRhcmdldCI6eyJub2RlIjowLCJwYXRoIjoicm90YXRpb24ifX0seyJzYW1wbGVyIjoyLCJ0YXJnZXQiOnsibm9kZSI6MCwicGF0aCI6InNjYWxlIn19XSwibmFtZSI6IkN1YmVBY3Rpb24iLCJzYW1wbGVycyI6W3siaW5wdXQiOjQsImludGVycG9sYXRpb24iOiJTVEVQIiwib3V0cHV0Ijo1fSx7ImlucHV0Ijo2LCJpbnRlcnBvbGF0aW9uIjoiTElORUFSIiwib3V0cHV0Ijo3fSx7ImlucHV0Ijo0LCJpbnRlcnBvbGF0aW9uIjoiU1RFUCIsIm91dHB1dCI6OH1dfV0sIm1hdGVyaWFscyI6W3siZG91YmxlU2lkZWQiOnRydWUsIm5hbWUiOiJNYXRlcmlhbCIsInBick1ldGFsbGljUm91Z2huZXNzIjp7ImJhc2VDb2xvckZhY3RvciI6WzAuODAwMDAwMDExOTIwOTI5LDAuODAwMDAwMDExOTIwOTI5LDAuODAwMDAwMDExOTIwOTI5LDFdLCJtZXRhbGxpY0ZhY3RvciI6MCwicm91Z2huZXNzRmFjdG9yIjowLjV9fV0sIm1lc2hlcyI6W3sibmFtZSI6IkN1YmUiLCJwcmltaXRpdmVzIjpbeyJhdHRyaWJ1dGVzIjp7IlBPU0lUSU9OIjowLCJOT1JNQUwiOjEsIlRFWENPT1JEXzAiOjJ9LCJpbmRpY2VzIjozLCJtYXRlcmlhbCI6MH1dfV0sImFjY2Vzc29ycyI6W3siYnVmZmVyVmlldyI6MCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjI0LCJtYXgiOlsxLDEsMV0sIm1pbiI6Wy0xLC0xLC0xXSwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwidHlwZSI6IlZFQzMifSx7ImJ1ZmZlclZpZXciOjIsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyNCwidHlwZSI6IlZFQzIifSx7ImJ1ZmZlclZpZXciOjMsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiJ9LHsiYnVmZmVyVmlldyI6NCwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjIsIm1heCI6WzRdLCJtaW4iOlswLjA0MTY2NjY2NjY2NjY2NjY2NF0sInR5cGUiOiJTQ0FMQVIifSx7ImJ1ZmZlclZpZXciOjUsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50IjoyLCJ0eXBlIjoiVkVDMyJ9LHsiYnVmZmVyVmlldyI6NiwiY29tcG9uZW50VHlwZSI6NTEyNiwiY291bnQiOjk2LCJtYXgiOls0XSwibWluIjpbMC4wNDE2NjY2NjY2NjY2NjY2NjRdLCJ0eXBlIjoiU0NBTEFSIn0seyJidWZmZXJWaWV3Ijo3LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6OTYsInR5cGUiOiJWRUM0In0seyJidWZmZXJWaWV3Ijo4LCJjb21wb25lbnRUeXBlIjo1MTI2LCJjb3VudCI6MiwidHlwZSI6IlZFQzMifV0sImJ1ZmZlclZpZXdzIjpbeyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjI4OCwiYnl0ZU9mZnNldCI6MCwidGFyZ2V0IjozNDk2Mn0seyJidWZmZXIiOjAsImJ5dGVMZW5ndGgiOjI4OCwiYnl0ZU9mZnNldCI6Mjg4LCJ0YXJnZXQiOjM0OTYyfSx7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0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`;
const STATE_SPINNING = 'spinning';

AFRAME.registerComponent('selectable-model', {
	dependencies: [],

	schema: {
		src: {type: 'asset'},
		animate: {default: false},
	},

	/** Called once when component is attached. Generally for initial setup. */
	init: function () {
		this.handlers.openUrl = this.openUrl.bind(this);
		this.handlers.openModelFile = this.openModelFile.bind(this);
		this.handlers.fileInptChange = this.fileInptChange.bind(this);
		this.handlers.modelLoaded = this.modelLoaded.bind(this);
		this.handlers.modelError = this.modelError.bind(this);
		this.handlers.animateChange = this.animateChange.bind(this);
		this.handlers.spinnerStateAdded = this.spinnerStateAdded.bind(this);
		this.handlers.spinnerStateRemoved = this.spinnerStateRemoved.bind(this);

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
		openFileBtn.style.marginLeft = '3em';
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

		const animateLabel = document.createElement('label');
		animateLabel.innerText = "Animate";
		animateLabel.style.marginLeft = '3em';
		animateLabel.style.lineHeight = '40px';
		animateLabel.style.paddingLeft = '0.5em';
		animateLabel.style.paddingRight = '0.5em';
		animateLabel.style.backgroundColor = 'white';
		controlStrip.appendChild(animateLabel);

		const animateChkbx = document.createElement('input');
		animateChkbx.setAttribute('id', ANIMATE_ID);
		animateChkbx.type = 'checkbox';
		animateLabel.appendChild(animateChkbx);
		animateChkbx.addEventListener('change', this.handlers.animateChange);
		this.animateChkbx = animateChkbx;

		this.el.addEventListener('model-loaded', this.handlers.modelLoaded);
		this.el.addEventListener('model-error', this.handlers.modelError);

		const spinner = document.createElement('a-gltf-model');
		spinner.setAttribute('id', SPINNER_ID);
		spinner.setAttribute('src', SPINNER_URL);
		spinner.setAttribute('animation-mixer', 'timeScale: 1');
		spinner.setAttribute('scale', {x: 0.25, y: 0.25, z: 0.25});
		spinner.setAttribute('position', {x: 0, y: 2.5, z: 0});
		spinner.setAttribute('animation__beginspin',
			{startEvents: 'beginspin', property: 'scale', from: '0.05 0.05 0.05', to: '0.25 0.25 0.25', dur: 125});
		spinner.setAttribute('animation__endspin',
			{startEvents: 'endspin', property: 'scale', to: '0.05 0.05 0.05', dur: 125});
		spinner.setAttribute('animation__endspinhide',
			{startEvents: 'animationcomplete__endspin', property: 'visible', to: false, dur: 0});
		spinner.setAttribute('visible', 'false');
		this.el.sceneEl.appendChild(spinner);

		spinner.addEventListener('stateadded', this.handlers.spinnerStateAdded);
		spinner.addEventListener('stateremoved', this.handlers.spinnerStateRemoved);
	},

	handlers: {},

	openUrl: function (evt) {
		const urlInpt = document.querySelector('input[type=url]');
		console.log(`openUrl`, evt, `“${urlInpt?.value}”`);
		this.el.setAttribute('selectable-model', 'src', urlInpt.value);
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

			let spinner = document.getElementById(SPINNER_ID);
			spinner?.addState(STATE_SPINNING);

			const file = this.fileInpt.files[0];
			const dataIF = this.el.sceneEl.croquetSession?.data;
			let modelUrl;
			if (typeof dataIF?.store === 'function' && file.size > BASE64_CROQUET_MAX) {
				const buffer = await file.arrayBuffer();
				const handle = await dataIF.store(buffer, {});
				const croquetId = dataIF.toId(handle);
				modelUrl = `croquet:` + croquetId;
			} else {
				if (typeof dataIF?.store !== 'function') {
					this.showPersistentMsg(`The Croquet API for syncing files has changed`);
				}
				modelUrl = await fileToDataUrl(file);
				if (modelUrl.length > 16384) {
					this.showPersistentMsg(`“${file.name}” is too big to sync to other users; upload it somewhere and paste the URL below`);
				}
			}
			this.el.setAttribute('selectable-model', 'src', modelUrl);
			this.modelNeedsScaling = true;
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
	update: async function (oldData) {
		try {
			if (!this.gltfEl) {
				this.gltfEl = document.createElement('a-gltf-model');
				this.gltfEl.classList.add(PRESENTATION_CLASS);
				this.el.appendChild(this.gltfEl);
			}

			this.gltfEl.setAttribute('animation-mixer', 'timeScale: ' + (this.data.animate ? 1 : 0));
			this.animateChkbx.checked = this.data.animate;

			if (!this.data.src || this.data.src === oldData.src) { return; }

			let spinner = document.getElementById(SPINNER_ID);
			spinner?.addState(STATE_SPINNING);

			if (this.objectUrl) {
				URL.revokeObjectURL(this.objectUrl);
				this.objectUrl = null;
			}

			let modelUrl = this.data.src;

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

		const spinner = document.getElementById(SPINNER_ID);
		spinner?.removeState(STATE_SPINNING);
	},

	modelError: function (evt) {
		console.error(`selectable-model modelError:`, evt.detail);
		const msg = evt.detail.format ?
			`not a valid ${evt.detail.format} file` :
			`error while loading model: ` + JSON.stringify(evt.detail);
		this.showPersistentMsg(msg);
	},

	animateChange: function (evt) {
		console.debug(`animateChange:`, evt.currentTarget.checked);
		this.el.setAttribute('selectable-model', 'animate', evt.currentTarget.checked);
	},

	spinnerStateAdded: function(evt) {
		if (STATE_SPINNING === evt.detail) {
			const spinner = document.getElementById(SPINNER_ID);
			spinner?.setAttribute('visible', 'true');
			spinner?.emit('beginspin');
		}
	},

	spinnerStateRemoved: function (evt) {
		if (STATE_SPINNING === evt.detail) {
			const spinner = document.getElementById(SPINNER_ID);
			spinner?.emit('endspin');
		}
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
