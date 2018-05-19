/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

TOKEN.INJECTED = {};
TOKEN.REGISTERED = {};

var Special = {
	__injected: [],
	injectable: true,

	enabled: {},

	isEnabled: function (special) {
		return (this.enabled.hasOwnProperty(special) && this.enabled[special] !== false && this.enabled[special].enabled);
	},

	JSBCommanderHandler: function (event) {
		var pieces = event.type.split(':');

		if (pieces.length !== 3 || !TOKEN.INJECTED.hasOwnProperty(pieces[1]) || pieces[2] !== TOKEN.EVENT)
			return;

		var eventCopy = Object._extend(true, {}, event);

		if (!Object._isPlainObject(eventCopy.detail))
			eventCopy.detail = {};

		eventCopy.detail.sourceID = pieces[1];
		eventCopy.detail.sourceName = TOKEN.INJECTED[pieces[1]].namespace;

		if (!Utilities.Token.valid(eventCopy.detail.sourceID, eventCopy.detail.sourceName))
			return LogDebug('no longer authorized to execute commands from ' + eventCopy.detail.sourceName);

		var response = Command('injected', eventCopy);

		if (response instanceof Error)
			return LogDebug('command error ' + response.message + ' - ' + COMMAND[response.message]);

		var action = (response && response.command) ? 'JSBCommander:' : 'JSBCallback:';

		var newEvent = new CustomEvent(action + (response && response.sourceID || eventCopy.detail.sourceID) + ':' + TOKEN.EVENT, {
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

		var helperScript,
			prepend;

		var cache = [];

		for (var helper in helpers) {
			helperScript = new DeepInject(helper, helpers[helper], true);

			if (helpers[helper].args)
				helperScript.setArguments(helpers[helper].args);

			if (helpers[helper].semiGlobal)
				prepend = helperScript.inner();
			else
				prepend = helpers[helper].args ? helperScript.executable(true) : helperScript.asFunction();

			cache.unshift(prepend);

			deepInject.prepend(prepend);
		}

		Object.defineProperty(helpers, '__cache', {
			value: cache.join(";\n")
		});

		return deepInject;
	},

	setup: function (deepInject) {
		var JSB;

		if (deepInject.script.ignoreHelpers)
			JSB = {
				eventToken: TOKEN.EVENT,
				sourceID: deepInject.id
			};
		else
			JSB = {
				eventCallback: {},
				commandGeneratorToken: Command.requestToken('commandGeneratorToken'),
				eventToken: TOKEN.EVENT,
				sourceID: deepInject.id,
				data: deepInject.script.data,
				value: deepInject.script.value
			};

		if (deepInject.script.commandToken)
			JSB.commandToken = deepInject.script.commandToken;

		deepInject.setArguments({
			JSB: JSB
		});

		var specialSetup = new DeepInject(null, function () {
			/* eslint-disable */
			if (window[JSB.eventToken])
				var console = window[JSB.eventToken].console;
			/* eslint-enable */
		}, true);

		deepInject.prepend([specialSetup.inner()]);

		document.addEventListener('JSBCommander:' + deepInject.id + ':' + TOKEN.EVENT, this.JSBCommanderHandler, true);

		return deepInject;
	},

	inject: function (name, useURL) {
		if (!this.specials.hasOwnProperty(name))
			throw new Error('special not found.');

		if (useURL === undefined && this.__injected._contains(name))
			return;

		var injectable = Special.injectable || this.specials[name].uninjectableCompatible;

		if (injectable && useURL === undefined && !this.specials[name].excludeFromPage)
			Page.blocked.pushSource('special', name, {
				action: this.enabled[name].action
			});

		if (this.specials[name].noInject)
			return;

		var special = new DeepInject(name, this.specials[name]);
		
		this.injectHelpers(special, this.helpers);
		this.setup(special);

		this.__injected._pushMissing(name);

		TOKEN.INJECTED[special.id] = {
			namespace: special.name,
			name: special.name,
			usedURL: !!useURL,
			isUserScript: false,
			private: !!this.specials[name].private
		};

		if (!Special.injectable)
			if (this.specials[name].uninjectableCompatible)
				special.execute();
			else
				LogDebug('Cannot inject special "' + name + '" due to page\'s Content-Security-Policy.');
		else
			special.inject(useURL);

		return special;
	},

	init: function () {
		if (globalSetting.disabled)
			return;
		
		if (Utilities.Page.isXML)
			return LogDebug('refusing to inject helper scripts into XML page.');

		var CSPToken = Utilities.Token.generate();

		var CSPDetect = new DeepInject('CSPScriptDetection', function (CSPToken) {
			document.documentElement.setAttribute('data-JSB-CSP-SCRIPTS-ALLOWED', CSPToken);
		});

		CSPDetect.setArguments({ CSPToken: CSPToken }).inject(false);

		if (document.documentElement.getAttribute('data-JSB-CSP-SCRIPTS-ALLOWED') !== CSPToken) {
			CSPDetect.inject(true);

			if (document.documentElement.getAttribute('data-JSB-CSP-SCRIPTS-ALLOWED') !== CSPToken)
				Special.injectable = false;
		} else
			DeepInject.useURL = false;

		var preparation = this.inject('prepareScript', DeepInject.useURL);

		Utilities.Token.expire(preparation.id);

		if (Utilities.Page.isUserScript)
			setTimeout(function (url) {
				UserScript.showInstallScriptPrompt(url);
			}, 500, document.location.href);

		this.enabled = GlobalCommand('specialsForLocation', {
			pageLocation: Page.info.location,
			pageProtocol: Page.info.protocol,
			isFrame: Page.info.isFrame
		});

		if (Page.info.frameBlocked)
			this.enabled.page_blocker = {
				enabled: !Page.info.frameBlocked.isAllowed,
				action: Page.info.frameBlocked.isAllowed ? Page.info.frameBlocked.action : -14
			};

		for (var special in this.enabled)
			if (!this.enabled[special].enabled) {
				if (!this.specials[special].excludeFromPage)
					Page.allowed.pushSource('special', special, {
						action: this.enabled[special].action
					});
			} else if (this.specials[special]) {
				this.specials[special].value = this.enabled[special];

				this.inject(special);
			}
	},

	helpers: {
		deepFreezeObject: function (object) {
			try {
				Object.freeze(object);
			} catch (error) {
				return object;
			}

			var props = Object.getOwnPropertyNames(object);

			for (var i = 0; i < props.length; i++)
				if (object[props[i]] !== null && (typeof object[props[i]] === 'object' || typeof object[props[i]] === 'function'))
					deepFreezeObject(object[props[i]]);

			return object;
		},

		executeCallback: function (sourceID, callbackID, result) {
			messageExtension('executeCommanderCallback', {
				sourceID: sourceID,
				callbackID: callbackID,
				result: result
			});
		},

		executeLocalCallback: function (callbackID, result) {
			var callback = JSB.eventCallback[callbackID];

			if (!callback)
				return;

			try {
				callback.fn(result);

				if (!callback.preserve)
					delete JSB.eventCallback[callbackID];
			} catch (error) {
				console.error('error in callback', '-', error.message);

				if (error.JSB_RETHROW) {
					delete error.JSB_RETHROW;

					throw error;
				}
			}
		},

		messageTopExtension: function (command, meta, callback) {
			messageExtension('messageTopExtension', {
				command: command,
				meta: {
					args: meta,
					meta: meta ? meta.meta : undefined
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
			};

			return id;
		},

		messageExtensionSync: function (command, meta, callback, preserve) {
			var result;

			messageExtension(command, meta, function (response) {
				if (typeof callback === 'function')
					result = callback(response);
				else
					result = response;
			}, preserve);

			return result;
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

		_localize: function (string, args) {
			return messageExtensionSync('localize', {
				string: string,
				args: args
			});
		},

		JSBCustomEvent: function (name, params) {
			params = params || {
				bubbles: false,
				cancelable: false,
				detail: undefined
			};

			var evt = window[JSB.eventToken].document$createEvent('CustomEvent');

			evt.initCustomEvent(name, params.bubbles, params.cancelable, params.detail);

			return evt;
		},

		JSBCallbackSetup: function () {
			if (!window[JSB.eventToken])
				return window && window.console && console.error('frame disappeared?');

			var doNotFreeze = ['commandGeneratorToken', 'eventCallback'];

			window[JSB.eventToken].document$removeEventListener('JSBCallback:' + JSB.sourceID + ':' + JSB.eventToken, JSBCallbackSetup, true);
			window[JSB.eventToken].document$addEventListener('JSBCallback:' + JSB.sourceID + ':' + JSB.eventToken, JSBCallbackHandler, true);

			messageExtension('registerDeepInjectedScript', null, function (result) {
				window[JSB.eventToken].document$removeEventListener('JSBCallback:' + JSB.sourceID + ':' + JSB.eventToken, JSBCallbackHandler, true);

				JSB.sourceID = result.newSourceID;

				for (var key in JSB)
					if (JSB.hasOwnProperty(key) && doNotFreeze.indexOf(key) === -1)
						Object.defineProperty(JSB, key, {
							configurable: false,
							enumerable: false,
							writable: false,
							value: deepFreezeObject(JSB[key])
						});

				window[JSB.eventToken].document$addEventListener('JSBCallback:' + JSB.sourceID + ':' + JSB.eventToken, JSBCallbackHandler, true);
			});
		},

		JSBCallbackHandler: function (event) {
			if (!event.detail)
				return;

			executeLocalCallback(event.detail.callbackID, event.detail.result);
		},

		JSBCommander: function (detail, meta, callback, preserve) {
			if (!window[JSB.eventToken])
				return console.error('unable to send JSB command');
			
			var callbackID = registerCallback(callback, preserve);

			window[JSB.eventToken].document$dispatchEvent(new JSBCustomEvent('JSBCommander:' + JSB.sourceID + ':' + JSB.eventToken, {
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
