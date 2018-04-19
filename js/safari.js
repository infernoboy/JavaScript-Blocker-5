/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

if (!window.safari || !window.safari.extension)
	throw new Error('JS Blocker cannot run ' + (window === window.top ? 'on' : 'in a frame on' ) + ' this page because the required safari object is unavailable.');

var beforeLoad = { 
	currentTarget: null
};

window.Version = {
	display: safari.extension.displayVersion,
	bundle: parseFloat(safari.extension.bundleVersion)
};

try {
	window.BrowserTab = SafariBrowserTab;
	window.BrowserWindow = SafariBrowserWindow;
} catch (e) {
	window.BrowserTab = window.BrowserWindow = null;
}

window.ToolbarItems = {
	badge: function (number, tab) {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {		
			if (toolbarItem.browserWindow && (tab === null || tab === toolbarItem.browserWindow.activeTab))
				toolbarItem.badge = number;
		});

		return this;
	},

	image: function (path) {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {
			toolbarItem.image = ExtensionURL(path);
		});

		return this;
	},

	visible: function () {
		return safari.extension.toolbarItems && safari.extension.toolbarItems.length > 0;
	},

	disabled: function (state, tab) {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {
			if (!tab || tab === toolbarItem.browserWindow.activeTab)
				toolbarItem.disabled = state;
		});

		return this;
	},

	getPopover: function () {
		var popover = null;

		safari.extension.toolbarItems.forEach(function (toolbarItem) {
			popover = toolbarItem.popover;
		});

		return popover;
	},

	setPopover: function () {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {
			toolbarItem.popover = Popover.popover;
		});
	},

	showPopover: function () {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {				
			if (toolbarItem.browserWindow && toolbarItem.browserWindow === BrowserWindows.active())
				toolbarItem.showPopover();
		});
	}
};

window.Popover = {
	popover: (function () {
		return safari.extension.popovers ? safari.extension.popovers[0] : {};
	})(),

	get window() {
		return Popover.popover.contentWindow || {};
	},

	hide: function () {
		if (this.popover)
			this.popover.hide();
	},

	visible: function () {
		return this.popover && this.popover.visible;
	}
};

window.BrowserWindows = {
	all: function () {
		return safari.application.browserWindows;
	},
	active: function () {
		return safari.application.activeBrowserWindow;
	},
	open: function () {
		return safari.application.openBrowserWindow();
	}
};

window.Tabs = {
	array: function () {
		var currentTabs = [];

		Tabs.all(function (tab) {
			currentTabs.push(tab);
		});

		return currentTabs;
	},
	all: function (callback) {
		BrowserWindows.all().forEach(function (browserWindow) {
			browserWindow.tabs.forEach(function (tab) {
				callback.call(window, tab, browserWindow);
			});
		});
	},
	active: function (callback) {
		var activeWindow = BrowserWindows.active();

		if (callback)
			callback.call(this, activeWindow ? activeWindow.activeTab : null);
		else
			return activeWindow ? activeWindow.activeTab : null;
	},
	create: function (url, autoClose) {
		var activeWindow = BrowserWindows.active(),
			activeTabIndex = Tabs.array().indexOf(Tabs.active());

		var tab = activeWindow ? activeWindow.openTab() : BrowserWindows.open().activeTab;

		tab.url = url;

		tab.activate();

		if (autoClose)
			setTimeout(function (activeTabIndex, newTab) {
				newTab.close();

				var tabs = Tabs.array();

				if (tabs[activeTabIndex])
					tabs[activeTabIndex].activate();
			}, 1000, activeTabIndex, tab);

		return tab;
	},
	messageActive: function (message, data) {
		this.active(function (tab) {
			if (tab && tab.page)
				tab.page.dispatchMessage(message, JSON.stringify(data));
		});
	},
	messageAll: function (message, data) {
		this.all(function (tab) {
			MessageTarget({
				target: tab
			}, message, data);
		});
	}
};

window.GlobalPage = {
	tab: safari.self.tab,
	
	get window () {
		try {
			return safari.extension.globalPage.contentWindow;
		} catch (e) {
			return null;
		}
	},

	message: function (message, data) {
		try {
			GlobalPage.tab.dispatchMessage(message, data);
		} catch (e) {
			Log(message, e, data);
		}
	}
};

