/*
* @Last modified in Sublime on Feb 26, 2017 11:28:59 PM
*/

'use strict';

Utilities.promiseWorker = new PromiseWorker('../js/global/utilities.worker.js');

Utilities.compress = function (string) {
	return new Promise(function (resolve, reject) {
		if (string.length < 1000000)
			return resolve(string);

		Utilities.promiseWorker.postMessage({
			command: 'compress',
			string: string
		}).then(resolve, reject);
	});
};

Utilities.decompress = function (string) {
	return Utilities.promiseWorker.postMessage({
		command: 'decompress',
		string: string
	});
};
