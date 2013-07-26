#jQuery seeThru - HTML5 video with alpha channel transparencies#

This jQuery plugin adds "support" for the lacking alpha channel in HTML5 `<video>` elements.<br/>The original video data will simply be re-rendered into a canvas-element, therefore adding the possibility to use alpha information for your video. The alpha channel can either be included in the video's source file or in a seperate `<img>`-element.

##Download / Installation##
Click **[here][17]** to download the current version or clone the repo:
```bash
$ git clone git://github.com/m90/jquery-seeThru.git
```
If you're using Bower you can install the package using:
```bash
$ bower install jquery-seeThru
```


##Word of warning##
This plugin is a **cheap hack**! For the lack of alpha support in HTML5 video it is one of the few ways to use video with alpha, so it might be a viable option in some cases, but please don't expect it to work like a charm when processing 30fps 1080p video. Test your usage thoroughly on old machines as well and if you're not satisfied with the speed, maybe think about using Flash Video (there, I said it!). Also: **no iOS support**, sorry!!!

##Table of contents##
 - <a href="#video-setup">Video Setup</a>
 - <a href="#basic-plugin-usage">Basic Plugin Usage</a>
 - <a href="#options">Options</a>
 - <a href="#additional-methods">Additional methods</a>
 - <a href="#examples">Examples</a>
 - <a href="#feature-testing">Feature testing</a>
 - <a href="#too-much-jquery">Too much jQuery?</a>
 - <a href="#cross-domain-issues-with-canvas-elements">CrossDomain issues with canvas elements</a>
 - <a href="#binding-mouse-events-to-your-video">Binding mouse events to your video</a>
 - <a href="#safari-6-issues">Safari 6 issues</a>
 - <a href="#mobile-devices--tablets">Mobile devices & tablets</a>
 - <a href="#browser-support">Browser support</a>
 - <a href="#preparing-video-sources-in-adobe-after-effects">Preparing video sources in Adobe After Effects</a>
 - <a href="#tldr">tl;dr</a>
 - <a href="#changelog">Changelog</a>
 - <a href="#licensing">Licensing</a>

##Video setup##
In default configuration the plugin assumes that the alpha information is added underneath the original video track (in the exact same dimensions, therefore a video of 400x300 target dimensions will have a 400x600 source file). The alpha information should be a black and white image with white being interpreted as fully opaque and black being fully transparent (colored information will be averaged).<br/>For optimal results the color channel should be un-premultiplied. (see the Wikipedia article on **[Alpha Compositing][15]** for more info on what that is all about). If you need a tool to un-premultiply your imagery you can use **[Knoll Unmult][16]** which is available for quite a lot of packages.<br/>
For a basic introduction of how to encode and embed video for HTML5 pages see the great **[Dive into HTML5][14]**
###Example image:###
Note the jagged edges in the color channel(s) due to un-premultiplying:<br/>
![Example image][5]<br/>
put over a greenish/blueish background results in<br/>
![Example image][6]<br/>
**[Live Demo][1]**
###Static Mask###
It is also possible to source the alpha information from an `<img>`-element not incorporated into the video. The plugin lets you use either the luminance information of the RGB channels (i.e. the image) or the image's alpha channel (see options for how to choose). In case the image does not fit your video's dimensions it will be stretched to those.<br/>
**[Live Demo][2]**

##Basic plugin usage##
Basic HTML5 video markup should look something like this:

```html
<video id="myVideo">
    <source src="src.mp4" type="video/mp4">
    <source src="src.ogg" type="video/ogg">
    ....
</video>
```

In case you are planning to have your video set to autoplay or loop you can do this when initializing the plugin. The lack of a loop option in Firefox will also be fixed when doing that.<br/>
To make the magic happen you just have to do the following:<br/>
Include jQuery (needs 1.7+) and the plugin in your `<head>`:

```html
<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
<script type="text/javascript" src="jquery-seeThru.min.js"></script>
```
and then call the following jQuery method on your video (preferrably on `$(document).ready`):

```javascript
$(document).ready(function(){
    $('#myVideo').seeThru();
});
```

