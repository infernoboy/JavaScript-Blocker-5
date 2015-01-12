"use strict";

function Command (command, data, event) {
	function InternalCommand () {
		var part;

		var commands = this.commands,
				commandParts = command.split(/\./g);	

		if (commandParts.length > 1) {
			while (true) {
				if (commands.hasOwnProperty((part = commandParts.shift())))
					commands = commands[part];

				if (!(commands instanceof Object))
					throw new Error('command path not found - ' + command);

				if (commandParts.length === 1)
					break;
			}
		}

		if (!commands.hasOwnProperty(commandParts[0]))
			throw new Error('command not found - ' + command);

		if (command._startsWith('__'))
			throw new Error('cannot call commands that begin with __');

		this.event = event;

		this.isEvent = !!(event.name && event.message);

		this.commands = commands;

		commands[commandParts[0]].apply(this, Array.isArray(data) ? data : [data]);
	};

	Object.defineProperty(InternalCommand.prototype, 'message', {
		get: function () {
			if (this.isEvent)
				return this.event.message;

			return this.__message;
		},
		set: function (message) {			
			if (this.isEvent)
				this.event.message = message;
			else if (typeof this.event === 'function')
				this.event(message);
			else
				this.__message = message;
		}
	});

	InternalCommand.prototype.sendCallback = function (sourceID, callbackID, result) {		
		MessageTarget(this.event, 'executeCommanderCallback', {
			sourceID: sourceID,
			callbackID: callbackID,
			result: result
		});
	},

	InternalCommand.prototype.commands = {
		logError: function (error) {
			if (typeof error.message === 'string') {
				if (this.event.target.url !== error.source)
					console.group(error.source + ' - via - ' + this.event.target.url);
				else
					console.group(this.event.target.url);

				LogError(error.message);

				console.groupEnd();
			}
		},

		logDebug: function (message) {
			if (globalSetting.debugMode && typeof message.message === 'string') {
				if (this.event.target.url !== message.source)
					console.group(message.source + ' - via - ' + this.event.target.url);
				else
					console.group(this.event.target.url);

				LogDebug(message.message);

				console.groupEnd();
			}
		},

		bounce: function (detail) {
			MessageTarget(this.event, detail.command, detail.detail);

			this.message = true;
		},

		localize: function (detail) {
			this.message = _(detail.string, detail.args);
		},

		ping: function () {
			this.message = 'pong';
		},

		confirm: function (string) {
			this.message = confirm(string);
		},

		showPopover: function () {
			ToolbarItems.showPopover();
		},

		activeTabIndex: function () {
			var activeTab = Tabs.active(),
					tabs = Tabs.array();

			for (var i = 0; i < tabs.length; i++)
				if (tabs[i] === activeTab)
					this.message = i;
		},

		openTabWithURL: function (url) {
			var tab = Tabs.create(url),
					tabs = Tabs.array();

			for (var i = 0; i < tabs.length; i++)
				if (tabs[i] === tab)
					this.message = i;
		},

		closeTabAtIndex: function (index) {
			var tabs = Tabs.array();

			if (tabs[index])
				tabs[index].close();
		},

		activateTabAtIndex: function (index) {
			var tabs = Tabs.array();

			if (tabs[index]) 
				tabs[index].activate();
		},

		canLoadResource: function (info) {
			if (false && info.kind !== 'disable') {
				MessageTarget(this.event, 'showJSBUpdatePrompt');

				this.message = {
					isAllowed: false,
					action: ACTION.BLOCKED_ATTENTION_REQUIRED
				};
			} else {
				if (info.pageProtocol === 'about:')
					info.pageLocation = this.event.target.url || info.pageLocation;

				var resource = new Resource(info);

				this.message = resource.canLoad();
			}
		},

		globalSetting: function (setting) {
			this.message = {
				disabled: window.globalSetting.disabled,
				debugMode: window.globalSetting.debugMode,
				popoverReady: Popover.window.PopoverReady,

				useAnimations: Settings.getItem('useAnimations'),
				enabledKinds: Settings.getItem('enabledKinds'),
				showPlaceholder: Settings.getItem('showPlaceholder'),
				hideInjected: Settings.getItem('hideInjected'),
				confirmShortURL: Settings.getItem('confirmShortURL'),
				blockReferrer: Settings.getItem('blockReferrer'),

				contentURLs: window.CONTENT_URLS
			};
		},

		specialsForLocation: function (page) {
			if (page.pageProtocol === 'about:')
				page.pageLocation = this.event.target.url || page.pageLocation;

			if (page.pageLocation)
				this.message = Special.forLocation(page.pageLocation, page.isFrame);
			else
				this.message = {};
		},

		userScriptsForLocation: function (page) {
			if (page.pageProtocol === 'about:')
				page.pageLocation = this.event.target.url || page.pageLocation;

			if (page.pageLocation)
				this.message = UserScript.forLocation(page.pageLocation, page.isFrame);
			else
				this.message = {};
		},

		receivePage: function (thePage) {
			var tab = this.event.target,
					activeTab = Tabs.active();

			if (!Page.protocolSupported(thePage.protocol)) {
				ToolbarItems.badge(0, activeTab);

				UI.Page.clear();

				if (thePage.protocol === 'topsites:')
					return;

				return LogDebug('received page from unsupported protocol:', thePage.protocol);
			}

			var page = new Page(thePage, tab),
					renderPage = page;

			if (thePage.isFrame) {		
				var pageParent = Page.pages.findLast(function (pageID, parent, store) {
					if (parent.info.state.data && parent.isTop && parent.tab === tab) {
						parent.addFrame(page);

						renderPage = parent;

						return true;
					}
				});

				if (!pageParent)
					if (page.retries < 3)
						return Utilities.Timer.timeout('WaitForParent' + page.info.id, function (page) {
							if (page.retries > 0)
								Log('Waiting for top page...', page.retries, page.info.host);

							page.retries++;
						}, 500, [page]);
					else
						return LogError(['frame does not seem to have a parent', page.info.id]);
			}

			if (!activeTab || !activeTab.url) {
				ToolbarItems.badge(0, activeTab);

				UI.Page.clear();
			} else if (renderPage.isTop) {
				Page.awaitFromTab(tab, true);

				renderPage.badgeState(Settings.getItem('toolbarDisplay'));

				if (activeTab === renderPage.tab)
					UI.Page.renderPage(renderPage);
			}
		},

		willBlockFirstVisit: function (host) {
			var	shouldBlockFirstVisit = Page.shouldBlockFirstVisit(host);

			if (shouldBlockFirstVisit) {
				if (shouldBlockFirstVisit.action !== ACTION.BLOCKED_FIRST_VISIT && shouldBlockFirstVisit.action !== ACTION.BLOCK_FIRST_VISIT_NO_NOTIFICATION)
					Page.blockFirstVisit(shouldBlockFirstVisit.host);

				this.message = shouldBlockFirstVisit;
			} else
				this.message = false;
		},

		unblockFirstVisit: function (host) {
			Page.unblockFirstVisit(host);
		},

		noFirstVisitNotification: function (host) {
			Page.blockFirstVisit(host, true);
		},

		verifyScriptSafety: function (script) {
			try {
				new Function("return function () {\n" + script + "\n}");

				this.message = true;
			} catch (error) {
				this.message = false;
			}
		},

		XMLHttpRequest: function (detail) {
			var self = this,
					meta = detail.meta;

			meta.type = meta.method || meta.type || 'GET';
			meta.async = !meta.synchronous;
			meta.cache = !meta.ignoreCache;
			meta.dataType = 'text';

			if (meta.async)
				this.message = false;

			function eventCallback (action, response, request) {
				var result = {
					callbackID: detail.callbackID,
					action: action,
					response: {
						readyState: request.readyState,
						responseHeaders: (function (headers) {
							var line;

							var lines = headers.split(/\n/),
									headerMap = {};

							for (var i = 0; i < lines.length; i++) {
								line = lines[i].split(': ');
								
								if (line[0].length)
									headerMap[line.shift()] = line.join(': ');
							}

							return headerMap;
						})(request.getAllResponseHeaders ? request.getAllResponseHeaders() : ''),

						responseText: response,
						status: request.status,
						statusText: request.statusText
					}
				};

				if (meta.async || action === 'XHRComplete')
					self.sendCallback(detail.sourceID, detail.callbackID, result);
				else
					self.message = result;
			};

			meta.xhr = function () {
				var xhr = new XMLHttpRequest();

				function onProgress (upload, event) {
					self.sendCallback(detail.sourceID, detail.callbackID, {
						callbackID: detail.callbackID,
						action: (upload ? 'upload.' : '') + 'on' + event.type,
						response: {
							lengthComputable: event.lengthComputable,
							loaded: event.loaded,
							total: event.total
						}
					});
				}

				xhr.upload.addEventListener('progress', onProgress.bind(null, true));

				xhr.upload.addEventListener('load', function (event) {
					eventCallback('upload.onload', xhr.responseText, {});
				});

				xhr.upload.addEventListener('error', function (event) {
					eventCallback('upload.onerror', xhr.responseText, xhr);
				});

				xhr.upload.addEventListener('abort', function (event) {
					eventCallback('upload.onabort', xhr.responseText, xhr);
				});

				xhr.addEventListener('progress', onProgress.bind(null, false));

				xhr.addEventListener('loadend', function (event) {
					eventCallback('XHRComplete', '', xhr);
				});

				return xhr;
			};

			meta.beforeSend = (function (headers) {
				return function (req) {
					for (var header in headers)
						req.setRequestHeader(header, headers[header]);
				};
			})(meta.headers ? meta.headers : {});

			meta.success = function (response, status, request) {
				eventCallback('onload', response, request);
			};

			meta.error = function (request, status, response) {
				if (response === 'timeout')
					eventCallback('ontimeout', response, request);
				else if (response === 'abort')
					eventCallback('onabort', response, request);
				else
					eventCallback('onerror', response.message ? response.message : response, request);
			};

			$.ajax(meta);
		},

		addResourceRule: function (detail) {
			var resource = new Resource(detail.resource);

			resource.__addRule(detail.action, detail.domain, detail.rule, detail.framed, detail.temporary);

			this.message = true;
		},

		installUserScriptFromURL: function (url) {
			var success = false;

			UserScript.download(url, false).done(function (userScript) {
				try {
					success = UserScript.add(userScript);
				} catch (error) {
					success = error;

					LogError(error);
				}

			}).fail(function () {
				success = false;
			});

			this.message = success;
		},

		template: {
			create: function (detail) {
				try {
					Template.load(detail.template);

					this.message = Template.create(detail.template, detail.section, detail.data, true).html();
				} catch (error) {
					LogError(error);

					this.message = null;
				}
			}
		},

		settingStore: {
			getItem: function (detail) {
				this.message = SettingStore.getItem(detail.setting, detail.value);
			},
			getJSON: function (detail) {
				this.message = SettingStore.getJSON(detail.setting, detail.value);
			},

			setItem: function (detail) {
				this.message = SettingStore.setItem(detail.setting, detail.value);
			},
			setJSON: function (detail) {
				this.message = SettingStore.setJSON(detail.setting, detail.value);
			}
		},

		userScript: {
			getResource: function (detail) {
				if (!UserScript.exist(detail.namespace)) {
					this.message = null;

					return LogError(detail.namespace + ' does not exist.');
				}

				if (typeof detail.meta !== 'string') {
					this.message = null;

					return LogError([detail.meta + ' is not a string', detail.namespace]);
				}

				this.message = UserScript.scripts.getStore(detail.namespace).getStore('resources').get(detail.meta, null);
			},

			storage: {
				__storage: function (method, detail) {
					if (!UserScript.exist(detail.namespace)) {
						this.message = null;

						return LogError(detail.namespace + ' does not exist.');
					}

					if (method !== 'keys' && (typeof detail.meta.key !== 'string' || !detail.meta.key.length)) {
						this.message = null;

						return LogError([detail.meta.key + ' is not a string', method, detail.namespace]);
					}

					var storage = UserScript.scripts.getStore(detail.namespace).getStore('storage'),
							result = storage[method](detail.meta && detail.meta.key, detail.meta && detail.meta.value);

					this.message = ['keys', 'get']._contains(method) ? result : null;
				},

				getItem: function (detail) {
					this.commands.__storage.call(this, 'get', detail);
				},

				setItem: function (detail) {
					this.commands.__storage.call(this, 'set', detail);
				},

				removeItem: function (detail) {
					this.commands.__storage.call(this, 'remove', detail);
				},

				keys: function (detail) {
					this.commands.__storage.call(this, 'keys', detail);
				}
			}
		}
	};

	var result = new InternalCommand();

	InternalCommand = command = data = event = undefined;

	return result.message;
};

