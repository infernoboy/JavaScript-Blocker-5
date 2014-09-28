"use strict";

Object._extend(Poppy.scripts, {
	mainMenu: function (event) {
		var poppy = event.detail;

		$('#main-menu-show-unblocked-scripts', poppy.content).prop('checked', Settings.getItem('showUnblockedScripts'));
		$('#main-menu-show-resource-url', poppy.content).prop('checked', Settings.getItem('showResourceURLs'));

		poppy.content
			.on('change', '#main-menu-show-unblocked-scripts', function () {
				UI.view.toTop(UI.view.views);

				Settings.setItem('showUnblockedScripts', this.checked);

				UI.event.addCustomEventListener('poppyDidClose', function () {
					globalPage.Page.requestPageFromActive();
				}, true);

				Poppy.closeAll();
			})
			.on('change', '#main-menu-show-resource-url', function () {
				UI.view.toTop(UI.view.views);

				var checked = this.checked;

				UI.event.addCustomEventListener('poppyDidClose', function () {
					Settings.setItem('showResourceURLs', checked);
				}, true);

				Poppy.closeAll();
			})
			.on('click', '#main-menu-help', function () {
				poppy.close();

				UI.view.switchTo(UI.view.viewSwitcher, '#help-view');
			})
			.on('click', '#main-menu-settings', function () {
				poppy.close();

				UI.view.switchTo(UI.view.viewSwitcher, '#setting-view');
			})
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

	console: function (event) {
		var poppy = event.detail;

		poppy.content
			.on('click', '#console-clear', function () {
				LogError.history = [];
				LogDebug.history = [];

				globalPage.LogError.history = [];
				globalPage.LogDebug.history = [];

				if (poppy.linkedTo)
					$('#main-menu-console-message-count', poppy.linkedTo.content).html(_('main_menu.console.messages', [0]));

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
