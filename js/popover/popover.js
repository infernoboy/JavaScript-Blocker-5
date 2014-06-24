"use strict";

var globalPage = GlobalPage.window();

globalPage.Template = Template;

// Allow direct access to required variables contained within the global page.
(function () {
	var required = ['$', 'jQuery', 'console', 'globalSetting', 'Settings', 'Promise', 'Store'];

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
})();

window.onerror = function (d, p, l, c) {
	LogError('=PopoverError=', p.replace(ExtensionURL(), '/'), [d, l, c], '=/PopoverError=');
};

Template.load('container');
Template.load('main');
// Template.load('rules');
// Template.load('snapshots');
