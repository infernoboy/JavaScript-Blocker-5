"use strict";

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

	var notificationTemplate = GlobalCommand('template.create', {
		template: 'injected',
		section: 'notification',
		data: detail
	});

	this.element = Element.createFromHTML(notificationTemplate)[0];

	if (this.element.id in PageNotification.notifications)
		PageNotification.notifications[this.element.id].hide(true);

	if (this.element.id in PageNotification.pendingNotifications)
		PageNotification.pendingNotifications[this.element.id].hide(true);

	PageNotification.pendingNotifications[this.element.id] = this;

	// Element.prependTo(document.documentElement, this.element);

	// if (['10.7', '10.8', '10.9']._contains(Utilities.OSXVersion())) {
	// 	this.element.classList.add('jsb-notification-warped');

	// 	this.top = -this.height - PageNotification.__offset + 24;
	// 	this.element.style.right = '0px';
	// }

	this.primaryCloseButtonText(_('Close'));

	this.bindEvents();

	this.element.style.setProperty('z-index', PageNotification.__baseZIndex - PageNotification.all().length, 'important');

	this.element.setAttribute('data-originalZIndex', this.element.style.zIndex);

	this.shouldRestoreLayering = true;

	this.event = new EventListener;

	this.closeContainer = this.element.querySelector('.' + PageNotification.__closeButtonsContainerClass);

	Handler.event.addEventListener('stylesheetLoaded', function () {
		Element.prependTo(PageNotification.__container, this.element);

		delete PageNotification.pendingNotifications[this.element.id];

		PageNotification.notifications[this.element.id] = this;

		this.bringForward();

		PageNotification.shift();

		// this.element.classList.remove('jsb-this-warped');

		this.element.classList.add('jsb-notification-entering');

		this.element.style.setProperty('right', '0px');

		this.fullyAlignedTop = 0;
		
		this.top = 0;
	}.bind(this), true);
};


PageNotification.__containerID = 'jsb-notification-container';
PageNotification.__closeButtonsContainerClass = 'jsb-notification-close-container';
PageNotification.__offset = -14;
PageNotification.__stackOffset = 24;
PageNotification.__baseZIndex = 999999909;
PageNotification.__forwardedZIndex = 999999959

PageNotification.notifications = {};
PageNotification.pendingNotifications = {};

PageNotification.createContainer = function () {
	PageNotification.__container = document.getElementById(PageNotification.__containerID);

	if (!PageNotification.__container) {
		PageNotification.__container = Element.createFromHTML('<div id="' + PageNotification.__containerID + '" />')[0];

		Element.inject(PageNotification.__container);
	}
};

PageNotification.keyStateChanged = function (event) {
	PageNotification.willCloseAll(event.altKey);

	for (var notificationID in PageNotification.notifications)
		PageNotification.notifications[notificationID].event.trigger('optionKeyStateChange', event.altKey);
};

PageNotification.shift = function (event) {
	var notification;

	var fullOffset = 0,
			stackOffset = 0,
			notificationIDs = PageNotification.all();

	for (var i = 0; i < notificationIDs.length; i++) {
		notification = PageNotification.notifications[notificationIDs[i]];

		if (notification.hidden)
			continue;

		notification.fullyAlignedTop = fullOffset;

		notification.stacked = notification.shouldStack();

		notification.element.classList.toggle('jsb-notification-stacked', notification.stacked);

		if (notification.stacked) {
			notification.top = stackOffset;

			stackOffset += PageNotification.__stackOffset;
		} else {
			stackOffset = fullOffset + PageNotification.__stackOffset;
			fullOffset += notification.height + PageNotification.__offset;

			notification.top = notification.fullyAlignedTop;
		}
	}
};

PageNotification.windowResized = function (event) {
	var notification;

	PageNotification.shift();

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		if (notification.forward) {
			notification.restoreLayering();
			notification.bringForward();
		}
	}
};

PageNotification.willCloseAll = function (should) {
	var notification;

	for (var notificationID in PageNotification.notifications) {
		notification = PageNotification.notifications[notificationID];

		notification.primaryCloseButtonText(should ? 'Close All' : notification.element.getAttribute('data-primaryCloseButtonText'), should);

		notification.willCloseAll = should;
	}
};

PageNotification.all = function () {
	var keys = Object.keys(PageNotification.notifications);

	keys.reverse();

	return keys;
};

PageNotification.relayer = function () {
	var notification;

	var notificationIDs = PageNotification.all();

	for (var i = 0; i < notificationIDs.length; i++) {
		notification = PageNotification.notifications[notificationIDs[i]];

		notification.restoreLayering();

		notification.element.setAttribute('data-originalZIndex', PageNotification.__baseZIndex + i);

		notification.element.style.setProperty('z-index', PageNotification.__baseZIndex + i, 'important');
	}
};

PageNotification.lastUnstackedNotification = function () {
	var notificationIDs = PageNotification.all();

	notificationIDs.reverse();

	for (var i = 0; i < notificationIDs.length; i++)
		if (!PageNotification.notifications[notificationIDs[i]].stacked && !PageNotification.notifications[notificationIDs[i]].hidden)
			return PageNotification.notifications[notificationIDs[i]];

	return null;
};

