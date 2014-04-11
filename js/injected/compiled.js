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
		}, event);
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
		document.dispatchEvent(new CustomEvent(['JSBCallback', sourceID, TOKEN.EVENT].join(':'), {
			detail: {
				callbackID: callbackID,
				result: result
			}
		}));
	},

	perform: function (object, originalEvent) {
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
					return commands[detail.command](detail, originalEvent ? originalEvent : (object instanceof CustomEvent ? object : undefined));
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

			messageTopExtension: function (detail, event) {
				if (!Utilities.Page.isTop)
					return;

				var data = detail.data.meta,
						foundSourceID = false;

				for (var token in TOKEN.INJECTED)
					if (TOKEN.INJECTED[token] === data.originSourceName) {
						foundSourceID = true;

						break;
					}

				if (!foundSourceID)
					return LogError(['cannot execute command on top since the calling script is not injected here.', data.originSourceName]);

				delete data.meta.args.meta;

				var result = Special.JSBCommanderHandler({
					type: detail.data.originalEvent.type,

					detail: {
						sourceName: data.originSourceName,
						commandToken: Command.requestToken(data.command, data.preserve),
						command: data.command,
						viaFrame: detail.data.viaFrame,
						meta: data.meta.args
					}
				});

				if (data.callback) {
					var callback = new DeepInject(null, data.callback);

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
								name: ['Callback', data.originSourceName, Utilities.id()].join()
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

			registerDeepInjectedScript: function (detail, event) {
				if (TOKEN.REGISTERED[detail.sourceID])
					throw new Error('cannot register a script more than once - ' + TOKEN.INJECTED[detail.sourceID]);

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
				detail.meta.originSourceName = TOKEN.INJECTED[detail.sourceID];
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
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

if (typeof document.hidden === 'undefined')
	document.hidden = false;

if (!window.CustomEvent) {
	(function () {
		function CustomEvent (event, params) {
			params = params || { bubbles: false, cancelable: false, detail: undefined };
			var evt = document.createEvent('CustomEvent');
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			return evt;
		};

		window.CustomEvent = CustomEvent;
	})();
}

var TOKEN = {
	PAGE: Utilities.Token.create('Page'),
	EVENT: Utilities.id()
};

var BLOCKABLE = {
	SCRIPT: ['script'],
	FRAME: ['frame', true],
	IFRAME: ['frame', true],
	EMBED: ['embed', true],
	OBJECT: ['embed', true],
	VIDEO: ['video', true],
	IMG: ['image', true],
	AJAX_POST: ['ajax_post'],
	AJAX_PUT: ['ajax_put'],
	AJAX_GET: ['ajax_get'],
	special: ['special'],
	disable: ['disable']
};

var	broken = false,
		onDocumentVisible = [],
		staticActions = {};

var page = {
	id: TOKEN.PAGE,
	state: (new Store('Page')).getStore(TOKEN.PAGE),
	location: Utilities.Page.getCurrentLocation(),
	host: Utilities.Page.isBlank ? 'blank' : (document.location.host || 'blank'),
	isFrame: !Utilities.Page.isTop
};

var allowedItems = page.state.getStore('allowed'),
		blockedItems = page.state.getStore('blocked'),
		unblockedItems = page.state.getStore('unblocked');

var globalInfo = (function () {
	var infoCache = new Store('GlobalInfo', {
		defaultValue: GlobalCommand('globalInfo')
	});

	return function globalInfo (infoKey, bypassCache) {
		if (typeof infoKey !== 'string')
			throw new TypeError('infoKey is not a string');

		var info = infoCache.get(infoKey);

		if (info && (info.cache || bypassCache === true))
			return info.value;
		else
			return infoCache.set(infoKey, GlobalCommand('globalInfo', infoKey)).get(infoKey).value;
	}
})();

var ifSetting = (function () {
	var settings = {};

	return function ifSetting (setting, checkValue, matchType) {
		var checkSettings = Array.isArray(setting) ? setting : [setting];

		if (typeof matchType === 'undefined')
			matchType = ARRAY.CONTAINS.ONE;
		
		return new Promise(function (resolve, reject) {
			for (var i = 0; i < checkSettings.length; i++) {
				if (typeof checkSettings[i] !== 'string')
					return reject(TypeError('setting is not a string'));

				if (!(checkSettings[i] in settings))
					settings[checkSettings[i]] = GlobalCommand('getSetting', checkSettings[i]);

				var settingValue = settings[checkSettings[i]];

				if ((Array.isArray(settingValue) && settingValue.__contains(matchType, checkValue)) || settingValue === checkValue) {
					resolve();

					break;
				} else if (i === (checkSettings.length - 1))
					reject();
			}
		});
	}
})();

var _ = (function () {
	var stringCache = new Store;

	return function _ (string, args) {
		if (Array.isArray(args))
			stringCache.set(string, GlobalCommand('_', {
				string: string,
				args: args
			}));

		return stringCache.get(string);
	}
})();

var sendPage = (function () {
	var timeout;

	return function sendPage (quickTimeout) {
		clearTimeout(timeout);

		timeout = setTimeout(function () {
			try {
				if (!document.hidden)
					GlobalPage.message('receivePage', page);
			} catch(error) {
				if (!broken) {
					broken = true;

					LogError('JavaScript Blocker broke! This is an issue with Safari itself. Reloading the page should fix things.', error);
				}
			}
		}, quickTimeout ? 0 : 100);
	};
})();

var Handler = {
	DOMContentLoaded: function () {
		var i,
				b;

		var scripts = document.getElementsByTagName('script'),
				anchors = document.getElementsByTagName('a'),
				forms = document.getElementsByTagName('form'),
				iframes = document.getElementsByTagName('iframe'),
				frames = document.getElementsByTagName('frame'),
				unblockedScripts = unblockedItems.getStore('script').get('all', [], true);

		for (i = 0, b = scripts.length; i < b; i++)
			processUnblockableElement('script', scripts[i]);

		for (i = 0, b = anchors.length; i < b; i++)
			Handler.anchor(anchors[i]);

		for (i = 0, b = iframes.length; i < b; i++)
			Handler.frame(iframes[i]);

		for (i = 0, b = frames.length; i < b; i++)
			Handler.frame(frames[i]);

		ifSetting('blockReferrer', true)
			.then(function (forms) {
				var method;

				for (var i = 0, b = forms.length; i < b; i++) {
					method = forms[y].getAttribute('method');

					if (method && method.toLowerCase() === 'post')
						GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(forms[i].getAttribute('action')));
				}
			}.bind(null, forms))
			.finally(sendPage.bind(null, true));
	},

	hash: function (event) {
		page.location = Utilities.Page.getCurrentLocation();
		
		if (event)
			sendPage();
	},

	visibilityChange: function (event) {
		if (!document.hidden) {
			for (var i = 0, b = onDocumentVisible.length; i < b; i++) {
				var fn = onDocumentVisible.shift();

				if (typeof fn === 'function')
					fn();
				else
					throw new TypeError(fn + ' is not a function');
			}

			sendPage();
		}
	},

	contextMenu: function (event) {
		Events.setContextMenuEventUserInfo(event, {
			pageID: TOKEN.PAGE,
			menuCommand: UserScript.menuCommand,
			placeholders: document.querySelectorAll('.jsblocker-placeholder').length
		});
	},

	anchor: function (anchor) {
		var hasTarget = !!anchor.target;

		anchor = hasTarget ? anchor.target : anchor;

		var isAnchor = anchor.nodeName && anchor.nodeName === 'A';
		
		if (hasTarget && !isAnchor) {
			if (anchor.querySelectorAll) {
				var anchors = anchor.querySelectorAll('a', anchor);

				for (var i = 0, b = anchors.length; i < b; i++)
					Handler.anchor(anchors[i]);
			}
			
			return false;
		}

		if (isAnchor && !Utilities.Token.valid(anchor.getAttribute('data-jsbAnchorPrepared'), 'AnchorPrepared')) {
			var href = anchor.getAttribute('href');

			anchor.setAttribute('data-jsbAnchorPrepared', Utilities.Token.create('AnchorPrepared', true));
			
			if (Special.isEnabled('simple_referrer')) {
				if (href && href.length && href.charAt(0) !== '#')
					if ((!anchor.getAttribute('rel') || !anchor.getAttribute('rel').length))
						anchor.setAttribute('rel', 'noreferrer');
			}

			ifSetting('confirmShortURL', true)
				.then(function () {
					this.addEventListener('click', function () {
						var target = this.getAttribute('target');

						if (target !== '_blank' && target !== '_top' && !GlobalCommand('confirmShortURL', {
							shortURL: this.href,
							pageLocation: page.location
						})) {
							event.preventDefault();
							event.stopPropagation();
						}
					});
				}.bind(anchor));
			
			ifSetting('blockReferrer', true)
				.then(function (href) {
					if (href && href.charAt(0) === '#')
						GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(href));
					else	
						this.addEventListener('mousedown', function (event) {
							var key = /Win/.test(window.navigator.platform) ? event.ctrlKey : event.metaKey;
						
							GlobalPage.message('anonymousNewTab', key || event.which === 2 ? 1 : 0);
						
							setTimeout(function () {
								GlobalPage.message('anonymousNewTab', 0);
							}, 1000);
						}, true);
				}.bind(anchor, href));
		}
	},

	frame: function (frame) {
		var frame = frame.target ? frame.target : frame;

		if (!['FRAME', 'IFRAME']._contains(frame.nodeName))
			return false;

		var id = frame.getAttribute('id'),
				token = frame.getAttribute('data-jsbFrameProcessed');

		if (Utilities.Token.valid(token, 'FrameProcessed'))
			return;

		frame.setAttribute('data-jsbFrameProcessed', Utilities.Token.create('FrameProcessed', true));

		if (!id || !id.length)
			frame.setAttribute('id', Utilities.id());

		frame.addEventListener('load', function () {						
			this.contentWindow.postMessage({
				command: 'requestFrameURL',
				data: {
					id: this.id
				}
			}, '*');
		}, false);
	},

	keyUp: function (event) {
		if (event.ctrlKey && event.altKey && event.which === 74)
			GlobalPage.message('openPopover');
	}
};

function onElementProcessed (kind, element, source) {
	ifSetting('showPlaceholder', [kind])
		.then(function () {
			createPlaceholder(element, source);
		}, function () {
			if (element.parentNode)
				element.parentNode.removeChild(element);
		})
		.catch(function (error) {
			LogError(error);
		})
		.finally(function () {
			kind = element = source = undefined;
		});
};

function processUnblockableElement (kind, element) {
	if (!element.getAttribute('src') || element.src.length < 1) {
		if (element.innerHTML.length && !Utilities.Token.valid(element.getAttribute('data-jsbUnblockable'), element.innerHTML)) {
			var kindStore = unblockedItems.getStore(kind);

			element.setAttribute('data-jsbUnblockable', Utilities.Token.create(element.innerHTML, true));

			if (Utilities.Token.valid(element.getAttribute('data-jsbAllowAndIgnore'), 'AllowAndIgnore', true)) {
				element.removeAttribute('data-jsbAllowAndIgnore');

				ifSetting('hideInjected', false)
					.then(function (element) {
						kindStore.get('all', [], true).push(element.innerHTML);
					}.bind(null, element));
			} else
				kindStore.get('all', [], true).push(element.innerHTML);
			
			if (BLOCKABLE[element.nodeName][1])
				onElementProcessed(kind, element, 1);
		}
	}

	sendPage();
};

function canLoadResource (event, excludeFromPage, meta) {
	if (event.type === 'DOMNodeInserted' && event.target.src)
		return;

	var element = event.target ? event.target : event;

	if (!(element.nodeName in BLOCKABLE))
		return true;

	var source = Utilities.URL.getAbsolutePath(event.url ? event.url : element.getAttribute('src')),
			sourceHost = (source && source.length) ? Utilities.URL.extractHost(source) : null,
			kind = BLOCKABLE[element.nodeName][0];

	if (!Utilities.Token.valid(element.getAttribute('data-jsbAllowLoad'), 'AllowLoad')) {
		if (kind in staticActions) {
			if (!staticActions[kind] && event.preventDefault)
				event.preventDefault();

			return staticActions[kind];
		} else if (event.target) {
			if (!sourceHost && element.nodeName !== 'OBJECT') {
				source = 'about:blank';
				sourceHost = 'blank';
			} else if (!sourceHost)
				return true;

			if (Utilities.Token.valid(element.getAttribute('data-jsbAllowAndIgnore'), 'AllowAndIgnore', true)) {
				element.removeAttribute('data-jsbAllowAndIgnore');

				ifSetting('hideInjected', false)
					.then(function (kind, element) {
						unblockedItems.getStore(kind).get('all', [], true)
							.push('JSB Injected Script (' + element.getAttribute('data-jsbInjectedScript') + '): ' + element.src);

						sendPage();
					}.bind(null, kind, element));

				return true;
			}

			if (element.nodeName._endsWith('FRAME'))
				element.setAttribute('data-jsbFrameURL', source);

			if (event.unblockable)
				var canLoad = {
					isAllowed: true,
					action: -1
				}
			else
				var canLoad = GlobalCommand('canLoadResource', {
					kind: kind,
					pageLocation: page.location,
					source: source,
					isFrame: !Utilities.Page.isTop
				});
			
			var stateItems = (canLoad.isAllowed || !event.preventDefault) ? allowedItems : blockedItems,
					kindStore = stateItems.getStore(kind);

			if (!canLoad.isAllowed && event.preventDefault)
				event.preventDefault();

			if (canLoad.action === -85) {
				staticActions[kind] = canLoad.isAllowed;

				sendPage();

				return canLoad.isAllowed;
			}

			Utilities.setImmediateTimeout(function (meta, element, excludeFromPage, canLoad, kindStore, source, event, sourceHost, kind) {
				if (!meta && ['EMBED', 'OBJECT', 'FRAME', 'IFRAME']._contains(element.nodeName))
					meta = element.getAttribute('type');

				if (excludeFromPage !== true || canLoad.action >= 0) {
					kindStore.get('all', [], true).push({
						source: source,
						ruleAction: canLoad.action,
						unblockable: !!event.unblockable,
						meta: meta
					});
			
					kindStore.getStore('hosts').increment(sourceHost);
				}

				if (BLOCKABLE[element.nodeName][1] && !canLoad.isAllowed)
					onElementProcessed(kind, element, source);

				sendPage();
			}, [meta, element, excludeFromPage, canLoad, kindStore, source, event, sourceHost, kind]);
			
			return canLoad.isAllowed;
		} else if ((!source || source.length === 0) && !event.target) {
			Utilities.setImmediateTimeout(processUnblockableElement, [kind, element]);

			return true;
		}
	} else {
		Utilities.Token.expire(element.getAttribute('data-jsbAllowLoad'));

		if (element === event && Utilities.Token.valid(element.getAttribute('data-jsbWasPlaceholder'), 'Placeholder')) {
			Utilities.Token.expire(element.getAttribute('data-jsbWasPlaceholder'));
		
			element.removeAttribute('data-jsbWasPlaceholder');
			element.setAttribute('data-jsbAllowLoad', Utilities.Token.create('AllowLoad'));
		}

		sendPage();

		return true;
	}
};


if (!globalInfo('disabled')) {
	if (Utilities.safariBuildVersion > 535) {
		var observer = new WebKitMutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === 'childList') {
					var node;

					for (var i = 0; i < mutation.addedNodes.length; i++) {
						node = mutation.addedNodes[i];

						if (node.nodeName === 'A')
							Handler.anchor(node);
						else if (BLOCKABLE[node.nodeName]) {
							if (node.nodeName === 'IFRAME' || node.nodeName === 'FRAME')
								Handler.frame(node);

							if (!node.src)
								canLoadResource(node);
						}
					}
				}
			});
		});

		observer.observe(document, {
			childList: true,
			subtree: true
		});
	} else {
		document.addEventListener('DOMNodeInserted', Handler.frame, true);
		document.addEventListener('DOMNodeInserted', Handler.anchor, true);
		document.addEventListener('DOMNodeInserted', canLoadResource, true);
	}

	document.addEventListener('contextmenu', Handler.contextMenu, false);
	document.addEventListener('DOMContentLoaded', Handler.DOMContentLoaded, true);
	document.addEventListener('visibilitychange', Handler.visibilityChange, true);
	document.addEventListener('keyup', Handler.keyUp, true);
	document.addEventListener('beforeload', canLoadResource, true);

	window.addEventListener('hashchange', Handler.hash, true);

	window.onerror = function (d, p, l, c) {
		if (typeof p === 'string' && p._contains('JavaScriptBlocker')) {
			var errorMessage =  d + ', ' + p + ', ' + l;

			LogError(errorMessage);
		}
	};
}
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

