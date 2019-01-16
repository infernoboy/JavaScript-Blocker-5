/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

SyncClient.Settings = function () {
	this.syncSessionID = String(SecureSettings.getItem('syncSessionID') || '');
};

Object._extend(SyncClient.Settings, {
	AUTO_SYNC_INTERVAL: 60000,
	DO_NOT_SYNC: ['Storage-ResourceCanLoad', 'Storage-Predefined', 'Storage-FilterRules', 'syncClientAutoSync',
		'syncQueue', 'trialStart', 'FilterListLastUpdate', 'donationVerified', 'installID', 'installedBundle',
		'setupComplete', 'isDisabled', 'showPopoverOnLoad', 'openSettings', 'temporarilyShowResourceURLs',
		'settingCurrentView', 'syncNeedsFullSettingsSync', 'syncLastTime', 'syncClientSync', 'lastRuleWasTemporary',
		'syncClientUseDevelopmentServer', 'syncClientNeedsVerification', 'useSecureSettings'],
	DO_NOT_APPEND: ['Storage-StoreSettings'],

	_autoSync: false,

	busy: false,
	queue: [],

	init: function () {
		return new SyncClient.Settings();
	},

	shouldSkip: function (setting) {
		if (!Extras.isActive())
			return true;

		switch (setting) {
			case 'Storage-FirstVisit':
				return !Settings.getItem('syncClientSync', 'firstVisit');

			case 'Storage-AllResourcesRules':
			case 'Storage-Rules':
				return !Settings.getItem('syncClientSync', 'rules');

			case 'Storage-Snapshots':
				return !Settings.getItem('syncClientSync', 'snapshots');

			case 'Storage-UserScripts':
			case 'Storage-UserScripts-Storage':
				return !Settings.getItem('syncClientSync', 'userScripts');

			default:
				return SyncClient.Settings.DO_NOT_SYNC._contains(setting) || !Settings.getItem('syncClientSync', 'settings');
		}
	},

	loadPastQueue: function () {
		var pastQueue = [];

		try {
			pastQueue = SettingStore.getItem('syncQueue') || [];

			for (var i = pastQueue.length; i--;)
				if (pastQueue[i][1].type === 'store')
					pastQueue[i][1].value = SettingStore.getItem(pastQueue[i][1].key);
				else if (pastQueue[i][1].type === 'set')
					pastQueue[i][1].value = Settings.getItem(pastQueue[i][1].key, pastQueue[i][1].storeKey);
		} catch (err) { /**/ }

		SyncClient.Settings.queue = SyncClient.Settings.queue.concat(pastQueue);
	},

	cleanQueue: function (key, storeKey) {
		var newQueue = [];

		for (var i = SyncClient.Settings.queue.length; i--;)
			if (SyncClient.Settings.queue[i][0] !== key + ',' + storeKey)
				newQueue.unshift(SyncClient.Settings.queue[i]);

		SyncClient.Settings.queue = newQueue;
	},

	getCurrentSetting: function (key, storeKey) {
		for (var i = SyncClient.Settings.queue.length; i--;)
			if (SyncClient.Settings.queue[i][0] === key + ',' + storeKey)
				return SyncClient.Settings.queue[i][1];

		return false;
	},

	savableSettings: function () {
		var savableSettings = [];

		for (var i = SyncClient.Settings.queue.length; i--;)
			savableSettings.unshift([null, {
				type: SyncClient.Settings.queue[i][1].type,
				key: SyncClient.Settings.queue[i][1].key,
				storeKey: SyncClient.Settings.queue[i][1].storeKey,
				when: SyncClient.Settings.queue[i][1].when
			}]);

		return savableSettings;
	},

	append: function (type, key, value, storeKey) {
		return CustomPromise(function () {
			if (SyncClient.Settings.shouldSkip(key) || SyncClient.Settings.DO_NOT_APPEND._contains(key))
				return;

			SyncClient.Settings.cleanQueue(key, storeKey);

			SyncClient.Settings.queue.unshift([key + ',' + storeKey, {
				type: type,
				when: Date.now(),
				key: key,
				value: value,
				storeKey: storeKey
			}]);

			SettingStore.setItem('syncQueue', SyncClient.Settings.savableSettings(), true, false);
		});
	},

	setStore: function (key, value) {
		return SyncClient.Settings.append('store', key, value);
	},

	setItem: function (key, value, storeKey) {
		return SyncClient.Settings.append('set', key, value, storeKey);
	},

	removeItem: function (key, storeKey) {
		return SyncClient.Settings.append('remove', key, undefined, storeKey);
	},

	updateProgressBarWithDuration: function (durations, remaining, percent, duration, description) {
		var totalDuration = durations.reduce(function (acc, value, i) {
			return i > 0 ? (acc + value) : acc;
		}, 0);

		var averageDuration = durations.length > 1 ? (totalDuration / (durations.length - 1)) : duration,
			timeRemaining = Math.ceil((averageDuration * remaining) / 1000),
			timeRemainingString = timeRemaining > 0 ? _('sync.time_remaining'._pluralize(timeRemaining), [timeRemaining]) : _('sync.almost_done');

		if (remaining === 0) {
			SyncClient.Settings.busy = false;

			UI.view.updateProgressBar(percent, duration, description, _('sync.done'));
		} else
			UI.view.updateProgressBar(percent, duration, description, timeRemainingString);
	},

	generateSyncableSettings: function () {
		var settings = [],
			allSettings = SettingStore.all()._clone(null, true);

		for (var key in allSettings)
			if (allSettings.hasOwnProperty(key) && !SyncClient.Settings.shouldSkip(key) && !Settings.isDefault(key) && Settings.isKnown(key))
				settings.push({
					type: key._startsWith(Store.STORE_STRING) ? 'store' : 'set',
					key: key,
					value: allSettings[key]
				});

		return {
			isFullSettings: true,
			settings: settings
		};
	},

	autoSync: function (on, syncClientSettings) {
		SyncClient.Settings._autoSync = on;

		syncClientSettings = syncClientSettings || SyncClient.Settings.init();

		if (on)
			syncClientSettings.startSyncTimer();
		else
			syncClientSettings.stopSyncTimer();

		return syncClientSettings;
	},

	addSettings: function (settings, isDecrypted) {
		return CustomPromise(function (resolve, reject) {
			var setting,
				CurrentSetting;

			var sorted = Object.keys(settings).sort(function (a, b) {
				return Number(a) > Number(b) ? 1 : -1;
			});

			var syncClientSettings = SyncClient.Settings.init(),
				decryptedSettings = [],
				addedSettings = [];

			for (var i = sorted.length; i--;)
				decryptedSettings.push(isDecrypted ? Promise.resolve(settings[sorted[i]]) : syncClientSettings.decryptSettings(settings[sorted[i]]));

			addedSettings.push(Promise.all(decryptedSettings).then(function (settings) {
				for (var c = settings.length; c--;)
					for (var b = settings[c].settings.length; b--;) {
						setting = settings[c].settings[b];

						if (SyncClient.Settings.shouldSkip(setting.key))
							continue;

						CurrentSetting = SyncClient.Settings.getCurrentSetting(setting.key, setting.storeKey);

						if (CurrentSetting.when > setting.when) {
							LogDebug('SyncClient: Skipping older synced setting:', setting.key, setting.storeKey);

							continue;
						}

						SettingStore.lock(false);

						switch (setting.type) {
							case 'set':
								LogDebug('SyncClient: SET', setting.key, setting.value, setting.storeKey);

								try {
									Settings.setItem(setting.key, setting.value, setting.storeKey, true, true, true, settings.isFullSettings);
								} catch (err) {
									LogError('SyncClient: Failed to perform SET:', setting.key, setting.value, setting.storeKey);
									LogError(err);
								}
								break;

							case 'remove':
								LogDebug('SyncClient: REMOVE', setting.key, setting.value, setting.storeKey);

								try {
									Settings.removeItem(setting.key, setting.storeKey, true, settings.isFullSettings);
								} catch (err) {
									LogError('SyncClient: Failed to perform REMOVE:', setting.key, setting.value, setting.storeKey);
									LogError(err);
								}
								break;

							case 'store':
								var useLocal = true;
								
								try {
									var decompressed = LZString.decompressFromUTF16(setting.value);

									if (!decompressed.length || decompressed.charAt(0) === '@')
										useLocal = false;
								} catch (e) {
									useLocal = false;
								}

								LogDebug('SyncClient: STORE', setting.key, setting.value.length);

								Settings.__method('setItem', setting.key, setting.value, !useLocal);

								Store.event.trigger('reload', {
									id: setting.key
								});

								break;

							case 'ignore':
								LogDebug('SyncClient: IGNORE', setting.key, setting.storeKey);
								break;
						}

						if (setting.key === 'Storage-StoreSettings')
							Settings.__stores.saveNow();

						SettingStore.lock(SettingStore.__locked);
					}
			}, function (err) {
				LogError('SyncClient.Settings decrypt settings', err);
				reject(err);
			}));

			Promise.all(addedSettings).then(resolve, reject);
		});
	}
});


