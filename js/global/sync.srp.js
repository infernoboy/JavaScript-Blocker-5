/*
* @Last modified in Sublime on Mar 07, 2017 04:22:38 PM
*/

'use strict';

SyncClient.SRP = {
	SERVER: {
		URL: SyncClient.ORIGIN + '/srp',

		get PATH() {
			return '/jsb-sync' + (Settings.getItem('syncClientUseDevelopmentServer') ? '-development' : '') + '/socket.io';
		}
	},

	socket: null,
	client: null,

	isLoggedIn: function () {
		return typeof SecureSettings.getItem('syncSessionID') === 'string';
	},

	init: function () {
		SyncClient.SRP.cleanup();

		SyncClient.SRP.socket = io(SyncClient.SRP.SERVER.URL, {
			path: SyncClient.SRP.SERVER.PATH,
			transports: ['websocket'],
			forceNew: true
		});

		return SyncClient.SRP.socket;
	},

	cleanup: function () {
		try {
			if (SyncClient.SRP.socket)
				if (SyncClient.SRP.socket.connected)
					SyncClient.SRP.socket.close();
				else
					SyncClient.SRP.socket.destroy();
		} catch (err) { /* bleh */ }

		SyncClient.SRP.client = null;
		SyncClient.SRP.socket = null;
	},

	errorHandler: function (reject, error) {
		SyncClient.SRP.cleanup();

		reject(error);
	},

	register: function (email, password) {
		return new Promise(function (resolve, reject) {			
			if (typeof email !== 'string' || typeof password !== 'string')
				return reject(Error('email or password is not a string'));

			Utilities.watchdog('syncClientRegister', 1, 1000).then(function () {
				email = email.toLowerCase();

				var socket = SyncClient.SRP.init();

				socket
					.on('connect_error', function () {
						SyncClient.SRP.cleanup();

						reject('server error');
					})
					.on('SRPError', SyncClient.SRP.errorHandler.bind(null, reject))
					.on('ready', function () {
						SyncClient.SRP.client = new jsrp.client();

						SyncClient.SRP.client.init({
							username: email,
							password: password
						}, function () {
							SyncClient.SRP.client.createVerifier(function(err, result) {
								if (err)
									return reject(err);

								socket.emit('register', {
									email: email,
									salt: result.salt,
									verifier: result.verifier
								});
							});
						});
					})
					.on('registered', function () {
						SecureSettings.setItem('syncEmail', email);
						Settings.setItem('syncClientNeedsVerification', true);

						SyncClient.SRP.cleanup();

						SyncClient.event.trigger('registered');

						resolve(true);
					});
			});
		});
	},

	verify: function (verificationKey) {
		return new Promise(function (resolve, reject) {
			if (!SyncClient.isRegistered())
				return reject(Error('not registered'));

			Utilities.watchdog('syncClientVerify', 1, 1000).then(function () {
				var socket = SyncClient.SRP.init();

				socket
					.on('connect_error', function () {
						SyncClient.SRP.cleanup();

						reject('server error');
					})
					.on('SRPError', SyncClient.SRP.errorHandler.bind(null, reject))
					.on('ready', function () {
						socket.emit('verify', {
							email: SecureSettings.getItem('syncEmail'),
							verificationKey: verificationKey
						});
					})
					.on('verified', function () {
						SyncClient.SRP.cleanup();

						Settings.setItem('syncNeedsFullSettingsSync', true);
						Settings.setItem('syncClientNeedsVerification', false);

						resolve(true);
					});
			});
		});
	},

	login: function (email, password) {
		return new Promise(function (resolve, reject) {
			if (typeof email !== 'string' || typeof password !== 'string')
				return reject('email or password is not a string');

			Utilities.watchdog('syncClientLogin', 1, 1000).then(function () {
				email = email.toLowerCase();

				var socket = SyncClient.SRP.init();

				socket
					.on('connect_error', function () {
						SyncClient.SRP.cleanup();

						reject('server error');
					})
					.on('SRPError', SyncClient.SRP.errorHandler.bind(null, reject))
					.on('ready', function () {
						SyncClient.SRP.client = new jsrp.client();

						SyncClient.SRP.client.init({
							username: email,
							password: password
						}, function () {
							socket.emit('login', {
								email: email,
								publicKey: SyncClient.SRP.client.getPublicKey()
							});
						});
					})
					.on('getClientProof', function (message) {
						SyncClient.SRP.client.setSalt(message.serverSalt);
						SyncClient.SRP.client.setServerPublicKey(message.serverPublicKey);

						socket.emit('checkClientProof', SyncClient.SRP.client.getProof());
					})
					.on('checkServerProof', function (serverProof) {
						if (!SyncClient.SRP.client.checkServerProof(serverProof))
							return reject('server proof failed');

						socket.emit('getSyncSessionID', SecureSettings.getItem('syncSessionID') || '');
					})
					.on('syncSessionID', function (syncSessionID) {
						Settings.setItem('syncClientNeedsVerification', false);

						SecureSettings.setItem('syncEmail', email);
						SecureSettings.setItem('syncSessionID', syncSessionID);
						SecureSettings.setItem('syncSharedKey', SyncClient.SRP.client.getSharedKey());

						SyncClient.generateHashWorker(password, SyncClient.SRP.client.getSalt()).then(function (syncPasswordHash) {
							SecureSettings.setItem('syncPasswordHash', syncPasswordHash);

							SyncClient.event.trigger('login');

							resolve(syncSessionID);
						}, reject);
					})
					.on('done', SyncClient.SRP.cleanup);
			}, function () {
				reject('too quick');
			});
		});
	},

	sessionExpired: function (noLogin) {
		var wasLoggedIn = SyncClient.SRP.isLoggedIn();

		SecureSettings.removeItem('syncSessionID');
		SecureSettings.removeItem('syncSharedKey');
		SecureSettings.removeItem('syncPasswordHash');

		if (wasLoggedIn && !noLogin) {
			SyncClient.event.trigger('logout');

			UI.onReady(function () {
				UI.event.addCustomEventListener(Popover.visible() ? 'UIReady' : 'popoverOpened', function () {
					UI.SyncClient.SRP.showLogin(_('sync.session_expired'));
				}, true);
			});
		}
	},

	verifySession: function () {
		return new Promise(function (resolve, reject) {
			SyncClient.ping(SecureSettings.getItem('syncSessionID')).then(function (sessionIsValid) {
				if (sessionIsValid) {
					SyncClient.event.trigger('login');

					return resolve(true);
				}

				if (SecureSettings.getItem('syncSharedKey'))
					SyncClient.SRP.sessionExpired();
			}, reject);
		});
	}
};

if (Extras.isActive())
	SyncClient.SRP.verifySession().then(Utilities.noop, Utilities.noop);
else
	SyncClient.logout(Utilities.noop, Utilities.noop);

Extras.event.addCustomEventListener('trialEnded', function () {
	SyncClient.logout(Utilities.noop, Utilities.noop);
});
