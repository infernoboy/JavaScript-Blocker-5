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
				new Function("return function () {\n" + attributes.script + "\n}");

				isSafe = true
			} catch (error) {
				if (error.message._contains('unsafe-eval') || error instanceof EvalError) {
					isSafe = GlobalCommand('verifyScriptSafety', attributes.script);

					LogDebug('caught an unsafe-eval error from within an injected script - ' + attributes.meta.name);
				} else
					LogError(['unable to inject user script', attributes.meta.name], error);
			}
		}

		if (typeof attributes.script !== 'function' && !isSafe)
			return LogError(['user script did not transform into a function', attributes.meta.name]);

		var userScript = new DeepInject(attributes.meta.trueNamespace, attributes.script);

		userScript.anonymize();

		Special.injectHelpers(userScript, this.helpers);
		Special.injectHelpers(userScript, Special.helpers);

		var userScriptSetup = new DeepInject(null, function () {
			var unsafeWindow = window,
					GM_info = JSB.scriptInfo;
		}, true);

		userScript.prepend([userScriptSetup.inner()]);

		Special.setup(userScript);

		var meta = attributes.meta;

		meta.resources = meta.resource;
		meta.includes = meta.include;
		meta.excludes = meta.exclude;
		meta.matches = meta.match;

		delete meta.resource;
		delete meta.include;
		delete meta.exclude;
		delete meta.match;

		userScript.pieces.args.JSB.scriptInfo = {
			scriptMetaStr: attributes.metaStr,
			scriptWillUpdate: attributes.autoUpdate,
			version: 5,
			script: meta
		};

		userScript.setArguments(userScript.pieces.args).inject();

		TOKEN.INJECTED[userScript.id] = {
			namespace: attributes.meta.trueNamespace,
			name: attributes.meta.name,
			usedURL: DeepInject.useURL
		};

		if (attributes.runAtStart && DeepInject.useURL)
			Log('this page does not allow inline scripts.', '"' + attributes.meta.name + '"', 'wanted to run before the page loaded but couldn\'t.');

		if (excludeFromPage !== true)
			Page.allowed.pushSource('user_script', attributes.meta.trueNamespace, {
				action: -1
			});
	},

	begin: function () {
		if (globalSetting.disabled)
			return;
		
		if (Utilities.Page.isXML)
			return LogDebug('refusing to inject user scripts into XML page.');

		var url,
				requirement,
				requirementName;

		var enabledUserScripts = GlobalCommand('userScriptsForLocation', {
			location: Page.info.location,
			protocol: Page.info.protocol,
			isFrame: Page.info.isFrame
		});

		for (var userScript in enabledUserScripts) {
			if (enabledUserScripts[userScript] === false)
				Page.blocked.pushSource('user_script', userScript, {
					action: -2
				});
			else {
				if (enabledUserScripts[userScript].requirements) {
					for (url in enabledUserScripts[userScript].requirements) {
						requirement = enabledUserScripts[userScript].requirements[url];

						requirementName = 'RequiredFor:' + userScript + ':' + url;

						UserScript.inject({
							runAtStart: true,

							attributes: {
								script: Utilities.decode(requirement.data),
								meta: {
									name: requirementName,
									trueNamespace: requirementName
								}
							}
						}, true);
					}
				}

				if (enabledUserScripts[userScript].attributes.runAtStart)
					UserScript.inject(enabledUserScripts[userScript]);
				else
					UserScript.injectWhenLoaded(enabledUserScripts[userScript]);
			}
		}
	},

	helpers: {
		GM_getValue: function (key, defaultValue) {
			var result = messageExtensionSync('userScript.storage.getItem', {
				key: key
			});

			if (result === undefined)
				return defaultValue;

			return result;
		},
		GM_setValue: function (key, value) {
			messageExtension('userScript.storage.setItem', {
				key: key,
				value: value
			});
		},
		GM_deleteValue: function (key) {
			messageExtension('userScript.storage.removeItem', {
				key: key
			});
		},
		GM_listValues: function () {
			return messageExtensionSync('userScript.storage.keys');
		},

		// RESOURCES
		GM_getResourceText: function (name) {
			var resource = messageExtensionSync('userScript.getResource', name);

			return resource ? atob(resource.data) : '';
		},
		GM_getResourceURL: function (name) {
			var resource = messageExtensionSync('userScript.getResource', name);

			if (!resource)
				return '';

			var URL = window.webkitURL || window.URL;

			if (window.Blob && typeof URL.createObjectURL === 'function') {
				var text = atob(resource.data),
						textArray = new Array(text.length);

				for (var i = 0; i < text.length; i++)
					textArray[i] = text.charCodeAt(i);

				return URL.createObjectURL(new Blob([new Uint8Array(textArray)], {
					type: resource.type
				}));
			} else
				return 'data:' + resource.type + ';base64,' + resource.data;
		},

		// OTHER
		GM_addStyle: function (css) {
			var style = document.createElement('style');

			style.setAttribute('type', 'text/css');

			style.innerText = css;

			if (document.head)
				document.head.appendChild(style);
			else
				document.documentElement.appendChild(style);
		},

		GM_log: function () {
			console.debug.apply(console, arguments);
		},

		GM_openInTab: function (url) {
			messageExtension('openInTab', url);
		},

		GM_registerMenuCommand: function (caption, fn, accessKey) {
			messageExtension('registerMenuCommand', caption, fn, true);
		},

		GM_setClipboard: function () { },

		GM_xmlhttpRequest: function (details) {
			var events,
					action;

			var serializable = window[JSB.eventToken].window$JSON$parse(window[JSB.eventToken].window$JSON$stringify(details)),
					messageFn = details.synchronous ? messageExtensionSync : messageExtension;

			var response = messageFn('XMLHttpRequest', serializable, function (result) {
				if (result.action === 'XHRComplete') {
					delete JSB.eventCallback[result.callbackID];

					details = serializable = undefined;
				}	else {
					events = result.action.indexOf('upload.') > -1 ? details.upload || {} : details;
					action = events === details.upload ? result.action.split('.')[1] : result.action;

					if (action in events) {
						result.response.context = details;

						events[action](result.response);

						return result.response;
					}
				}
			}, true);

			return response;
		}
	}
};

UserScript.begin();
