"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

var COMMAND = {
	UNAUTHORIZED: -195,
	NOT_FOUND: -196,
	EXECUTION_FAILED: -197
};

COMMAND._createReverseMap();

var Command = {
	requestToken: function (command) {
		return Utilities.Token.create(command);
	},

	performGlobal: function (event) {
		// This somehow prevents the "Blocked a frame with origin..." error messages. They are completely harmless
		// and do not affect the functionality of JSB.
		console.log;

		if (event.message)
			try {
				event.message = JSON.parse(event.message);
			} catch (e) {}

		Command.perform({
			sourceName: 'Page',
			sourceID: TOKEN.PAGE,
			commandToken: Command.requestToken(event.name),
			type: 'global',
			command: event.name,
			data: event.message
		});
	},
	
	performWindow: function (event) {
		if (!(event.data instanceof Object) || !event.data.command)
			return;

		Command.perform({
			sourceName: 'Page',
			sourceID: TOKEN.PAGE,
			commandToken: Command.requestToken(event.data.command),
			type: 'window',
			command: event.data.command,
			data: {
				message: event.data.data,
				event: event
			}
		});
	},

	sendCallback: function (sourceID, callbackID, result) {
		document.dispatchEvent(new CustomEvent('JSBCallback-' + sourceID + TOKEN.EVENT, {
			detail: {
				callbackID: callbackID,
				result: result
			}
		}));
	},

	perform: function (object) {
		if (typeof object !== 'object')
			throw new TypeError(object + ' is not an object');

		var detail = object.detail || object,
				type = Utilities.Token.valid(detail.sourceID, 'Page') ? (detail.type || 'injected') : 'injected',
				commands = Command.commands[type];

		var canExecute = (detail.command && Utilities.Token.valid(detail.commandToken, detail.command) &&
			(Utilities.Token.valid(detail.sourceID, detail.sourceName)));

		Utilities.Token.expire(detail.commandToken, true);

		if (!commands)
			return new Error(['command type not found', type]);
		else if (canExecute) {
			if (commands.hasOwnProperty(detail.command)) {
				try {
					return commands[detail.command](detail);
				} catch (error) {
					LogError(['command processing error', detail.sourceName + ' => ' + detail.command, detail], error);

					return new Error(COMMAND.EXECUTION_FAILED);
				}
			} else {
				LogError(['command not found', detail.sourceName + ' => ' + detail.command]);

				return new Error(COMMAND.NOT_FOUND);
			}
		} else {
			LogError(['command authorization failed', detail.sourceName + ' => ' + detail.command]);

			return new Error(COMMAND.UNAUTHORIZED);
		}
	},

	commands: {
		global: {
			reload: function () {
				if (Utilities.Page.isTop)
					document.location.reload();
			},

			sendPage: function () {
				sendPage();
			},

			messageTopExtension: function (detail) {
				if (!Utilities.Page.isTop)
					return;

				var data = detail.data.meta;

				if (!TOKEN.INJECTED[data.originSourceName])
					return LogError(['cannot execute command on top since the calling script is not injected here.', data.originSourceName]);

				delete data.meta.args.meta;

				var result = Special.JSBCommanderHandler({
					detail: {
						sourceName: data.originSourceName,
						sourceID: TOKEN.INJECTED[data.originSourceName],
						commandToken: Command.requestToken(data.command, data.preserve),
						command: data.command,
						viaFrame: detail.data.viaFrame,
						meta: data.meta.args
					}
				});

				if (data.callback) {
					var callback = new DeepInject(null, data.callback),
							fn = (new Function('return ' + callback.asFunction()))();

					var event = new CustomEvent('JSBCallback-' + TOKEN.INJECTED[data.originSourceName] + TOKEN.EVENT, {
						detail: {
							perform: fn,
							sourceID: data.originSourceID,
							result: {
								result: result,
								meta: data.meta.meta
							}
						}
					});

					document.dispatchEvent(event);
				}
			},

			executeCommanderCallback: function (detail) {
				Command.sendCallback(detail.data.sourceID, detail.data.callbackID, detail.data.result);
			},

			executeMenuCommand: function (detail) {
				if (detail.data.pageID === TOKEN.PAGE)
					Command.sendCallback(detail.data.sourceID, detail.data.callbackID);
			}
		},

		window: {
			requestFrameURL: function (detail) {				
				window.parent.postMessage({
					command: 'receiveFrameURL',
					data: {
						id: detail.data.message.id,
						url: page.location
					}
				}, detail.data.event.origin);
			},
			receiveFrameURL: function (detail) {
				var message = detail.data.message,
						frame = document.getElementById(message.id);

				if (!frame)
					return LogError(['received frame URL, but frame does not exist', message.id]);

				var previousURL = frame.getAttribute('data-jsbFrameURL');

				Utilities.Token.expire(frame.getAttribute('data-jsbAllowLoad'));

				if (previousURL && previousURL !== message.url) {
					canLoadResource({
						target: frame,
						url: message.url,
						unblockable: !!previousURL
					});
				}

				frame.setAttribute('data-jsbFrameURL', message.url);
			}
		},

		injected: {
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

			registerDeepInjectedScript: function (detail) {
				if (TOKEN.INJECTED[detail.sourceName])
					throw new Error('cannot register a script more than once.');

				var newSourceID = Utilities.Token.create(detail.sourceName, true);

				document.removeEventListener('JSBCommander-' + detail.sourceID + TOKEN.EVENT, Special.JSBCommanderHandler, true);
				document.addEventListener('JSBCommander-' + newSourceID + TOKEN.EVENT, Special.JSBCommanderHandler, true);

				TOKEN.INJECTED[detail.sourceName] = newSourceID;

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

			messageTopExtension: function (detail) {
				GlobalPage.message('bounce', {
					command: 'messageTopExtension',
					detail: detail
				});
			},

			inlineScriptsAllowed: function (detail) {
				DeepInject.useURL = false;
			},

			registerMenuCommand: function (detail) {
				if (UserScript.menuCommand[detail.meta.caption])
					return LogError(['menu item with caption already exist', detail.meta.caption]);

				UserScript.menuCommand[detail.meta.caption] = {
					sourceID: detail.sourceID,
					callbackID: detail.callbackID
				};
			},

			notification: Utilities.noop,

			canLoadXHR: function (detail) {
				var info = {
					id: detail.id,
					meta: detail,
					canLoad:  GlobalCommand('canLoadResource', {
						kind: detail.kind,
						pageLocation: page.location,
						source: detail.source,
						isFrame: page.isFrame
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
		}
	}
};

Events.addTabListener('message', Command.performGlobal, true);

window.addEventListener('message', Command.performWindow, true);