Object.defineProperties(PageNotification.prototype, {
	top: {
		get: function () {
			var top = parseInt(this.element.getAttribute('data-top'), 10) || 0;

			return top < 0 ? 0 : top;
		},
		set: function (value) {
			this.element.setAttribute('data-top', value);

			if (!this.forward)
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
			var height = this.element.getAttribute('data-originalHeight');

			if (height)
				return parseInt(height, 10);

			this.element.setAttribute('data-originalHeight', this.element.offsetHeight);

			return this.height;
		}
	}
});

PageNotification.prototype.__remove = function () {
	this.element.parentNode.removeChild(this.element);

	delete PageNotification.notifications[this.element.id];
};

PageNotification.prototype.events = {
	'*': {
		webkitTransitionEnd: function (notification, event) {
			if (event.propertyName === 'opacity' && this.style.opacity === '0')
				notification.__remove();
			else if (notification.shouldRestoreLayering && event.propertyName === 'right') {
				notification.shouldRestoreLayering = false;

				notification.element.classList.remove('jsb-notification-entering');

				notification.restoreLayering();
			}
		}
	},

	'.jsb-notification-toggle-layering': {
		click: function (notification) {
			if (notification.forward)
				notification.restoreLayering();
			else
				notification.bringForward();
		}
	},

	'.jsb-notification-close': {
		click: function (notification, event) {
			notification.disableCloseButtons();

			if (notification.willCloseAll) {
				for (var notificationID in PageNotification.notifications)
					PageNotification.notifications[notificationID].disableCloseButtons().hide();
			} else
				notification.hide();
		}
	}
};

PageNotification.prototype.bindEvents = function () {
	var elements,
			eventType;

	for (var selector in this.events)
		for (eventType in this.events[selector])
			this.addEventListener(eventType, selector, this.events[selector][eventType]);
};

PageNotification.prototype.addEventListener = function (eventType, selector, fn) {
	if (Array.isArray(selector))
		var elements = selector;
	else
		var elements = selector === '*' ? [this.element] : this.element.querySelectorAll(selector);

	for (var i = 0; i < elements.length; i++)
		elements[i].addEventListener(eventType, fn.bind(elements[i], this), true);

	return this;
};

PageNotification.prototype.onPrimaryClose = function (fn) {
	this.addEventListener('click', [this.element.querySelector('.jsb-notification-primary-close')], fn);
};

PageNotification.prototype.primaryCloseButtonText = function (text, ignoreAttribute) {
	if (!ignoreAttribute)
		this.element.setAttribute('data-primaryCloseButtonText', text);

	this.element.querySelector('.jsb-notification-primary-close').value = text;
};

PageNotification.prototype.addCloseButton = function (text, onClick) {
	var input = document.createElement('input');

	input.type = 'button';
	input.value = text;

	input.classList.add('jsb-notification-close');

	this.closeContainer.appendChild(input);

	var events = this.events['.jsb-notification-close'];

	for (var eventType in events)
		this.addEventListener(eventType, [input], events[eventType]);

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
	return this.fullyAlignedTop + this.height > window.innerHeight;
};

PageNotification.prototype.move = function (toTop) {
	var newNotifications = {};

	if (!toTop)
		newNotifications[this.element.id] = this;

	for (var notificationID in PageNotification.notifications)
		if (notificationID !== this.element.id)
			newNotifications[notificationID] = PageNotification.notifications[notificationID];

	if (toTop)
		newNotifications[this.element.id] = this;

	PageNotification.notifications = newNotifications;

	PageNotification.relayer();

	this.bringForward();

	setTimeout(function () {
		PageNotification.shift();
	}, 1000);
};

PageNotification.prototype.bringForward = function () {
	if (this.forward)
		return;

	this.forward = true;

	PageNotification.__forwardedZIndex++;

	this.element.classList.add('jsb-notification-forwarded');

	this.element.style.setProperty('z-index', PageNotification.__forwardedZIndex, 'important');

	if (this.top + this.height > window.innerHeight)
		this.forwardedTop = window.innerHeight - this.height;
};

PageNotification.prototype.restoreLayering = function () {
	if (!this.forward)
		return;

	this.forward = false;

	PageNotification.__forwardedZIndex--;

	this.element.classList.remove('jsb-notification-forwarded');

	this.element.style.setProperty('z-index', this.element.getAttribute('data-originalZIndex'), 'important');

	this.top = this.top;
};

PageNotification.prototype.hide = function (removeNow) {
	if (this.hidden)
		return;

	this.hidden = true;

	if (!this.willCloseAll && this.forward)
		this.restoreLayering();

	PageNotification.shift();

	this.element.style.setProperty('opacity', '0');

	if (removeNow)
		this.__remove();
};

window.addEventListener('keydown', PageNotification.keyStateChanged, true);
window.addEventListener('keyup', PageNotification.keyStateChanged, true);
window.addEventListener('resize', Utilities.throttle(PageNotification.windowResized, 500), true);
