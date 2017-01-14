/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

"use strict";

var FloatingHeader = function (container, selector, related, offset, useOffset) {
	this.id = Utilities.Token.generate();
	this.container = container;
	this.selector = selector;
	this.related = related;
	this.offset = offset;
	this.useOffset = useOffset;

	FloatingHeader.__instances[this.id] = this;

	this.init();
};

FloatingHeader.__instances = {};

FloatingHeader.adjustAll = function () {
	for (var id in FloatingHeader.__instances) {
		FloatingHeader.readyHeaders({
			detail: FloatingHeader.__instances[id].container[0]
		}, true);

		FloatingHeader.__instances[id].adjustPosition();
	}
};

FloatingHeader.readyHeaders = function (event, all) {
	var header;

	var headers = document.body.querySelectorAll('.floating-header:not(' + (all ? '.null' : '.floating-header-ready') + ')');

	for (var i = headers.length; i--;) {
		headers[i].classList.add('floating-header-ready');

		header = $(headers[i]);

		header.data({
			left: header.offset().left,
			width: header.width(),
			outerHeight: header.outerHeight(),
			outerHeightMargin: header.outerHeight(true),
			innerHeight: header.innerHeight()
		});
	}
};

FloatingHeader.prototype.init = function () {
	var self = this;

	UI.event
		.addCustomEventListener(['popoverOpened', 'pageDidRender'], function () {
			self.setContainerOffset();
		});
};

FloatingHeader.prototype.setContainerOffset = function () {
	if (!this.containerOffsetTop) {
		if (this.container.is(':visible'))
			this.containerOffsetTop = this.container.offset().top;
		else
			return Utilities.Timer.timeout('setContainerOffset-' + this.id, this.setContainerOffset.bind(this), 1000);
	}

	this.requestFrame();
};

FloatingHeader.prototype.requestFrame = function (timestamp) {
	if (!Popover.visible())
		return;

	if (this.container.data('requestScrollTop') === this.container[0].scrollTop) {

		return setTimeout(function (self) {
			window.requestAnimationFrame(self.requestFrame.bind(self));
		}, 1000 / 5, this);
	}

	this.container.data('requestScrollTop', this.container[0].scrollTop);

	this.adjustPosition();

	setTimeout(function (self) {
		window.requestAnimationFrame(self.requestFrame.bind(self));
	}, 1000 / 30, this);
};

FloatingHeader.prototype.adjustPosition = function () {
	var self = this,
			offset = (typeof this.offset === 'function') ? this.offset(this.container, this.selector) : this.offset,
			selfOffset = this.useOffset ? offset : 0,
			top = this.containerOffsetTop + offset,
			allHeaders = $(this.selector, this.container),
			unfloatedHeaders = allHeaders.not('.floated-header');

	var currentHeader =
		unfloatedHeaders
			.filter(function () {
				var me = $(this);

				return me.is(':visible') && me.offset().top <= self.containerOffsetTop + selfOffset;
			})
			.filter(':last');

	var nextHeader = unfloatedHeaders.eq(unfloatedHeaders.index(currentHeader) + 1);

	$(this.selector, this.container).remove('.floated-header');

	if (!currentHeader.length)
		return;

	var floatedHeaderID = 'floated-header-' + this.id;
	
	var currentHeaderClone =
		currentHeader
			.clone(true, true)
			.attr('id', floatedHeaderID)
			.addClass('floated-header');

	$('*', currentHeaderClone).removeClass('poppy-menu-ready');

	currentHeaderClone.insertBefore(currentHeader);

	var relatedElementCache = currentHeader.data('relatedElement');

	if (relatedElementCache)
		var relatedElement = relatedElementCache;
	else {
		var relatedElement = (typeof this.related === 'function') ? this.related(this.container, currentHeader) : null;

		if (relatedElement && relatedElement.saveToCache)
			currentHeader.data('relatedElement', relatedElement);
	}
	
	var relatedShifted = false,
			currentHeaderMarginHeight = currentHeader.data('outerHeightMargin');

	if (relatedElement) {
		var offsetTop = relatedElement.offset().top + relatedElement.outerHeight() + currentHeaderMarginHeight - currentHeader.data('outerHeight');

		if (offsetTop <= currentHeaderMarginHeight + offset + this.containerOffsetTop) {
			top = offsetTop - currentHeaderMarginHeight;
			relatedShifted = true;

			currentHeaderClone.addClass('floated-header-related-push');
		}
	}

	if (nextHeader.length && !relatedShifted) {
		var offsetTop = nextHeader.offset().top + offset - currentHeader.data('innerHeight') - this.containerOffsetTop;

		if (offsetTop < 0) {
			top += offsetTop;

			currentHeaderClone.addClass('floated-header-push');
		}
	}

	currentHeaderClone.css({
		top: top,
		left: currentHeader.data('left'),
		width: currentHeader.data('width')
	});
};

UI.event.addCustomEventListener('elementWasAdded', FloatingHeader.readyHeaders);
