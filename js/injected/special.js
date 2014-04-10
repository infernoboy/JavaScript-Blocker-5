"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

TOKEN.INJECTED = {};

var Special = {
	__injected: [],

	enabled: {},

	isEnabled: function (special) {
		return (this.enabled.hasOwnProperty(special) && this.enabled[special] !== false);
	},

	JSBCommanderHandler: function (event) {
		var response = Command.perform(event);

		if (response instanceof Error)
			return;

		var action = (response && response.command) ? 'JSBCommander-' : 'JSBCallback-';

		var newEvent = new CustomEvent(action + (response && response.sourceID || event.detail.sourceID) + TOKEN.EVENT, {
			detail: response
		});

		document.dispatchEvent(newEvent);

		return response;
	},

	injectHelpers: function (deepInject, helpers) {
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
		deepInject.setArguments({
			JSB: {
				eventCallback: {},
				commandGeneratorToken: Utilities.Token.create('commandGeneratorToken'),
				eventToken: TOKEN.EVENT,
				sourceID: deepInject.id,
				name: deepInject.name,
				data: deepInject.script.data,
				value: deepInject.script.value
			}
		});

		document.addEventListener('JSBCommander-' + deepInject.id + TOKEN.EVENT, this.JSBCommanderHandler, true);

		return deepInject;
	},

	inject: function (name, useURL) {
		if (!this.specials.hasOwnProperty(name))
			throw new Error('special not found.');

		if (this.__injected._contains(name))
			return;

		var special = new DeepInject(name, this.specials[name]);

		this.injectHelpers(special, this.helpers);
		this.setup(special);

		this.__injected.push(name);

		special.inject(useURL);

		if (typeof useURL === 'undefined')
			blockedItems.getStore('special').get('all', [], true).push({
				source: name,
				ruleAction: -1
			});
	},

	begin: function () {
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
				originSourceName: JSB.name,
				originSourceID: JSB.sourceID,
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

			var evt = document.createEvent('CustomEvent');

			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);

			return evt;
		},

		JSBCallbackSetup: function (event) {
			document.removeEventListener('JSBCallback-' + JSB.sourceID + JSB.eventToken, JSBCallbackSetup, true);
			document.addEventListener('JSBCallback-' + JSB.sourceID + JSB.eventToken, JSBCallbackHandler, true);

			messageExtension('registerDeepInjectedScript', null, function (result) {
				document.removeEventListener('JSBCallback-' + JSB.sourceID + JSB.eventToken, JSBCallbackHandler, true);

				JSB.sourceID = result.newSourceID;

				document.addEventListener('JSBCallback-' + JSB.sourceID + JSB.eventToken, JSBCallbackHandler, true);
			});
		},

		JSBCallbackHandler: function (event) {
			if (!event.detail)
				return;

			if (event.detail.perform)
				return event.detail.perform(event.detail.result, executeCallback.bind(null, event.detail.sourceID), messageExtension);

			executeLocalCallback(event.detail.callbackID, event.detail.result);
		},

		JSBCommander: function (detail, meta, callback, preserve) {
			var callbackID = registerCallback(callback, preserve);

			document.dispatchEvent(new JSBCustomEvent('JSBCommander-' + JSB.sourceID + JSB.eventToken, {
				detail: {
					sourceName: JSB.name,
					sourceID: JSB.sourceID,
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
