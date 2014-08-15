"use strict";

Settings.settings = {
	// Misc settings that are not user editable
	__misc: [{
		setting: 'extendedSupport',
		props: {
			default: Utilities.safariBuildVersion >= 537
		}
	}, {
		setting: 'donationVerified',
		props: {
			default: false
		}
	}, {
		setting: 'installID',
		props: {
			default: false
		}
	}, {
		setting: 'installedBundle',
		props: {
			default: 0
		}
	}, {
		setting: 'trialStart',
		props: {
			default: 0
		}
	}, {
		setting: 'isDisabled',
		props: {
			default: false
		}
	}, {
		setting: 'popoverSimpleHeight',
		props: {
			default: 350
		}
	}, {
		setting: 'popoverHeight',
		props: {
			default: 400
		}
	}, {
		setting: 'settingsPageTab',
		props: {
			default: 'for-welcome'
		}
	}, {
		setting: 'userScripts',
		props: {
			default: {}
		}
	}, {
		setting: 'EasyListLastUpdate',
		props: {
			type: 'number',
			default: 0
		}
	}, {
		setting: 'settingsPageCurrentSection',
		props: {
			type: 'string',
			default: 'ui'
		}
	}],

	// UI Settings
	ui: [{
		setting: 'useAnimations',
		props: {
			type: 'boolean',
			label: 'Use animations',
			default: true
		}
	}, {
		setting: 'largeFont',
		props: {
			type: 'boolean',
			label: 'Use a large font',
			default: false
		}
	}, {
		setting: 'persistDisabled',
		props: {
			type: 'boolean',
			label: 'Disabled mode persist across Safari restarts',
			default: false
		}
	}, {
		setting: 'showUnblocked',
		props: {
			type: 'boolean',
			label: 'Show scripts that can\'t be blocked',
			helpText: 'showUnblocked help',
			default: false,
			subSettings: [{
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'showUnblocked',
							needle: true
						}]
					}
				},
				settings: [{
					setting: 'hideInjected',
					props: {
						type: 'boolean',
						label: 'Hide injected helper scripts',
						default: true
					}
				}]
			}]
		}
	}, {
		setting: 'simplifyDomainNames',
		props: {
			type: 'boolean',
			label: 'Show domain descriptions when possible',
			default: true,
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.IS,
						key: 'simpleMode',
						needle: true
					}]
				}
			}
		}
	}, {
		setting: 'autoHideEasyList',
		props: {
			type: 'boolean',
			label: 'Automatically hide whitelisted and blacklisted items',
			default: false
		}
	}, {
		divider: true //===================================================================================
	}, {
		setting: 'language',
		props: {
			type: 'option',
			label: 'Language:',
			options: [
				['auto', 'Automatic'],
				['en-us', 'US English'],
				['de-de', 'Deutsch']
			],
			default: 'auto'
		}
	}, {
		setting: 'sourceCount',
		props: {
			type: 'option',
			label: 'Sources displayed by default:',
			default: Infinity,
			options: [
				[1, 1],
				[2, 2],
				[3, 3],
				[4, 4],
				[5, 5],
				[Infinity, 'All of them']
			]
		}
	}, {
		setting: 'toolbarDisplay',
		props: {
			type: 'option-radio',
			label: 'Toolbar badge shows number of:',			
			default: 'blocked',
			options: [
				['blocked', 'Blocked items'],
				['allowed', 'Allowed items'],
				['neither', 'Neither']
			]
		}
	}, {
		divider: true //===================================================================================
	}, {
		header: 'Extra features'
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'donationVerified',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'updateNotify',
			props: {
				type: 'boolean',
				label: 'Notify me about new updates',
				default: true
			}
		}, {
			setting: 'expertMode',
			props: {
				type: 'boolean',
				label: 'Enable expert features',
				subLabel: 'Create rules using regular expressions to block or allow individual items rather than hosts.',
				helpText: 'simpleMode help',
				default: false,
				confirm: [{
					when: true,
					prompt: 'A different rule set will be used in this mode.',
					onConfirm: function () {
						GlobalPage.message('convertSimpleToExpert');
					}
				}]
			}
		}, {
			setting: 'temporaryExpertSwitch',
			props: {
				type: 'boolean',
				label: 'Temporarily switch to expert mode when clicked',
				default: true,
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'expertMode',
							needle: false
						}]
					}
				}
			}
		}]
	}],

	// Rule settings
	rules: [{
		store: 'enabledKinds',
		props: {
			type: 'boolean',
			onChange: function () {
				Special.__enabled = null;
			}
		}
	}, {
		store: 'alwaysBlock',
		props: {
			type: 'option',
			options: [
				['nowhere', 'Nowhere'],
				['blacklist', 'Blacklist only'],
				['everywhere', 'Anywhere'],
				['host', 'Different hostnames'],
				['domain', 'Different hosts &amp; subdomains'],
			],
			onChange: function () {
				Resource.canLoadCache.clear().saveNow();
			}
		}
	}, {
		store: 'showPlaceholder',
		props: {
			type: 'boolean'
		}
	}, {
		store: 'easyLists',
		props: {
			type: 'dynamic-array',
			default: {
				$list: {
					enabled: true,
					value: ['https://easylist-downloads.adblockplus.org/easylist.txt', 'EasyList'],
				},
				$privacy: {
					enabled: true,
					value: ['https://easylist-downloads.adblockplus.org/easyprivacy.txt', 'EasyPrivacy'],
				},
				$malware: {
					enabled: true,
					value: ['https://easylist-downloads.adblockplus.org/malwaredomains_full.txt', 'EasyMalware']
				}
			}
		}
	}, {
		setting: 'easyLists',
		props: {
			label: 'EasyLists:',
			extend: {
				type: 'string',
				label: ['Add List', 'List URL:'],
				onPreSave: function (url) {
					if (!url.length)
						return alert('Invalid url1!');

					var theURLExist = true;

					if (theURLExist)
						return [url, url];

					return undefined;
				},
				onPostSave: function () {
					EasyList.fetch();
				}
			}
		}
	}, {
		setting: 'ignoreWhitelist',
		props: {
			type: 'boolean',
			label: 'Ignore whitelist rules',
			default: false
		}
	}, {
		setting: 'ignoreBlacklist',
		props: {
			type: 'boolean',
			label: 'Ignore blacklist rules',
			default: false
		}
	}, {
		setting: 'secureOnly',
		props: {
			type: 'boolean',
			label: 'Resources on secure sites must also be secure',
			subLabel: 'This will only affect items that have a blocker enabled.',
			default: true
		}
	}, {
		setting: 'allowExtensions',
		props: {
			type: 'boolean',
			label: 'Automatically allow resources from other extensions',
			default: true
		}
	}, {
		divider: true //===================================================================================
	}, {
		setting: 'quickAdd',
		props: {
			type: 'boolean',
			label: 'Enable Quick Add',
			default: true,
			subSettings: [{
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'quickAdd',
							needle: true
						}]
					}
				},
				settings: [{
					setting: 'quickAddSimpleOnly',
					props: {
						type: 'boolean',
						label: 'only in simple view',
						default: true
					}
				}]
			}]
		}
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'quickAdd',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'quickAddQuicker',
			props: {
				type: 'boolean',
				label: 'Use quicker Quick Add',
				default: false
			}
		}, {
			setting: 'quickAddTemporary',
			props: {
				type: 'boolean',
				label: 'Quick-add rules are temporary',
				default: false
			}
		}, {
			setting: 'quickAddType',
			props: {
				type: 'option',
				label: 'Create Quick Add rules for:',
				options: [[0, 'Same hostname as page host'], [1, 'Least domain of page host'], [2, 'All Domains']],
				default: 0
			}
		}]
	}, {
		divider: true //===================================================================================
	}, {
		setting: 'blockFirstVisit',
		props: {
			type: 'option',
			label: 'Block all resources on first visit to:',
			options: [
				['nowhere', 'Nowhere'],
				['host', 'Different hostnames'],
				['domain', 'Different hosts &amp; subdomains'],
			],
			default: 'nowhere',
			onChange: function () {
				Rules.list.firstVisit.rules.clear();
			}
		}
	}, {
		divider: true,
	}, {
		setting: 'enabledKinds',
		props: {
			readOnly: true,
			storeKey: 'disable',
			default: true
		}
	}, {
		setting: 'alwaysBlock',
		props: {
			readOnly: true,
			storeKey: 'disable',
			default: 'nowhere'
		}
	}, {
		setting: 'enabledKinds',
		props: {
			storeKey: 'script',
			label: 'Enable script blocker',
			default: true
		}
	}, {
		when: {
			hide: true,
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.NONE,
					key: 'enabledKinds',
					needle: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'script',
							needle: true
						}]
					}
				}]
			}
		},
		settings: [{
			setting: 'alwaysBlock',
			props: {
				storeKey: 'script',
				label: 'Automatically block scripts from:',
				help: 'alwaysBlock help',
				default: 'blacklist'
			}
		}]
	}, {
		divider: true //===================================================================================
	}, {
		header: 'Extra features',
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'donationVerified',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'enabledKinds',
			props: {
				storeKey: 'frame',
				label: 'Enable frame blocker',
				default: true
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.NONE,
						key: 'enabledKinds',
						needle: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'frame',
								needle: true
							}]
						}
					}]
				}
			},
			settings: [{
				setting: 'showPlaceholder',
				props: {
					storeKey: 'frame',
					label: 'Show a placeholder for blocked frames',
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'frame',
					label: 'Automatically block frames from:',
					help: 'alwaysBlock help',
					default: 'blacklist'
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'xhr_get',
				remap: 'xhr'
			}
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'xhr_post',
				remap: 'xhr'
			}
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'xhr_put',
				remap: 'xhr'
			}
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'xhr',
				label: 'Enable XHR blocker',
				default: true
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.NONE,
						key: 'enabledKinds',
						needle: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'xhr',
								needle: true
							}]
						}
					}]
				}
			},
			settings: [{
				setting: 'alwaysBlock',
				props: {
					storeKey: 'xhr_get',
					remap: 'xhr'
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'xhr_post',
					remap: 'xhr'
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'xhr_put',
					remap: 'xhr'
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'xhr',
					label: 'Automatically block XHRs to:',
					extendOptions: [['ask', 'Ask when neccessary']],
					help: 'alwaysBlock help',
					default: 'blacklist',
					onChange: function () {
						Special.__enabled = null;
					},
					subSettings: [{
						when: {
							hide: true,
							settings: {
								group: 'all',
								items: [{
									method: Utilities.Group.NONE,
									key: 'alwaysBlock',
									needle: {
										group: 'all',
										items: [{
											method: Utilities.Group.IS,
											key: 'xhr',
											needle: 'ask'
										}]
									}
								}]
							}
						},
						settings: [{
							setting: 'synchronousXHRMethod',
							props: {
								type: 'option',
								label: 'Synchronous XHR requests:',
								options: [[0, 'Automatically allow'], [1, 'Automatically block'], [2, 'Invasively ask']],
								default: 0,
								onChange: function () {
									Special.__enabled = null;
								},
								subSettings: [{
									when: {
										hide: true,
										settings: {
											group: 'all',
											items: [{
												method: Utilities.Group.IS_NOT,
												key: 'synchronousXHRMethod',
												needle: 2
											}]
										}
									},
									settings: [{
										setting: 'showSynchronousXHRNotification',
										props: {
											type: 'boolean',
											label: 'Show synchronous XHR notifications',
											default: true,
											onChange: function () {
												Special.__enabled = null;
											}
										}
									}]
								}]
							}
						}]
					}]
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'embed',
				label: 'Enable embed and object blocker',
				default: true
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.NONE,
						key: 'enabledKinds',
						needle: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'embed',
								needle: true
							}]
						}
					}]
				}
			},
			settings: [{
				setting: 'showPlaceholder',
				props: {
					storeKey: 'embed',
					label: 'Show a placeholder for blocked embeds and objects',
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'embed',
					label: 'Automatically block embeds and objects from:',
					help: 'alwaysBlock help',
					default: 'everywhere'
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'video',
				label: 'Enable video blocker',
				default: false
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.NONE,
						key: 'enabledKinds',
						needle: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'video',
								needle: true
							}]
						}
					}]
				}
			},
			settings: [{
				setting: 'showPlaceholder',
				props: {
					storeKey: 'video',
					label: 'Show a placeholder for blocked videos',
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'video',
					label: 'Automatically block videos from:',
					help: 'alwaysBlock help',
					default: 'everywhere'
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'image',
				label: 'Enable image hider',
				default: false
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.NONE,
						key: 'enabledKinds',
						needle: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'image',
								needle: true
							}]
						}
					}]
				}
			},
			hide: true,
			settings: [{
				setting: 'showPlaceholder',
				props: {
					storeKey: 'image',
					label: 'Show a placeholder for blocked images',
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'image',
					label: 'Automatically hide images from:',
					help: 'alwaysBlock help',
					default: 'blacklist'
				}
			}]
		}]
	}, {
		divider: true //===================================================================================
	}, {
		id: 'easy-list-update',
		description: 'Last EasyList update was never.'
	}, {
		button: 'updateEasyLists',
		props: {
			classes: 'single-click',
			label: ['Update lists now:', 'Update Now']
		},
	}],

	// Snapshot settings
	snapshots: [{
		header: 'Extra features'
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'donationVerified',
					needle: true
				}]
			}
		},
		settings: [{
			description: 'Snapshots description',
		}, {
			setting: 'enableSnapshots',
			props: {
				type: 'boolean',
				label: 'Enable rule snapshots',
				default: true,
				confirm: {
					when: false,
					prompt: 'Do you want to remove snapshots that exist?',
					onConfirm: function() {
						Settings.removeItem('Snapshots');
						alert(_('All snapshots have been removed.'), null, 1);
					}
				}
			}
		}, {
			when: {
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.IS,
						key: 'enableSnapshots',
						needle: true
					}]
				}
			},
			settings: [{
				setting: 'autoSnapshots',
				props: {
					type: 'boolean',
					label: 'Create a snapshot when rules are modified',
					default: true
				}
			}, {
				setting: 'snapshotsLimit',
				props: {
					type: 'range',
					label: ['Store only', 'unkept snapshots'],
					options: [1, 999],
					default: 15
				}
			}],
		}, {
			divider: true //===================================================================================
		}, {
			button: 'clearSnapshots',
			props: {
				classes: 'delete',
				label: ['Delete all snapshots:', 'Delete Snapshots']				
			}
		}]
	}],

	// Keyboard settings
	keyboard: [{
		store: 'keyboardTraverse',
		props: {
			type: 'boolean'
		}
	}, {
		description: 'Keyboard navigation helps you get around JavaScript Blocker using only the keyboard.'
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'mainActionsBar',
			label: 'Main window actions bar',
			default: false
		}
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'mainItems',
			label: 'Main window allowed/blocked/unblockable items',
			help: 'Holding option rule',
			default: false
		}
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'rulesFilterBar',
			label: 'Rule list filter bar',
			default: false
		}
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'rulesDomains',
			label: 'Rule list domains',
			default: false
		}
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'rulesRules',
			label: 'Rule list rules',
			default: false
		}
	}, {
		setting: 'keyboardTraverse',
		props: {
			storeKey: 'snapshots',
			label: 'Snapshots',
			default: false
		}
	}],

	// Other Features settings
	other: [{
		setting: 'confirmShortURL',
		props: {
			type: 'boolean',
			label: 'Confirm short URL redirects before they occur',
			default: false
		}
	}, {
		divider: true //===================================================================================
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'donationVerified',
					needle: true
				}]
			}
		},
		settings: [{
			store: 'enabledSpecials',
			props: {
				type: 'mixed',
				onChange: function () {
					Special.__enabled = null;
				}
			}
		}, {
			header: 'Extra features'
		}, {
			setting: 'blockReferrer',
			props: {
				type: 'boolean',
				label: 'EXPERIMENTAL: Enable full referer blocking',
				help: 'blockReferrer help',
				default: false,
				confirm: [{
					when: true,
					prompt: 'blockReferrer help'
				}],
				subSettings: [{
					when: {
						hide: true,
						settings: {
							group: 'all',
							items: [{
								method: Utilities.Group.IS,
								key: 'blockReferrer',
								needle: true
							}]
						}
					},
					settings: [{
						setting: 'focusNewTab',
						props: {
							type: 'boolean',
							label: 'When a new tab opens, make it active',
							default: true
						}
					}]
				}]
			}
		}, {
			divider: true //===================================================================================
		}, {
			description: 'Once any of these features are active'
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'xhr_intercept',
				readOnly: true,
				default: function () {
					return Settings.getItem('enabledKinds', 'xhr') && {
						alwaysBlock: Settings.getItem('alwaysBlock', 'xhr'),
						synchronousXHRMethod: Settings.getItem('synchronousXHRMethod'),
						showSynchronousXHRNotification: Settings.getItem('showSynchronousXHRNotification')
					};
				}
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'simple_referrer',
				label: 'Prevent links on webpages from sending referers',
				subLabel: 'Links sending referrers',
				help: 'simpleReferrer help',
				default: true,
				confirm: [{
					when: true,
					prompt: function () {
						var result;

						var longurl = 'http://api.longurl.org/v2/expand?format=json&url=http%3A%2F%2Fis.gd%2Fw';

						$.ajax({
							async: false,
							url: longurl,
							dataType: 'json'
						}).done(function (res) {
							result = res['long-url'] ? confirm(_('confirmShortURL confirm')) : alert(_('You cannot enable confirmShortURL'));
						}).fail(function (error) {
							result = alert(_('You cannot enable confirmShortURL'));
						});

						return result;
					}
				}]
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'alert_dialogs',
				label: 'Display alert() messages within the webpage instead of a popup dialog',
				subLabel: 'Modal alert popups',
				default: true
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'contextmenu_overrides',
				label: 'Prevent webpages from disabling or using a custom context menu and prevent other extensions from creating menu items',
				subLabel: 'Context menu overrides',
				help: 'contextmenu_overrides help',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'window_resize',
				label: 'Prevent webpages from resizing the window and creating new windows with a custom size',
				subLabel: 'Window resize functions',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'autocomplete_disabler',
				label: 'Prevent webpages from disabling autocomplete',
				subLabel: 'Autocomplete disablers',
				default: true
			}
		}, {
			when: {
				hide: true,
				settings: {
					group: 'all',
					items: [{
						method: Utilities.Group.IS,
						key: 'canBlockInlineScripts',
						needle: true
					}]
				}
			},
			settings: [{
				setting: 'enabledSpecials',
				props: {
					type: 'boolean',
					storeKey: 'inline_scripts',
					label: 'Prevent inline scripts from being executed',
					subLabel: 'Inline script execution',
					default: false
				}
			}]
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'environmental_information',
				label: 'Randomize browser information',
				subLabel: 'Environmental information',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'canvas_data_url',
				label: 'Canvas data URL access',
				subLabel: 'Canvas data URL access',
				options: [[false, 'Always allow'], [1, 'Always ask'], [2, 'Ask once per domain'], [3, 'Ask once per domain for session'], [4, 'Always block']],
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'font',
				label: 'Custom font for webpages:',
				subLabel: 'Default webpage font',
				options: [[false, 'Webpage default'], ['Helvetica', 'Helvetica'], ['Arial', 'Arial'], ['Times', 'Times'], ['Comic Sans MS', 'Comic Sans MS']],
				default: false,
				otherOption: {
					prompt: 'Enter a custom font name to use.',
					validate: function (value) {
						return /^[a-z0-9_-]+$/g.test(value);
					}
				}
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'zoom',
				label: 'Custom zoom level for webpages:',
				subLabel: 'Default webpage zoom level',
				options: [[false, 'Webpage default'], [60, '60%'], [80, '80%'], [100, '100%'], [120, '120%'], [140, '140%'], [160, '160%'], [180, '180%'], [200, '200%']],
				default: false,
				otherOption: {
					prompt: 'Enter a custom zoom level to use.',
					validate: function (value) {
						return /^-?[0-9]+$/g.test(value);
					}
				}
			}
		}]
	}],

	// User script settings
	userScript: {
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

	// About page
	__about: {
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
	__search: {
		headerSearch: {
			classes: 'extras',
			label: '',
			setting: null
		}
	}
};

for (var section in Settings.settings)
	Settings.createMap(Settings.settings[section]);
