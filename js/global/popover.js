"use strict";

var $$ = function (query, lookIn) {
	return $(query, lookIn ? lookIn : Popover.window().document);
};

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,

	__renderPopover: function (page) {
		Page.await(true);

		if (!Popover.visible())
			return;

		$$('body').html('<pre>' + JSON.stringify(page.tree(), null, 1)._escapeHTML() + '</pre>');
	},
	
	clear: function () {
		$$('body').empty();
	},

	openedPopover: function () {
		UI.clear();
	},

	renderPopover: function (page) {
		Utilities.Timer.timeout('RenderPopover', this.__renderPopover.bind(this, page), 50);
	},
};

Events.addApplicationListener('popover', UI.openedPopover);