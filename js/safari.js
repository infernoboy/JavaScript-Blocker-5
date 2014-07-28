"use strict";

if (!window.safari || !window.safari.extension)
	throw new Error('JavaScript Blocker cannot run ' + (window === window.top ? 'on' : 'in a frame on' ) + ' this page because the required safari object is unavailable.');

var beforeLoad = { 
	currentTarget: null
};

var ToolbarItems = {
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
	showPopover: function () {
		safari.extension.toolbarItems.forEach(function (toolbarItem) {				
			if (toolbarItem.browserWindow && toolbarItem.browserWindow === BrowserWindows.active())
				toolbarItem.showPopover();
		});
	}
};

var Popover = {
	object: function () {
		return ToolbarItems.visible() ? safari.extension.toolbarItems[0].popover : false;
	},
	window: function () {
		return this.object().contentWindow;
	},
	hide: function () {
		var popover = this.object();

		if (popover)
			popover.hide();
	},
	visible: function () {
		var visible = false;

		safari.extension.toolbarItems.forEach(function (toolbarItem) {
			if (toolbarItem.popover && toolbarItem.popover.visible)
				visible = true;
		});

		return visible;
	}
};

var BrowserWindows = {
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

var Tabs = {
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
				callback.call(window, tab);
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
	create: function (url) {
		var activeWindow = BrowserWindows.active();

		var tab = activeWindow ? activeWindow.openTab() : BrowserWindows.open().activeTab;

		tab.url = url;

		tab.activate()

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

var GlobalPage = {
	tab: safari.self.tab,
	
	window: function () {
		try {
			return safari.extension.globalPage.contentWindow;
		} catch (e) {
			return null;
		}
	},
	message: function (message, data) {
		GlobalPage.tab.dispatchMessage(message, data);
	}
};

var SettingStore = {
	__cache: {},

	available:  !!(window.safari && safari.extension && safari.extension.settings),

	__setCache: function (key, value) {
		Utilities.setImmediateTimeout(function (self, key, value) {
			if (key._startsWith(Store.STORE_STRING) || value === undefined || typeof value === 'object')
				return;

			Object.defineProperty(self.__cache, key, {
				configurable: true,
				enumerable: true,

				value: value
			});
		}, [this, key, value]);
	},

	getItem: function (key, defaultValue, noCache) {
		if (key in this.__cache)
			return this.__cache[key];

		var value = safari.extension.settings.getItem(key);

		if (value === null)
			return defaultValue === undefined ? value : defaultValue;

		if (!noCache)
			this.__setCache(key, value);

		return value;
	},
	getJSON: function (key, defaultValue) {
		var value = this.getItem(key, undefined, true);

		if (value === null)
			return defaultValue === undefined ? value : defaultValue;

		if (typeof value !== 'string')
			return value;

		try {
			return JSON.parse(value);
		} catch (error) {
			return defaultValue;
		}
	},
	setItem: function (key, value, noCache) {
		if (!noCache)
			this.__setCache(key, value);

		safari.extension.settings.setItem(key, value);
	},
	setJSON: function (key, value) {
		safari.extension.settings.setItem(key, JSON.stringify(value));
	},
	removeItem: function (key) {
		delete this.__cache[key];

		safari.extension.settings.removeItem(key);
	},
	all: function () {
		return safari.extension.settings;	
	},
	clear: function () {
		this.__cache = {};

		safari.extension.settings.clear();
	}
};

var Events = {
	addApplicationListener: function (type, callback) {
		safari.application.addEventListener(type, callback, true);
	},
	addSettingsListener: function (callback) {
		safari.extension.settings.addEventListener('change', callback);
	},
	addTabListener: function (type, callback) {
		safari.self.addEventListener(type, callback, true);
	},
	setContextMenuEventUserInfo: function (event, data) {
		GlobalPage.tab.setContextMenuEventUserInfo(event, data);
	}
};

function MessageTarget (event, name, data) {
	if (event.target.page)
		event.target.page.dispatchMessage(name, data);
};

function PrivateBrowsing () {
	return (safari.application.privateBrowsing && safari.application.privateBrowsing.enabled);
};

function ExtensionURL (path) {
	return safari.extension.baseURI + (path || '');
};

function ResourceCanLoad (beforeLoad, data) {
	return GlobalPage.tab.canLoad(beforeLoad, data);
};

function GlobalCommand (command, data) {
	return GlobalPage.tab.canLoad(beforeLoad, {
		command: command,
		data: data
	});
};
