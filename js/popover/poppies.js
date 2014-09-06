"use strict";

Object._extend(Poppy.scripts, {
	mainMenu: function (poppy) {
		poppy.content
			.on('click', '#main-menu-settings', function () {
				poppy.close();

				UI.view.switchTo('#setting-view');
			})
			.on('click', '#main-menu-help', function () {
				poppy.close();

				UI.view.switchTo('#help-view');
			})
			.on('click', '#main-menu-console', function () {
				$(this).parent().empty().append(Template.create('poppy', 'console'));

				poppy.setPosition();
			});
	}
});
