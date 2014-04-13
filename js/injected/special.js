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

		if (pieces.length !== 3 || !TOKEN.INJECTED.hasOwnProperty(pieces[1]) || pieces[2] !== TOKEN.EVENT)
			return;

		event.detail.sourceID = pieces[1];
		event.detail.sourceName = TOKEN.INJECTED[pieces[1]].name;

		var response = Command('injected', event);

		if (response instanceof Error)
			return console.error('command error', response.message, '-', COMMAND[response.message]);

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
		if (deepInject.script.ignoreHelpers)
			var JSB = {
				eventToken: TOKEN.EVENT
			};
		else
			var JSB = {
				eventCallback: {},
				commandGeneratorToken: Command.requestToken('commandGeneratorToken'),
				eventToken: TOKEN.EVENT,
				sourceID: deepInject.id,
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

		this.__injected._pushMissing(name);

		TOKEN.INJECTED[special.id] = {
			namespace: special.name,
			name: special.name
		};

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