if(false) {
Handler.globalMessageReceived = function (event) {
	if (event.message)
		try {
			event.message = JSON.parse(event.message);
		} catch (e) {}

	switch (event.name) {
		case 'setting':
			settings[event.message[0]] = event.message[1];
		break;

		case 'notification':
			if (Utilities.Page.isTop) {
				if (event.message[1] === 'JavaScript Blocker Update') {
					if (window.showedUpdateNotification)
						break;
					else
						window.showedUpdateNotification = 1;
				}

				Special.executeAction('alert_dialogs', {
					strings: { 'Alert': _('Alert'), 'Close': _('Close'), 'via frame': _('via frame') },
					data: [event.message[0], event.message[1], 1, event.message[2]]
				});
			}
		break;

		case 'topHandler':
			if (Utilities.Page.isTop) {				
				document.dispatchEvent(new CustomEvent(TOKEN.TOP + TOKEN.EVENT, {
					detail: {
						token: TOKEN.injectedScript.genericSpecial,
						topHandler: event.message
					}
				}));
			}
		break;

		case 'commanderCallback':
			sendCallback(event.message.key, event.message.callback, event.message.result);
		break;

		case 'executeMenuCommand':
			if (event.message.pageToken === TOKEN.PAGE)
				sendCallback(event.message.scriptToken, event.message.callback, {});
		break;

		case 'loadElementsOnce':
			var pls = document.querySelectorAll('.jsblocker-placeholder');
	
			for (var i = 0; pls[i]; i++) {
				var ev = document.createEvent('MouseEvents');
				
				ev.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

				pls[i].dispatchEvent(ev);
			}
		break;
	}
};
}
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

