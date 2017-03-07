/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function PageNotification (detail) {
	PageNotification.createContainer();

	if (typeof detail.title !== 'string')
		detail.title = detail.title && detail.title.toString ? detail.title.toString() : '';

	if (typeof detail.subTitle !== 'string')
		detail.subTitle = detail.subTitle && detail.subTitle.toString ? detail.subTitle.toString() : '';

	if (typeof detail.body !== 'string')
		detail.body = detail.body && detail.body.toString ? detail.body.toString() : '';
	
	detail.title = detail.title._escapeHTML();
	detail.subTitle = detail.subTitle._escapeHTML();

	if (detail.disallowHTML)
		detail.body = detail.body._escapeHTML();

	detail.body = detail.body.replace(/\n/g, '<br />');

	this.closeAllID = detail.closeAllID || true;
	this.highPriority = !!detail.highPriority;
	this.id = Utilities.Token.generate();

	var notificationTemplate = GlobalCommand('template.create', {
		template: 'injected',
		section: 'notification',
		data: detail
	});

	this.element = Utilities.Element.createFromHTML(notificationTemplate)[0];

	this.removeNotificationsWithElementID();

	PageNotification.addPending(this);

	this.bindEvents();

	this.element.style.setProperty('z-index', PageNotification.__baseZIndex - PageNotification.notificationIDs.length, 'important');

	this.element.setAttribute('data-originalZIndex', this.element.style.zIndex);

	this.isEntering = true;

	this.closeContainer = this.element.querySelector('.' + PageNotification.__closeButtonsContainerClass);

	this.addCloseButton(_('Close'), null, true);

	if (document.hidden)
		Handler.event.addCustomEventListener('documentBecameVisible', this.show.bind(this), true);
	else
		this.show();
}

/* eslint-disable */
PageNotification = PageNotification._extendClass(EventListener);
/* eslint-enable */

PageNotification.__containerID = 'jsb-notification-container';
PageNotification.__closeButtonsContainerClass = 'jsb-notification-close-container';
PageNotification.__offset = -14;
PageNotification.__stackOffset = 24;
PageNotification.__baseZIndex = 2147483047;
PageNotification.__forwardedZIndex = 2147483247;
PageNotification.__allowStacking = true;

PageNotification.notificationIDs = [];
PageNotification.notifications = {};
PageNotification.pendingNotificationIDs = [];
PageNotification.pendingNotifications = {};

PageNotification.createContainer = function () {
	PageNotification.__container = document.getElementById(PageNotification.__containerID);

	if (!PageNotification.__container) {
		PageNotification.__container = Utilities.Element.createFromHTML('<div id="' + PageNotification.__containerID + '" class="jsb-injected-element ' + (globalSetting.largeFont ? 'jsb-large-font' : '') + '" />')[0];

		Element.inject(PageNotification.__container, true);
	}
};

PageNotification.keyStateChanged = function (event) {
	PageNotification.setWillCloseAll(event.altKey);

	for (var notificationID in PageNotification.notifications)
		PageNotification.notifications[notificationID].trigger('optionKeyStateChange', event.altKey);
};

PageNotification.orderByPriority = function () {	
	var notification;

	var notificationIDs = Utilities.makeArray(PageNotification.notificationIDs);

	for (var i = 0; i < notificationIDs.length; i++) {
		notification = PageNotification.notifications[notificationIDs[i]];

		if (notification.highPriority)
			notification.move(true, true);
	}

	PageNotification.relayer();

	PageNotification.shift();
};

PageNotification.displaySomeOverflowed = function () {
	var notification;

	var counter = 0;

	for (var i = PageNotification.notificationIDs.length - 1; i >= 0; i--) {
		notification = PageNotification.notifications[PageNotification.notificationIDs[i]];

		if (notification.removed || notification.displayed)
			continue;

		if (counter >= 20)
			break;

		counter++;

		notification.displayed = true;

		notification.element.classList.remove('jsb-hidden');
	}
};

