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

EventListener.prototype.addCustomEventListener = function (name, fn, once, shouldBeDelayed) {
	if (Array.isArray(name)) {
		for (var i = 0; i < name.length; i++)
			this.addCustomEventListener(name[i], fn, once);

		return this;
	}

	if (typeof fn !== 'function')
		throw new TypeError(fn + ' is not a function.');

	var listeners = this.listeners(name);

	listeners.fns.push({
		once: once,
		fn: fn,
		shouldBeDelayed: shouldBeDelayed
	});

	if (listeners.triggerSubsequentListeners)
		this.trigger(name, null, true);

	return this;
};

EventListener.prototype.addMissingCustomEventListener = function (name, fn, once, shouldBeDelayed) {
	if (Array.isArray(name)) {
		for (var i = 0; i < name.length; i++)
			this.addMissingCustomEventListener(name[i], fn, once);

		return this;
	}

	var listeners = this.listeners(name);

	for (var i = 0; i < listeners.fns.length; i++)
		if (listeners.fns[i].fn === fn)
			return this;

	return this.addCustomEventListener(name, fn, once);
};

EventListener.prototype.removeCustomEventListener = function (name, fn) {
	var listeners = this.listeners(name);

	listeners.fns = listeners.fns.filter(function (testFn) {
		return testFn.fn !== fn;
	});
};

EventListener.prototype.trigger = function (name, data, triggerSubsequentListeners) {
	var newListeners = [],
			listeners = this.listeners(name);

	listeners.triggerSubsequentListeners = !!triggerSubsequentListeners;

	for (var i = 0; i < listeners.fns.length; i++) {
		if (listeners.fns[i].shouldBeDelayed)
			Utilities.setImmediateTimeout(listeners.fns[i].fn, [data]);
		else
			listeners.fns[i].fn(data);

		if (!listeners.fns[i].once)
			newListeners.push(listeners.fns[i]);
	}

	this.__listeners[name].fns = newListeners;
};
