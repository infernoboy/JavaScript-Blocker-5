/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var ForceClickElement = function () {
	this.elementEvents = ForceClickElement.elementEvents;

	this.originalForce = 0;
	this.normalizedForce = 0;
	this.additionalNormalizedForce = 0;
	this.minimumNormalizedForce = 0;
	this.maximumNormalizedForce = MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN;
	this.startThreshold = MouseEvent.WEBKIT_FORCE_AT_MOUSE_DOWN;
	this.endThreshold = MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN;

	this.super();

	this.unbind = function () {
		this.super(['currentTarget', 'target']);
	}._extends(this.unbind);
}._extends(MagicBinder);

ForceClickElement.isSupported = false;

ForceClickElement.events = {
	elementWasAdded: function (event) {
		if (!event.detail.querySelectorAll)
			return;

		var forceClickElements = event.detail.querySelectorAll('*[data-forceTriggersClick]:not(.force-click-ready)');

		for (var i = forceClickElements.length; i--;) {
			forceClickElements[i].classList.add('force-click-ready');

			(function (forceClickElement) {
				UI.onReady(function () {
					$(forceClickElement)
						.bind('click', function (event) {
							if (this.getAttribute('data-clickTriggeredByForce') && !event.isTrigger) {
								event.preventDefault();
								event.stopImmediatePropagation();
							}
						});

					var forceClick = new ForceClickElement(forceClickElement);

					forceClick
						.setThreshold(0.5, 0.05)
						.modifyNormalizedForce(0, 0.75);

					forceClick.event
						.addCustomEventListener('forceBegin', function (event) {
							event.detail.currentTarget.setAttribute('data-forceClickTarget', 1);

							event.detail.currentTarget.removeAttribute('data-clickTriggeredByForce');
						})

						.addCustomEventListener('firstForceChange', function (event) {
							if (!event.detail.currentTarget.getAttribute('data-forceClickTarget'))
								return;

							$(event.detail.currentTarget).trigger('click', [event, forceClick]);

							event.detail.currentTarget.setAttribute('data-clickTriggeredByForce', 1);
						})

						.addCustomEventListener(['forceDown', 'forceUp'], function (event) {
							if (!event.detail.currentTarget.getAttribute('data-forceClickTarget'))
								return;

							if (Poppy.poppyExist())
								Poppy.preventNextCloseAll();

							if (event.type === 'forceUp' && !event.detail.currentTarget.getAttribute('data-clickTriggeredByForce'))
								Utilities.setImmediateTimeout(function (event, forceClick) {
									$(event.detail.currentTarget).trigger('click', [event, forceClick]);
								}, [event, forceClick]);
						})

						.addCustomEventListener('forceClickCancelled', function (event) {
							setTimeout(function () {
								$('*[data-forceClickTarget]').removeAttr('data-forceClickTarget');

								event.detail.currentTarget.removeAttribute('data-clickTriggeredByForce');
							}, 100);
						});

					forceClickElement = undefined;
				});
			})(forceClickElements[i]);
		}
	}
};