function DeepInject (name, script) {
	if (typeof name !== 'string')
		name = '';

	this.name = name.replace(/([^a-zA-Z_0-9])/g, '_');
	this.fnName = this.name;
	this.script = script;
	this.scriptString = script.toString();
	this.id = Utilities.Token.create(this.name);

	this.prepare();
};

DeepInject.useURL = true;
DeepInject.fnHeaderRegExp = /(function +)(\(([^\)]+)?\))/;

DeepInject.prototype.anonymize = function () {
	this.fnName = '';

	this.prepare();
};

DeepInject.prototype.prepare = function () {
	var self = this,
			header =  this.scriptString.substr(0, this.scriptString.indexOf('{')),
			inner = this.scriptString.substring(header.length + 1, this.scriptString.lastIndexOf('}'));

	header = header.replace(DeepInject.fnHeaderRegExp, function (complete, fn, argString) {
		return 'function ' + self.fnName + ' ' + argString + ' {';
	});

	this.pieces = {
		args: {},
		header: header,
		inner: inner.replace(/^\n|\s+$/g, '').split(/\n/g)
	};

	this.setArguments();
};

DeepInject.cleanLine = function (script) {
	if (typeof script !== 'string')
		throw new TypeError('script is not a string');

	if (!script._endsWith(';'))
		script += ';';

	return script;
};