If you specify dimension-attributes in your markup they will be considered, in case not the dimensions of the source file will be used (video with alpha included will of course turn out to be halved in height). To avoid flickering on pageload I'd recommend setting your video to `display:none;` in your CSS.<br/>In case you want to style the generated canvas elements, the generated markup (you don't have to add this portion - the plugin does this) looks like this:
```html
<video style="display:none;">...</video><!-- video is hidden -->
<canvas height="XXX" width="XXX" class="seeThru-display"></canvas><!-- this is the actual "video" -->
<canvas height="XXX" width="XXX" class="seeThru-buffer" style="display: none;"></canvas><!-- this is just a helper element -->
```
If you just want to give the plugin a test-drive without having to prepare your own video you can download and use the example videos in the repo's **[media folder](https://github.com/m90/jquery-seeThru/tree/master/media)** (also included in the zipped download).

##Options##
There are a few options you can pass when calling the plugin:

 - `start` defines the video's behavior on load. It defaults to `'autoplay'` which will automatically start the video as soon as possible. Other options are `'clicktoplay'` which will display the first frame of the video until it is clicked or `'external'` which will just display the first frame of the video and wait for external JS calls (so you can build your own interface or something - note that although the `<video>` is hidden it is still playing and controls the rendered image).
 - `end` defines the video's behavior when it has reached its end. It defaults to `'loop'` which will loop the video. Other possibilities are `'stop'` (it will just stop), or `'rewind'` which will jump back to the first frame and stop. If you use `start:'clicktoplay'` along with `'rewind'` or `'end'` the video will be clickable again when finished.
 - `mask` lets you use the content of an `<img>` node as alpha information (also black and white). The parameter expects a CSS selector (preferrably ID) that refers directly to an image tag, like `'#fancyMask'`. In case it returns a collection (class passed), the first element is used - in case the selector matches nothing or a non-image node the option is ignored. Defaults to an empty string, so video information is used for the alpha.
 - `alphaMask` specifies if the plugin uses either the black and white information (i.e. `false`) or the alpha information (i.e. `true`) of the element specified in the `mask` parameter. Defaults to `false`.
 - `height` can be used to control the height of the rendered canvas. Overrides the attributes of the `<video>`-element
 - `width` can be used to control the width of the rendered canvas. Overrides the attributes of the `<video>`-element
 - `poster` can be set to `true` if you want the video to be replaced by the image specified in the `<video>`s `poster`-attribute when in a paused state
 - `unmult` can be used if your source material's RGB channels are premultiplied (with black) and you want the plugin to un-premultiply the imagery. Note that this might have bad effects on performance, so it is recommended to work with unpremultiplied video sources
 - `shimRAF` can be set to false if you don't want the plugin to shim the `requestAnimationFrame` API (e.g when you are already doing this yourself or only need to support browsers that support an unprefixed `requestAnimationFrame`). The plugin is using the [Paul Irish polyfill][18]

This might look like this:
```javascript
$('#myVideo').seeThru({start : 'autoplay' , end : 'stop'});
```
or
```javascript
$('#myVideo').seeThru({mask : '#imageWithAlpha', alphaMask: true});
```
##Additional methods##
Apart from `init`, these methods are available:

 - `updateMask` lets you swap the alpha source for a video that uses static alpha information. Has to be used along with a new selector as `mask` parameter, the value for `alphaMask` will be kept from init.
 - `revert` will revert the `<video>` element back to its original state, remove the `<canvas>` elements, all attached data and event listeners/handlers
 - `play` and `pause` can be used to control the playback of the video - basically the same as `$('#video')[0].play()`, but still chainable

