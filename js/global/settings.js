"use strict";

var Settings = {
	__stores: new Store('SettingAsStore'),

	getItem: function (setting, JSON) {
		var getMethod = JSON ? 'getJSON' : 'getItem',
				storedValue = SettingStore.available ? SettingStore[getMethod](setting) : Settings.current_value(setting);

		var value = storedValue === null ? ((setting in Settings.items) ? Settings.items[setting].default : null) : storedValue;


		return value;
	},
	getStore: function (setting) {
		var cached = this.__stores.get(setting);

		if (cached)
			return cached;

		return this.__stores.getStore(setting, {
			defaultValue: this.getItem(setting, true)
		});
	},

	getJSON: function (setting) {
		return this.getItem(setting, true);
	},

	setItem: function (setting, value) {
		if (SettingStore.available)
			SettingStore.setItem(setting, value);
	},

	setJSON: function (setting, value) {
		return SettingStore.setJSON(setting, value);
	},

	removeItem: function (setting) {
		if (SettingStore.available)
			SettingStore.removeItem(setting);
	}
};

Settings._alwaysBlockHelp = 'alwaysBlock help';
Settings._alwaysBlock = [['domain', 'Different hostnames'], ['topLevel', 'Different hosts &amp; subdomains'], ['nowhere', 'Blacklist only'], ['trueNowhere', 'Nowhere'], ['everywhere', 'Anywhere']];
Settings._alwaysBlockAjax = Settings._alwaysBlock.slice(0);
Settings._alwaysBlockAjax.push(['ask', 'Ask when neccessary']);

