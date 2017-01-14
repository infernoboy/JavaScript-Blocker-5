/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

window.$$ = function (selector, context) {
	return $(selector, context || Popover.window.document);
};

var Maintenance = {
	event: new EventListener,
	
	maintainPopover: function () {
		var popover = Popover.window,
				popoverURL = ExtensionURL('html/popover.html');

		if (popover.location.href !== popoverURL)
			popover.location.href = popoverURL;
	},

	validate: function (event) {
		if (event && event.target) {
			if (event.target.browserWindow) {
				if (!event.target.browserWindow.activeTab || !event.target.browserWindow.activeTab.page)
					ToolbarItems.badge(0, event.target.browserWindow.activeTab);
			}
		}
	},

	shouldOpenPopover: function (event) {
		if (event.command === 'popoverTrigger')
			event.target.showPopover();
	}
};

$(function () {
	window.GlobalPageReady = true;

	Maintenance.event.trigger('globalPageReady', true);
});

Events.addApplicationListener('popover', Maintenance.maintainPopover);
Events.addApplicationListener('validate', Maintenance.validate);
Events.addApplicationListener('command', Maintenance.shouldOpenPopover);