window.SettingStore = {
	__syncTimeout: {},
	__locked: false,
	__cache: {},
	__badKeys: ['setItem', 'getItem', 'removeItem', 'clear', 'addEventListener', 'removeEventListener'],
	__localKeys: [],
	__doNotSync: ['syncQueue'],

	available: !!(window.safari && safari.extension && safari.extension.settings),

	_useSecureSettings: (window.safari && safari.extension && safari.extension.settings && safari.extension.settings.getItem('useSecureSettings')),

	get useSecureSettings() {
		return SettingStore._useSecureSettings;
	},

	set useSecureSettings(value) {
		SettingStore._useSecureSettings = value;

		safari.extension.settings.setItem('useSecureSettings', value);
		safari.extension.secureSettings.setItem('useSecureSettings', value);
	},

	__setCache: function (key, value) {
		if (key._startsWith(Store.STORE_STRING) || value === undefined || typeof value === 'object')
			return;

		Object.defineProperty(this.__cache, key, {
			configurable: true,
			enumerable: true,

			value: value
		});
	},

	sync: function (key, value) {
		SettingStore.syncCancel(key); 

		SettingStore.__syncTimeout[key] = {
			fn: (function (key, value) {
				delete SettingStore.__syncTimeout[key];

				if (SettingStore.__doNotSync._contains(key))
					return safari.extension.settings.removeItem(key);

				if (SettingStore.useSecureSettings)
					safari.extension.secureSettings.setItem(key, value);
				else
					safari.extension.settings.setItem(key, value);
			}).bind(this, key, value)
		};

		var syncDelay = 3000 + (1000 * Object.keys(SettingStore.__syncTimeout).length);

		SettingStore.__syncTimeout[key].timeout = setTimeout(SettingStore.__syncTimeout[key].fn, syncDelay);
	},

	syncNow: function () {
		for (var key in SettingStore.__syncTimeout) {
			clearTimeout(SettingStore.__syncTimeout[key].timeout);

			SettingStore.__syncTimeout[key].fn();			
		}

		SettingStore.__syncTimeout = {};
	},

	syncCancel: function (key) {
		if (SettingStore.__syncTimeout[key]) {
			clearTimeout(SettingStore.__syncTimeout[key].timeout);

			delete SettingStore.__syncTimeout[key];
		}
	},

	lock: function (lock) {
		this.__locked = lock;
	},

	isSet: function (key) {
		if (SettingStore.useSecureSettings)
			return safari.extension.secureSettings.hasOwnProperty(key);

		return localStorage.hasOwnProperty(key) || safari.extension.settings.hasOwnProperty(key);
	},

	getItem: function (key, defaultValue, noCache) {
		if (key in this.__cache)
			return this.__cache[key];

		var localValue = SettingStore.useSecureSettings ? undefined : localStorage.getItem(key),
			value = (typeof localValue === 'string') ? JSON.parse(localValue) : (SettingStore.useSecureSettings ? safari.extension.secureSettings.getItem(key) : safari.extension.settings.getItem(key));

		if (value === null)
			return defaultValue === undefined ? value : defaultValue;

		if (!noCache)
			this.__setCache(key, value);

		try {
			return JSON.parse(value);
		} catch (e) {
			return value;
		}
	},

	setItem: function (key, value, noCache, persist) {
		if (this.__locked)
			return;

		if (SettingStore.__badKeys._contains(key))
			throw new Error(key + ' cannot be used as a setting key.');

		if (SettingStore.useSecureSettings)
			persist = true;

		SettingStore.syncCancel(key);

		delete this.__cache[key];
		
		if (!noCache)
			this.__setCache(key, value);

		if (persist) {
			localStorage.removeItem(key);

			if (SettingStore.useSecureSettings)
				safari.extension.secureSettings.setItem(key, value);
			else
				safari.extension.settings.setItem(key, value);
		} else {
			localStorage.setItem(key, JSON.stringify(value));

			SettingStore.sync(key, value);
		}
	},

	removeItem: function (key) {
		if (this.__locked)
			return LogError('Locked, cannot remove', key);

		SettingStore.syncCancel(key);
		
		delete this.__cache[key];

		if (SettingStore.useSecureSettings)
			safari.extension.secureSettings.removeItem(key);
		else
			safari.extension.settings.removeItem(key);

		localStorage.removeItem(key);
	},

	all: function () {
		SettingStore.syncNow();

		var all = {};

		if (!SettingStore.useSecureSettings)
			for (var key in localStorage)
				if (localStorage.hasOwnProperty(key))
					all[key] = JSON.parse(localStorage[key]);

		var settings = SettingStore.useSecureSettings ? safari.extension.secureSettings : safari.extension.settings;

		for (key in settings)
			if (settings.hasOwnProperty(key))
				all[key] = settings[key];
			
		return all;
	},

	export: function () {
		return JSON.stringify(SettingStore.all());
	},

	import: function (settings) {
		try {
			settings = Object._isPlainObject(settings) ? settings : JSON.parse(settings);
		} catch (e) {
			LogError(e);
			
			return false;
		}

		return settings;
	},

	clear: function () {
		this.__cache = {};

		var useSecureSettings = Boolean(SettingStore.useSecureSettings);

		safari.extension.settings.clear();
		safari.extension.secureSettings.clear();
		localStorage.clear();

		SettingStore.useSecureSettings = useSecureSettings;
	}
};

