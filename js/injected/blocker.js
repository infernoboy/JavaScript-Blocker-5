if (document.hidden === undefined)
	document.hidden = false;

if (!window.CustomEvent)
	(function () {
		function CustomEvent (event, params) {
			params = params || { bubbles: false, cancelable: false, detail: undefined };
			var evt = document.createEvent('CustomEvent');
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			return evt;
		};

		window.CustomEvent = CustomEvent;
	})();

if (!window.MutationObserver)
	window.MutationObserver = window.WebKitMutationObserver;

var BLOCKED_ELEMENTS = [],
		FRAMED_PAGES = {},
		FRAME_ID_ON_PARENT = null,
		RECOMMEND_PAGE_RELOAD = false,
		SHOWED_UPDATE_PROMPT = false,
		BROKEN = false;

var TOKEN = {
	PAGE: Utilities.Token.create('Page'),
	EVENT: Utilities.Token.generate(),
};

var BLOCKABLE = {
	SCRIPT: ['script'],
	FRAME: ['frame', true],
	IFRAME: ['frame', true],
	EMBED: ['embed', true],
	OBJECT: ['embed', true],
	VIDEO: ['video', true],
	IMG: ['image', true],
	XHR_POST: ['xhr_post'],
	XHR_PUT: ['xhr_put'],
	XHR_GET: ['xhr_get']
};

var Page = {
	send: (function () {
		function sendPageInfo () {
			GlobalPage.message('receivePage', Page.info);

			for (var framePageID in FRAMED_PAGES)
				GlobalPage.message('receivePage', FRAMED_PAGES[framePageID]);
		};

		sendPageInfo.timeout = null;

		function requestFrameInfo () {
			window.top.postMessage({
				command: 'getFrameInfoWithID',
				data: Page.info.id
			}, '*');
		};

		requestFrameInfo.timeout = null;

		var fn;

		return function sendPage (now) {
			try {
				if (!document.hidden) {
					fn = Page.info.isFrame ? requestFrameInfo : sendPageInfo;

					clearTimeout(fn.timeout);

					if (now)
						fn();
					else
						fn.timeout = setTimeout(fn, 150);
				} else
					Handler.event.addCustomEventListener('documentBecameVisible', Page.send.bind(window, now), true);
			} catch (error) {
				if (!BROKEN) {
					BROKEN = true;

					console.error('JavaScript Blocker broke due to a Safari bug. Reloading the page should fix things.', error.message);
				}
			}
		}
	})(),

	info: {
		id: TOKEN.PAGE,
		state: new Store(TOKEN.PAGE, {
			ignoreSave: true
		}),
		isFrame: !Utilities.Page.isTop
	}
};

(function () {
	var result = ['allowed', 'blocked', 'unblocked'];

	for (var i = 0; i < result.length; i++) {
		Page[result[i]] = Page.info.state.getStore(result[i]);

		Object.defineProperties(Page[result[i]], {
			pushSource: {
				value: function (kind, source, data) {
					this.getStore(kind).getStore('source').getStore(Page.info.location).getStore(source).set(Utilities.Token.generate(), data);
				}.bind(Page[result[i]])
			},

			incrementHost: {
				value: function (kind, host) {
					this.getStore(kind).getStore('hosts').increment(host);
				}.bind(Page[result[i]])
			},

			decrementHost: {
				value: function (kind, host) {
					this.getStore(kind).getStore('hosts').decrement(host);
				}.bind(Page[result[i]])
			},
		});
	}
})();

// Sometimes the global page isn't ready when a page is loaded. This can happen
// when Safari is first launched or after reloading the extension. This loop
// ensures that it is ready before allowing the page to continue loading.
var globalSetting;

do
	globalSetting = GlobalCommand('globalSetting');
while (globalSetting.command);

var _ = (function () {
	var strings = {};

	return function _ (string, args) {
		if (Array.isArray(args) || !strings.hasOwnProperty(string))
			strings[string] = GlobalCommand('localize', {
				string: string,
				args: args
			});

		return strings[string];
	}
})();

