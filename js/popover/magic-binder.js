/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function MagicBinder (element, selector, useDirectBind) {
	this.__localBind = {};

	this.event = new EventListener;

	this.id = Utilities.Token.generate();
	this.element = $(element);
	this.selector = selector;
	this.useDirectBind = useDirectBind;

	this.init();
}

MagicBinder.events = {
	elementWasAdded: function (event) {
		if (!event.detail.querySelectorAll)
			return;

		var elements = event.detail.querySelectorAll('*:not([data-magicBind-' + this.id + '])');

		for (var i = elements.length; i--;)
			if ($(elements[i]).is(this.element.selector + ' ' + this.selector))
				for (var eventType in this.__localBind)
					$(elements[i]).on(eventType, this.__localBind[eventType]).attr('data-magicBind-' + this.id, '1');
	}
};

MagicBinder.prototype.init = function () {
	var self = this;

	for (var eventType in this.elementEvents) {
		this.__localBind[eventType] = (function (eventFn) {
			return function (event) {
				eventFn.call(this, self, event);
			};
		})(this.elementEvents[eventType]);

		if (this.useDirectBind)
			$(this.selector, this.element).on(eventType, this.__localBind[eventType]).attr('data-magicBind-' + this.id, '1');
		else
			this.element.on(eventType, this.selector ? this.selector : this.__localBind[eventType], this.selector ? this.__localBind[eventType] : undefined);
	}

	if (this.useDirectBind)
		UI.event.addCustomEventListener('elementWasAdded', MagicBinder.events.elementWasAdded.bind(this));
};

MagicBinder.prototype.unbind = function (additionalUndefines) {
	if (this.__localBind) {
		for (var eventType in this.__localBind)
			if (this.useDirectBind && this.selector)
				$(this.selector, this.element).off(eventType, this.__localBind[eventType]);
			else
				this.element.off(eventType, this.selector ? this.selector : this.__localBind[eventType], this.selector ? this.__localBind[eventType] : undefined);

		setTimeout(function (self, additionalUndefines) {
			self.element = self.selector = self.event = self.__localBind = undefined;

			if (Array.isArray(additionalUndefines))
				for (var i = additionalUndefines.length; i--;)
					self[additionalUndefines[i]] = undefined;
		}, 100, this, additionalUndefines);
	}
};


