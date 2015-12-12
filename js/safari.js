/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

if (!window.safari || !window.safari.extension)
	throw new Error('JS Blocker cannot run ' + (window === window.top ? 'on' : 'in a frame on' ) + ' this page because the required safari object is unavailable.');

var beforeLoad = { 
	currentTarget: null
};

var Version = {
	display: safari.extension.displayVersion,
	bundle: parseFloat(safari.extension.bundleVersion)
};

try {
	var BrowserTab = SafariBrowserTab,
			BrowserWindow = SafariBrowserWindow;
} catch (e) {
	var BrowserTab = BrowserWindow = null;
}

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

var Popover = {
	popover: null,

	create: function (id, file, width, height) {
		this.remove({
			identifier: id
		});

		this.popover = safari.extension.createPopover(id, file, width, height);

		return this.popover;
	},

	remove: function (popover) {
		this.hide();

		popover = popover || this.popover;

		if (popover && popover.identifier)
			safari.extension.removePopover(popover.identifier);

		this.popover = null;
	},

	get window () {
		return this.popover ? this.popover.contentWindow : window;
	},

	hide: function () {
		if (this.popover)
			this.popover.hide();
	},

	visible: function () {
		return this.popover && this.popover.visible;
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

var GlobalPage = {
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

var SettingStore = {
	__syncTimeout: {},
	__locked: false,
	__cache: {},
	__badKeys: ['setItem', 'getItem', 'removeItem', 'clear', 'addEventListener', 'removeEventListener'],
	__localKeys: [],

	available: !!(window.safari && safari.extension && safari.extension.settings),

	__setCache: function (key, value) {
		if (key._startsWith(Store.STORE_STRING) || value === undefined || typeof value === 'object')
			return;

		Object.defineProperty(this.__cache, key, {
			configurable: true,
			enumerable: true,

			value: value
		});
	},

	lock: function (lock) {
		this.__locked = lock;
	},

	getItem: function (key, defaultValue, noCache) {
		if (key in this.__cache)
			return this.__cache[key];

		var localValue = localStorage.getItem(key),
				value = (typeof localValue === 'string') ? JSON.parse(localValue) : safari.extension.settings.getItem(key);

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

		delete this.__cache[key];
		
		if (!noCache)
			this.__setCache(key, value);

		if (persist) {
			localStorage.removeItem(key);
			safari.extension.settings.setItem(key, value);
		} else {
			localStorage.setItem(key, JSON.stringify(value));

			clearTimeout(SettingStore.__syncTimeout[key]);

			SettingStore.__syncTimeout[key] = setTimeout(function (key, value) {
				delete SettingStore.__syncTimeout[key];

				safari.extension.settings.setItem(key, value);
			}, 3000, key, value);
		}
	},

	removeItem: function (key) {
		if (this.__locked)
			return;
		
		delete this.__cache[key];

		safari.extension.settings.removeItem(key);
		localStorage.removeItem(key);
	},

	all: function () {
		return safari.extension.settings;
	},

	export: function () {
		return JSON.stringify(safari.extension.settings);
	},

	import: function (settings) {
		try {
			var settings = Object._isPlainObject(settings) ? settings : JSON.parse(settings);
		} catch (e) {
			LogError(e);
			
			return false;
		}

		return settings;
	},

	clear: function () {
		this.__cache = {};

		safari.extension.settings.clear();
		localStorage.clear();
	}
};

var SecureSettings = {
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
		safari.extension.secureSettings.clear();
	}
};

var ContentBlocker = {
	set: function (contentBlocker) {
		if (ContentBlocker.isSupported)
			safari.extension.setContentBlocker(contentBlocker);
	},

	isSupported: typeof safari.extension.setContentBlocker === 'function'
};

var Events = {
	__references: {
		application: {},
		settings: {},
		tab: {}
	},

	__addReference: function (kind, type, callback) {
		return;
		
		var ref = Events.__references[kind];

		if (!ref[type])
			ref[type] = [];

		ref[type].push(callback);
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

function RemoveContentScripts () {
	safari.extension.removeContentScripts();
};

function AddContentScriptFromURL (url) {
	safari.extension.addContentScriptFromURL(ExtensionURL(url));
};


(function () {
	var SetPopoverToToolbarItem = function (event) {
		if (event.target instanceof SafariBrowserWindow)
			ToolbarItems.setPopover();
	};

	if (window.GlobalPage && GlobalPage.window === window) {
		Popover.create('manager', ExtensionURL('popover.html'), 480, 250);

		ToolbarItems.setPopover();

		Events.addApplicationListener('open', SetPopoverToToolbarItem, true);
	} else {
		var globalPage = GlobalPage.window;

		if (globalPage)
			Popover.popover = globalPage.Popover.popover;
	}

	setTimeout(function () {
		if (!Utilities.Page.isGlobal)
			return;

		Utilities.Timer.interval('tabMonitor', function (tabMonitor) {
			var allWindows = BrowserWindows.all();

			for (var i = allWindows.length; i--;)
				SetPopoverToToolbarItem({
					target: allWindows[i]
				});
		}, 3000);
	}, 2000);
})();


if (!!GlobalPage.tab && window.location.href.indexOf(ExtensionURL()) === -1) {
	try {
		GlobalCommand('contentBlockerMode');
	} catch (e) {
		throw new Error('content blocker mode.');
	}
}
