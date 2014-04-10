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
		var attributes = script.attributes;

		if (typeof attributes.script === 'string') {
			try {
				attributes.script = (new Function('return function () {' + attributes.script + '}'))();
			} catch (error) {
				return LogError(['unable to inject user script', attributes.meta.name], error);
			}
		}

		if (typeof attributes.script !== 'function')
			return LogError(['user script did not transform into a function', attributes.meta.name]);

		var userScript = new DeepInject(attributes.meta.name, attributes.script);

		userScript.anonymize();

		Special.injectHelpers(userScript, this.helpers);
		Special.injectHelpers(userScript, Special.helpers);

		var setup = new DeepInject('userScriptSetup', function (info, resources) {
			unsafeWidnow = window;
			
			GM_info = info;
			GM_resources = resources;
		});

		setup.setArguments({
			info: {
				scriptMetaStr: attributes.metaStr,
				scriptWillUpdate: attributes.autoUpdate,
				version: null,
				script: attributes.meta
			},
			resources: script.resources || {}
		});

		userScript.prepend([setup.executable(), 'var unsafeWindow, GM_info, GM_resources;']);

		Special.setup(userScript).inject();

		if (script.before && DeepInject.useURL)
			console.warn('This page does not allow inline scripts.', attributes.meta.name, 'may not function as expected.');

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
			var value = window.localStorage.getItem(GM_info.script.trueNamespace + key);

			return value === null ? (defaultValue !== undefined ? defaultValue : null) : value;
		},
		GM_setValue: function (key, value) {
			window.localStorage.setItem(GM_info.script.trueNamespace + key, value);
		},
		GM_deleteValue: function (key) {
			window.localStorage.removeItem(GM_info.script.trueNamespace + key);
		},
		GM_listValues: function () {
			return Object.keys(window.localStorage).filter(function (key) {
				return key.indexOf(GM_info.script.trueNamespace) === 0;
			});		
		},

		// RESOURCES
		GM_getResourceText: function (name) {
			return GM_resources[name] ? atob(GM_resources[name].data) : '';
		},
		GM_getResourceURL: function (name) {
			if (!GM_resources[name])
				return '';

			if (window.Blob) {
				var URL = window.URL || window.webkitURL,
						text = GM_getResourceText(name),
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

		NOT_IMPLEMENTED_GM_xmlhttpRequest: function (details) {
			var key,
					stringed;

			var serializable = {},
					anchor = document.createElement('a');

			for (key in details)
				try {
					stringed = JSON.stringify(details[key]);

					if (typeof stringed !== 'undefined')
						serializable[key] = details[key];
				} catch (e) {}

			anchor.href = serializable.url;
			serializable.url = anchor.href;

			messageExtension('XMLHttpRequest', {
				details: serializable
			}, function (result) {
				if (result.action === 'XHRComplete') {
					delete JSB.eventCallback[result.callback];

					details = serializable = anchor = key = stringed = undefined;
				}	else if (result.action in details)
					details[result.action](result.response);
			}, true);
		}
	}
};

UserScript.begin();
