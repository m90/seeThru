/**
* jQuery seeThru - transparent HTML5 video - written by Frederik Ring (frederik.ring@gmail.com)
* based on http://jakearchibald.com/scratch/alphavid/ by Jake Archibald (jaffathecake@gmail.com)

* Copyright (c) 2015 Frederik Ring
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* see https://github.com/m90/seeThru for documentation
*/

(function(root, factory){
	if (typeof define === 'function' && define.amd){
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.seeThru = factory();
	}
})(this, function(){

	/**
	* convert an image's alpha channel into a black & white canvasPixelArray
	* @param {DOMElement} maskObj
	* @param {Object} dimensions
	* @returns {CanvasPixelArray} RGBA
	*/
	function convertAlphaMask(maskObj, dimensions){
		var
		convertCanvas = document.createElement('canvas')
		, convertCtx = convertCanvas.getContext('2d')
		, RGBA;

		convertCanvas.width = dimensions.width;
		convertCanvas.height = dimensions.height;
		convertCtx.drawImage(maskObj, 0, 0, dimensions.width, dimensions.height);

		RGBA = convertCtx.getImageData(0, 0, dimensions.width, dimensions.height);

		//alpha data is on each 4th position -> [0+(4*n)] => R, [1+(4*n)] => G, [2+(4*n)] => B, [3+(4*n)] => A
		for (var i = 3, len = RGBA.data.length; i < len; i = i + 4){
			RGBA.data[i-1] = RGBA.data[i-2] = RGBA.data[i-3] = RGBA.data[i]; //alpha into RGB
			RGBA.data[i] = 255; //alpha is always 100% opaque
		}

		return RGBA;
	}

	/**
	* unmultiply an image with alpha information
	* @param {Array} rgb - canvasPixelArray representing the image to be unmultiplied
	* @param {Array} alphaData - canvasPixelArray representing the alpha to use
	* @returns {Array} rgb
	*/
	function unmultiply(rgb, alphaData){
		for (var i = 3, len = rgb.data.length; i < len; i = i + 4){
			rgb.data[i] = alphaData[i - 1]; //copy B value into A channel
			rgb.data[i - 3] = rgb.data[i - 3] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply B
			rgb.data[i - 2] = rgb.data[i - 2] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply G
			rgb.data[i - 1] = rgb.data[i - 1] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply R
		}
		return rgb;
	}

	/**
	* gets a prefixed rAF version or a polyfill to use if window.requestAnimationFrame is not available
	* @returns {Function}
	*/
	function getRequestAnimationFrame(){
		var
		lastTime = 0
		, vendors = ['ms', 'moz', 'webkit', 'o'];

		for (var x = 0; x < vendors.length; x++){
			if (window[vendors[x] + 'RequestAnimationFrame']){ return window[vendors[x] + 'RequestAnimationFrame']; }
		}

		return function(callback){
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function(){
				callback(currTime + timeToCall);
			}, timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
	}

	/**
	* gets a prefixed cAF version or a polyfill to use if window.cancelAnimationFrame is not available
	* @returns {Function}
	*/
	function getCancelAnimationFrame(){
		var vendors = ['ms', 'moz', 'webkit', 'o'];

		for (var x = 0; x < vendors.length; x++){
			if (window[vendors[x] + 'CancelAnimationFrame']){ return window[vendors[x] + 'CancelAnimationFrame']; }
			if (window[vendors[x] + 'CancelRequestAnimationFrame']){ return window[vendors[x] + 'CancelRequestAnimationFrame']; }
		}

		return function(id){ clearTimeout(id); };
	}

	/**
	* turn array like object into real array
	* @param {Object} el
	* @returns {Array}
	*/
	function slice(el){
		return [].slice.call(el);
	}

	/**
	* check [[Class]] by calling {}.toString on any object
	* @param {Object} el
	* @returns {String}
	*/
	function toString(el){
		return Object.prototype.toString.call(el);
	}

	/**
	* insert a DOM Node after another
	* @param {DOMElement} node
	* @param {DOMElement} after
	*/
	function insertAfter(node, after){
		if (after.nextSibling) {
			after.parentNode.insertBefore(node, after.nextSibling);
		} else {
			after.parentNode.appendChild(node);
		}
	}

	/**
	* return a DOM Node matching variable input
	* input might be a DOMElement, a DOMCollection or a string
	* @param input
	* @returns DOMElement
	*/
	function getNode(input){
		if (input.tagName){
			return input;
		} else if (toString(input) === '[object String]'){
			return document.querySelector(input);
		} else if (input.length){
			return input[0];
		} else {
			return null;
		}
	}

	/**
	* serialize an object into a string of CSS to use for style.cssText
	* @param {Object} obj
	* @returns {String}
	*/
	function cssObjectToString(obj){
		var res = [];
		for (var prop in obj){
			if (obj.hasOwnProperty(prop)){
				res.push(prop + ': ' + obj[prop] + ';');
			}
		}
		return res.join('');
	}

	/**
	* make the script available as a plugin on the passed jQuery instance
	* @param {jQuery} $
	*/
	function attachSelfAsPlugin($){

		if (!$.fn || $.fn.seeThru){ return; }

		$.fn.seeThru = function(){

			var args = slice(arguments);

			return this.each(function(){
				var $this = $(this);
				if (!args.length || (args.length === 1 && toString(args[0]) === '[object Object]')){
					if ($this.data('seeThru')){ return; }
					$this.data('seeThru', new SeeThru(this, args[0])._init());
				} else if (args.length && toString(args[0]) === '[object String]'){
					if (!$this.data('seeThru')){ return; }
					// all methods other then init will be deferred until `.ready()`
					$this.data('seeThru').ready(function(){
						$this.data('seeThru')[args[0]](args[1]);
						if (args[0] === 'revert'){
							$this.data('seeThru', null);
						}
					});
				}
			});
		};
	}

	/**
	* @constructor Store
	* simple wrapper around [] to keep track of video elements that are currently
	* handled by the script
	*/
	function Store(){
		var elements = [];
		this.push = function(el){
			if (el){
				elements.push(el);
				return el;
			} else {
				return null;
			}
		};
		this.has = function(el){
			return elements.some(function(video){
				return video === el;
			});
		};
		this.remove = function(el){
			elements = elements.filter(function(video){
				return video !== el;
			});
		};
	}

	/**
	* @constructor TransparentVideo
	* handles the transformation of a video into the canvas elements and keeps track
	* of intervals and animation loop logic
	* @param {DOMElement} video
	* @param {Object options}
	*/
	function TransparentVideo(video, options){

		var
		initialDisplayProp
		, divisor = options.mask ? 1 : 2 //static alpha data will not cut the image dimensions
		, dimensions = { // calculate dimensions
			width : parseInt(options.width, 10)
			, height : parseInt(options.height, 10)
		}
		, bufferCanvas = document.createElement('canvas')
		, buffer = bufferCanvas.getContext('2d')
		, displayCanvas = document.createElement('canvas')
		, display = displayCanvas.getContext('2d')
		, posterframe
		, interval
		, requestAnimationFrame = window.requestAnimationFrame || getRequestAnimationFrame()
		, cancelAnimationFrame = window.cancelAnimationFrame || getCancelAnimationFrame()
		, drawFrame = function(recurse){

			var image, alphaData, i, len;

			buffer.drawImage(video, 0, 0, dimensions.width, dimensions.height * divisor); //scales if <video>-dimensions are not matching
			image = buffer.getImageData(0, 0, dimensions.width, dimensions.height);
			alphaData = buffer.getImageData(0, dimensions.height, dimensions.width, dimensions.height).data; //grab from video;

			if (options.unmult){ unmultiply(image, alphaData); }

			//calculate luminance from buffer part, no weighting needed when alpha mask is used
			for (i = 3, len = image.data.length; i < len; i = i + 4) {
				image.data[i] = options.alphaMask ? alphaData[i - 1] : Math.max(alphaData[i - 1], alphaData[i - 2], alphaData[i - 3]);
			}

			display.putImageData(image, 0, 0, 0, 0, dimensions.width, dimensions.height);

			if (recurse){
				interval = requestAnimationFrame(function(){
					drawFrame(true);
				});
			}

		}
		, drawStaticMask = function(node){

			if (node.tagName !== 'IMG'){ throw new Error('Cannot use non-image element as mask!'); }

			node.width = dimensions.width;
			node.height = dimensions.height; //adjust image dimensions to video dimensions

			if (options.alphaMask){ //alpha channel has to be converted into RGB
				buffer.putImageData(convertAlphaMask(node, dimensions), 0, dimensions.height);
			} else { //no conversion needed, draw image into buffer
				buffer.drawImage(node, 0, dimensions.height, dimensions.width, dimensions.height);
			}

			node.style.display = 'none';

		};


		/**
		* @method startRendering
		* kick off the animation loop
		* @returns self
		* @API public
		*/
		this.startRendering = function(){
			drawFrame(true);
			return this;
		};

		/**
		* @method stopRendering
		* ends the animation loop
		* @returns self
		* @API public
		*/
		this.stopRendering = function(){
			cancelAnimationFrame(interval);
			return this;
		};

		/**
		* @method stopRendering
		* ends the animation loop, removes the canvas elements and unhides the video
		* @returns self
		* @API public
		*/
		this.teardown = function(){
			cancelAnimationFrame(interval);
			video.parentNode.removeChild(video.nextSibling);
			video.parentNode.removeChild(video.nextSibling);
			video.style.display = initialDisplayProp;
			return this;
		};

		/**
		* @method updateMask
		* draws a new image onto the alpha portion of the buffer
		* @param {DOMElement} node
		* @returns self
		* @API public
		*/
		this.updateMask = function(node){
			drawStaticMask(node);
			return this;
		};

		/**
		* @method getCanvas
		* gets the visible canvas element that is used for display
		* @returns {DOMElement}
		* @API public
		*/
		this.getCanvas = function(){
			return displayCanvas;
		};

		/**
		* @method getPoster
		* gets the posterframe element
		* @returns {DOMElement}
		* @API public
		*/
		this.getPoster = function(){
			return posterframe;
		};

		var elementDimensions = video.getBoundingClientRect();

		if (!dimensions.height || !dimensions.width){ //we need to find out at least one dimension parameter as it is not explicitly set
			if (!video.width && !video.height){ //<video> has no width- or height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || video.videoWidth;
				dimensions.height = dimensions.height || video.videoHeight / divisor;
			} else if (!video.height){ //<video> has no height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || elementDimensions.width;
				dimensions.height = dimensions.height || elementDimensions.width / (video.videoWidth / Math.floor(video.videoHeight / divisor));
			} else if (!video.width){ //<video> has no height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || elementDimensions.height * (video.videoWidth / Math.floor(video.videoHeight / divisor));
				dimensions.height = dimensions.height || elementDimensions.height;
			} else { //get values from height and width attributes of <video>
				dimensions.width = dimensions.width || elementDimensions.width;
				dimensions.height = dimensions.height || elementDimensions.height / divisor;
			}
		}

		bufferCanvas.width = dimensions.width;
		bufferCanvas.height = dimensions.height * 2;
		bufferCanvas.style.display = 'none';
		bufferCanvas.className = 'seeThru-buffer';

		displayCanvas.width = dimensions.width;
		displayCanvas.height = dimensions.height;
		displayCanvas.className = 'seeThru-display';

		insertAfter(bufferCanvas, video);
		insertAfter(displayCanvas, video);

		// draw static mask if needed
		if (options.mask){ drawStaticMask(getNode(options.mask)); }

		// append "posterframe" if option is set and attribute is present on the video
		if (options.poster && video.poster){
			posterframe = document.createElement('div');
			posterframe.className = 'seeThru-poster';
			posterframe.style.cssText = cssObjectToString({
				width : dimensions.width + 'px'
				, height : dimensions.height + 'px'
				, position : 'absolute'
				, top : 0
				, left : 0
				, backgroundSize : 'cover'
				, backgroundPosition : 'center'
				, backgroundImage : 'url("' + video.poster + '")'
			});
			insertAfter(posterframe, video);
		}

		initialDisplayProp = window.getComputedStyle(video).display;
		video.style.display = 'none';

		if (options.start === 'autoplay'){ video.play(); }

	}

	/**
	* @constructor SeeThru
	* handles a video element turned into a transparent mock version of itself
	* @param {String|DOMElement|DOMNode} DOMNode
	* @param {Object} [options]
	*/
	function SeeThru(DOMNode, options){

		var
		self = this
		, ready = false
		, callbacks = []
		, defaultOptions = {
			start : 'autoplay' //'autoplay', 'clicktoplay', 'external' (will display the first frame and make the video wait for an external interface) - defaults to autoplay
			, end : 'loop' //'loop', 'rewind', 'stop' any other input will default to 'loop'
			, mask : false //this lets you define a <img> (selected by #id or .class - class will use the first occurence)used as a black and white mask instead of adding the alpha to the video
			, alphaMask : false //defines if the used `mask` uses black and white or alpha information - defaults to false, i.e. black and white
			, width : null //lets you specify a pixel value used as width -- overrides all other calculations
			, height : null //lets you specify a pixel value used as height -- overrides all other calculations
			, poster : false // the plugin will display the image set in the video's poster-attribute when not playing if set to true
			, unmult : false //set this to true if your video material is premultiplied on black - might cause performance issues
		}
		, canConstructEvents = (function(){
			try{
				if (new Event('submit', { bubbles: false }).bubbles !== false) {
					return false;
				} else if (new Event('submit', { bubbles: true }).bubbles !== true) {
					return false;
				} else {
					return true;
				}
			} catch (e){
				return false;
			}
		})()
		, eventsToEcho = [
			'mouseenter'
			, 'mouseleave'
			, 'click'
			, 'mousedown'
			, 'mouseup'
			, 'mousemove'
			, 'mouseover'
			, 'hover'
			, 'dblclick'
			, 'contextmenu'
			, 'focus'
			, 'blur'
		];

		options = options || {};
		this._video = getNode(DOMNode);

		if (!this._video || this._video.tagName !== 'VIDEO'){ throw new Error('Could not use specified source'); }

		this._options = (function(options){
			for (var key in defaultOptions){
				if (defaultOptions.hasOwnProperty(key)){
					if (!(key in options)){
						options[key] = defaultOptions[key];
					}
				}
			}
			return options;
		})(options);

		/**
		* @method init
		* sets up transparent video once the video has metadata
		* @returns self
		* @API private
		*/
		this._init = function(){

			var runInit = function(){

				function playSelfAndUnbind(){
					self._video.play();
					if (self._options.poster){
						self._seeThru.getPoster().removeEventListener('click', playSelfAndUnbind);
					} else {
						self._seeThru.getCanvas().removeEventListener('click', playSelfAndUnbind);
					}
				}

				if (elementStore.has(this._video)) { throw new Error('seeThru already initialized on passed video element!'); }

				this._seeThru = new TransparentVideo(this._video, this._options);

				// attach behavior for start options
				if (this._options.start === 'clicktoplay'){
					if (this._options.poster){
						this._seeThru.getPoster().addEventListener('click', playSelfAndUnbind);
					} else {
						this._seeThru.getCanvas().addEventListener('click', playSelfAndUnbind);
					}
				} else if (this._options.start === 'autoplay' && options.poster){
					this._seeThru.getPoster().style.display = 'none';
				}

				// attach behavior for end options
				if (this._options.end === 'rewind'){
					this._video.addEventListener('ended', function(){
						self._video.currentTime = 0;
						self._seeThru.getCanvas().addEventListener('click', playSelfAndUnbind);
					});
				} else if (this._options.end !== 'stop'){
					this._video.addEventListener('ended', function(){
						self._video.currentTime = 0;
						self._video.play();
					});
				}

				// attach behavior for posterframe option
				if (this._options.poster && this._video.poster){
					this._video.addEventListener('play', function(){
						self._seeThru.getPoster().style.display = 'none';
					});
					this._video.addEventListener('pause', function(){
						self._seeThru.getPoster().style.display = 'block';
					});
				}

				// some events that are registered on the canvas representation
				// will be echoed on the original video element so that pre-existing
				// event handlers bound to the video element will keep working
				// it is recommended to use `.getCanvas()` to bind new behavior though
				eventsToEcho.forEach(function(eventName){
					self._seeThru.getCanvas().addEventListener(eventName, function(){
						var evt;
						if (canConstructEvents){
							evt = new Event(eventName);
						} else {
							evt = document.createEvent('Event');
							evt.initEvent(eventName, true, true);
						}
						self._video.dispatchEvent(evt);
					});
				});

				this._seeThru.startRendering();

				ready = true;

				elementStore.push(this._video);

				callbacks.forEach(function(cb){ cb(self, self._video, self.getCanvas()); });

			}.bind(this);

			if (this._video.readyState > 0){
				runInit();
			} else {
				this._video.addEventListener('loadedmetadata', function(){
					runInit();
				});
			}

			return this;

		};

		/**
		* @method getCanvas
		* returns the canvas element that is used for on-screen displaylay
		* @returns {DOMElement}
		* @API public
		*/
		this.getCanvas = function(){
			return this._seeThru.getCanvas();
		};

		/**
		* @method play
		* starts playback of the associated video element
		* @returns self
		* @API public
		*/
		this.play = function(){
			this._video.play();
			return this;
		};

		/**
		* @method pause
		* halts playback of the associated video element
		* @returns self
		* @API public
		*/
		this.pause = function(){
			this._video.pause();
			return this;
		};

		/**
		* @method revert
		* reverts the transparent video back to its original state
		* @API public
		*/
		this.revert = function(){
			this._seeThru.teardown();
			elementStore.remove(this._video);
		};

		/**
		* @method updateMask
		* @param {String|DOMElement|DOMCollection} mask
		* swaps the static mask currently used for sourcing alpha
		* @returns self
		* @API public
		*/
		this.updateMask = function(mask){
			this._seeThru.updateMask(getNode(mask));
			return this;
		};

		/**
		* @method ready
		* @param {Function} cb
		* defers the passed callback until the associated video element has metadata
		* passes itself as the 1st argument of the callback
		* @returns self
		* @API public
		*/
		this.ready = function(cb){
			if (ready){
				setTimeout(function(){
					cb(this, this._video, this.getCanvas());
				}, 0);
			} else {
				callbacks.push(cb);
			}
			return this;
		};

	}

	// if we have a global version of jQuery we'll automatically attach the script as a plugin
	if (window.jQuery){ attachSelfAsPlugin(window.jQuery); }

	var elementStore = new Store();

	return {
		create : function(DOMCollection, options){
			return new SeeThru(DOMCollection, options)._init();
		}
		, attach : attachSelfAsPlugin
	};

});
