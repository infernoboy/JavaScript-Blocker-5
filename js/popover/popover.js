"use strict";

window.localConsole = console;

var globalPage = GlobalPage.window;

if (!globalPage.GlobalPageReady) {
	Log('Waiting for global page to be ready...');

	window.location.reload();

	throw new Error('...');
}

globalPage.Template = Template;

// Allow direct access to required variables contained within the global page.
(function () {
	var required = ['jQuery', 'console', 'globalSetting', 'Settings', 'Promise', 'Store', 'EffectiveTLDs', 'SimpleTLDs'];

	for (var i = 0; i < required.length; i++)
		window[required[i]] = globalPage[required[i]];

	window.$ = function (selector, context) {
		if (typeof context === 'undefined')
			return jQuery(selector, document);

		return jQuery(selector, context);
	};

	for (var key in jQuery)
		if (jQuery.hasOwnProperty(key))
			$[key] = jQuery[key];

	$.fn.transitionEnd = function () {
		var nextSibling,
				parent,
				self;

		this.each(function () {
			self = $(this);
			parent = self.parent();
			nextSibling = self.next();

			document.documentElement.appendChild(this);

			if (nextSibling.length)
				self.insertBefore(nextSibling);
			else
				self.appendTo(parent);
		});

		return this;
	};

	$.fn.scrollIntoView = function (scrollContainer, speed, offset) {
		if (this.length) {
			if (typeof offset !== 'number')
				offset = 0;

			var originalScrollTop = scrollContainer.scrollTop();

			this[0].scrollIntoView(true);

			var newScrollTop = scrollContainer.scrollTop();

			scrollContainer
				.scrollTop(originalScrollTop)
				.animate({
					scrollTop: newScrollTop + offset
				}, speed);
		}

		return this;
	};

	$.fn.marginSlideUp = function (speed, easing, onComplete) {
		var self = $(this).eq(0);

		self.animate({
			marginTop: -self.outerHeight()
		}, speed, typeof easing === 'string' ? easing : 'swing', function () {
			self.hide();

			if (typeof onComplete === 'function')
				onComplete.call(self);
		});
	};

	$.fn.marginSlideDown = function (speed, easing, onComplete) {
		var self = $(this).eq(0);

		self.show();

		var height = self.outerHeight();

		self.css('margin-top', -height);

		self.animate({
			marginTop: 0
		}, speed, typeof easing === 'string' ? easing : 'swing', onComplete);
	};
})();

window.addEventListener('error', function (event) {
	console.group('Popover Error');

	LogError(event.filename.replace(ExtensionURL(), '/') + ' - ' + event.lineno, event.message);

	console.groupEnd();
});

Template.load('container');
Template.load('main');
// Template.load('rules');
// Template.load('snapshots');
