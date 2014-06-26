"use strict";

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,

	__renderPopover: function (page) {
		if (!Popover.visible())
			return;

		$('body').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a><br/><pre>' + JSON.stringify(page.tree(), null, 1)._escapeHTML() + '</pre>');
	},
	
	clear: function () {
		$('body').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a>');
	},

	openedPopover: function () {
		UI.clear();
	},

	renderPopover: function (page) {
		Utilities.Timer.timeout('RenderPopover', this.__renderPopover.bind(this, page), 50);
	},
};

Events.addApplicationListener('popover', UI.openedPopover);

globalPage.UI = UI;
