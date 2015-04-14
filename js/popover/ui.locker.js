"use strict";

UI.Locker = {
	showSetPasswordPrompt: function (preventCancel) {
		var poppy = new Popover.window.Poppy(0.5, 0, true, 'set-lock-password');

		poppy.setContent(Template.create('poppy.settings', 'set-lock-password', {
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

			poppy.setContent(Template.create('poppy.settings', 'toggle-lock', {
				locked: poppy.locked,
				info: _('lockerInfo.' + key)
			}));

			poppy.modal().show();
		});
	},
};
