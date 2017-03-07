/*
* @Last modified in Sublime on Mar 05, 2017 03:29:09 PM
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
	}
};
