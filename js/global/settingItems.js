/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

Settings.settings = {
	// Misc settings that are not user editable
	__misc: [{
		setting: 'donationVerified',
		props: {
			type: 'mixed',
			onChange: function () {
				if (window.Special)
					Special.__enabled = null;

				SettingStore.__cache = {};

				if (window.UI)
					UI.view.switchTo('#main-views-page');
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
			default: 0,
			onChange: function () {
				Settings.map.donationVerified.props.onChange();
			}
		}
	}, {
		setting: 'feedbackEmail',
		props: {
			type: 'string',
			default: ''
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
		setting: 'lastUserScriptUpdateCheck',
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
			default: 515
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
			default: 401
		}
	}, {
		setting: 'popoverHeightExpanded',
		props: {
			type: 'number',
			default: 451
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
		store: 'splitView',
		props: {
			type: 'many-number'
		}
	}, {
		store: 'ignoredUpdates',
		props: {
			type: 'many-boolean'
		}
	},{
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
				[5000, 'setting.disableTime.option.5_seconds'],
				[60000, 'setting.disableTime.option.1_minute'],
				[300000, 'setting.disableTime.option.5_minutes'],
				[600000, 'setting.disableTime.option.10_minutes'],
				[1800000, 'setting.disableTime.option.30_minutes'],
				[3600000, 'setting.disableTime.option.1_hour']
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
					var showResourceURLs = Settings.getItem('showResourceURLs') || Settings.getItem('temporarilyShowResourceURLs');

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
					.setContent(Template.create('poppy.settings', 'user-script-storage-add'))
					.show();
			}
		}
	}, {
		store: 'locker',
		props: {
			type: 'many-boolean'
		},
	}, {
		setting: 'debugMode',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'showPopoverOnLoad',
		props: {
			type: 'boolean',
			default: false
		}
	}, {
		setting: 'openSettings',
		props: {
			type: 'boolean',
			readOnly: true,
			default: true
		}
	}, {
		setting: 'importSettings',
		props: {
			type: 'button',
			onClick: function (button) {
				var offset = $(button).offset(),
						backupPoppy = new Popover.window.Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), true, 'setting-menu-backup');

				backupPoppy
					.setContent(Template.create('poppy.settings', 'setting-menu-backup', {
						importOnly: true
					}))
					.show();
			}
		}
	}, {
		setting: 'temporarilyShowResourceURLs',
		props: {
			type: 'boolean',
			default: false,
			onChange: function () {
				Settings.map.showResourceURLs.props.onChange();
			}
		}
	}],

	// General Settings
	general: [{
		collapsible: 'setting.collapsible.ui',
		props: {
			subSettings: [{
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
				setting: 'showExpanderLabels',
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
				divider: true
			}, {
				setting: 'baseColor',
				props: {
					type: 'option',
					options: [
						['#177efb', 'Blue'],
						['#336699', 'Slate blue'],
						['#787878', 'Gray'],
						['#5d5d5d', 'Dark gray'],
						['#99999f', 'Graphite'],
						['#ff1fed', 'Pink	'],
						['#ff7c0c', 'Orange'],
						['#009e00', 'Green'],
						['#006100', 'Dark green'],
						['#00afba', 'Turquoise'],
						['#876846', 'Brown'],
						['#7512b2', 'Purple'],
						['#9734e4', 'Lavender'],
						['#e50000', 'Red'],
						['#7a0103', 'Dark red'],
						['#000000', 'Black']
					],
					default: function () {				
						return Settings.getItem('darkMode') ? '#336699' : '#177efb';
					},
					otherOption: {
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
						['auto', 'setting.language.option.automatic'],
						['en-us', 'US English']
					],
					default: 'auto',
					onChange: function () {
						setTimeout(function () {
							if (!SettingStore.__locked)
								Popover.window.location.reload()
						}, 500);
					}
				}
			}, {
				setting: 'toolbarDisplay',
				props: {
					type: 'option-radio',
					default: 'blocked',
					options: [
						['blocked', 'setting.toolbarDisplay.option.blocked'],
						['allowed', 'setting.toolbarDisplay.option.allowed'],
						[false, 'setting.toolbarDisplay.option.neither']
					],
					onChange: function () {
						Page.requestPageFromActive();
					}
				}
			}]
		}
	}, {
		divider: true
	}, {
		collapsible: 'setting.collapsible.page',
		props: {
			subSettings: [{
				setting: 'createRulesOnClick',
				props: {
					type: 'boolean',
					default: true
				}
			}, {
				setting: 'showPageEditorImmediately',
				props: {
					type: 'boolean',
					default: false
				}
			}, {
				setting: 'useSimplePageEditor',
				props: {
					type: 'boolean',
					default: true
				}
			}, {
				setting: 'showResourceURLsOnNumberClick',
				props: {
					type: 'boolean',
					default: true
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
				setting: 'autoHideWhitelist',
				props: {
					type: 'boolean',
					default: false
				}
			}, {
				setting: 'autoHideBlacklist',
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
			}]
		}
	}, {
		divider: true //===================================================================================
	}, {
		collapsible: 'setting.collapsible.locker',
		props: {
			subSettings: [{
				description: 'setLockerPassword.description'
			}, {
				setting: 'useLocker',
				props: {
					type: 'boolean',
					default: false,
					locked: true,
					onChange: function () {
						if (Settings.IMPORTING)
							return;

						if (Locker.isEnabled())
							UI.Locker
								.showSetPasswordPrompt()
								.then(function () {
									// Success
								}, function () {
									Settings.setItem('useLocker', false, null, true, true);

									if (!Settings.getItem('setupComplete'))
										$('input[data-inlineSetting="useLocker"]', UI.Setup.view).prop('checked', false);
								});
					}
				}
			}, {
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'useLocker',
							needle: true
						}]
					}
				},
				settings: [{
					asRow: [{
						setting: 'setLockerPassword',
						props: {
							type: 'stand-alone-button',
							onClick: function () {
								UI.Locker.showSetPasswordPrompt();

								Locker.event.removeCustomEventListener('passwordSet');
							}
						}
					}]
				}, {
					divider: true, //===================================================================================
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
				}]
			}]
		}
	}, {
		divider: true //===================================================================================
	}, {
		collapsible: 'setting.collapsible.donator',
		props: {
			subSettings: [{
				when: {
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'extrasActive',
							needle: true
						}, {
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
						isExtra: true,
						default: true
					}
				}]
			}]
		}
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
				['nowhere', 'setting.blockFrom.option.nowhere'],
				['blacklist', 'setting.blockFrom.option.blacklist'],
				['everywhere', 'setting.blockFrom.option.anywhere'],
				['host', 'setting.blockFrom.option.hostnames'],
				['domain', 'setting.blockFrom.option.domains'],
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
		collapsible: 'setting.collapsible.ignore',
		props: {
			subSettings: [{
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
				setting: 'ignorePredefined',
				props: {
					type: 'boolean',
					default: false,
					onChange: function () {
						Predefined();
					}
				}
			}]
		}
	}, {
		divider: true, //===================================================================================
	}, {
		collapsible: 'setting.collapsible.ruleDefaults',
		props: {
			subSettings: [{
				description: 'defaultRuleDomain.description'
			}, {
				setting: 'defaultRuleDomain',
				props: {
					type: 'option-radio',
					options: [
						['host', 'setting.defaultRuleDomain.option.hostname'],
						['domain', 'setting.defaultRuleDomain.option.domain'],
						['all', 'setting.defaultRuleDomain.option.all']
					],
					default: 'host'
				}
			}, {
				setting: 'defaultRuleList',
				props: {
					type: 'option-radio',
					options: [
						['last', 'setting.defaultRuleList.option.remember'],
						['always', 'setting.defaultRuleList.option.always'],
						['temporary', 'setting.defaultRuleList.option.temporarily']
					],
					default: 'last'
				}
			}]
		}
	}, {
		divider: true //===================================================================================
	}, {
		collapsible: 'setting.collapsible.unknownWebsites',
		props: {
			subSettings: [{
				description: 'blockFirstVisit.description'
			}, {
				setting: 'blockFirstVisit',
				props: {
					type: 'option-radio',
					options: [
						['nowhere', 'setting.blockFirstVisit.option.off'],
						['host', 'setting.blockFirstVisit.option.hostnames'],
						['domain', 'setting.blockFirstVisit.option.domains'],
					],
					default: 'nowhere',
					confirm: {
						when: {
							group: 'all',
							items: [{
								method: Utilities.Group.NOT.IS,
								key: 'blockFirstVisit',
								needle: 'nowhere'
							}, {
								method: Utilities.Group.IS,
								key: 'setupComplete',
								needle: true
							}]
						}
					},
					onChange: function () {
						Rules.list.firstVisit.clear();
					}
				}
			}, {
				when: {
					hide: true,
					settings: {
						group: 'all',
						items: [{
							method: Utilities.Group.NOT.IS,
							key: 'blockFirstVisit',
							needle: 'nowhere'
						}]
					}
				},
				settings: [{
					setting: 'showBlockFirstVisitNotification',
					props: {
						type: 'boolean',
						default: true
					}
				}]
			}]
		}
	},{
		divider: true //===================================================================================
	}, {
		collapsible: 'setting.collapsible.blockers',
		props: {
			subSettings: [{
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
				divider: true
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
						default: 'blacklist'
					}
				}]
			}, {
				divider: true //===================================================================================
			}, {
				collapsible: 'setting.collapsible.extraBlockers',
				props: {
					subSettings: [{
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
								storeKey: 'popup',
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
												key: 'popup',
												needle: true
											}]
										}
									}]
								}
							},
							settings: [{
								setting: 'alwaysBlock',
								props: {
									storeKey: 'popup',
									extendOptions: [['ask', 'setting.blockFrom.option.ask']],
									default: 'blacklist',
									onChange: function () {
										Special.__enabled = null;
									},
								}
							}]
						}, {
							divider: true //===================================================================================
						}, {
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
									extendOptions: [['ask', 'setting.blockFrom.option.ask']],
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
										options: [
											[0, 'setting.synchronousXHRMethod.option.allow'],
											[1, 'setting.synchronousXHRMethod.option.block'],
											[2, 'setting.synchronousXHRMethod.option.ask']
										],
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
									default: 'blacklist'
								}
							}]
						}]
					}]
				}
			}]
		}
	}, {
		divider: true //===================================================================================
	}, {
		collapsible: 'setting.collapsible.filterLists',
		props: {
			subSettings: [{
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
						$fanboyUltimate: {
							enabled: false,
							value: ['https://www.fanboy.co.nz/r/fanboy-ultimate.txt', 'Fanboy\'s Ultimate']
						},
						$fanboyAnnoy: {
							enabled: false,
							value: ['https://easylist-downloads.adblockplus.org/fanboy-annoyance.txt', 'Fanboy\'s Annoyances']
						},
						$fanboySocial: {
							enabled: false,
							value: ['https://easylist-downloads.adblockplus.org/fanboy-social.txt', 'Fanboy\'s Anti-social']
						},
						$nonIntrusive: {
							enabled: false,
							value: ['https://easylist-downloads.adblockplus.org/exceptionrules.txt', 'Non-Intrusive Ads']
						}
					},
					validate: {
						onFail: 'filterLists.validate.fail',
						test: function (type, value) {
							var url = $.trim(value.value[0]).toLowerCase();

							return (url._startsWith('http:') || url._startsWith('https:') || url._startsWith('ftp:'))
						}
					},
					onChange: function (type, settingKey, value, storeKey) {
						if (storeKey === '$fanboyUltimate' && value && value.enabled) {
							var poppy = new Popover.window.Poppy(0.5, 0, 'fanboys-ultimate');

							poppy
								.modal()
								.showCloseButton()
								.setContent(Template.create('poppy.settings', 'fanboys-ultimate'))
								.show();

							var list = Settings.map.filterLists.props.default.$list._clone(),
									malware = Settings.map.filterLists.props.default.$malware._clone();

							list.enabled = false;
							malware.enabled = false;

							Settings.setItem('filterLists', list, '$list');
							Settings.setItem('filterLists', malware, '$privacy');
							Settings.setItem('filterLists', Settings.map.filterLists.props.default.$fanboyAnnoy, '$fanboyAnnoy');
						}

						Utilities.Timer.timeout('filterListsChanged', function () {
							Rules.attachFilterLists(true);

							FilterList.fetch();
						}, 5000);
					},
					confirm: {
						prompt: function (settingKey, value, storeKey) {
							if (['$list', '$privacy', '$fanboyAnnoy']._contains(storeKey) && value.enabled && Settings.getItem('filterLists', '$fanboyUltimate').enabled)
								return confirm(_('setting.filterLists.confirm'));

							return true;
						}
					}
				}
			}, {
				divider: true, //===================================================================================
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
				asRow: [{
					setting: 'updateFilterLists',
					props: {
						type: 'stand-alone-button',
						validate: {
							onFail: 'updateFilterLists.validate.fail',
							test: function () {
								var lastUpdate = Settings.getItem('FilterListLastUpdate');

								return Date.now() > lastUpdate + (TIME.ONE.MINUTE * 5);
							}
						},
						onClick: function (button) {
							FilterList.cancelUpdate();

							FilterList.fetch();

							button.disabled = true;
						}
					},
				}]
			}]
		}
	}, {
		divider: true //===================================================================================
	}, {
		asRow: [{
			setting: 'importRulesFromFour',
			props: {
				type: 'stand-alone-button',
				onClick: function (button) {
					var offset = $(button).offset(),
							poppy = new Popover.window.Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), true, 'import-rules-from-four');

					poppy
						.setContent(Template.create('poppy.settings', 'import-rules-from-four'))
						.show();
				}
			}
		}]
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
				options: [1, 999],
				default: 5,
				onChange: function () {
					Rules.list.user.rules.snapshot.maxUnkept = Settings.getItem('snapshotsLimit');
				}
			}
		}, {
			divider: true //===================================================================================
		}, {
			asRow: [{
				setting: 'clearSnapshots',
				props: {
					type: 'stand-alone-button',
					classes: 'double-click',
					onClick: function () {
						Rules.list.user.rules.snapshot.snapshots.clear();
					}
				}
			}]
		}]
	}],

	// User script settings
	userScripts: [{
		header: 'extraFeatures',
	}, {
		description: 'userScripts.description',
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
			divider: true //===================================================================================
		}, {
			asRow: [{
				setting: 'newUserScript',
				props: {
					type: 'stand-alone-button',
					onClick: function (button) {
						var scriptName;

						var scriptNameTemplate = 'My User Script {0}',
								scriptNamespace = Settings.getItem('installID'),
								scriptIndex = 0;

						while (UserScript.scripts.keyExist((scriptName = scriptNameTemplate._format([++scriptIndex])) + ':' + scriptNamespace)) {}

						var defaultUserScript =
							"// ==UserScript==\n" +
							"// @name " + scriptName + "\n" +
							"// @namespace " + scriptNamespace + "\n" +
							"// @version 0.1\n" +
							"// @downloadURL \n" +
							"// @domain *\n" +
							"// ==/UserScript==\n\n\n";

						UI.event.addCustomEventListener('customSettingViewCreated', function (event) {
							$('.user-script-content', UI.Settings.userScriptEdit).val(defaultUserScript).focus()[0].selectionStart = defaultUserScript.length;
						}, true);

						UI.Settings.editUserScript('');
					}
				}
			}, {
				setting: 'updateUserScriptsNow',
				props: {
					type: 'stand-alone-button',
					validate: {
						onFail: 'updateUserScriptsNow.validate.fail',
						test: function () {
							var lastUpdate = Settings.getItem('lastUserScriptUpdateCheck');

							return Date.now() > lastUpdate + (TIME.ONE.MINUTE * 5);
						}
					},
					onClick: function (button) {
						button.disabled = true;

						var userScripts = UserScript.scripts.keys();

						for (var i = userScripts.length; i--;)
							UserScript.update(userScripts[i]);

						Settings.setItem('lastUserScriptUpdateCheck', Date.now());
					}
				}
			}]
		}, {
			divider: true //===================================================================================
		}, {
			customView: function (container) {
				var userScript;

				var userScripts = Extras.isActive() ? UserScript.scripts.keys().sort().reverse() : [];

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
				if (UI.Settings.saveUserScriptEdit(button, true)) {
					button.disabled = true;
					button.value = _('setting.saveUserScript.subLabel.saved');
				}
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
			setting: 'enabledSpecials',
			props: {
				storeKey: 'frameSandboxFixer',
				readOnly: true,
				default: true
			}
		}, {
			header: 'extraFeatures'
		}, /*{
			setting: 'blockReferrer',
			props: {
				type: 'boolean',
				default: false,
				confirm: {
					when: {
						group: 'all',
						items: [{
							method: Utilities.Group.IS,
							key: 'blockReferrer',
							needle: false
						}]
					}
				},
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
		},*/ {
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
				storeKey: 'page_blocker',
				isExtra: true,
				default: true
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
				default: false
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
				storeKey: 'popups',
				readOnly: true,
				isExtra: true,
				default: function () {
					return Settings.getItem('enabledKinds', 'popup') && {
						alwaysBlock: Settings.getItem('alwaysBlock', 'popup')
					};
				}
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'boolean',
				storeKey: 'autocomplete_disabler',
				isExtra: true,
				default: false
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
				options: [
					[false, 'setting.enabledSpecials.canvas_data_url.option.off'],
					[1, 'setting.enabledSpecials.canvas_data_url.option.always_ask'],
					[2, 'setting.enabledSpecials.canvas_data_url.option.ask_once'],
					[3, 'setting.enabledSpecials.canvas_data_url.option.ask_once_session'],
					[4, 'setting.enabledSpecials.canvas_data_url.option.always_protect']
				],
				isExtra: true,
				default: function () {
					return Extras.isActive() ? 2 : false;
				},
			}
		}, {
			setting: 'enabledSpecials',
			props: {
				type: 'option',
				storeKey: 'font',
				options: [
					[false, 'setting.enabledSpecials.zoom.option.default'],
					['-apple-system', 'System Font'],
					['Helvetica', 'Helvetica'],
					['Arial', 'Arial'],
					['Times', 'Times'],
					['Comic Sans MS', 'Comic Sans MS']
				],
				isExtra: true,
				default: false,
				otherOption: {
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
				options: [
					[false, 'setting.enabledSpecials.zoom.option.default'],
					[60, '60%'],
					[80, '80%'],
					[100, '100%'],
					[120, '120%'],
					[140, '140%'],
					[160, '160%'],
					[180, '180%'],
					[200, '200%']
				],
				isExtra: true,
				default: false,
				otherOption: {
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

Object._deepFreeze(Settings.map);