DeepInject.prototype.setHeader = function (header) {
	this.pieces.header = ['function ', this.fnName, ' (', header.join(', '), ')', ' {'].join('');

	return this;
};

DeepInject.prototype.setArguments = function (args) {
	if (!args)
		this.pieces.args = {};
	else if (typeof args === 'object') {
		this.setHeader(Object.keys(args));

		for (var arg in args)
			this.pieces.args[arg] = typeof args[arg] === 'undefined' ? null : args[arg];
	}

	return this;
};

DeepInject.prototype.inner = function () {
	return this.pieces.inner.join("\n");
};

DeepInject.prototype.asFunction = function () {
	return [this.pieces.header, "\n", this.inner(), "\n", '}'].join('');
};

DeepInject.prototype.executable = function () {
	var str;

	var args = [];

	for (var arg in this.pieces.args) {
		try {
			str = JSON.stringify(this.pieces.args[arg]);

			if (typeof str === 'undefined')
				throw new Error;
			
			args.push(JSON.stringify(this.pieces.args[arg]));
		} catch (error) {
			args.push(this.pieces.args[arg]);
		}
	}

	return ['(', this.asFunction(), ')(', args.join(', '), ')'].join('');
};

DeepInject.prototype.prepend = function (script) {
	if (Array.isArray(script)) {
		for (var i = 0; i < script.length; i++)
			this.prepend(script[i]);

		return this;
	}

	this.pieces.inner.unshift(DeepInject.cleanLine(script));

	return this;
};

