"use strict";

Object._extend(Poppy.scripts, {
	'disable-menu': function (poppy) {
		poppy.content
			.on('change', '#disable-menu-for', function () {
				Settings.setItem('disableTime', parseInt(this.value, 10));
			})

			.on('click', '#disable-menu-for-disable', function () {
				globalPage.Command.toggleDisabled(true);

				globalPage.Utilities.Timer.timeout('autoEnableJSB', function () {
					globalPage.Command.toggleDisabled(false, true);
				}, Settings.getItem('disableTime'));

				poppy.close();
			});
	},

	'main-menu': function (poppy) {
		poppy.content
			.on('click', '#main-menu-about', function () {
				poppy.close();

				UI.view.switchTo('#main-views-about');
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
		poppy.content
			.on('change', '#page-menu-show-page-editor, #page-menu-show-unblocked-scripts', function () {
				UI.view.switchTo('#main-views-page');

				UI.event.addCustomEventListener('poppyDidClose', function () {
					globalPage.Page.requestPageFromActive();
				}, true);

				Poppy.closeAll();
			})

			.on('change', '#page-menu-show-resource-url', function () {
				UI.view.switchTo('#main-views-page');

				var checked = this.checked;

				UI.event.addCustomEventListener('poppyDidClose', function () {
					Settings.setItem('showResourceURLs', checked);
				}, true);

				Poppy.closeAll();
			});
	},

	'rule-menu': function (poppy) {
		poppy.content
			.on('click', '#rule-menu-remove-temporary', function () {
				globalPage.Rules.list.temporary.clear();

				Poppy.closeAll();

				Tabs.messageAll('reload');
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
