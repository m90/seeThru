/**
* jQuery seeThru - transparent HTML5 video - written by Frederik Ring (frederik.ring@gmail.com)
* based on http://jakearchibald.com/scratch/alphavid/ by Jake Archibald (jaffathecake@gmail.com)

* Copyright (c) 2014 Frederik Ring
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

* see https://github.com/m90/jquery-seeThru for documentation
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
	* convert an image node into a black & white canvasPixelArray
	* @param {Object} dimensions
	* @param {DOMElement} maskObj
	* @returns {CanvasPixelArray} RGBA
	*/
	function convertAlphaMask(dimensions, maskObj){
		var
		convertCanvas = document.createElement('canvas')
		, convertCtx = convertCanvas.getContext('2d')
		, RGBA;

		convertCanvas.width = dimensions.width;
		convertCanvas.height = dimensions.height;

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
	* shim the requestAnimationFrame API if needed
	*/
	function applyShim(){
		var
		lastTime = 0
		, vendors = ['ms', 'moz', 'webkit', 'o'];

		for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x){
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		}

		if (!window.requestAnimationFrame){
			window.requestAnimationFrame = function(callback){
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function(){
					callback(currTime + timeToCall);
				}, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}

		if (!window.cancelAnimationFrame){
			window.cancelAnimationFrame = function(id){
				clearTimeout(id);
			};
		}
	}

	function slice(el){
		return [].slice.call(el);
	}

	function toString(el){
		return Object.prototype.toString.call(el);
	}

	function insertAfter(node, after){
		if (after.nextSibling) {
  			after.parentNode.insertBefore(node, after.nextSibling);
		} else {
  			after.parentNode.appendChild(node);
		}
	}

	function makeTransparent(video){

		var
		staticMask = false
		, alphaMask = (this._options.alphaMask === true)
		, maskObj
		, divisor = staticMask ? 1 : 2 //static alpha data will not cut the image dimensions
		, dimensions = { // calculate dimensions
			width : parseInt(this._options.width, 10)
			, height : parseInt(this._options.height, 10)
		}
		, elementDimensions = video.getBoundingClientRect()
		, bufferCanvas = document.createElement('canvas')
		, buffer = bufferCanvas.getContext('2d')
		, displayCanvas = document.createElement('canvas')
		, display = displayCanvas.getContext('2d')
		, interval
		, drawFrame;

		if (!dimensions.height || !dimensions.width){ //we need to find out at least one dimension parameter as it is not set
			if (video.width && !video.height){ //<video> has no width- or height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || video.videoWidth;
				dimensions.height = dimensions.height || video.videoHeight / divisor;
			} else if (video.height){ //<video> has no height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || parseInt(elementDimensions.width, 10);
				dimensions.height = dimensions.height || parseInt(elementDimensions.width, 10) / (video.videoWidth / Math.floor(video.videoHeight / divisor));
			} else if (video.width){ //<video> has no height-attribute -> source dimensions from video source meta
				dimensions.width = dimensions.width || parseInt(elementDimensions.height, 10) * (video.videoWidth / Math.floor(video.videoHeight / divisor));
				dimensions.height = dimensions.height || parseInt(elementDimensions.height, 10);
			} else { //get values from height and width attributes of <video>
				dimensions.width = dimensions.width || parseInt(elementDimensions.width, 10);
				dimensions.height = dimensions.height || parseInt(elementDimensions.height, 10) / divisor;
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

		video.style.display = 'none';

		drawFrame = function(recurse){
			var image, alphaData;
			buffer.drawImage(video, 0, 0, dimensions.width, dimensions.height * divisor); //scales if <video>-dimensions are not matching
			image = buffer.getImageData(0, 0, dimensions.width, dimensions.height);
			alphaData = buffer.getImageData(0, dimensions.height, dimensions.width, dimensions.height).data; //grab from video;

			//calculate luminance from buffer part, no weighting needed when alpha mask is used
			for (var i = 3, len = image.data.length; i < len; i = i + 4) {
				image.data[i] = Math.max(alphaData[i - 1], alphaData[i - 2], alphaData[i - 3]);
			}

			display.putImageData(image, 0, 0, 0, 0, dimensions.width, dimensions.height);

			if (recurse){
				interval = requestAnimationFrame(function(){
					drawFrame(true);
				});
			}

		}.bind(this);

		return {
			start : function(){ drawFrame(true); }
			, stop : function(){ cancelAnimationFrame(interval); }
			, renderSingleFrame : function(){ drawFrame(false); }
		};

	}

	function makeOpaque(video){
		video.nextSibling.remove();
		video.nextSibling.remove();
		video.style.display = 'block';
	}

	function SeeThru(DOMCollection, options){

		var defaultOptions = {
			start : 'autoplay' //'autoplay', 'clicktoplay', 'external' (will display the first frame and make the video wait for an external interface) - defaults to autoplay
			, end : 'loop' //'loop', 'rewind', 'stop' any other input will default to 'loop'
			, mask : false //this lets you define a <img> (selected by #id or .class - class will use the first occurence)used as a black and white mask instead of adding the alpha to the video
			, alphaMask : false //defines if the used `mask` uses black and white or alpha information - defaults to false, i.e. black and white
			, width : '' //lets you specify a pixel value used as width -- overrides all other calculations
			, height : '' //lets you specify a pixel value used as height -- overrides all other calculations
			, poster : false // the plugin will display the image set in the video's poster-attribute when not playing if set to true
			, unmult : false //set this to true if your video material is premultiplied on black - might cause performance issues
			, shimRAF : true //set this to false if you don't want the plugin to shim the requestAnimationFrame API - only set to false if you know what you're doing
		}
		, handleVideo = makeTransparent.bind(this)
		, undo = makeOpaque.bind(this);

		options = options || {};
		DOMCollection = toString(DOMCollection) === '[object HTMLVideoElement]' ? [DOMCollection] : DOMCollection;

		this._elements = slice(DOMCollection).filter(function(element){
			return element.tagName === 'VIDEO';
		});

		this._options = (function(options){
			for (var key in defaultOptions){
				if (!(key in options)){
					options[key] = defaultOptions[key];
				}
			}
			return options;
		})(options);

		this.init = function(){

			if (this._options.shimRAF && (!window.requestAnimationFrame || !window.cancelAnimationFrame)){
				applyShim();
			}

			this._elements.forEach(function(video){
				if (video.readyState > 0){
					handleVideo(video).start();
				} else {
					video.addEventListener('loadedmetadata', function(){
						handleVideo(video).start();
					});
				}
			});
			return this;
		};

		this.play = function(){
			this._elements.forEach(function(video){
				video.play();
			});
			return this;
		};

		this.pause = function(){
			this._elements.forEach(function(video){
				video.pause();
			});
			return this;
		};

		this.revert = function(){
			this._elements.forEach(undo);
		};

		this.updateMask = function(options){
			this._elements.forEach(function(){});
		};
	}

	return {
		create : function(DOMCollection, options){
			return new SeeThru(DOMCollection, options).init();
		}
	};

});
