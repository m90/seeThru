define('jquery', [], function(){
	return window.jQuery;
});

require(['jquery', 'lib/seeThru.min'], function($, seeThru){

	seeThru.attach($);

	test('properly attached', 4, function(){
		ok('seeThru' in $.fn, 'plugin is attached');
		ok(typeof $.fn.seeThru === 'function', 'seeThru is function');
		ok('create' in seeThru, 'seeThru exposes create');
		ok('attach' in seeThru, 'seeThru exposes attach');
	});

});