DeepInject.prototype.append = function (script) {
	if (Array.isArray(script)) {
		for (var i = 0; i < script.length; i++)
			this.append(script[i]);

		return this;
	}

	this.pieces.inner.push(DeepInject.cleanLine(script));

	return this;
};

DeepInject.prototype.injectable = function (useURL) {
	if (this.__injectable)
		return this.__injectable;

	var executable = this.executable(),
			scriptElement = document.createElement('script');

	scriptElement.id = 'jsb-injected-' + Utilities.id();

	scriptElement.setAttribute('data-jsbAllowAndIgnore', Utilities.Token.create('AllowAndIgnore'));
	scriptElement.setAttribute('data-jsbInjectedScript', this.name);

	if (useURL) {
		var URL = window.URL || window.webkitURL;

		if (window.Blob && URL) {
			var url = URL.createObjectURL(new Blob([executable], {
				type: 'text/javascript'
			}));
		} else
			var url = 'data:text/javascript,' + encodeURI(executable);

		scriptElement.src = url;

		scriptElement.onload = function () {
			// document.documentElement.removeChild(this);

			URL.revokeObjectURL(url);
		};
	} else
		scriptElement.appendChild(document.createTextNode(executable));

	this.__injectable = scriptElement;

	return scriptElement;
};

DeepInject.prototype.inject = function (useURL) {
	var injectable = this.injectable(typeof useURL === 'boolean' ? useURL : DeepInject.useURL);

	if (document.documentElement.firstChild)
		document.documentElement.insertBefore(injectable, document.documentElement.firstChild);
	else
		document.documentElement.appendChild(injectable);

	// if (!DeepInject.useURL)
		// document.documentElement.removeChild(injectable);
};
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

TOKEN.INJECTED = {};
TOKEN.REGISTERED = {};

