"use strict";

Settings.settings = {
	// Misc settings that are not user editable
	__misc: [{
		setting: 'donationVerified',
		props: {
			type: 'boolean',
			onChange: function () {
				SettingStore.__cache = {};
			}
		}
	}, {
		setting: 'extrasActive',
		props: {
			type: 'boolean',
			readOnly: true,
			default: function () {
				return Extras.isActive();
			}
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
		setting: 'FilterListLastUpdate',
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
		setting: 'showUnblockedScripts',
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
	}, {
			setting: 'showResourceURLs',
			props: {
				type: 'boolean',
				default: false,
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
	}, {
		setting: 'newUserScriptStorageItem',
		props: {
			type: 'button',
			classes: 'user-script-storage-new',
			onClick: function (button) {
				var offset = $(button).offset(),
						poppy = new Popover.window.Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), true, 'user-script-storage-add');

				poppy
					.setContent(Template.create('poppy', 'user-script-storage-add'))
					.show();
			}
		}
	}, {
		store: 'locker',
		props: {
			type: 'many-boolean'
		},
	}],

	// General Settings
	general: [{
		setting: 'useAnimations',
		props: {
			type: 'boolean',
			default: true,
			onChange: function () {
				var useAnimations = Settings.getItem('useAnimations'),
						useFastAnimations = Settings.getItem('useFastAnimations');

				window.globalSetting.speedMultiplier = useAnimations ? (useFastAnimations ? 0.7 : 1) : 0.001;

				Popover.window.document.body.classList.toggle('jsb-no-animations', !useAnimations);

				UI.setLessVariables();
			},
			subSettings: [{
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'useAnimations',
							needle: true
						}]
					}
				},
				settings: [{
					setting: 'useFastAnimations',
					props: {
						type: 'boolean',
						default: false,
						onChange: function () {
							Settings.map.useAnimations.props.onChange();
						}
					}
				}]
			}]
		}
	}, {
		setting: 'largeFont',
		props: {
			type: 'boolean',
			default: false,
			onChange: function () {
				Popover.window.document.documentElement.classList.toggle('jsb-large-font', Settings.getItem('largeFont'));
			}
		}
	}, {
		setting: 'darkMode',
		props: {
			type: 'boolean',
			default: false,
			onChange: function () {
				UI.setLessVariables();
			}
		}
	}, {
		setting: 'showPageEditorImmediately',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
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
	}, {
		setting: 'createRulesOnClose',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'quickCyclePageItems',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'showExpanderLabels',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'autoHideFilterList',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'autoHideNoRule',
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
				['#5d5d5d', 'Dark gray'],
				['#99999f', 'Graphite'],
				['#ff1fed', 'Pink	'],
				['#ff7c0c', 'Orange'],
				['#009e00', 'Green'],
				['#006100', 'Dark green'],
				['#00afba', 'Turquoise'],
				['#876846', 'Brown'],
				['#7512b2', 'Purple'],
				['#e50000', 'Red'],
				['#7a0103', 'Dark red'],
				['#000000', 'Black']
			],
			default: function () {				
				return Settings.getItem('darkMode') ? '#336699' : '#177efb';
			},
			otherOption: {
				prompt: 'Enter a valid 6 digit hex CSS color preceeded by #.',
				validate: function (value) {
					return value.match(/^#[a-f0-9]+$/i) && (value.length === 7 || value.length === 4);
				}
			},
			onChange: function () {
				UI.setLessVariables();
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
		header: 'locker'
	}, {
		description: 'setLockerPassword.description'
	}, {
		setting: 'setLockerPassword',
		props: {
			type: 'button',
			onClick: function () {
				Locker.showSetPasswordPrompt();
			}
		}
	}, {
		divider: true,
		classes: 'transparent short'
	}, {
		description: 'lockerAlwaysLocked.description',
		classes: 'short'
	}, {
		store: 'lockerAlwaysLocked',
		props: {
			type: 'many-boolean',
			locked: true
		}
	}, {
		setting: 'lockerAlwaysLocked',
		props: {
			readOnly: true,
			storeKey: 'setting',
			default: true
		}
	}, {
		setting: 'lockerAlwaysLocked',
		props: {
			storeKey: 'clearRules',
			default: true
		}
	}, {
		setting: 'lockerAlwaysLocked',
		props: {
			storeKey: 'importBackupSettings',
			default: true
		}
	}, {
		setting: 'lockerAlwaysLocked',
		props: {
			storeKey: 'console',
			default: false
		}
	}, {
		setting: 'lockerAlwaysLocked',
		props: {
			storeKey: 'disable',
			default: false
		}
	}, {
		divider: true
	}, {
		header: 'extraFeatures'
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'extrasActive',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'updateNotify',
			props: {
				type: 'boolean',
				isExtra: true,
				default: true
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
			type: 'option-radio',
			options: [
				['nowhere', 'Nowhere'],
				['host', 'Different hosts &amp; subdomains'],
				['domain', 'Different hostnames'],
			],
			default: 'nowhere',
			confirm: {
				when: {
					group: 'all',
					items: [{
						method: Utilities.Group.NOT.IS,
						key: 'blockFirstVisit',
						needle: 'nowhere'
					}]
				}
			},
			onChange: function () {
				var locked = !!Rules.isLockerLocked();

				Locker.lock('rules', false);

				Rules.list.firstVisit.clear();

				Locker.lock('rules', locked);
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
		header: 'extraFeatures',
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'extrasActive',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'enabledKinds',
			props: {
				storeKey: 'frame',
				isExtra: true,
				default: function () {
					return Extras.isActive();
				}
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
				isExtra: true,
				default: function () {
					return Extras.isActive();
				}
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
					extendOptions: [['ask', 'Rules and ask when needed']],
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
						type: 'option-radio',
						options: [[0, 'Allow'], [1, 'Block'], [2, 'Invasively ask']],
						default: 0,
						confirm: {
							toValues: ['2'],
							prompt: function () {
								return confirm(_('setting.synchronousXHRMethod.confirm'));
							}
						},
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
				isExtra: true,
				default: function () {
					return Extras.isActive();
				}
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
					default: 'blacklist'
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			setting: 'enabledKinds',
			props: {
				storeKey: 'video',
				isExtra: true,
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
				isExtra: true,
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
		divider: true
	}, {
		header: 'filterLists',
	}, {
		description: 'filterLists.description',
	}, {
		store: 'filterLists',
		props: {
			type: 'dynamic-array',
			isSetting: true,
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
				},
				$fanboyAnnoy: {
					enabled: false,
					value: ['https://easylist-downloads.adblockplus.org/fanboy-annoyance.txt', 'Fanboy\'s Annoyances']
				},
				$fanboySocial: {
					enabled: false,
					value: ['https://easylist-downloads.adblockplus.org/fanboy-social.txt', 'Fanboy\'s Anti-social']
				}
			},
			validate: {
				onFail: 'filterLists.validate.fail',
				test: function (type, value) {
					var url = $.trim(value.value[0]).toLowerCase();

					return (url._startsWith('http:') || url._startsWith('https:') || url._startsWith('ftp:'))
				}
			},
			onChange: function () {
				Utilities.Timer.timeout('filterListsChanged', function () {
					Rules.attachFilterLists(true);

					FilterList.fetch();
				}, 5000);
			}
		}
	}, {
		divider: true,
		classes: 'transparent short'
	}, {
		description: 'filterListLastUpdate.description',
		fill: function () {
			var lastUpdate = Settings.getItem('FilterListLastUpdate'),
					nextUpdate = lastUpdate + FilterList.__updateInterval - Date.now(),
					nextUpdateHuman = Utilities.humanTime(nextUpdate);

			return [(new Date(lastUpdate || Date.now())).toLocaleString(), nextUpdateHuman.days, nextUpdateHuman.hours, nextUpdateHuman.minutes];
		}
	}, {
		setting: 'updateFilterLists',
		props: {
			type: 'button',
			validate: {
				onFail: 'updateFilterLists.validate.fail',
				test: function () {
					var lastUpdate = Settings.getItem('FilterListLastUpdate'),
							fiveMinutes = TIME.ONE.MINUTE * 5;

					return Date.now() > lastUpdate + fiveMinutes;
				}
			},
			onClick: function (button) {
				FilterList.cancelUpdate();

				FilterList.fetch();

				button.disabled = true;
			}
		},
	}, {
		divider: true
	}, {
		setting: 'importRulesFromFour',
		props: {
			type: 'button',
			onClick: function () {
				var rules = prompt('Paste the exported rule backup below. This is obtained by clicking Rules > Backup > Export from JSB 4. You must have made a donation or unlocked features without contributing.');

				Upgrade.importRulesFromJSB4(rules);
			}
		}
	}],

	// Snapshot settings
	snapshots: [{
		header: 'extraFeatures'
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'extrasActive',
					needle: true
				}]
			}
		},
		settings: [{
			description: 'autoSnapshots.description',
		}, {
			setting: 'autoSnapshots',
			props: {
				type: 'boolean',
				isExtra: true,
				default: function () {
					return Extras.isActive();
				},
				onChange: function () {
					Rules.list.user.rules.snapshot.autoSnapshots(Settings.getItem('autoSnapshots'));
				}
			}
		}, {
			setting: 'snapshotsLimit',
			props: {
				type: 'range',
				label: ['Store only', 'unkept snapshots'],
				options: [1, 999],
				default: 5,
				onChange: function () {
					Rules.list.user.rules.snapshot.maxUnkept = Settings.getItem('snapshotsLimit');
				}
			}
		}, {
			divider: true,
			classes: 'transparent short'
		}, {
			setting: 'clearSnapshots',
			props: {
				type: 'button',
				classes: 'double-click',
				onClick: function () {
					Rules.list.user.rules.snapshot.snapshots.clear();
				}
			}
		}]
	}],

	// User script settings
	userScripts: [{
		header: 'extraFeatures',
	}, {
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'extrasActive',
					needle: true
				}]
			}
		},
		settings: [{
			setting: 'newUserScript',
			props: {
				type: 'button',
				onClick: function (button) {
					var defaultUserScript = "// ==UserScript==\n" +
						"// @name My User Script:" + Utilities.Token.generate() + "\n" +
						"// @namespace " + Settings.getItem('installID') + "\n" +
						"// @version 0.1\n" +
						"// @updateURL \n" +
						"// @downloadURL \n" +
						"// ==/UserScript==\n\n\n";

					UI.Settings.editUserScript('');

					UI.view.switchTo('#setting-views-userScript-edit');

					$('.user-script-content', UI.Settings.userScriptEdit).val(defaultUserScript).focus()[0].selectionStart = defaultUserScript.length;
				}
			}
		}, {
			divider: true
		}, {
			customView: function (container) {
				var userScript;

				var userScripts = UserScript.scripts.keys().sort().reverse();

				for (var i = userScripts.length; i--;) {
					userScript = UserScript.scripts.get(userScripts[i]);

					container.append(Template.create('settings', 'user-script-item', {
						id: 'user-script-setting-' + Utilities.Token.generate(),
						index: i,
						key: userScripts[i],
						attributes: userScript.get('attributes')
					}));
				}

				container
					.on('click', '.user-script-delete', function () {
						var self = this,
								userScriptItem = $(this).parents('.user-script-item');

						userScriptItem.collapse(225 * window.globalSetting.speedMultiplier, 'easeOutQuad', function () {
							UserScript.remove(self.getAttribute('data-userScript'));
						});
					})

					.on('click', '.user-script-edit', function () {
						UI.Settings.editUserScript(this.getAttribute('data-userScript'));
					});
			}
		}]
	}],

	'userScript-edit': [{
		customView: function (container) {
			container.append(Template.create('settings', 'user-script-edit'));
		}
	}, {
		setting: 'saveUserScript',
		props: {
			type: 'button',
			onClick: function (button) {
				UI.Settings.saveUserScriptEdit(button);
			}
		},
	}],

	// Other Features settings
	other: [{
		when: {
			settings: {
				group: 'all',
				items: [{
					method: Utilities.Group.IS,
					key: 'extrasActive',
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
			setting: 'enabledSpecials',
			props: {
				storeKey: 'historyFixer',
				readOnly: true,
				default: true
			}
		}, {
			header: 'extraFeatures'
		}, {
			setting: 'blockReferrer',
			props: {
				type: 'boolean',
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
			description: 'enabledSpecials.description'
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'xhr_intercept',
				readOnly: true,
				isExtra: true,
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
				isExtra: true,
				default: function () {
					return Extras.isActive();
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'alert_dialogs',
				isExtra: true,
				default: function () {
					return Extras.isActive();
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'anchor_titles',
				isExtra: true,
				default: function () {
					return Extras.isActive();
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'contextmenu_overrides',
				isExtra: true,
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'window_resize',
				isExtra: true,
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'autocomplete_disabler',
				isExtra: true,
				default: function () {
					return Extras.isActive();
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'inline_script_execution',
				isExtra: true,
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'environmental_information',
				isExtra: true,
				default: false
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'canvas_data_url',
				options: [[false, 'Off'], [1, 'Always ask'], [2, 'Ask once per host'], [3, 'Ask once per host for session'], [4, 'Always protect']],
				isExtra: true,
				default: function () {
					return Extras.isActive() ? 3 : false;
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'font',
				options: [[false, 'Default'], ['Helvetica', 'Helvetica'], ['Arial', 'Arial'], ['Times', 'Times'], ['Comic Sans MS', 'Comic Sans MS']],
				isExtra: true,
				default: false,
				otherOption: {
					prompt: 'Enter a custom font name to use.',
					validate: function (value) {
						return /^[ a-z0-9_-]+$/ig.test(value);
					}
				}
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'zoom',
				options: [[false, 'Default'], [60, '60%'], [80, '80%'], [100, '100%'], [120, '120%'], [140, '140%'], [160, '160%'], [180, '180%'], [200, '200%']],
				isExtra: true,
				default: false,
				otherOption: {
					prompt: 'Enter a custom zoom level to use.',
					validate: function (value) {
						return /^[0-9]+$/g.test(value);
					}
				}
			}
		}]
	}]
};

for (var section in Settings.settings)
	Settings.createMap(Settings.settings[section]);
