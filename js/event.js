/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function EventListener () {
	var self = this;

	this.__listeners = {};

	Object.defineProperty(this, 'fnWrapper', {
		value: function (info) {
			this.__afterwards = [];

			this.info = info;
			this.defaultPrevented = false;
		}
	});

	this.fnWrapper.prototype.__run = function () {
		this.info.fn(this);

		return this;
	};

	this.fnWrapper.prototype.stopPropagation = function () {};

	this.fnWrapper.prototype.preventDefault = function () {
		this.defaultPrevented = true;
	};

	this.fnWrapper.prototype.unbind = function () {
		Utilities.setImmediateTimeout(function (event, self) {
			event.removeCustomEventListener(self.type, self.info.fn);
		}, [self, this]);
	};

	this.fnWrapper.prototype.afterwards = function (fn) {
		this.__afterwards.push(fn.bind(null, this));
	};
}

EventListener.eventInfo = {
	pageX: 0,
	pageY: 0
};

EventListener.onMouseMove = function (event) {
	EventListener.eventInfo.pageX = event.pageX;
	EventListener.eventInfo.pageY = event.pageY;
};

EventListener.onClick = function (event) {
	EventListener.eventInfo.target = event.target;
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
		name: name,
		once: once,
		fn: fn,
		shouldBeDelayed: shouldBeDelayed
	});

	if (listeners.triggerSubsequentListeners)
		this.trigger(name, null, true);

	return this;
};

EventListener.prototype.addMissingCustomEventListener = function (name, fn, once, shouldBeDelayed) {
	var i;

	if (Array.isArray(name)) {
		for (i = 0; i < name.length; i++)
			this.addMissingCustomEventListener(name[i], fn, once, shouldBeDelayed);

		return this;
	}

	var listeners = this.listeners(name);

	for (i = 0; i < listeners.fns.length; i++)
		if (listeners.fns[i].fn === fn)
			return this;

	return this.addCustomEventListener.apply(this, arguments);
};

EventListener.prototype.removeCustomEventListener = function (name, fn) {
	var listeners = this.listeners(name);

	for (var i = listeners.fns.length; i--;)
		if (listeners.fns[i].fn === fn)
			listeners.fns._remove(i);

	return this;
};

EventListener.prototype.trigger = function (name, detail, triggerSubsequentListeners) {
	var info;

	var fnInstance = {},
		defaultPrevented = false,
		afterwards = [],
		fnInstances = [],
		listeners = this.listeners(name),
		listenerFns = listeners.fns._clone();

	listeners.triggerSubsequentListeners = !!triggerSubsequentListeners;

	for (var i = 0; i < listenerFns.length; i++) {
		info = listenerFns[i];

		if (info.shouldBeDelayed)
			Utilities.setImmediateTimeout(info.fn, [detail]);
		else {
			fnInstance = new this.fnWrapper(info);

			fnInstance.defaultPrevented = defaultPrevented;
			fnInstance.type = name;
			fnInstance.detail = detail;

			Object._extend(fnInstance, EventListener.eventInfo);

			try {
				defaultPrevented = fnInstance.__run().defaultPrevented || defaultPrevented;
			} catch (e) {
				defaultPrevented = false;

				LogError('Error occurred in event: ' + info.fn, e);
			}

			afterwards = afterwards.concat(fnInstance.__afterwards);

			fnInstances.push(fnInstance);
		}

		if (info.once)
			listeners.fns._remove(listeners.fns.indexOf(info));
	}

	for (i = 0; i < fnInstances.length; i++)
		fnInstances[i].defaultPrevented = defaultPrevented;

	for (i = 0; i < afterwards.length; i++)
		afterwards[i]();

	fnInstances = undefined;

	return defaultPrevented;
};

if (window.document) {
	document.addEventListener('mousemove', EventListener.onMouseMove, true);
	document.addEventListener('click', EventListener.onClick, true);
}
