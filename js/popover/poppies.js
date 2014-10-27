"use strict";

Object._extend(Poppy.scripts, {
	mainMenu: function (poppy) {
		$('#page-menu-show-unblocked-scripts', poppy.content).prop('checked', Settings.getItem('showUnblockedScripts'));
		$('#page-menu-show-resource-url', poppy.content).prop('checked', Settings.getItem('showResourceURLs'));

		poppy.content
			.on('click', '#main-menu-about', function () {
				poppy.close();

				UI.view.switchTo(UI.view.viewSwitcher, '#about-view');
			})

			.on('click', '#main-menu-console', function (event) {
				Poppy.closeLinksTo(poppy);

				var consolePoppy = new Poppy(event.pageX, event.pageY, false, 'console');

				consolePoppy
					.setContent(Template.create('poppy', 'console'))
					.linkTo(poppy)
					.stayOpenOnScroll()
					.show();
			});
	},

	'page-menu': function (poppy) {
		$('#page-menu-show-unblocked-scripts', poppy.content).prop('checked', Settings.getItem('showUnblockedScripts'));
		$('#page-menu-show-resource-url', poppy.content).prop('checked', Settings.getItem('showResourceURLs'));

		poppy.content
			.on('change', '#page-menu-show-unblocked-scripts', function () {
				UI.view.switchTo(UI.view.viewSwitcher, '#page-view');

				Settings.setItem('showUnblockedScripts', this.checked);

				UI.event.addCustomEventListener('poppyDidClose', function () {
					globalPage.Page.requestPageFromActive();
				}, true);

				Poppy.closeAll();
			})

			.on('change', '#page-menu-show-resource-url', function () {
				UI.view.switchTo(UI.view.viewSwitcher, '#page-view');

				var checked = this.checked;

				UI.event.addCustomEventListener('poppyDidClose', function () {
					Settings.setItem('showResourceURLs', checked);
				}, true);

				Poppy.closeAll();
			});
	},

	console: function (poppy) {
		poppy.content
			.on('click', '#console-clear', function () {
				LogError.history = [];
				LogDebug.history = [];

				globalPage.LogError.history = [];
				globalPage.LogDebug.history = [];

				if (poppy.linkedTo)
					poppy.linkedTo.setContent(Template.create('poppy', 'main-menu'));

				poppy.close();
			})
			
			.on('click', '#console-report', function () {
				var messageHistory = Utilities.messageHistory();
				
				var errors = messageHistory.error.map(function (value, i) {
					return value.message + (value.stack ? "\nStack:" + value.stack : '');
				});

				var messages = ['Error Messages', '', errors.join("\n"), "\n", 'Debug Messages', '', messageHistory.debug.join("\n")];

				var tab = Tabs.create('mailto:jsbconsole@toggleable.com?subject=JSB5 Console&body=' + encodeURIComponent(messages.join("\n")));

				setTimeout(function (tab) {
					tab.close();
				}, 200, tab);
			});
	}
});