This might look like:
```javascript
/* sets mask to element with id "newMask" */
$('#myVideo').seeThru('updateMask', {mask : '#newMask'});
```
or
```javascript
/* destroys seeThru functionality and adds class "plainOldVideo" */
$('#myVideo').seeThru('revert').addClass('plainOldVideo');
```
or
```javascript
/* pauses video and binds click handler to resume playback */
$('#myVideo').seeThru('pause').one('click', function(){
	$(this).seeThru('play');
});
```
or
```javascript
/* makes video play only on hover */
$('#myVideo').seeThru({start : 'external'}).hover(function(){
	this.play(); //we can use the DOM element's methods here as well as `this` is the video
}, function(){
	this.pause(); //we can use the DOM element's methods here as well as `this` is the video
});
```
##Examples##
**[Moving alpha][1]**<br>
**[Static alpha][2]**<br>
**[Swapping alpha sources][3]**<br>
**[Video listening to external JS calls][4]**<br>
**[Video playing on hover][26]**<br>

##Feature testing##
I'm having a hard time finding a proper feature test for a browser's ability to use `<video>` as a source for `<canvas>` (so I could include it into the library), but for anyone interested I did find a hacky and sometimes unreliable **[test][27]** that is at least working on iOS (so one main pitfall is gone at least). If anyone does know of a proper way to test this, do not hesitate to tell me.

If you do need bullet-proof results you might need to rely on UA sniffing though.

##Too much jQuery?##
If you do not want to use jQuery, but still think transparent video is nice, here's **[a gist][13]** showing how the basic principle works.

##Cross Domain issues with canvas-elements##
Please note that JavaScript's canvas-methods are subject to cross domain security restrictions, so please be aware that the video source files have to be coming from the same domain (i.e. if the document that is calling `seeThru` is on `www.example.net` the video files have to be requested from `www.example.net` as well), otherwise you will get a DOM Security Exception. Please also note that this also applies to subdomains, therefore you shouldn't mix www and non-www-URLs.

If you're living on the cutting edge (the 2007 kind of) you can also use **[CORS][28]** of course!

