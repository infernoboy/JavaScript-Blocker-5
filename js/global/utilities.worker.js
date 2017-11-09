/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

/* eslint-disable */
var window = self;
/* eslint-enable */

importScripts('../utilities.js', '../global/lzstring.js');

self.addEventListener('message', function (message) {
	var id = message.data.id;

	message = message.data.message;

	switch (message.command) {
		case 'compress':
			try {
				var compressed = LZString.compressToUTF16(message.string);
				
				self.postMessage({
					id: id,
					result: (compressed.length > message.string.length) ? message.string : compressed
				});
			} catch (err) {
				self.postMessage({
					id: id,
					result: message.string
				});
			}
			break;

		case 'decompress':
			try {
				var decompressed = LZString.decompressFromUTF16(message.string);

				self.postMessage({
					id: id,
					result: (!decompressed.length || decompressed.charAt(0) === '@') ? message.string : decompressed
				});
			} catch (err) {
				self.postMessage({
					id: id,
					result: message.string
				});
			}
			break;

		default:
			self.postMessage({
				id: id,
				error: false
			});
	}
});