PageNotification.shift = function () {
	var notification,
		previousNotification;

	var fullOffset = 0,
		stackOffset = 0,
		notificationCount = PageNotification.notificationIDs.length - 1;

	for (var i = notificationCount; i >= 0; i--) {
		notification = PageNotification.notifications[PageNotification.notificationIDs[i]];

		if (notification.removed || !notification.displayed)
			continue;

		notification.fullyAlignedTop = fullOffset;

		notification.stacked = i < notificationCount - 1 && notification.shouldStack();

		notification.element.classList.toggle('jsb-notification-stacked', notification.stacked);

		if (notification.stacked) {
			if (notification.isEntering) {
				notification.restoreLayering();

				if (previousNotification)
					previousNotification.restoreLayering();
			}

			notification.top = stackOffset;

			stackOffset += PageNotification.__stackOffset;
		} else {
			stackOffset = fullOffset + PageNotification.__stackOffset;

			notification.top = notification.fullyAlignedTop;
		}

		notification.displayed = notification.shouldDisplay();

		if (notification.displayed)
			notification.element.classList.remove('jsb-hidden');

		fullOffset += notification.height + PageNotification.__offset;

		previousNotification = notification;
	}
};

PageNotification.totalShift = function () {
	var notification;

	PageNotification.displaySomeOverflowed();

	PageNotification.shift();

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		if (notification.forward)
			notification.bringForward(notification.restoreLayering());
	}
};

PageNotification.setWillCloseAll = function (should) {
	var notification;

	PageNotification.willCloseAll = should;

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		if (notification.highPriority)
			continue;

		notification.primaryCloseButtonText(should ? 'Close All' : notification.element.getAttribute('data-primaryCloseButtonText'), should);
	}
};

PageNotification.relayer = function () {
	var notification,
		wasForwarded;

	var notificationIDs = Utilities.makeArray(PageNotification.notificationIDs);

	for (var i = 0; i < notificationIDs.length; i++) {
		notification = PageNotification.notifications[notificationIDs[i]];

		wasForwarded = notification.forward;

		notification.restoreLayering();

		notification.element.setAttribute('data-originalZIndex', PageNotification.__baseZIndex - i);

		notification.element.style.setProperty('z-index', PageNotification.__baseZIndex - i, 'important');

		if (wasForwarded)
			notification.bringForward();
	}
};

PageNotification.add = function (notification) {
	PageNotification.notifications[notification.id] = notification;

	PageNotification.notificationIDs.push(notification.id);
};

PageNotification.remove = function (notification) {
	PageNotification.notificationIDs._remove(notification.index());

	delete PageNotification.notifications[notification.id];
};

PageNotification.addPending = function (notification) {
	PageNotification.pendingNotifications[notification.id] = notification;

	PageNotification.pendingNotificationIDs.push(notification.id);
};

PageNotification.removePending = function (notification) {
	PageNotification.pendingNotificationIDs._remove(notification.pendingIndex());

	delete PageNotification.pendingNotifications[notification.id];
};

Object.defineProperties(PageNotification.prototype, {
	top: {
		get: function () {
			var top = parseInt(this.element.getAttribute('data-top'), 10) || 0;

			return top < 0 ? 0 : top;
		},
		set: function (value) {
			this.element.setAttribute('data-top', value);

			if (!this.forward || this.isEntering)
				this.element.style.top = value + 'px';
		}
	},

	forwardedTop: {
		get: function () {
			return parseInt(this.element.style.top);
		},
		set: function (value) {
			this.element.style.top = value + 'px';
		}
	},

	height: {
		get: function () {
			return this.element.offsetHeight;
		}
	},

	primaryCloseButton: {
		get: function () {
			return this.element.querySelector('.jsb-notification-primary-close-button');
		}
	}
});