##Binding mouse events to your video##
To mimic a behavior as if the original video was still visible it will echo all mouse events fired by the canvas representation. This means that you can still do sth like:
```javascript
$('#myVideo').seeThru(); // the <video> is hidden
$('#myVideo').click(function(){ //this is still working as a click on the `.seeThru-display`-<canvas> will be echoed by the video`
   alert('But I thought I was hidden?');
});
```
The events that are echoed are: `mouseenter mouseleave click mousedown mouseup mousemove mouseover hover dblclick contextmenu focus blur`

##Safari 6 issues###
Apparently Safari 6 on Mac has severe problems using video as source elements for canvas operations. Nightly webkit builds already fixed this problem, yet if you need advice on this topic there's **[a question on Stackoverflow](http://stackoverflow.com/questions/9929546/canvas-to-video-is-very-slow-on-safari-lion-mountain-lion)** tackling this problem. Feedback is welcome.

##Mobile devices & tablets##
As most mobile devices and tablets (iPad I'm looking at you) use external video players to handle HTML5-video this plugin is **not working on mobile Webkit / Safari / Android Browser** (yet). This is definitely on our to-do-list (wishlist rather), although outcome is uncertain.
Apparently Android 3.1+ will play `<video>` inline, but I do not have any experience regarding using it as a canvas source yet.

##Browser support##
Tested on Chrome, Firefox, Safari, Opera and IE 9.0+
(the browser has to support `<video>` and `<canvas>` of course)<br/>See caniuse.com for browsers that support **[`<canvas>`][24]** and **[`<video>`][25]**<br/>If you are looking for a tool to detect these features have a look at <a href="http://www.modernizr.com/">Modernizr</a>

##Preparing video sources in Adobe After Effects##
Put your animation with alpha in a composition:
![After Effects walkthru 1][20]<br/>
Double the composition's height:
![After Effects walkthru 2][21]<br/>
Duplicate your footage layer, align them, and use the second instance as Alpha Track Matte for a white solid:
![After Effects walkthru 3][22]<br/>
Make sure you are using an unmultiplied (straight) version of your color source:
![After Effects walkthru 4][23]<br/>
If you don't want to use a GUI based approach, this can also be done using ffmpeg something like **[this](http://stackoverflow.com/questions/9293265/ffmpeg-2-videos-transcoded-and-side-by-side-in-1-frame)**
##tl;dr##
Put a black-and white alpha channel right underneath your `<video>` source (in the same file), load jQuery and let the plugin do magical things:
<code>
$('#myRadVideoNeedsTransparencies').seeThru();
</code><br>
Voila! Here's an [example][1]. Ready to :shipit:?

##Changelog##
   * v1.0.1: added poster option, plugin now requires jquery 1.7+ as it's using `.on()` instead of `.bind()` now
   * v1.0.0: using grunt for minification and linting now, removed version number from files, added a `shimRAF` option, added `unmult` option, code clean up
   * v0.9.9: changed version number to be able to push new tag to plugins.jquery.com, video's loop attribute will be overridden if the plugin is set to `'end' : 'stop'`
   * v0.9.8: the plugin is now using `requestAnimationFrame` when possible and falls back to `setInterval` when needed, `fps` and `forceRendering` options are therefore deprecated / of no use anymore
   * v0.9.7: the original video will now echo mouse events triggered by the canvas represenation, so you can still "use" the hidden video element to bind events for user interaction, faster
   * v0.9.6: elements that are not visible in the viewport will stop rendering to lower CPU usage, added the `forceRendering` option
   * v0.9.5: added simple video playback control methods: `play` and `pause`
   * v0.9.4: fixed canvas updating issues when listening to external interfaces
   * v0.9.3: added the `revert` method and `width` and `height` options, fixed even more chaining issues, proper event namespacing
   * v0.9.2: added support for `alphaMask`, added the possibility to swap static masks via `updateMask`, improved interpretation of colored images as black and white mask, improved performance, properly namespaced (`seeThru`-prefix) the applied classes, fixed chaining issues, added error messages, nicer example pages
   * v0.9.1: added the `mask` option that enables the use of a static image as alpha information, also some minor improvements in overall perfomance
   * v0.9.0: first version

Older versions (< 0.9.6) are available at **[Google Code][9]**

##Licensing##
This plugin is licensed under the **[MIT License][11]**, demo content, video and imagery is **[CC-BY-SA 3.0][12]**

##Thank you##
Thanks to **[Jake Archibald][7]**, who had the original idea for this approach, **[Kathi Käppel][8]** who designed the lovely Mr. Kolor from the demo and Sebastian Lechenbauer for making fun of my git dyslexia.
![Footer image][10]

[1]:http://m90.github.io/jquery-seeThru/movingAlpha.html
[2]:http://m90.github.io/jquery-seeThru/staticAlpha.html
[3]:http://m90.github.io/jquery-seeThru/swapAlpha.html
[4]:http://m90.github.io/jquery-seeThru/external.html
[5]:http://www.frederikring.com/seeThru/img/seeThruDemo.png
[6]:http://www.frederikring.com/seeThru/img/seeThruResult.png
[7]:http://www.jakearchibald.com
[8]:http://www.kathikaeppel.de
[9]:http://code.google.com/p/jquery-seethru/
[10]:http://www.frederikring.com/seeThru/img/footer.png
[11]:http://www.opensource.org/licenses/mit-license.php
[12]:http://creativecommons.org/licenses/by-sa/3.0/
[13]:https://gist.github.com/2469449
[14]:http://www.diveintohtml5.info/video.html
[15]:http://en.wikipedia.org/wiki/Alpha_compositing
[16]:http://www.redgiantsoftware.com/products/all/knoll-unmult-free
[17]:https://github.com/m90/jquery-seeThru/zipball/master
[18]:http://paulirish.com/2011/requestanimationframe-for-smart-animating/
[20]:http://www.frederikring.com/seeThru/img/seeThru_AE_01.jpg
[21]:http://www.frederikring.com/seeThru/img/seeThru_AE_02.jpg
[22]:http://www.frederikring.com/seeThru/img/seeThru_AE_03.jpg
[23]:http://www.frederikring.com/seeThru/img/seeThru_AE_04.jpg
[24]:http://caniuse.com/#feat=canvas
[25]:http://caniuse.com/#feat=video
[26]:http://m90.github.io/jquery-seeThru/hover.html
[27]:https://gist.github.com/m90/5795556
[28]:http://www.html5rocks.com/en/tutorials/cors/