SettingStore.migrateToSecure = function (clear, useSecureSettings) {
	var allSettings = SettingStore.all();

	for (var key in allSettings)
		safari.extension.secureSettings.setItem(key, allSettings[key]);

	if (clear) {
		safari.extension.settings.clear();
		localStorage.clear();

		SettingStore.useSecureSettings = useSecureSettings;
	}
};

window.SecureSettings = {
	getItem: function (key, defaultValue) {
		var value = safari.extension.secureSettings.getItem(key);

		if (value === null)
			return defaultValue === undefined ? value : defaultValue;

		return value;
	},

	setItem: function (key, value) {
		if (SettingStore.__badKeys._contains(key))
			throw new Error(key + ' cannot be used as a setting key.');

		safari.extension.secureSettings.setItem(key, value);
	},

	removeItem: function (key) {
		safari.extension.secureSettings.removeItem(key);
	},

	clear: function () {
		var useSecureSettings = Boolean(SettingStore.useSecureSettings);

		safari.extension.secureSettings.clear();

		SettingStore.useSecureSettings = useSecureSettings;
	}
};

SecureSettings.migrateToPlain = function (clear, useSecureSettings) {
	var allSettings = {};

	for (var key in safari.extension.secureSettings)
		if (safari.extension.secureSettings.hasOwnProperty(key))
			allSettings[key] = safari.extension.secureSettings[key];

	Settings.import(allSettings, true, false, true);

	SettingStore.useSecureSettings = useSecureSettings;
};

window.Events = {
	__references: {
		application: {},
		settings: {},
		tab: {}
	},

	__addReference: function () {
		return;
	},

	__unbindAll: function () {
		var which,
			base,
			type,
			i;

		for (which in Events.__references) {
			switch (which) {
				case 'application':
					base = safari.application;
					break;

				case 'settings':
					base = safari.extension.settings;
					break;

				case 'tab':
					base = safari.self;
					break;
			}

			for (type in Events.__references[which])
				for (i = Events.__references[which][type].length; i--;)
					base.removeEventListener(type, Events.__references[which][type][i]);

			Events.__references[which] = {};
		}
	},

	addApplicationListener: function (type, callback) {
		Events.__addReference('application', type, callback);

		safari.application.addEventListener(type, callback, true);
	},

	addSettingsListener: function (callback) {
		Events.__addReference('settings', 'change', callback);

		safari.extension.settings.addEventListener('change', callback);
	},

	addTabListener: function (type, callback) {
		Events.__addReference('tab', type, callback);

		safari.self.addEventListener(type, callback, true);
	},

	setContextMenuEventUserInfo: function (event, data) {
		GlobalPage.tab.setContextMenuEventUserInfo(event, data);
	}
};

window.MessageTarget = function (event, name, data) {
	if (event.target.page)
		event.target.page.dispatchMessage(name, data);
};

window.PrivateBrowsing = function () {
	return (safari.application.privateBrowsing && safari.application.privateBrowsing.enabled);
};

window.ExtensionURL = function (path) {
	return safari.extension.baseURI + (path || '');
};

window.ResourceCanLoad = function (beforeLoad, data) {
	return GlobalPage.tab.canLoad(beforeLoad, data);
};

window.GlobalCommand = function (command, data) {
	return GlobalPage.tab.canLoad(beforeLoad, {
		command: command,
		data: data
	});
};

window.RemoveContentScripts = function () {
	safari.extension.removeContentScripts();
};

window.AddContentScriptFromURL = function (url) {
	safari.extension.addContentScriptFromURL(ExtensionURL(url));
};

(function () {
	var SetPopoverToToolbarItem = function (event) {
		if (event.target instanceof SafariBrowserWindow)
			ToolbarItems.setPopover();
	};

	if (window.GlobalPage && GlobalPage.window === window) {
		ToolbarItems.setPopover();

		Events.addApplicationListener('open', SetPopoverToToolbarItem, true);
	} else
		if (GlobalPage.window)
			Popover.popover = GlobalPage.window.Popover.popover;

	setTimeout(function () {
		if (!Utilities.Page.isGlobal)
			return;

		Utilities.Timer.interval('tabMonitor', function () {
			var allWindows = BrowserWindows.all();

			for (var i = allWindows.length; i--;)
				SetPopoverToToolbarItem({
					target: allWindows[i]
				});
		}, 10000);
	}, 2000);
})();
