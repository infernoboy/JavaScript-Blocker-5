"use strict";

var EventListener = function () {
	this.listeners = {};
};

EventListener.prototype.__listener = function (name) {
	if (!this.listeners.hasOwnProperty(name))
		this.listeners[name] = [];

	return this.listeners[name];
};

EventListener.prototype.addEventListener = function (name, fn) {
	if (typeof name !== 'string' || !name.length)
		throw new TypeError(name + ' is not a valid string.');

	if (typeof fn !== 'function')
		throw new TypeError(fn + ' is not a function.');

	this.__listener(name).push(fn);
};

EventListener.prototype.removeEventListener = function (name, fn) {
	this.listeners[name] = this.__listener(name).filter(function (testFn) {
		return testFn !== fn;
	});
};

EventListener.prototype.trigger = function (name) {
	var listeners = this.__listener(name);

	for (var i = 0; i < listeners.length; i++)
		Utilities.setImmediateTimeout(listeners[i]);
};