PageNotification.prototype.__remove = function () {
	if (!PageNotification.notifications[this.id])
		return;

	this.element.parentNode.removeChild(this.element);

	PageNotification.remove(this);
	PageNotification.removePending(this);
};

PageNotification.prototype.show = function () {
	if (this.removed)
		return;

	this.top = this.getTop();

	this.element.style.setProperty('top', this.top);

	Element.prependTo(PageNotification.__container, this.element);

	PageNotification.removePending(this);
	PageNotification.add(this);

	this.bringForward();

	this.fullyAlignedTop = 0;
	this.displayed = true;	

	this.element.classList.toggle('jsb-notification-high-priority', this.highPriority);
	this.element.classList.add('jsb-notification-entering');

	this.element.style.setProperty('right', '0px');

	PageNotification.orderByPriority();
};

PageNotification.prototype.getTop = function () {
	if (this.highPriority)
		return 0;

	var notification;

	var top = 0;

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		if (notification.highPriority)
			top += notification.fullyAlignedTop + notification.height + PageNotification.__offset;
	}

	return top;
};

PageNotification.prototype.removeNotificationsWithElementID = function () {
	var notification;

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		if (notification.element.id === this.element.id)
			notification.hide();
	}

	for (notificationID in PageNotification.pendingNotifications) {
		notification = PageNotification.pendingNotifications[notificationID];

		if (notification.element.id === this.element.id)
			notification.hide();
	}
};

PageNotification.prototype.index = function () {
	return PageNotification.notificationIDs.indexOf(this.id);
};

PageNotification.prototype.pendingIndex = function () {
	return PageNotification.pendingNotificationIDs.indexOf(this.id);
};

PageNotification.prototype.events = {
	'*': {
		webkitTransitionEnd: function (notification, event) {
			if (event.propertyName === 'opacity' && this.style.opacity === '0')
				notification.__remove();
			else if (notification.isEntering && event.propertyName === 'right') {
				notification.isEntering = false;

				notification.element.classList.remove('jsb-notification-entering');

				notification.restoreLayering();
			} else if (event.propertyName === 'top')
				if (!notification.displayed)
					notification.element.classList.add('jsb-hidden');
		}
	},

	'.jsb-notification-toggle-layering': {
		click: function (notification) {
			if (notification.forward)
				notification.restoreLayering();
			else
				notification.bringForward();
		},

		mousewheel: function (notification, event) {
			event.preventDefault();
			
			if (event.wheelDeltaY > 150) {
				PageNotification.__allowStacking = false;

				PageNotification.shift();
			} else if (event.wheelDeltaY < -150) {
				PageNotification.__allowStacking = true;

				PageNotification.displaySomeOverflowed();

				PageNotification.shift();
			}
		}
	},

	'.jsb-notification-close': {
		click: function (notification) {
			var otherNotification;

			if (PageNotification.willCloseAll) {
				PageNotification.closeAllTriggerID = notification.closeAllID;

				for (var notificationID in PageNotification.notifications) {
					otherNotification = PageNotification.notifications[notificationID];

					if (!otherNotification.shouldObeyCloseAll())
						continue;

					if (!otherNotification.highPriority || otherNotification === notification)
						otherNotification.disableCloseButtons().hide();
				}
			} else
				notification.disableCloseButtons().hide();
		}
	}
};

PageNotification.prototype.shouldObeyCloseAll = function () {
	return PageNotification.willCloseAll && !this.highPriority && PageNotification.closeAllTriggerID === this.closeAllID;
};

PageNotification.prototype.bindEvents = function () {
	var eventType;

	for (var selector in this.events)
		for (eventType in this.events[selector])
			this.addEventListener(eventType, selector, this.events[selector][eventType]);
};

PageNotification.prototype.addEventListener = function (eventType, selector, fn) {
	var elements;

	if (Array.isArray(selector))
		elements = selector;
	else
		elements = selector === '*' ? [this.element] : this.element.querySelectorAll(selector);

	for (var i = 0; i < elements.length; i++)
		elements[i].addEventListener(eventType, fn.bind(elements[i], this), true);

	return this;
};

