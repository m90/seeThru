define('jquery', [], function(){
	return window.jQuery;
});

require(['jquery', 'lib/jquery-seeThru.min'], function($){
	test('properly attached', 2, function(){
		ok('seeThru' in $.fn, 'plugin is attached');
		ok(typeof $.fn.seeThru === 'function', 'seeThru is function');
	});
});