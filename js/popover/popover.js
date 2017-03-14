/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

window.localConsole = console;

var globalPage = GlobalPage.window;

if (!globalPage.GlobalPageReady) {
	console.warn('Waiting for global page to be ready...');

	if (window.localStorage.getItem('JSB-RELOAD-COUNT') === '10')
		throw new Error('JSB failed to load');

	window.localStorage.setItem('JSB-RELOAD-COUNT', Number(window.localStorage.getItem('JSB-RELOAD-COUNT') || 0) + 1);

	window.stop();

	setTimeout(window.location.reload.bind(window.location));

	throw new Error('...');
}

window.localStorage.removeItem('JSB-RELOAD-COUNT');

globalPage.Template = Template;

// Allow direct access to required variables contained within the global page.
(function () {
	var required = ['jQuery', 'console', 'globalSetting', 'Settings', 'Extras', 'Locker', 'Promise', 'Store', 'EffectiveTLDs', 'SimpleTLDs'];

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

	$.fn.selectAll = function () {
		if (this.length)
			this.each(function () {
				this.selectionStart = 0;
				this.selectionEnd = 1e10;
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
		this.each(function () {
			var self = $(this);

			self.animate({
				marginTop: -self.outerHeight()
			}, speed, typeof easing === 'string' ? easing : 'swing', function () {
				self.hide();

				if (typeof onComplete === 'function')
					onComplete.call(self);
			});
		});
	};

	$.fn.marginSlideDown = function (speed, easing, onComplete) {
		this.each(function () {
			var self = $(this);

			self.show();

			var height = self.outerHeight();

			self.css('margin-top', -height);

			self.animate({
				marginTop: 0
			}, speed, typeof easing === 'string' ? easing : 'swing', onComplete);
		});
	};

	$.fn.collapse = function (speed, easing, onComplete) {
		this.animate({
			height: 0,
			marginTop: 0,
			marginBottom: 0,
			paddingTop: 0,
			paddingBottom: 0
		}, speed, typeof easing === 'string' ? easing : 'swing', function () {
			onComplete.call(this);

			$(this).remove();
		});

		return this;
	};

	$.fn.shake = function (unshake) {
		var className = unshake ? 'unshake' : 'shake';

		this.removeClass(className);

		setTimeout(function (self, className) {
			self.addClass(className);
		}, 0, this, className);

		return this;
	};
})();

window.addEventListener('error', function (event) {
	console.group('Popover Error');

	LogError(event.filename.replace(ExtensionURL(), '/') + ' - ' + event.lineno, event.message);

	console.groupEnd();
});
