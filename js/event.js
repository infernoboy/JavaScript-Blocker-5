"use strict";

var EventListener = function () {
	this.__listeners = {};
};

EventListener.prototype.listeners = function (name) {
	if (!this.__listeners.hasOwnProperty(name))
		this.__listeners[name] = {
			triggered: false,
			fns: []
		};

	return this.__listeners[name];
};

EventListener.prototype.addEventListener = function (name, fn, once) {
	if (typeof name !== 'string' || !name.length)
		throw new TypeError(name + ' is not a valid string.');

	if (typeof fn !== 'function')
		throw new TypeError(fn + ' is not a function.');

	var listeners = this.listeners(name);

	listeners.fns.push({
		once: once,
		fn: fn
	});

	if (listeners.triggered)
		this.trigger(name);
};

EventListener.prototype.removeEventListener = function (name, fn) {
	this.__listeners[name] = this.listeners(name).filter(function (testFn) {
		return testFn !== fn;
	});
};

EventListener.prototype.trigger = function (name, data) {
	var newListeners = [],
			listeners = this.listeners(name);

	listeners.triggered = true;

	for (var i = 0; i < listeners.fns.length; i++) {
		Utilities.setImmediateTimeout(listeners.fns[i].fn, [data]);

		if (!listeners.fns[i].once)
			newListeners.push(listeners.fns[i]);
	}

	this.__listeners[name].fns = newListeners;
};
