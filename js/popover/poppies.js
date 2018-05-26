/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

Object._extend(Poppy.scripts, {
	'extras-unlock-prompt': function (poppy) {
		var errorContainer = $('#extras-unlock-error-container', poppy.content),
			errorString = $('#extras-unlock-error', errorContainer),
			unlockEmail = $('#extras-unlock-email', poppy.content);

		unlockEmail.focus();

		poppy.content
			.on('click', '#extras-unlock-unlock', function () {
				Utilities
					.watchdog('unlockExtraFeatures', 1, 1000)
					.then(function () {
						var emailAddress = $.trim(unlockEmail.val());

						if (!emailAddress.length) {
							errorContainer.addClass('jsb-hidden');

							return unlockEmail.shake().focus().selectAll();
						}

						Extras
							.unlockUsingEmail(emailAddress)
							.then(function () {
								var thanksPoppy = new Poppy(0.5, 0, true);

								thanksPoppy.setContent(Template.create('main', 'jsb-readable', {
									string: _('extras.donation_thanks')
								}));

								thanksPoppy.show();
								poppy.close();
							}, function (error) {
								errorContainer.removeClass('jsb-hidden');

								errorString.text(Extras.ERROR[error] || error);

								unlockEmail.shake().focus().selectAll();
							});
					}, function () {
						unlockEmail.focus();
					});
			})

			.on('click', '#extras-unlock-free', function (event) {
				var freePoppy = new Poppy(event.pageX, event.pageY, false, 'extras-unlock-free');

				freePoppy
					.linkTo(poppy)
					.setContent(Template.create('poppy', 'extras-unlock-free'))
					.show();
			});
	},

	'extras-unlock-free': function (poppy) {
		poppy.content
			.on('click', '#extras-unlock-free-now', function () {
				Extras.unlockWithoutDonating();

				poppy.linkedTo.close();
			});
	},

	'donation-beg': function (poppy) {
		poppy.content
			.on('click', '#beg-later', function () {
				poppy.close();
			})

			.on('click', '#beg-donate', function () {
				Tabs.create('http://jsblocker.toggleable.com/donate');

				Popover.hide();
			})

			.on('click', '#beg-donated', function () {
				poppy.close();

				UI.Extras.showUnlockPrompt();
			});
	},

	'set-lock-password': function (poppy) {
		var previousPassword = $('#lock-password-previous', poppy.content),
			newPassword = $('#lock-password', poppy.content),
			verifyPassword = $('#lock-password-verify', poppy.content);

		if (previousPassword.length)
			previousPassword.focus();
		else
			newPassword.focus();

		poppy.content
			.on('click', '#lock-password-forgot', function () {
				Tabs.create(Utilities.URL.createFromContent(Template.create('poppy.settings', 'forgot-locker-password', {}, null, true), 'text/html', true));

				Popover.hide();
			})

			.on('click', '#lock-password-cancel', function () {
				poppy.close();

				Locker.event.trigger('passwordSet', false);
			})

			.on('click', '#lock-password-save', function () {
				var previousPasswordVal = previousPassword.val(),
					newPasswordVal = newPassword.val(),
					verifyPasswordVal = verifyPassword.val();

				if (newPasswordVal !== verifyPasswordVal) {
					verifyPassword.val('');

					return newPassword.focus().selectAll().shake();
				}

				var passwordSet = Locker.setPassword(newPasswordVal, previousPasswordVal);

				if (passwordSet === 0)
					poppy.close();
				else if (passwordSet === -2)
					previousPassword.focus().selectAll().shake();
				else if (passwordSet === -1)
					newPassword.focus().selectAll().shake();
			});
	},

	'toggle-lock': function (poppy) {
		var password = $('#lock-password', poppy.content).focus();

		poppy.content
			.on('click', '#lock-password-forgot', function () {
				Tabs.create(Utilities.URL.createFromContent(Template.create('poppy.settings', 'forgot-locker-password', {}, null, true), 'text/html', true));

				Popover.hide();
			})

			.on('click', '#lock-password-cancel', function () {
				poppy.close();

				poppy.reject();
			})

			.on('click', '#lock-password-toggle', function () {
				Utilities
					.watchdog('lockToggle', 1, 1000)
					.then(function () {
						var validated = Locker.validatePassword(password.val());

						if (!validated)
							return password.focus().selectAll().shake();

						Locker.lock(poppy.lockerKey, !poppy.locked);

						poppy.close();

						poppy.resolve();
					}, function () {
						password.focus();
					});
			});
	},

	'disable-menu': function (poppy) {
		poppy.content
			.on('change', '#disable-menu-for', function () {
				Settings.setItem('disableTime', parseInt(this.value, 10));
			})

			.on('click', '#disable-menu-for-disable', function () {
				UI.Locker
					.showLockerPrompt('disable')
					.then(function () {
						globalPage.Command.toggleDisabled(true);

						globalPage.Utilities.Timer.timeout('autoEnableJSB', function () {
							globalPage.Command.toggleDisabled(false, true);
						}, Settings.getItem('disableTime'));
					}, Utilities.noop);

				poppy.close();
			});
	},

	'main-menu': function (poppy) {		
		poppy.content
			.data('poppy', poppy)
			.on('click', '#main-menu-about', function () {
				poppy.close();

				UI.view.switchTo('#main-views-help');
				UI.view.switchTo('#help-views-about');
			})

			.on('click', '#main-menu-submit-feedback', function () {
				UI.Feedback.showFeedbackPoppy();
			})

			.on('click', '#main-menu-unlock', function () {
				UI.Extras.showUnlockPrompt();
			})

			.on('click', '#main-menu-console', function (event, forceClickEvent, forceClick) {
				if (forceClickEvent)
					event = forceClickEvent;

				UI.Locker
					.showLockerPrompt('console', false, true)
					.then(function () {
						Poppy.closeLinksTo(poppy);

						var consolePoppy = new Poppy(event.pageX, event.pageY, false, 'console');

						consolePoppy.scaleWithForce(forceClick);

						consolePoppy
							.setContent(Template.create('poppy', 'console'))
							.linkTo(poppy)
							.stayOpenOnScroll()
							.show();
					}, Utilities.noop);
			});
	},

	'page-menu': function (poppy) {
		poppy.content
			.on('change', 'input[type="checkbox"]', function () {
				poppy.close();
				
				UI.view.switchTo('#main-views-page');

				globalPage.Page.requestPageFromActive();
			});
	},

	'rule-menu': function (poppy) {
		poppy.content
			.on('click', '#rule-menu-lock', function () {
				UI.Locker.showLockerPrompt('rules');
			})

			.on('click', '#rule-menu-open-snapshots', function () {
				poppy.close();
				
				UI.view.switchTo('#main-views-snapshot');
			})

			.on('click', '#rule-menu-close-snapshot', function () {
				poppy.close();

				globalPage.Rules.useCurrent();

				globalPage.Page.requestPageFromActive();
			})

			.on('click', '#rule-menu-delete-temporary', function () {
				globalPage.Rules.list.temporary.clear();

				poppy.close();

				Tabs.messageAll('reload');
			});
	},

	'setting-menu': function (poppy) {
		poppy.content
			.on('click', '#setting-menu-lock', function () {
				UI.Locker.showLockerPrompt('settings');
			})

			.on('click', '#setting-menu-sync-now', function () {
				this.disabled = true;

				poppy.close();

				globalPage.SyncClient.Settings.init().sync();
			})

			.on('click', '#setting-menu-backup', function (event) {
				if (event.altKey) {
					var submittedSettings = prompt('Paste the submitted settings backup.');

					if (submittedSettings && submittedSettings.length)
						globalPage.Feedback.useSubmittedSettings(submittedSettings);

					poppy.close();

					ToolbarItems.showPopover();

					return;
				}

				var backupPoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'setting-menu-backup');

				backupPoppy.setContent(Template.create('poppy.settings', 'setting-menu-backup')).show();
			})

			.on('click', '#setting-menu-restore-defaults', function () {
				Settings.import({}, true);

				poppy.close();
			});
	},

	'setting-menu-backup': function (poppy) {
		poppy.content
			.on('click', '#setting-menu-backup-export', function () {
				var options = {
					exportSettings: $('#setting-menu-backup-export-settings', poppy.content).is(':checked'),
					exportFirstVisit: $('#setting-menu-backup-export-first-visit', poppy.content).is(':checked'),
					exportRules: $('#setting-menu-backup-export-rules', poppy.content).is(':checked'),
					exportSnapshots: $('#setting-menu-backup-export-snapshots', poppy.content).is(':checked'),
					exportUserScripts: $('#setting-menu-backup-export-user-scripts', poppy.content).is(':checked')
				};

				Settings.export(options).then(function (exported) {
					Settings.EXPORTED_BACKUP = exported;

					setTimeout(function () {
						delete Settings.EXPORTED_BACKUP;
					}, 30000);

					var activeTab = Tabs.active();

					Tabs.create(ExtensionURL('html/exportBackup.html'));

					if (activeTab && Utilities.safariBuildVersion < 603) {
						poppy.setContent(Template.create('main', 'jsb-info', {
							string: _('setting_menu.export.done')
						}));

						activeTab.activate();
					}	else {
						poppy.close();
						
						Popover.hide();
					}
				}, function () {
					poppy.close();
				});
			})

			.on('drop', '#setting-menu-backup-import', function (event) {
				setTimeout(function (event) {
					var file = event.target.files[0];

					if (file) {
						var reader = new FileReader;

						reader.addEventListener('load', function (fileEvent) {
							if (fileEvent.target.result) {
								Settings.import(fileEvent.target.result, $('#clear-existing', poppy.content).is(':checked'));

								poppy.close();
							}
						});

						reader.readAsText(file);
					}
				}, 0, event);
			})

			.on('click', '#setting-menu-backup-import', function () {
				Tabs.create(ExtensionURL('html/importBackup.html#' + Utilities.encode(JSON.stringify({
					title: _('importBackup.title'),
					instructions: _('importBackup.instructions'),
					clearBeforeImport: _('settings.clear_before_import'),
					shouldClearSettings: $('#clear-existing', poppy.content).is(':checked')
				}))));

				Popover.hide();
			})

			.on('click', '#setting-menu-backup-import-alternative', function () {
				var alternativePoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'backup-import-alternative');

				alternativePoppy.setContent(Template.create('poppy.settings', 'backup-import-alternative')).show();
			});
	},

	'encrypt-backup': function (poppy) {
		var password = $('#backup-password', poppy.content),
			verifyPassword = $('#backup-password-verify', poppy.content);

		password.focus();

		poppy.content
			.on('click', '#backup-password-cancel', function () {
				poppy.reject();

				poppy.close();
			})
			.on('click', '#backup-password-save', function () {
				var passwordValue = password.val(),
					verifyPasswordValue = verifyPassword.val();

				if (!passwordValue.length)
					return password.shake().focus();

				if (passwordValue !== verifyPasswordValue)
					return verifyPassword.shake().focus().selectAll();

				poppy.setContent(Template.create('main', 'jsb-readable', {
					string: _('setting.useSecureSettings.encryptingBackup')
				}));

				globalPage.SyncClient.generateHashWorker(passwordValue, poppy.exportedSecure.salt).then(function (backupPasswordHash) {
					globalPage.SyncClient.encryptWorkerTest(globalPage.SyncClient.CHALLENGE, backupPasswordHash).then(function (encryptedChallenge) {
						globalPage.SyncClient.encryptWorkerTest(poppy.exported, backupPasswordHash).then(function (encryptedBackup) {
							delete poppy.exported;

							poppy.exportedSecure.challenge = encryptedChallenge;
							poppy.exportedSecure.encryptedBackup = encryptedBackup;

							poppy.resolve(JSON.stringify(poppy.exportedSecure));

							poppy.close();
						}, function () {
							LogError('Failed to encrypt backup!');

							poppy.reject();

							poppy.close();
						});
					}, function () {
						LogError('Failed to generate challenge!');

						poppy.reject();

						poppy.close();
					});
				}, function () {
					LogError('Failed to generate hash from backup password!');

					poppy.reject();

					poppy.close();
				});
			});
	},

	'decrypt-backup': function (poppy) {
		var password = $('#backup-password', poppy.content);

		password.focus();

		poppy.content
			.on('click', '#backup-password-cancel', function () {
				poppy.reject(true);

				poppy.close();
			})
			.on('click', '#backup-password-import', function () {
				var passwordValue = password.val();

				if (!passwordValue.length)
					return password.shake().focus();

				globalPage.SyncClient.generateHashWorker(passwordValue, poppy.backup.salt).then(function (backupPasswordHash) {
					globalPage.SyncClient.decryptWorker(poppy.backup.challenge, backupPasswordHash).then(function (decryptedChallenge) {
						if (decryptedChallenge !== globalPage.SyncClient.CHALLENGE)
							return password.shake().focus().selectAll();

						poppy.setContent(Template.create('main', 'jsb-readable', {
							string: _('setting.useSecureSettings.decryptingBackup')
						}));

						globalPage.SyncClient.decryptWorker(poppy.backup.encryptedBackup, backupPasswordHash).then(function (decryptedBackup) {
							poppy.resolve(JSON.parse(decryptedBackup));

							poppy.close();
						}, function () {
							LogError('Failed to decrypt backup!');

							poppy.reject(Error('unknown'));

							poppy.close();
						});
					}, function () {
						return password.shake().focus().selectAll();
					});
				}, function () {
					LogError('Failed to generate hash from backup password!');

					poppy.reject(Error('hash'));

					poppy.close();
				});
			});
	},

	'backup-import-alternative': function (poppy) {
		poppy.content
			.on('click', '#backup-import-alternative-import', function () {
				var backupContents = $.trim($('#backup-import-alternative', poppy.content).val());

				poppy.close();

				if (backupContents.length)
					Settings.import(backupContents, $('#clear-existing', poppy.content).is(':checked'));
			});
	},

	'import-rules-from-four': function (poppy) {
		var rulesFromFour = $('#rules-from-four', poppy.content);

		rulesFromFour.focus();

		poppy.content
			.on('click', '#import-rules-from-four', function () {
				globalPage.Upgrade.importRulesFromJSB4(rulesFromFour.val());

				poppy.close();
			});
	},

	'temporary-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#temporary-menu-new', function () {
				var newPoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'create-rule');

				newPoppy.setContent(Template.create('poppy.rules', 'create-rule', {
					editing: false,
					list: 'temporary',
					type: 'domain',
					domain: '',
					kind: '',
					rule: '',
					action: 0
				}));

				newPoppy
					.stayOpenOnPopoverOpen()
					.show();
			})

			.on('click', '#temporary-menu-clear', function () {
				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-make-always', function () {
				globalPage.Rules.list.user.rules.merge(globalPage.Rules.list.temporary.rules, true);

				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-clear, #temporary-menu-make-always', function () {
				poppy.close();

				UI.view.switchTo('#rule-views-temporary', true);
			});
	},

	'firstVisit-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#firstVisit-menu-clear', function () {
				poppy.close();

				globalPage.Rules.list.firstVisit.clear();

				UI.view.switchTo('#rule-views-firstVisit', true);
			});
	},

	'active-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#active-menu-new', function () {
				var newPoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'create-rule');

				newPoppy.setContent(Template.create('poppy.rules', 'create-rule', {
					editing: false,
					list: 'user',
					type: 'domain',
					domain: '',
					kind: '',
					rule: '',
					action: 0
				}));

				newPoppy
					.stayOpenOnPopoverOpen()
					.show();
			})

			.on('click', '#active-menu-clear', function () {
				Poppy.event.addCustomEventListener('poppyDidClose', function () {
					UI.Locker
						.showLockerPrompt('clearRules')
						.then(function () {
							globalPage.Rules.list.user.clear();

							UI.view.switchTo('#rule-views-active', true);
						}, Utilities.noop);
				}, true);

				poppy.close();
			});
	},

	'snapshot-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#snapshot-menu-merge-always', function () {
				globalPage.Rules.list.user.rules.merge(globalPage.Rules.list.active.rules, true);
			})

			.on('click', '#snapshot-menu-make-always', function () {
				globalPage.Rules.list.user.rules.replaceWith(globalPage.Rules.list.active.rules);
			})

			.on('click', '#snapshot-menu-merge-always, #snapshot-menu-make-always, #snapshot-menu-close', function () {
				Poppy.event.addCustomEventListener('poppyDidClose', function () {
					globalPage.Rules.useCurrent();

					UI.view.switchTo('#rule-views-active');
				}, true);

				poppy.close();
			});

		var snapshotInfo = globalPage.Rules.list.active.snapshot.comparison || globalPage.Rules.list.active.snapshot;

		poppy.snapshotID = snapshotInfo.id;
		poppy.snapshots = snapshotInfo.snapshots;

		Poppy.scripts['snapshot-item-compare'](poppy);
	},

	'filter-rules-menu': function (poppy) {
		poppy.content
			.on('click', 'a', function () {
				var filterList = this.parentNode.getAttribute('data-filterList');

				poppy.close();

				UI.Rules.setFilterRulesList(filterList);
			});
	},

	'item-info': function (poppy) {
		poppy.content
			.on('click', '#item-info-show-user-script', function () {
				poppy.close();

				var resource = poppy.resources[Object.keys(poppy.resources)[0]];

				UI.Settings.editUserScript(resource.fullSource);

				UI.view.switchTo('#setting-views-userScript-edit');
				UI.view.switchTo('#main-views-setting');

				UI.view.toTop(UI.Settings.views);
			})

			.on('click', '#item-info-show-rules', function () {
				var ruleListItems = $('<ul class="page-rules-container">');

				var resources = poppy.resources,
					rulePoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true);

				poppy.setContent(_('view.page.item.info.loading'));

				UI.Rules.event.addCustomEventListener('multiListRulesFinishedBuilding', function () {
					rulePoppy.setContent(ruleListItems).show();

					setTimeout(function () {
						rulePoppy.setPosition();
					});
				}, true);

				setTimeout(function () {
					var resourceID,
						rules,
						ruleLists,
						resourceListItem,
						listName;

					for (resourceID in resources) {
						rules = resources[resourceID].rulesForResource(poppy.isAllowed);
						ruleLists = {};

						resourceListItem = Template.create('rules', 'multi-list-resource-item', resources[resourceID]);

						for (listName in rules)
							ruleLists[listName] = rules[listName].rule;

						UI.Rules.buildRuleList($('.multi-list-page-item-rules', resourceListItem), ruleLists, rules, true);

						ruleListItems.append(resourceListItem);
					}
				});
			});
	},

	'user-script-storage-add': function (poppy) {
		var key = $('.user-script-storage-add-key', poppy.content).focus(),
			value = $('.user-script-storage-add-value', poppy.content);

		poppy.content
			.on('click', '.user-script-storage-add-add', function () {
				var keyValue = $.trim(key.val()),
					valueValue = $.trim(value.val());

				if (!keyValue.length || !valueValue.length)
					return keyValue.length ? value.shake().focus() : key.shake().focus();

				try {
					valueValue = JSON.parse(valueValue);
				} catch (e) {
					return value.shake().focus();
				}

				var userScriptNS = UI.Settings.userScriptEdit.attr('data-userScriptNS');

				try {
					var storage = globalPage.UserScript.getStorageStore(userScriptNS);
				} catch (error) {
					poppy.shake();

					return;
				}

				var result = UI.Settings.saveUserScriptEdit(this, true, true);

				if (result) {
					storage.set(keyValue, valueValue);

					UI.event.addCustomEventListener('viewWillScrollToTop', function (event) {
						event.preventDefault();
					}, true);

					UI.Settings.editUserScript(userScriptNS);

					poppy.close();
				}
			});
	},

	'user-script-confirm-view-switch': function (poppy) {
		poppy.content
			.on('click', 'input', function () {
				if (this.className._contains('switch-switch')) {
					$('.user-script-content', UI.Settings.userScriptEdit).removeAttr('data-blockViewSwitch');

					UI.view.switchTo(this.getAttribute('data-viewID'));
				}

				poppy.close();
			});
	},

	'edit-page': function (poppy) {
		poppy.content
			.on('click', 'input', function () {
				var sectionID = poppy.poppy.attr('data-poppyMenuMeta'),
					section = $('.page-host-section[data-id="' + sectionID + '"]', UI.Page.view),
					blockedFirstVisitStatus = JSON.parse(section.attr('data-blockedFirstVisitStatus') || '');

				if (this.id === 'edit-untrust') {
					globalPage.Page.blockFirstVisit(blockedFirstVisitStatus.host, true, section.data('tab').private);

					section.removeAttr('data-blockedFirstVisitStatus');

					poppy.close();

					UI.Page.section.toggleEditMode(section, false);					

					Tabs.messageActive('reload');

					return;
				}

				var action = this.getAttribute('data-action'),
					which = this.getAttribute('data-which'),
					editorKind = $('.page-host-editor-kind', section),
					editorWhichItems = $('.page-host-editor-which-items', section);

				UI.Page.section.toggleEditMode(section, true, false, true);

				if (action === 'block' || action === 'allow') {
					$('option', editorKind).eq(action === 'block' ? 1 : 2).prop('selected', true);

					editorKind.trigger('change');

					$('option', editorWhichItems).eq(which === 'all' ? 1 : 2).prop('selected', true);

					editorWhichItems.trigger('change');
				}	else {
					$('option', editorKind).eq(action === 'enable' ? 0 : 6).prop('selected', true);

					editorKind.trigger('change');
				}	

				$('.page-host-header', section).click();

				poppy.close();
			});
	},

	'create-rule': function (poppy) {
		var list = $('#create-rule-list', poppy.content),
			type = $('#create-rule-type', poppy.content),
			kind = $('#create-rule-kind', poppy.content),
			kinds = $('#create-rule-kinds', poppy.content),
			domain = $('#create-rule-domain', poppy.content),
			whichItem = $('#create-rule-which-item', poppy.content),
			ruleContainer = $('#create-rule-rule-container', poppy.content);

		poppy.content
			.on('change', '#create-rule-type', function () {
				var isAll = this.value === 'domain-all';
				
				domain.parent().toggleClass('jsb-hidden', isAll);

				poppy.setPosition();

				if (!isAll)
					domain.focus();
				else
					domain.blur();
			})

			.on('change', '#create-rule-kind', function () {
				var isDisable = (this.value === 'disable' || this.value === 'enable');

				$('option[value="jsb"]', whichItem).prop({
					disabled: !isDisable,
					selected: isDisable
				});

				$('option:not([value="jsb"])', whichItem)
					.prop({
						disabled: isDisable,
					});

				if (whichItem[0].selectedIndex === -1)
					$('option:eq(1)', whichItem).prop('selected', true);

				whichItem.change();
			})

			.on('change', '#create-rule-which-item', function () {
				setTimeout(function (self) {
					if (self.value === 'items-of-kind')
						kinds.show();
					else
						kinds.hide();
					
					if (self.value !== 'items-of-kind' && self.value !== 'items-all')
						ruleContainer.hide();
					else 
						ruleContainer.show();

					poppy.setPosition();
				}, 50, this);
			})

			.on('click', '#create-rule-duplicate', function () {
				poppy.templateArgs.editing = false;

				var template = Template.create('poppy.rules', 'create-rule', poppy.templateArgs);

				poppy.setContent(template);
			})

			.on('click', '#create-rule-save', function () {
				var self = $(this),
					container = $('#create-rule', poppy.content),
					editing = container.attr('data-editing') === '1';

				if (editing)
					var originalListName = container.attr('data-listName'),
						originalType = container.attr('data-type'),
						originalDomain = container.attr('data-domain'),
						originalKind = container.attr('data-kind'),
						originalRule = container.attr('data-rule'),
						originalAction = parseInt(container.attr('data-action'), 10),
						originalList = globalPage.Rules.list[originalListName];

				var newListName = list.val(),
					newKindAction = kind.val(),
					newType = type.val(),
					newDomain = $.trim(domain.val()),
					whichItemVal = whichItem.val(),
					newRule = $.trim($('#create-rule-rule', ruleContainer).val()),
					isHide = (newKindAction === 'hide' || newKindAction === 'show'),
					isDisable = (newKindAction === 'enable' || newKindAction === 'disable'),
					newAction = (newKindAction === 'show' || newKindAction === 'enable' || newKindAction === 'allow') ? 1 : 0,
					newKindPrefix = '',
					newKinds = [];

				if (!newRule.length)
					newRule = '*';

				if (!newDomain.length)
					newDomain = '*';

				if ($('#create-rule-when-framed', poppy.content).is(':checked'))
					newKindPrefix += 'framed:';

				if (isHide)
					newKindPrefix += 'hide:';

				if (newType === 'domain-all') {
					newType = 'domain';
					newDomain = '*';
				}

				if (isDisable) {
					newKinds.push(newKindPrefix + 'disable');

					newRule = '*';

				} else if (whichItemVal === 'items-all')
					newKinds.push(newKindPrefix + '*');

				else if (whichItemVal === 'items-of-kind')
					$('#create-rule-kinds input:checked', poppy.content).each(function () {
						newKinds.push(newKindPrefix + this.getAttribute('data-kind'));
					});

				UI.Locker
					.showLockerPrompt('disable', !newKinds._contains('disable'), true)
					.then(function () {
						try {
							if (newKinds.length === 0) {
								$('#create-rule-kinds', poppy.content).shake();

								throw new Error(_('rules.no_kinds_selected'));
							}

							if (editing && originalList)
								originalList.__remove(false, originalType, originalKind, originalDomain, originalRule);

							for (var i = newKinds.length; i--;)
								globalPage.Rules.list[newListName].__add(newType, newKinds[i], newDomain, {
									rule: newRule,
									action: newAction
								});

							globalPage.Rule.event.trigger('advancedRuleWasCreated');

							Poppy.closeAll();

							if (UI.Rules.view.is('.active-view'))
								UI.view.switchTo(UI.Rules.viewContainer.attr('data-activeView'));
						} catch (error) {
							var offset = self.offset(),
								errorPoppy = new Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), false);

							errorPoppy.setContent(Template.create('main', 'jsb-readable', {
								string: error.message
							}));

							errorPoppy.linkTo(poppy).show();

							if (editing)
								originalList.__add(originalType, originalKind, originalDomain, {
									rule: originalRule,
									action: originalAction
								});
						}
					}, Utilities.noop);
			});

		type.change();

		if (kind.val() === 'disable' || kind.val() === 'enable')
			kind.change();

		domain.change();
		whichItem.change();
	},

	'confirm-setting-change': function (poppy) {
		poppy.content
			.on('click', '#setting-confirm-cancel', function () {
				poppy.close();

				UI.Settings.repopulateActiveSection();
			})

			.on('click', '#setting-confirm-change', function () {
				poppy.close();

				Settings.setItem(poppy.setting.key, poppy.setting.value, poppy.setting.storeKey, true, poppy.setting.unlocked);
			});
	},

	'snapshot-item': function (poppy) {
		poppy.content
			.on('click', '#snapshot-item-name-set', function () {
				poppy.setContent(Template.create('poppy.snapshots', 'snapshot-item-name'));

				$('#snapshot-item-name', poppy.content).focus();
			})

			.on('click', '#snapshot-item-compare', function () {
				var comparePoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'snapshot-item-compare');

				comparePoppy.snapshots = poppy.snapshots;
				comparePoppy.snapshotID = poppy.snapshotID;

				comparePoppy.setContent(Template.create('poppy.snapshots', 'snapshot-item-compare')).show();
			})

			.on('click', '#snapshot-item-name-save', function () {
				var name = $('#snapshot-item-name', poppy.content),
					nameVal = name.val();

				if (UI.Snapshots.snapshot.setName(poppy.snapshotID, nameVal)) {
					Poppy.event.addCustomEventListener('poppyDidClose', function () {
						UI.Snapshots.buildSnapshots();
					}, true);

					poppy.close();
				} else {
					name.focus();

					poppy.shake();
				}
			})

			.on('click', '#snapshot-item-keep', function () {
				var snapshot = poppy.snapshots.get(poppy.snapshotID);

				poppy.snapshots.remove(poppy.snapshotID);
				poppy.oppositeSnapshots.set(poppy.snapshotID, snapshot);

				Poppy.event.addCustomEventListener('poppyDidClose', function () {
					UI.Snapshots.buildSnapshots();
				}, true);

				poppy.close();
			});
	},

	'snapshot-item-compare': function (poppy) {
		poppy.content
			.on('click', '#snapshot-item-compare-left, #snapshot-item-compare-right, #snapshot-item-compare-both', function () {
				var side;

				var snapshot = poppy.snapshots.get(poppy.snapshotID),
					snapshotStore = Store.promote(snapshot.snapshot),
					compare = Store.compare(UI.Snapshots.current, snapshotStore);

				if (this.id._contains('left'))
					side = 'left';
				else if (this.id._contains('right'))
					side = 'right';
				else if (this.id._contains('both'))
					side = 'both';

				var comparisonID = globalPage.Rules.list.user.rules.snapshot.add(false, UI.Snapshots.getName(poppy.snapshotID, poppy.snapshots), compare.sides[side]);

				poppy.close();

				UI.Snapshots.useSnapshot(comparisonID, globalPage.Rules.list.user.rules.snapshot.comparisons, {
					id: poppy.snapshotID,
					snapshots: poppy.snapshots,
					side: side
				});
			});
	},

	'feedback': function (poppy) {
		var messageElement = $('#feedback-message', poppy.content).focus();

		if (messageElement.length)
			messageElement[0].selectionStart = messageElement.val().length;

		poppy.content
			.on('click', '#feedback-send-email', function () {
				/* eslint-disable */
				globalPage.Feedback.createFeedbackData(messageElement.val(), '').then(function (feedbackData) {
					var emailableFeedback = "\n\n";

					for (var key in feedbackData)
						if (key !== 'email')
							emailableFeedback += key + ': ' + feedbackData[key] + "\n";

					/* eslint-enable */

					Tabs.create('mailto:JSB5Feedback@toggleable.com?subject=JSB5 Feedback&body=' + encodeURIComponent(emailableFeedback));

					poppy.close();
				});
			})

			.on('input', '#feedback-message', function () {
				this.value = this.value.substr(0, 5000);

				UI.Feedback.lastValue = this.value;
			})

			.on('click', '#feedback-submit', function (event) {
				this.disabled = true;

				var message = $.trim($('#feedback-message', poppy.content).val()),
					email = $.trim($('#feedback-email', poppy.content).val());

				if (!message.length) {
					this.disabled = false;

					$('#feedback-message', poppy.content).focus().shake();

					return;
				}

				var self = this;

				globalPage.Feedback
					.submitFeedback(message, email)
					.then(function () {
						UI.Feedback.lastValue = '';

						poppy
							.modal(null, true)
							.hideCloseButton()
							.setContent(Template.create('poppy.feedback', 'feedback-success'));
					}, function (error) {
						self.disabled = false;

						var errorPoppy = new Poppy(event.pageX, event.pageY);

						errorPoppy
							.linkTo(poppy)
							.setContent(Template.create('poppy.feedback', error === false ? 'feedback-please-wait' : 'feedback-error', {
								result: error.statusText === 'error' ? _('feedback.error.offline') : (error.statusText || error)
							}))
							.show();
					});
			});
	},

	'update-available': function (poppy) {
		poppy.content
			.on('click', '#update-ignore', function () {
				Settings.setItem('ignoredUpdates', true, poppy.bundleID);

				poppy.close();
			});
	},

	'sync-client-login': function (poppy) {
		var email = $('#sync-client-email', poppy.content),
			password = $('#sync-client-password', poppy.content),
			errorMessage = $('#sync-client-error', poppy.content),
			syncEmail = SecureSettings.getItem('syncEmail');

		if (typeof syncEmail === 'string') {
			email.val(syncEmail);
			password.focus();
		} else
			email.focus();

		poppy.content
			.on('click', '#sync-client-login-cancel', function () {
				poppy.close();

				globalPage.SyncClient.SRP.sessionExpired(true);
			})
			.on('click', '#sync-client-login-login', function () {
				errorMessage.hide();

				var emailValue = email.val().trim(),
					passwordValue = password.val();

				if (!emailValue.length)
					return email.shake().focus();

				if (!passwordValue.length)
					return password.shake().focus();

				var self = this;

				this.disabled = true;

				globalPage.SyncClient.SRP.login(emailValue, passwordValue).then(function () {
					poppy.close();
				}, function (err) {					
					self.disabled = false;

					if (err === 'server error')
						globalPage.SyncClient.getServerStatus().then(function () {
							errorMessage.show().text(_('sync.server.unknown_error'));
						}, function (err) {
							if (err.responseJSON)
								errorMessage.show().text(err.responseJSON.error.name);
							else
								errorMessage.show().text(_('sync.server.unknown_error'));
						});
					else if (err === 'invalid password')
						password.shake().focus().selectAll();
					else if (err === 'client not found') {
						email.shake().focus().selectAll();

						errorMessage.show().text(_('sync.server.client_not_found'));
					}
				});
			});
	},

	'sync-client-register': function (poppy) {
		var email = $('#sync-client-email', poppy.content),
			password = $('#sync-client-password', poppy.content),
			verifyPassword = $('#sync-client-verify-password', poppy.content),
			errorMessage = $('#sync-client-error', poppy.content);

		email.focus();

		poppy.content
			.on('click', '#sync-client-register-cancel', function () {
				poppy.close();
			})
			.on('click', '#sync-client-register-register', function () {
				errorMessage.hide();

				var emailValue = email.val().trim(),
					passwordValue = password.val(),
					verifyPasswordValue = verifyPassword.val();

				if (!emailValue.length || emailValue.length < 5 || !emailValue._contains('@'))
					return email.shake().focus();

				if (!passwordValue.length)
					return password.shake().focus();

				if (passwordValue !== verifyPasswordValue)
					return verifyPassword.shake().focus().selectAll();

				var self = this;

				this.disabled = true;

				globalPage.SyncClient.SRP.register(emailValue, passwordValue).then(function () {
					poppy.close();

					UI.SyncClient.SRP.showVerify();
				}, function (err) {
					self.disabled = false;

					if (err === 'server error')
						globalPage.SyncClient.getServerStatus().then(function () {
							errorMessage.show().text(_('sync.server.unknown_error'));
						}, function (err) {
							if (err.responseJSON)
								errorMessage.show().text(err.responseJSON.error.name);
							else
								errorMessage.show().text(_('sync.server.unknown_error'));
						});
					else if (err === 'invalid password')
						password.shake().focus().selectAll();
					else if (err === 'invalid email')
						email.shake().focus().selectAll();
					else if (err === 'client exists') {
						email.shake().focus().selectAll();

						errorMessage.show().text(_('sync.server.client_exists'));
					}

				});
			});
	},

	'sync-client-verify': function (poppy) {
		var verificationKey = $('#sync-client-verification-key', poppy.content),
			errorMessage = $('#sync-client-error', poppy.content);

		verificationKey.focus();

		poppy.content
			.on('click', '#sync-client-verify-cancel', function () {
				poppy.close();
			})
			.on('click', '#sync-client-verify-verify', function () {
				errorMessage.hide();

				var verificationKeyValue = verificationKey.val().trim();

				if (!verificationKeyValue.length)
					return verificationKey.shake().focus();

				var self = this;

				this.disabled = true;

				globalPage.SyncClient.SRP.verify(verificationKeyValue).then(function () {
					poppy.close();

					UI.SyncClient.SRP.showLogin(_('sync.verify.verified'));
				}, function (err) {
					self.disabled = false;		

					if (err === 'server error')
						globalPage.SyncClient.getServerStatus().then(function () {
							errorMessage.show().text(_('sync.server.unknown_error'));
						}, function (err) {
							if (err.responseJSON)
								errorMessage.show().text(err.responseJSON.error.name);
							else
								errorMessage.show().text(_('sync.server.unknown_error'));
						});
					else if (err === 'invalid verification key')
						verificationKey.shake().focus().selectAll();
					else if (err === 'client not found')
						errorMessage.show().text(_('sync.server.client_not_found.again'));
				});
			});
	},

	'sync-client-change-password': function (poppy) {
		var currentPassword = $('#sync-client-current-password', poppy.content),
			password = $('#sync-client-password', poppy.content),
			verifyPassword = $('#sync-client-verify-password', poppy.content),
			errorMessage = $('#sync-client-error', poppy.content),
			email = SecureSettings.getItem('syncEmail');

		currentPassword.focus();

		poppy.content
			.on('click', '#sync-client-change-password-cancel', function () {
				poppy.close();
			})
			.on('click', '#sync-client-change-password-change', function () {
				errorMessage.hide();

				var currentPasswordValue = currentPassword.val(),
					passwordValue = password.val(),
					verifyPasswordValue = verifyPassword.val();

				if (!currentPasswordValue.length)
					return currentPassword.shake().focus();

				if (!passwordValue.length)
					return password.shake().focus();

				if (passwordValue !== verifyPasswordValue)
					return verifyPassword.shake().focus();

				var self = this;

				this.disabled = true;

				globalPage.SyncClient.SRP.changePassword(email, currentPasswordValue, passwordValue).then(function () {
					poppy.close();

					UI.SyncClient.SRP.showLogin(_('sync.password_changed'));
				}, function (err) {
					self.disabled = false;

					if (err === 'server error')
						globalPage.SyncClient.getServerStatus().then(function () {
							errorMessage.show().text(_('sync.server.unknown_error'));
						}, function (err) {
							if (err.responseJSON)
								errorMessage.show().text(err.responseJSON.error.name);
							else
								errorMessage.show().text(_('sync.server.unknown_error'));
						});
					else if (err === 'invalid password')
						currentPassword.shake().focus().selectAll();
					else if (err === 'client not found')
						errorMessage.show().text(_('sync.server.client_not_found'));
					else if (err === 'invalid verifier')
						errorMessage.show().text(_('sync.server.unknown_error'));
				});
			});
	},

	console: function (poppy) {
		poppy.content
			.on('change', '#console-debug-mode', function () {
				var self = this;

				UI.Locker
					.showLockerPrompt('setting', false, true)
					.then(function () {
						Settings.setItem('debugMode', self.checked, null, true, true);
					}, function () {
						self.checked = !self.checked;
					});
			})

			.on('click', '#console-clear', function () {
				LogError.history = [];
				LogDebug.history = [];

				globalPage.LogError.history = [];
				globalPage.LogDebug.history = [];

				if (poppy.linkedTo)
					poppy.linkedTo.setContent(Template.create('poppy', 'main-menu'));

				poppy.close();
			})
			
			.on('click', '#console-report', function () {
				/* eslint-disable */
				UI.Feedback.showFeedbackPoppy(_('feedback.console_attached') + "\n\n");
				/* eslint-enable */
			});
	}
});
