"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

Special.specials = {
	inlineScriptsCheck: function () {
		messageExtension('inlineScriptsAllowed');
	},

	prepareScript: function () {
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

		var localHistory = {
			pushState: window.history.pushState,
			replaceState: window.history.replaceState
		};

		window.history.pushState = function () {
			localHistory.pushState.apply(window.history, arguments);

			window.postMessage({
				command: 'historyStateChange'
			}, window.location.href);
		};

		window.history.replaceState = function () {
			localHistory.replaceState.apply(window.history, arguments);

			window.postMessage({
				command: 'historyStateChange'
			}, window.location.href);
		};
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
			window[JSB.eventToken].document$addEventListener('DOMNodeInserted', function (event) {
				withNode(event.target);
			}, true);
	},

	ajax_intercept: function () {
		var XHR = {
			open: XMLHttpRequest.prototype.open,
			send: XMLHttpRequest.prototype.send
		};

		var supportedMethods = ['get', 'post', 'put'],
				storeToken = Math.random().toString(36);

		XMLHttpRequest.prototype.open = function () {
			if (!this[storeToken])
				Object.defineProperty(this, storeToken, {
					value: {}
				});

			this[storeToken].method = arguments[0].toLowerCase();
			this[storeToken].path = (arguments[1] && arguments[1].path) ? arguments[1].path : arguments[1].toString();

			Object.freeze(this[storeToken]);

			XHR.open.apply(this, arguments);
		};

		XMLHttpRequest.prototype.send = function () {
			var detail = this[storeToken],
					isAllowed = (supportedMethods.indexOf(detail.method) === -1);

			if (isAllowed)
				return XHR.send.apply(this, arguments);

			var JSONsendArguments = JSON.stringify(arguments);

			if (detail.previousJSONsendArguments === JSONsendArguments)
				try {
					console.debug('Oh google....');

					return detail.isAllowed ? XHR.send.apply(this, arguments) : this.abort();
				} catch (error) {
					console.debug(error);
				} finally {
					return;
				}

			detail.previousJSONsendArguments = JSONsendArguments;

			var	pageAction = 'addBlockedItem',
					kind = 'ajax_' + detail.method,
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
						splitParam = params[i].split('=');

						info.meta.data[splitParam[0]] = decodeURIComponent(splitParam[1]);
					}
				} else if (toSend instanceof window.Blob) {
					var URL = window.webkitURL || window.URL;

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

			var result;

			var canLoad = messageExtensionSync('canLoadResource', info);

			try {
				isAllowed = canLoad.isAllowed;
			} catch (error) {
				console.error('failed to retrieve canLoadResource response.', document);

				isAllowed = true;
			}

			info.canLoad = canLoad;

			if (isAllowed) {
				pageAction = 'addAllowedItem';

				detail.isAllowed = true;

				try {
					XHR.send.apply(this, arguments);
				} catch (error) {
					console.log('XHR SEND FAIL', error)
				}
			}
			
			messageExtension('page.' + pageAction, info);
		};
	}
};

Special.specials.autocomplete_disabler.data = Utilities.safariBuildVersion;
Special.specials.prepareScript.ignoreHelpers = true;
Special.specials.ajax_intercept.excludeFromPage = true;

Special.begin();
