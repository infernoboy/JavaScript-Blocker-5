/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var Settings = {
	__method: function (method, setting, value) {
		if (SettingStore.available)
			return SettingStore[method](setting, value);
		else
			return GlobalCommand('settingStore.' + method, {
				setting: setting,
				value: value
			});
	},

	__validate: function (type, value, options, otherOption, extendOptions) {
		if (typeof type !== 'string')
			throw new Error('missing setting type');

		if (type._startsWith('dynamic'))
			return ((typeof value === 'object' && (value.hasOwnProperty('enabled') && value.hasOwnProperty('value'))) && this.__validate(type.substr(8), value.value));

		if (type._startsWith('many'))
			return this.__validate(type.substr(5), value);

		switch (type) {
			case 'boolean':
				return typeof value === 'boolean';
			break;

			case 'option':
			case 'option-radio':
				var allOptions = extendOptions ? extendOptions.concat(options) : options;

				for (var i = 0; i < allOptions.length; i++)
					if (allOptions[i][0].toString() === value.toString())
						return true;

				if (otherOption)
					return otherOption.validate ? otherOption.validate(value) : true;

				return false;
			break;

			case 'string':
				return typeof value === 'string';
			break;

			case 'number':
				return typeof value === 'number';
			break;

			case 'range':
				return (isNaN(value) || value % 1 !== 0) ? false : (value >= options[0] && value <= options[1]);
			break;

			case 'array':
				return Array.isArray(value);
			break;

			case 'mixed':
				return true;
			break;

			default:
				throw new Error('failed to validate type - ' + type);
			break;
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

	onToggleLock: function (event, doNotSwitch) {
		if (event.detail.key === 'settings') {
			if (event.detail.locked)
				UI.view.switchTo('#main-views-page');
			else
				UI.view.switchTo('#main-views-setting');
		}
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

		if (!event.key || !event.key._startsWith('Storage-') || event.key === 'Storage-StoreSettings')
			if (window.UI && UI.Settings && UI.Settings.view && UI.Settings.view.is('.active-view'))
				UI.Settings.repopulateActiveSection();
	},

	all: function () {
		var all = {};

		for (var setting in Settings.map)
			all[setting] = Settings.getItem(setting);

		return all;
	},

	getItem: function (settingKey, storeKey) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

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
						storeKeys = Object.keys(defaultStorage).concat(this.__stores.getStore(settingKey).keys());

				for (var i = storeKeys.length; i--;)
					storedValues[storeKeys[i]] = Settings.getItem(settingKey, storeKeys[i]);

				return storedValues;
			}

			if (!setting.storeKeySettings[storeKey] && !setting.props.type._startsWith('dynamic') && !setting.props.type._startsWith('many'))
				throw new Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey]));

			storeKey = (setting.storeKeySettings[storeKey] && setting.storeKeySettings[storeKey].props.remap) ? setting.storeKeySettings[storeKey].props.remap : storeKey;

			value = this.__stores.getStore(settingKey).get(storeKey);

			defaultValue = hasOwnDefaults ? defaultStorage[storeKey] : defaultStorage[storeKey].props.default;

			isExtra = setting.storeKeySettings[storeKey] ? setting.storeKeySettings[storeKey].props.isExtra : false;
		} else {
			value = this.__method('getItem', settingKey);

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
			LogError(error, setting);

			throw new Error('no default value for ' + settingKey);
		}

		return value;
	},

	confirmSettingSet: function (confirmChange, settingKey, value, storeKey, unlocked) {
		var shouldConfirm = false;

		if (confirmChange.when)
			shouldConfirm = Utilities.Group.eval(confirmChange.when, Settings.all());
		else if (confirmChange.toValues)
			shouldConfirm = confirmChange.toValues._contains(value);

		if (shouldConfirm) {
			if (confirmChange.prompt) {
				var confirmed = confirmChange.prompt();

				if (!confirmed)
					UI.Settings.repopulateActiveSection();
				else
					Settings.setItem(settingKey, value, storeKey, true, unlocked);

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
			Settings.setItem(settingKey, value, storeKey, true, unlocked);
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

	setItem: function (settingKey, value, storeKey, changeConfirmed, unlocked) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		var type = setting.props.type,
				options = setting.props.options,
				otherOption = setting.props.otherOption,
				confirmChange = setting.props.confirm,
				locked = setting.props.locked;

		if (setting.storeKeySettings) {
			var storeSetting = setting.storeKeySettings[storeKey];

			if (storeSetting && storeSetting.props.remap) {
				storeKey = storeSetting.props.remap;

				storeSetting = setting.storeKeySettings[storeKey];
			}

			if (!storeSetting) {
				if (setting.props.type._startsWith('dynamic') || setting.props.type._startsWith('many'))
					storeSetting = {
						props: {}
					};
				else
					throw new Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey]));
			}

			var type = type || storeSetting.props.type,
					options = options || storeSetting.props.options,
					otherOption = otherOption || storeSetting.props.otherOption,
					customValidate = setting.props.validate || storeSetting.props.validate,
					confirmChange = confirmChange || storeSetting.props.confirm,
					locked = locked || storeSetting.props.locked;

			if (locked && !unlocked)
				return Settings.unlockSettingSet(settingKey, value, storeKey);

			if (customValidate && !customValidate.test(type, value, options, otherOption, storeSetting.props.extendOptions))
				return 'setting.' + customValidate.onFail;

			if (!this.__validate(type, value, options, otherOption, storeSetting.props.extendOptions))
				throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, storeKey, value]));

			if (confirmChange && !changeConfirmed)
				return Settings.confirmSettingSet(confirmChange, settingKey, value, storeKey, unlocked);

			this.__stores.getStore(settingKey).set(storeKey, value);

			if (setting.props.onChange)
				setting.props.onChange(value);

			if (storeSetting.props.onChange)
				storeSetting.props.onChange(value);

			Settings.anySettingChanged({
				key: settingKey
			});
		} else if (this.__validate(type, value, options, otherOption, setting.props.extendOptions)) {			
			if (locked && !unlocked)
				return Settings.unlockSettingSet(settingKey, value, storeKey);

			if (confirmChange && !changeConfirmed)
				return Settings.confirmSettingSet(confirmChange, settingKey, value, storeKey, unlocked);

			this.__method('setItem', settingKey, value);

			if (setting.props.onChange)
				setting.props.onChange(value);
		} else
			throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, '', value]));

		return true;
	},

	removeItem: function (settingKey, storeKey) {
		var setting = Settings.map[settingKey],
				storeSetting = setting.storeKeySettings ? setting.storeKeySettings[storeKey] : null;

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		if (setting.storeKeySettings || setting.store) {
			if (storeKey) {
				if (setting.storeKeySettings[storeKey])
					storeKey = setting.storeKeySettings[storeKey].props.remap || storeKey;

				this.__stores.getStore(settingKey).remove(storeKey);
			} else
				this.__stores.getStore(settingKey).clear();

			if (setting.props.onChange)
				setting.props.onChange();

			if (storeSetting && storeSetting.props.onChange)
				storeSetting.props.onChange();

			Settings.anySettingChanged({
				key: settingKey
			});
		} else
			this.__method('removeItem', settingKey);
	},

	createMap: function (settings, when) {
		var settingKey;

		for (var i = 0; i < settings.length; i++) {
			if (settings[i].settings)
				this.createMap(settings[i].settings, settings[i].when);
			else {
				settingKey = settings[i].setting ? settings[i].setting : settings[i].store;

				if (settingKey) {
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
							LogError(['found store setting more than once', settingKey]);
					} else if (settings[i].props && settings[i].props.storeKey)
						Settings.map[settingKey].storeKeySettings[settings[i].props.storeKey] = settings[i];
					else if (!Settings.map[settingKey]){
						if (when)
							settings[i].props.when = when;

						Settings.map[settingKey] = settings[i];
					}
				}
			}

			if (settings[i].props && settings[i].props.subSettings)
				this.createMap(settings[i].props.subSettings, settings[i].when);
		}

		return Settings.map;
	},

	export: function (options) {
		var allSettings = SettingStore.all(),
				exported = {};

		if (options.exportSettings)
			exported = SettingStore.all();

		if (!options.exportFirstVisit)
			delete exported['Storage-FirstVisit'];
		else if (!options.exportSettings)
			exported['Storage-FirstVisit'] = allSettings['Storage-FirstVisit'];

		if (!options.exportRules)
			delete exported['Storage-Rules'];
		else if (!options.exportSettings)
			exported['Storage-Rules'] = allSettings['Storage-Rules'];

		if (!options.exportSnapshots)
			delete exported['Storage-Snapshots'];
		else if (!options.exportSettings)
			exported['Storage-Snapshots'] = allSettings['Storage-Snapshots'];

		if (!options.exportUserScripts)
			delete exported['Storage-UserScripts'];
		else if (!options.exportSettings)
			exported['Storage-UserScripts'] = allSettings['Storage-UserScripts'];

		delete exported['FilterListLastUpdate'];
		delete exported['Storage-FilterRules'];
		delete exported['Storage-Predefined'];
		delete exported['Storage-ResourceCanLoad'];
		delete exported['donationVerified'];
		delete exported['trialStart'];
		delete exported['updateNotify'];
		delete exported['installedBundle'];

		return JSON.stringify(exported);
	},

	import: function (settings, clearExisting) {
		var willNotImport = ['donationVerified', 'trialStart', 'updateNotify', 'FilterListLastUpdate', 'installedBundle'];

		UI.Locker
			.showLockerPrompt('importBackupSettings')
			.then(function (importedSettings) {
				var settings = SettingStore.import(importedSettings);

				if (!settings)
					return LogError('failed to import settings');

				Settings.IMPORTING = true;

				var temporaryBackup = JSON.stringify(SettingStore.all());

				if (clearExisting) {
					SettingStore.clear();

					Settings.setItem('trialStart', Date.now() - Extras.Trial.__length + TIME.ONE.DAY);
				}

				if (settings.settings && settings.rules && settings.simpleRules)
					try {
						Upgrade.importJSB4Backup(settings);
					} catch (error) {
						LogError('failed to import JSB4 backup', error);

						Settings.import(temporaryBackup, true);

						return;
					}
				else {
					for (var setting in settings) {
						if (willNotImport._contains(setting))
							continue;

						try {
							if (setting._startsWith('Storage-') || (settings[setting] && settings[setting].STORE))
								SettingStore.setItem(setting, settings[setting]);
							else
								Settings.setItem(setting, settings[setting], null, true, true);
						} catch (e) {
							LogError('failed to import setting - ' + setting, e);
						}
					}
				}

				Settings.setItem('showPopoverOnLoad', true);

				setTimeout(function (settings) {
					if (!settings._isEmpty())
						Settings.setItem('setupComplete', true);

					SettingStore.lock(true);

					UI.view.switchTo('#main-views-page');

					UI.event.addCustomEventListener(['pageWillRender', 'viewWillSwitch', 'popoverOpened'], function (event) {
						event.preventDefault();

						UI.Page.showModalInfo(_('settings.safari_restart'));
					});

					SecureSettings.clear();
				}, 1000, settings);
			}.bind(null, settings));
	}
};

Settings.__stores = new Store('StoreSettings', {
	save: true
});

if (Utilities.Page.isGlobal)
	Events.addSettingsListener(Settings.anySettingChanged);

Locker.event.addCustomEventListener(['locked', 'unlocked'], Settings.onToggleLock);
