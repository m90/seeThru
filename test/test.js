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
	window.seeThru.create('#test-video').ready(function (instance, video) {
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
	window.seeThru.create('#test-video', { namespace: 'test' }).ready(function () {
		assert.ok($('.test-display').length, 'display canvas is created with correct classname');
		assert.ok($('.test-buffer').length, 'buffer canvas is created with correct classname');
		done();
	});
});

QUnit.test('custom video styles', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video', { videoStyles: { width: 0, border: '1px solid red' } }).ready(function (instance, video) {
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
	window.seeThru.create('#test-video', { start: 'clicktoplay' }).ready(function (instance, video) {
		var $testvideo = $(video);
		$testvideo.on('playing', function () {
			assert.ok(true, 'click event routed video starts playing');
			done();
		});
		$('.seeThru-display').click();
	});
});

QUnit.test('external JS calls', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (instance, video) {
		var $testvideo = $(video);

		$testvideo.on('playing', function () {
			assert.ok(true, 'video starts playing');
			done();
		});

		$testvideo.hover(function () {
			this.play();
		});

		assert.ok($('.seeThru-display').is(':visible'), 'still frame shown');

		$testvideo.trigger('mouseover');
	});
});

QUnit.test('apply to video only', function (assert) {
	var container = document.createElement('div');
	document.body.appendChild(container);

	assert.throws(function () {
		window.seeThru.create(container);
	}, 'throws error when applied to div element');
});


QUnit.test('apply only once', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function () {
		assert.throws(function () {
			window.seeThru.create('#test-video');
		}, 'throws error when applied twice on video element');
		done();
	});
});

QUnit.skip('renders video', function (assert) {
	var done = assert.async();
	window.seeThru.create('#test-video').ready(function (instance, video, canvas) {
		setTimeout(function () {
			var data = canvas.getContext('2d').getImageData(200, 200, 100, 100).data;
			assert.ok(Math.max.apply(Math, data) > 1);
			done();
		}, 100);
	});
});

QUnit.test('async callback', function (assert) {
	var done = assert.async();
	var firstCheck = 12;
	window.seeThru.create('#test-video').ready(function (instance) {
		var secondCheck = 44;
		assert.equal(firstCheck, 24);
		instance.revert();
		window.seeThru.create('#test-video').ready(function (instance) {
			var thirdCheck = 99;
			assert.equal(secondCheck, 88);
			instance.ready(function () {
				assert.equal(thirdCheck, 33);
				done();
			});
			thirdCheck = 33;
		});
		secondCheck = 88;
	});
	firstCheck = 24;
});

QUnit.test('jQuery plugin', function (assert) {
	var done = assert.async();
	assert.ok('seeThru' in $.fn, 'plugin is attached');
	assert.ok(typeof $.fn.seeThru === 'function', 'seeThru is function');
	$('#test-video').seeThru({ namespace: 'plugin' }).seeThru('ready', function (instance, video, canvas) {
		assert.ok($(video).is('#test-video'));
		assert.ok($(canvas).is('.plugin-display'));
		done();
	});
});
