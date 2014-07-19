"use strict";

var globalSetting = {
	debugMode: true
};

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

	__validate: function (type, value, options, otherOption) {
		switch (type) {
			case 'boolean':
				return typeof value === 'boolean';
			break;

			case 'option':
			case 'option-radio':
				for (var i = 0; i < options.length; i++)
					if (options[i][0].toString() === value.toString())
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

			case 'dynamic-array':
				return ((typeof value === 'object' && (value.hasOwnProperty('enabled') && value.hasOwnProperty('value'))) && this.__validate(type.substr(8), value.value));
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

	onChange: function (event) {
		if (Settings.map[event.key] && typeof Settings.map[event.key].props.onChange === 'function')
			Settings.map[event.key].props.onChange(event.oldValue, event.newValue);
	},

	getItem: function (settingKey, storeKey) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		var value,
				defaultValue;

		if (setting.storeKeySettings) {
			var hasOwnDefaults = setting.props.default,
					defaultStorage = hasOwnDefaults ? setting.props.default : setting.storeKeySettings;

			if (!storeKey) {
				var storedValues = this.__stores.getStore(settingKey).all();

				for (var key in defaultStorage)
					if (!(key in storedValues)) {
						storeKey = (!hasOwnDefaults && defaultStorage[key].props.remap) ? defaultStorage[key].props.remap : key;

						storedValues[key] = storedValues[storeKey] || (hasOwnDefaults ? defaultStorage[storeKey] : defaultStorage[storeKey].props.default);

						if (typeof storedValues[key] === 'function')
							storedValues[key] = storedValues[key]();
					}

				return storedValues;
			}

			if (!setting.storeKeySettings[storeKey] && !setting.props.type._startsWith('dynamic'))
				throw new Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey]));

			storeKey = setting.storeKeySettings[storeKey].props.remap ? setting.storeKeySettings[storeKey].props.remap : storeKey;

			value = this.__stores.getStore(settingKey).get(storeKey);
			defaultValue = hasOwnDefaults ? defaultStorage[storeKey] : defaultStorage[storeKey].props.default;
		} else {
			value = this.__method('getItem', settingKey);
			defaultValue = setting.props.default;
		}

		if (typeof defaultValue === 'function')
			defaultValue = defaultValue();

		try {
			value = (value === null || value === undefined) ? defaultValue : value;

			if (typeof defaultValue === 'object' && typeof value !== 'object')
				value = JSON.parse(value);
		} catch (error) {
			LogError(error, setting);
			throw new Error('no default value for ' + settingKey);
		}

		return value;
	},

	setItem: function (settingKey, value, storeKey) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		var type = setting.props.type,
				options = setting.props.options;

		if (setting.storeKeySettings) {
			var storeSetting = setting.storeKeySettings[storeKey];

			if (storeSetting.props.remap) {
				storeKey = storeSetting.props.remap;

				storeSetting = setting.storeKeySettings[storeKey];
			}

			if (!storeSetting) {
				if (setting.props.type._startsWith('dynamic'))
					storeSetting = {
						props: {}
					};
				else
					throw new Error(Settings.ERROR.STORE_KEY_NOT_FOUND._format([settingKey, storeKey]));
			}

			var type = storeSetting.props.type || setting.props.type,
					options = storeSetting.props.options || setting.props.options;

			if (!this.__validate(type, value, options, storeSetting.props.otherOption))
				throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, storeKey, value]));

			this.__stores.getStore(settingKey).set(storeKey, value);

			if (setting.props.onChange)
				setting.props.onChange(value);

			if (storeSetting.props.onChange)
				storeSetting.props.onChange(value);
		} else if (this.__validate(type, value, options, setting.props.otherOption))
			this.__method('setItem', settingKey, value);
		else
			throw new TypeError(Settings.ERROR.INVALID_TYPE._format([settingKey, '', value]));
	},

	removeItem: function (settingKey, storeKey) {
		var setting = Settings.map[settingKey];

		if (!setting)
			throw new Error(Settings.ERROR.NOT_FOUND._format([settingKey]));

		if (setting.storeKeySettings) {
			if (storeKey) {
				if (setting.storeKeySettings[storeKey]) {
					storeKey = setting.storeKeySettings[storeKey].props.remap || storeKey;

					this.__stores.getStore(settingKey).remove(storeKey);
				}
			} else
				this.__stores.getStore(settingKey).clear();
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
	}
};

Settings.__stores = new Store('StoreSettings', {
	save: true
});
