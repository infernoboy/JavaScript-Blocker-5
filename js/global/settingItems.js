"use strict";

Settings.settings = {
	// Misc settings that are not user editable
	__misc: [{
		setting: 'donationVerified',
		props: {
			type: 'boolean',
			default: true // Make sure I change this to false before general release..
		}
	}, {
		setting: 'installID',
		props: {
			type: 'string',
			default: false
		}
	}, {
		setting: 'installedBundle',
		props: {
			type: 'number',
			default: 0
		}
	}, {
		setting: 'trialStart',
		props: {
			type: 'number',
			default: 0
		}
	}, {
		setting: 'isDisabled',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'settingsPageTab',
		props: {
			type: 'string',
			default: 'for-welcome'
		}
	}, {
		setting: 'EasyListLastUpdate',
		props: {
			type: 'number',
			default: 0
		}
	}, {
		setting: 'settingCurrentView',
		props: {
			type: 'string',
			default: '#setting-views-general'
		}
	}, {
		setting: 'popoverWidth',
		props: {
			type: 'number',
			default: 501
		}
	}, {
		setting: 'popoverWidthExpanded',
		props: {
			type: 'number',
			default: 601
		}
	}, {
		setting: 'popoverHeight',
		props: {
			type: 'number',
			default: 391
		}
	}, {
		setting: 'popoverHeightExpanded',
		props: {
			type: 'number',
			default: 441
		}
	}, {
		setting: 'pageHostColumnAllowedWidth',
		props: {
			type: 'number',
			default: 0.5
		}
	}, {
		setting: 'lastRuleWasTemporary',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'setupComplete',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		store: 'expander',
		props: {
			type: 'many-boolean'
		}
	}, {
		setting: 'persistDisabled',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'disablingReloadsAll',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'showPageEditorImmediately',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'alwaysUseTimedDisable',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'disableTime',
		props: {
			type: 'option',
			options: [
				[5000, '5 seconds'],
				[60000, '1 minute'],
				[300000, '5 minutes'],
				[600000, '10 minutes'],
				[1800000, '30 minutes'],
				[3600000, '1 hour']
			],
			default: 5000
		}
	}, {
		setting: 'showHiddenItems',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'showItemDescription',
		props: {
			type: 'boolean',
			default: true
		}
	}],

	// General Settings
	general: [{
		setting: 'useAnimations',
		props: {
			type: 'boolean',
			default: true,
			onChange: function () {
				var useAnimations = Settings.getItem('useAnimations');

				window.globalSetting.speedMultiplier = useAnimations ? 1 : 0.001;

				Popover.window.document.body.classList.toggle('jsb-no-animations', !useAnimations);
			}
		}
	}, {
		setting: 'largeFont',
		props: {
			type: 'boolean',
			default: false,
			onChange: function () {
				var useLargeFont = Settings.getItem('largeFont');

				Popover.window.document.documentElement.classList.toggle('jsb-large-font', useLargeFont);
			}
		}
	}, {
		setting: 'showUnblockedScripts',
		props: {
			type: 'boolean',
			helpText: 'showUnblocked help',
			default: false,
			subSettings: [{
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'showUnblockedScripts',
							needle: true
						}]
					}
				},
				settings: [{
					setting: 'hideInjected',
					props: {
						type: 'boolean',
						default: true
					}
				}]
			}]
		}
	}, {
		setting: 'quickCyclePageItems',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'createRulesOnClose',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'autoHideEasyList',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'recommendReloadAlways',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		divider: true //===================================================================================
	}, {
		setting: 'baseColor',
		props: {
			type: 'option',
			options: [
				['#177efb', 'Blue'],
				['#336699', 'Slate blue'],
				['#787778', 'Gray'],
				['#99999f', 'Graphite'],
				['#ff1fed', 'Pink	'],
				['#ff7c0c', 'Orange'],
				['#009e00', 'Green'],
				['#00afba', 'Turquoise'],
				['#876846', 'Brown'],
				['#7512b2', 'Purple'],
			],
			default: '#177efb',
			otherOption: {
				prompt: 'Enter a valid 6 digit hex CSS color preceeded by #.',
				validate: function (value) {
					return value.match(/^#[a-f0-9]+$/i) && value.length === 7;
				}
			},
			onChange: function () {
				var less = window.less || Popover.window.less;

				less.modifyVars({
					baseColor: Settings.getItem('baseColor')
				});
			}
		}
	}, {
		setting: 'language',
		props: {
			type: 'option',
			options: [
				['auto', 'Automatic'],
				['en-us', 'US English'],
				['de-de', 'Deutsch']
			],
			default: 'auto'
		}
	}, {
		setting: 'toolbarDisplay',
		props: {
			type: 'option-radio',
			default: 'blocked',
			options: [
				['blocked', 'Blocked items'],
				['allowed', 'Allowed items'],
				[false, 'Neither']
			],
			onChange: function () {
				Page.requestPageFromActive();
			}
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
				default: true
			}
		}, {
			setting: 'showResourceURLs',
			props: {
				type: 'boolean',
				helpText: 'simpleMode help',
				default: false,
				confirm: [{
					when: true,
					prompt: 'A different rule set will be used in this mode.',
					onConfirm: function () {
						GlobalPage.message('convertSimpleToExpert');
					}
				}],
				onChange: function () {
					var showResourceURLs = Settings.getItem('showResourceURLs');

					Popover.window.document.documentElement.classList.toggle('popover-expanded', showResourceURLs);

					UI.__popoverWidthSetting = 'popoverWidth' + (showResourceURLs ? 'Expanded' : '');
					UI.__popoverHeightSetting = 'popoverHeight' + (showResourceURLs ? 'Expanded' : '');

					UI.resizePopover(Settings.getItem(UI.__popoverWidthSetting), Settings.getItem(UI.__popoverHeightSetting));

					if (Popover.visible())
						setTimeout(function () {
							Page.requestPageFromActive();
						}, 300);
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
			default: false,
			onChange: function () {
				Resource.canLoadCache.clear().saveNow();
			}
		}
	}, {
		setting: 'ignoreBlacklist',
		props: {
			type: 'boolean',
			default: false,
			onChange: function () {
				Resource.canLoadCache.clear().saveNow();
			}
		}
	}, {
		setting: 'secureOnly',
		props: {
			type: 'boolean',
			default: true
		}
	}, {
		setting: 'allowExtensions',
		props: {
			type: 'boolean',
			default: true
		}
	}, {
		divider: true //===================================================================================
	}, {
		setting: 'blockFirstVisit',
		props: {
			type: 'option',
			options: [
				['nowhere', 'Nowhere'],
				['host', 'Different hosts &amp; subdomains'],
				['domain', 'Different hostnames'],
			],
			default: 'host',
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
		setting: 'enabledKinds',
		props: {
			readOnly: true,
			storeKey: 'special',
			default: true
		}
	}, {
		setting: 'enabledKinds',
		props: {
			readOnly: true,
			storeKey: 'user_script',
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
		setting: 'alwaysBlock',
		props: {
			readOnly: true,
			storeKey: 'special',
			default: 'everywhere'
		}
	}, {
		setting: 'alwaysBlock',
		props: {
			readOnly: true,
			storeKey: 'user_script',
			default: 'everywhere'
		}
	}, {
		setting: 'enabledKinds',
		props: {
			storeKey: 'script',
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
					default: false
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'frame',
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
					extendOptions: [['ask', 'Ask when neccessary']],
					help: 'alwaysBlock help',
					default: 'blacklist',
					onChange: function () {
						Special.__enabled = null;
					},
				}
			}, {
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
										method: Utilities.Group.NOT.IS,
										key: 'synchronousXHRMethod',
										needle: '2'
									}]
								}
							},
							settings: [{
								setting: 'showSynchronousXHRNotification',
								props: {
									type: 'boolean',
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
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'embed',
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
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'embed',
					help: 'alwaysBlock help',
					default: 'blacklist'
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'video',
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
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'video',
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
					default: true
				}
			}, {
				setting: 'alwaysBlock',
				props: {
					storeKey: 'image',
					help: 'alwaysBlock help',
					default: 'blacklist'
				}
			}]
		}]
	}, {
		divider: true //===================================================================================
	}, {
		id: 'easy-list-update',
		description: 'Last EasyList update was unknown.'
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

	// User script settings
	userScripts: {
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

	// Other Features settings
	other: [{
		setting: 'confirmShortURL',
		props: {
			type: 'boolean',
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
				default: true
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'anchor_titles',
				default: true
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'contextmenu_overrides',
				help: 'contextmenu_overrides help',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'window_resize',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'autocomplete_disabler',
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
					storeKey: 'inline_script_execution',
					default: false
				}
			}]
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'environmental_information',
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'canvas_data_url',
				options: [[false, 'Off'], [1, 'Always ask'], [2, 'Ask once per host'], [3, 'Ask once per host for session'], [4, 'Always protect']],
				default: 3
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'font',
				options: [[false, 'Default'], ['Helvetica', 'Helvetica'], ['Arial', 'Arial'], ['Times', 'Times'], ['Comic Sans MS', 'Comic Sans MS']],
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
				options: [[false, 'Default'], [60, '60%'], [80, '80%'], [100, '100%'], [120, '120%'], [140, '140%'], [160, '160%'], [180, '180%'], [200, '200%']],
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
