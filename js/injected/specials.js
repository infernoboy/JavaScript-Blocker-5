/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

Special.specials = {
	prepareScript: function (JSB) {
		if (window[JSB.eventToken])
			return;

		document.documentElement.removeAttribute('data-JSB-CSP-SCRIPTS-ALLOWED');
		
		Object.defineProperty(window, JSB.eventToken, {
			value: Object.freeze({
				console: window.console,
				window$history$pushState: window.history.pushState.bind(window.history),
				window$history$replaceState: window.history.replaceState.bind(window.history),
				window$JSON$stringify: window.JSON.stringify.bind(window.JSON),
				window$JSON$parse: window.JSON.parse.bind(window.JSON),
				window$addEventListener: window.addEventListener.bind(window),
				window$removeEventListener: window.removeEventListener.bind(window),
				document$addEventListener: document.addEventListener.bind(document),
				document$removeEventListener: document.removeEventListener.bind(document),
				document$createEvent: document.createEvent.bind(document),
				document$dispatchEvent: document.dispatchEvent.bind(document)
			})
		});
	},

	historyFixer: function () {
		window.history.pushState = function () {
			if (window.location.href === 'about:blank' && window.top !== window)
				messageTopExtension('performHistoryStateChange', {
					action: 'pushState',
					args: Array.prototype.slice.call(arguments, 0)
				});
			else {
				window[JSB.eventToken].window$history$pushState.apply(window.history, arguments);

				messageExtension('historyStateChange');
			}
		};

		window.history.replaceState = function () {
			if (window.location.href === 'about:blank' && window.top !== window)
				messageTopExtension('performHistoryStateChange', {
					action: 'replaceState',
					args: Array.prototype.slice.call(arguments, 0)
				});
			else {
				window[JSB.eventToken].window$history$replaceState.apply(window.history, arguments);

				messageExtension('historyStateChange');
			}
		};
	},

	inline_script_execution: function () {
		var meta = document.createElement('meta');
		
		meta.setAttribute('http-equiv', 'content-security-policy');
		meta.setAttribute('content', 'script-src *');
		
		if (document.documentElement.firstChild)
			document.documentElement.insertBefore(meta, document.documentElement.firstChild);
		else
			document.documentElement.appendChild(meta);
	},

	alert_dialogs: function () {
		window.alert = function (string) {
			if (typeof string === 'undefined')
				string = 'undefined';
			else if (string === null)
				string = 'null';
			else if (typeof string !== 'string')
				string = string.toString ? string.toString() : '';

			messageTopExtension('notification', {
				title: _localize('Alert'),
				subTitle: document.location.href,
				body: messageExtensionSync('template.create', {
					template: 'injected',
					section: 'javascript-alert',
					data: {
						body: string.replace(/&/g, '&amp;').replace(/</g, '&lt;')
					}
				})
			});
		};
	},

	zoom: function (JSB) {
		document.addEventListener('DOMContentLoaded', function () {
			document.body.style.setProperty('zoom', JSB.value.value + '%', 'important');
		}, true);
	},

	font: function () {
		var style = document.createElement('style');

		style.type = 'text/css';
		style.innerText = '*:not(pre):not(code) { font-family: "' + JSB.value.value + '" !important; }';

		document.documentElement.appendChild(style);
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

	popups: function () {
		var popupCount = 0,
			windowOpen = window.open,
			dispatchEvent = window.HTMLAnchorElement.prototype.dispatchEvent;

		var canLoadPopup = function (URL, untrusted) {
			var a = document.createElement('a');

			a.href = URL;

			var displayURL = (URL === undefined || URL === null) ? 'about:blank' : a.href;

			var info = {
				meta: undefined,
				kind: 'popup',
				source: displayURL,
				canLoad: {}
			};

			a = undefined;

			info.canLoad = messageExtensionSync('canLoadResource', info);

			if (info.canLoad.action < 0 && JSB.value.value.alwaysBlock === 'ask')
				info.canLoad.isAllowed = confirm(_localize('special.popups.confirm' + (untrusted ? '.untrusted' : ''), [displayURL]));

			if (!info.canLoad.isAllowed && info.canLoad.action >= 0 && JSB.value.value.showPopupBlockedNotification && popupCount < 4) {
				popupCount++;

				messageTopExtension('notification', {
					title: _localize('special.popups.notification.title'),
					subTitle: document.location.href,
					body: messageExtensionSync('template.create', {
						template: 'injected',
						section: 'javascript-alert',
						data: {
							body: _localize('special.popups.notification.body' + (popupCount === 4 ? '.further_suppressed' : ''), [displayURL])
						}
					})
				});
			}

			return info;
		};

		var fauxWindow = {
			closed: false
		};

		window.open = function (URL, name, specs, replace) {
			if (['_parent', '_self', '_top'].indexOf(name) > -1)
				return windowOpen(URL, name, specs, replace);
			
			var info = canLoadPopup(URL);

			if (name)
				info.meta = {
					name: name
				};

			if (info.canLoad.isAllowed) {
				messageExtension('page.addAllowedItem', info);

				return windowOpen(URL, name, specs, replace);
			} else {
				messageExtension('page.addBlockedItem', info);

				return fauxWindow;
			}
		};

		window.HTMLAnchorElement.prototype.dispatchEvent = function (event) {
			if (event.type.toLowerCase() === 'click' && this.getAttribute('href') !== '#' && ((this.target && this.target.toLowerCase() === '_blank') || !event.isTrusted)) {
				var info = canLoadPopup(this.href, !event.isTrusted);

				if (info.canLoad.isAllowed) {
					messageExtension('page.addAllowedItem', info);

					return dispatchEvent.call(this, event);
				} else
					messageExtension('page.addBlockedItem', info);
			} else
				return dispatchEvent.call(this, event);
		};
	},

	contextmenu_overrides: function (JSB) {
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
		function withNode(node) {
			if (node.nodeName.toUpperCase() === 'INPUT')
				node.setAttribute('autocomplete', 'on');
		}

		document.addEventListener('DOMContentLoaded', function () {
			var inputs = document.getElementsByTagName('input');
			
			for (var i = 0; i < inputs.length; i++)
				withNode(inputs[i]);
		}, true);

		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++)
				if (mutations[i].type === 'childList')
					for (var j = 0; j < mutations[i].addedNodes.length; j++)
						withNode(mutations[i].addedNodes[j]);
		});

		observer.observe(document, {
			childList: true,
			subtree: true
		});
	},

	xhr_intercept: function () {
		var XHR = {
			open: XMLHttpRequest.prototype.open,
			send: XMLHttpRequest.prototype.send
		};

		var SYNCHRONOUS_ALLOW = '0',
			SYNCHRONOUS_ASK = '2';

		var shouldShowPrompt = JSB.value.value.alwaysBlock === 'ask',
			supportedMethods = ['get', 'post', 'put'],
			openToken = Math.random(),
			openArguments = {};

		function performAction (request, info, args, sendData, awaitPromptResourceID, postParams) {
			var xhrError;

			var detail = openArguments[request[openToken]],
				pageAction = info.canLoad.isAllowed ? 'addAllowedItem' : 'addBlockedItem';

			if (sendData)
				if (detail.method === 'post')
					args[0] = sendData;
				else if (detail.method === 'get') {
					var anchor = document.createElement('a');

					anchor.href = detail.path;

					var newPath = anchor.origin + anchor.pathname + '?' + sendData;

					info.source = newPath;

					XHR.open.call(request, 'GET', newPath);
				}

			if (info.canLoad.isAllowed)
				try {
					XHR.send.apply(request, args);
				} catch (error) {
					xhrError = error;
				}

			setTimeout(function (pageAction, info, detail, postParams) {
				if (info.meta === undefined)
					info.meta = createMetaData(detail, postParams);

				messageExtension('page.' + pageAction, info);
			}.bind(null, pageAction, info, detail, postParams));

			if (awaitPromptResourceID)
				messageExtension('page.modifyBlockedItem', {
					resourceID: awaitPromptResourceID,
					canLoad: {
						action: info.canLoad.isAllowed ? -11 : -6
					}
				});

			if (xhrError) {
				xhrError.JSB_RETHROW = true;
				
				throw xhrError;
			}
		}

		function createMetaData (detail, postParams) {
			var meta;

			if (detail.method === 'get' || detail.method === 'post') {
				var toSend = detail.method === 'post' ? postParams : detail.path.split('?')[1];

				if (typeof toSend === 'string') {
					meta = {
						type: 'query',
						data: {}
					};

					var splitParam,
						paramName,
						paramValue;

					var params = toSend.split(/&/g);

					for (var i = 0; i < params.length; i++) {
						if (!params[i].length)
							continue;

						splitParam = params[i].split('=');

						try {
							paramName = decodeURIComponent(splitParam[0]);
						} catch (error) {
							paramName = splitParam[0];
						}

						if (/pass(word)?/gi.test(paramName))
							paramValue = '******';
						else
							try {
								paramValue = typeof splitParam[1] === 'string' ? decodeURIComponent(splitParam[1]) : null;
							} catch (error) {
								paramValue = splitParam[1];
							}

						meta.data[paramName] = paramValue;
					}
				} else if (toSend instanceof window.Blob) {
					var URL = window.webkitURL || window.URL || {};

					if (typeof URL.createObjectURL === 'function')
						meta = {
							type: 'blob',
							data: URL.createObjectURL(toSend)
						};
				} else if (toSend instanceof window.FormData)
					// There is no way to retrieve the values of a FormData object.
					meta = {
						type: 'formdata',
						data: {}
					};
			}

			return meta;
		}

		XMLHttpRequest.prototype.open = function () {
			var openID = Math.random(),
				path = arguments[1];

			this[openToken] = openID;

			if (path === null)
				path = 'null';
			else if (typeof path !== 'string')
				path = path.toString ? path.toString() : '';

			openArguments[openID] = {
				method: typeof arguments[0] === 'string' ? arguments[0].toLowerCase() : arguments[0],
				path: (arguments[1] && arguments[1].path) ? arguments[1].path : path,
				sync: arguments[2] === false
			};

			XHR.open.apply(this, arguments);
		};

		XMLHttpRequest.prototype.send = function () {
			var detail = openArguments[this[openToken]];

			if (!detail)
				throw new Error('open arguments for ' + this[openToken] + ' was not found.');

			if (supportedMethods.indexOf(detail.method) === -1)
				return XHR.send.apply(this, arguments);

			var kind = 'xhr_' + detail.method,
				postParams = arguments[0],
				awaitPromptResourceID = null,
				info = {
					meta: undefined,
					kind: kind,
					source: detail.path,
					canLoad: {}
				};

			var canLoad = messageExtensionSync('canLoadResource', info);

			try {
				canLoad.isAllowed;
			} catch (error) {
				console.warn('JSB - failed to retrieve canLoadResource response', document);

				canLoad = {
					action: -13,
					isAllowed: true
				};
			}

			info.canLoad = canLoad;

			var isAllowed;

			var self = this,
				args = arguments;

			var shouldPerformAction = (function () {
				if (canLoad.action !== -8 && canLoad.action < 0 && shouldShowPrompt) {
					var onXHRPromptInput = registerCallback(function (result) {
						info.canLoad = {
							action: result.isAllowed ? -5 : -6,
							isAllowed: result.isAllowed
						};

						return performAction(self, info, args, result.send, awaitPromptResourceID, postParams);
					});

					if (!detail.sync) {
						info.canLoad.isAllowed = false;
						info.canLoad.action = -10;

						awaitPromptResourceID = messageExtensionSync('page.addBlockedItem', info);

						setTimeout(function (onXHRPromptInput, info, detail, postParams, awaitPromptResourceID) {
							info.meta = createMetaData(detail, postParams);
							info.awaitPromptResourceID = awaitPromptResourceID;

							messageTopExtension('showXHRPrompt', {
								onXHRPromptInput: onXHRPromptInput,
								meta: info
							});
						}.bind(null, onXHRPromptInput, info, detail, postParams, awaitPromptResourceID));

						return false;
					} else {
						if (JSB.value.value.synchronousXHRMethod === SYNCHRONOUS_ASK)
							isAllowed = confirm(_localize('xhr.sync.prompt', [
								_localize(kind + '.prompt.title') + ' - ' + _localize('xhr.synchronous'),
								document.location.href,
								info.source.substr(0, info.source.indexOf('?')),
								info.meta ? JSON.stringify(info.meta.data, null, 1) : ''
							]));
						else {
							isAllowed = JSB.value.value.synchronousXHRMethod === SYNCHRONOUS_ALLOW;

							if (JSB.value.value.showSynchronousXHRNotification)
								setTimeout(function (isAllowed, onXHRPromptInput, info, detail, postParams) {
									info.meta = createMetaData(detail, postParams);

									messageTopExtension('showXHRPrompt', {
										synchronousInfoOnly: true,
										synchronousInfoIsAllowed: isAllowed,
										onXHRPromptInput: onXHRPromptInput,
										meta: info
									});
								}.bind(null, isAllowed, onXHRPromptInput, info, detail, postParams));
						}

						executeLocalCallback(onXHRPromptInput, {
							isAllowed: isAllowed
						});

						return false;
					}
				}

				return true;
			})();

			if (shouldPerformAction)
				performAction(this, info, arguments, null, awaitPromptResourceID, postParams);
		};
	},

	environmental_information: function () {
		var randomInteger = function (min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		};

		var now = (Math.random() * 1000000000000000000).toString(36),
			agent = 'Mozilla/5.0 (Windows NT 6.1; rv:24.0) Gecko/20100101 Firefox/' + randomInteger(20, 50) + '.0';

		var localNavigator = window.navigator;

		delete window.navigator;

		window.navigator = {
			geoLocation: localNavigator.geoLocation,
			cookieEnabled: localNavigator.cookieEnabled,
			productSub: now,
			mimeTypes: [],
			product: now,
			appCodeName: 'Mozilla',
			appVersion: agent,
			vendor: now,
			vendorSub: now,
			platform: now,
			appName: 'Netscape',
			userAgent: agent,
			language: localNavigator.language,
			plugins: (function () {
				function PluginArray () {}

				PluginArray.prototype.refresh = function () {};
				PluginArray.prototype.item = function () {};
				PluginArray.prototype.namedItem = function () {};

				return new PluginArray();
			})(),
			onLine: localNavigator.onLine,
			javaEnabled: localNavigator.javaEnabled.bind(localNavigator),
			getStorageUpdates: localNavigator.getStorageUpdates.bind(localNavigator)
		};

		window.screen = {
			width: randomInteger(1000, 2000),
			availWidth: randomInteger(1000, 2000),
			height: randomInteger(700, 1000),
			availHeight: randomInteger(700, 1000),
			availLeft: 0,
			availTop: 0,
			pixelDepth: randomInteger(24, 64),
			colorDepth: randomInteger(24, 64)
		};

		Date.prototype.getTimezoneOffset = function () {
			return randomInteger(-12, 14);
		};
	},

	canvas_data_url: function () {
		var canLoad = messageExtensionSync('canLoadResource', {
			kind: 'special',
			source: 'canvas_data_url'
		});

		try {
			if (canLoad.isAllowed)
				return;
		} catch (error) {
			return;
		}

		var ASK_COUNTER = 0,
			ASK_LIMIT = 3,
			ASK_ONCE = '2',
			ASK_ONCE_SESSION = '3',
			ALWAYS_BLOCK = '4';

		var toDataURL = HTMLCanvasElement.prototype.toDataURL,
			toDataURLHD = HTMLCanvasElement.prototype.toDataURLHD,
			autoContinue = {},
			alwaysContinue = false;

		var baseURL = messageExtensionSync('extensionURL', {
			path: 'html/canvasFingerprinting.html#'
		});

		var shouldSkipProtectionOnFunction = function (fn) {
			fn = fn.toString();

			if (/.+l\.fillText\(c\.apply\(this,a\).+/.test(fn))
				return true;

			if (/.+((f|h|j|(string)?[fF]romCharCode)\(\s?55356,\s?(56812|56806|56826),\s?55356,\s?(56807|56826|56819)\s?\)).+/.test(fn))
				return true;

			return false;
		};

		var generateRandomImage = function () {
			var canvas = document.createElement('canvas'),
				context = canvas.getContext('2d');

			context.textBaseline = 'top';
			context.font = '100 20px sans-serif';

			context.fillText(Math.random(), 0, 0);

			return toDataURL.apply(canvas);
		};

		function protection (dataURL) {
			var shouldContinue;

			var useSimplifiedMethod = document.hidden,
				shouldAskOnce = (JSB.value.value === ASK_ONCE || JSB.value.value === ASK_ONCE_SESSION || ++ASK_COUNTER > ASK_LIMIT),
				confirmString = _localize(useSimplifiedMethod ? 'special.canvas_data_url.prompt_old' : 'special.canvas_data_url.prompt'),
				url = baseURL + dataURL;

			/* eslint-disable */
			if (shouldAskOnce)
				confirmString += "\n\n" + _localize(JSB.value.value === ASK_ONCE_SESSION ? 'special.canvas_data_url.subsequent_session' : 'special.canvas_data_url.subsequent', [window.location.host]);
			/* eslint-enable */

			if (ASK_COUNTER > ASK_LIMIT)
				JSB.value.value = ASK_ONCE_SESSION;

			if (JSB.value.value === ALWAYS_BLOCK || (!canLoad.isAllowed && canLoad.action > -1))
				shouldContinue = false;
			else if (alwaysContinue !== false)
				shouldContinue = alwaysContinue;
			else if (shouldAskOnce && JSB.value.action >= 0)
				shouldContinue = !!(JSB.value.action % 2);
			else if (autoContinue.hasOwnProperty(dataURL))
				shouldContinue = autoContinue[dataURL];
			else {
				if (useSimplifiedMethod)
					shouldContinue = confirm(confirmString);
				else {
					var activeTabIndex = messageExtensionSync('activeTabIndex'),
						newTabIndex = messageExtensionSync('openTabWithURL', url);

					/* eslint-disable */
					shouldContinue = messageExtensionSync('confirm', document.location.href + "\n\n" + confirmString);
					/* eslint-enable */

					messageExtension('activateTabAtIndex', activeTabIndex);
					messageExtension('closeTabAtIndex', newTabIndex);
				}

				if (shouldAskOnce) {
					JSB.value.action = shouldContinue ? 1 : 0;

					messageExtension('addResourceRule', {
						temporary: JSB.value.value === ASK_ONCE_SESSION,
						action: shouldContinue ? 1 : 0,
						domain: 2, // RESOURCE.HOST
						rule: null,
						resource: {
							kind: 'special',
							source: 'canvas_data_url',
						}
					});

					alwaysContinue = JSB.value.action;
				}

				autoContinue[dataURL] = shouldContinue;
			}

			if (shouldContinue)
				return dataURL;
			else
				return generateRandomImage();
		}

		HTMLCanvasElement.prototype.toDataURL = function () {
			try {
				// if (typeof this.toDataURL.caller === 'function')
				// console.log(this.toDataURL.caller);
				if (typeof this.toDataURL.caller === 'function' && shouldSkipProtectionOnFunction(this.toDataURL.caller))
					return toDataURL.apply(this, arguments);
			} catch (e) { /*do nothing*/ }

			return protection(toDataURL.apply(this, arguments));
		};

		if (typeof toDataURLHD === 'function')
			HTMLCanvasElement.prototype.toDataURLHD = function () {
				try {
					if (typeof this.toDataURLHD.caller === 'function' && shouldSkipProtectionOnFunction(this.toDataURLHD.caller))
						return toDataURLHD.apply(this, arguments);
				} catch (e) { /* do nothing */ }

				return protection(toDataURLHD.apply(this, arguments));
			};
	},

	page_blocker: function () {
		window.stop();

		if (typeof messageExtension !== 'undefined')
			messageExtension('refreshPopover');

		document.documentElement.innerHTML = '<head><style type="text/css">* {text-align:center;}</style><body>' + _localize('setting.enabledSpecials.page_blocker.blocked') + '</body>';

		var meta = document.createElement('meta');
		
		meta.setAttribute('http-equiv', 'content-security-policy');
		meta.setAttribute('content', 'script-src *');
		
		if (document.documentElement.firstChild)
			document.documentElement.insertBefore(meta, document.documentElement.firstChild);
		else
			document.documentElement.appendChild(meta);
	},

	simple_referrer: new Function,
	anchor_titles: new Function,

	frameSandboxFixer: function () {
		var frameSandbox;

		if (window === window.top)
			return;

		if (window.location.origin === messageExtensionSync('topOrigin') && window.frameElement && (frameSandbox = window.frameElement.getAttribute('data-jsbFrameSandbox'))) {
			var meta = document.createElement('meta');

			meta.setAttribute('http-equiv', 'content-security-policy');
			meta.setAttribute('content', 'script-src ' + (frameSandbox.indexOf('allow-same-origin') > -1 ? 'self' : 'none'));
			
			if (document.documentElement.firstChild)
				document.documentElement.insertBefore(meta, document.documentElement.firstChild);
			else
				document.documentElement.appendChild(meta);
		}
	},
};

(function () {
	for (var special in Special.specials)
		if (Special.specials.hasOwnProperty(special))
			Special.specials[special].private = true;
})();

Special.specials.prepareScript.ignoreHelpers = true;
Special.specials.historyFixer.excludeFromPage = true;
Special.specials.frameSandboxFixer.excludeFromPage = true;
Special.specials.xhr_intercept.excludeFromPage = true;
Special.specials.popups.excludeFromPage = true;
Special.specials.simple_referrer.noInject = true;
Special.specials.anchor_titles.noInject = true;
Special.specials.prepareScript.uninjectableCompatible = true;
Special.specials.zoom.uninjectableCompatible = true;
Special.specials.autocomplete_disabler.uninjectableCompatible = true;
Special.specials.page_blocker.uninjectableCompatible = true;
Special.specials.contextmenu_overrides.uninjectableCompatible = true;

Special.init();
