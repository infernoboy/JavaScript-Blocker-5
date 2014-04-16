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

		detail.type = Utilities.Token.valid(detail.sourceID, 'Page') ? (detail.type || 'injected') : 'injected';

		this.commands = Commands[detail.type];

		if (!this.commands) {
			this.status = COMMAND.NOT_FOUND;

			return LogError(['command type not found', detail.type]);
		}

		if (!this.commands.hasOwnProperty(detail.command)) {
			this.status = COMMAND.NOT_FOUND;

			return LogError('command not found - ' + detail.command);
		}

		if (detail.command._startsWith('__')) {
			this.status = COMMAND.NOT_FOUND;

			return LogError('cannot call commands that begin with __');
		}

		var canExecute = (detail.command && Utilities.Token.valid(detail.commandToken, detail.command, true) &&
			Utilities.Token.valid(detail.sourceID, detail.sourceName));

		if (!canExecute) {
			this.status = COMMAND.UNAUTHORIZED;

			return LogError(['command authorization failed', detail.sourceName + ' => ' + detail.command]);
		}

		try {
			this.result = this.commands[detail.command](detail, event);

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
				return LogError(['cannot execute command on top since the calling script is not injected here.', data.originSourceName, document.location.href]);

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
						name = ['TopCallback', data.originSourceName, Utilities.id()].join();

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
					if (allClone[i].meta && allClone[i].meta.id === message.id) {
						LogDebug('frame did not vanish - ' + message.id);

						all.splice(i, 1);

						hosts.decrement(Utilities.URL.extractHost(allClone[i].source));
					} 
			}

			var previousURL = frame ? frame.getAttribute('data-jsbFrameURL') : 'about:blank';

			if (previousURL !== message.url) {
				Resource.canLoad({
					target: document.createElement('iframe'),
					url: message.url,
					unblockable: true,
				}, false, {
					previousURL: previousURL
				});
			}

			if (frame)
				frame.setAttribute('data-jsbFrameURL', message.url);
		}
	};

	Commands.injected = {
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

			document.removeEventListener(['JSBCommander', detail.sourceID, TOKEN.EVENT].join(':'), Special.JSBCommanderHandler, true);
			document.addEventListener(['JSBCommander', newSourceID, TOKEN.EVENT].join(':'), Special.JSBCommanderHandler, true);

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

		storageSetItem: function (detail) {
			detail.meta.namespace = TOKEN.INJECTED[detail.sourceID].namespace;

			GlobalPage.message(detail.command, detail.meta);
		},

		inlineScriptsAllowed: function (detail) {				
			DeepInject.useURL = false;
		},

		registerMenuCommand: function (detail) {
			if (typeof detail.meta !== 'string' || !detail.meta.length)
				return LogError(['caption is not a valid string', detail.meta]);

			detail.meta = [TOKEN.INJECTED[detail.sourceID].name, detail.meta].join(' - ');

			if (UserScript.menuCommand[detail.meta])
				return LogError(['menu item with caption already exist', detail.meta]);

			UserScript.menuCommand[detail.meta] = {
				sourceID: detail.sourceID,
				callbackID: detail.callbackID
			};
		},

		XMLHttpRequest: function (detail) {
			var result = GlobalCommand(detail.command, detail);

			if (result !== false)
				Command.sendCallback(detail.sourceID, detail.callbackID, result);
		},

		notification: Utilities.noop,

		canLoadXHR: function (detail) {
			var info = {
				id: detail.id,
				meta: detail,
				canLoad:  GlobalCommand('canLoadResource', {
					kind: detail.kind,
					pageLocation: Page.info.location,
					source: detail.source,
					isFrame: Page.info.isFrame
				})
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
	document.dispatchEvent(new CustomEvent(['JSBCallback', sourceID, TOKEN.EVENT].join(':'), {
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
