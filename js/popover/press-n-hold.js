/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var PressAndHoldElement = function (element, selector, useDirectBind, holdTime) {
	this.__successPreventsClick = false;

	this.elementEvents = PressAndHoldElement.elementEvents;

	this.holdTime = holdTime || 350;

	var self = this;

	$(window)
		.on('mousemove mouseup click dblclick', Utilities.throttle(function (event) {
			if (Utilities.Timer.exist('timeout', self))
				self.cancel(event);
		}, 0, true));

	this.super();
}._extends(MagicBinder);

PressAndHoldElement.elementEvents = {
	mousedown: function (self, event) {
		self.startTimer(event);
	},

	click: function (self, event) {
		if (self.resolved && (self.__successPreventsClick || self.__clickEventPreventsDefault)) {
			self.resolved = false;

			event.preventDefault();
			event.stopImmediatePropagation();
		}
	},

	webkitmouseforcewillbegin: function (self, event) {
		event.preventDefault();
	},

	webkitmouseforcedown: function (self) {
		Utilities.Timer.timeoutNow(self);
	},
	webkitmouseforceup: function (self) {
		Utilities.Timer.timeoutNow(self);
	}
};

PressAndHoldElement.prototype.successPreventsClick = function () {
	this.__successPreventsClick = true;

	return this;
};

PressAndHoldElement.prototype.startTimer = function (event) {
	this.__clickEventPreventsDefault = true;
	this.data = undefined;
	this.resolved = false;	

	Utilities.Timer.timeout(this, function (self, event) {
		self.resolved = true;

		Poppy.preventNextCloseAll();

		self.event.trigger('resolve', {
			event: event,
			data: self.data
		});
	}, this.holdTime, [this, event]);
};

PressAndHoldElement.prototype.now = function (data) {
	this.__clickEventPreventsDefault = false;
	this.data = data;

	Utilities.Timer.timeoutNow(this);
};

PressAndHoldElement.prototype.cancel = function (event) {
	var hadTimer = Utilities.Timer.remove('timeout', this);

	if (hadTimer) {
		$(event.currentTarget).trigger('mouseup');

		this.event.trigger('reject', event);
	}
};