Object._extend(SyncClient.Settings.prototype, {
	validateSyncSession: function () {
		if (this.syncSessionID !== SecureSettings.getItem('syncSessionID') || typeof SecureSettings.getItem('syncPasswordHash') !== 'string' || !SyncClient.SRP.isLoggedIn()) {
			UI.view.updateProgressBar(100, 0);

			SyncClient.Settings.busy = false;

			LogDebug('SyncClient: Operation cancelled because syncSessionID changed unexpectedly.');

			SyncClient.logout().then(Utilities.noop, Utilities.noop);

			UI.SyncClient.SRP.showLogin(_('sync.session_expired'));

			throw new Error('syncSessionID changed');
		}
	},

	startSyncTimer: function () {
		if (SyncClient.Settings._autoSync)
			Utilities.Timer.interval('syncClientSync', this.sync.bind(this), SyncClient.Settings.AUTO_SYNC_INTERVAL);
	},

	stopSyncTimer: function () {
		Utilities.Timer.remove('interval', 'syncClientSync');
	},

	sync: function () {
		var sync;

		if (SyncClient.SRP.isLoggedIn()) {
			if (!SyncClient.Settings.busy) {
				if (SyncClient.Settings.queue.length)
					sync = this.syncQueuedSettings().catch(LogError);
				else
					sync = this.fetchSettings();

				sync.then(function () {
					SyncClient.Settings.autoSync(Settings.getItem('syncClientAutoSync'));
				}, Utilities.noop);
			}
		} else
			SyncClient.Settings.autoSync(false);
	},

	syncQueuedSettings: function () {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			if (SyncClient.Settings.queue.length && SyncClient.SRP.isLoggedIn()) {
				var settings = SyncClient.Settings.queue._clone(true),
					decryptedSettings = settings._clone(true);

				self.validateSyncSession();

				SyncClient.Settings.queue = [];

				SettingStore.setItem('syncQueue', []);

				self.encryptSettings({
					isFullSettings: false,
					settings: settings
				}).then(function (encryptedSettings) {
					self.syncEncryptedSettings(encryptedSettings, decryptedSettings).then(resolve, reject);
				}, function (err) {
					LogError(err);
					reject(err);
				}).catch(function (err) {
					LogError(err);
					reject(err);
				});
			} else
				reject();
		});
	},

	encryptSettings: function (settings) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			self.validateSyncSession();

			SyncClient.Settings.busy = true;

			var encryptDurations = [];

			self.encryptSingleSetting(settings, settings.settings.length - 1, SecureSettings.getItem('syncPasswordHash'), function (total, remaining, percent, duration) {
				self.validateSyncSession();

				encryptDurations.push(duration);

				SyncClient.Settings.updateProgressBarWithDuration(encryptDurations, remaining, percent, duration, _('sync.encrypting_settings'));
			}).then(resolve, function (err) {
				SyncClient.Settings.busy = false;

				reject(err);
			}).catch(reject);
		});
	},

	encryptSingleSetting: function (settings, i, passwordHash, tick) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			var startTime = Date.now();

			if (Array.isArray(settings.settings[i]))
				settings.settings[i] = settings.settings[i][1];

			SyncClient.generateHashWorker(passwordHash, SyncClient.generateSalt()).then(function (settingEncryptionKey) {
				var valueEncryptor;

				if (settings.settings[i].value === undefined)
					valueEncryptor = Promise.resolve();
				else if (typeof settings.settings[i].value === 'string' && settings.settings[i].value.length > 250000)
					valueEncryptor = SyncClient.encryptWorker(settings.settings[i].value, settingEncryptionKey);
				else
					valueEncryptor = SyncClient.encrypt(settings.settings[i].value, settingEncryptionKey);

				Promise.all([
					SyncClient.encrypt(settingEncryptionKey, passwordHash),
					SyncClient.encrypt(settings.settings[i].key, settingEncryptionKey),
					valueEncryptor,
					settings.settings[i].storeKey !== undefined ? SyncClient.encrypt(settings.settings[i].storeKey, settingEncryptionKey) : Promise.resolve()
				]).then(function (result) {
					delete settings.settings[i].key;
					delete settings.settings[i].value;
					delete settings.settings[i].storeKey;

					settings.settings[i].encryptionKey = result[0];
					settings.settings[i].encryptedKey = result[1];
					settings.settings[i].encryptedValue = result[2];
					settings.settings[i].encryptedStoreKey = result[3];

					if (typeof tick === 'function')
						try {
							tick(settings.settings.length, i, (1 - (i / settings.settings.length)) * 100, Date.now() - startTime);
						} catch (err) {
							return reject(err);
						}

					if (i > 0)
						self.encryptSingleSetting(settings, i - 1, passwordHash, tick).then(resolve, reject);

					resolve(settings);
				}, function (err) {
					LogError('SyncClient.Settings#encryptSingleSetting', err, settings.settings[i]);
					reject(err);
				}).catch(reject);
			}, reject);
		});
	},

	syncEncryptedSettings: function (settings, decryptedSettings) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			if (SyncClient.Settings.busy)
				return setTimeout(function (settings, decryptedSettings, resolve, reject) {
					try {
						self.validateSyncSession();
					} catch (err) {
						return reject(err);
					}

					self.syncEncryptedSettings(settings, decryptedSettings).then(resolve, reject);
				}, 1000, settings, decryptedSettings, resolve, reject);

			self.validateSyncSession();

			SyncClient.Settings.busy = true;

			var data = {
				since: Settings.getItem('syncLastTime') || Date.now(),
				isFullSettings: !!settings.isFullSettings,
				settings: settings
			};

			UI.view.updateProgressBar(-1, 250, _('sync.encrypting_for_session'), _('sync.please_wait'));

			SyncClient.encryptWorker(data, SecureSettings.getItem('syncSharedKey') || '').then(function (encryptedData) {
				self.validateSyncSession();

				UI.view.updateProgressBar(0, 0, _('sync.uploading_settings'), _('sync.almost_done'));

				LogDebug('SyncClient: Encrypted settings size:', Utilities.byteSize(encryptedData.length));

				UI.view.updateProgressBar(1, 250, _('sync.uploading_settings'), _('sync.almost_done'));

				$.ajax({
					method: 'POST',
					timeout: SyncClient.SERVER_TIMEOUT,
					url: SyncClient.SERVER + '/client/sync/setting/add',
					data: {
						syncSessionID: self.syncSessionID,
						encryptedData: encryptedData
					}
				}).uploadProgress(function (event ){
					if (event.lengthComputable)
						UI.view.updateProgressBar((event.loaded / event.total) * 100, 250, _('sync.uploading_settings'), _('sync.almost_done'));
				}).then(function (res) {
					SyncClient.Settings.busy = false;

					UI.view.updateProgressBar(100, 250, _('sync.uploading_settings'), _('sync.done'));

					if (res.error) {
						SyncClient.handleError('SyncClient.Settings#syncEncryptedSettings', res.error);
						reject(res.error);
						return;
					}

					UI.view.updateProgressBar(-1, 250, _('sync.decrypting_for_session'), _('sync.please_wait'));

					SyncClient.decryptWorker(res.encryptedData, SecureSettings.getItem('syncSharedKey') || '').then(function (data) {
						UI.view.updateProgressBar(100, 250, _('sync.decrypting_for_session'), _('sync.done'));

						LogDebug('SyncClient: Synchronized settings at ' + data.time);

						Settings.setItem('syncLastTime', Number(data.time));

						var addSettings;

						if (data.pastSettings.last) {
							LogDebug('SyncClient: Received new settings while syncing. Ensuring settings are up-to-date.');

							var decryptPastSettings = [];

							for (var time in data.pastSettings.settings)
								decryptPastSettings.push(self.decryptSettings(data.pastSettings.settings[time]));

							addSettings = Promise.all(decryptPastSettings).then(function (decryptedPastSettings) {
								for (var a = decryptedPastSettings.length; a--;)
									for (var i = decryptedPastSettings[a].settings.length; i--;)
										for (var b = decryptedSettings.length; b--;)
											if (decryptedSettings[b][0] === (decryptedPastSettings[a].settings[i].key + ',' + decryptedPastSettings[a].settings[i].storeKey) &&
												decryptedSettings[b][1].when > decryptedPastSettings[a].settings[i].when)
												decryptedPastSettings[a].settings[i].type = 'ignore';

								return SyncClient.Settings.addSettings(decryptedPastSettings, true);
							});
						} else
							addSettings = Promise.resolve();

						addSettings.then(function () {
							if (data.needsFullSettingsSync) {									
								Settings.setItem('syncNeedsFullSettingsSync', true);

								self.performFullSettingsSync().then(resolve, reject);
							} else
								resolve(true);
						}, reject);
					}, function (err) {
						UI.view.updateProgressBar(100, 250, _('sync.decrypting_for_session'), _('sync.failed'));

						reject(err);
					});
				}, function (err) {
					SyncClient.Settings.busy = false;

					UI.view.updateProgressBar(100, 250, _('sync.uploading_settings'), _('sync.failed'));

					if (err.status === 413) {
						Settings.setItem('syncNeedsFullSettingsSync', true);

						self.performFullSettingsSync().then(resolve, reject);
					} else  {
						if (err.responseJSON && err.responseJSON.error)
							SyncClient.handleError('SyncClient.Settings#syncEncryptedSettings post', err.responseJSON.error);
						else
							LogError('SyncClient.Settings#syncEncryptedSettings post', err.responseText || err);

						reject(err);
					}
				});
			}, function (err) {
				LogError('SyncClient.Settings#syncEncryptedSettings encrypt data', err);

				reject(err);
			}).catch(reject);
		});
	},

	decryptSettings: function (settings) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			var syncPasswordHash = SecureSettings.getItem('syncPasswordHash');

			if (typeof syncPasswordHash !== 'string')
				return reject(Error('syncPasswordHash missing'));

			var decryptDurations = [];

			self.decryptSingleSetting(settings, settings.settings.length - 1, syncPasswordHash, function (total, remaining, percent, duration) {
				decryptDurations.push(duration);

				SyncClient.Settings.updateProgressBarWithDuration(decryptDurations, remaining, percent, duration, _('sync.decrypting_settings'));
			}).then(resolve, function (err) {
				SyncClient.Settings.busy = false;

				LogError('SyncClient.Settings#decryptSettings', err);
				reject(err);
			}).catch(reject);
		});
	},

	decryptSingleSetting: function (settings, i, passwordHash, tick) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			var startTime = Date.now();

			if (Array.isArray(settings.settings[i]))
				settings.settings[i] = settings.settings[i][1];

			SyncClient.decrypt(settings.settings[i].encryptionKey, passwordHash).then(function (settingEncryptionKey) {				
				Promise.all([
					SyncClient.decrypt(settings.settings[i].encryptedKey, settingEncryptionKey),
					settings.settings[i].encryptedValue !== undefined ? SyncClient.decrypt(settings.settings[i].encryptedValue, settingEncryptionKey) : Promise.resolve(),
					settings.settings[i].encryptedStoreKey !== undefined ? SyncClient.decrypt(settings.settings[i].encryptedStoreKey, settingEncryptionKey) : Promise.resolve()
				]).then(function (result) {
					settings.settings[i].key = result[0];
					settings.settings[i].value = result[1];
					settings.settings[i].storeKey = result[2];

					if (i > 0)
						self.decryptSingleSetting(settings, i - 1, passwordHash, tick).then(resolve, reject);
					else
						resolve(settings);

					if (typeof tick === 'function')
						tick(settings.settings.length, i, (1 - (i / settings.settings.length)) * 100, Date.now() - startTime);
				}, reject);
			}, reject);
		});
	},

	performFullSettingsSync: function () {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			if (SyncClient.Settings.busy)
				return reject(false);

			LogDebug('SyncClient: Preparing to upload all settings.');

			Settings.setItem('syncLastTime', Date.now());

			var syncableSettings = SyncClient.Settings.generateSyncableSettings(),
				decryptedSettings = SyncClient.Settings.generateSyncableSettings();

			self.encryptSettings(syncableSettings).then(function (settings) {
				self.syncEncryptedSettings(settings, decryptedSettings).then(function () {
					Settings.setItem('syncNeedsFullSettingsSync', false);

					resolve(true);
				}, reject);
			}, function (err) {
				reject(err);
			});
		});
	},

	fetchSettings: function (since) {
		var self = this;

		return CustomPromise(function (resolve, reject) {
			if (SyncClient.Settings.busy)
				return reject(Error('busy'));

			self.validateSyncSession();

			SyncClient.Settings.busy = true;

			UI.view.updateProgressBar(1, 250, _('sync.downloading_settings'), _('sync.almost_done'));

			$.ajax({
				method: 'POST',
				timeout: SyncClient.SERVER_TIMEOUT,
				url: SyncClient.SERVER + '/client/sync/setting/get',
				data: {
					syncSessionID: self.syncSessionID,
					since: since || Settings.getItem('syncLastTime') || 1
				}
			}).progress(function (event ){
				if (event.lengthComputable)
					UI.view.updateProgressBar((event.loaded / event.total) * 100, 250, _('sync.downloading_settings'), _('sync.almost_done'));
			}).then(function (res) {
				SyncClient.Settings.busy = false;

				UI.view.updateProgressBar(100, 250, _('sync.downloading_settings'), _('sync.done'));

				if (res.error) {
					SyncClient.handleError('SyncClient.Settings#fetchSettings post', res.error);

					return reject(res.error);
				}

				UI.view.updateProgressBar(-1, 250, _('sync.decrypting_for_session'), _('sync.please_wait'));

				SyncClient.decryptWorker(res.encryptedData, SecureSettings.getItem('syncSharedKey') || '').then(function (data) {
					UI.view.updateProgressBar(100, 250, _('sync.decrypting_for_session'), _('sync.done'));

					if (!data || !data.last)
						return resolve(false);

					LogDebug('SyncClient: Received new settings.');

					Settings.setItem('syncLastTime', Number(data.last));

					SyncClient.Settings.addSettings(data.settings).then(resolve, reject);
				}, function (err) {
					UI.view.updateProgressBar(100, 250, _('sync.decrypting_for_session'), _('sync.failed'));

					reject(err);
				});
			}, function (err) {
				SyncClient.Settings.busy = false;

				UI.view.updateProgressBar(100, 250, _('sync.downloading_settings'), _('sync.failed'));

				if (err.responseJSON && err.responseJSON.error)
					SyncClient.handleError('SyncClient.Settings#fetchSettings post', err.responseJSON.error);
				else
					LogError('SyncClient.Settings#fetchSettings post', err.responseText || err.statusText || err.status);

				reject(err);
			});
		});
	},

	
});

SyncClient.event
	.addCustomEventListener('login', function () {
		Command.event.addCustomEventListener('popoverReady', function () {
			var syncClientSettings = SyncClient.Settings.init();

			if (Settings.getItem('syncNeedsFullSettingsSync'))
				syncClientSettings.performFullSettingsSync().then(function () {
					LogDebug('SyncClient: Uploaded all settings.');

					SyncClient.Settings.autoSync(Settings.getItem('syncClientAutoSync'), syncClientSettings);
				}, Utilities.noop);
			else {
				SyncClient.Settings.autoSync(Settings.getItem('syncClientAutoSync'), syncClientSettings);

				SyncClient.Settings.loadPastQueue();

				syncClientSettings.sync();
			}
		}, true);
	})
	.addCustomEventListener('passwordChanged', function () {
		Settings.setItem('syncNeedsFullSettingsSync', true);
	})
	.addCustomEventListener('logout', function () {
		SyncClient.Settings.autoSync(false);
	})
	.addCustomEventListener('error', function (event) {
		SyncClient.Settings.autoSync(false);

		LogError('SyncClient: Automatic syncing is disabled: ' + ((event && event.detail) ? (event.detail.name || event.detail) : 'unknown reason'));
	});
