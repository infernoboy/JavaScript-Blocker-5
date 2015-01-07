"use strict";

UI.Settings = {
	init: function () {
		UI.Settings.view = $('#main-views-setting', UI.view.views);

		UI.Settings.view.append(Template.create('settings', 'setting-container'));

		UI.Settings.toolbar = $('#setting-toolbar', UI.Settings.view);
		UI.Settings.viewContainer = $('#setting-views-container', UI.Settings.view);
		UI.Settings.views = $('#setting-views', UI.Settings.viewContainer);

		var sections = Object.keys(Settings.settings).filter(function (value) {
			return !value._startsWith('__');
		});

		var viewSwitcherData = {
			container: '#setting-views-container',
			views: {}
		};

		for (var i = 0; i < sections.length; i++)
			viewSwitcherData.views['#setting-views-' + sections[i]] = {
				value: _('settings.' + sections[i])
			};

		UI.Settings.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Settings.viewSwitcher = $('.view-switcher', UI.Settings.view);

		for (var i = 0; i < sections.length; i++)
			UI.Settings.createView(sections[i], _('settings.' + sections[i]));

		UI.Settings.events.viewSwitcher();

		try {
			UI.view.switchTo(Settings.getItem('settingCurrentView'));
		} catch (error) {
			LogError('failed to switch to setting view', error);
		}
	},

	createView: function (viewID) {
		var view = Template.create('settings', 'view', {
			viewID: viewID
		});

		view.html(viewID);

		UI.Settings.views.append(view);
	},

	bindInlineSettings: function (inlineSettings) {
		for (var i = inlineSettings.length; i--;) {
			var element = $(inlineSettings[i]);

			if (element.attr('data-inlineSettingBound'))
				return;

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

						for (var b = options.length; b--;) 
							if (options[b].value.toString() === currentValue) {
								element[0].selectedIndex = b;

								break;
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

				case 'boolean':
					element
						.prop('checked', currentValue)
						.change(function () {
							Settings.setItem(this.getAttribute('data-inlineSetting'), this.checked, this.getAttribute('data-storeKey'));
						});
				break;
			}
		}
	},

	createList: function (container, settings) {
		var setting,
				settingItem,
				settingElement,
				listSetting,
				subContainer;

		var allSettings = Settings.all();

		for (var i = 0; i < settings.length; i++) {
			setting = settings[i];

			if (setting.divider)
				container.append(Template.create('settings', 'setting-section-divider'));

			else if (setting.header)
				container.append(Template.create('settings', 'setting-section-header', {
					header: setting.header,
					level: setting.level
				}));

			else if (setting.description)
				container.append(Template.create('settings', 'setting-section-description', {
					id: setting.id || ('description-' + Utilities.Token.generate()),
					description: setting.description
				}));

			else if (setting.button) {

			} else if (setting.when) {
				if (Utilities.Group.eval(setting.when.settings, allSettings))
					this.createList(container, setting.settings);

			} else if (setting.setting) {
				if (setting.props) {
					if (setting.props.remap || setting.props.readOnly)
						continue;

					settingElement = this.createElementForSetting(setting, null, true);

					listSetting = Template.create('settings', 'setting-section-setting', {
						setting: setting.setting
					});

					listSetting.append(settingElement.children());

					container.append(listSetting);
					
					if (setting.props.subSettings) {
						subContainer = Template.create('settings', 'setting-section-sub-container');

						container.append(subContainer);

						this.createList($('ul', subContainer), setting.props.subSettings);
					}
				}
			}
		}
	},

	createElementForSetting: function (setting, id, wrap) {
		var mappedSetting = Settings.map[setting.setting],
				baseProps = (setting.props.storeKey && mappedSetting.storeKeySettings) ? mappedSetting.props : setting.props;

		var element = Template.create('settings', 'setting-element', {
			id: id || ('setting-element-' + Utilities.Token.generate()),
			setting: setting,
			props: baseProps,
			wrap: wrap
		}, true);

		return element;
	},

	populateSection: function (view, settingSection)  {
		var container = Template.create('settings', 'setting-section-container');

		this.createList(container, Settings.settings[settingSection])

		view.empty().append(container);
	},

	events: {
		viewSwitcher: function () {
			UI.Settings.viewSwitcher
				.on('click', 'li', function (event) {
					UI.view.switchTo(this.getAttribute('data-view'));

					Settings.setItem('settingCurrentView', this.getAttribute('data-view'));
				});
		},

		poppyDidShow: function (event) {
			UI.Settings.viewContainer.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
		},

		elementWasAdded: function (event) {
			if (event.detail.querySelectorAll)
				UI.Settings.bindInlineSettings(event.detail.querySelectorAll('*[data-inlineSetting]'));
		},

		viewWillSwitch: function (event) {
			if (!event.detail.to.id._startsWith('#setting-views'))
				return;

			UI.Settings.populateSection(event.detail.to.view, event.detail.to.view.attr('data-section'));
		}
	}
};

UI.event.addCustomEventListener('poppyDidShow', UI.Settings.events.poppyDidShow);
UI.event.addCustomEventListener('elementWasAdded', UI.Settings.events.elementWasAdded);
UI.event.addCustomEventListener('viewWillSwitch', UI.Settings.events.viewWillSwitch);

document.addEventListener('DOMContentLoaded', UI.Settings.init, true);

Template.load('settings');
