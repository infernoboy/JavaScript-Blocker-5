/*
* @Last modified in Sublime on Dec 10, 2017 06:18:45 PM
*/

'use strict';

Utilities.promiseWorker = new PromiseWorker('../js/global/utilities.worker.js');

Utilities.compress = function (string) {
	return CustomPromise(function (resolve, reject) {
		return resolve(string);
		
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
