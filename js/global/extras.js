/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var Extras = {
	__verificationURL: 'http://lion.toggleable.com:160/jsblocker/verify.php',

	isActive: function () {
		return Extras.isUnlockedByDonating() || Extras.isUnlockedForFree() || Extras.Trial.isActive();
	},

	isUnlockedByDonating: function () {
		return Settings.getItem('donationVerified') === true;
	},

	isUnlockedForFree: function () {
		return Settings.getItem('donationVerified') === 777;
	},

	unlockUsingEmail: function (email) {
		return new Promise(function (resolve, reject) {
			$.ajax({
				url: Extras.__verificationURL,
				timeout: 5000,
				data: {
					id: email,
					install: Settings.getItem('installID')
				}
			})
				.done(function (result) {
					var result = parseInt(result, 10);

					if (result >= 0) {
						Settings.setItem('donationVerified', true);

						resolve();
					} else
						reject(result);
				})

				.fail(function (error) {
					reject(error.status + ': ' + error.statusText);
				});
		});
	},

	unlockWithoutDonating: function () {
		Settings.setItem('donationVerified', 777);
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
		},

		ended: function () {
			Settings.setItem('trialStart', -1);
		}
	}
};

Maintenance.event.addCustomEventListener('globalPageReady', function () {
	Command.event.addCustomEventListener('popoverReady', function () {
		Extras.ERROR = {
			'-3': _('extras.unlock.error.email_missing'),
			'-2': _('extras.unlock.error.email_not_found'),
			'-1': _('extras.unlock.error.email_limit_reached')
		};
	}, true);
}, true);

Extras.Trial.autoStart();
// Extras.Trial.start();
