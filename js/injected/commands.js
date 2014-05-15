"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

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
				sourceID: TOKEN.PAGE,
				commandToken: Command.requestToken(event.name),
				command: event.name,
				data: event.message
			};
		break;

		case 'window':
			var detail = {
				sourceName: 'Page',
				sourceID: TOKEN.PAGE,
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
					foundSourceID = true;

					break;
				}

			if (!foundSourceID)
				return LogDebug('cannot execute command on top since the calling script is not injected here. - ' + data.originSourceName + ' - ' + document.location.href);

			delete data.meta.args.meta;

			var result = Special.JSBCommanderHandler({
				type: detail.data.originalEvent.type,

				detail: {
					commandToken: Command.requestToken(data.command, data.preserve),
					command: data.command,
					viaFrame: detail.data.viaFrame,
					meta: data.meta.args
				}
			});

			if (data.callback) {
				var callback = new DeepInject(null, data.callback),
						name = 'TopCallback-' + data.originSourceName + Utilities.id();

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
			if (detail.data.pageID === TOKEN.PAGE)
				Command.sendCallback(detail.data.sourceID, detail.data.callbackID);
		},

		addFrameInfo: function (detail, event) {
			if (Utilities.Page.isTop) {
				FRAMED_PAGES[detail.data.id] = detail.data;

				Page.send();
			}
		}
	};

	Commands.window = {
		requestFrameURL: function (detail, event) {
			window.parent.postMessage({
				command: 'receiveFrameURL',
				data: {
					id: detail.data.id,
					url: Page.info.location
				}
			}, event.origin);
		},
		receiveFrameURL: function (detail) {
			var message = detail.data,
					frame = document.getElementById(message.id);

			Utilities.Timer.remove('timeout', 'FrameURLRequestFailed' + message.id);

			if (!frame)
				LogDebug('received frame URL, but frame does not exist - ' + message.id);
			else {
				Utilities.Token.expire(frame.getAttribute('data-jsbAllowLoad'));

				var host;

				var allowedFrames = Page.allowed.getStore('frame'),
						all = allowedFrames.get('all', [], true),
						allClone = Utilities.makeArray(all),
						hosts = allowedFrames.getStore('hosts');

				for (var i = 0; i < allClone.length; i++)
					if (allClone[i].meta && allClone[i].meta.waiting && allClone[i].meta.id === message.id) {
						LogDebug('frame did not vanish - ' + message.id);

						all.splice(i, 1);

						hosts.decrement(Utilities.URL.extractHost(allClone[i].source));
					}
			}

			var previousURL = frame ? frame.getAttribute('data-jsbFrameURL') : 'about:blank';

			if (previousURL !== message.url) {
				Resource.canLoad({
					target: frame ? frame : document.createElement('iframe'),
					url: message.url,
					unblockable: true,
				}, false, {
					previousURL: previousURL
				});
			}

			if (frame)
				frame.setAttribute('data-jsbFrameURL', message.url);
		},

		historyStateChange: function (detail, event) {
			Page.info.location = Utilities.Page.getCurrentLocation();

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
					kindStore = (isAllowed ? Page.allowed : Page.blocked).getStore(info.kind);

			info.source = Utilities.URL.getAbsolutePath(info.source);
			info.host = Utilities.URL.extractHost(info.source);

			kindStore.getStore('source').getStore(info.source).set(info.pageLocation, {
				ruleAction: info.canLoad.action,
				unblockable: false,
				meta: info.meta
			});

			kindStore.getStore('hosts').increment(info.host);

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
			detail.meta.originSourceName = TOKEN.INJECTED[detail.sourceID].namespace;
			detail.meta.originSourceID = detail.sourceID;

			detail.originalEvent = {
				type: event.type
			};

			GlobalPage.message('bounce', {
				command: 'messageTopExtension',
				detail: detail
			});
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

		notification: Utilities.noop,

		canLoadResource: function (detail) {
			var toCheck = detail.meta;

			toCheck.pageLocation = Page.info.location;
			toCheck.pageProtocol = Page.info.protocol;
			toCheck.isFrame = Page.info.isFrame;
			toCheck.source = Utilities.URL.getAbsolutePath(toCheck.source);

			var canLoad = GlobalCommand('canLoadResource', toCheck);

			canLoad.isAllowed = !!(canLoad.action % 2);

			return {
				callbackID: detail.callbackID,
				result: canLoad
			};

			if (info.canLoad.action < 0 && enabled_specials.ajax_intercept.value === 1) {
				info.str = detail.str;
				info.kind = detail.kind;
				info.source = detail.source;
				info.data = detail.data;
				info.rule = detail.source._escapeRegExp();
				info.domain_parts = ResourceCanLoad(beforeLoad, ['arbitrary', 'domain_parts', parseURL(pageHost()).host]);
			}

			sendCallback(sourceID, detail.callback, o);
		},

		testCommand: function (detail) {
			return 3;
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
		},

		userScript: {
			resource: {
				getItem: function (detail) {
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
