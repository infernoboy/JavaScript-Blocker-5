"use strict";

window.localConsole = console;

var globalPage = GlobalPage.window();

if (!globalPage.GlobalPageReady) {
	Log('Waiting for global page to be ready...');

	window.location.reload();
}

globalPage.Template = Template;

// Allow direct access to required variables contained within the global page.
(function () {
	var required = ['jQuery', 'console', 'globalSetting', 'Settings', 'Promise', 'Store'];

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
})();

window.addEventListener('error', function (event) {
	console.group('Popover Error');

	LogError([event.filename.replace(ExtensionURL(), '/'), event.lineno], event.message);

	console.groupEnd();
});

Template.load('container');
Template.load('main');
// Template.load('rules');
// Template.load('snapshots');
