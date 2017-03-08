/*
* @Last modified in Sublime on Mar 07, 2017 04:59:45 PM
*/

'use strict';

UI.SyncClient.SRP = {
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
