#!/usr/bin/env node

var FFmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var argv = require('yargs')
	.alias('i', 'in')
	.alias('o', 'out')
	.usage('Usage: $0 --in [num] --out [num]')
    .demand(['in','out'])
    .argv;

var src = argv.in;
var format = src.split('.')[src.split('.').length - 1];

var alpha = new FFmpeg({ source: src })
	.addOption('-vf', '[in] format=rgba,\
		 split [T1], fifo, lutrgb=r=maxval:g=maxval:b=maxval,\
		 [T2] overlay [out];\
		 [T1] fifo, lutrgb=r=minval:g=minval:b=minval [T2]')
	.on('error', function(err) {
		console.log('An error occurred generating the alpha channel: ' + err.message);
	})
	.on('end', function() {
		var rgb = new FFmpeg({ source: src })
			.addOption('-vf'
				, '[in] scale=iw:ih,\
				pad=iw:2*ih [top];\
				movie=seethru-tmp-alpha.mov,\
				scale=iw:ih [bottom];\
				[top][bottom] overlay=0:h [out]')
			.on('end', function(){
				fs.unlink('tmp-alpha.mov', function(){
					console.log('Processing ' + argv.in + ' finished!');
				});
			})
			.on('error', function(err){
				console.log('An error occurred combining the video sources: ' + err.message);
			})
			.saveToFile(argv.out);
	})
	.saveToFile('seethru-tmp-alpha.mov');