var Special = {
	__injected: [],

	enabled: {},

	isEnabled: function (special) {
		return (this.enabled.hasOwnProperty(special) && this.enabled[special] !== false);
	},

	JSBCommanderHandler: function (event) {		
		var pieces = event.type.split(':');

		event.detail.sourceID = pieces[1];
		event.detail.sourceName = TOKEN.INJECTED[pieces[1]];

		var response = Command.perform(event);

		if (response instanceof Error)
			return;

		var action = (response && response.command) ? 'JSBCommander' : 'JSBCallback';

		var newEvent = new CustomEvent([action, (response && response.sourceID || event.detail.sourceID), TOKEN.EVENT].join(':'), {
			detail: response
		});

		document.dispatchEvent(newEvent);

		return response;
	},

	injectHelpers: function (deepInject, helpers) {
		if (deepInject.script.ignoreHelpers)
			return deepInject;

		if (helpers.__cache)
			return deepInject.prepend(helpers.__cache);

		var deepHelper,
				helperScript,
				prepend;

		var cache = [];

		for (var helper in helpers) {
			deepHelper = helpers[helper];
			helperScript = new DeepInject(helper, deepHelper, true);

			if (deepHelper.args)
				helperScript.setArguments(deepHelper.args);

			prepend = deepHelper.args ? helperScript.executable() : helperScript.asFunction();

			cache.unshift(prepend);

			deepInject.prepend(prepend);
		}

		Object.defineProperty(helpers, '__cache', {
			value: cache.join(";\n")
		});

		return deepInject;
	},

	setup: function (deepInject) {
		if (deepInject.name === 'preserveCrucialDefaults')
			var JSB = {
				eventToken: TOKEN.EVENT
			};
		else
			var JSB = {
				eventCallback: {},
				commandGeneratorToken: Utilities.Token.create('commandGeneratorToken'),
				eventToken: TOKEN.EVENT,
				sourceID: deepInject.id,
				name: deepInject.name,
				data: deepInject.script.data,
				value: deepInject.script.value
			};

		deepInject.setArguments({
			JSB: JSB
		});

		document.addEventListener(['JSBCommander', deepInject.id, TOKEN.EVENT].join(':'), this.JSBCommanderHandler, true);

		return deepInject;
	},

	inject: function (name, useURL) {
		if (!this.specials.hasOwnProperty(name))
			throw new Error('special not found.');

		if (typeof useURL === 'undefined' && this.__injected._contains(name))
			return;

		var special = new DeepInject(name, this.specials[name]);

		this.injectHelpers(special, this.helpers);
		this.setup(special);

		this.__injected.push(name);

		TOKEN.INJECTED[special.id] = special.name;

		special.inject(useURL);

		if (typeof useURL === 'undefined')
			blockedItems.getStore('special').get('all', [], true).push({
				source: name,
				ruleAction: -1
			});
	},

	begin: function () {
		this.inject('preserveCrucialDefaults', false);
		this.inject('preserveCrucialDefaults', true);

		this.inject('inlineScriptsCheck', false);

		this.enabled = GlobalCommand('enabledSpecials', {
			location: page.location,
			isFrame: page.isFrame
		});

		for (var special in this.enabled) {
			if (this.enabled[special] === false)
				allowedItems.getStore('special').get('all', [], true).push({
					source: special,
					ruleAction: -1
				});
			else if (this.specials[special]) {
				this.specials[special].value = this.enabled[special].value;

				this.inject(special);
			}
		}
	},

	helpers: {
		executeCallback: function (sourceID, callbackID, result) {
			messageExtension('executeCommanderCallback', {
				sourceID: sourceID,
				callbackID: callbackID,
				result: result
			});
		},

		executeLocalCallback: function (callbackID, result) {
			try {
				var callback = JSB.eventCallback[callbackID];

				callback.fn(result);

				if (!callback.preserve)
					delete JSB.eventCallback[callbackID];
			} catch (error) {}
		},

		messageTopExtension: function (command, meta, callback) {
			messageExtension('messageTopExtension', {
				command: command,
				meta: {
					args: meta,
					meta: meta.meta
				},
				callback: typeof callback === 'function' ? callback.toString() : null
			});
		},

		registerCallback: function (fn, preserve) {
			if (typeof fn !== 'function')
				return null;

			var id = Math.random().toString(36);

			JSB.eventCallback[id] = {
				fn: fn,
				preserve: preserve
			}

			return id;
		},		

		messageExtension: function (command, meta, callback, preserve) {
			JSBCommander({
				commandToken: JSB.commandGeneratorToken,
				command: 'commandGeneratorToken'
			}, {
				command: command
			}, function (detail) {
				JSB.commandGeneratorToken = detail.commandGeneratorToken;

				if (detail.command)
					JSBCommander(detail, meta, callback, preserve);
			});
		},

		JSBCustomEvent: function (event, params) {
			params = params || {
				bubbles: false,
				cancelable: false,
				detail: undefined
			};

			var evt = window[JSB.eventToken].document$createEvent('CustomEvent');

			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);

			return evt;
		},

		JSBCallbackSetup: function (event) {
			window[JSB.eventToken].document$removeEventListener(['JSBCallback', JSB.sourceID, JSB.eventToken].join(':'), JSBCallbackSetup, true);
			window[JSB.eventToken].document$addEventListener(['JSBCallback', JSB.sourceID, JSB.eventToken].join(':'), JSBCallbackHandler, true);

			messageExtension('registerDeepInjectedScript', null, function (result) {
				window[JSB.eventToken].document$removeEventListener(['JSBCallback', JSB.sourceID, JSB.eventToken].join(':'), JSBCallbackHandler, true);

				Object.defineProperty(JSB, 'sourceID', {
					value: result.newSourceID
				});

				window[JSB.eventToken].document$addEventListener(['JSBCallback', JSB.sourceID, JSB.eventToken].join(':'), JSBCallbackHandler, true);
			});
		},

		JSBCallbackHandler: function (event) {
			if (!event.detail)
				return;

			if (event.detail.perform) {
				try {
					var perform = new Function('return ' + event.detail.perform);

					return perform()(event.detail.result, executeCallback.bind(null, event.detail.sourceID), messageExtension);
				} catch (error) {
					return console.log('FAIL')
				}
			}

			executeLocalCallback(event.detail.callbackID, event.detail.result);
		},

		JSBCommander: function (detail, meta, callback, preserve) {
			var callbackID = registerCallback(callback, preserve);

			window[JSB.eventToken].document$dispatchEvent(new JSBCustomEvent(['JSBCommander', JSB.sourceID, JSB.eventToken].join(':'), {
				detail: {
					commandToken: detail.commandToken,
					command: detail.command,
					callbackID: callbackID ? callbackID : null,
					viaFrame: window.top !== window,
					meta: meta
				}
			}));
		}
	}
};

