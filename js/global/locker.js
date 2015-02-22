"use strict";

var Locker = {
	event: new EventListener,

	init: function () {
		UI.event.addCustomEventListener('popoverOpened', Locker.events.popoverOpened);
	},

	isAlwaysLocked: function (key) {
		return Settings.getItem('lockerAlwaysLocked', key);
	},

	isLocked: function (key) {
		return Locker.isAlwaysLocked(key) || Settings.getItem('locker', key);
	},

	lock: function (key, value) {
		var isLocked = Locker.isLocked(key),
				alwaysLocked = Locker.isAlwaysLocked(key),
				newValue = alwaysLocked ? true : !!value;

		if (typeof alwaysLocked === 'undefined')
			Settings.setItem('locker', newValue, key);

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

		return 0;
	},

	showSetPasswordPrompt: function (preventCancel) {
		var poppy = new Popover.window.Poppy(0.5, 0, true, 'set-lock-password');

		poppy.setContent(Template.create('poppy', 'set-lock-password', {
			preventCancel: preventCancel
		}));

		poppy.modal().show();
	},

	showLockerPrompt: function (key, autoUnlock, keepOpenPoppies) {
		return new Promise(function (resolve, reject) {
			if (Popover.window.Poppy.poppyWithScriptNameExist('toggle-lock'))
				return reject();

			var alwaysLocked = Locker.isAlwaysLocked(key);

			if (autoUnlock || (typeof alwaysLocked === 'boolean' && !alwaysLocked)) {
				if (!keepOpenPoppies)
					Popover.window.Poppy.closeAll();

				return resolve();
			}

			var poppy = new Popover.window.Poppy(0.5, 0, !keepOpenPoppies, 'toggle-lock');

			poppy.resolve = resolve;
			poppy.reject = reject;

			poppy.lockerKey = key;
			poppy.locked = Locker.isLocked(key);

			poppy.setContent(Template.create('poppy', 'toggle-lock', {
				locked: poppy.locked,
				info: _('lockerInfo.' + key)
			}));

			poppy.modal().show();
		});
	},

	events: {
		popoverOpened: function () {
			if (!Locker.passwordIsSet() && !Popover.window.Poppy.poppyWithScriptNameExist('set-lock-password'))		
				Locker.showSetPasswordPrompt(true);
		}
	}
};

Maintenance.event.addCustomEventListener('globalPageReady', function () {
	Command.event.addCustomEventListener('UIReady', function () {
		Locker.init();
	}, true);
}, true);
