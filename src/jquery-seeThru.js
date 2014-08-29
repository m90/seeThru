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
		define(['jquery'], factory);
	} else if (typeof exports === 'object') {
		factory(require('jquery'));
	} else {
		factory(root.jQuery);
	}
})(this, function($){

	/**
	* convert an image node into a black & white canvasPixelArray
	* @param {object} dimensions
	* @param {DOMElement} maskObj
	*/
	function convertAlphaMask(dimensions, maskObj){

		var convertCtx = $('<canvas>').attr({
			'width' : dimensions.width
			, 'height' : dimensions.height
		}).get(0).getContext('2d');

		convertCtx.drawImage(maskObj, 0, 0, dimensions.width, dimensions.height);

		var RGBA = convertCtx.getImageData(0, 0, dimensions.width, dimensions.height);

		//alpha data is on each 4th position -> [0+(4*n)] => R, [1+(4*n)] => G, [2+(4*n)] => B, [3+(4*n)] => A
		for (var i = 3, len = RGBA.data.length; i < len; i = i + 4){
			RGBA.data[i-1] = RGBA.data[i-2] = RGBA.data[i-3] = RGBA.data[i]; //alpha into RGB
			RGBA.data[i] = 255; //alpha is always 100% opaque
		}

		return RGBA;

	}

	/**
	* unmultiply an image with alpha information
	* @param {array} rgb - canvasPixelArray representing the image to be unmultiplied
	* @param {array} alphaData - canvasPixelArray representing the alpha to use
	*/
	function unmultiply(rgb, alphaData){
		for (var i = 3, len = rgb.data.length; i < len; i = i + 4){
			rgb.data[i] = alphaData[i - 1]; //copy B value into A channel
			rgb.data[i - 3] = rgb.data[i - 3] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply B
			rgb.data[i - 2] = rgb.data[i - 2] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply G
			rgb.data[i - 1] = rgb.data[i - 1] / (alphaData[i - 1] ? (alphaData[i - 1] / 255) : 1); //un-premultiply R
		}
	}

	var methods = {

		init : function(options) {

			// OPTIONS
			var settings = $.extend({
				start : 'autoplay' //'autoplay', 'clicktoplay', 'external' (will display the first frame and make the video wait for an external interface) - defaults to autoplay
				, end : 'loop' //'loop', 'rewind', 'stop' any other input will default to 'loop'
				, mask : false //this lets you define a <img> (selected by #id or .class - class will use the first occurence)used as a black and white mask instead of adding the alpha to the video
				, alphaMask : false //defines if the used `mask` uses black and white or alpha information - defaults to false, i.e. black and white
				, width : '' //lets you specify a pixel value used as width -- overrides all other calculations
				, height : '' //lets you specify a pixel value used as height -- overrides all other calculations
				, poster : false // the plugin will display the image set in the video's poster-attribute when not playing if set to true
				, unmult : false //set this to true if your video material is premultiplied on black - might cause performance issues
				, shimRAF : true //set this to false if you don't want the plugin to shim the requestAnimationFrame API - only set to false if you know what you're doing
			}, options);

			//shim requestAnimationFrame API if needed and not already done
			if (settings.shimRAF && (!window.requestAnimationFrame || !window.cancelAnimationFrame)){

				(function(){
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
				}());

			}

			return this.each(function(){

				//check if we really need and can run init on the given object
				if (this.tagName !== 'VIDEO'){ throw new Error('Selected element must be <video> element'); }
				if ($(this).data('seeThru')){ throw new Error('seeThru already initialized on selected element'); }

				var
				staticMask = false
				, alphaMask = (settings.alphaMask === true)
				, maskObj;

				if (settings.mask && $(settings.mask).length){
					maskObj = $(settings.mask).hide()[0]; //first occurence in case class is selected
					if (maskObj.tagName !== 'IMG'){ throw new Error('Mask element must be <img>'); }
					staticMask = true;
				}

				$(this).on('loadedmetadata.seeThru', function(){

					var
					$this = $(this)
					, video = this
					, divisor = staticMask ? 1 : 2 //static alpha data will not cut the image dimensions
					, dimensions = { // calculate dimensions
						width : parseInt(settings.width, 10)
						, height : parseInt(settings.height, 10)
					};

					if (!dimensions.height || !dimensions.width){ //we need to find out at least one dimension parameter as it is not set
						if (!$this.attr('width') && !$this.attr('height')){ //<video> has no width- or height-attribute -> source dimensions from video source meta
							dimensions.width = dimensions.width || video.videoWidth;
							dimensions.height = dimensions.height || video.videoHeight / divisor;
						} else if (!$this.attr('height')){ //<video> has no height-attribute -> source dimensions from video source meta
							dimensions.width = dimensions.width || parseInt(video.width, 10);
							dimensions.height = dimensions.height || parseInt(video.width, 10) / (video.videoWidth / Math.floor(video.videoHeight / divisor));
						} else if (!$this.attr('width')){ //<video> has no height-attribute -> source dimensions from video source meta
							dimensions.width = dimensions.width || parseInt(video.height, 10) * (video.videoWidth / Math.floor(video.videoHeight / divisor));
							dimensions.height = dimensions.height || parseInt(video.height, 10);
						} else { //get values from height and width attributes of <video>
							dimensions.width = dimensions.width || parseInt(video.width, 10);
							dimensions.height = dimensions.height || parseInt(video.height, 10) / divisor;
						}
					}

					// generate canvas elements and get their contexts
					var
					bufferCanvas = $('<canvas>', {
						'class' : 'seeThru-buffer'
					}).attr({
						'width' : dimensions.width
						, 'height' : dimensions.height * 2 //buffer will ALWAYS be twice the height
					}).hide()
					, displayCanvas = $('<canvas>', {
						'class' : 'seeThru-display'
					}).attr({
						'width' : dimensions.width //explicitly set width and height via `attr` or jQuery will treat it as CSS!
						, 'height' : dimensions.height
					})
					, display = displayCanvas[0].getContext('2d')
					, buffer = bufferCanvas[0].getContext('2d')
					, interval
					, $posterframe = $({});


					// draw static mask if needed
					if (staticMask){
						maskObj.width = dimensions.width;
						maskObj.height = dimensions.height; //adjust image dimensions to video dimensions

						if (alphaMask){ //alpha channel has to be converted into RGB
							buffer.putImageData(convertAlphaMask(dimensions, maskObj), 0, dimensions.height);
						} else { //no conversion needed, draw image into buffer
							buffer.drawImage(maskObj, 0, dimensions.height, dimensions.width, dimensions.height);
						}
					}

					// override video's loop flag if the plugins config is explicitly set to 'end'
					if (settings.end === 'stop' && video.loop){
						video.loop = false;
					}

					// in case of posterframe usage we need a container element to position the posterframe above the canvas
					if (settings.poster){
						$this.wrap($('<div>').css({
							'position' : 'relative'
							, 'width' : dimensions.width + 'px'
							, 'height' : dimensions.height + 'px'
						}).addClass('seeThru-container'));
					}

					// hide video and append canvas elements - DOM manipulation done
					$this.hide().data('seeThru', {'staticMask' : staticMask, 'alphaMask' : alphaMask, interval : interval}).after(bufferCanvas, displayCanvas);

					// generate poster frame overlay
					if (settings.poster && $this.attr('poster')){
						$posterframe = $('<div>').addClass('seeThru-poster').css({
							'width' : dimensions.width + 'px'
							, 'height' : dimensions.height + 'px'
							, 'position' : 'absolute'
							, 'top' : 0
							, 'left' : 0
							, 'background-size' : 'cover'
							, 'background-position' : 'center'
							, 'background-image' : 'url("' + video.poster + '")'
						});
						$this.after($posterframe);
					}

					// we'll echo all these events
					// see: http://www.w3.org/TR/DOM-Level-3-Events/#events-mouseevents
					var eventsToEcho = [
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
					].join(' ');

					// actually echo the mouse events
					displayCanvas.add($posterframe).on(eventsToEcho, function(e){
						$this.trigger(e); //mouse events on the canvas representation will be echoed by the video
					});

					//event handling - all events are .seeThru-namespaced
					$this.on('play.seeThru', function() { //refresh canvas elements

						$posterframe.hide();

						cancelAnimationFrame(interval);
						interval = requestAnimationFrame(function(){
							drawFrame(true);
						});
						$this.data('seeThru').interval = interval;

					}).on('pause.seeThru', function(){ //stop interval on pause
						cancelAnimationFrame(interval);
						$posterframe.show();
					});

					if (settings.start === 'autoplay'){
						$this.trigger('play.seeThru'); //trigger play
					} else if (settings.start === 'clicktoplay'){
						video.play();
						video.pause(); // fake play to initialize playhead
						drawFrame();

						displayCanvas.one('click.seeThru', function(){
							video.play();
						});
					} else if (settings.start === 'external'){
						video.play();
						video.pause(); // fake play to initialize playhead
						drawFrame();
					} else {
						video.play();
					}

					if (settings.end === 'loop') {
						$this.on('ended.seeThru', function(){
							$this.one('pause', function(e){
								e.stopImmediatePropagation();
							});
							video.play();
						});
					} else if (settings.end === 'rewind'){
						$this.on('ended.seeThru', function(){
							video.pause();
							video.currentTime = 0;
							if (settings.start === 'clicktoplay'){ displayCanvas.one('click.seeThru', video.play); }
						});
					} else {
						$this.on('ended.seeThru', function(){
							video.pause();
							if (settings.start == 'clicktoplay'){ displayCanvas.one('click.seeThru', video.play); }
						});
					}

					// draw buffer info into display canvas @req set to true makes the function call itself again via requestAnimationFrame
					function drawFrame(req){

						buffer.drawImage(video, 0, 0, dimensions.width, dimensions.height * divisor); //scales if <video>-dimensions are not matching

						var
						image = buffer.getImageData(0, 0, dimensions.width, dimensions.height)
						, alphaData = buffer.getImageData(0, dimensions.height, dimensions.width, dimensions.height).data; //grab from video;

						if (settings.unmult){ unmultiply(image, alphaData); }

						//calculate luminance from buffer part, no weighting needed when alpha mask is used
						for (var i = 3, len = image.data.length; i < len; i = i + 4) {
							image.data[i] = settings.alphaMask ? alphaData[i - 1] : Math.max(alphaData[i - 1], alphaData[i - 2], alphaData[i - 3]);
						}

						display.putImageData(image, 0, 0, 0, 0, dimensions.width, dimensions.height);

						if (req){
							interval = requestAnimationFrame(function(){
								drawFrame(true);
							});
							if ($this.data('seeThru')){ $this.data('seeThru').interval = interval; }
						}

					}

				});

				// trigger fake event in case seeThru is applied a second time
				if (this.videoWidth && this.videoHeight){ $(this).trigger('loadedmetadata.seeThru'); }

			});

		},

		updateMask : function(options){

			// this lets you define a <img> (selected by #id or .class - class will use the first occurence)
			// used as a black and white mask instead of adding the alpha to the video
			var settings = $.extend({
				mask: ''
			}, options);

			return this.each(function(){

				var
				$this = $(this)
				, staticMask = $this.data('seeThru').staticMask
				, alphaMask = $this.data('seeThru').alphaMask
				, dimensions = {
					width : $this.width()
					, height : $this.height()
				}
				, maskObj = $(settings.mask)[0]
				, buffer = $this.nextAll('.seeThru-buffer')[0].getContext('2d');

				if (!$(settings.mask).length){ throw new Error('Missing or invalid parameter \'mask\''); }
				if (!staticMask){ throw new Error('Cannot apply method `.updateMask()` to element with moving alpha'); }
				if ($(settings.mask)[0].tagName !== 'IMG'){ throw new Error('Passed mask element must be <img>'); }

				maskObj.width = dimensions.width;
				maskObj.height = dimensions.height;

				if (alphaMask){
					// alpha channel has to be converted into RGB
					buffer.putImageData(convertAlphaMask(dimensions, maskObj), 0, dimensions.height);
				} else {
					// no conversion needed, draw image into buffer
					buffer.drawImage(maskObj, 0, dimensions.height, dimensions.width, dimensions.height);
				}

			});

		}
		// remove all traces the conversion has left in the DOM
		, revert : function(){
			return this.each(function(){
				var $this = $(this);
				if ($this.data('seeThru')){
					if ($this.data('seeThru') && 'interval' in $this.data('seeThru')){
						cancelAnimationFrame($this.data('seeThru').interval);
					}
					$this.show().unbind('.seeThru').removeData('seeThru').nextAll('.seeThru-buffer:first, .seeThru-display:first').remove();
				}
			});
		}
		, play : function(){
			return this.each(function(){
				if ($(this).data('seeThru')){
					this.play();
				}
			});
		}
		, pause : function(){
			return this.each(function(){
				if ($(this).data('seeThru')){
					this.pause();
				}
			});
		}
		// this method is not documented due to strange behavior in Webkit
		, rewind : function(){
			return this.each(function(){
				if ($(this).data('seeThru')){
					this.pause();
					this.currentTime = 0;
				}
			});
		}

	};

	$.fn.seeThru = function(method){ // Method calling logic -- see: http://docs.jquery.com/Plugins/Authoring
		if (methods[method]){
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			throw new Error('Method ' +  method + ' does not exist on jQuery.seeThru');
		}
	};

});
