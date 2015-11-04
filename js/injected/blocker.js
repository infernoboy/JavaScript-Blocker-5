/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/


// Sometimes the global page isn't ready when a page is loaded. This can happen
// when Safari is first launched or after reloading the extension. This loop
// ensures that it is ready before allowing the page to continue loading.
var globalSetting;

do {
	try {
		globalSetting = GlobalCommand('globalSetting');
	} catch (e) {
		throw new Error('content blocker mode.');
	}

	if (!globalSetting.popoverReady && window === window.top) {
		window.location.reload();

		throw new Error('...');
	}
} while (globalSetting.command || !globalSetting.popoverReady);

if (!window.MutationObserver)
	window.MutationObserver = window.WebKitMutationObserver;

var BLOCKED_ELEMENTS = [],
		PLACEHOLDER_ELEMENTS = {},
		FRAMED_PAGES = {},
		STYLESHEET_INJECTED = false,
		PARENT = {},
		RECOMMEND_PAGE_RELOAD = false,
		SHOWED_UPDATE_PROMPT = false,
		BROKEN = false,
		FRAME_ELEMENT = null;

if (!Utilities.Page.isTop)
	FRAME_ELEMENT = window.frameElement;

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

var TopPage = {
	info: null
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
			GlobalPage.message('bounce', {
				command: 'getFrameInfoWithID',
				detail: {
					targetPageID: PARENT.parentPageID,
					id: Page.info.id
				}
			});
		};

		requestFrameInfo.timeout = null;

		return function sendPage (now) {
			Handler.onDocumentVisible(function () {
				try {
					var fn = Page.info.isFrame ? requestFrameInfo : sendPageInfo;

					clearTimeout(fn.timeout);

					if (now)
						fn();
					else
						fn.timeout = setTimeout(fn, 150);
				} catch (error) {
					if (!BROKEN) {
						BROKEN = true;

						console.error('JS Blocker broke due to a Safari bug. Reloading the page should fix things.', error.message);
					}
				}
			});
		}
	})(),

	info: {
		id: TOKEN.PAGE,
		blockFirstVisitStatus: {},
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
					var resourceID = Utilities.Token.generate();

					this.getStore(kind).getStore('source').getStore(Page.info.location).getStore(source).set(resourceID, data);

					return resourceID;
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

	checkPageType: function () {
		if (BLOCKED_ELEMENTS.length === 1 && ['VIDEO', 'EMBED']._contains(BLOCKED_ELEMENTS[0].nodeName.toUpperCase())) {
			Handler.injectStylesheet();

			Element.restorePlaceholderElement(BLOCKED_ELEMENTS[0].getAttribute('data-jsbPlaceholder'));
		}
	},

	setPageLocation: function () {
		if (FRAME_ELEMENT && FRAME_ELEMENT.getAttribute('data-jsbParentHost')) {
			TopPage.info = {
				location: FRAME_ELEMENT.getAttribute('data-jsbParentLocation'),
				host: FRAME_ELEMENT.getAttribute('data-jsbParentHost'),
				protocol: FRAME_ELEMENT.getAttribute('data-jsbParentProtocol')
			};
		}

		if (Utilities.Page.isAbout && FRAME_ELEMENT && TopPage.info) {
			Page.info.location = TopPage.info.location;
			Page.info.host = TopPage.info.host;
			Page.info.protocol = TopPage.info.protocol;
		} else {
			Page.info.location = Utilities.Page.getCurrentLocation();
			Page.info.host = Utilities.Page.isAbout ? document.location.href.substr(document.location.protocol.length) : (document.location.host || 'blank'),
			Page.info.protocol = document.location.protocol;
		}

		Page.info.locations = [Page.info.location];
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

	injectStylesheet: function () {
		if (STYLESHEET_INJECTED)
			return;

		STYLESHEET_INJECTED = true;

		var style = Element.createFromObject('link', {
			rel: 'stylesheet',
			type: 'text/css',
			href: globalSetting.contentURLs.stylesheet.url,
			'data-jsbAllowAndIgnore': Utilities.Token.create('AllowAndIgnore')
		});

		document.documentElement.appendChild(style);

		setTimeout(function () {
			Handler.visibilityChange();

			Handler.event.trigger('stylesheetLoaded', null, true);
		}, 50);
	},

	DOMContentLoaded: function () {
		var i;

		var scripts = document.getElementsByTagName('script'),
				anchors = document.getElementsByTagName('a'),
				forms = document.getElementsByTagName('form'),
				iframes = document.getElementsByTagName('iframe'),
				frames = document.getElementsByTagName('frame');

		for (i = scripts.length; i--;)
			if (!Element.triggersBeforeLoad(scripts[i]) && globalSetting.showUnblockedScripts)
				setTimeout(function (script) {
					Element.processUnblockable('script', script, true);
				}, 10 * i, scripts[i]);

		for (i = anchors.length; i--;)
			Element.handle.anchor(anchors[i]);

		for (i = iframes.length; i--;)
			Element.handle.frame(iframes[i]);

		for (i = frames.length; i--;)
			Element.handle.frame(frames[i]);

		if (globalSetting.blockReferrer && false) {
			var method;

			for (var i = forms.length; i--;) {
				method = forms[y].getAttribute('method');

				if (method && method.toLowerCase() === 'post')
					GlobalPage.message('cannotAnonymize', Utilities.URL.getAbsolutePath(forms[i].getAttribute('action')));
			}
		}

		Utilities.Timer.timeout('injectStylesheet', function () {
			Handler.injectStylesheet();
		}, 400);
	},

	resetLocation: function (event) {
		Handler.setPageLocation();

		Page.send();
	},

	hashChange: function (event) {
		Handler.setPageLocation();

		if (Page.info.isFrame)
			GlobalPage.message('bounce', {
				command: 'rerequestFrameURL',
				detail: {
					parent: PARENT,
					reason: 'hashDidChange'
				}
			});

		Page.send();
	},

	visibilityChange: function (event) {
		if (!document.hidden)
			Handler.event.trigger('documentBecameVisible');
	},

	onDocumentVisible: function (fn) {
		if (document.hidden)
			Handler.event.addMissingCustomEventListener('documentBecameVisible', fn, true);
		else
			fn();
	},

	contextMenu: function (event) {
		var menuCommands = Object.keys(UserScript.menuCommand);

		if (menuCommands.length && (event.target instanceof HTMLElement)) {
			var contextMenuTarget = Utilities.Token.generate();

			event.target.setAttribute('data-jsbContextMenuTarget', contextMenuTarget);

			setTimeout(function (element) {
				if (element)
					element.removeAttribute('data-jsbContextMenuTarget');
			}, 3000, event.target);
		} else
			var contextMenuTarget = null;

		Events.setContextMenuEventUserInfo(event, {
			pageID: Page.info.id,
			menuCommand: UserScript.menuCommand,
			placeholderCount: document.querySelectorAll('.jsb-element-placeholder').length,
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

	showBlockedAllFirstVisitNotification: function (detail, viaFrame) {
		if (Page.info.isFrame || Utilities.Page.isXML || (detail.targetPageID && detail.targetPageID !== Page.info.id))
			return;

		var host = detail.host,
				trustDomain = false,
				hostDisplay = host._startsWith('.') ? host.substr(1) : host,
				hostTitle = viaFrame ? _('via_frame') + ' - ' + hostDisplay : hostDisplay;

		var notification = new PageNotification({
			id: Utilities.encode(hostTitle),
			closeAllID: 'first-visit',
			highPriority: true,
			title: _('first_visit.title'),
			subTitle: hostTitle,
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

		ignoreButton.classList.add('jsb-color-blocked');

		var unblockButton = notification.addCloseButton(_('first_visit.unblock'), function (notification) {
			notification.hide();

			GlobalCommand('unblockFirstVisit', host);

			if (trustDomain)
				GlobalCommand('unblockFirstVisit', detail.domain);

			Utilities.Timer.timeout('FirstVisitReload', function () {
				window.location.reload();
			}, 1200);
		});

		unblockButton.classList.add('jsb-color-allowed');

		if (!host._startsWith('.')) {
			var hasOption = unblockButton.nextElementSibling;

			hasOption.classList.remove('jsb-hidden');

			notification
				.addCustomEventListener('optionKeyStateChange', function (event) {
					trustDomain = event.detail;

					unblockButton.value = _(event.detail ? 'first_visit.unblock_domain' : 'first_visit.unblock');

					hasOption.classList.toggle('jsb-hidden', event.detail);
				});
		}

		notification
			.addEventListener('click', 'a.jsb-show-more', function () {
				var p = document.createElement('p');

				p.innerHTML = _('first_visit.unblock_more_info');

				this.parentNode.parentNode.appendChild(p);

				this.parentNode.removeChild(this);
			}, true);
	}
};

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

	createPlaceholder: function (kind, element, source) {
		if (!element.parentNode)
			return LogDebug('unable to create placeholder for element because it does not have a parent', element);

		var placeholderTemplate = GlobalCommand('template.create', {
			template: 'injected',
			section: 'element-placeholder',
			data: {
				kind: kind,
				nodeName: element.nodeName.toUpperCase(),
				source: source
			}
		});

		var cssValue;

		var elementParent = element.parentNode,
				height = element.offsetHeight - 1,
				width = element.offsetWidth,
				elementStyle = window.getComputedStyle(element, null),
				placeholder = Utilities.Element.createFromHTML(placeholderTemplate)[0],
				placeholderToken = Utilities.Token.create('ElementPlaceholder');

		PLACEHOLDER_ELEMENTS[placeholderToken] = {
			element: element,
			elementParent: elementParent,
			placeholder: placeholder
		};

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
					width: width + 'px',
					visibility: 'hidden'
				};

		Element.setCSS(placeholder, true, properties);

		Element.setCSS(kindString, true, {
			height: '100px',
			width: '100%'
		});

		placeholder.title = kind + ' - ' + source;

		element.setAttribute('data-jsbPlaceholder', placeholderToken);
		placeholder.setAttribute('data-jsbPlaceholder', placeholderToken);

		placeholder.addEventListener('click', function (event) {
			if (event.offsetX === 0 && event.offsetY === 0)
				return Log('Potential fake click detected.');

			Element.restorePlaceholderElement(this.getAttribute('data-jsbPlaceholder'));
		}, true);

		var collapsedElement = Element.collapse(element);

		elementParent.replaceChild(placeholder, collapsedElement);

		kindString.style.setProperty('line-height', (placeholder.offsetHeight - 2) + 'px', 'important');

		Utilities.Element.fitFontWithin(placeholder, kindString);

		Handler.event.addCustomEventListener('stylesheetLoaded', function (placeholder) {
			placeholder.style.setProperty('visibility', 'visible', 'important');

			Utilities.Element.repaint(placeholder);
		}.bind(null, placeholder), true);
	},

	restorePlaceholderElement: function (placeholderID) {
		var placeholder = PLACEHOLDER_ELEMENTS[placeholderID];

		if (!placeholder)
			return;

		placeholder.element.setAttribute('data-jsbAllowLoad', Utilities.Token.create('AllowLoad'));

		placeholder.elementParent.replaceChild(placeholder.element, placeholder.placeholder);

		delete PLACEHOLDER_ELEMENTS[placeholderID];
	},

	restorePlaceholderElements: function () {
		for (var placeholderID in PLACEHOLDER_ELEMENTS)
			Element.restorePlaceholderElement(placeholderID);
	},

	collapse: function (element) {
		var div = document.createElement('div');

		div.style.setProperty('display', 'none', 'important');

		element.parentNode.replaceChild(div, element);

		return div;
	},

	shouldIgnore: function (element) {
		return Utilities.Token.valid(element.getAttribute('data-jsbAllowAndIgnore'), 'AllowAndIgnore', true)
	},

	triggersBeforeLoad: function (element) {
		var nodeName = element.nodeName.toUpperCase(),
				elementBased = ['SCRIPT', 'FRAME', 'IFRAME', 'EMBED', 'OBJECT', 'VIDEO', 'IMG']._contains(nodeName);

		if (!elementBased)
			return false;

		if (element.data && nodeName === 'OBJECT')
			return true;

		return !!(element.src || element.srcset) || ['FRAME', 'IFRAME']._contains(nodeName);
	},

	processUnblockable: function (kind, element, doesNotTrigger) {
		if (kind === 'script' && (Special.isEnabled('inline_script_execution') || !globalSetting.showUnblockedScripts))
			return false;

		if (kind === 'embed')
			var content = element.outerHTML;
		else
			var content = element.innerHTML || element.src || element.outerHTML || element.textContent;

		if (!Utilities.Token.valid(element.getAttribute('data-jsbUnblockable'), element)) {			
			element.setAttribute('data-jsbUnblockable', Utilities.Token.create(element));

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
					Page.unblocked.pushSource(kind, content, {
						action: -1
					});
			} else
				Page.unblocked.pushSource(kind, content, {
					action: -1
				});

			Page.send();

			return true;
		}

		return false;
	},

	afterCanLoad: function (meta, element, excludeFromPage, canLoad, source, event, sourceHost, kind) {
		var nodeName = element.nodeName.toUpperCase();

		if (!canLoad.isAllowed)
			BLOCKED_ELEMENTS.push(element);

		if (!(meta instanceof Object))
			meta = {};

		if (nodeName._endsWith('FRAME')) {
			meta.id = element.id;

			if (element.srcdoc)
				meta.srcdoc = element.srcdoc;

			element.setAttribute('data-jsbFrameURL', source);
			element.setAttribute('data-jsbFrameURLToken', Utilities.Token.create(source + 'FrameURL', true));
		}

		var actionStore = event.unblockable ? Page.unblocked : ((canLoad.isAllowed || !event.preventDefault) ? Page.allowed : Page.blocked);

		sourceHost = sourceHost || ((source && source.length) ? Utilities.URL.extractHost(source) : null);

		if (['EMBED', 'OBJECT']._contains(nodeName))
			meta.type = element.getAttribute('type');

		if (excludeFromPage !== true || canLoad.action >= 0) {
			actionStore.pushSource(kind, source, {
				action: canLoad.action,
				unblockable: !!event.unblockable,
				meta: meta
			});

			actionStore.incrementHost(kind, sourceHost);
		}

		if (BLOCKABLE[nodeName][1] && !canLoad.isAllowed)
			Element.hide(kind, element, source);

		Page.send();
	},

	requestFrameURL: function (frame, reason, force) {
		if (!(frame instanceof HTMLElement) && (!force || Utilities.Token.valid(frame.getAttribute('jsbShouldSkipLoadEventURLRequest'), 'ShouldSkipLoadEventURLRequest', true)))
			return;

		if (!frame.contentWindow)
			return LogError('frame does not have a window', frame);

		setTimeout(function (frame, reason) {
			if (frame && frame.contentWindow)
				frame.contentWindow.postMessage({
					command: 'requestFrameURL',
					data: {
						id: frame.id,
						host: Page.info.host,
						pageID: Page.info.id,
						parentPageID: PARENT.pageID,
						reason: reason,
						token: Utilities.Token.create(frame.id)
					}
				}, '*');
			}, 2000, frame, reason)
	},

	handle: {
		node: function (node, i) {
			var nodeName = node.nodeName.toUpperCase();

			if (nodeName === 'A')
				setTimeout(function (node) {
					Element.handle.anchor(node);
				}, 10 * (i || 1), node);
			else if (BLOCKABLE[nodeName]) {
				if (nodeName._endsWith('FRAME'))
					Element.handle.frame(node);

				setTimeout(function (node) {
					var kind = BLOCKABLE[nodeName][0];

					if (globalSetting.enabledKinds[kind] && !Element.triggersBeforeLoad(node))
						Element.processUnblockable(kind, node, true);
				}, 10 * (i || 1), node);
			}
		},

		anchor: function (anchor) {
			var hasTarget = typeof anchor.target !== 'string';

			anchor = (hasTarget && anchor.target) || anchor;

			var isAnchor = anchor.nodeName.toUpperCase() && anchor.nodeName.toUpperCase() === 'A';

			if (hasTarget && !isAnchor) {
				if (anchor.querySelectorAll) {
					var anchors = anchor.querySelectorAll('a', anchor);

					for (var i = 0, b = anchors.length; i < b; i++)
						Element.handle.anchor(anchors[i]);
				}

				return false;
			}

			if (isAnchor && !Utilities.Token.valid(anchor.getAttribute('data-jsbAnchorPrepared'), 'AnchorPrepared')) {
				var href = anchor.getAttribute('href'),
						absoluteHref = Utilities.URL.getAbsolutePath(href);

				if (!anchor.title && Special.isEnabled('anchor_titles'))
					anchor.title = absoluteHref;

				anchor.setAttribute('data-jsbAnchorPrepared', Utilities.Token.create('AnchorPrepared', true));

				if (Special.isEnabled('simple_referrer')) {
					if (href && href.length && href.charAt(0) !== '#')
						if ((!anchor.getAttribute('rel') || !anchor.getAttribute('rel').length))
							anchor.setAttribute('rel', 'noreferrer');
				}

				if (globalSetting.blockReferrer && false)
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
					id = frame.getAttribute('id'),
					sandbox = frame.getAttribute('sandbox');

			if (sandbox && !sandbox._contains('allow-scripts')) {
				frame.setAttribute('data-jsbFrameSandbox', sandbox);
				frame.setAttribute('sandbox', sandbox + ' allow-scripts');
			}

			if (!id || !id.length)
				frame.setAttribute('id', (id = 'frame-' + Utilities.Token.generate()));

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

		var element = event.target || event,
				nodeName = element.nodeName.toUpperCase();

		if (nodeName === 'LINK' && !Element.shouldIgnore(element)) {
			Utilities.Timer.resetTimeout('injectStylesheet', 400);

			return true;
		}

		if (!(nodeName in BLOCKABLE) || (nodeName === 'EMBED' && element.parentNode.nodeName.toUpperCase() === 'OBJECT'))
			return true;

		var kind = BLOCKABLE[nodeName][0];

		if (kind === 'frame') {
			element.setAttribute('data-jsbParentLocation', Page.info.location);
			element.setAttribute('data-jsbParentHost', Page.info.host);
			element.setAttribute('data-jsbParentProtocol', Page.info.protocol);
		}

		if (!globalSetting.enabledKinds[kind] || globalSetting.disabled)
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
					if (nodeName !== 'OBJECT') {
						source = 'about:blank';
						sourceHost = 'blank';
					} else
						return true;
				}

				if (Utilities.Token.valid(element.getAttribute('data-jsbBeforeLoadProcessed'), source))
					return true;

				if (Element.shouldIgnore(element))
					return Element.processUnblockable(kind, element);

				if (event.unblockable)
					var canLoad = {
						isAllowed: true,
						action: -3
					}
				else if (document.hidden && Page.info.isFrame && Page.info.protocol === 'about:') {
					LogDebug('blocked source from loading within blank frame because the document was hidden when it loaded and the frame\'s parent address could not reliably be determined: ' + source);

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
						isFrame: Page.info.isFrame
					});

				if (canLoad.action === -85)
					Resource.staticActions[kind] = canLoad;

				if (!canLoad.isAllowed && event.preventDefault)
					event.preventDefault();
				else if (nodeName === 'SCRIPT')
					Utilities.Timer.resetTimeout('injectStylesheet', 400);

				element.setAttribute('data-jsbBeforeLoadProcessed', Utilities.Token.create(source));

				Utilities.setImmediateTimeout(Element.afterCanLoad, [meta, element, excludeFromPage, canLoad, source, event, sourceHost, kind]);

				return canLoad.isAllowed;
			}
		} else {
			Utilities.Token.expire(element.getAttribute('data-jsbAllowLoad'));

			return true;
		}
	}
};

// if (globalSetting.debugMode)
Handler.contentURLsToBlob();

Handler.setPageLocation();

document.addEventListener('visibilitychange', Handler.visibilityChange, true);

if (!globalSetting.disabled) {
	if (Page.info.location)
		var JSBSupport = GlobalCommand('canLoadResource', {
			kind: 'disable',
			strict: true,
			pageLocation: Page.info.location,
			pageProtocol: Page.info.protocol,
			source: '*',
			isFrame: Page.info.isFrame
		});
	else
		var JSBSupport = {
			isAllowed: true,
			action: -1
		};

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
	} else {
		if (Page.info.isFrame) {
			var frameState = GlobalCommand('canLoadResource', {
				getPageLocationFromTab: true,
				kind: 'frame',
				source: window.location.href,
				isFrame: false
			});

			if (!frameState.isAllowed && frameState.action >= 0) {
				Page.info.frameBlocked = frameState;

				for (var nodeName in BLOCKABLE)
					Resource.staticActions[BLOCKABLE[nodeName][0]] = {
						isAllowed: false,
						action: -16
					};

				Page.send();
			}
		}

		var blockFirstVisitStatus = GlobalCommand('blockFirstVisitStatus', Page.info.host);

		Page.info.blockFirstVisitStatus = blockFirstVisitStatus;

		setTimeout(function (blockFirstVisitStatus) {
			Page.info.blockFirstVisitStatus = blockFirstVisitStatus;

			if (blockFirstVisitStatus.blocked) {
				if (blockFirstVisitStatus.action !== 8 && window.globalSetting.showBlockFirstVisitNotification) {
					Handler.event.addCustomEventListener('readyForPageNotifications', function () {
						if (Page.info.isFrame)
							GlobalPage.message('bounce', {
								command: 'showBlockedAllFirstVisitNotification',
								detail: {
									targetPageID: PARENT.parentPageID,
									host: blockFirstVisitStatus.host,
									domain: blockFirstVisitStatus.domain
								}
							});
						else
							Handler.showBlockedAllFirstVisitNotification({
								targetPageID: Page.info.id,
								host: blockFirstVisitStatus.host,
								domain: blockFirstVisitStatus.domain
							});
					}, true);
				}
			}
		}, 500, blockFirstVisitStatus);

		var observer = new MutationObserver(function (mutations) {
			var i,
					j;

			for (i = mutations.length; i--;) {
				for (j = mutations[i].addedNodes.length; j--;)
					Element.handle.node(mutations[i].addedNodes[j], i + j);
			}
		});

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});

		document.addEventListener('contextmenu', Handler.contextMenu, true);
		document.addEventListener('keyup', Handler.keyUp, true);
		document.addEventListener('beforeload', Resource.canLoad, true);
		document.addEventListener('DOMContentLoaded', Handler.DOMContentLoaded, true);

		window.addEventListener('load', Handler.injectStylesheet, true)

		window.addEventListener('error', function (event) {
			if (typeof event.filename === 'string' && event.filename._contains('JavaScriptBlocker')) {
				var errorMessage =  event.message + ', ' + event.filename + ', ' + event.lineno;

				LogError(errorMessage);
			}
		});

		if (Page.info.isFrame)
			window.addEventListener('beforeunload', Handler.unloadedFrame, true);

		setTimeout(Handler.checkPageType, 1000);
	}
} else {
	Page.info.disabled = {
		action: -1
	};

	Page.info.blockFirstVisitStatus = {
		blocked: false,
		action: -1
	};

	if (!Page.info.isFrame)
		Page.send();
}

document.addEventListener('beforeload', Resource.canLoad, true);

window.addEventListener('hashchange', Handler.hashChange, true);
window.addEventListener('popstate', Handler.resetLocation, true);
