/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

function MagicBinder (element, selector) {
	this.__localBind = {};

	this.event = new EventListener;

	this.element = $(element);
	this.selector = selector;

	this.init();
}

MagicBinder.prototype.init = function () {
	var self = this;

	for (var eventType in this.elementEvents) {
		this.__localBind[eventType] = (function (eventFn) {
			return function (event) {
				eventFn.call(this, self, event);
			};
		})(this.elementEvents[eventType]);

		this.element.on(eventType, this.selector ? this.selector : this.__localBind[eventType], this.selector ? this.__localBind[eventType] : undefined);
	}
};

MagicBinder.prototype.unbind = function () {
	if (this.__localBind) {
		for (var eventType in this.__localBind)
			this.element.off(eventType, this.selector ? this.selector : this.__localBind[eventType], this.selector ? this.__localBind[eventType] : undefined);

		setTimeout(function (self) {
			self.element = self.selector = self.event = self.__localBind = undefined;
		}, 100, this);
	}
};
