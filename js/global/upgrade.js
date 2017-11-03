/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Upgrade = {
	__specialMap: {
		ajax_intercept: 'xhr_intercept',
		inline_scripts: 'inline_script_execution',
		navigator_override: 'environmental_information',
		canvas_fingerprinting: 'canvas_data_url'
	},

	importRulesFromJSB4: function (rules) {
		try {
			rules = Object._isPlainObject(rules) ? rules : JSON.parse(rules);
		} catch (e) {
			return false;
		}

		if (!Object._isPlainObject(rules))
			return false;

		if (rules.rules || rules.simpleRules) {
			if (rules.rules)
				Upgrade.importRulesFromJSB4(rules.rules);

			if (rules.simpleRules)
				Upgrade.importRulesFromJSB4(rules.simpleRules);

			return;
		}

		var kind,
			newKind,
			domain,
			newDomain,
			addRule,
			rule,
			newRule,
			ruleProto,
			newRuleProto;

		for (kind in rules) {
			newKind = kind.replace(/ajax_/, 'xhr_').replace(/hide_/, 'hide:');

			for (domain in rules[kind]) {
				newDomain = domain === '.*' ? '*' : domain;
				addRule = Rules.isRegExp(newDomain) ? Rules.list.user.addPage : Rules.list.user.addDomain;

				for (rule in rules[kind][domain]) {
					if (newKind._endsWith('special')) {
						if (rule._contains(' ') || rule._contains(':'))
							continue;

						newRule = Upgrade.__specialMap.hasOwnProperty(rule) ? Upgrade.__specialMap[rule] : rule;
					} else if (Rules.isRegExp(rule))
						newRule = rule;
					else {
						ruleProto = rule.substr(0, rule.indexOf(':'));

						if (ruleProto.match(/^[A-Z,]+$/i)) {
							newRuleProto = ruleProto.split(/,/).map(function (proto) {
								return proto.toLowerCase() + ':';
							}).join(',');

							newRule = newRuleProto + '|' + rule.substr(ruleProto.length + 1);
						} else
							newRule = rule;
					}

					if (rule === '.*')
						newRule = '*';

					addRule(newKind, newDomain, {
						rule: newRule,
						action: (parseInt(rules[kind][domain][rule][0], 10) % 2) ? 1 : 0
					});
				}				
			}
		}

		Rules.list.user.rules.saveNow();
	},

	importJSB4Backup: function (settings) {
		if (settings.rules)
			Upgrade.importRulesFromJSB4(settings.rules);

		if (settings.simpleRules)
			Upgrade.importRulesFromJSB4(settings.simpleRules);

		var settingMapRef,
			settingConversion,
			settingKey,
			storeKey,
			value;

		if (Object._isPlainObject(settings.settings)) {
			for (var setting in settings.settings) {
				storeKey = undefined;

				settingMapRef = Upgrade.settings.map[setting];

				if (settingMapRef) {
					if (typeof settingMapRef === 'function') {
						settingConversion = settingMapRef(settings.settings[setting]);

						settingKey = settingConversion.key;
						storeKey = settingConversion.storeKey;
						value = settingConversion.value;
					} else {
						settingKey = settingMapRef === true ? setting : settingMapRef;
						value = settings.settings[setting];
					}

					Settings.setItem(settingKey, value, storeKey);
				}
			}

			try {
				var userScriptNS,
					userScript;

				var userScripts = JSON.parse(Utilities.decode(settings.settings.userScripts));

				for (userScript in userScripts) {
					userScriptNS = UserScript.add(userScripts[userScript].script);

					if (typeof userScriptNS === 'string') {
						UserScript.setAttribute(userScriptNS, 'developerMode', userScripts[userScript].developerMode);
						UserScript.setAttribute(userScriptNS, 'autoUpdate', !!userScripts[userScript].autoUpdate);
					}

				}

				Settings.__stores.saveNow(false);

				UserScript.scripts.saveNow(false);
			} catch (error) {
				LogError('failed to import user scripts from JSB4 backup', error);
			}
		}
	},

	settings: {
		mapAlwaysBlock: function (value) {
			if (value === 'domain')
				return 'host';
			else if (value === 'topLevel')
				return 'domain';
			else if (value === 'nowhere')
				return 'blacklist';
			else if (value === 'trueNowhere')
				return 'nowhere';

			return value;
		},

		map: {
			persistDisabled: true,
			toolbarDisplay: true,
			updateNotify: true,
			ignoreWhitelist: true,
			ignoreBlacklist: true,
			autoSnapshots: true,
			snapshotsLimit: true,

			animations: 'useAnimations',
			largeFont: 'largeFont',
			showUnblocked: 'showUnblockedScripts',
			hideJSBInjected: 'hideInjected',
			simplifyDomainNames: 'showItemDescription',
			hideWhitelistBlacklistItems: 'autoHideBlacklist',

			quickAddTemporary: function (value) {
				return {
					key: 'defaultRuleList',
					value: value ? 'temporary' : 'last'
				};
			},

			quickAddType: function (value) {
				value = parseInt(value, 10);

				return {
					key: 'defaultRuleDomain',
					value: value === 0 ? 'host' : (value === 1 ? 'domain' : 'all')
				};
			},

			language: function (value) {
				return {
					key: 'language',
					value: value === 'Automatic' ? 'auto' : value
				};
			},
			
			simpleMode: function (value) {
				return {
					key: 'showResourceURLs',
					value: !value
				};
			},

			enablescript: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'script',
					value: value
				};
			},

			alwaysBlockscript: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'script',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			enableframe: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'frame',
					value: value
				};
			},

			alwaysBlockframe: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'frame',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			showPlaceholderframe: function (value) {
				return {
					key: 'showPlaceholder',
					storeKey: 'frame',
					value: value
				};
			},

			enableajax: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'xhr',
					value: value
				};
			},

			alwaysBlockajax: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'xhr',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			enablevideo: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'video',
					value: value
				};
			},

			alwaysBlockvideo: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'video',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			showPlaceholdervideo: function (value) {
				return {
					key: 'showPlaceholder',
					storeKey: 'video',
					value: value
				};
			},

			enableimage: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'image',
					value: value
				};
			},

			alwaysBlockimage: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'image',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			showPlaceholderimage: function (value) {
				return {
					key: 'showPlaceholder',
					storeKey: 'image',
					value: value
				};
			},

			enableembed: function (value) {
				return {
					key: 'enabledKinds',
					storeKey: 'embed',
					value: value
				};
			},

			alwaysBlockembed: function (value) {
				return {
					key: 'alwaysBlock',
					storeKey: 'embed',
					value: Upgrade.settings.mapAlwaysBlock(value)
				};
			},

			showPlaceholderembed: function (value) {
				return {
					key: 'showPlaceholder',
					storeKey: 'embed',
					value: value
				};
			},

			enable_special_simple_referrer: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'simple_referrer',
					value: value
				};
			},

			enable_special_alert_dialogs: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'alert_dialogs',
					value: value
				};
			},

			enable_special_contextmenu_overrides: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'contextmenu_overrides',
					value: value
				};
			},

			enable_special_window_resize: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'window_resize',
					value: value
				};
			},

			enable_special_autocomplete_disabler: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'autocomplete_disabler',
					value: value
				};
			},

			enable_special_inline_scripts: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'inline_script_execution',
					value: value
				};
			},

			enable_special_navigator_override: function (value) {
				return {
					key: 'enabledSpecials',
					storeKey: 'environmental_information',
					value: value
				};
			},

			enable_special_canvas_fingerprinting: function (value) {
				value = parseInt(value, 10);

				if (value === 0)
					value = false;
				else if (value === 1)
					value = 2;
				else
					value = 4;
				
				return {
					key: 'enabledSpecials',
					storeKey: 'canvas_data_url',
					value: value
				};
			},

			enable_special_font: function (value) {
				value = parseInt(value, 10);

				if (value === 0 || value === '0')
					value = false;

				return {
					key: 'enabledSpecials',
					storeKey: 'font',
					value: value
				};
			},

			enable_special_zoom: function (value) {
				value = parseInt(value, 10);

				if (value === 0 || value === '0')
					value = false;

				return {
					key: 'enabledSpecials',
					storeKey: 'zoom',
					value: value
				};
			}
		}
	}
};
