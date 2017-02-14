/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

var UserScript = {
	menuCommand: {},

	injectWhenLoaded: function (script, parentUserScript, parentUserScriptName) {
		document.addEventListener('DOMContentLoaded', function (script, parentUserScript, parentUserScriptName) {
			UserScript.inject(script, parentUserScript, parentUserScriptName);
		}.bind(null, script, parentUserScript, parentUserScriptName), false);
	},

	inject: function (script, parentUserScript, parentUserScriptName) {
		if (!Special.injectable)
			return LogDebug('Cannot inject user script "' + script.attributes.meta.name + '" due to page\'s Content-Security-Policy.');

		var isSafe = false,
			attributes = script.attributes,
			requirementScripts = [];

		if (typeof attributes.script === 'string')
			try {
				new Function("return function () {\n" + attributes.script + "\n}");

				isSafe = true;
			} catch (error) {
				if (error.message._contains('unsafe-eval') || error instanceof EvalError) {
					isSafe = GlobalCommand('verifyScriptSafety', attributes.script);

					LogDebug('caught an unsafe-eval error from within an injected script - ' + attributes.meta.name);
				} else
					LogError('unable to inject user script - ' + attributes.meta.name, error);
			}

		if (typeof attributes.script !== 'function' && !isSafe)
			return LogError(Error('user script did not transform into a function - ' + attributes.meta.name));

		if (script.requirements)
			for (var indexURL in script.requirements)
				requirementScripts.push(Utilities.decode(script.requirements[indexURL].data));

		var userScript = new DeepInject(attributes.meta.trueNamespace, attributes.script);

		var userScriptSetup = new DeepInject(null, function () {
			/* eslint-disable */
			var unsafeWindow = window,
					GM_info = JSB.scriptInfo;

			Object.defineProperty(window, 'unsafeWindow', {
				value: window
			});
			/* eslint-enable */
		}, true);

		userScript.anonymize();

		userScript.prepend(requirementScripts);

		Special.injectHelpers(userScript, this.helpers);
		Special.injectHelpers(userScript, Special.helpers);

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
			parentUserScript: parentUserScript,
			scriptMetaStr: attributes.metaStr,
			scriptWillUpdate: attributes.autoUpdate,
			version: 5,
			script: meta,
			uuid: Utilities.Token.generate()
		};

		TOKEN.INJECTED[userScript.id] = {
			namespace: attributes.meta.trueNamespace,
			name: attributes.meta.name,
			usedURL: DeepInject.useURL,
			isUserScript: true,
			parentUserScript: parentUserScript,
			parentUserScriptName: parentUserScriptName,
			private: script.private
		};

		userScript.setArguments(userScript.pieces.args).inject();

		if (attributes.runAtStart && DeepInject.useURL)
			Log('this page does not allow inline scripts.', '"' + attributes.meta.name + '"', 'wanted to run before the page loaded but couldn\'t.');

		if (!parentUserScript)
			Page.allowed.pushSource('user_script', attributes.meta.trueNamespace, {
				action: script.action
			});

		return userScript;
	},

	init: function () {
		if (globalSetting.disabled)
			return;
		
		if (Utilities.Page.isXML)
			return LogDebug('refusing to inject user scripts into XML page.');

		var enabledUserScripts = GlobalCommand('userScriptsForLocation', {
			pageLocation: Page.info.location,
			pageProtocol: Page.info.protocol,
			isFrame: Page.info.isFrame
		});

		for (var userScript in enabledUserScripts)
			if (!(enabledUserScripts[userScript].action % 2))
				Page.blocked.pushSource('user_script', userScript, {
					action: enabledUserScripts[userScript].action
				});
			else {
				if (enabledUserScripts[userScript].attributes.noframes && Page.info.isFrame)
					continue;

				if (enabledUserScripts[userScript].attributes.runAtStart)
					UserScript.inject(enabledUserScripts[userScript]);
				else
					UserScript.injectWhenLoaded(enabledUserScripts[userScript]);
			}
	},

	showInstallScriptPrompt: function (url) {
		var promptNotification = new PageNotification({
			highPriority: true,
			title: _('user_script'),
			subTitle: url,
			body: GlobalCommand('template.create', {
				template: 'injected',
				section: 'install-user-script-prompt'
			})
		});

		var installButton = promptNotification.addCloseButton(_('user_script.add_script'), function () {
			var result = GlobalCommand('installUserScriptFromURL', url);

			new PageNotification({
				highPriority: true,
				title: _('user_script'),
				subTitle: url,
				body: GlobalCommand('template.create', {
					template: 'injected',
					section: 'javascript-alert',
					data: {
						body: typeof result === 'string' ? _('user_script.add_success') : result
					}
				})
			});
		});

		installButton.classList.add('jsb-color-allowed');
	},

	helpers: {
		GM_getValue: function (key, defaultValue) {
			var result = messageExtensionSync('userScript.storage.getItem', {
				parentUserScript: GM_info.parentUserScript,
				key: key
			});

			if (result === undefined)
				return defaultValue;

			return result;
		},
		GM_setValue: function (key, value) {
			messageExtensionSync('userScript.storage.setItem', {
				parentUserScript: GM_info.parentUserScript,
				key: key,
				value: value
			});
		},
		GM_deleteValue: function (key) {
			messageExtensionSync('userScript.storage.removeItem', {
				parentUserScript: GM_info.parentUserScript,
				key: key
			});
		},
		GM_listValues: function () {
			return messageExtensionSync('userScript.storage.keys', {
				parentUserScript: GM_info.parentUserScript
			});
		},

		// RESOURCES
		GM_getResourceText: function (name) {
			var resource = messageExtensionSync('userScript.getResource', {
				parentUserScript: GM_info.parentUserScript,
				name: name
			});

			if (!resource)
				throw new Error('resource not found: ' + GM_info.script.name + '/' + name);

			return atob(resource.data);
		},
		GM_getResourceURL: function (name) {
			var resource = messageExtensionSync('userScript.getResource', {
				parentUserScript: GM_info.parentUserScript,
				name: name
			});

			if (!resource)
				throw new Error('resource not found: ' + GM_info.script.name + '/' + name);

			var URL = window.webkitURL || window.URL || {};

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

		GM_registerMenuCommand: function (caption, fn) {
			var fnWrapper = function (fn, target) {
				fn(document.querySelector('*[data-jsbContextMenuTarget="' + target + '"]'));
			}.bind(null, fn);

			messageExtension('registerMenuCommand', caption, fnWrapper, true);
		},

		GM_setClipboard: function () {
			// Do nothing
		},

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

UserScript.init();
