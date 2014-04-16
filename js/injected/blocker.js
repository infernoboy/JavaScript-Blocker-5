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
	state: new Store(TOKEN.PAGE),
	location: Utilities.Page.getCurrentLocation(),
	host: Utilities.Page.isBlank ? 'blank' : (document.location.host || 'blank'),
	isFrame: !Utilities.Page.isTop
};

var allowedItems = page.state.getStore('allowed'),
		blockedItems = page.state.getStore('blocked'),
		unblockedItems = page.state.getStore('unblocked');

var globalSetting = (function () {
	var infoCache = new Store('GlobalSetting', {
		defaultValue: GlobalCommand('globalSetting')
	});

	return function globalSetting (infoKey, bypassCache) {
		if (typeof infoKey !== 'string')
			throw new TypeError(infoKey + ' is not a string');

		var info = infoCache.get(infoKey);

		if (info && (info.cache || bypassCache === true))
			return info.value;
		else
			return infoCache.set(infoKey, GlobalCommand('globalSetting', infoKey)).get(infoKey).value;
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
					return reject(TypeError(checkSettings[i] + ' is not a string'));

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
	var stringCache = new Store('Strings');

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

	return function sendPage () {
		clearTimeout(timeout);

		timeout = setTimeout(function () {
			try {
				if (!document.hidden)
					GlobalPage.message('receivePage', page);
			} catch(error) {
				if (!broken) {
					broken = true;

					LogError('JavaScript Blocker broke due to a Safari bug. Reloading the page should fix things.', error);
				}
			}
		}, 100);
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
			if (!Element.triggersBeforeLoad(scripts[i]))
				Element.processUnblockable('script', scripts[i]);

		for (i = 0, b = anchors.length; i < b; i++)
			Element.handle.anchor(anchors[i]);

		for (i = 0, b = iframes.length; i < b; i++)
			Element.handle.frame(iframes[i]);

		for (i = 0, b = frames.length; i < b; i++)
			Element.handle.frame(frames[i]);

		ifSetting('blockReferrer', true)
			.then(function (forms) {
				var method;

				for (var i = 0, b = forms.length; i < b; i++) {
					method = forms[y].getAttribute('method');

					if (method && method.toLowerCase() === 'post')
						GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(forms[i].getAttribute('action')));
				}
			}.bind(null, forms))
			.finally(sendPage);
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

	keyUp: function (event) {
		if (event.ctrlKey && event.altKey && event.which === 74)
			GlobalPage.message('openPopover');
	}
};

var Element = {
	hide: function (kind, element, source) {
		ifSetting('showPlaceholder', [kind])
			.then(function () {
				createPlaceholder(element, source);
			}, function () {
				Element.collapse(element);
			})
			.catch(function (error) {
				LogError(error);
			})
			.finally(function () {
				kind = element = source = undefined;
			});
	},

	collapse: function (element) {		
		var collapsible = ['height', 'width', 'padding', 'margin'];

		for (var i = 0; i < collapsible.length; i++)
			element.style.setProperty(collapsible[i], 0, 'important');

		element.style.setProperty('display', 'none', 'important');
		element.style.setProperty('visibility', 'hidden', 'important');
	},

	shouldIgnore: function (element) {
		return Utilities.Token.valid(element.getAttribute('data-jsbAllowAndIgnore'), 'AllowAndIgnore', true)
	},

	triggersBeforeLoad: function (element) {
		var elementBased = ['SCRIPT', 'FRAME', 'IFRAME', 'EMBED', 'OBJECT', 'VIDEO', 'IMG']._contains(element.nodeName);

		if (!elementBased)
			return false;

		return !!(element.src || element.srcset);
	},

	processUnblockable: function (kind, element) {
		if (!Utilities.Token.valid(element.getAttribute('data-jsbUnblockable'), element)) {
			var kindStore = unblockedItems.getStore(kind),
					hideInjected = ifSetting('hideInjected', false);

			element.setAttribute('data-jsbUnblockable', Utilities.Token.create(element, true));

			if (Element.triggersBeforeLoad(element))
				hideInjected.then(function (element) {
					allowedItems.getStore(kind).get('all', [], true).push({
						source: element.src || element.srcset,
						ruleAction: -1,
						unblockable: true,
						meta: {
							injected: true,
							name: element.getAttribute('data-jsbInjectedScript')
						}
					});
				}.bind(null, element));
			else if (Element.shouldIgnore(element)) {
				element.removeAttribute('data-jsbAllowAndIgnore');

				hideInjected.then(function (element) {
					kindStore.get('all', [], true).push(element.innerHTML);
				}.bind(null, element));
			} else
				kindStore.get('all', [], true).push(element.innerHTML);

			sendPage();
				
			return true;
		}

		return false;
	},

	handle: {
		node: function (node) {
			var node = node.target || node;

			if (node.nodeName === 'A')
				Element.handle.anchor(node);
			else if (BLOCKABLE[node.nodeName]) {
				if (node.nodeName === 'IFRAME' || node.nodeName === 'FRAME')
					Element.handle.frame(node);

				var kind = BLOCKABLE[node.nodeName][0];

				if (globalSetting('enabledKinds')[kind] && !Element.triggersBeforeLoad(node))
					Element.processUnblockable(kind, node);
			}
		},

		anchor: function (anchor) {
			var hasTarget = !!anchor.target;

			anchor = anchor.target || anchor;

			var isAnchor = anchor.nodeName && anchor.nodeName === 'A';
			
			if (hasTarget && !isAnchor) {
				if (anchor.querySelectorAll) {
					var anchors = anchor.querySelectorAll('a', anchor);

					for (var i = 0, b = anchors.length; i < b; i++)
						Element.handle.anchor(anchors[i]);
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
			var frame = frame.target || frame,
					id = frame.getAttribute('id');

			if (!id || !id.length)
				frame.setAttribute('id', (id = Utilities.id()));
			
			var idToken = frame.getAttribute('data-jsbFrameProcessed');

			if (Utilities.Token.valid(idToken, id))
				return;

			frame.setAttribute('data-jsbFrameProcessed', Utilities.Token.create(id, true));

			frame.addEventListener('load', function () {						
				this.contentWindow.postMessage({
					command: 'requestFrameURL',
					data: {
						id: this.id
					}
				}, '*');
			}, false);
		}
	}
};

function canLoadResource (event, excludeFromPage, meta) {
	if (event.type === 'DOMNodeInserted' && event.target.src)
		return;

	var element = event.target || event;

	if (!(element.nodeName in BLOCKABLE))
		return true;

	var kind = BLOCKABLE[element.nodeName][0];

	if (!globalSetting('enabledKinds')[kind])
		return true;

	var source = Utilities.URL.getAbsolutePath(event.url || element.getAttribute('src')),
			sourceHost = (source && source.length) ? Utilities.URL.extractHost(source) : null;

	if (!Utilities.Token.valid(element.getAttribute('data-jsbAllowLoad'), 'AllowLoad')) {
		if (kind in staticActions) {
			if (!staticActions[kind] && event.preventDefault)
				event.preventDefault();

			return staticActions[kind];
		} else {
			if (!sourceHost && element.nodeName !== 'OBJECT') {
				source = 'about:blank';
				sourceHost = 'blank';
			} else if (!sourceHost)
				return true;

			if (Element.shouldIgnore(element))
				return Element.processUnblockable(kind, element);

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
					Element.hide(kind, element, source);

				sendPage();
			}, [meta, element, excludeFromPage, canLoad, kindStore, source, event, sourceHost, kind]);
			
			return canLoad.isAllowed;
		}
	} else {
		Utilities.Token.expire(element.getAttribute('data-jsbAllowLoad'));

		if (element === event && Utilities.Token.valid(element.getAttribute('data-jsbWasPlaceholder'), 'WasPlaceholder', true)) {		
			element.removeAttribute('data-jsbWasPlaceholder');
			element.setAttribute('data-jsbAllowLoad', Utilities.Token.create('AllowLoad'));
		}

		sendPage();

		return true;
	}
};

if (!globalSetting('disabled')) {
	if (Utilities.safariBuildVersion > 535) {
		var observer = new WebKitMutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === 'childList')
					for (var i = 0; i < mutation.addedNodes.length; i++)
						Element.handle.node(mutation.addedNodes[i]);
			});
		});

		observer.observe(document, {
			childList: true,
			subtree: true
		});
	} else
		document.addEventListener('DOMNodeInserted', Element.handle.node, true);

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
