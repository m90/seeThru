QUnit.module('seeThru', {
	beforeEach: function(){
		document.body.innerHTML = `
			<video onended="this.play();" autoplay loop id="test-video">
				<source src="http://localhost:9876/base/media/kolor.mp4" type="video/mp4" />
			</video>
		`;
	},
	afterEach: function() {
		document.body.innerHTML = '';
	}
})

QUnit.test('default config', function(assert){

	var done = assert.async();
	seeThru.create('#test-video').ready(function(st){

		var $testvideo = $('#test-video');
		assert.ok(!$testvideo.is(':visible'), 'video is hidden');
		assert.ok($('.seeThru-display').length, 'display canvas is created');
		assert.ok($('.seeThru-display').is(':visible'), 'display canvas is shown');
		assert.ok(!$('.seeThru-buffer').is(':visible'), 'buffer canvas is hidden');
		assert.equal($testvideo.height(), $('.seeThru-display').height() * 2, 'height is correct');
		assert.equal($testvideo.width(), $('.seeThru-display').width(), 'width is correct');

		st.revert();

		assert.ok($testvideo.is(':visible'), 'video is shown');
		assert.equal($('.seeThru-buffer').length, 0, 'buffer canvas is deleted');
		assert.equal($('.seeThru-display').length, 0, 'display canvas is deleted');
		done();

	});

});


QUnit.test('event routing', function(assert){

	var done = assert.async();
	seeThru.create('#test-video', {start : 'clicktoplay'}).ready(function(){
		var $testvideo = $('#test-video');
		$testvideo.on('playing', function(){
			$testvideo.off('playing');
			assert.ok(true, 'click event routed video starts playing');
			done();
		});
		$('.seeThru-display').click();
	});

});

QUnit.test('external JS calls', function(assert){
	var done = assert.async();
	seeThru.create('#test-video', {start : 'external'}).ready(function(){
		var $testvideo = $('#test-video');
		$testvideo.on('playing', function(){
			$testvideo.off('playing');
			assert.ok(true, 'video starts playing');
			done();
		});

		$testvideo.hover(function(){
			this.play();
		});

		assert.ok($('.seeThru-display').is(':visible'), 'still frame shown');

		$testvideo.trigger('mouseover');
	});
});

QUnit.test('apply to video only', function(assert){
	var $div = $('<div>').appendTo(document.body);

	assert.throws(function(){
		seeThru.create($div[0]);
	}, 'throws error when applied to div element');
});


QUnit.test('apply only once', function(assert){
	var done = assert.async();
	seeThru.create('#test-video').ready(function() {
		assert.throws(function(){
			seeThru.create('#test-video');
		}, 'throws error when applied twice on video element');
		done();
	});
});

QUnit.test('hasData', function(assert){
	var done = assert.async();
	seeThru.create('#test-video').ready(function(){
		var data = $('.seeThru-display')[0].getContext('2d').getImageData(200, 200, 100, 100).data;
		assert.ok(data.length);
		done();
	});
});


QUnit.test('jQuery plugin', function(assert){
	assert.ok('seeThru' in $.fn, 'plugin is attached');
	assert.ok(typeof $.fn.seeThru === 'function', 'seeThru is function');
});
