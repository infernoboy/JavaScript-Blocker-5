/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

Object._extend(Settings, {
	__method: function (method, setting, value, persist) {
		if (SettingStore.available) {
			if (method === 'setItem' || method === 'removeItem')
				Settings.anySettingChanged({
					key: setting
				});

			return SettingStore[method](setting, value, null, persist);
		}	else
			return GlobalCommand('settingStore.' + method, {
				setting: setting,
				value: value
			});
	},

	__validate: function (type, value, options, otherOption, extendOptions) {
		if (typeof type !== 'string')
			throw new Error('missing setting type');

		if (type._startsWith('dynamic'))
			return ((typeof value === 'object' && (value.hasOwnProperty('enabled') && value.hasOwnProperty('value'))) && Settings.__validate(type.substr(8), value.value, options, otherOption, extendOptions));

		if (type._startsWith('many'))
			return Settings.__validate(type.substr(5), value, options, otherOption, extendOptions);

		switch (type) {
			case 'boolean':
				return typeof value === 'boolean';

			case 'option':
			case 'option-radio':
				var allOptions = extendOptions ? extendOptions.concat(options) : options;

				for (var i = 0; i < allOptions.length; i++)
					if (allOptions[i][0].toString() === value.toString())
						return true;

				if (otherOption)
					return otherOption.validate ? otherOption.validate(value) : true;

				return false;

			case 'string':
				return typeof value === 'string';

			case 'number':
				return typeof value === 'number';

			case 'range':
				return (isNaN(value) || value % 1 !== 0) ? false : (value >= options[0] && value <= options[1]);

			case 'array':
				return Array.isArray(value);

			case 'mixed':
				if (otherOption)
					return otherOption.validate ? otherOption.validate(value) : true;
				
				return true;

			default:
				throw new Error('failed to validate type - ' + type);
		}
	},

	IMPORTING: false,

	ERROR: {
		NOT_FOUND: 'setting not found - {0}',
		WHEN_GROUP_ERROR: 'cannot set setting at this time - {0}',
		STORE_KEY_NOT_FOUND: 'setting does not have storeKey - {0} - {1}',
		INVALID_TYPE: 'value for setting is invalid - {0} - {1} - {2}'
	},

	map: {},

	onToggleLock: function (event) {
		if (event.detail.key === 'settings')
			if (event.detail.locked)
				UI.view.switchTo('#main-views-page');
			else
				UI.view.switchTo('#main-views-setting');
	},

	onStoreReload: function () {
		SettingStore.__cache = {};
		Special.__enabled = null;

		FilterList.fetch();
	},

	isLocked: function () {
		return Locker.isLocked('settings');
	},

	onChange: function (event) {
		if (Settings.map[event.key] && typeof Settings.map[event.key].props.onChange === 'function')
			Settings.map[event.key].props.onChange(event.oldValue, event.newValue);
	},

	anySettingChanged: function (event) {
		if (Utilities.Page.isGlobal) {
			if (window.globalSetting && event.key in window.globalSetting)
				setTimeout(function () {
					if (event.key !== 'debugMode')
						window.globalSetting[event.key] = Settings.getItem(event.key);
				});

			if (event.key === 'openSettings') {
				Update.showRequiredPopover();

				UI.view.switchTo('#main-views-setting');
			}
		}

		if (event.key === 'settingCurrentView')
			return;

		if (Settings.isUserEditable(event.key) && window.UI && UI.Settings && UI.Settings.view && UI.Settings.view.is('.active-view'))
			setTimeout(UI.Settings.repopulateActiveSection);
	},

	isUserEditable: function (settingKey) {
		if (Settings.map.hasOwnProperty((settingKey))) {
			for (var i = Settings.settings.__misc.length; i--;)
				if (Settings.settings.__misc[i].setting === settingKey || Settings.settings.__misc[i].store === settingKey)
					return false;

			return true;
		}

		return false;
	},

	all: function () {
		var all = {};

		for (var setting in Settings.map)
			if (Settings.map.hasOwnProperty(setting))
				all[setting] = Settings.getItem(setting);

		return all;
	},

	getItem: function (settingKey, storeKey) {
		var setting = Settings.map[settingKey];

		if (!setting) {
			LogError(Error(Settings.ERROR.NOT_FOUND._format([settingKey])));

			return undefined;
		}

		var value,
			defaultValue,
			isExtra;

		if (setting.storeKeySettings || setting.store) {
			var hasOwnDefaults = setting.props.default,
				defaultStorage = hasOwnDefaults ? setting.props.default : setting.storeKeySettings;

			if (storeKey && !defaultStorage[storeKey])
				defaultStorage = ({})._setWithDefault(storeKey, {
					props: {}
				});

			if (!storeKey) {
				var storedValues = {},
					storeKeys = Object.keys(defaultStorage).concat(Settings.__stores.getStore(settingKey).keys());

				for (var i = storeKeys.length; i--;)
					storedValues[storeKeys[i]] = Settings.getItem(settingKey, storeKeys[i]);

				return storedValues;
			}

			if (!setting.storeKeySettings[storeKey] && !setting.props.type._startsWith('dynamic') && !setting.props.type._startsWith('many')){
				LogError(Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey])));

				return undefined;
			}

			storeKey = (setting.storeKeySettings[storeKey] && setting.storeKeySettings[storeKey].props.remap) ? setting.storeKeySettings[storeKey].props.remap : storeKey;

			value = Settings.__stores.getStore(settingKey).get(storeKey);

			defaultValue = hasOwnDefaults ? defaultStorage[storeKey] : defaultStorage[storeKey].props.default;

			isExtra = setting.storeKeySettings[storeKey] ? setting.storeKeySettings[storeKey].props.isExtra : false;
		} else {
			value = Settings.__method('getItem', settingKey);

			defaultValue = setting.props.default;

			isExtra = setting.props.isExtra;
		}

		if (typeof defaultValue === 'function')
			defaultValue = defaultValue();

		try {
			value = (value === null || value === undefined || setting.props.readOnly || (isExtra && !Extras.isActive())) ? defaultValue : value;

			if (typeof defaultValue === 'object' && typeof value !== 'object')
				value = JSON.parse(value);
		} catch (error) {
			LogError('no default value for ' + settingKey, setting, error);

			return undefined;
		}

		return value;
	},

	confirmSettingSet: function (confirmChange, settingKey, value, storeKey, unlocked) {
		var shouldConfirm = false;

		if (confirmChange.when)
			shouldConfirm = Utilities.Group.eval(confirmChange.when, Settings.all());
		else if (confirmChange.toValues)
			shouldConfirm = confirmChange.toValues._contains(value);
		else if (confirmChange.prompt)
			shouldConfirm = true;

		if (shouldConfirm) {
			if (confirmChange.prompt) {
				var confirmed = confirmChange.prompt(settingKey, value, storeKey);

				setTimeout(ToolbarItems.showPopover);

				if (!confirmed)
					UI.Settings.repopulateActiveSection();
				else
					return Settings.setItem(settingKey, value, storeKey, true, unlocked);

				return;
			}

			var poppy = new Popover.window.Poppy(0.5, 0, true, 'confirm-setting-change');

			poppy.setting = {
				key: settingKey,
				storeKey: storeKey,
				value: value,
				unlocked: unlocked
			};

			poppy.setContent(Template.create('poppy.settings', 'confirm-setting-change', {
				string: _('setting.' + settingKey + '.confirm')
			}));

			poppy.modal().show();
			
			return false;
		} else
			return Settings.setItem(settingKey, value, storeKey, true, unlocked);
	},

	unlockSettingSet: function (settingKey, value, storeKey) {
		UI.Locker
			.showLockerPrompt('setting')
			.then(function () {
				Settings.setItem(settingKey, value, storeKey, false, true);
			}, function () {
				UI.Settings.repopulateActiveSection();
			});
	},

	isDefault: function (settingKey, storeKey)  {
		if (storeKey)
			return !Settings.__stores.keyExist(settingKey) || !Settings.__stores.getStore(settingKey).keyExist(storeKey);
		else
			return !SettingStore.isSet(settingKey);
	},

	isKnown: function (settingKey, storeKey) {
		if (storeKey) {
			if (!Settings.map.hasOwnProperty(settingKey))
				return false;

			var setting = Settings.map[settingKey];

			if (!setting.storeKeySettings)
				return false;

			var storeSetting = setting.storeKeySettings[storeKey];

			if (storeSetting && storeSetting.props.remap) {
				storeKey = storeSetting.props.remap;

				storeSetting = setting.storeKeySettings[storeKey];
			}

			if (!storeSetting)
				if (setting.props.type._startsWith('dynamic') || setting.props.type._startsWith('many'))
					return true;
				else
					return false;
		} else
			return Settings.map.hasOwnProperty(settingKey) || settingKey._startsWith(Store.STORE_STRING);
	},

	setItem: function (settingKey, value, storeKey, changeConfirmed, unlocked, isSync, isFullSync) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		var type = setting.props.type,
			options = setting.props.options,
			otherOption = setting.props.otherOption,
			confirmChange = setting.props.confirm,
			locked = setting.props.locked;

		var prevValue;

		if (setting.storeKeySettings) {
			var storeSetting = setting.storeKeySettings[storeKey];

			if (storeSetting && storeSetting.props.remap) {
				storeKey = storeSetting.props.remap;

				storeSetting = setting.storeKeySettings[storeKey];
			}

			if (!storeSetting)
				if (setting.props.type._startsWith('dynamic') || setting.props.type._startsWith('many'))
					storeSetting = {
						props: {}
					};
				else
					throw new Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey]));

			type = type || storeSetting.props.type;
			options = options || storeSetting.props.options;
			otherOption = otherOption || storeSetting.props.otherOption;
			confirmChange = confirmChange || storeSetting.props.confirm;
			locked = locked || storeSetting.props.locked;

			var customValidate = setting.props.validate || storeSetting.props.validate;

			if (locked && !unlocked)
				return Settings.unlockSettingSet(settingKey, value, storeKey);

			if (customValidate && !customValidate.test(type, value, options, otherOption, storeSetting.props.extendOptions))
				return 'setting.' + customValidate.onFail;

			if (!Settings.__validate(type, value, options, otherOption, storeSetting.props.extendOptions))
				throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, storeKey, value]));

			if (confirmChange && !changeConfirmed)
				return Settings.confirmSettingSet(confirmChange, settingKey, value, storeKey, unlocked);

			prevValue = (setting.props.onChange || storeSetting.props.onChange) ? Settings.getItem(settingKey, storeKey) : undefined;

			Settings.__stores.getStore(settingKey).set(storeKey, value);

			if (setting.props.onChange)
				setting.props.onChange('set', settingKey, value, storeKey, prevValue, isSync, isFullSync);

			if (storeSetting.props.onChange)
				storeSetting.props.onChange('set', settingKey, value, storeKey, prevValue, isSync, isFullSync);

			Settings.anySettingChanged({
				key: settingKey
			});

			if (!isSync)
				SyncClient.Settings.setItem(settingKey, value, storeKey);
		} else if (Settings.__validate(type, value, options, otherOption, setting.props.extendOptions)) {			
			if (locked && !unlocked)
				return Settings.unlockSettingSet(settingKey, value, storeKey);

			if (confirmChange && !changeConfirmed)
				return Settings.confirmSettingSet(confirmChange, settingKey, value, storeKey, unlocked);

			prevValue = setting.props.onChange ? Settings.getItem(settingKey, storeKey) : undefined;

			Settings.__method('setItem', settingKey, value);

			if (setting.props.onChange)
				setting.props.onChange('set', settingKey, value, storeKey, prevValue, isSync, isFullSync);

			if (!isSync)
				SyncClient.Settings.setItem(settingKey, value);
		} else
			throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, '', value]));

		return true;
	},

	removeItem: function (settingKey, storeKey, isSync, isFullSync) {
		var setting = Settings.map[settingKey],
			storeSetting = setting.storeKeySettings ? setting.storeKeySettings[storeKey] : null;

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		if (setting.storeKeySettings || setting.store) {
			var prevValue = (setting.props.onChange || (storeSetting && storeSetting.props.onChange)) ? Settings.getItem(settingKey, storeKey) : undefined;

			if (storeKey) {
				if (setting.storeKeySettings[storeKey])
					storeKey = setting.storeKeySettings[storeKey].props.remap || storeKey;

				Settings.__stores.getStore(settingKey).remove(storeKey);
			} else
				Settings.__stores.getStore(settingKey).clear();

			if (setting.props.onChange)
				setting.props.onChange('remove', settingKey, undefined, storeKey, prevValue, isSync, isFullSync);

			if (storeSetting && storeSetting.props.onChange)
				storeSetting.props.onChange('remove', settingKey, undefined, storeKey, prevValue, isSync, isFullSync);

			Settings.anySettingChanged({
				key: settingKey
			});

			if (!isSync)
				SyncClient.Settings.removeItem(settingKey, storeKey);
		} else {
			Settings.__method('removeItem', settingKey);
			if (!isSync)
				SyncClient.Settings.removeItem(settingKey);
		}
	},

	createMap: function (settings, when) {
		var settingKey;

		for (var i = 0; i < settings.length; i++) {
			if (settings[i].settings)
				Settings.createMap(settings[i].settings, settings[i].when);
			else {
				settingKey = settings[i].setting ? settings[i].setting : settings[i].store;

				if (settingKey)
					if (settings[i].store) {
						if (when)
							settings[i].props.when = when;

						if (!Settings.map[settingKey])
							Settings.map[settingKey] = {
								store: settingKey,
								storeKeySettings: {},
								props: settings[i].props,
								when: when
							};
						else
							LogError(Error('found store setting more than once - ' + settingKey));
					} else if (settings[i].props && settings[i].props.storeKey)
						Settings.map[settingKey].storeKeySettings[settings[i].props.storeKey] = settings[i];
					else if (!Settings.map[settingKey]){
						if (when)
							settings[i].props.when = when;

						Settings.map[settingKey] = settings[i];
					}
			}

			if (settings[i].props && settings[i].props.subSettings)
				Settings.createMap(settings[i].props.subSettings, settings[i].when);

			if (settings[i].asRow)
				Settings.createMap(settings[i].asRow);
		}

		return Settings.map;
	},

	export: function (options, deleteProps, unencrypted) {
		return CustomPromise(function (resolve, reject) {
			var allSettings = SettingStore.all(),
				exported = {};

			if (options.exportSettings)
				exported = SettingStore.all()._clone(true);

			delete exported.length;

			if (!options.exportFirstVisit)
				delete exported['Storage-FirstVisit'];
			else if (!options.exportSettings)
				exported['Storage-FirstVisit'] = allSettings['Storage-FirstVisit'];

			if (!options.exportRules) {
				delete exported['Storage-AllResourcesRules'];
				delete exported['Storage-Rules'];
			}	else if (!options.exportSettings) {
				exported['Storage-AllResourcesRules'] = allSettings['Storage-AllResourcesRules'];
				exported['Storage-Rules'] = allSettings['Storage-Rules'];
			}

			if (!options.exportSnapshots)
				delete exported['Storage-Snapshots'];
			else if (!options.exportSettings)
				exported['Storage-Snapshots'] = allSettings['Storage-Snapshots'];

			if (!options.exportUserScripts) {
				delete exported['Storage-UserScripts'];
				delete exported['Storage-UserScripts-Storage'];
			} else if (!options.exportSettings) {
				exported['Storage-UserScripts'] = allSettings['Storage-UserScripts'];
				exported['Storage-UserScripts-Storage'] = allSettings['Storage-UserScripts-Storage'];
			}

			delete exported['FilterListLastUpdate'];
			delete exported['Storage-FilterRules'];
			delete exported['Storage-Predefined'];
			delete exported['Storage-ResourceCanLoad'];
			delete exported['donationVerified'];
			delete exported['trialStart'];
			delete exported['updateNotify'];
			delete exported['installedBundle'];
			delete exported['openSettings'];
			delete exported['syncQueue'];
			delete exported['syncLastTime'];
			delete exported['syncNeedsFullSettingsSync'];
			delete exported['syncClientUseDevelopmentServer'];
			delete exported['syncClientNeedsVerification'];

			if (Array.isArray(deleteProps))
				for (var i = deleteProps.length; i--;)
					delete exported[deleteProps[i]];

			for (var key in exported)
				if ((exported.hasOwnProperty(key) && Settings.isDefault(key)) || !Settings.isKnown(key))
					delete exported[key];

			if (SettingStore.useSecureSettings && !unencrypted) {
				var exportedSecure = {
					salt: SyncClient.generateSalt()
				};

				var poppy = new Popover.window.Poppy(0.5, 0, Utilities.safariBuildVersion >= 603, 'encrypt-backup');

				poppy.exported = JSON.stringify(exported);
				poppy.exportedSecure = exportedSecure;
				poppy.resolve = resolve;
				poppy.reject = reject;

				poppy.setContent(Template.create('poppy.settings', 'encrypt-backup')).modal().show();

			} else
				resolve(JSON.stringify(exported));
		});
	},

	decryptImportedBackup: function (encryptedBackup) {
		return CustomPromise(function (resolve, reject) {
			var poppy = new Popover.window.Poppy(0.5, 0, Utilities.safariBuildVersion >= 603, 'decrypt-backup');

			poppy.backup = encryptedBackup;
			poppy.resolve = resolve;
			poppy.reject = reject;

			poppy.setContent(Template.create('poppy.settings', 'decrypt-backup')).modal().show();
		});
	},

	import: function (settings, clearExisting, semi, isUnlocked) {
		var syncClientIsLoggedIn = SyncClient.SRP.isLoggedIn(),
			willNotImport = ['donationVerified', 'trialStart', 'updateNotify', 'FilterListLastUpdate', 'installedBundle', 'openSettings', 'useSecureSettings'];

		UI.Locker
			.showLockerPrompt('importBackupSettings', !!semi || isUnlocked)
			.then(function (importedSettings) {
				var settings = SettingStore.import(importedSettings),
					backupIsEncrypted = settings.hasOwnProperty('encryptedBackup');

				if (!settings)
					return LogError(Error('failed to import settings'));

				var decryptSettings = backupIsEncrypted ? Settings.decryptImportedBackup(settings) : Promise.resolve(settings);

				decryptSettings.then(function (settings) {
					if (!semi)
						Settings.IMPORTING = true;

					if (backupIsEncrypted)
						SettingStore.useSecureSettings = true;

					var temporaryBackup = JSON.stringify(SettingStore.all()),
						useSecureSettings = SettingStore.useSecureSettings;

					if (clearExisting)
						SettingStore.clear();

					SettingStore.useSecureSettings = useSecureSettings;

					if (settings.settings && settings.rules && settings.simpleRules)
						try {
							Upgrade.importJSB4Backup(settings);
						} catch (error) {
							LogError('failed to import JSB4 backup', error);

							Settings.import(temporaryBackup, true);

							return;
						}
					else {
						var value;

						for (var setting in settings) {
							if (willNotImport._contains(setting))
								continue;

							value = settings[setting];

							if (setting._startsWith(Store.STORE_STRING) || (settings[setting] && settings[setting].STORE))
								try {
									SettingStore.setItem(setting, settings[setting], null, settings[setting].length >= Store.LOCAL_SAVE_SIZE);
								} catch (e) {
									LogError('failed to import store setting - ' + setting, e);
								}
							else {
								try {
									value = JSON.parse(value);
								} catch (e) { /* do nothing */ }

								try {
									if (Settings.isKnown(setting))
										SettingStore.setItem(setting, value);
								} catch (e) { /* do nothing */ }
							}
						}
					}

					setTimeout(function (settings, semi) {
						if (!settings._isEmpty())
							Settings.setItem('setupComplete', true);

						if (!semi) {
							Settings.setItem('trialStart', Date.now() - Extras.Trial.__length + TIME.ONE.DAY);
							Settings.setItem('showPopoverOnLoad', true);
							Settings.setItem('syncNeedsFullSettingsSync', syncClientIsLoggedIn);
							Settings.setItem('syncNeedsLogin', syncClientIsLoggedIn);

							Settings.restartRequired();

							if (!SettingStore.useSecureSettings)
								SecureSettings.clear();
							else {
								SecureSettings.removeItem('lockerPassword');
								SecureSettings.removeItem('syncEmail');
								SecureSettings.removeItem('syncSessionID');
								SecureSettings.removeItem('syncSharedKey');
								SecureSettings.removeItem('syncPasswordHash');
							}
						}

						SettingStore.syncNow();
					}, 1000, settings, semi);
				}, function (result) {
					if (result !== true)
						LogError('something terrible went wrong.');
				});
			}.bind(null, settings), Utilities.noop);
	},

	restartRequired: function () {
		if (Settings.RESTART_REQUIRED)
			return;

		Settings.RESTART_REQUIRED = true;
		
		SettingStore.lock(true);

		UI.view.switchTo('#main-views-page');

		UI.event.addCustomEventListener(['pageWillRender', 'viewWillSwitch', 'popoverOpened'], function (event) {
			event.preventDefault();

			UI.Page.showModalInfo(_('settings.safari_restart'));
		});

		UI.Page.showModalInfo(_('settings.safari_restart'));
	}
});

for (var section in Settings.settings)
	Settings.createMap(Settings.settings[section]);

Object._deepFreeze(Settings.map);

Settings.map.debugMode.props.onChange(null, null, Settings.getItem('debugMode'));

Settings.__stores = new Store('StoreSettings', {
	save: true
});

Settings.__stores.addCustomEventListener('reloaded', Settings.onStoreReload);

Locker.event.addCustomEventListener(['locked', 'unlocked'], Settings.onToggleLock);
