"use strict";

var SettingsUI = {
	section: {},
	toolbarItem: {},

	createSection: function (sectionID, sectionName, toolbarHTML) {
		var toolbarItem = Template.create('settings', 'toolbar-item', {
			sectionID: sectionID,
			sectionName: sectionName,
			toolbarHTML: toolbarHTML
		});

		SettingsUI.$toolbar.append(toolbarItem);

		var section = Template.create('settings', 'section', {
			sectionID: sectionID
		});

		section.html('This is section ' + sectionName);

		SettingsUI.$sections.append(section);

		this.section[sectionID] = section;
		this.toolbarItem[sectionID] = toolbarItem;

		section.data({
			id: sectionID,
			name: sectionName,
			toolbarItem: toolbarItem
		});

		toolbarItem.data('section', section);
	},

	view: {
		switchTo: function (section) {
			if (!section.is('section'))
				throw new TypeError('section is not a section.');

			Settings.setItem('settingsPageCurrentSection', section.data('id'));

			section.show();

			$('section', SettingsUI.$sections).not(section).hide();

			return Promise.resolve(section);
		}
	},

	events: {
		activateToolbar: function () {
			SettingsUI.$toolbar.on('click', 'li', function (event) {
				SettingsUI.view.switchTo($(this).data('section'));
			});
		},

		performSearch: function (event) {
			SettingsUI.view.switchTo(SettingsUI.section.search).then(function (section) {
				Log('SEARCH', section)
			})
		}
	}
};

$(function () {
	SettingsUI.$toolbar = $('#toolbar');
	SettingsUI.$sections = $('#sections');

	SettingsUI.events.activateToolbar();

	for (var section in Settings.settings) {
		if (section._startsWith('__'))
			continue;

		SettingsUI.createSection(section, _('settings.' + section));
	}

	SettingsUI.createSection('search', _('settings.search'), '<input id="toolbar-search" type="search" incremental="incremental" />');

	SettingsUI.toolbarItem.search
		.on('click', null, SettingsUI.events.performSearch)
		.on('search', 'input', SettingsUI.events.performSearch);

	SettingsUI.view.switchTo(
		SettingsUI.section[window.location.hash.substr(1)] ||
		SettingsUI.section[Settings.getItem('settingsPageCurrentSection')] ||
		$('.standard-section:first', SettingsUI.$sections)
	);
});

Template.load('settings');