var Handler = {
	event: new EventListener,

	setPageLocation: function () {
		Page.info.location = Utilities.Page.getCurrentLocation();
		Page.info.host = Utilities.Page.isAbout ? document.location.href.substr(document.location.protocol.length) : (document.location.host || 'blank'),
		Page.info.protocol = document.location.protocol;
	},

	unloadedFrame: function () {
		Page.send(true);
	},

	contentURLsToBlob: function () {
		if (globalSetting.contentURLs.BLOBIFIED)
			return;

		var URL = window.webkitURL || window.URL || {};

		if (window.Blob && URL.createObjectURL) {
			var base64,
					uri;

			for (var key in globalSetting.contentURLs) {
				uri = globalSetting.contentURLs[key].url;

				uri = Utilities.decode(uri.substr(uri.indexOf(',') + 1));

				globalSetting.contentURLs[key].url = Utilities.URL.createFromContent(uri, globalSetting.contentURLs[key].type);
			}
		}

		globalSetting.contentURLs.BLOBIFIED = true;
	},

	injectStyleSheet: function () {
		var style = Element.createFromObject('link', {
			rel: 'stylesheet',
			type: 'text/css',
			href: globalSetting.contentURLs.stylesheet.url
		});

		document.documentElement.appendChild(style);

		setTimeout(function () {
			Handler.event.trigger('stylesheetLoaded', null, true);
		}, 50);
	},

	DOMContentLoaded: function () {
		var i,
				b;

		Handler.injectStyleSheet();

		var scripts = document.getElementsByTagName('script'),
				anchors = document.getElementsByTagName('a'),
				forms = document.getElementsByTagName('form'),
				iframes = document.getElementsByTagName('iframe'),
				frames = document.getElementsByTagName('frame');

		for (i = 0, b = scripts.length; i < b; i++)
			if (!Element.triggersBeforeLoad(scripts[i]))
				Element.processUnblockable('script', scripts[i], true);

		for (i = 0, b = anchors.length; i < b; i++)
			Element.handle.anchor(anchors[i]);

		for (i = 0, b = iframes.length; i < b; i++)
			Element.handle.frame(iframes[i]);

		for (i = 0, b = frames.length; i < b; i++)
			Element.handle.frame(frames[i]);

		if (globalSetting.blockReferrer) {
			var method;

			for (var i = 0, b = forms.length; i < b; i++) {
				method = forms[y].getAttribute('method');

				if (method && method.toLowerCase() === 'post')
					GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(forms[i].getAttribute('action')));
			}
		}

		Handler.visibilityChange();
	},

	resetLocation: function (event) {
		Handler.setPageLocation();

		Page.send();
	},

	hashChange: function (event) {
		Handler.setPageLocation();

		if (Page.info.isFrame)
			window.parent.postMessage({
				command: 'rerequestFrameURL',
				data: {
					id: FRAME_ID_ON_PARENT,
					reason: {
						hashDidChange: true
					}
				}
			}, '*');

		Page.send();
	},

	visibilityChange: function (event, sendNow) {
		if (!document.hidden) {
			Handler.event.trigger('documentBecameVisible');

			Page.send(sendNow);
		}
	},

	contextMenu: function (event) {
		if (event.target instanceof HTMLElement) {
			var contextMenuTarget = Utilities.Token.generate();

			event.target.setAttribute('data-jsbContextMenuTarget', contextMenuTarget);
		} else
			var contextMenuTarget = null;

		Events.setContextMenuEventUserInfo(event, {
			pageID: Page.info.id,
			menuCommand: UserScript.menuCommand,
			placeholders: document.querySelectorAll('.jsblocker-placeholder').length,
			contextMenuTarget: contextMenuTarget
		});
	},

	keyUp: function (event) {
		if (event.ctrlKey && event.altKey && event.which === 74)
			GlobalPage.message('showPopover');
	},

	blockedHiddenPageContent: function (event) {
		GlobalPage.message('bounce', {
			command: 'recommendPageReload'
		});
	},

	shouldCheckBlockFirstVisit: function () {
		return ['http:', 'https:', 'safari-extension:']._contains(Page.info.protocol);
	},

	showBlockedAllFirstVisitNotification: function (host, viaFrame) {
		if (!Utilities.Page.isTop)
			return;

		var hostDisplay = viaFrame ? _('via_frame') + ' - ' + host : host;

		var notification = new PageNotification({
			id: Utilities.encode(hostDisplay),
			closeAllID: 'first-visit',
			highPriority: true,
			title: _('first_visit.title'),
			subTitle: hostDisplay,
			body: GlobalCommand('template.create', {
				template: 'injected',
				section: 'first-visit',
				data: {
					isDomain: host.charAt(0) === '.'
				}
			})
		});

		var ignoreButton = notification.addCloseButton(_('first_visit.keep_blocked'), function (notification) {
			GlobalPage.message('noFirstVisitNotification', host);
		});

		ignoreButton.classList.add('jsb-color-block');

		var unblockButton = notification.addCloseButton(_('first_visit.unblock'), function (notification) {
			GlobalCommand('unblockFirstVisit', host);

			Utilities.Timer.timeout('FirstVisitReload', function () {
				window.location.reload();
			}, 1200);
		});

		unblockButton.classList.add('jsb-color-allow');
	}
};

