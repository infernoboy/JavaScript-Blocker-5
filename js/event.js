"use strict";

function EventListener () {
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
	if (typeof fn !== 'function')
		throw new TypeError(fn + ' is not a function.');

	var listeners = this.listeners(name);

	listeners.fns.push({
		once: once,
		fn: fn
	});

	if (listeners.triggerSubsequentAdditions)
		this.trigger(name);
};

EventListener.prototype.addMissingEventListener = function (name, fn, once) {
	var listeners = this.listeners(name);

	for (var i = 0; i < listeners.fns.length; i++)
		if (listeners.fns[i].fn === fn)
			return this;

	return this.addEventListener(name, fn, once);
};

EventListener.prototype.removeEventListener = function (name, fn) {
	var listeners = this.listeners(name);

	listeners.fns = listeners.fns.filter(function (testFn) {
		return testFn.fn !== fn;
	});
};

EventListener.prototype.trigger = function (name, data, triggerSubsequentAdditions) {
	var newListeners = [],
			listeners = this.listeners(name);

	listeners.triggerSubsequentAdditions = !!triggerSubsequentAdditions;

	for (var i = 0; i < listeners.fns.length; i++) {
		Utilities.setImmediateTimeout(listeners.fns[i].fn, [data]);

		if (!listeners.fns[i].once)
			newListeners.push(listeners.fns[i]);
	}

	this.__listeners[name].fns = newListeners;
};
