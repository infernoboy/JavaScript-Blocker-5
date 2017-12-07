/*
* @Last modified in Sublime on Nov 09, 2017 11:26:54 AM
*/

'use strict';

function PromiseWorker (worker) {
	this._timers = {};

	this.workerPath = worker;
	this.event = new EventListener;

	this.init();
}

PromiseWorker.prototype.init = function () {
	if (typeof window.importScripts === 'undefined') {
		this.worker = new Worker(this.workerPath);

		var self = this;

		this.worker.addEventListener('message', function (message) {
			self.event.trigger('workerMessage', message.data);
		});
	}
};

PromiseWorker.prototype.terminate = function () {
	if (this.worker)
		this.worker.terminate();
};

PromiseWorker.prototype.postMessage = function (message) {
	var self = this;

	return CustomPromise(function (resolve, reject) {
		if (self.worker) {
			var id = Utilities.Token.generate();

			self._timers[id] = setTimeout(function (id, self) {
				delete self._timers[id];
				
				LogError('Did not receive response from worker', id, self.workerPath, message);

				self.event.trigger('workerMessage', {
					id: id,
					error: Error('no response')
				});
			}, 45000, id, self);

			self.event.addCustomEventListener('workerMessage', function (event) {
				if (event.detail.id === id) {
					clearTimeout(self._timers[id]);

					delete self._timers[id];

					event.unbind();

					if (event.detail.result)
						resolve(event.detail.result);
					else
						reject(event.detail.error);
				}
			});

			self.worker.postMessage({
				id: id,
				message: message
			});
		} else
			reject();
	});
};