Command.event = new EventListener;

Command.messageReceived = function (event) {
	if (!event.name)
		throw new Error('invalid message');

	var command = (event.name === 'canLoad') ? event.message.command : event.name;

	return Command(command, event.message ? (event.message.data === undefined ? event.message : event.message.data) : null, event);
};

Command.setupContentURLs = function () {
	var stylesheet = $.ajax({
		url: ExtensionURL('css/injected.css'),
		async: false
	});

	window.CONTENT_URLS = {
		stylesheet: {
			type: 'text/css',
			url: Utilities.URL.createFromContent(stylesheet.responseText, 'text/css', true)
		}
	};
};

Command.toggleDisabled = function (force, doNotReload) {
	if (Command.event.trigger('willDisable', window.globalSetting.disabled))
		return;

	window.globalSetting.disabled = typeof force === 'boolean' ? force : !window.globalSetting.disabled;

	Utilities.Timer.remove('timeout', 'autoEnableJSB');

	if (window.globalSetting.disabled && Settings.getItem('alwaysUseTimedDisable'))
		Utilities.Timer.timeout('autoEnableJSB', function () {
			Command.toggleDisabled(false, true);
		}, Settings.getItem('disableTime'));

	Command.setToolbarImage();

	Settings.setItem('isDisabled', window.globalSetting.disabled);

	Command.event.addCustomEventListener('UIReady', function () {
		UI.event.trigger('disabled', window.globalSetting.disabled);

		if (!window.globalSetting.disabled && Popover.visible())
			Page.requestPageFromActive();
	}, true);

	if (window.UI && !doNotReload)
		if (Settings.getItem('disablingReloadsAll'))
			setTimeout(function () {
				Tabs.messageAll('reload');
			}, 150);
		else
			Tabs.messageActive('reload');
};

Command.setToolbarImage = function (event) {
	if (!event || event.target instanceof BrowserWindow)
		ToolbarItems.image(window.globalSetting.disabled ? 'image/toolbar-disabled.png' : 'image/toolbar.png');
};

Command.beforeNavigate = function (event) {
	// var resource = new Resource({
	// 	kind: '*',
	// 	pageLocation: location,
	// 	source: sourceName,
	// 	isFrame: page.isFrame,
	// 	action: attributes.action,
	// 	unblockable: attributes.unblockable,
	// 	meta: attributes.meta
	// });	
};

window.globalSetting = {
	disabled: false,
	debugMode: true,
	speedMultiplier: 1
};

Object._extend(window.globalSetting, Command('globalSetting', null, {}));

if (Settings.getItem('persistDisabled'))
	Command.toggleDisabled(Settings.getItem('isDisabled'));

Command.setupContentURLs();

window.addEventListener('error', function (event) {
	event.preventDefault();

	LogError(event.filename.replace(ExtensionURL(), '/') + ' - ' + event.lineno, new Error(event.message));
});

Events.addApplicationListener('beforeNavigate', Command.beforeNavigate);
Events.addApplicationListener('message', Command.messageReceived);
Events.addApplicationListener('open', Command.setToolbarImage);
