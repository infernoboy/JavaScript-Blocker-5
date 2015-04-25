"use strict";

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
					.then(function resolved () {
						var emailAddress = $.trim(unlockEmail.val());

						if (!emailAddress.length) {
							errorContainer.addClass('jsb-hidden');

							return unlockEmail.shake().focus().selectAll();
						}

						Extras
							.unlockUsingEmail(emailAddress)
							.then(function (success) {
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
					}, function rejected () {
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
			.on('click', '#lock-password-forgot', function (event) {
				Tabs.create(Utilities.URL.createFromContent(Template.create('poppy.settings', 'forgot-locker-password', {}, null, true), 'text/html', true));

				Popover.hide();
			})

			.on('click', '#lock-password-cancel', function () {
				poppy.close();
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
			.on('click', '#lock-password-forgot', function (event) {
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
					});

				poppy.close();
			});
	},

	'main-menu': function (poppy) {
		poppy.content
			.on('click', '#main-menu-about', function () {
				poppy.close();

				UI.view.switchTo('#main-views-about');
			})

			.on('click', '#main-menu-submit-feedback', function () {
				Tabs.create('mailto:JSB5Feedback@toggleable.com?subject=JSB5%20Feedback', true);
			})

			.on('click', '#main-menu-unlock', function () {
				UI.Extras.showUnlockPrompt();
			})

			.on('click', '#main-menu-console', function (event) {
				UI.Locker
					.showLockerPrompt('console', false, true)
					.then(function () {
						Poppy.closeLinksTo(poppy);

						var consolePoppy = new Poppy(event.pageX, event.pageY, false, 'console');

						consolePoppy
							.setContent(Template.create('poppy', 'console'))
							.linkTo(poppy)
							.stayOpenOnScroll()
							.show();
					});
			});
	},

	'page-menu': function (poppy) {
		poppy.content
			.on('change', 'input[type="checkbox"]', function () {
				UI.event.addCustomEventListener('poppyDidClose', function () {
					UI.view.switchTo('#main-views-page');

					globalPage.Page.requestPageFromActive();
				}, true);
			})
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

			.on('click', '#setting-menu-backup', function () {
				var backupPoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'setting-menu-backup');

				backupPoppy.setContent(Template.create('poppy.settings', 'setting-menu-backup')).show();
			})

			.on('click', '#setting-menu-restore-defaults', function (event) {
				Settings.import({}, true);

				poppy.close();
			});
	},

	'setting-menu-backup': function (poppy) {
		poppy.content
			.on('click', '#setting-menu-backup-export', function (event) {
				var options = {
					exportSettings: $('#setting-menu-backup-export-settings', poppy.content).is(':checked'),
					exportFirstVisit: $('#setting-menu-backup-export-first-visit', poppy.content).is(':checked'),
					exportRules: $('#setting-menu-backup-export-rules', poppy.content).is(':checked'),
					exportSnapshots: $('#setting-menu-backup-export-snapshots', poppy.content).is(':checked'),
					exportUserScripts: $('#setting-menu-backup-export-user-scripts', poppy.content).is(':checked')
				};

				Tabs.create(Utilities.URL.createFromContent(Settings.export(options), 'application/zip', true));
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

			.on('click', '#setting-menu-backup-import-alternative', function (event) {
				var alternativePoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true, 'backup-import-alternative');

				alternativePoppy.setContent(Template.create('poppy.settings', 'backup-import-alternative')).show();
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
			.on('click', '#temporary-menu-new', function (event) {
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

				newPoppy.show();
			})

			.on('click', '#temporary-menu-clear', function (event) {
				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-make-always', function (event) {
				globalPage.Rules.list.user.rules.merge(globalPage.Rules.list.temporary.rules, true);

				globalPage.Rules.list.temporary.clear();
			})

			.on('click', '#temporary-menu-clear, #temporary-menu-make-always', function (event) {
				poppy.close();

				UI.view.switchTo('#rule-views-temporary', true);
			})
	},

	'active-rules-menu': function (poppy) {
		poppy.content
			.on('click', '#active-menu-new', function (event) {
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

				newPoppy.show();
			})

			.on('click', '#active-menu-clear', function (event) {
				UI.event.addCustomEventListener('poppyDidClose', function () {
					UI.Locker
						.showLockerPrompt('clearRules')
						.then(function () {
							globalPage.Rules.list.user.clear();

							UI.view.switchTo('#rule-views-active', true);
						});
				}, true);

				poppy.close();
			})
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
				UI.event.addCustomEventListener('poppyDidClose', function () {
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
			.on('click', 'a', function (event) {
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
				poppy.setContent(_('view.page.item.info.loading'));

				setTimeout(function () {
					var resources = poppy.resources,
							rulePoppy = new Poppy(poppy.originalPosition.x, poppy.originalPosition.y, true),
							ruleListItems = $('<ul class="page-rules-container">');

					UI.Rules.event.addCustomEventListener('multiListRulesFinishedBuilding', function (event) {
						rulePoppy.setPosition();
					}, true);

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

					rulePoppy.setContent(ruleListItems).show();
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
					var storage = globalPage.UserScript.getStorageItem(userScriptNS);
				} catch (error) {
					poppy.shake();

					return;
				}

				var result = UI.Settings.saveUserScriptEdit(this, true);

				if (result) {
					storage.set(keyValue, valueValue);

					UI.event.addCustomEventListener('viewWillScrollToTop', function (event) {
						event.preventDefault();
					}, true)

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
				var sectionID = poppy.poppy.attr('data-menuMeta'),
						section = $('.page-host-section[data-id="' + sectionID + '"]', UI.Page.view),
						action = this.getAttribute('data-action'),
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

			.on('click', '#create-rule-save', function (event) {
				var self = $(this),
						container = $('#create-rule', poppy.content),
						editing = container.attr('data-editing') === '1';

				if (editing) {
					var originalListName = container.attr('data-listName'),
							originalType = container.attr('data-type'),
							originalDomain = container.attr('data-domain'),
							originalKind = container.attr('data-kind'),
							originalRule = container.attr('data-rule'),
							originalAction = parseInt(container.attr('data-action'), 10),
							originalList = globalPage.Rules.list[originalListName];
				}

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
					}, function () {
						// Cancelled
					});
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
					UI.event.addCustomEventListener('poppyDidClose', function () {
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

				UI.event.addCustomEventListener('poppyDidClose', function () {
					UI.Snapshots.buildSnapshots();
				}, true);

				poppy.close();
			})
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

	console: function (poppy) {
		poppy.content
			.on('change', '#console-debug-mode', function () {
				var self = this;

				UI.Locker
					.showLockerPrompt('setting', false, true)
					.then(function () {
						window.globalSetting.debugMode = self.checked;
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
				var messageHistory = Utilities.messageHistory();
				
				var errors = messageHistory.error.map(function (value, i) {
					return value.message.join(' ') + (value.stack ? "\n\t\tStack:" + value.stack : '');
				});

				var messages = ['Error Messages', '', errors.join("\n"), "\n", 'Debug Messages', '', messageHistory.debug.join("\n")];

				Tabs.create('mailto:jsbconsole@toggleable.com?subject=JSB5%20Console&body=' + encodeURIComponent(messages.join("\n")), true);
			});
	}
});
