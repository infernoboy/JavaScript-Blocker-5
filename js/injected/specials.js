Special.specials = {
	prepareScript: function () {
		if (window[JSB.eventToken])
			return;
		
		Object.defineProperty(window, JSB.eventToken, {
			value: Object.freeze({
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

		var localHistory = {
			pushState: window.history.pushState,
			replaceState: window.history.replaceState
		};

		window.history.pushState = function () {
			localHistory.pushState.apply(window.history, arguments);

			window.postMessage({
				command: 'historyStateChange'
			}, '*');
		};

		window.history.replaceState = function () {
			localHistory.replaceState.apply(window.history, arguments);

			window.postMessage({
				command: 'historyStateChange'
			}, '*');
		};

		var evt = document.createEvent('CustomEvent');

		evt.initCustomEvent('JSBCommander:' + JSB.sourceID + ':' + JSB.eventToken, false, false, {
			commandToken: JSB.commandToken,
			command: 'inlineScriptsAllowed'
		});

		document.dispatchEvent(evt);
	},

	installUserScriptPrompt: function () {
		messageTopExtension('notification', {
			title: _localize('user_script'),
			subTitle: document.location.href,
			body: messageExtensionSync('template.create', {
				template: 'injected',
				section: 'install-user-script-prompt'
			})
		}, function (detail) {
			var notification = document.getElementById(detail.result),
					notificationBody = notification.querySelector('.jsb-notification-body');

			notification.querySelector('#jsb-install-user-script').addEventListener('click', function (event) {
				this.disabled = true;

				this.value = _localize('user_script.adding');

				setTimeout(function () {
					messageExtension('installUserScriptFromURL', {
						url: document.location.href
					}, function (result) {
						var p = document.createElement('p');

						p.classList.add('jsb-info');

						p.innerHTML = result === true ? _localize('user_script.add_success') : result;

						notificationBody.innerHTML = p.outerHTML;
					});
				}, 0);
			}, true);
		});
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

	zoom: function () {
		document.addEventListener('DOMContentLoaded', function () {
			document.body.style.setProperty('zoom', JSB.value.value + '%', 'important');
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

		document.addEventListener('DOMContentLoaded', function () {
			var inputs = document.getElementsByTagName('input');
			
			for (var i = 0; i < inputs.length; i++)
				withNode(inputs[i]);
		}, true);

		if (build >= 536) {
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
		} else
			document.addEventListener('DOMNodeInserted', function (event) {
				withNode(event.target);
			}, true);
	},

	xhr_intercept: function () {
		var XHR = {
			open: XMLHttpRequest.prototype.open,
			send: XMLHttpRequest.prototype.send
		};

		var SYNCHRONOUS_ALLOW = 0,
				SYNCHRONOUS_BLOCK = 1,
				SYNCHRONOUS_ASK = 2;

		var shouldShowPrompt = JSB.value.value.alwaysBlock === 'ask',
				supportedMethods = ['get', 'post', 'put'],
				openToken = Math.random(),
				openArguments = {};

		function performAction (request, info, args, send) {
			var xhrError;

			var detail = openArguments[request[openToken]],
					newRequest = request,
					pageAction = info.canLoad.isAllowed ? 'addAllowedItem' : 'addBlockedItem';

			if (send) {
				if (detail.method === 'post')
					args[0] = send;
				else if (detail.method === 'get') {
					var anchor = document.createElement('a');

					anchor.href = detail.path;

					var newPath = anchor.origin + anchor.pathname + '?' + send;

					info.source = newPath;

					XHR.open.call(request, 'GET', newPath);
				}
			}

			if (info.canLoad.isAllowed) {
				pageAction = 'addAllowedItem';

				request[openToken].resendAllowed = true;

				try {
					XHR.send.apply(newRequest, args);
				} catch (error) {
					xhrError = error;
				}
			}

			messageExtension('page.' + pageAction, info);

			if (xhrError) {
				xhrError.JSB_RETHROW = true;
				
				throw xhrError;
			}
		};

		XMLHttpRequest.prototype.open = function () {
			var openID = Math.random();

			Object.defineProperty(this, openToken, {
				value: openID
			});

			var path = arguments[1];

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

			var JSONsendArguments = window[JSB.eventToken].window$JSON$stringify(arguments);

			if (detail.previousJSONsendArguments === JSONsendArguments) {
				console.warn('XHR Resend?', arguments, this[openToken]);

				try {
					return detail.resendAllowed ? XHR.send.apply(this, arguments) : this.abort();
				} catch (error) {
					console.warn('XHR Resend...Failed?', error);
				} finally {
					return;
				}
			}

			detail.previousJSONsendArguments = JSONsendArguments;

			var kind = 'xhr_' + detail.method,
					info = {
						meta: null,
						kind: kind,
						source: detail.path,
						canLoad: {}
					};

			if (detail.method === 'get' || detail.method === 'post') {
				var toSend = detail.method === 'post' ? arguments[0] : detail.path.split('?')[1];

				if (typeof toSend === 'string') {
					info.meta = {
						type: 'params',
						data: {}
					};

					var splitParam;

					var params = toSend.split(/&/g);

					for (var i = 0; i < params.length; i++) {
						if (!params[i].length)
							continue;

						splitParam = params[i].split('=');

						info.meta.data[decodeURIComponent(splitParam[0])] = typeof splitParam[1] === 'string' ? decodeURIComponent(splitParam[1]) : null;
					}
				} else if (toSend instanceof window.Blob) {
					var URL = window.webkitURL || window.URL || {};

					if (typeof URL.createObjectURL === 'function')
						info.meta = {
							type: 'blob',
							data: URL.createObjectURL(toSend)
						};
				} else if (toSend instanceof window.FormData) {
					// There is no way to retrieve the values of a FormData object.
					info.meta = {
						type: 'formdata',
						data: null
					};
				}
			}

			var canLoad = messageExtensionSync('canLoadResource', info);

			try {
				canLoad.isAllowed;
			} catch (error) {
				console.warn('failed to retrieve canLoadResource response', document);

				canLoad = {
					action: -1,
					isAllowed: true
				};
			}

			info.canLoad = canLoad;

			var self = this,
					args = arguments;

			var onXHRPromptInput = registerCallback(function (result) {
				info.canLoad = {
					action: result.isAllowed ? -5 : -6,
					isAllowed: result.isAllowed
				};

				return performAction(self, info, args, result.send);
			});

			var shouldPerformAction = (function () {
				if (canLoad.action !== -8 && canLoad.action < 0 && shouldShowPrompt) {
					if (!detail.sync) {
						messageTopExtension('showXHRPrompt', {
							onXHRPromptInput: onXHRPromptInput,
							meta: info
						});

						return false;
					} else {
						if (JSB.value.value.synchronousXHRMethod === SYNCHRONOUS_ASK) {
							var isAllowed = confirm(_localize('xhr.sync.prompt', [
								_localize(kind + '.prompt.title') + ' - ' + _localize('xhr.synchronous'),
								document.location.href,
								info.source.substr(0, info.source.indexOf('?')),
								info.meta ? JSON.stringify(info.meta.data, null, 1) : ''
							]));
						} else {
							var isAllowed = JSB.value.value.synchronousXHRMethod === SYNCHRONOUS_ALLOW;

							if (JSB.value.value.showSynchronousXHRNotification)
								messageTopExtension('showXHRPrompt', {
									synchronousInfoOnly: true,
									synchronousInfoIsAllowed: isAllowed,
									onXHRPromptInput: onXHRPromptInput,
									meta: info
								});
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
				performAction(this, info, arguments);
		};
	},

	environmental_information: function () {
		var now = Math.random().toString(36), nowInt = Date.now(),
				agent = 'Mozilla/5.0 (Windows NT 6.1; rv:24.0) Gecko/20100101 Firefox/24.0';

		window.navigator = {
			geoLocation: window.navigator.geoLocation,
			cookieEnabled: window.navigator.cookieEnabled,
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
			language: window.navigator.language,
			plugins: (function () {
				function PluginArray () {};

				PluginArray.prototype.refresh = function () {};
				PluginArray.prototype.item = function () {};
				PluginArray.prototype.namedItem = function () {};

				return new PluginArray();
			})(),
			onLine: window.navigator.onLine,
			javaEnabled: window.navigator.javaEnabled.bind(window.navigator),
			getStorageUpdates: window.navigator.getStorageUpdates.bind(window.navigator)
		};

		window.screen = {
			width: 1000,
			availWidth: 1000,
			height: 700,
			availHeight: 700,
			availLeft: 0,
			availTop: 0,
			pixelDepth: 24,
			colorDepth: 24
		};

		Date.prototype.getTimezoneOffset = function () {
			return 0;
		};
	},

	canvas_data_url: function () {
		var ALWAYS_ASK = 1,
				ASK_ONCE = 2,
				ASK_ONCE_SESSION = 3,
				ALWAYS_BLOCK = 4;

		var useSimplifiedMethod = JSB.data.safariBuildVersion < 537 || document.hidden,
				toDataURL = HTMLCanvasElement.prototype.toDataURL,
				toDataURLHD = HTMLCanvasElement.prototype.toDataURLHD,
				shouldAskOnce = (JSB.value.value === ASK_ONCE || JSB.value.value === ASK_ONCE_SESSION),
				autoContinue = {};

		var baseURL = messageExtensionSync('extensionURL', {
			path: 'html/canvasFingerprinting.html#'
		});

		var confirmString = _localize(useSimplifiedMethod ? 'special.canvas_data_url.prompt_old' : 'special.canvas_data_url.prompt');

		if (shouldAskOnce)
			confirmString += "\n\n" + _localize(JSB.value.value === ASK_ONCE_SESSION ? 'special.canvas_data_url.subsequent_session' : 'special.canvas_data_url.subsequent', [window.location.host]);

		function protection (dataURL) {
			var url = baseURL + dataURL;

			if (JSB.value.value === ALWAYS_BLOCK || (shouldAskOnce && JSB.value.action >= 0))
				var shouldContinue = false;
			else if (autoContinue.hasOwnProperty(dataURL))
				var shouldContinue = autoContinue[dataURL];
			else {
				if (useSimplifiedMethod)
					var shouldContinue = confirm(confirmString);
				else {
					var activeTabIndex = messageExtensionSync('activeTabIndex'),
							newTabIndex = messageExtensionSync('openTabWithURL', url);

					var shouldContinue = messageExtensionSync('confirm', document.location.href + "\n\n" + confirmString);

					messageExtension('activateTabAtIndex', activeTabIndex);
					messageExtension('closeTabAtIndex', newTabIndex);
				}

				if (shouldAskOnce) {
					JSB.value.action = shouldContinue ? 1 : 0;

					messageExtension('addResourceRule', {
						key: JSB.data.key,
						temporary: JSB.value.value === ASK_ONCE_SESSION,
						action: shouldContinue ? 1 : 0,
						domain: 2, // RESOURCE.HOST
						rule: null,
						resource: {
							kind: 'special',
							source: 'canvas_data_url',
						}
					});
				}

				autoContinue[dataURL] = shouldContinue;
			}

			if (shouldContinue)
				return dataURL;
			else
				return 'data:image/png;base64,' + btoa(Math.random());
		}

		HTMLCanvasElement.prototype.toDataURL = function () {			
			return protection(toDataURL.apply(this, arguments));
		};

		if (typeof toDataURLHD === 'function')
			HTMLCanvasElement.prototype.toDataURLHD = function () {
				return protection(toDataURLHD.apply(this, arguments));
			};
	}
};

Special.specials.autocomplete_disabler.data = Utilities.safariBuildVersion;

Special.specials.canvas_data_url.data = {
	safariBuildVersion: Utilities.safariBuildVersion,
	key: Utilities.Token.create('addResourceRuleKey', true)
};

Special.specials.prepareScript.ignoreHelpers = true;
Special.specials.prepareScript.commandToken = Command.requestToken('inlineScriptsAllowed');
Special.specials.installUserScriptPrompt.excludeFromPage = true;
Special.specials.xhr_intercept.excludeFromPage = true;

Special.begin();
