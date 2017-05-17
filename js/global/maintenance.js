/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

window.globalSetting = {
	disabled: false,
	speedMultiplier: 1,
	debugMode: false
};

window.$$ = function (selector, context) {
	return $(selector, context || Popover.window.document);
};

var Maintenance = {
	event: new EventListener,
	idleTimer: null,

	resetIdleTimer: function () {
		clearTimeout(Maintenance.idleTimer);

		Maintenance.idleTimer = setTimeout(function () {
			Maintenance.event.trigger('idle');

			Maintenance.resetIdleTimer();
		}, TIME.ONE.HOUR);
	},

	createPopoverGetters: function () {
		var vars = ['UI', 'Poppy', 'Strings', '_'];

		for (var i = vars.length; i--;)
			Object.defineProperty(window, vars[i], {
				get: function (key) {
					return Popover.window[key];
				}.bind(null, vars[i])
			});
	},
	
	maintainPopover: function () {
		var popover = Popover.window,
			popoverURL = ExtensionURL('html/popover.html');

		if (popover.location.href !== popoverURL)
			popover.location.href = popoverURL;
	},

	validate: function (event) {
		if (event && event.target)
			if (event.target.browserWindow) {
				if (!event.target.browserWindow.activeTab || !event.target.browserWindow.activeTab.page)
					ToolbarItems.badge(0, event.target.browserWindow.activeTab);

				Maintenance.resetIdleTimer();
			}
	},

	shouldOpenPopover: function (event) {
		if (event.command === 'popoverTrigger')
			event.target.showPopover();
	}
};

$(function () {
	window.GlobalPageReady = true;

	Maintenance.createPopoverGetters();
	Maintenance.resetIdleTimer();

	Maintenance.event.trigger('globalPageReady', true);
});

Events.addApplicationListener('popover', Maintenance.maintainPopover);
Events.addApplicationListener('validate', Maintenance.validate);
Events.addApplicationListener('command', Maintenance.shouldOpenPopover);
