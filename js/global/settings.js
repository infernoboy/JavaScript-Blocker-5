"use strict";

var Settings = {
	__locked: false,

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

	ERROR: {
		NOT_FOUND: 'setting not found - {0}',
		STORE_KEY_NOT_FOUND: 'setting does not have storeKey - {0} - {1}',
		INVALID_TYPE: 'value for setting is invalid - {0} - {1} - {2}'
	},

	map: {},

	lock: function (lock, doNotSwitch) {
		Settings.__locked = lock;

		Settings.setItem('locked', lock, 'settings');

		if (!doNotSwitch) {
			if (lock)
				UI.view.switchTo('#main-views-page');
			else
				UI.view.switchTo('#main-views-setting');
		}
	},

	isLocked: function () {
		return !!Settings.__locked;
	},

	passwordIsSet: function () {
		return typeof SecureSettings.getItem('lockPassword') === 'string';
	},

	getPassword: function () {
		return SecureSettings.getItem('lockPassword');
	},

	setPassword: function (newPassword, previousPassword) {
		if (Settings.passwordIsSet()) {
			var currentPassword = Settings.getPassword();

			if (currentPassword !== previousPassword)
				return -2;
		}

		if (!newPassword.length)
			return -1;

		SecureSettings.setItem('lockPassword', newPassword);

		return 0;
	},

	onChange: function (event) {
		if (Settings.map[event.key] && typeof Settings.map[event.key].props.onChange === 'function')
			Settings.map[event.key].props.onChange(event.oldValue, event.newValue);
	},

	anySettingChanged: function (event) {
		if (Utilities.Page.isGlobal && window.globalSetting && event.key in window.globalSetting)
			setTimeout(function () {
				window.globalSetting[event.key] = Settings.getItem(event.key);
			});

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

	setItem: function (settingKey, value, storeKey, changeConfirmed) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		var type = setting.props.type,
				options = setting.props.options,
				otherOption = setting.props.otherOption,
				confirmChange = setting.props.confirm;

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

			var type = storeSetting.props.type || setting.props.type,
					options = storeSetting.props.options || setting.props.options,
					otherOption = storeSetting.props.otherOption || setting.props.otherOption,
					customValidate = setting.props.validate || storeSetting.props.validate,
					confirmChange = setting.props.confirm || storeSetting.props.confirm;

			if (customValidate && !customValidate.test(type, value, options, otherOption, storeSetting.props.extendOptions))
				return 'setting.' + customValidate.onFail;

			if (!this.__validate(type, value, options, otherOption, storeSetting.props.extendOptions))
				throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, storeKey, value]));

			this.__stores.getStore(settingKey).set(storeKey, value);

			if (setting.props.onChange)
				setting.props.onChange(value);

			if (storeSetting.props.onChange)
				storeSetting.props.onChange(value);

			Settings.anySettingChanged({
				key: settingKey
			});
		} else if (this.__validate(type, value, options, otherOption, setting.props.extendOptions)) {			
			if (confirmChange && !changeConfirmed) {
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
							Settings.setItem(settingKey, value, storeKey, true);

						return;
					}

					var poppy = new Popover.window.Poppy(0.5, 0, true);

					poppy.setContent(Template.create('poppy', 'confirm-setting-change', {
						string: _('setting.' + settingKey + '.confirm')
					}));

					poppy.modal().show();

					poppy.content
						.on('click', '#setting-confirm-cancel', function () {
							poppy.close();

							UI.Settings.repopulateActiveSection();
						})

						.on('click', '#setting-confirm-change', function () {
							poppy.close();

							Settings.setItem(settingKey, value, storeKey, true);
						});
					
					return false;
				}
			}

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

	createMap: function (settings) {
		var settingKey;

		for (var i = 0; i < settings.length; i++) {
			if (settings[i].settings)
				this.createMap(settings[i].settings);
			else {
				settingKey = settings[i].setting ? settings[i].setting : settings[i].store;

				if (settingKey) {
					if (settings[i].store) {
						if (!Settings.map[settingKey])
							Settings.map[settingKey] = {
								store: settingKey,
								storeKeySettings: {},
								props: settings[i].props
							};
						else
							LogError(['found store setting more than once', settingKey]);
					} else if (settings[i].props && settings[i].props.storeKey)
						Settings.map[settingKey].storeKeySettings[settings[i].props.storeKey] = settings[i];
					else if (!Settings.map[settingKey])
						Settings.map[settingKey] = settings[i];
				}
			}

			if (settings[i].props && settings[i].props.subSettings)
				this.createMap(settings[i].props.subSettings);
		}

		return Settings.map;
	},

	export: function (options) {
		var exported = SettingStore.all();

		if (!options.exportFirstVisit)
			delete exported['Storage-FirstVisit'];

		if (!options.exportRules) {
			delete exported['Storage-Rules'];
			delete exported['Storage-StoreSettings'].STORE.expander;
		}

		if (!options.exportSnapshots)
			delete exported['Storage-Snapshots'];

		if (!options.exportUserScripts)
			delete exported['Storage-UserScripts'];

		delete exported['FilterListLastUpdate'];
		delete exported['Storage-FilterRules'];
		delete exported['Storage-Predefined'];
		delete exported['Storage-ResourceCanLoad'];

		return JSON.stringify(exported);
	},

	import: function (settings) {
		var settings = SettingStore.import(settings);

		if (!settings)
			return LogError('failed to import settings');

		SettingStore.clear();

		for (var setting in settings)
			try {
				if (settings[setting] && settings[setting].STORE)
					SettingStore.setItem(setting, settings[setting]);
				else
					Settings.setItem(setting, settings[setting], null, true);
			} catch (e) {
				LogError('failed to import setting - ' + setting, e);
			}

		SettingStore.lock(true);

		UI.view.switchTo('#main-views-page');

		UI.event.addCustomEventListener(['pageWillRender', 'viewWillSwitch'], function (event) {
			event.preventDefault();

			UI.Page.showModalInfo(_('settings.safari_restart'));
		});

		SecureSettings.clear();
	}
};

Settings.__stores = new Store('StoreSettings', {
	save: true
});

if (Utilities.Page.isGlobal)
	Events.addSettingsListener(Settings.anySettingChanged);