if (globalSetting.debugMode)
	Handler.contentURLsToBlob();

var Element = {
	__placeholderProperties: ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'clear', 'float', 'vertical-align', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', '-webkit-margin-before-collapse', '-webkit-margin-after-collapse'],
	__collapsibleProperties: ['height', 'width', 'padding', 'margin'],

	setCSS: function (element, important, properties) {
		for (var key in properties)
			element.style.setProperty(key, properties[key], important && 'important');
	},

	createFromObject: function (tag, object) {
		var element = document.createElement(tag);

		for (var key in object)
			element.setAttribute(key, object[key]);

		return element;
	},

	createFromHTML: function (html) {
		var div = document.createElement('div');

		div.innerHTML = html;

		return div.childNodes;
	},

	prependTo: function (container, element, append) {
		if (!append && container.firstChild)
			container.insertBefore(element, container.firstChild);
		else
			container.appendChild(element);
	},

	inject: function (element, append) {
		Element.prependTo(document.documentElement, element, append);
	},

	remove: function (element) {
		if (element && element.parentNode)
			return element.parentNode.removeChild(element);

		return element;
	},

	hide: function (kind, element, source) {
		if (globalSetting.showPlaceholder[kind]) {
			Element.createPlaceholder(kind, element, source);
		} else
			Element.collapse(element);
	},

	repaint: function (element) {
		var display = element.style.display;

		element.style.setProperty('display', 'none', 'important');
		element.offsetHeight;
		element.style.setProperty('display', display, 'important');
	},

	createPlaceholder: function (kind, element, source) {
		var placeholderTemplate = GlobalCommand('template.create', {
			template: 'injected',
			section: 'element-placeholder',
			data: {
				kind: kind,
				nodeName: element.nodeName,
				source: source
			}
		});

		var cssValue;

		var height = element.offsetHeight - 1,
				width = element.offsetWidth,
				elementStyle = window.getComputedStyle(element, null),
				placeholder = Element.createFromHTML(placeholderTemplate)[0];

		for (var i = 0; i < Element.__placeholderProperties.length; i++) {
			cssValue = elementStyle.getPropertyValue(Element.__placeholderProperties[i]);

			if (cssValue === 'inline' && Element.__placeholderProperties[i] === 'display')
				cssValue = 'inline-block';
			else if (cssValue === 'static' && Element.__placeholderProperties[i] === 'position')
				cssValue = 'relative';

			placeholder.style.setProperty(Element.__placeholderProperties[i], cssValue, 'important');
		}

		var kindString = placeholder.querySelector('.jsb-element-placeholder-kind'),
				properties = {
					height: height + 'px',
					width: width + 'px'
				};

		Element.setCSS(placeholder, true, properties);

		Element.setCSS(kindString, true, {
			height: '100px',
			width: '100%'
		});

		placeholder.title = kind + ' - ' + source;

		placeholder.addEventListener('click', function (event) {
			if (event.isTrigger)
				return;

			element.setAttribute('data-jsbAllowLoad', Utilities.Token.create('AllowLoad'));

			placeholder.parentNode.replaceChild(element, placeholder);
		}, true);

		element.parentNode.replaceChild(placeholder, element);

		kindString.style.setProperty('line-height', (placeholder.offsetHeight - 2) + 'px', 'important');

		Utilities.Element.fitFontWithin(placeholder, kindString);

		// Avoids flickering when hovering on the placeholder.
		Element.repaint(placeholder);
	},

	collapse: function (element) {
		var div = document.createElement('div');

		div.style.setProperty('display', 'none', 'important');

		element.parentNode.replaceChild(div, element);
	},

	shouldIgnore: function (element) {
		return Utilities.Token.valid(element.getAttribute('data-jsbAllowAndIgnore'), 'AllowAndIgnore', true)
	},

	triggersBeforeLoad: function (element) {
		var elementBased = ['SCRIPT', 'FRAME', 'IFRAME', 'EMBED', 'OBJECT', 'VIDEO', 'IMG']._contains(element.nodeName);

		if (!elementBased)
			return false;

		return !!(element.src || element.srcset) || ['FRAME', 'IFRAME']._contains(element.nodeName);
	},

	processUnblockable: function (kind, element, doesNotTrigger) {
		if (!Utilities.Token.valid(element.getAttribute('data-jsbUnblockable'), element)) {
			element.setAttribute('data-jsbUnblockable', Utilities.Token.create(element, true));

			if (!doesNotTrigger && Element.triggersBeforeLoad(element)) {
				if (!globalSetting.hideInjected)
					Page.allowed.getStore(kind).set(element.src || element.srcset, {
						action: -1,
						unblockable: true,
						meta: {
							injected: true,
							name: element.getAttribute('data-jsbInjectedScript')
						}
					});
			} else if (Element.shouldIgnore(element)) {
				element.removeAttribute('data-jsbAllowAndIgnore');

				if (!globalSetting.hideInjected)
					Page.unblocked.pushSource(kind, element.innerHTML || element.src || element.outerHTML || element.textContent, {});
			} else
				Page.unblocked.pushSource(kind, element.innerHTML || element.src  || element.outerHTML || element.textContent, {});

			Page.send();

			return true;
		}

		return false;
	},

	afterCanLoad: function (meta, element, excludeFromPage, canLoad, source, event, sourceHost, kind) {
		if (!canLoad.isAllowed)
			BLOCKED_ELEMENTS.push(element);

		if (!(meta instanceof Object))
			meta = {};

		if (element.nodeName._endsWith('FRAME')) {
			meta.id = element.id;

			element.setAttribute('data-jsbFrameURL', source);
			element.setAttribute('data-jsbFrameURLToken', Utilities.Token.create(source + 'FrameURL', true));
		}

		var actionStore = (canLoad.isAllowed || !event.preventDefault) ? Page.allowed : Page.blocked;

		sourceHost = sourceHost || ((source && source.length) ? Utilities.URL.extractHost(source) : null);

		if (['EMBED', 'OBJECT']._contains(element.nodeName))
			meta.type = element.getAttribute('type');

		if (excludeFromPage !== true || canLoad.action >= 0) {
			actionStore.pushSource(kind, source, {
				action: canLoad.action,
				unblockable: !!event.unblockable,
				meta: meta
			});

			actionStore.incrementHost(kind, sourceHost);
		}

		if (BLOCKABLE[element.nodeName][1] && !canLoad.isAllowed)
			Element.hide(kind, element, source);

		Page.send();
	},

	requestFrameURL: function (frame, reason, force) {
		if (!(frame instanceof HTMLElement) && (!force || Utilities.Token.valid(frame.getAttribute('jsbShouldSkipLoadEventURLRequest'), 'ShouldSkipLoadEventURLRequest', true)))
			return;

		frame.contentWindow.postMessage({
			command: 'requestFrameURL',
			data: {
				id: frame.id,
				reason: reason,
				token: Utilities.Token.create(frame.id)
			}
		}, '*');
	},

	handle: {
		node: function (node) {
			var node = node.target || node;

			if (node.nodeName === 'A')
				Element.handle.anchor(node);
			else if (BLOCKABLE[node.nodeName]) {
				if (node.nodeName._endsWith('FRAME'))
					Element.handle.frame(node);

				var kind = BLOCKABLE[node.nodeName][0];

				if (globalSetting.enabledKinds[kind] && !Element.triggersBeforeLoad(node))
					Element.processUnblockable(kind, node, true);
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

				if (globalSetting.confirmShortURL)
					anchor.addEventListener('click', function (event) {
						var target = this.getAttribute('target');

						if (target !== '_blank' && target !== '_top' && !GlobalCommand('confirmShortURL', {
							shortURL: this.href,
							pageLocation: Page.info.location
						})) {
							event.preventDefault();
							event.stopPropagation();
						}
					});

				if (globalSetting.blockReferrer)
					if (href && href[0] === '#')
						GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(href));
					else
						anchor.addEventListener('mousedown', function (event) {
							var key = /Win/.test(window.navigator.platform) ? event.ctrlKey : event.metaKey;

							GlobalPage.message('anonymousNewTab', key || event.which === 2 ? 1 : 0);

							setTimeout(function () {
								GlobalPage.message('anonymousNewTab', 0);
							}, 1000);
						}, true);
			}
		},

		frame: function (frame) {
			var frame = frame.target || frame,
					id = frame.getAttribute('id');

			if (!id || !id.length)
				frame.setAttribute('id', (id = Utilities.Token.generate()));

			var idToken = frame.getAttribute('data-jsbFrameProcessed');

			if (Utilities.Token.valid(idToken, id))
				return;

			frame.setAttribute('data-jsbFrameProcessed', Utilities.Token.create(id, true));

			Utilities.Timer.timeout('FrameURLRequestFailed' + frame.id, function (frame) {
				if (BLOCKED_ELEMENTS._contains(frame))
					return;

				var proto = Utilities.URL.protocol(frame.src);

				if (!['data:', 'javascript:']._contains(proto) && document.getElementById(frame.id))
					Resource.canLoad({
						target: frame,
						unblockable: !!frame.src
					}, false, {
						id: frame.id,
						waiting: true
					});
			}, 2000, [frame]);

			try {
				if (frame && frame.contentWindow && frame.contentWindow.document && frame.contentWindow.document.readyState === 'complete') {
					frame.setAttribute('jsbShouldSkipLoadEventURLRequest', Utilities.Token.create('ShouldSkipLoadEventURLRequest'));

					Element.requestFrameURL(frame, undefined, true);
				}
			} catch (e) {}

			frame.addEventListener('load', function (event) {
				Element.requestFrameURL(this);
			}, false);
		}
	}
};

