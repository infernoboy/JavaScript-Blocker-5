"use strict";

window.$$ = function (selector, context) {
	return $(selector, context || Popover.window().document);
};

var Maintenance = {
	maintainPopover: function () {
		var popover = Popover.window(),
				popoverURL = ExtensionURL('popover.html');

		if (popover.location.href !== popoverURL)
			popover.location.href = popoverURL;
	},

	validate: function (event) {
		if (event && event.target) {
			if (event.target.browserWindow && (!event.target.browserWindow.activeTab || !event.target.browserWindow.activeTab.page))
				ToolbarItems.badge(0, event.target.browserWindow.activeTab);
		}
	}
};

$(function () {
	Object.defineProperty(window, 'GlobalPageReady', {
		value: true
	});
});

Events.addApplicationListener('popover', Maintenance.maintainPopover);
Events.addApplicationListener('validate', Maintenance.validate);
