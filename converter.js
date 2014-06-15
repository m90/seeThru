#!/usr/bin/env node

var FFmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var argv = require('yargs')
	.alias('i', 'in')
	.alias('o', 'out')
	.usage('Usage: $0 --in [originalfile] --out [convertedfile]')
	.demand(['in','out'])
	.argv;

var src = argv.in;

var data = new FFmpeg({ source: src }).ffprobe(function(err, metadata){

	var
	fileExt = src.split('.')[src.split('.').length - 1]
	, fileFormats = metadata.format.format_name.split(',')
	, intermediateFormat = fileFormats.indexOf(fileExt) > -1 ? fileExt : fileFormats[0];

	var alpha = new FFmpeg({ source: src });

	alpha.addOption(
		'-vf'
		, '[in] format=rgba,\
		split [T1], fifo, lutrgb=r=maxval:g=maxval:b=maxval,\
		[T2] overlay [out];\
		[T1] fifo, lutrgb=r=minval:g=minval:b=minval [T2]'
	).withVideoCodec(metadata.streams[0].codec_name);

	alpha.on('error', function(err){
		console.log('An error occurred generating the alpha channel: ' + err.message);
	}).on('end', function(){

		var rgb = new FFmpeg({ source: src });

		rgb.addOption(
			'-vf'
			, '[in] scale=iw:ih,\
			pad=iw:2*ih [top];\
			movie=seethru-tmp-alpha.mov,\
			scale=iw:ih [bottom];\
			[top][bottom] overlay=0:h [out]'
		).withVideoCodec(metadata.streams[0].codec_name);

		if (metadata.streams.length > 1){
			rgb.withAudioCodec(metadata.streams[1].codec_name);
		}

		rgb.on('end', function(){
			fs.unlink('seethru-tmp-alpha.' + intermediateFormat, function(){
				console.log('Processing ' + src + ' finished!');
			});
		}).on('error', function(err){
			console.log('An error occurred combining the video sources: ' + err.message);
		}).saveToFile(argv.out);

	}).saveToFile('seethru-tmp-alpha.' + intermediateFormat);

});