PageNotification.prototype.onPrimaryClose = function (fn) {
	this.addEventListener('click', [this.primaryCloseButton], fn);
};

PageNotification.prototype.primaryCloseButtonText = function (text, ignoreAttribute) {
	if (!ignoreAttribute)
		this.element.setAttribute('data-primaryCloseButtonText', text);

	this.primaryCloseButton.value = text;

	return this;
};

PageNotification.prototype.addCloseButton = function (text, onClick, primary) {
	var closeButtonWrapperTemplate = GlobalCommand('template.create', {
		template: 'injected',
		section: 'notification-close-wrapper',
		data: {
			primary: primary,
			value: text
		}
	});

	var closeButtonWrapper = Utilities.Element.createFromHTML(closeButtonWrapperTemplate)[0],
		input = closeButtonWrapper.querySelector('input');

	this.closeContainer.appendChild(closeButtonWrapper);

	if (primary)
		this.primaryCloseButtonText(text);

	var closeButtonEvents = this.events['.jsb-notification-close'];

	for (var eventType in closeButtonEvents)
		this.addEventListener(eventType, [input], closeButtonEvents[eventType]);

	if (typeof onClick === 'function')
		this.addEventListener('click', [input], onClick);

	return input;
};

PageNotification.prototype.disableCloseButtons = function () {
	var closeButtons = this.element.querySelectorAll('.jsb-notification-close');

	for (var i = 0; i < closeButtons.length; i++)
		closeButtons[i].disabled = true;

	return this;
};

PageNotification.prototype.shouldStack = function () {
	return PageNotification.__allowStacking && this.fullyAlignedTop + this.height + (PageNotification.__offset / 2) > window.innerHeight;
};

PageNotification.prototype.shouldDisplay = function () {
	return this.top < window.innerHeight;
};

PageNotification.prototype.move = function (toTop, orderOnly) {
	var notificationID = PageNotification.notificationIDs._remove(this.index());

	if (toTop)
		PageNotification.notificationIDs.push(notificationID);
	else
		PageNotification.notificationIDs.unshift(notificationID);

	if (!orderOnly) {
		PageNotification.relayer();

		PageNotification.shift();
	}
};

PageNotification.prototype.bringForward = function (zIndex) {
	this.forward = true;

	if (!zIndex)
		PageNotification.__forwardedZIndex++;

	this.element.classList.add('jsb-notification-forwarded');

	this.element.style.setProperty('z-index', zIndex || PageNotification.__forwardedZIndex++, 'important');

	if (this.top + this.height > window.innerHeight)
		this.forwardedTop = window.innerHeight - this.height;
};

PageNotification.prototype.restoreLayering = function () {
	if (!this.forward)
		return;

	var zIndex = this.element.style.zIndex;

	this.forward = false;

	this.element.classList.remove('jsb-notification-forwarded');

	this.element.style.setProperty('z-index', this.element.getAttribute('data-originalZIndex'), 'important');

	this.top = this.top;

	return zIndex;
};

PageNotification.prototype.hide = function (removeNow) {
	if (this.removed)
		return;

	this.removed = true;

	if (!this.shouldObeyCloseAll() && this.forward)
		this.restoreLayering();

	PageNotification.displaySomeOverflowed();

	PageNotification.shift();

	this.element.style.setProperty('opacity', '0');

	if (removeNow)
		this.__remove();
};

window.addEventListener('keydown', PageNotification.keyStateChanged, true);
window.addEventListener('keyup', PageNotification.keyStateChanged, true);
window.addEventListener('resize', Utilities.throttle(PageNotification.totalShift, 500), true);

Handler.event.addCustomEventListener('documentBecameVisible', function () {
	Handler.event.trigger('readyForPageNotifications', null, true);
}, true);