var Resource = {
	staticActions: {},

	canLoad: function (event, excludeFromPage, meta) {
		if (event.type === 'DOMNodeInserted' && Element.triggersBeforeLoad(event.target))
			return;

		var element = event.target || event;

		if (!(element.nodeName in BLOCKABLE))
			return true;

		var kind = BLOCKABLE[element.nodeName][0];

		if (!globalSetting.enabledKinds[kind])
			return true;

		var sourceHost;

		var source = Utilities.URL.getAbsolutePath(event.url || element.getAttribute('src'));

		if (!Utilities.Token.valid(element.getAttribute('data-jsbAllowLoad'), 'AllowLoad')) {
			if (kind in Resource.staticActions) {
				if (!Resource.staticActions[kind].isAllowed && event.preventDefault)
					event.preventDefault();

				Page.send();

				Utilities.setImmediateTimeout(Element.afterCanLoad, [meta, element, excludeFromPage, Resource.staticActions[kind], source, event, sourceHost, kind]);

				return Resource.staticActions[kind];
			} else {
				if (!source || !source.length) {
					if (element.nodeName !== 'OBJECT') {
						source = 'about:blank';
						sourceHost = 'blank';
					} else
						return true;
				}

				if (Element.shouldIgnore(element))
					return Element.processUnblockable(kind, element);

				if (event.unblockable)
					var canLoad = {
						isAllowed: true,
						action: -3
					}
				else if (document.hidden && Page.info.isFrame && Page.info.protocol === 'about:') {
					LogDebug('blocked source from loading within blank frame because the document was hidden when it loaded and the frame\'s parent address could not be determined: ' + source);

					var canLoad = {
						action: -4,
						isAllowed: false
					};

					Handler.event.addMissingCustomEventListener('documentBecameVisible', Handler.blockedHiddenPageContent, true);
				} else
					var canLoad = GlobalCommand('canLoadResource', {
						kind: kind,
						pageLocation: Page.info.location,
						pageProtocol: Page.info.protocol,
						source: source,
						isFrame: !Utilities.Page.isTop
					});

				if (canLoad.action === -85)
					Resource.staticActions[kind] = canLoad;

				if (!canLoad.isAllowed && event.preventDefault)
					event.preventDefault();

				Utilities.setImmediateTimeout(Element.afterCanLoad, [meta, element, excludeFromPage, canLoad, source, event, sourceHost, kind]);

				return canLoad.isAllowed;
			}
		} else {
			Utilities.Token.expire(element.getAttribute('data-jsbAllowLoad'));

			if (element === event && Utilities.Token.valid(element.getAttribute('data-jsbWasPlaceholder'), 'WasPlaceholder', true)) {
				element.removeAttribute('data-jsbWasPlaceholder');
				element.setAttribute('data-jsbAllowLoad', Utilities.Token.create('AllowLoad'));
			}

			Page.send();

			return true;
		}
	}
};