Special.helpers.JSBCallbackSetup.args = {};
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

Special.specials = {
	inlineScriptsCheck: function () {
		messageExtension('inlineScriptsAllowed');
	},

	preserveCrucialDefaults: function () {
		if (window[JSB.eventToken])
			return;
		
		Object.defineProperty(window, JSB.eventToken, {
			value: Object.freeze({
				window$addEventListener: window.addEventListener.bind(window),
				window$removeEventListener: window.removeEventListener.bind(window),
				document$addEventListener: document.addEventListener.bind(document),
				document$removeEventListener: document.removeEventListener.bind(document),
				document$createEvent: document.createEvent.bind(document),
				document$dispatchEvent: document.dispatchEvent.bind(document)
			})
		});
	},

	zoom: function () {
		window[JSB.eventToken].document$addEventListener('DOMContentLoaded', function () {
			document.body.style.setProperty('zoom', JSB.value + '%', 'important');
		}, true);
	},

	window_resize: function () {
		var windowOpen = window.open;

		window.resizeBy = function () {};
		window.resizeTo = function () {};
		window.moveTo = function () {};

		window.open = function (URL, name, specs, replace) {
			return windowOpen(URL, name, undefined, replace);
		};
	},

	contextmenu_overrides: function () {
		var stopPropagation = function (event) {
			event.stopImmediatePropagation();
			event.stopPropagation();
		};

		var stopMouseDown = function (event) {
			if (event.which && event.which === 3)
				stopPropagation(event);
		};

		var blockContextMenuOverrides = function () {
			window.oncontextmenu = null;
			document.oncontextmenu = null;
			
			window[JSB.eventToken].window$removeEventListener('contextmenu', stopPropagation);
			window[JSB.eventToken].window$removeEventListener('mousedown', stopMouseDown);
			window[JSB.eventToken].document$removeEventListener('contextmenu', stopPropagation);
			window[JSB.eventToken].document$removeEventListener('mousedown', stopMouseDown);
			
			window[JSB.eventToken].window$addEventListener('contextmenu', stopPropagation, true);
			window[JSB.eventToken].window$addEventListener('mousedown', stopMouseDown, true);
			window[JSB.eventToken].document$addEventListener('contextmenu', stopPropagation, true);
			window[JSB.eventToken].document$addEventListener('mousedown', stopMouseDown, true);
		};
		
		setInterval(blockContextMenuOverrides, 20000);
		
		blockContextMenuOverrides();
	},

	autocomplete_disabler: function () {
		var build = JSB.data;

		function withNode(node) {
			if (node.nodeName === 'INPUT')
				node.setAttribute('autocomplete', 'on');
		}

		window[JSB.eventToken].document$addEventListener('DOMContentLoaded', function () {
			var inputs = document.getElementsByTagName('input');
			
			for (var i = 0; i < inputs.length; i++)
				withNode(inputs[i]);
		}, true);

		if (build >= 536) {
			var observer = new WebKitMutationObserver(function (mutations) {
				mutations.forEach(function (mutation) {
					if (mutation.type === 'childList')
						for (var i = 0; i < mutation.addedNodes.length; i++)
							withNode(mutation.addedNodes[i]);
				});
			});

			observer.observe(document, {
				childList: true,
				subtree: true
			});
		} else
			window[JSB.eventToken].document$addEventListener('DOMNodeInserted', function (event) {
				withNode(event.target);
			}, true);
	}
};

Special.specials.autocomplete_disabler.data = Utilities.safariBuildVersion;
Special.specials.preserveCrucialDefaults.ignoreHelpers = true;

Special.begin();
"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