ForceClickElement.elementEvents = {
	mouseout: function (forceClick, event) {
		if (!forceClick.currentTarget || !ForceClickElement.isSupported)
			return;

		if (forceClick.currentTarget === event.currentTarget && forceClick.originalForce > 0)
			forceClick.cancel(event);
	},

	mouseup: function (forceClick, event) {
		if (!forceClick.currentTarget || !ForceClickElement.isSupported)
			return;

		if (forceClick.currentTarget === event.currentTarget && forceClick.originalForce > 0)
			forceClick.cancel(event);
	},

	click: function (forceClick, event) {
		if (!forceClick.currentTarget || !ForceClickElement.isSupported)
			return;
		
		if (forceClick.currentTarget.getAttribute('data-forceClicked')) {
			event.stopImmediatePropagation();

			forceClick.currentTarget.removeAttribute('data-forceClicked');
		}

		if (!event.isTrigger)
			forceClick.event.trigger('click', {
				target: forceClick.target,
				currentTarget: forceClick.currentTarget,
				event: event,
				self: this
			});
	},

	webkitmouseforcewillbegin: function (forceClick, event) {
		ForceClickElement.isSupported = true;

		forceClick.__cancelled = false;
		forceClick.__didTriggerFirstForceChange = false;

		if (event.currentTarget.getAttribute('data-forceTriggersClick') || event.currentTarget.getAttribute('data-cancelForceBegin')) {
			event.preventDefault();

			forceClick.currentTarget = event.currentTarget;
			forceClick.target = event.target;

			forceClick.event.trigger('forceBegin', {
				target: forceClick.target,
				currentTarget: forceClick.currentTarget,
				event: event,
				self: this
			});
		}
	},

	webkitmouseforceup: function (forceClick, event) {
		if (!forceClick.currentTarget)
			return;

		if (forceClick.currentTarget === event.currentTarget)
			forceClick.event.trigger('forceUp', {
				target: forceClick.target,
				currentTarget: forceClick.currentTarget,
				event: event,
				self: this
			});

		forceClick.currentTarget.removeAttribute('data-forceClicked');

		forceClick.currentTarget = undefined;
		forceClick.target = undefined;
	},

	webkitmouseforcedown: function (forceClick, event) {
		if (!forceClick.currentTarget)
			return;

		if (forceClick.currentTarget === event.currentTarget) {
			forceClick.currentTarget.setAttribute('data-forceClicked', 1);

			forceClick.event.trigger('forceDown', {
				target: forceClick.target,
				currentTarget: forceClick.currentTarget,
				event: event,
				self: this
			});
		}
	},

	webkitmouseforcechanged: function (forceClick, event) {
		if (!forceClick.currentTarget)
			return;

		if (event.originalEvent.webkitForce === 0) {
			forceClick.cancel(event);

			return;
		}

		forceClick.originalForce = event.originalEvent.webkitForce > 0 ? event.originalEvent.webkitForce : forceClick.originalForce;

		if (forceClick.currentTarget === event.currentTarget && event.originalEvent.webkitForce >= forceClick.startThreshold && event.originalEvent.webkitForce < MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN) {
			var preNormalizedForce = (event.originalEvent.webkitForce - forceClick.startThreshold) / (forceClick.endThreshold - forceClick.startThreshold),
				normalizedForce = (event.originalEvent.webkitForce - forceClick.startThreshold) / (forceClick.endThreshold - forceClick.startThreshold - forceClick.additionalNormalizedForce);

			forceClick.normalizedForce = normalizedForce;

			var quadForce = Math._easeOutQuad(preNormalizedForce, 0, forceClick.maximumNormalizedForce + forceClick.additionalNormalizedForce, 1);

			if (quadForce > 0.987)
				quadForce = 1;

			if (forceClick.normalizedForce > forceClick.maximumNormalizedForce)
				forceClick.normalizedForce = forceClick.maximumNormalizedForce;
			else if (forceClick.normalizedForce < forceClick.minimumNormalizedForce)
				forceClick.normalizedForce = forceClick.minimumNormalizedForce;

			if (quadForce > forceClick.maximumNormalizedForce)
				quadForce = forceClick.maximumNormalizedForce;
			else if (quadForce < forceClick.minimumNormalizedForce)
				quadForce = forceClick.minimumNormalizedForce;

			var eventDetail = {
				target: forceClick.target,
				currentTarget: forceClick.currentTarget,
				originalForce: event.originalEvent.webkitForce,
				normalizedForce: forceClick.normalizedForce,
				quadForce: quadForce,
				event: event,
				self: this
			};

			if (!forceClick.__didTriggerFirstForceChange) {
				forceClick.__didTriggerFirstForceChange = true;

				forceClick.event.trigger('firstForceChange', eventDetail);
			}

			forceClick.event.trigger('forceChange', eventDetail);
		}
	}
};

ForceClickElement.prototype.cancel = function (event) {
	if (this.__cancelled || !this.__didTriggerFirstForceChange)
		return;

	this.__cancelled = true;

	this.event.trigger('forceClickCancelled', {
		cancelledBelowStartThreshold: this.originalForce < this.startThreshold,
		target: this.target,
		currentTarget: this.currentTarget,
		event: event
	});

	this.currentTarget.removeAttribute('data-forceClicked');

	setTimeout(function (forceClick) {
		forceClick.currentTarget = undefined;
		forceClick.target = undefined;
		forceClick.normalizedForce = 0;
	}, 0, this);
};

ForceClickElement.prototype.setThreshold = function (startThreshold, endThreshold) {
	if (!endThreshold)
		endThreshold = 0;

	if (typeof startThreshold !== 'number' || typeof endThreshold !== 'number')
		throw new TypeError('threshold is not a number.');

	this.endThreshold = MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN - endThreshold;
	this.startThreshold = MouseEvent.WEBKIT_FORCE_AT_MOUSE_DOWN + startThreshold;

	return this;
};

ForceClickElement.prototype.modifyNormalizedForce = function (additionalNormalizedForce, maximumNormalizedForce, minimumNormalizedForce) {
	this.additionalNormalizedForce = additionalNormalizedForce;
	this.maximumNormalizedForce = maximumNormalizedForce;
	this.minimumNormalizedForce = minimumNormalizedForce;

	return this;
};

UI.event.addCustomEventListener('elementWasAdded', ForceClickElement.events.elementWasAdded);
