"use strict";

var Extras = {
	isActive: function () {
		return Settings.getItem('donationVerified') || Extras.Trial.isActive();
	},

	Trial: {
		__length: TIME.ONE.DAY * 10,

		start: function () {
			Settings.setItem('trialStart', Date.now());
		},

		autoStart: function () {
			if (Settings.getItem('trialStart') === 0)
				Settings.setItem('trialStart', Date.now());
		},
		
		remainingTime: function () {
			var remainingTimeHuman = Utilities.humanTime(Settings.getItem('trialStart') + Extras.Trial.__length - Date.now());

			return _('remaining_time', [remainingTimeHuman.days, remainingTimeHuman.hours, remainingTimeHuman.minutes]);
		},

		isActive: function () {
			var startTime = Settings.getItem('trialStart'),
					isActive = Date.now() < Settings.getItem('trialStart') + Extras.Trial.__length;

			if (!isActive && startTime > 0)
				Settings.setItem('trialStart', -2);

			return isActive;
		},

		endedNotificationRequired: function () {
			return Settings.getItem('trialStart') === -2;
		}
	}
};

Maintenance.event.addCustomEventListener('globalPageReady', function () {
	Command.event.addCustomEventListener('UIReady', function () {
		UI.event.addCustomEventListener('popoverOpened', function () {
			var Poppy = Popover.window.Poppy;

			if (Extras.Trial.endedNotificationRequired() && !Poppy.poppyWithScriptNameExist('trial-ended')) {
				var poppy = new Poppy(0.5, 0, true, 'trial-ended');

				poppy.setContent(Template.create('poppy', 'trial-ended')).modal().show();
			}
		});
	}, true);
}, true);

// Extras.Trial.autoStart();
Extras.Trial.start();
