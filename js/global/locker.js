/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Locker = {
	__temporaryUnlock: null,

	event: new EventListener,

	init: function () {
		UI.event.addCustomEventListener('popoverOpened', Locker.events.popoverOpened);

		if (!Locker.passwordIsSet() && Popover.visible())
			Locker.events.popoverOpened();
	},

	isEnabled: function () {
		return Settings.getItem('useLocker');
	},

	isAlwaysLocked: function (key) {
		return Locker.isEnabled() && Settings.getItem('lockerAlwaysLocked', key);
	},

	isLocked: function (key) {
		return Locker.isEnabled() && (Locker.__temporaryUnlock !== key && (Locker.isAlwaysLocked(key) || Settings.getItem('locker', key)));
	},

	lock: function (key, value) {
		var isLocked = Locker.isLocked(key),
			alwaysLocked = Locker.isAlwaysLocked(key),
			newValue = alwaysLocked ? true : !!value;

		if (typeof alwaysLocked === 'undefined')
			Settings.setItem('locker', newValue, key);
		else {
			Locker.__temporaryUnlock = key;

			Utilities.setImmediateTimeout(function () {
				Locker.__temporaryUnlock = null;
			});
		}

		if (isLocked !== value)
			Locker.event.trigger(value ? 'locked' : 'unlocked', {
				key: key,
				locked: newValue
			});
	},

	passwordIsSet: function () {
		return typeof SecureSettings.getItem('lockerPassword') === 'string';
	},

	validatePassword: function (password) {
		return SecureSettings.getItem('lockerPassword') === password;
	},

	setPassword: function (newPassword, currentPassword) {
		if (Locker.passwordIsSet()) {
			var validated = Locker.validatePassword(currentPassword);

			if (!validated)
				return -2;
		}

		if (!newPassword.length)
			return -1;

		SecureSettings.setItem('lockerPassword', newPassword);

		Locker.event.trigger('passwordSet', true);

		return 0;
	},

	events: {
		popoverOpened: function () {
			if (Locker.isEnabled() && !Locker.passwordIsSet() && !Popover.window.Poppy.poppyWithScriptNameExist('set-lock-password'))		
				UI.Locker.showSetPasswordPrompt(true);
		}
	}
};

Maintenance.event.addCustomEventListener('globalPageReady', function () {
	Command.event.addCustomEventListener('UIReady', function () {
		Locker.init();
	}, true);
}, true);