Handler.setPageLocation();

var JSBSupport = GlobalCommand('canLoadResource', {
	kind: 'disable',
	strict: true,
	pageLocation: Page.info.location,
	pageProtocol: Page.info.protocol,
	source: '*',
	isFrame: !Utilities.Page.isTop
});

if (!JSBSupport.isAllowed) {
	globalSetting.disabled = true;

	Page.info.disabled = {
		action: JSBSupport.action
	};
	
	// setTimeout(function () {
	// 	Page.blocked.pushSource('disable', '*', {
	// 		action: JSBSupport.action
	// 	});

	// 	Page.blocked.incrementHost('disable', '*');

	// 	// LogDebug('disabled on this page: ' + Page.info.location);

	// 	Page.send(true);
	// }, 0);
}

document.addEventListener('visibilitychange', Handler.visibilityChange, true);

if (!globalSetting.disabled) {
	if (Handler.shouldCheckBlockFirstVisit()) {
		var willBlockFirstVisit = GlobalCommand('willBlockFirstVisit', Page.info.host);

		if (willBlockFirstVisit && willBlockFirstVisit.action !== 8) {
			Handler.event.addCustomEventListener('readyForPageNotifications', function () {
				if (Page.info.isFrame)
					GlobalPage.message('bounce', {
						command: 'showBlockedAllFirstVisitNotification',
						detail: willBlockFirstVisit.host
					});
				else
					Handler.showBlockedAllFirstVisitNotification(willBlockFirstVisit.host);
			}, true);
		}
	}

	if (Utilities.safariBuildVersion > 535) {
		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++)
				if (mutations[i].type === 'childList')
					for (var j = 0; j < mutations[i].addedNodes.length; j++)
						Element.handle.node(mutations[i].addedNodes[j]);
		});

		observer.observe(document, {
			childList: true,
			subtree: true
		});
	} else
		document.addEventListener('DOMNodeInserted', Element.handle.node, true);

	document.addEventListener('contextmenu', Handler.contextMenu, false);
	document.addEventListener('DOMContentLoaded', Handler.DOMContentLoaded, true);
	document.addEventListener('keyup', Handler.keyUp, true);
	document.addEventListener('beforeload', Resource.canLoad, true);

	window.addEventListener('hashchange', Handler.hashChange, true);
	window.addEventListener('popstate', Handler.resetLocation, true);

	window.addEventListener('error', function (event) {
		if (typeof event.filename === 'string' && event.filename._contains('JavaScriptBlocker')) {
			var errorMessage =  event.message + ', ' + event.filename + ', ' + event.lineno;

			LogError(errorMessage);
		}
	});

	if (Page.info.isFrame)
		window.addEventListener('beforeunload', Handler.unloadedFrame, true);
}
