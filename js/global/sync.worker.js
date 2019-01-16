/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

/* eslint-disable */
var window = self;
/* eslint-enable */

importScripts('../utilities.js', 'crypto-js.min.js');

self.addEventListener('message', function (message) {
	var id = message.data.id;

	message = message.data.message;

	switch (message.command) {
		case 'importScript':
			importScripts(message.url);

			self.postMessage({
				id: id,
				result: true
			});
			break;
			
		case 'generateHash':
			try {
				self.postMessage({
					id: id,
					result: CryptoJS.PBKDF2(message.password, message.salt, {
						keySize: 256 / 32,
						iterations: 10000
					}).toString()
				});
			} catch (err) {
				self.postMessage({
					id: id,
					error: err.message
				});
			}
			
			break;

		case 'encrypt':
			try {
				var encrypted = CryptoJS.AES.encrypt(message.string, message.hash, {
					mode: CryptoJS.mode.CBC
				}).toString();

				// console.log('Encrypt worker:', message.string.substr(0, 100), encrypted);

				self.postMessage({
					id: id,
					result: encrypted
				});
			} catch (err) {
				console.error('Encrypt worker:', message.string, message.hash);

				self.postMessage({
					id: id,
					error: err.message
				});
			}
			break;

		case 'decrypt':
			try {
				var decrypted = CryptoJS.AES.decrypt(message.string, message.hash).toString(CryptoJS.enc.Utf8);

				// console.log('Decrypt worker:', message.string, decrypted.substr(0, 100));

				self.postMessage({
					id: id,
					result: decrypted
				});
			} catch (err) {
				console.error('Decrypt worker:', decrypted);

				self.postMessage({
					id: id,
					error: err.message
				});
			}

			break;

		default:
			self.postMessage({
				id: id,
				result: null
			});
	}
});
