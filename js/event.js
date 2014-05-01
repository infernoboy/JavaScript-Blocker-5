"use strict";

var EventListener = function () {
	this.__listeners = {};
};

EventListener.prototype.listeners = function (name) {
	if (!this.__listeners.hasOwnProperty(name))
		this.__listeners[name] = [];

	return this.__listeners[name];
};

EventListener.prototype.addEventListener = function (name, fn) {
	if (typeof name !== 'string' || !name.length)
		throw new TypeError(name + ' is not a valid string.');

	if (typeof fn !== 'function')
		throw new TypeError(fn + ' is not a function.');

	this.listeners(name).push(fn.bind(this));
};

EventListener.prototype.removeEventListener = function (name, fn) {
	this.__listeners[name] = this.listeners(name).filter(function (testFn) {
		return testFn !== fn;
	});
};

EventListener.prototype.trigger = function (name) {
	var listeners = this.listeners(name);

	for (var i = 0; i < listeners.length; i++)
		Utilities.setImmediateTimeout(listeners[i]);
};
