/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

function PressAndHoldElement (magic, element, selector, holdTime) {
	this.__successPreventsClick = false;

	this.elementEvents = PressAndHoldElement.elementEvents;

	this.holdTime = holdTime || 350;

	this.__cancelClick = PressAndHoldElement.__cancelClick.bind(this, this);

	var self = this;

	$(window)
		.on('mousemove mouseup click dblclick', Utilities.throttle(function (event) {
			if (Utilities.Timer.exist('timeout', self))
				self.cancel(event);
		}, 0, true));

	magic();
}

PressAndHoldElement = PressAndHoldElement._extends(MagicBinder);

PressAndHoldElement.elementEvents = {
	mousedown: function (self, event) {
		self.startTimer(event);
	},

	mouseout: function (self, event) {
		if (self.__successPreventsClick && self.__hasClickEvent)
			self.__cancelClick(event);
	},

	webkitmouseforcewillbegin: function (self, event) {
		event.preventDefault();
	},

	webkitmouseforcedown: function (self, event) {
		Utilities.Timer.timeoutNow(self);
	},
	webkitmouseforceup: function (self, event) {
		Utilities.Timer.timeoutNow(self);
	}
};

PressAndHoldElement.__cancelClick = function (self, event) {
	if (!self.__hasClickEvent)
		return;

	self.__hasClickEvent = false;

	event.preventDefault();
	event.stopImmediatePropagation();

	$(event.target).unbind('click', this.__cancelClick);
};

PressAndHoldElement.prototype.successPreventsClick = function () {
	this.__successPreventsClick = true;

	return this;
};

PressAndHoldElement.prototype.startTimer = function (event) {
	this.data = undefined;

	Utilities.Timer.timeout(this, function (self, event) {
		if (self.__successPreventsClick) {
			self.__hasClickEvent = true;

			$(event.target).bind('click', self.__cancelClick);
		}

		self.event.trigger('resolve', {
			event: event,
			data: self.data
		});
	}, this.holdTime, [this, event]);
};

PressAndHoldElement.prototype.now = function (data) {
	this.data = data;

	Utilities.Timer.timeoutNow(this);
};

PressAndHoldElement.prototype.cancel = function (event) {
	var hadTimer = Utilities.Timer.remove('timeout', this);

	if (hadTimer) {
		this.__cancelClick(event);

		this.event.trigger('reject', event);
	}
};

