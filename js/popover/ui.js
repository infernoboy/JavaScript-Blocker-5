"use strict";

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,

	__renderPopover: function (page) {
		if (!Popover.visible())
			return;

		var tree = page.tree();

		$('body').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a><br/><pre>' + JSON.stringify(tree, null, 1)._escapeHTML() + '</pre>');
	},
	
	clear: function () {
		$('body').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a>');
	},

	openedPopover: function () {
		UI.clear();
	},

	renderPopover: Utilities.throttle(function (page) {
		UI.__renderPopover(page);
	}, 50, null, true),
};

globalPage.UI = UI;

Events.addApplicationListener('popover', UI.openedPopover);
