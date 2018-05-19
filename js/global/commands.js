/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

window.UI = {
	onReady: function (fn) {
		Command.event.addCustomEventListener('UIReady', fn, true);
	}
};

function Command (command, data, event) {
	function InternalCommand () {
		var part;

		var commands = this.commands,
			commandParts = command.split(/\./g);	

		if (commandParts.length > 1)
			for (;;) {
				if (commands.hasOwnProperty((part = commandParts.shift())))
					commands = commands[part];

				if (!(commands instanceof Object))
					throw new Error('command path not found - ' + command);

				if (commandParts.length === 1)
					break;
			}

		if (!commands.hasOwnProperty(commandParts[0]))
			throw new Error('command not found - ' + command);

		if (command._startsWith('__'))
			throw new Error('cannot call commands that begin with __');

		this.event = event;

		this.isEvent = !!(event.name && event.message);

		this.commands = commands;

		commands[commandParts[0]].apply(this, Array.isArray(data) ? data : [data]);
	}

	Object.defineProperty(InternalCommand.prototype, 'message', {
		get: function () {
			if (this.isEvent)
				return this.event.message;

			return this.__message;
		},
		set: function (message) {
			try {
				if (this.isEvent)
					this.event.message = message;
				else if (typeof this.event === 'function')
					this.event(message);
				else
					this.__message = message;
			} catch (error) {
				LogError(error, message);
			}
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

		showPopover: function (detail) {
			ToolbarItems.showPopover();

			if (detail.switchTo)
				for (var i = detail.switchTo.length; i--;)
					UI.view.switchTo(detail.switchTo[i]);
		},

		editResourceIDs: function (detail) {
			UI.event.addCustomEventListener('pageDidRender', function () {
				var item,
					section;

				for (var i = detail.resourceIDs.length; i--;) {
					item = $('.page-host-item[data-resourceids*="' + detail.resourceIDs[i] + '"]', UI.Page.view);
					section = item.parents('.page-host-section');

					UI.Page.section.toggleEditMode(section, true, true);

					$('.page-host-item-edit-check', item).prop('checked', true);
					$('.page-host-editor-kind', section).find('option:first').prop('selected', true).end().trigger('change');

					item.scrollIntoView(UI.view.views, 0, 0);
				}
			}, true);

			ToolbarItems.showPopover();

			UI.view.switchTo('#main-views-page');
		},

		activeTabIndex: function () {
			this.message = Tabs.array().indexOf(Tabs.active());
		},

		openTabWithURL: function (url) {
			var tab = Tabs.create(url);

			this.message = Tabs.array().indexOf(tab);
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
			if (info.pageProtocol === 'about:' || info.getPageLocationFromTab) {
				info.pageLocation = this.event.target.url || info.pageLocation;
				info.pageProtocol = Utilities.URL.protocol(this.event.target.url || info.pageLocation);
			}

			if (typeof info.pageLocation !== 'string') {
				info.pageLocation = 'about:blank';
				info.pageProtocol = 'about:';
			}

			info.private = this.event.target.private;
			
			var resource = new Resource(info);

			this.message = resource.canLoad();
		},

		refreshPopover: function () {
			Page.requestPageFromActive();
		},

		globalSetting: function () {
			if (window.Settings)
				this.message = {
					disabled: window.globalSetting.disabled,
					debugMode: window.globalSetting.debugMode,
					popoverReady: Popover.window.PopoverReady,

					useAnimations: Settings.getItem('useAnimations'),
					largeFont: Settings.getItem('largeFont'),
					enabledKinds: Settings.getItem('enabledKinds'),
					showPlaceholder: Settings.getItem('showPlaceholder'),
					hideInjected: Settings.getItem('hideInjected'),
					blockFirstVisitEnabled: Settings.getItem('blockFirstVisit') !== 'nowhere',
					showUnblockedScripts: Settings.getItem('showUnblockedScripts'),
					showBlockFirstVisitNotification: Settings.getItem('showBlockFirstVisitNotification'),
					disableViaParent: Settings.getItem('disableViaParent'),

					contentURLs: window.CONTENT_URLS
				};
			else
				this.messgae = {
					popoverReady: false
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
				popoverVisible = Popover.visible(),
				activeTab = Tabs.active();

			if (!Page.protocolSupported(thePage.protocol)) {
				ToolbarItems.badge(0, activeTab);

				if (popoverVisible)
					UI.Page.clear();

				if (thePage.protocol === 'topsites:')
					return;

				return LogDebug('received page from unsupported protocol:', thePage.protocol);
			}

			var page = new Page(thePage, tab),
				renderPage = page;

			if (thePage.isFrame) {
				var pageParent = Page.pages.findLast(function (pageID, parent) {
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
						return LogError(Error('frame does not seem to have a parent: ' + page.info.id));
			} else
				page.clearFrames();

			if (!activeTab || !activeTab.url) {
				ToolbarItems.badge(0, activeTab);

				if (popoverVisible)
					UI.Page.clear();
			} else if (renderPage.isTop) {
				Page.awaitFromTab(tab, true);

				renderPage.badgeState(Settings.getItem('toolbarDisplay'));

				if (activeTab === renderPage.tab && popoverVisible)
					UI.Page.renderPage(renderPage);
			}

			UI.event.trigger('receivedPage', {
				page: page,
				tab: tab
			});
		},

		blockFirstVisitStatus: function (host) {
			if (host === 'blank')
				host = Utilities.URL.extractHost(this.event.target.url);

			var	blockFirstVisitStatus = Page.blockFirstVisitStatus(host, this.event.target.private);

			if (blockFirstVisitStatus.action === -ACTION.BLOCK_FIRST_VISIT)
				Page.blockFirstVisit(blockFirstVisitStatus.host, false, this.event.target.private);

			this.message = blockFirstVisitStatus;
		},

		unblockFirstVisit: function (host) {
			Page.unblockFirstVisit(host, this.event.target.private);
		},

		noFirstVisitNotification: function (host) {
			Page.blockFirstVisit(host, true, this.event.target.private);
		},

		verifyScriptSafety: function (script) {
			try {
				/* eslint-disable */
				new Function("return function () {\n" + script + "\n}");
				/* eslint-enable */

				this.message = true;
			} catch (error) {
				this.message = false;
			}
		},

		XMLHttpRequest: function (detail) {
			var self = this,
				meta = detail.meta;

			meta.type = meta.method || meta.type || 'GET';
			meta.mimeType = meta.overrideMimeType;
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
						responseHeaders: request.getAllResponseHeaders ? request.getAllResponseHeaders() : '', 
						responseHeadersObject: (function (headers) {
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
			}

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

				xhr.upload.addEventListener('load', function () {
					eventCallback('upload.onload', xhr.responseText, {});
				});

				xhr.upload.addEventListener('error', function () {
					eventCallback('upload.onerror', xhr.responseText, xhr);
				});

				xhr.upload.addEventListener('abort', function () {
					eventCallback('upload.onabort', xhr.responseText, xhr);
				});

				xhr.addEventListener('progress', onProgress.bind(null, false));

				xhr.addEventListener('loadend', function () {
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
				if (response === 'timeout') {
					LogDebug('XHR timeout in user script - ' + detail.sourceID + ' - ' + meta.url);

					eventCallback('ontimeout', response, request);
				}	else if (response === 'abort') {
					LogDebug('XHR abort in user script - ' + detail.sourceID + ' - ' + meta.url);

					eventCallback('onabort', response, request);
				} else {
					LogDebug('XHR error in user script - ' + detail.sourceID + ' - ' + (response.message || response) + ' - ' + meta.url);

					eventCallback('onerror', response.message ? response.message : response, request);
				}
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

					if (typeof success === 'string') {
						var downloadURL = UserScript.getAttribute(success, 'downloadURL');

						if (!downloadURL) {
							UserScript.setAttribute(success, 'customDownloadURL', url);
							UserScript.setAttribute(success, 'autoUpdate', true);

							Settings.anySettingChanged({
								key: 'userScripts'
							});
						}
					}
				} catch (error) {
					success = error;

					LogError(error);
				}
			}).fail(function () {
				success = false;
			});

			this.message = success;
		},

		importBackup: function (detail) {
			setTimeout(function (detail) {
				Update.showRequiredPopover();

				Settings.import(Utilities.decode(detail.backup), detail.clearExisting);
			}, 250, detail);
		},

		openInTab: function (detail) {
			Tabs.create(detail);
		},

		exportedBackup: function () {
			this.message = Settings.EXPORTED_BACKUP;

			delete Settings.EXPORTED_BACKUP;
		},

		topOrigin: function () {
			this.message = Utilities.URL.origin(event.target.url);
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

			setItem: function (detail) {
				this.message = SettingStore.setItem(detail.setting, detail.value);
				SyncClient.Settings.setItem(detail.setting, detail.value);
			}
		},

		userScript: {
			getResource: function (detail) {
				var userScript = UserScript.exist(detail.namespace, detail.meta.parentUserScript);

				if (!userScript) {
					this.message = null;

					return LogError(Error(detail.namespace + ' does not exist.'));
				}

				if (typeof detail.meta.name !== 'string') {
					this.message = null;

					return LogError(Error(detail.meta.name + ' is not a string'), detail.namespace);
				}

				this.message = userScript.getStore('resources').get(detail.meta.name, null);
			},

			storage: {
				__storage: function (method, detail) {
					try {
						var storage = UserScript.getStorageStore(detail.meta.parentUserScript || detail.namespace);
					} catch (error) {
						this.message = null;

						return LogError(Error((detail.meta.parentUserScript || detail.namespace) + ' does not exist.'));
					}

					if (method !== 'keys' && (typeof detail.meta.key !== 'string' || !detail.meta.key.length)) {
						this.message = null;

						return LogError(Error(detail.meta.key + ' is not a string - ' + method, detail.meta.parentUserScript || detail.namespace));
					}

					var	result = storage[method](detail.meta && detail.meta.key, detail.meta && detail.meta.value, method === 'set' ? true : undefined);

					this.message = ['keys', 'get']._contains(method) ? result : null;
				},

				getItem: function (detail) {
					this.commands.__storage.call(this, 'get', detail);
				},

				setItem: function (detail) {
					if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(detail.meta.value))
						detail.meta.value = Number(detail.meta.value);

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

	command = data = event = undefined;

	return result.message;
}

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

	Command.event.addCustomEventListener('UIReady', function () {
		UI.Locker
			.showLockerPrompt('disable', typeof force === 'boolean')
			.then(function () {
				window.globalSetting.disabled = typeof force === 'boolean' ? force : !window.globalSetting.disabled;

				Utilities.Timer.remove('timeout', 'autoEnableJSB');

				if (window.globalSetting.disabled && Settings.getItem('alwaysUseTimedDisable'))
					Utilities.Timer.timeout('autoEnableJSB', function () {
						Command.toggleDisabled(false, true);
					}, Settings.getItem('disableTime'));

				Command.setToolbarImage();

				$('#full-toggle .poppy-menu-target-text', Popover.window.UI.view.viewToolbar).text(_('view_toolbar.' + (window.globalSetting.disabled ? 'enable' : 'disable')));

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
			}, Utilities.noop);
	}, true);
};

Command.setToolbarImage = function (event) {
	if (!event || event.target instanceof BrowserWindow)
		ToolbarItems.image(window.globalSetting.disabled ? 'image/toolbar-disabled.png' : 'image/toolbar.png');
};

Command.onContextMenu = function (event) {
	if (event.userInfo && event.userInfo.placeholderCount)
		event.contextMenu.appendContextMenuItem('restorePlaceholderElements:' + event.userInfo.pageID, _('restore_placeholder'._pluralize(event.userInfo.placeholderCount), [event.userInfo.placeholderCount]));
};

Command.onExecuteMenuCommand = function (event) {
	if (event.command._startsWith('restorePlaceholderElements:')) {
		var splitCommand = event.command.split(':');

		Tabs.messageAll(splitCommand[0], {
			pageID: splitCommand[1]
		});
	}
};

Command.setupContentURLs();

Command.event.addCustomEventListener('popoverReady', function () {
	if (Settings.getItem('persistDisabled'))
		Command.toggleDisabled(Settings.getItem('isDisabled'));

	if (Settings.getItem('showPopoverOnLoad')) {
		Settings.setItem('showPopoverOnLoad', false);

		ToolbarItems.showPopover();
	}
}, true);

window.addEventListener('error', function (event) {
	event.preventDefault();

	LogError.apply(null, event.error ? [event.error] : [event.filename.replace(ExtensionURL(), '/') + ' - ' + event.lineno, new Error(event.message)]);
});

Events.addApplicationListener('message', Command.messageReceived);
Events.addApplicationListener('open', Command.setToolbarImage);
Events.addApplicationListener('contextmenu', Command.onContextMenu);
Events.addApplicationListener('command', Command.onExecuteMenuCommand);
