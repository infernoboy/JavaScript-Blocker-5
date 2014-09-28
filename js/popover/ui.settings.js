"use strict";

UI.Settings = {
	init: function () {
		UI.Settings.view = $('#setting-view', UI.view.views);

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
			viewSwitcherData.views['#setting-view-' + sections[i]] = {
				value: _('settings.' + sections[i])
			};

		UI.Settings.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Settings.viewSwitcher = $('.view-switcher', UI.Settings.view);

		for (var i = 0; i < sections.length; i++)
			UI.Settings.createView(sections[i], _('settings.' + sections[i]));

		UI.Settings.events.viewSwitcher();

		UI.event.addCustomEventListener('poppyDidShow', function () {
			UI.Settings.viewContainer.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
		});

		try {
			UI.view.switchTo(UI.Settings.viewSwitcher, Settings.getItem('settingCurrentView'));
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

	events: {
		viewSwitcher: function () {
			UI.Settings.viewSwitcher.on('click', 'li', function (event) {
				UI.view.switchTo(UI.Settings.viewSwitcher, this.getAttribute('data-view'));

				Settings.setItem('settingCurrentView', this.getAttribute('data-view'));
			});
		}
	}
};

document.addEventListener('DOMContentLoaded', UI.Settings.init, true);

Template.load('settings');