Settings.settings = {
	misc: {
		extendedSupport: {
			default: parseInt(window.navigator.appVersion.split('Safari/')[1].split('.')[0], 10) >= 537
		},
		donationVerified: {
			default: false
		},
		enablespecial: {
			default: true
		},
		enableuser_script: {
			default: true
		},
		enabledisable: {
			default: true
		},
		enableajax_get: {
			default: true
		},
		enableajax_post: {
			default: true
		},
		enableajax_put: {
			default: true
		},
		installID: {
			default: false
		},
		installedBundle: {
			default: 0
		},
		trialStart: {
			default: 0
		},
		Snapshots: {
			default: {}
		},
		SimpleRulesUseTracker: {
			default: {}
		},
		RulesUseTracker: {
			default: {}
		},
		usingSnapshot: {
			default: 0
		},
		isDisabled: {
			default: false
		},
		unblockedSwitch: {
			default: 1
		},
		popoverSimpleHeight: {
			default: 350
		},
		popoverHeight: {
			default: 400
		},
		settingsPageTab: {
			default: 'for-welcome'
		},
		userScriptResources: {
			default: {}
		},
		userScriptRequirements: {
			default: {}
		},
		userScripts: {
			default: {}
		},
		EasyListLastUpdate: {
			default: 0
		}
	},
	ui: {
		animations: {
			label: 'Use animations',
			setting: true,
			default: true
		},
		largeFont: {
			label: 'Use a large font',
			setting: true,
			default: false
		},
		persistDisabled: {
			label: 'Disabled mode persist across Safari restarts',
			setting: false,
			default: false
		},
		showUnblocked: {
			label: 'Show scripts that can\'t be blocked',
			setting: true,
			help: 'showUnblocked help',
			default: false
		},
		hideInjected: {
			label: 'Hide injected helper scripts',
			setting: true,
			default: true,
			indent: 1,
			if_setting: { showUnblocked: true }
		},
		simplifyDomainNames: {
			label: 'Show domain descriptions when possible',
			setting: true,
			default: true,
			if_setting: { simpleMode: true }
		},
		filterBarAge: {
			label: 'Show "Not Used In Past" filter bar',
			setting: true,
			default: false,
			header: 'Rule List Filter Bars'
		},
		filterBarUsed: {
			label: 'Show "Used In Past" filter bar',
			setting: true,
			default: false,
			divider: 1
		},
		language: {
			label: 'Language:',
			setting: [['Automatic', 'Automatic'], ['en-us', 'US English'], ['de-de', 'Deutsch']],
			default: 'Automatic'
		},
		sourceCount: {
			label: 'Sources displayed by default:',
			setting: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [99999999, 'All of them']],
			default: '99999999'
		},
		toolbarDisplay: {
			label: 'Toolbar badge shows number of:',
			setting: [['blocked', 'Blocked items'], ['allowed', 'Allowed items'], ['neither', 'Neither']],
			radio: true,
			divider: 1,
			default: 'blocked'
		},
		updateNotify: {
			label: 'Notify me about new updates',
			setting: true,
			default: true,
			extras: 1,
			extra: 1,
			divider: 1
		},
		simpleMode: {
			label: 'Enable expert features',
			setting: true,
			opposite: 1,
			default: true,
			help: 'simpleMode help',
			extra: 1,
			ask: {
				checked: true,
				question: 'A different rule set will be used in this mode.',
				action: function () {
					GlobalPage.message('convertSimpleToExpert');
				}
			}
		},
		temporaryExpertSwitch: {
			label: 'Temporarily switch to expert mode when clicked',
			setting: true,
			if_setting: { simpleMode: true },
			default: true,
			extra: 1
		},
	},
	predefined: {
		enabledKinds: {
			type: 'multi-boolean',
			default: {
				disable: true,
				script: true,
				frame: true,
				embed: true,
				video: false,
				image: false,
				ajax_get: true,
				ajax_put: true,
				special: true
			}
		},
		easyLists: {
			type: 'multi-map-boolean',
			default: {
				list: [true, 'https://easylist-downloads.adblockplus.org/easylist.txt'],
				privacy: [true, 'https://easylist-downloads.adblockplus.org/easyprivacy.txt'],
				malware: [true, 'https://easylist-downloads.adblockplus.org/malwaredomains_full.txt']
			}
		},
		alwaysBlock: {
			type: 'multi-string',
			default: {
				disable: 'trueNowhere',
				script: 'nowhere',
				frame: 'nowhere',
				embed: 'nowhere',
				video: 'nowhere',
				image: 'everywhere',
				ajax_get: 'nowhere',
				ajax_put: 'nowhere',
				special: 'everywhere'
			}
		},
		showPlaceholder: {
			type: 'multi-boolean',
			default: {
				frame: true,
				embed: true,
				video: true,
				image: true,
			}
		},

		ignoreWhitelist: {
			label: 'Ignore whitelist rules',
			setting: true,
			default: false
		},
		ignoreBlacklist: {
			label: 'Ignore blacklist rules',
			setting: true,
			default: false
		},
		secureOnly: {
			label: 'Resources on secure sites must also be secure',
			setting: true,
			default: true
		},
		allowExtensions: {
			label: 'Automatically allow resources from other extensions',
			setting: true,
			default: true,
			divider: 1
		},
		quickAdd: {
			label: 'Enable Quick Add',
			default: true,
			setting: true
		},
		quickAddSimpleOnly: {
			label: 'only in simple view',
			if_setting: { quickAdd: true },
			indent: 1,
			default: true,
			setting: true
		},
		quickAddQuicker: {
			label: 'Use quicker Quick Add',
			if_setting: { quickAdd: true },
			default: false,
			setting: true
		},
		quickAddTemporary: {
			label: 'Quick-add rules are temporary',
			default: false,
			setting: true,
			if_setting: { quickAdd: true }
		},
		quickAddType: {
			label: 'Create Quick Add rules for:',
			default: '0',
			setting: [[0, 'Same hostname as page host'], [1, 'Least domain of page host'], [2, 'All Domains']],
			divider: 1,
			if_setting: { quickAdd: true }
		},
		enablescript: {
			label: 'Enable script blocker',
			setting: true,
			default: true
		},
		alwaysBlockscript: {
			label: 'Automatically block scripts from:',
			setting: Settings._alwaysBlock.slice(0),
			divider: 1,
			if_setting: { enablescript: true },
			help: Settings._alwaysBlockHelp,
			default: 'nowhere'
		},
		enableframe: {
			label: 'Enable frame blocker',
			setting: true,
			extras: 1,
			default: true,
			extra: 1
		},
		showPlaceholderframe: {
			label: 'Show a placeholder for blocked frames',
			setting: true,
			if_setting: { enableframe: true },
			default: true,
			extra: 1
		},
		alwaysBlockframe: {
			label: 'Automatically block frames from:',
			setting: Settings._alwaysBlock.slice(0),
			divider: 1,
			if_setting: { enableframe: true },
			help: Settings._alwaysBlockHelp,
			default: 'nowhere',
			extra: 1
		},
		enableajax: {
			label: 'Enable XHR request blocker',
			setting: true,
			default: true,
			extra: 1
		},
		alwaysBlockajax: {
			label: 'Automatically block XHRs to:',
			setting: Settings._alwaysBlockAjax.slice(0),
			if_setting: { enableajax: true },
			help: Settings._alwaysBlockHelp,
			default: 'nowhere',
			extra: 1,
			divider: 1
		},
		enableembed: {
			label: 'Enable embed and object blocker',
			setting: true,
			default: false,
			extra: 1
		},
		showPlaceholderembed: {
			label: 'Show a placeholder for blocked embeds and objects',
			setting: true,
			if_setting: { enableembed: true },
			default: true,
			extra: 1
		},
		alwaysBlockembed: {
			label: 'Automatically block embeds and objects from:',
			setting: Settings._alwaysBlock.slice(0),
			divider: 1,
			if_setting: { enableembed: true },
			help: Settings._alwaysBlockHelp,
			default: 'everywhere',
			extra: 1
		},
		enablevideo: {
			label: 'Enable video blocker',
			setting: true,
			default: false,
			extra: 1
		},
		showPlaceholdervideo: {
			label: 'Show a placeholder for blocked videos',
			setting: true,
			if_setting: { enablevideo: true },
			default: true,
			extra: 1
		},
		alwaysBlockvideo: {
			label: 'Automatically block videos from:',
			setting: Settings._alwaysBlock.slice(0),
			divider: 1,
			if_setting: { enablevideo: true },
			help: Settings._alwaysBlockHelp,
			default: 'everywhere',
			extra: 1
		},
		enableimage: {
			label: 'Enable DOM image blocker',
			setting: true,
			help: 'enableimage help',
			default: false,
			extra: 1
		},
		showPlaceholderimage: {
			label: 'Show a placeholder for blocked images',
			setting: true,
			if_setting: { enableimage: true },
			default: true,
			extra: 1
		},
		alwaysBlockimage: {
			label: 'Automatically block images from:',
			setting: Settings._alwaysBlock.slice(0),
			if_setting: { enableimage: true },
			help: Settings._alwaysBlockHelp,
			default: 'nowhere',
			extra: 1,
			divider: 1
		},
		easy_list_last_update: {
			id: 'easy-list-update',
			label: '',
			classes: 'description'
		},
		easyListNow: {
			classes: 'single-click',
			label: 'Update lists now:',
			setting: 'Update Now'
		},
	},
	snapshots: {
		enableSnapshots: {
			default: true,
			setting: true,
			label: 'Enable rule snapshots',
			extra: 1,
			extras: 1,
			description: 'Snapshots description',
			ask: {
				checked: false,
				question: 'Do you want to remove snapshots that exist?',
				action: function() {
					Settings.set_value('Snapshots', '{}');
					alert(_('All snapshots have been removed.'), null, 1);
				}
			}
		},
		autoSnapshots: {
			default: true,
			setting: true,
			label: 'Create a snapshot when rules are modified',
			extra: 1,
			if_setting: { enableSnapshots: true }
		},
		snapshotsLimit: {
			default: 15,
			setting: 1,
			label: 'Store only',
			label_after: 'unkept snapshots',
			extra: 1,
			min: 1,
			max: 999,
			divider: 1,
			if_setting: { enableSnapshots: true }
		},
		clearSnapshots: {
			label: 'Delete all snapshots:',
			setting: 'Delete Snapshots',
			extra: 1,
			classes: 'delete'
		}
	},
	keyboard: {
		traverseMainActions: {
			default: false,
			setting: true,
			label: 'Main window actions bar',
			description: 'Keyboard navigation helps you get around JavaScript Blocker using only the keyboard.',
		},
		traverseMainItems: {
			default: false,
			setting: true,
			label: 'Main window allowed/blocked/unblockable items',
			help: 'Holding option rule'
		},
		traverseRulesFilter: {
			default: false,
			setting: true,
			label: 'Rule list filter bar'
		},
		traverseRulesDomains: {
			default: false,
			setting: true,
			label: 'Rule list domains'
		},
		traverseRulesRules: {
			default: false,
			setting: true,
			label: 'Rule list rules'
		},
		traverseSnapshots: {
			default: false,
			setting: true,
			label: 'Snapshots'
		}
	},
	other: {
		specials: {
			setting: {},
			isStore: true,
			default: {
				simple_referrer: {
					value: true
				},
				alert_dialogs: {
					value: true
				},
				contextmenu_overrides: {
					value: false
				},
				window_resize: {
					value: false
				},
				autocomplete_disabler: {
					value: false
				},
				inline_scripts: {
					value: false
				},
				navigator_override: {
					value: false
				},
				font: {
					value: false
				},
				zoom: {
					value: 80,
					allowCustom: true,
					options: [
						[false, 'Webpage default'],
						[60, '60%'],
						[80, '80%'],
						[100, '100%'],
						[140, '140%']
					]
				}
			}
		},

		confirmShortURL: {
			label: 'Confirm short URL redirects before they occur',
			setting: true,
			default: false,
			divider: 1,
			confirm: function () {
				var u = 'http://api.longurl.org/v2/expand?format=json&url=http%3A%2F%2Fis.gd%2Fw', r;

				$.ajax({
					async: false,
					url: u,
					dataType: 'json'
				}).done(function (s) {
					r = s['long-url'] ? confirm(_('confirmShortURL confirm')) : alert(_('You cannot enable confirmShortURL'));
				}).fail(function (er) {
					r = alert(_('You cannot enable confirmShortURL'));
				});

				return r;
			}
		},
		blockReferrer: {
			label: 'EXPERIMENTAL: Enable full referer blocking',
			setting: true,
			extras: 1,
			default: false,
			extra: 1,
			help: 'blockReferrer help',
			confirm: function () {
				return confirm(_('blockReferrer help'));
			}
		},
		focusNewTab: {
			label: 'When a new tab opens, make it active',
			setting: true,
			default: true,
			extra: 1,
			divider: 1,
			indent: 1,
			if_setting: { blockReferrer: true }
		},
		enable_special_simple_referrer: {
			label: 'Prevent links on webpages from sending referers',
			setting: true,
			description: 'Once any of these features are active,',
			help: 'simpleReferrer help',
			default: true,
			extra: 1
		},
		enable_special_alert_dialogs: {
			label: 'Display alert() messages within the webpage instead of a popup dialog',
			setting: true,
			default: true,
			extra: 1
		},
		enable_special_contextmenu_overrides: {
			label: 'Prevent webpages from disabling or using a custom context menu and prevent other extensions from creating menu items',
			setting: true,
			help: 'contextmenu_overrides help',
			default: false,
			extra: 1
		},
		enable_special_window_resize: {
			label: 'Prevent webpages from resizing the window and creating new windows with a custom size',
			setting: true,
			default: false,
			extra: 1
		},
		enable_special_autocomplete_disabler: {
			label: 'Prevent webpages from disabling autocomplete',
			setting: true,
			default: true,
			extra: 1
		},
		enable_special_inline_scripts: {
			label: 'Prevent inline scripts from being executed',
			setting: true,
			default: false,
			if_setting: { extendedSupport: true },
			help: 'inline_scripts help',
			extra: 1
		},
		enable_special_navigator_override: {
			label: 'Randomize browser information',
			setting: true,
			default: false,
			extra: 1
		},
		enable_special_font: {
			label: 'Custom font for webpages:',
			prompt: 'Enter a custom font name to use.',
			label_after: 'Default webpage font',
			setting: [[0, 'Webpage default'], ['Helvetica', 'Helvetica'], ['Arial', 'Arial'], ['Times', 'Times'], ['Comic Sans MS', 'Comic Sans MS'], ['other', 'Other…']],
			default: '0',
			extra: 1
		},
		enable_special_zoom: {
			label: 'Custom zoom level for webpages:',
			label_after: 'Default webpage zoom level',
			prompt: 'Enter a custom zoom level to use.',
			setting: [[0, 'Webpage default'], [60, '60%'], [80, '80%'], [100, '100%'], [120, '120%'], [140, '140%'], [160, '160%'], [180, '180%'], [200, '200%'], ['other', 'Other…']],
			default: '0',
			extra: 1
		}
	},
	custom: {
		userScriptsContainer: {
			extras: 1,
			description: 'custom helper description',
		},
		createUserScript: {
			classes: 'single-click',
			setting: 'Create Script',
			label: '',
			extra: 1,
			divider: 1
		},
		user_script_last_update: {
			id: 'user-script-update',
			label: '',
			classes: 'description',
			extra: 1
		},
		userScriptNow: {
			classes: 'single-click',
			label: 'Update user scripts now:',
			setting: 'Update Now',
			extra: 1
		},
		userScriptRedownload: {
			classes: 'single-click',
			label: 'Re-download user scripts:',
			setting: 'Download',
			extra: 1
		}
	},
	about: {
		header: {
			label: false,
			description: [
				'<a href="http://javascript-blocker.toggleable.com/" target="_top">',
					'<img src="images/toggleable.png" alt="Toggleable" style="margin-left:-8px;" width="143" height="59" />',
					'<img src="Icon-64.png" alt="JavaScript Blocker" style="margin-bottom:14px;margin-left:5px;" width="32" height="32" />',
				'</a>',
				'<h4>JavaScript Blocker <span id="js-displayv"></span> (<span id="js-bundleid"></span>)</h4>'].join('')
		},
		trial: {
			id: 'trial-remaining',
			label: '',
			classes: 'description',
			divider: 1
		},
		resetSettings: {
			label: 'Reset all settings to their default values:',
			setting: 'Reset Settings',
			classes: 'delete'
		},
		removeRules: {
			label: 'Remove all rules:',
			setting: 'Remove Rules',
			divider: 1,
			classes: 'delete'
		},
		showWelcome: {
			label: 'Show welcome:',
			setting: 'Show Welcome',
			classes: 'single-click',
			divider: 1
		},
		createBackup: {
			label: 'Create a full backup:',
			setting: 'Create Backup',
			extra: 1,
			description: 'Full backup description',
			classes: 'single-click'
		},
		importBackup: {
			label: 'Import a full backup:',
			setting: 'Import Backup',
			extra: 1,
			classes: 'single-click'
		}
	},
	search: {
		headerSearch: {
			classes: 'extras',
			label: '',
			setting: null
		}
	}
};

Settings.items = {};

for (var section in Settings.settings) {
	if (section === 'about' || section === 'welcome')
		continue;

	for (var setting in Settings.settings[section])
		Settings.items[setting] = {
			default: Settings.settings[section][setting].default,
			editable: section !== 'misc'
		}
}
