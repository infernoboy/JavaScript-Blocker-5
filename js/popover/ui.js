"use strict";

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,

	__renderPage: function (page) {
		if (!Popover.visible())
			return;

		var tree = page.tree();

		$('#main').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a><br/><pre>' + JSON.stringify(tree, null, 1)._escapeHTML() + '</pre>');
	},
	
	clear: function () {
		$('#main').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a>');
	},

	renderPage: Utilities.throttle(function (page) {
		UI.__renderPage(page);
	}, 50, null, true),

	events: {
		openedPopover: function () {
			UI.clear();
		}
	}
};

globalPage.UI = UI;

Events.addApplicationListener('popover', UI.events.openedPopover);
