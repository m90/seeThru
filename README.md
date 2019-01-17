# seeThru - HTML5 video with alpha channel transparencies

[![Build Status](https://travis-ci.org/m90/seeThru.svg?branch=master)](https://travis-ci.org/m90/seeThru)

> This package adds "support" for the lacking alpha channel in HTML5 `<video>` elements. Formerly known as "jquery-seeThru"

---

Your HTML5 video source is re-rendered into a canvas-element, adding the possibility to use transparencies in your video. Alpha information is either included in the video's source file (moving) or in a seperate `<img>`-element (static).

The package also ships with a simple CLI tool for automatically converting your RGBA video sources into the correct format.

## Before you start

Native Support for VP8/WebM-video with Alpha Transparencies has landed in Chrome quite a while ago, so ideally other **[browser vendors will catch up soon][35]** and this script becomes obsolete at some point. You can see the **[article at HTML5 Rocks][29]** and read the discussion about **[how to use seeThru as a "polyfill"][34]** for more information.

## Download / Installation

npm:
```sh
$ npm install seethru
```

bower:
```sh
$ bower install seethru
```

CDN:
```html
<script src="https://unpkg.com/seethru@4/dist/seeThru.min.js"></script>
<!-- or -->
<script src="https://cdn.jsdelivr.net/npm/seethru@4/dist/seeThru.min.js"></script>
```

Alternatively, use the version(s) in `/dist`.

## Word of warning

This approach is a **cheap hack**! Due to the lack of alpha support in HTML5 video it is one of the few ways to use video with alpha, so it might be the only viable option in some cases, but please don't expect it to work like a charm when processing 30fps 1080p video (or multiple videos) on an old machine with 39 browser tabs opened. Test your usage thoroughly on old machines as well and if you're not satisfied with the speed, maybe think about using a purely native solution. Also: the mobile support of this approach is **very limited**.

## Table of contents
 - <a href="#video-setup">Video Setup</a>
 - <a href="#basic-script-usage">Basic Script Usage</a>
 - <a href="#options">Options</a>
 - <a href="#additional-methods">Additional methods</a>
 - <a href="#usage-as-a-jquery-plugin">Usage as a jQuery-plugin</a>
 - <a href="#examples">Examples</a>
 - <a href="#preparing-video-sources-using-seethru-convert">Preparing video sources using `seethru-convert`</a>
 - <a href="#preparing-video-sources-in-adobe-after-effects">Preparing video sources in Adobe After Effects</a>
 - <a href="#cross-domain-issues-with-canvas-elements">CrossDomain issues with canvas elements</a>
 - <a href="#binding-mouse-events-to-your-video">Binding mouse events to your video</a>
 - <a href="#mobile-devices--tablets">Mobile devices & tablets</a>
 - <a href="#browser-support">Browser support</a>
 - <a href="#license">License</a>

## Video setup

In default configuration the script assumes that the alpha information is added underneath the original video track (in the exact same dimensions: a video of 400x300 target dimensions will have a 400x600 source file). The alpha information should be a black and white image, with white being interpreted as fully opaque and black being fully transparent (colored input will be averaged).

For optimal results the color channel should be un-premultiplied. (see the Wikipedia article on **[Alpha Compositing][15]** for more info on what that is all about). If you need a tool to un-premultiply your imagery you can use **[Knoll Unmult][16]** which is available for quite a lot of packages. If there is no way for you to supply unmultiplied sources, you can use the [`unmult` option](#options), that comes with a severe performance penalty due to un-premultiplying at runtime.

For a basic introduction of how to encode and embed video for HTML5 pages see the great **[Dive into HTML5][14]**

### Example image:

Note the jagged edges in the color channel(s) due to un-premultiplying:<br/>
![Example image][5]<br/>
put over a greenish/blueish background results in<br/>
![Example image][6]<br/>
**[Live Demo][1]**

### Static Mask

It is also possible to source the alpha information from an `<img>`-element. The script lets you use either the luminance information of the RGB channels (i.e. the image) or the image's alpha channel (see options for how to choose). In case the image does not fit your video's dimensions it will be stretched to fit those.

**[Live Demo][2]**

## Basic script usage

To use the script include the source:

```html
<script type="text/javascript" src="seeThru.min.js"></script>
```

and then pass your video element (either a selector or an actual DOMElement) and your options to `seeThru.create(el[, options])`:

```js
var transparentVideo = seeThru.create('#my-video');
```

If you specify dimension-attributes for your video, they will be considered, in case they are left unspecified, the dimensions of the source file will be used (video with alpha included will of course turn out to be halved in height).

For testing you can download and use the example videos in the repo's **[media folder](https://github.com/m90/seeThru/tree/master/media)**.

## Options

There are a few options you can pass when building an instance:

 - `start` defines the video's behavior on load. It defaults to `external` which will just display the first frame of the video and wait for the caller to initiate video playback. Other options are `clicktoplay` which will display the first frame of the video until it is clicked.
 - `end` defines the video's behavior when it has reached its end. It defaults to `stop`. Other possibilities are `rewind` which will jump back to the first frame and stop. If you use `start: 'clicktoplay'` along with `rewind` or `end` the video will be clickable again when finished.
 - `staticMask` lets you use the content of an `<img>` node as alpha information (also black and white). The parameter expects a CSS selector (preferrably ID) that refers directly to an image tag, like `#fancy-mask`. In case the selector matches nothing or a non-image node the option is ignored.
 - `alphaMask` specifies if the script uses either the black and white information (i.e. `false`) or the alpha information (i.e. `true`) of the element specified in the `mask` parameter. Defaults to `false`.
 - `height` can be used to control the height of the rendered canvas. Overrides the attributes of the `<video>`-element
 - `width` can be used to control the width of the rendered canvas. Overrides the attributes of the `<video>`-element
 - `poster` can be set to `true` if you want the video to be replaced by the image specified in the `<video>`s `poster`-attribute when in a paused state
 - `unmult` can be used if your source material's RGB channels are premultiplied (with black) and you want the script to un-premultiply the imagery. Note that this might have really bad effects on performance, so it is recommended to work with unpremultiplied video sources
 - `videoStyles` is the CSS (in object notation) that is used to hide the original video - can be updated in order to work around autoplay restrictions. It defaults to `{ display: 'none' }`
 - `namespace` is the prefix that will be used for the CSS classnames applied to the created DOM elements (buffer, display, posterframe), defaults to `seeThru`

This might look like this:

```js
seeThru.create('#my-video');
```

or

```js
seeThru.create('#my-video', { staticMask: '#image-with-alpha', alphaMask: true });
```

## Additional methods
On the returned `seeThru`-Object these methods are available:

 - `.ready(fn)` lets you safely access the instance's methods as it will make sure the video's metadata has been fully loaded and the script was able to initialize. It will be passed the `seeThru` instance as 1st argument, the used video as 2nd argument, and the canvas representation as the 3rd one. To ensure consistent behavior this will always be executed asynchronously, even if the video is ready when called.
 - `.updateMask(selectorOrElement)` lets you swap the alpha source for a video that uses static alpha information. The value for the `alphaMask` option will be kept from initialisation.
 - `.revert()` will revert the `<video>` element back to its original state, remove the `<canvas>` elements, all attached data and event listeners/handlers
 - `.play()` and `.pause()` are convenience methods to control the playback of the video
 - `.getCanvas()` lets you get the visible canvas element so you can interact with it

Example:
```js
seeThru
    .create('#my-video', { width: 400, height: 300 })
    .ready(function (instance, video, canvas) {
        canvas.addEventListener('click', function () {
            instance.revert();
        });
        video.addEventListener('ended', function () {
            instance.revert();
        });
    });
```

## Usage as a jQuery-plugin

If `window.jQuery` is present the script will automatically attach itself to jQuery as a plugin, meaning you can also do something like:

```js
$('#my-video').seeThru().seeThru('play');
```

If your jQuery is *not* global (AMD/browserify) but you still want to attach the script as a plugin you can use the `attach`  method exisiting on `seeThru`.

```js
var $ = require('jquery');
seeThru.attach($);
```

## Examples

- **[Moving alpha][1]**
- **[Static alpha][2]**
- **[Swapping alpha sources][3]**
- **[Video listening to external JS calls][4]**
- **[Video playing on hover][26]**

## Preparing video sources using `seethru-convert`

The package ships with a CLI tool (`seethru-convert`) that can prepare your video sources for you. Pass a video with alpha information (Animation-compressed `.mov`s should work best here - also make sure the video actually contains information on the alpha channel) and it will automatically separate alpha and RGB information and render them side by side into the target file.

To install the CLI tool globally:

```sh
$ npm install seethru -g
```

To use the script you need to have [`ffmpeg` and `ffprobe`][31] installed. The executables needs to be in your `$PATH` (`%PATH` for Windows). Alternatively you can pass overrides for the executables used using the `--ffmpeg-path` and `--ffprobe-path` options.

Now you are ready to go:

```sh
$ seethru-convert --in myvideo.mov --out myvideo-converted.mov
```

Ideally you should be doing this conversion on your uncompressed / high-quality video source once, and then convert the output into whatever files you need (mp4, ogg et. al.) afterwards.

## Preparing video sources in Adobe After Effects

You can also use standard video editing software to prepare the sources. This walkthrough shows how to do it using Adobe After Effects.

Put your animation with alpha in a composition:
![After Effects walkthru 1][20]<br/>
Double the composition's height:
![After Effects walkthru 2][21]<br/>
Duplicate your footage layer, align them, and use the second instance as Alpha Track Matte for a white solid:
![After Effects walkthru 3][22]<br/>
Make sure you are using an unmultiplied (straight) version of your color source:
![After Effects walkthru 4][23]<br/>

## Cross Domain issues with canvas-elements

Note that the canvas API is subject to cross domain security restrictions, so be aware that the video source files have to be served from the same domain (i.e. if the document that is calling `seeThru` is on `www.example.net` the video files have to be requested from `www.example.net` as well), otherwise you will see a DOM Security Exception. Also note that this also applies to subdomains, therefore you cannot mix www and non-www-URLs.

This can be worked around when using **[CORS][28]** or by using **[Blob URLs][32]**:

````js
function loadAsObjectURL(video, url) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function (response) {
        return video.src = URL.createObjectURL(xhr.response);
    };
    xhr.onerror = function () { /* Houston we have a problem! */ };
    xhr.open('GET', url, true);
    xhr.send();
    video.onload = function () { return URL.revokeObjectURL(video.src); };
}

var video = document.querySelector('video');
video.addEventListener('loadedmetadata', function () {
    seeThru.create(video);
});
loadAsObjectURL(video, 'https://www.example.net/video.mp4');
````

## Binding mouse events to your video

To mimic a behavior as if the original video was still visible it will echo all mouse events fired by the canvas representation.

The events that are echoed are: `mouseenter mouseleave click mousedown mouseup mousemove mouseover hover dblclick contextmenu focus blur`

## Mobile devices & tablets

Support for mobile browsers is patchy due to some forcing any video to open in an external player or requiring user interaction. [As of iOS 10][33], a video will work with seeThru if:

- the video has a `playsinline` attribute
- the video has no audio track or a `muted` attribute

```html
<video id="video" autoplay loop playsinline muted></video>
```

In any case you will need to add the `playsinline` attribute to the `<video>` tag. If a video has audio, adding the `muted` attribute will enable `playsinline`.

## Browser support

The script is tested on Chrome, Firefox, Safari, Opera and IE 9.0+.  
See caniuse.com for browsers that support **[`<canvas>`][24]** and **[`<video>`][25]**  

## License

All source code is licensed under the **[MIT License][11]**, demo content, video and imagery is available under **[CC-BY-SA 3.0][12]**

## Thank you

Thanks to **[Jake Archibald][7]**, who had the original idea for this approach, **[Kathi Käppel][8]** who designed the lovely Mr. Kolor from the demo and Sebastian Lechenbauer for making fun of my git dyslexia.
![Footer image][10]

[1]:http://m90.github.io/seeThru/moving-alpha/
[2]:http://m90.github.io/seeThru/static-alpha/
[3]:http://m90.github.io/seeThru/swap-alpha/
[4]:http://m90.github.io/seeThru/external/
[5]:http://m90.github.io/seeThru/img/seeThruDemo.png
[6]:http://m90.github.io/seeThru/img/seeThruResult.png
[7]:http://www.jakearchibald.com
[8]:http://www.kathikaeppel.com/
[10]:http://m90.github.io/seeThru/img/footer.png
[11]:http://www.opensource.org/licenses/mit-license.php
[12]:http://creativecommons.org/licenses/by-sa/3.0/
[14]:http://www.diveintohtml5.info/video.html
[15]:http://en.wikipedia.org/wiki/Alpha_compositing
[16]:http://www.redgiantsoftware.com/products/all/knoll-unmult-free
[18]:http://paulirish.com/2011/requestanimationframe-for-smart-animating/
[20]:http://m90.github.io/seeThru/img/seeThru_AE_01.jpg
[21]:http://m90.github.io/seeThru/img/seeThru_AE_02.jpg
[22]:http://m90.github.io/seeThru/img/seeThru_AE_03.jpg
[23]:http://m90.github.io/seeThru/img/seeThru_AE_04.jpg
[24]:http://caniuse.com/#feat=canvas
[25]:http://caniuse.com/#feat=video
[26]:http://m90.github.io/seeThru/hover/
[28]:http://www.html5rocks.com/en/tutorials/cors/
[29]:http://updates.html5rocks.com/2013/07/Alpha-transparency-in-Chrome-video
[30]:http://nodejs.org
[31]:http://ffmpeg.org
[32]:http://caniuse.com/#feat=bloburls
[33]:https://webkit.org/blog/6784/new-video-policies-for-ios/
[34]: https://github.com/m90/seeThru/issues/47
[35]: https://caniuse.com/#feat=webm
