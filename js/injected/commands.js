var COMMAND = {
	SUCCESS: 0,
	UNAUTHORIZED: -1,
	NOT_FOUND: -2,
	EXECUTION_FAILED: -3,
	WAITING: -4
};

COMMAND._createReverseMap();

var Command = function (type, event) {
	switch (type) {
		case 'global':
			var detail = {
				sourceName: 'Page',
				sourceID: Page.info.id,
				commandToken: Command.requestToken(event.name),
				command: event.name,
				data: event.message
			};
		break;

		case 'window':
			var detail = {
				sourceName: 'Page',
				sourceID: Page.info.id,
				commandToken: Command.requestToken(event.data.command),
				command: event.data.command,
				data: event.data.data
			};
		break;

		case 'injected':
			var detail = event.detail;
		break;
	}

	detail.type = type;

	var InternalCommand = function (detail, event) {
		this.status = COMMAND.WAITING;

		var canExecute = (detail.command && Utilities.Token.valid(detail.commandToken, detail.command, true) &&
			Utilities.Token.valid(detail.sourceID, detail.sourceName));

		if (!canExecute) {
			this.status = COMMAND.UNAUTHORIZED;

			return LogDebug('command authorization failed - ' + detail.sourceName + ' => ' + detail.command);
		}

		detail.type = Utilities.Token.valid(detail.sourceID, 'Page') ? (detail.type || 'injected') : 'injected';

		var commands = Commands[detail.type];

		if (!commands) {
			this.status = COMMAND.NOT_FOUND;

			return LogDebug('command type not found - ' + detail.type);
		}

		var part;

		var commandParts = detail.command.split(/\./g);

		if (commandParts.length > 1) {
			while (true) {
				if (commands.hasOwnProperty((part = commandParts.shift())))
					commands = commands[part];

				if (!(commands instanceof Object)) {
					this.status = COMMAND.NOT_FOUND;

					return LogDebug('command path not found - ' + detail.command);
				}

				if (commandParts.length === 1)
					break;
			}
		}

		if (commands !== Commands[detail.type])
			commands.__proto__ = Commands[detail.type];

		if (!commands.hasOwnProperty(commandParts[0])) {
			this.status = COMMAND.NOT_FOUND;

			return LogDebug('command not found - ' + commandParts[0]);
		}

		if (commandParts[0]._startsWith('__')) {
			this.status = COMMAND.NOT_FOUND;

			return LogDebug('cannot call commands that begin with __');
		}

		try {
			this.result = commands[commandParts[0]].call(commands, detail, event);

			this.status = COMMAND.SUCCESS;
		} catch (error) {
			this.status = COMMAND.EXECUTION_FAILED;

			return LogError(['command processing error', detail.sourceName + ' => ' + detail.command, detail], error);
		}
	};

	var Commands = {};

	Commands.global = {
		reload: function () {
			if (Utilities.Page.isTop)
				document.location.reload();
		},

		sendPage: function () {
			Page.send();
		},

		nextImmediateTimeout: function () {
			Utilities.nextImmediateTimeout();
		},

		messageTopExtension: function (detail, event) {
			if (!Utilities.Page.isTop)
				return;

			var data = detail.data.meta,
					foundSourceID = false;

			for (var token in TOKEN.INJECTED)
				if (TOKEN.INJECTED[token].namespace === data.originSourceName) {
					foundSourceID = token;

					break;
				}

			if (!foundSourceID)
				return LogDebug('cannot execute command on top since the calling script is not injected here. - ' + data.originSourceName + ' - ' + document.location.href);

			var result = Special.JSBCommanderHandler({
				type: 'JSBCommander:' + foundSourceID + ':' + TOKEN.EVENT,

				detail: {
					originSourceID: data.originSourceID,
					commandToken: Command.requestToken(data.command, data.preserve),
					command: data.command,
					viaFrame: detail.data.viaFrame,
					meta: data.meta.args
				}
			});

			if (data.callback) {
				var callback = new DeepInject(null, data.callback),
						name = 'TopCallback-' + data.originSourceName + Utilities.Token.generate();

				callback.setArguments({
					detail: {
						origin: data.originSourceID,
						result: result,
						meta: data.meta.meta
					}
				});

				UserScript.inject({
					attributes: {
						meta: {
							name: name,
							trueNamespace: name
						},

						script: callback.executable()
					}
				}, true);
			}
		},

		executeCommanderCallback: function (detail) {
			Command.sendCallback(detail.data.sourceID, detail.data.callbackID, detail.data.result);
		},

		executeMenuCommand: function (detail) {
			if (detail.data.pageID === Page.info.id)
				Command.sendCallback(detail.data.sourceID, detail.data.callbackID);
		},

		receiveFrameInfo: function (detail) {
			if (Utilities.Page.isTop && detail.data.attachTo === Page.info.id) {
				FRAMED_PAGES[detail.data.info.id] = detail.data.info;

				Page.send();
			}
		},

		getFrameInfo: function (detail) {
			if (detail.data.frameID === Page.info.id)
				GlobalPage.message('bounce', {
					command: 'receiveFrameInfo',
					detail: {
						attachTo: detail.data.attachTo,
						info: Page.info
					}
				});
		},

		recommendPageReload: function () {
			if (Utilities.Page.isTop && !RECOMMEND_PAGE_RELOAD) {
				RECOMMEND_PAGE_RELOAD = true;

				window.location.reload();
			}
		},
	};

	Commands.window = {
		getFrameInfoWithID: function (detail, event) {	
			if (Utilities.Page.isTop)
				GlobalPage.message('bounce', {
					command: 'getFrameInfo',
					detail: {
						attachTo: Page.info.id,
						frameID: detail.data
					}
				});
		},

		requestFrameURL: function (detail, event) {
			FRAME_ID_ON_PARENT = detail.data.id;

			window.parent.postMessage({
				command: 'receiveFrameURL',
				data: {
					id: detail.data.id,
					reason: detail.data.reason,
					url: Page.info.location,
					token: detail.data.token
				}
			}, event.origin);
		},

		rerequestFrameURL: function (detail) {
			Element.requestFrameURL(document.getElementById(detail.data.id), detail.data.reason);
		},

		receiveFrameURL: function (detail) {
			var message = detail.data;

			if (!Utilities.Token.valid(message.token, message.id, true))
				return LogDebug('invalid token received for frame URL.', message);

			var frame = document.getElementById(message.id);

			Utilities.Timer.remove('timeout', 'FrameURLRequestFailed' + message.id);

			if (!frame) {
				LogDebug('received frame URL, but frame does not exist - ' + message.id);

				frame = document.createElement('iframe');

				frame.id = message.id;
			} else {
				Utilities.Token.expire(frame.getAttribute('data-jsbAllowLoad'));

				var locationURL,
						locationURLStore,
						frameURL,
						frameURLStore,
						frameItemID;

				var frameSources = Page.allowed.getStore('frame').getStore('source'),
						allFrameSources = frameSources.all();

				for (locationURL in allFrameSources)
					locationURLStore = frameSources.getStore(locationURL);

					for (frameURL in allFrameSources[locationURL])
						frameURLStore = locationURLStore.getStore(frameURL);

						for (frameItemID in allFrameSources[locationURL][frameURL])
							if (allFrameSources[locationURL][frameURL][frameItemID].meta && allFrameSources[locationURL][frameURL][frameItemID].meta.waiting && allFrameSources[locationURL][frameURL][frameItemID].meta.id === message.id) {
								frameURLStore.remove(frameItemID);

								Page.allowed.decrementHost('frame', Utilities.URL.extractHost(frameURL));
							}
			}

			var previousURL = frame ? frame.getAttribute('data-jsbFrameURL') : 'about:blank',
					previousURLTokenString = previousURL + 'FrameURL';

			if (frame && !Utilities.Token.valid(frame.getAttribute('data-jsbFrameURLToken'), previousURLTokenString))
				return;

			if (previousURL !== message.url)
				Element.afterCanLoad({
					reason: message.reason,
					previousURL: previousURL
				}, frame, false, {
					isAllowed: true,
					action: -1
				}, message.url, {
					target: frame,
					url: message.url,
					unblockable: true
				}, null, 'frame');

			if (frame) {
				Utilities.Token.expire(previousURLTokenString);

				frame.setAttribute('data-jsbFrameURL', message.url);
				frame.setAttribute('data-jsbFrameURLToken', Utilities.Token.create(message.url + 'FrameURL', true));
			}
		},

		historyStateChange: function (detail, event) {
			Handler.setPageLocation();

			if (Page.info.isFrame)
				window.parent.postMessage({
					command: 'rerequestFrameURL',
					data: {
						id: FRAME_ID_ON_PARENT,
						reason: {
							historyStateDidChange: true
						}
					}
				}, '*');

			Page.send();
		}
	};

	Commands.injected = {
		__userScriptAction: function (detail) {
			detail.meta = {
				namespace: TOKEN.INJECTED[detail.sourceID].namespace,
				meta: detail.meta
			};

			return {
				callbackID: detail.callbackID,
				result: GlobalCommand(detail.command, detail.meta)
			};
		},

		__addPageItem: function (isAllowed, detail) {
			var info = detail.meta,
					actionStore = isAllowed ? Page.allowed : Page.blocked;

			info.source = Utilities.URL.getAbsolutePath(info.source);
			info.host = Utilities.URL.extractHost(info.source);

			actionStore.pushSource(info.kind, info.source, {
				action: info.canLoad.action,
				unblockable: false,
				meta: info.meta
			});

			actionStore.incrementHost(info.kind, info.host);

			Page.send();
		},

		commandGeneratorToken: function (detail) {
			return {
				sourceID: detail.sourceID,
				callbackID: detail.callbackID,
				result: {
					commandGeneratorToken: Command.requestToken('commandGeneratorToken'),
					commandToken: Command.requestToken(detail.meta.command),
					command: detail.meta.command
				}
			};
		},

		registerDeepInjectedScript: function (detail, event) {
			if (TOKEN.REGISTERED[detail.sourceID])
				throw new Error('cannot register a script more than once - ' + TOKEN.INJECTED[detail.sourceID].namespace);

			var newSourceID = Utilities.Token.create(detail.sourceName, true);

			document.removeEventListener('JSBCommander:' + detail.sourceID + ':' + TOKEN.EVENT, Special.JSBCommanderHandler, true);
			document.addEventListener('JSBCommander:' + newSourceID + ':' + TOKEN.EVENT, Special.JSBCommanderHandler, true);

			TOKEN.INJECTED[newSourceID] = TOKEN.INJECTED[detail.sourceID];

			delete TOKEN.INJECTED[detail.sourceID];

			TOKEN.REGISTERED[newSourceID] = true;

			return {
				sourceID: detail.sourceID,
				callbackID: detail.callbackID,
				result: {
					previousSourceID: detail.sourceID,
					newSourceID: newSourceID
				}
			};
		},

		executeCommanderCallback: function (detail) {
			GlobalPage.message('bounce', {
				command: 'executeCommanderCallback',
				detail: {
					sourceID: detail.meta.sourceID,
					callbackID: detail.meta.callbackID,
					result: detail.meta.result
				}
			});
		},

		messageTopExtension: function (detail, event) {
			if (document.hidden) {
				event.detail.commandToken = Command.requestToken('messageTopExtension');

				Handler.event.addEventListener('documentBecameVisible', Command.bind(window, 'injected', event), true);
			} else {
				detail.meta.originSourceName = TOKEN.INJECTED[detail.sourceID].namespace;
				detail.meta.originSourceID = detail.sourceID;

				GlobalPage.message('bounce', {
					command: 'messageTopExtension',
					detail: detail
				});
			}
		},

		inlineScriptsAllowed: function (detail) {
			if (TOKEN.INJECTED[detail.sourceID].usedURL)
				return;

			DeepInject.useURL = false;
		},

		registerMenuCommand: function (detail) {
			if (typeof detail.meta !== 'string' || !detail.meta.length)
				return LogError(['caption is not a valid string', detail.meta]);

			detail.meta = TOKEN.INJECTED[detail.sourceID].name + ' - ' + detail.meta;

			if (UserScript.menuCommand[detail.meta])
				return LogDebug('menu item with caption already exist - ' + detail.meta);

			UserScript.menuCommand[detail.meta] = {
				sourceID: detail.sourceID,
				callbackID: detail.callbackID
			};
		},

		XMLHttpRequest: function (detail) {
			detail.meta.url = Utilities.URL.getAbsolutePath(detail.meta.url);

			var result = GlobalCommand(detail.command, detail);

			if (result !== false)
				return {
					callbackID: detail.callbackID,
					result: result
				};
		},

		showXHRPrompt: function (detail) {
			var self = this,
					meta = detail.meta.meta;

			var response = {
				meta: {
					sourceID: detail.originSourceID,
					callbackID: detail.meta.onXHRPromptInput,
					result: false
				}
			};

			var notificationID = Utilities.Token.generate();

			var xhrPrompt = GlobalCommand('template.create', {
				template: 'injected',
				section: 'xhr-prompt',
				data: {
					notificationID: notificationID,
					synchronousInfoOnly: detail.meta.synchronousInfoOnly,
					synchronousInfoIsAllowed: detail.meta.synchronousInfoIsAllowed,
					info: detail.meta.meta
				}
			});

			var subTitle = detail.viaFrame ? [_('via_frame')] : [];

			if (detail.meta.synchronousInfoOnly)
				subTitle.push(_('xhr.synchronous'), _(detail.meta.synchronousInfoIsAllowed ? 'xhr.sync_auto_allowed' : 'xhr.sync_auto_blocked'));

			var notification = new PageNotification({
				id: notificationID,
				title: _(meta.kind + '.prompt.title'),
				subTitle: subTitle.join(' - '),
				body: xhrPrompt
			});

			if (!detail.meta.synchronousInfoOnly) {
				notification.closeButtonText(_('xhr.block_and_close'));

				notification
					.addEventListener('click', '.jsb-xhr-rule-cancel', function (notification) {
						notification.restoreLayering();

						notification.element.querySelector('.jsb-xhr-add-rule-prompt').classList.add('jsb-hidden');
						notification.element.querySelector('.jsb-xhr-prompt').classList.remove('jsb-hidden');
					})
					.addEventListener('click', '.jsb-notification-close', function (notification) {
						self.executeCommanderCallback(response);
					})
					.addEventListener('change', '.jsb-xhr-method', function (notification) {
						var value = this.options[this.selectedIndex].value;

						this.classList.toggle('jsb-color-allow', value === '1');
						this.classList.toggle('jsb-color-block', value === '0');
					})
					.addEventListener('click', '.jsb-xhr-action', function (notification) {
						if (this.classList.contains('jsb-xhr-once')) {
							response.meta.result = this.getAttribute('data-method') === '1';

							self.executeCommanderCallback(response);

							notification.hide();;
						} else {
							notification.bringForward();

							notification.element.querySelector('.jsb-xhr-add-rule-prompt').classList.remove('jsb-hidden');
							notification.element.querySelector('.jsb-xhr-prompt').classList.add('jsb-hidden');
						}
					});
			}
		},

		notification: function (detail) {
			var self = this,
					notification = new PageNotification(detail.meta);

			Handler.event.addEventListener('stylesheetLoaded', function () {
				detail.result = notification.element.id;
				detail.callbackID = detail.meta.onNotificationVisible;

				self.executeCommanderCallback({
					meta: detail
				});
			}, true);
		},

		canLoadResource: function (detail) {
			var toCheck = detail.meta;

			toCheck.pageLocation = Page.info.location;
			toCheck.pageProtocol = Page.info.protocol;
			toCheck.isFrame = Page.info.isFrame;
			toCheck.source = Utilities.URL.getAbsolutePath(toCheck.source);

			return {
				callbackID: detail.callbackID,
				result: GlobalCommand('canLoadResource', toCheck)
			};
		},

		testCommand: function (detail) {
			return 3;
		},

		confirm: function (detail) {
			for (var i = 0; i < 1000; i++)
				GlobalCommand('ping');

			return Command.globalRelay(detail);
		},

		showPopover: function (detail) {
			Command.globalRelay(detail);
		},

		openTabWithURL: function (detail) {
			return Command.globalRelay(detail);
		},

		activeTabIndex: function (detail) {
			return Command.globalRelay(detail);
		},

		closeTabAtIndex: function (detail) {
			Command.globalRelay(detail);
		},

		activateTabAtIndex: function (detail) {
			Command.globalRelay(detail);
		},

		localize: function (detail) {
			return Command.globalRelay(detail);
		},

		extensionURL: function (detail) {
			return {
				callbackID: detail.callbackID,
				result: ExtensionURL(detail.meta.path)
			};
		},

		addResourceRule: function (detail) {
			if (!Utilities.Token.valid(detail.meta.key, 'addResourceRuleKey'))
				throw new Error('invalid addResourceRuleKey');

			var ruleInfo = detail.meta.resource;

			ruleInfo.pageLocation = Page.info.location;
			ruleInfo.pageProtocol = Page.info.protocol;
			ruleInfo.isFrame = Page.info.isFrame;

			GlobalPage.message('addResourceRule', detail.meta);

			return {
				callbackID: detail.callbackID,
				result: true
			};
		},

		installUserScriptFromURL: function (detail) {
			return {
				callbackID: detail.callbackID,
				result: GlobalCommand('installUserScriptFromURL', detail.meta.url)
			};
		},

		template: {
			create: function (detail) {
				return Command.globalRelay(detail);
			}
		},

		userScript: {
			getResource: function (detail) {
				return this.__userScriptAction(detail);
			},

			storage: {
				getItem: function (detail) {
					return this.__userScriptAction(detail);
				},

				setItem: function (detail) {
					return this.__userScriptAction(detail);
				},

				keys: function (detail) {
					return this.__userScriptAction(detail);
				}
			}
		},

		page: {
			addBlockedItem: function (detail) {
				return this.__addPageItem(false, detail);
			},
			addAllowedItem: function (detail) {
				return this.__addPageItem(true, detail);
			}
		}
	};

	var command = new InternalCommand(detail, event);

	if (command.status === COMMAND.SUCCESS)
		return command.result;
	else
		return new Error(command.status);
};

Command.requestToken = function (command) {
	return Utilities.Token.create(command);
};

Command.sendCallback = function (sourceID, callbackID, result) {
	document.dispatchEvent(new CustomEvent('JSBCallback:' + sourceID + ':' + TOKEN.EVENT, {
		detail: {
			callbackID: callbackID,
			result: result
		}
	}));
};

Command.globalRelay = function (detail) {
	return {
		callbackID: detail.callbackID,
		result: GlobalCommand(detail.command, detail.meta)
	};
};

Command.global = function (event) {
	// Somehow prevents excessive "Blocked a frame with origin..." errors. While it does not affect functionality, it does
	// look ugly.
	console.log;

	if (event.message)
		try {
			event.message = JSON.parse(event.message);
		} catch (error) {}

	Command('global', event);
};

Command.window = function (event) {
	if (!(event.data instanceof Object) || !event.data.command)
		return;

	Command('window', event);
};


Events.addTabListener('message', Command.global, true);

window.addEventListener('message', Command.window, true);
