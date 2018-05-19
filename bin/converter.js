#!/bin/sh
/* eslint-disable semi */
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/* eslint-disable no-console */

var FFmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var argv = require('yargs')
	.option('in', {
		alias: 'i',
		describe: 'The file to convert'
	})
	.option('out', {
		alias: 'o',
		describe: 'Where to write the conversion result'
	})
	.option('ffmpeg-path', {
		describe: 'Location ffmpeg executable to use'
	})
	.option('ffprobe-path', {
		describe: 'Location ffprobe executable to use'
	})
	.usage('Usage: $0 --in [originalfile] --out [convertedfile]')
	.demandOption(['in', 'out'])
	.argv;

var src = argv.in;

if (argv.ffmpegPath) {
	FFmpeg.setFfmpegPath(argv.ffmpegPath);
}

if (argv.ffprobePath) {
	FFmpeg.setFfprobePath(argv.ffprobePath);
}

new FFmpeg({ source: src }).ffprobe(function (err, metadata) {

	if (err) {
		throw err;
	} else if (!metadata) {
		console.error('Failed reading metadata from video');
		process.exit(1);
	}

	var fileExt = src.split('.')[src.split('.').length - 1];
	var fileFormats = metadata.format.format_name.split(',');
	var intermediateFormat = fileFormats.indexOf(fileExt) > -1 ? fileExt : fileFormats[0];
	var alpha = new FFmpeg({ source: src });

	/* jshint multistr: true */
	alpha.addOption(
		'-vf',
		'[in] format=rgba,\
		split [T1], fifo, lutrgb=r=maxval:g=maxval:b=maxval,\
		[T2] overlay [out];\
		[T1] fifo, lutrgb=r=minval:g=minval:b=minval [T2]'
	).withNoAudio().withVideoCodec(metadata.streams[0].codec_name);

	alpha.on('error', function (err) {
		console.error('An error occurred generating the alpha channel: ' + err.message);
		process.exit(1);
	}).on('end', function () {

		var rgb = new FFmpeg({ source: src });

		rgb.addOption(
			'-vf',
			'[in] scale=iw:ih,\
			pad=iw:2*ih [top];\
			movie=seethru-tmp-alpha.mov,\
			scale=iw:ih [bottom];\
			[top][bottom] overlay=0:h [out]'
		).withVideoCodec(metadata.streams[0].codec_name);

		if (metadata.streams.length > 1) {
			rgb.withAudioCodec(metadata.streams[1].codec_name);
		}

		rgb.on('end', function () {
			fs.unlink('seethru-tmp-alpha.' + intermediateFormat, function () {
				console.log('Processing ' + src + ' finished!');
			});
		}).on('error', function (err) {
			console.error('An error occurred combining the video sources: ' + err.message);
			process.exit(1);
		}).saveToFile(argv.out);

	}).saveToFile('seethru-tmp-alpha.' + intermediateFormat);

});
