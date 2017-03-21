/*
* @Last modified in Sublime on Mar 21, 2017 11:01:34 AM
*/

'use strict';

UI.SyncClient.SRP = {
	sessionExpired: function () {
		UI.onReady(function () {
			UI.event.addCustomEventListener(Popover.visible() ? 'UIReady' : 'popoverOpened', function () {
				UI.SyncClient.SRP.showLogin(_('sync.session_expired'));
			}, true);

			globalPage.Update.showRequiredPopover();
		});
	},

	showLogin: function (reason) {
		var poppy = new Poppy(0.5, 0, true, 'sync-client-login');

		poppy
			.setContent(Template.create('poppy.sync', 'login', {
				reason: reason
			}))
			.modal()
			.show();
	},

	showRegister: function () {
		var poppy = new Poppy(0.5, 0, true, 'sync-client-register');

		poppy
			.setContent(Template.create('poppy.sync', 'register'))
			.modal()
			.show();
	},

	showVerify: function () {
		var poppy = new Poppy(0.5, 0, true, 'sync-client-verify');

		poppy
			.setContent(Template.create('poppy.sync', 'verify', {
				email: (SecureSettings.getItem('syncEmail') || '')._escapeHTML()
			}))
			.modal()
			.show();
	},

	showChangePassword: function () {
		var poppy = new Poppy(0.5, 0, true, 'sync-client-change-password');

		poppy
			.setContent(Template.create('poppy.sync', 'change-password', {
				email: (SecureSettings.getItem('syncEmail') || '')._escapeHTML()
			}))
			.modal()
			.show();
	}
};