var UserScript = {
	menuCommand: {},

	injectWhenLoaded: function (script) {
		document.addEventListener('DOMContentLoaded', function (script, event) {
			UserScript.inject(script);
		}.bind(null, script), false);
	},

	inject: function (script, excludeFromPage) {
		var attributes = script.attributes;

		if (typeof attributes.script === 'string') {
			try {
				attributes.script = (new Function('return function () {' + attributes.script + '}'))();
			} catch (error) {
				return LogError(['unable to inject user script', attributes.meta.name], error);
			}
		}

		if (typeof attributes.script !== 'function')
			return LogError(['user script did not transform into a function', attributes.meta.name]);

		var userScript = new DeepInject(attributes.meta.name, attributes.script);

		userScript.anonymize();

		Special.injectHelpers(userScript, this.helpers);
		Special.injectHelpers(userScript, Special.helpers);

		var setup = new DeepInject('userScriptSetup', function (info, resources) {
			unsafeWidnow = window;
			
			GM_info = info;
			GM_resources = resources;
		});

		setup.setArguments({
			info: {
				scriptMetaStr: attributes.metaStr,
				scriptWillUpdate: attributes.autoUpdate,
				version: null,
				script: attributes.meta
			},
			resources: script.resources || {}
		});

		userScript.prepend([setup.executable(), 'var unsafeWindow, GM_info, GM_resources;']);

		TOKEN.INJECTED[userScript.id] = userScript.name;

		Special.setup(userScript).inject();

		if (script.before && DeepInject.useURL)
			console.warn('This page does not allow inline scripts.', attributes.meta.name, 'may not function as expected.');

		if (excludeFromPage !== true)
			allowedItems.getStore('user_script').get('all', [], true).push({
				source: attributes.meta.trueNamespace,
				ruleAction: -1
			});
	},

	begin: function () {
		var url,
				requirement;

		var enabledUserScripts = GlobalCommand('enabledUserScripts', {
			location: page.location,
			isFrame: page.isFrame
		});

		for (var userScript in enabledUserScripts) {	
			if (enabledUserScripts[userScript] === false)
				blockedItems.getStore('user_script').get('all', [], true).push({
					source: userScript,
					ruleAction: -1
				});
			else {
				if (enabledUserScripts[userScript].requirements) {
					for (url in enabledUserScripts[userScript].requirements) {
						requirement = enabledUserScripts[userScript].requirements[url];

						UserScript.inject({
							before: true,
							attributes: {
								script: Utilities.decode(requirement.data),
								meta: {
									name: ['Requirement', userScript, url].join()
								}
							}
						}, true);
					}
				}

				if (enabledUserScripts[userScript].attributes.before)
					UserScript.inject(enabledUserScripts[userScript]);
				else
					UserScript.injectWhenLoaded(enabledUserScripts[userScript]);
			}
		}
	},

	helpers: {
		GM_getValue: function (key, defaultValue) {
			var value = window.localStorage.getItem(GM_info.script.trueNamespace + key);

			return value === null ? (defaultValue !== undefined ? defaultValue : null) : value;
		},
		GM_setValue: function (key, value) {
			window.localStorage.setItem(GM_info.script.trueNamespace + key, value);
		},
		GM_deleteValue: function (key) {
			window.localStorage.removeItem(GM_info.script.trueNamespace + key);
		},
		GM_listValues: function () {
			return Object.keys(window.localStorage).filter(function (key) {
				return key.indexOf(GM_info.script.trueNamespace) === 0;
			});		
		},

		// RESOURCES
		GM_getResourceText: function (name) {
			return GM_resources[name] ? atob(GM_resources[name].data) : '';
		},
		GM_getResourceURL: function (name) {
			if (!GM_resources[name])
				return '';

			if (window.Blob) {
				var URL = window.URL || window.webkitURL,
						text = GM_getResourceText(name),
						textArray = new Array(text.length);

				for (var i = 0; i < text.length; i++)
					textArray[i] = text.charCodeAt(i);

				return URL.createObjectURL(new Blob([new Uint8Array(textArray)], {
					type: GM_resources[name].type
				}));
			} else
				return 'data:' + GM_resources[name].type + ';base64,' + GM_resources[name].data;
		},

		// OTHER
		GM_addStyle: function (css) {
			var style = document.createElement('style');

			style.setAttribute('type', 'text/css');

			style.innerHTML = css;

			if (document.head) {
				document.head.appendChild(style);
			} else {
				document.documentElement.appendChild(style);
			}
		},

		GM_log: function () {
			console.debug.apply(console, arguments);
		},

		GM_openInTab: function (url) {
			messageExtension('openInTab', url);
		},

		GM_registerMenuCommand: function (caption, fn, accessKey) {
			messageExtension('registerMenuCommand', {
				caption: GM_info.script.name + ' - ' + caption
			}, fn, true);
		},

		GM_setClipboard: function () { },

		NOT_IMPLEMENTED_GM_xmlhttpRequest: function (details) {
			var key,
					stringed;

			var serializable = {},
					anchor = document.createElement('a');

			for (key in details)
				try {
					stringed = JSON.stringify(details[key]);

					if (typeof stringed !== 'undefined')
						serializable[key] = details[key];
				} catch (e) {}

			anchor.href = serializable.url;
			serializable.url = anchor.href;

			messageExtension('XMLHttpRequest', {
				details: serializable
			}, function (result) {
				if (result.action === 'XHRComplete') {
					delete JSB.eventCallback[result.callback];

					details = serializable = anchor = key = stringed = undefined;
				}	else if (result.action in details)
					details[result.action](result.response);
			}, true);
		}
	}
};

UserScript.begin();
