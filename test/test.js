QUnit.module('seeThru', {
	beforeEach: function () {
		document.body.innerHTML = '\
			<video onended="this.play();" loop id="test-video">\
				<source src="http://localhost:9876/base/media/kolor.mp4" type="video/mp4" />\
			</video>\
		';
	},
	afterEach: function () {
		document.body.innerHTML = '';
	}
});

QUnit.test('default config', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (err, instance, video) {
		assert.equal(err, null);
		var $testvideo = $(video);
		assert.ok(!$testvideo.is(':visible'), 'video is hidden');
		assert.ok($('.seeThru-display').length, 'display canvas is created');
		assert.ok($('.seeThru-display').is(':visible'), 'display canvas is shown');
		assert.ok(!$('.seeThru-buffer').is(':visible'), 'buffer canvas is hidden');
		assert.equal($testvideo.height(), $('.seeThru-display').height() * 2, 'height is correct');
		assert.equal($testvideo.width(), $('.seeThru-display').width(), 'width is correct');

		instance.revert();

		assert.ok($testvideo.is(':visible'), 'video is shown');
		assert.equal($('.seeThru-buffer').length, 0, 'buffer canvas is deleted');
		assert.equal($('.seeThru-display').length, 0, 'display canvas is deleted');
		done();
	});
});

QUnit.test('namespace option', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video', { namespace: 'test' }).ready(function (err) {
		assert.equal(err, null);
		assert.ok($('.test-display').length, 'display canvas is created with correct classname');
		assert.ok($('.test-buffer').length, 'buffer canvas is created with correct classname');
		done();
	});
});

QUnit.test('custom video styles', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video', { videoStyles: { width: 0, border: '1px solid red' } }).ready(function (err, instance, video) {
		assert.equal(err, null);
		var $testvideo = $(video);
		assert.equal($testvideo.width(), 0, 'video is hidden using custom styles');
		assert.equal($testvideo.css('border'), '1px solid rgb(255, 0, 0)', 'video is hidden using custom styles');
		instance.revert();
		assert.notEqual($testvideo.width(), 0, 'video is shown');
		assert.equal($testvideo.css('border'), '0px none rgb(0, 0, 0)', 'video is shown');
		done();
	});
});


QUnit.test('event routing', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video', { start: 'clicktoplay' }).ready(function (err, instance, video) {
		assert.equal(err, null);
		var $testvideo = $(video);
		$testvideo.on('playing', function () {
			assert.ok(true, 'click event routed video starts playing');
			done();
		});
		$('.seeThru-display').click();
	});
});

QUnit.test('autoplay', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video', { start: 'autoplay' }).ready(function (err, instance, video) {
		assert.equal(err, null);
		var $testvideo = $(video);
		$testvideo.on('playing', function () {
			assert.ok(true, 'video started playing when passing autoplay');
			done();
		});
	});
});

QUnit.test('caller controls playback', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (err, instance, video) {
		assert.equal(err, null);
		var $testvideo = $(video);
		$testvideo
			.on('playing', function () {
				assert.ok(true, 'video starts playing');
				done();
			})
			.hover(function () {
				this.play();
			});

		assert.ok($('.seeThru-display').is(':visible'), 'still frame shown');
		$testvideo.trigger('mouseover');
	});
});

QUnit.test('async callback', function (assert) {
	var done = assert.async();
	var check = 12;
	window.seeThru.create('#test-video').ready(function () {
		var innerCheck = 44;
		assert.equal(check, 24);
		window.seeThru.create('#test-video').ready(function () {
			assert.equal(innerCheck, 88);
			done();
		});
		innerCheck = 88;
	});
	check = 24;
});

QUnit.test('apply to video only', function (assert) {
	var done = assert.async();
	var container = document.createElement('div');
	document.body.appendChild(container);

	window.seeThru.create(container).ready(function (err) {
		assert.notEqual(err, null, 'passes error to callback');
		done();
	});
});


QUnit.test('apply only once', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (err) {
		assert.equal(err, null);
		window.seeThru.create('#test-video').ready(function (err) {
			assert.notEqual(err, null);
			done();
		});
	});
});

QUnit.test('renders video', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (err, instance, video, canvas) {
		assert.equal(err, null);
		setTimeout(function () {
			var data = canvas.getContext('2d').getImageData(200, 200, 100, 100).data;
			assert.ok(Math.max.apply(Math, data) > 1);
			done();
		}, 100);
	});
});


QUnit.test('jQuery plugin', function (assert) {
	assert.ok('seeThru' in $.fn, 'plugin is attached');
	assert.ok(typeof $.fn.seeThru === 'function', 'seeThru is function');
});
