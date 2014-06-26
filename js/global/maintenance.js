"use strict";

var Maintenance = {
	validate: function (event) {
		if (!window.UI)
			return setTimeout(Maintenance.validate, 0, event);

		if (event && event.target) {
			BrowserWindows.all().forEach(function (browserWindow) {
				if (event.target.browserWindow === browserWindow) {
					if (!UI.disabled) {
						event.target.disabled = !browserWindow.activeTab || !browserWindow.activeTab.page;
						
						if (event.target.disabled) {
							ToolbarItems.badge(0, browserWindow.activeTab);

							Popover.hide();
						}
					}
				}
			});
		}
	}
};

Events.addApplicationListener('validate', Maintenance.validate);
