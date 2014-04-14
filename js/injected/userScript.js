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
		var isSafe = false,
				attributes = script.attributes;

		if (typeof attributes.script === 'string') {
			try {
				attributes.script = (new Function("return function () {\n" + attributes.script + "\n}"))();

				isSafe = true
			} catch (error) {
				if (error.message._contains('unsafe-eval') || error instanceof EvalError) {
					isSafe = GlobalCommand('verifyScriptSafety', attributes.script);

					LogError(['received an unsafe-eval error from within an injected script.', attributes.meta.name]);
				} else
					LogError(['unable to inject user script', attributes.meta.name], error);

				if (!isSafe)
					return;
			}
		}

		if (typeof attributes.script !== 'function' && !isSafe)
			return LogError(['user script did not transform into a function', attributes.meta.name]);

		var userScript = new DeepInject(attributes.meta.trueNamespace, attributes.script);

		userScript.anonymize();

		Special.injectHelpers(userScript, this.helpers);
		Special.injectHelpers(userScript, Special.helpers);

		var userScriptSetup = new DeepInject('userScriptSetup', function (setup) {
			unsafeWidnow = window;

			JSB.storage = setup.storage;
			
			GM_info = setup.info;
			GM_resources = setup.resources;
		});

		userScriptSetup.setArguments({
			setup: {
				info: {
					scriptMetaStr: attributes.metaStr,
					scriptWillUpdate: attributes.autoUpdate,
					version: 5,
					script: attributes.meta
				},

				resources: script.resources || {},
				storage: script.storage || {}
			}
		});

		userScript.prepend([userScriptSetup.executable(), 'var unsafeWindow, GM_info, GM_resources;']);

		TOKEN.INJECTED[userScript.id] = {
			namespace: attributes.meta.trueNamespace,
			name: userScript.name
		};

		Special.setup(userScript).inject();

		if (attributes.before && DeepInject.useURL)
			console.warn('This page does not allow inline scripts.', '"' + attributes.meta.name + '"', 'wanted to run before the page loaded but couldn\'t.');

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
			if (!JSB.storage.hasOwnProperty(key))
				return defaultValue;

			return JSB.storage[key];
		},
		GM_setValue: function (key, value) {
			JSB.storage[key] = value;

			messageExtension('storageSetItem', {
				key: key,
				value: value
			});
		},
		GM_deleteValue: function (key) {
			delete JSB.storage[key];

			messageExtension('storageRemoveItem', {
				key: key
			});
		},
		GM_listValues: function () {
			return Object.keys(JSB.storage);		
		},

		// RESOURCES
		GM_getResourceText: function (name) {
			return GM_resources[name] ? atob(GM_resources[name].data) : '';
		},
		GM_getResourceURL: function (name) {
			if (!GM_resources[name])
				return '';

			var URL = window.webkitURL || window.URL;

			if (window.Blob && typeof URL.createObjectURL === 'function') {
				var text = GM_getResourceText(name),
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

		GM_xmlhttpRequest: function (details) {
			var serializable = JSON.parse(JSON.stringify(details)),
					anchor = document.createElement('a');

			// Converts a relative URL into an absolute URL.
			anchor.href = serializable.url;
			serializable.url = anchor.href;

			var response = null;

			messageExtension('XMLHttpRequest', serializable, function (result) {
				if (result.action === 'XHRComplete') {
					delete JSB.eventCallback[result.callbackID];

					details = serializable = anchor = undefined;
				}	else if (result.action in details) {
					details[result.action](result.response);

					response = result.response;
				}
			}, true);

			return response;
		}
	}
};

UserScript.begin();
