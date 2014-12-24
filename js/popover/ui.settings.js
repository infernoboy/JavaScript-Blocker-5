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

		UI.event
			.addCustomEventListener('poppyDidShow', function () {
				UI.Settings.viewContainer.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
			})

			.addCustomEventListener('elementWasAdded', function (event) {
				if (event.detail.querySelectorAll)
					UI.Settings.bindInlineSettings(event.detail.querySelectorAll('*[data-inlineSetting]'));
			})

		try {
			UI.view.switchTo(Settings.getItem('settingCurrentView'));
		} catch (error) {
			LogError('failed to switch to setting view');
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
					settingRef = Settings.map[settingName],
					currentValue = Settings.getItem(settingName);

			if (settingRef.props.options) {
				switch (settingRef.props.type) {
					case 'number':
						var options = $('option', element);

						for (var b = options.length; b--;) 
							if (parseInt(options[b].value, 10) === currentValue) {
								element[0].selectedIndex = b;

								break;
							}

						element.change(function () {
							Settings.setItem(this.getAttribute('data-inlineSetting'), parseInt(this.value, 10));
						});
					break;
				}
			} else {
				switch (settingRef.props.type) {
					case 'boolean':
						element
							.prop('checked', currentValue)
							.change(function () {
								Settings.setItem(this.getAttribute('data-inlineSetting'), this.checked);
							});
					break;
				}
			}
		}
	},

	events: {
		viewSwitcher: function () {
			UI.Settings.viewSwitcher
				.on('click', 'li', function (event) {
					UI.view.switchTo(this.getAttribute('data-view'));

					Settings.setItem('settingCurrentView', this.getAttribute('data-view'));
				});
		}
	}
};

document.addEventListener('DOMContentLoaded', UI.Settings.init, true);

Template.load('settings');
