/*
* @Last modified in Sublime on Mar 08, 2017 03:59:22 PM
*/

'use strict';

Utilities.promiseWorker = new PromiseWorker('../js/global/utilities.worker.js');

Utilities.compress = function (string) {
	return CustomPromise(function (resolve, reject) {
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
