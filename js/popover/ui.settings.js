/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

UI.Settings = {
	__hidden: ['userScript-edit'],

	init: function () {
		UI.Settings.view = $('#main-views-setting', UI.view.views);

		UI.Settings.view.append(Template.create('settings', 'setting-container'));

		UI.Settings.toolbar = $('#setting-toolbar', UI.Settings.view);
		UI.Settings.views = $('#setting-views-container', UI.Settings.view);

		var sections = Object.keys(Settings.settings).filter(function (value) {
			return !value._startsWith('__');
		});

		var viewSwitcherData = {
			id: 'setting-views-switcher',
			container: '#setting-views-container',
			views: {}
		};

		for (var i = 0; i < sections.length; i++)
			viewSwitcherData.views['#setting-views-' + sections[i]] = {
				hide: UI.Settings.__hidden._contains(sections[i]),
				value: _('settings.' + sections[i])
			};

		UI.Settings.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Settings.viewSwitcher = $('.view-switcher', UI.Settings.view);

		for (i = 0; i < sections.length; i++)
			UI.view.create('setting-views', sections[i], UI.Settings.views);

		UI.Settings.userScriptEdit = $('#setting-views-userScript-edit', UI.Settings.views);

		UI.Settings.events.viewSwitcher();

		try {
			UI.view.switchTo(Settings.getItem('settingCurrentView'));
		} catch (error) {
			LogError('failed to switch to setting view', error);
		}

		UI.Settings.views
			.on('input', '.user-script-content', function () {
				this.setAttribute('data-blockViewSwitch', 1);

				UI.Settings.enableUserScriptSave();
			});

		UI.container
			.on('click', '#sync-client-learn-more', function (event) {
				var poppy = new Poppy(event.pageX, event.pageY, true);

				poppy
					.setContent(Template.create('main', 'jsb-readable', {
						string: _('setting.syncClientSync.help')
					}))
					.show();
			})
			.on('click', '*[data-settingButton]', function (event) {
				var settingName = this.getAttribute('data-settingButton'),
					setting = Settings.map[settingName];

				if (setting.props.onClick) {
					if (setting.props.validate && !setting.props.validate.test()) {
						var poppy = new Poppy(event.pageX, event.pageY, true);

						poppy
							.setContent(Template.create('main', 'jsb-readable', {
								string: _('setting.' + setting.props.validate.onFail)
							}))
							.show();

						return;
					}

					setting.props.onClick(this);
				}
			});

		UI.Settings.events.elementWasAdded({
			detail: document.body
		});

		Poppy.event.addCustomEventListener('poppyDidShow', UI.Settings.events.poppyDidShow);

		UI.event.addCustomEventListener('viewAlreadyActive', UI.Settings.events.repopulateActiveSection);
		UI.event.addCustomEventListener('elementWasAdded', UI.Settings.events.elementWasAdded);
		UI.event.addCustomEventListener('viewWillSwitch', UI.Settings.events.viewWillSwitch);
	},

	disableUserScriptSave: function () {
		$('[data-settingButton="saveUserScript"]', UI.Settings.views)
			.prop('disabled', true)
			.val(_('setting.saveUserScript.subLabel.saved'));
	},

	enableUserScriptSave: function () {
		$('[data-settingButton="saveUserScript"]', UI.Settings.views)
			.prop('disabled', false)
			.val(_('setting.saveUserScript.subLabel'));
	},

	bindInlineSettings: function (inlineSettings) {
		for (var i = inlineSettings.length; i--;) {
			var element = $(inlineSettings[i]);

			if (element.attr('data-inlineSettingBound'))
				continue;

			element.attr('data-inlineSettingBound', 1);

			var settingName = element.attr('data-inlineSetting'),
				storeKey = element.attr('data-storeKey'),
				settingRef = Settings.map[settingName],
				storeSetting = settingRef.storeKeySettings ? settingRef.storeKeySettings[storeKey] : null,
				settingType = storeSetting && storeSetting.props.type || settingRef.props.type,
				currentValue = Settings.getItem(settingName, storeKey);

			switch (settingType) {
				case 'option':
				case 'option-radio':
					currentValue = currentValue.toString();

					if (settingType === 'option') {
						var options = $('option', element);

						for (var b = options.length; b--;) {
							if (options[b].classList.contains('select-custom-option')) {
								options[b].setAttribute('value', currentValue);

								element.parent().prev().val(currentValue);
							}

							if (options[b].value.toString() === currentValue) {
								element[0].selectedIndex = b;

								break;
							}
						}
					} else if (currentValue === element.val())
						element.prop('checked', true);

					element.change(function () {
						if (this.checked !== false) {
							var value = this.value === 'false' ? false : this.value;

							Settings.setItem(this.getAttribute('data-inlineSetting'), value, this.getAttribute('data-storeKey'));
						}
					});
					break;

				case 'range':
					element
						.val(currentValue)
						.change(function () {
							Settings.setItem(this.getAttribute('data-inlineSetting'), this.value, this.getAttribute('data-storeKey'));
						});
					break;

				case 'many-boolean':
				case 'boolean':
					element
						.prop('checked', currentValue)
						.change(function () {
							Settings.setItem(this.getAttribute('data-inlineSetting'), this.checked, this.getAttribute('data-storeKey'));
						});
					break;

				case 'dynamic-array':
					element
						.prop('checked', currentValue.enabled)
						.change(function () {
							var setting = this.getAttribute('data-inlineSetting'),
								storeKey = this.getAttribute('data-storeKey'),
								currentValue = Settings.getItem(setting, storeKey)._clone();

							currentValue.enabled = this.checked;

							Settings.setItem(setting, currentValue, storeKey);
						});

					var remove = element.parent().nextAll('.setting-dynamic-delete');

					if (remove.length)
						remove.click(function () {
							var container = $(this).parents('li');

							Settings.removeItem(container.attr('data-setting'), container.attr('data-storeKey'));
						});
					break;
			}
		}
	},

	bindUserScriptSettings: function (userScriptSettings) {
		for (var i = userScriptSettings.length; i--;) {
			var element = $(userScriptSettings[i]);

			if (element.attr('data-userScriptSettingsBound'))
				continue;

			try {
				var attributeValue = globalPage.UserScript.getAttribute(element.attr('data-userScript'), element.attr('data-attribute'));
			} catch (eror) {
				continue;
			}

			element.attr('data-userScriptSettingsBound', 1);

			element
				.prop('checked', attributeValue)
				.change(function () {
					try {
						globalPage.UserScript.setAttribute(this.getAttribute('data-userScript'), this.getAttribute('data-attribute'), this.checked);
					} catch (error) { /* do nothing */ }
				});
		}
	},

	bindUserScriptStorageEdit: function (userScriptStorages) {
		for (var i = userScriptStorages.length; i--;) {
			var element = $(userScriptStorages[i]);

			if (element.attr('data-userScriptStorageBound'))
				continue;

			try {
				var storageItem = globalPage.UserScript.getStorageStore(element.attr('data-userScript'), element.attr('data-storageKey'));
			} catch (error) {
				continue;
			}

			var storageItemValue;

			try {
				storageItemValue = JSON.stringify(storageItem);
			} catch (e) {
				storageItemValue = '';
			}

			element.attr('data-userScriptStorageBound', 1);

			if (element.is('.user-script-storage-item-delete'))
				element
					.parent()
					.on('click', '.user-script-storage-item-delete', function () {
						var userScriptNS = this.getAttribute('data-userScript');

						try {
							var storage = globalPage.UserScript.getStorageStore(userScriptNS);
						} catch (error) {
							return;
						}

						var result = UI.Settings.saveUserScriptEdit(this, true, true);

						if (result) {
							storage.remove(this.getAttribute('data-storageKey'));

							var storageItem = $(this).parents('.user-script-storage-item');

							storageItem.collapse(225 * window.globalSetting.speedMultiplier, 'easeOutQuad', function () {
								UI.event.addCustomEventListener('viewWillScrollToTop', function (event) {
									event.preventDefault();
								}, true);
								
								UI.Settings.editUserScript(userScriptNS);
							});
						}
					});
			else
				element
					.val(storageItemValue)
					.on('blur keypress', function (event) {
						if (this.disabled || (event.which && event.which !== 3 && event.which !== 13))
							return;

						try {
							var storage = globalPage.UserScript.getStorageStore(this.getAttribute('data-userScript'));
						} catch (error) {
							return;
						}

						if (this.value === 'undefined') {
							storage.remove(this.getAttribute('data-storageKey'));

							this.disabled = true;

							this.blur();
						} else
							try {
								storage.set(this.getAttribute('data-storageKey'), JSON.parse(this.value), true);

								this.classList.add('jsb-color-allowed');

								setTimeout(function (self) {
									self.classList.remove('jsb-color-allowed');
								}, 1500, this);
							} catch (e) {
								this.classList.add('jsb-color-blocked');
								this.classList.add('shake');

								setTimeout(function (self) {
									self.classList.remove('jsb-color-blocked');
									self.classList.remove('shake');
								}, 1500, this);
							}
					});
		}
	},

	bindUserScriptAttributeEdit: function (userScriptAttributes) {
		for (var i = userScriptAttributes.length; i--;) {
			var element = $(userScriptAttributes[i]);

			if (element.attr('data-userScriptAttributeBound'))
				continue;

			element
				.attr('data-userScriptAttributeBound', 1)
				.on('blur keypress', function (event) {
					if (this.disabled || (event.which && event.which !== 3 && event.which !== 13))
						return;

					var userScript = this.getAttribute('data-userScript'),
						value = $.trim(this.value);

					if (value === 'undefined' || value.length === '') {
						globalPage.UserScript.removeAttribute(userScript, this.getAttribute('data-attributeKey'));

						this.disabled = true;

						this.blur();
					} else
						try {
							globalPage.UserScript.setAttribute(userScript, this.getAttribute('data-attributeKey'), value);

							this.classList.add('jsb-color-allowed');

							setTimeout(function (self) {
								self.classList.remove('jsb-color-allowed');
							}, 1500, this);
						} catch (e) {
							this.classList.add('jsb-color-blocked');
							this.classList.add('shake');

							setTimeout(function (self) {
								self.classList.remove('jsb-color-blocked');
								self.classList.remove('shake');
							}, 1500, this);
						}
				});
		}
	},

	bindDynamicSettingNew: function (containers) {
		for (var i = containers.length; i--;) {
			var container = $(containers[i]);

			if (container.attr('data-dynamicNewBound'))
				continue;

			container.attr('data-dynamicNewBound', 1);

			container
				.on('click', '.setting-dynamic-restore', function () {
					var newContainer = $(this).parents('.setting-dynamic-new-container');

					Settings.removeItem(newContainer.attr('data-setting'));
				})

				.on('click', '.setting-dynamic-new-save', function () {
					var newContainer = $(this).parents('.setting-dynamic-new-container'),
						newName = $('.setting-dynamic-new-name', newContainer),
						newNameVal = $.trim(newName.val()),
						newContent = $('.setting-dynamic-new-content', newContainer),
						newContentVal = $.trim(newContent.val());

					if (!newNameVal.length) {
						newName.shake().focus();

						return;
					}

					if (!newContentVal.length) {
						newContent.shake().focus();

						return;
					}

					var success = Settings.setItem(newContainer.attr('data-setting'), {
						enabled: true,
						value: [newContentVal, newNameVal]
					}, '$' + Utilities.Token.generate());

					if (success !== true) {
						var offset = $(this).offset(),
							poppy = new Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), true);

						poppy.setContent(Template.create('main', 'jsb-readable', {
							string: _(success)
						}));

						poppy.show();

						newContent.shake().focus();
					}
				});
		}
	},

	createList: function (container, settings, disabled) {
		if (!settings)
			return;

		var setting,
			settingElement,
			listSetting,
			shouldRender,
			collapsibleContainer,
			subContainer,
			settingRow;

		var allSettings = Settings.all();

		for (var i = 0; i < settings.length; i++) {
			setting = settings[i];

			if (setting.customView) {
				setting.customView(container);

				Utilities.setImmediateTimeout(function (container) {
					UI.event.trigger('customSettingViewCreated', container);
				}, [container]);
			}

			else if (setting.asRow) {
				settingRow = Template.create('settings', 'setting-section-row');

				this.createList($('ul', settingRow), setting.asRow);

				container.append(settingRow);
			}

			else if (setting.divider)
				container.append(Template.create('settings', 'setting-section-divider', {
					classes: setting.classes
				}));

			else if (setting.header)
				container.append(Template.create('settings', 'setting-section-header', {
					header: _('setting.' + setting.header),
					level: setting.level
				}));

			else if (setting.description)
				container.append(Template.create('settings', 'setting-section-description', {
					id: setting.id || ('description-' + Utilities.Token.generate()),
					description: _('setting.' + setting.description, setting.fill ? setting.fill() : []),
					classes: setting.classes
				}));

			else if (setting.when) {
				shouldRender = Utilities.Group.eval(setting.when.settings, allSettings);

				if (shouldRender || !setting.when.hide)
					this.createList(container, setting.settings, !shouldRender || disabled);

			} else if (setting.setting || setting.collapsible || (setting.store && setting.props && setting.props.isSetting))
				if (setting.props) {
					if (setting.props.remap || setting.props.readOnly)
						continue;

					if (setting.collapsible) {
						collapsibleContainer = Template.create('settings', 'setting-section-collapsible', {
							header: setting.collapsible
						});

						container.append(collapsibleContainer);

						subContainer = collapsibleContainer;
					} else {
						subContainer = null;

						settingElement = this.createElementForSetting(setting, null, true, true);

						listSetting = Template.create('settings', 'setting-section-setting', {
							setting: setting.setting || setting.store
						});

						listSetting.append(settingElement.children());

						container.append(listSetting);
					}

					if (disabled)
						listSetting
							.addClass('jsb-disabled')
							.find('input, textarea, select')
							.attr('disabled', true);
					
					if (setting.props.subSettings && !disabled) {
						if (!subContainer) {
							subContainer = Template.create('settings', 'setting-section-sub-container');

							container.append(subContainer);
						}

						this.createList($('ul', subContainer), setting.props.subSettings);
					}
				}
		}
	},

	createElementForSetting: function (setting, id, wrap, noFullEval) {		
		var allSettings = noFullEval ? {} : Settings.all(),
			mappedSetting = Settings.map[setting.setting],
			baseProps = (setting.props.storeKey && mappedSetting.storeKeySettings) ? mappedSetting.props : setting.props,
			shouldRender = noFullEval ? true : (mappedSetting.props.when ? Utilities.Group.eval(mappedSetting.props.when.settings, allSettings) : true);

		var element;

		if (!shouldRender && (mappedSetting.props.when && mappedSetting.props.when.hide))
			element = $('<div>');
		else
			element = Template.create('settings', 'setting-element', {
				id: id || ('setting-element-' + Utilities.Token.generate()),
				setting: setting,
				props: baseProps,
				wrap: wrap,
				disabled: !shouldRender
			}, true);

		return element;
	},

	populateSection: function (view, settingSection)  {		
		var container = Template.create('settings', 'setting-section-container'),
			currentSection = $('> .setting-section', view);

		this.createList(container, Settings.settings[settingSection]);

		this.events.elementWasAdded({
			detail: container[0]
		});

		if (currentSection.length)
			currentSection.replaceWith(container);
		else
			view.append(container);
	},

	repopulateActiveSection: function (force) {
		var mainViewID = $('.active-view', UI.view.viewSwitcher).attr('data-view');

		if (mainViewID !== '#main-views-setting')
			return;

		var activeSettingView = $('.active-view', UI.Settings.views),
			focusedTextInput = $('textarea:focus, input[type="text"]:focus', activeSettingView);

		if (force || (!focusedTextInput.length && activeSettingView.is(':not(#setting-views-userScript-edit)')))
			UI.Settings.populateSection(activeSettingView, $('.active-view', UI.Settings.views).attr('data-section'));
	},

	saveUserScriptEdit: function (button, noSwitch, noAutoLoad) {
		var userScript = $('.user-script-content', UI.Settings.views),
			userScriptContent = userScript.val(),
			result = globalPage.UserScript.add(userScriptContent);

		if (typeof result === 'string') {
			userScript.removeAttr('data-blockViewSwitch');

			if (!noSwitch)
				UI.view.switchTo('#setting-views-userScripts');
			else if (!noAutoLoad)
				UI.Settings.editUserScript(result);
		} else if (button) {
			var offset = $(button).offset(),
				poppy = new Popover.window.Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), false);

			poppy.setContent(Template.create('main', 'jsb-readable', {
				string: _('setting.saveUserScript.fail')
			})).show();
		}

		return typeof result === 'string';
	},

	editUserScript: function (userScriptNS) {
		UI.Settings.userScriptEdit.attr('data-userScriptNS', userScriptNS);

		var alreadyEditing = $('.active-view', UI.Settings.views).is('#setting-views-userScript-edit');

		UI.event.addCustomEventListener(alreadyEditing ? 'UIReady' : 'customSettingViewCreated', function (event) {
			if (event.detail && !$('.user-script-edit', event.detail).length)
				return;

			try {
				var meta = globalPage.UserScript.getAttribute(userScriptNS, 'meta'),
					script = globalPage.UserScript.getAttribute(userScriptNS, 'script'),
					downloadURL = globalPage.UserScript.getAttribute(userScriptNS, 'downloadURL'),
					customDownloadURL = globalPage.UserScript.getAttribute(userScriptNS, 'customDownloadURL'),
					storage = globalPage.UserScript.getStorageStore(userScriptNS);
			} catch (error) {
				return;
			}

			var list = $('ul', UI.Settings.userScriptEdit);

			$('.setting-section-divider', list).nextAll().addBack().remove();

			$('#user-script-title h1', list).text(meta.name);

			list
				.append(Template.create('settings', 'setting-section-divider'))
				.append(Template.create('settings', 'setting-section-header', {
					header: _('setting.userScript.storage'),
					level: 2
				}))
				.append(Template.create('settings', 'setting-section-description', {
					id: 'description-' + Utilities.Token.generate(),
					classes: 'dividing-border',
					description: _('setting.newUserScriptStorageItem.description')
				}));

			$('.user-script-content', UI.Settings.userScriptEdit).val(script);

			if (storage && !storage.isEmpty()) {
				var sortedStorage = storage.keys().sort().reverse();

				for (var i = sortedStorage.length; i--;)
					list.append(Template.create('settings', 'user-script-storage-item', {
						userScript: userScriptNS,
						key: sortedStorage[i],
						value: storage.get(sortedStorage[i])
					}));
			}

			var element = UI.Settings.createElementForSetting(Settings.map.newUserScriptStorageItem, null, true, true),
				wrapper = Template.create('settings', 'setting-section-setting', {
					setting: 'newUserScriptStorageItem'
				}, true);

			$('li', wrapper).append(element.children());

			list.append(wrapper.children());

			list
				.append(Template.create('settings', 'setting-section-divider'))
				.append(Template.create('settings', 'setting-section-header', {
					header: _('setting.userScript.attributes', [meta.name._escapeHTML()]),
					level: 2
				}))
				.append(Template.create('settings', 'setting-section-description', {
					id: 'description-' + Utilities.Token.generate(),
					classes: 'dividing-border',
					description: _('userScript.attribute.description')
				}))
				.append(Template.create('settings', 'user-script-attribute-item', {
					userScript: userScriptNS,
					key: 'customDownloadURL',
					value: customDownloadURL,
					defaultValue: downloadURL
				}));

			UI.Settings.disableUserScriptSave();
		}, true);

		UI.view.switchTo('#setting-views-userScript-edit');
	},

	events: {
		repopulateActiveSection: function (event) {
			var id = event ? (event.detail.id || event.detail.to.id) : $('.active-view', UI.view.viewSwitcher).attr('data-view');

			if (id !== '#main-views-setting' || $('.active-view', UI.Settings.views).is('#setting-views-userScript-edit'))
				return;

			UI.Settings.repopulateActiveSection();
		},

		viewSwitcher: function () {
			UI.Settings.viewSwitcher
				.on('click', 'li', function () {
					var viewID = this.getAttribute('data-view');

					if (!viewID._endsWith('userScript-edit'))
						Settings.setItem('settingCurrentView', viewID);
				});
		},

		poppyDidShow: function () {
			UI.Settings.views.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
		},

		elementWasAdded: function (event) {
			if (event.detail.querySelectorAll) {
				// ===== Custom Selects =====
				var customSelects = event.detail.querySelectorAll('.select-custom-input + select:not(.select-custom-ready)');

				for (var i = customSelects.length; i--;) {
					if (customSelects[i].classList.contains('select-single')) {
						$(customSelects[i]).prev().hide();

						continue;
					}

					customSelects[i].classList.add('select-custom-ready');

					customSelects[i].previousElementSibling.value = customSelects[i].value;

					$(customSelects[i])
						.append('<option class="select-custom-option">Custom Option</option>')
						.next()
						.addBack()
						.wrapAll('<div class="select-wrapper"></div>')
						.end()
						.parent()
						.prev()
						.addBack()
						.wrapAll('<div class="select-custom-wrapper"></div>');
				}
				
				UI.Settings.bindInlineSettings(event.detail.querySelectorAll('*[data-inlineSetting]'));
				UI.Settings.bindUserScriptSettings(event.detail.querySelectorAll('*[data-attribute]'));
				UI.Settings.bindUserScriptStorageEdit(event.detail.querySelectorAll('*[data-storageKey]'));
				UI.Settings.bindUserScriptAttributeEdit(event.detail.querySelectorAll('*[data-attributeKey]'));
				UI.Settings.bindDynamicSettingNew(event.detail.querySelectorAll('.setting-dynamic-new-container'));
			}
		},

		viewWillSwitch: function (event) {
			if (event.detail.to.id === '#main-views-setting' && Settings.isLocked()) {
				event.preventDefault();

				if (!Poppy.poppyWithScriptNameExist('setting-menu'))
					UI.Locker
						.showLockerPrompt('settings')
						.then(function () {
							UI.view.switchTo(event.detail.to.id);
						});
			}

			if (event.detail.to.id === '#main-views-setting')
				return setTimeout(function () {
					UI.Settings.repopulateActiveSection();
				}, 20);

			if (!event.detail.to.id._startsWith('#setting-views'))
				return;

			if ($('.user-script-content', UI.Settings.userScriptEdit).attr('data-blockViewSwitch')) {
				event.preventDefault();

				var poppy = new Poppy(0.5, 0, true, 'user-script-confirm-view-switch');

				poppy
					.modal()
					.setContent(Template.create('poppy.settings', 'user-script-confirm-view-switch', {
						viewID: event.detail.to.id
					}))
					.show();
			} else if (event.detail.from.id === '#setting-views-userScript-edit')
				$('.user-script-content', UI.Settings.userScriptEdit).val('');

			setTimeout(function () {
				UI.Settings.populateSection(event.detail.to.view, event.detail.to.view.attr('data-section'));
			}, 20);
		}
	}
};

document.addEventListener('DOMContentLoaded', UI.Settings.init, true);

globalPage.SyncClient.event
	.addCustomEventListener('registered', function () {
		UI.Settings.repopulateActiveSection();
	})
	.addCustomEventListener('login', function () {
		UI.Settings.repopulateActiveSection();
	})
	.addCustomEventListener('logout', function () {
		UI.Settings.repopulateActiveSection();
	});
