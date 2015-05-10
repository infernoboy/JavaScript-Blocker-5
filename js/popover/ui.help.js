"use strict";

UI.Help = {
	__sections: ['page', 'faq'],

	init: function () {
		UI.Help.view = $('#main-views-help', UI.view.views);

		UI.Help.view.append(Template.create('help', 'help-container'));

		UI.Help.toolbar = $('#help-toolbar', UI.Help.view);
		UI.Help.views = $('#help-views-container', UI.Help.view);

		var viewSwitcherData = {
			id: 'help-views-switcher',
			container: '#help-views-container',
			views: {}
		};

		for (var i = 0; i < UI.Help.__sections.length; i++)
			viewSwitcherData.views['#help-views-' + UI.Help.__sections[i]] = {
				value: _('help.' + UI.Help.__sections[i])
			};

		UI.Help.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Help.viewSwitcher = $('.view-switcher', UI.Help.view);

		for (var i = 0; i < UI.Help.__sections.length; i++) {
			UI.view.create('help-views', UI.Help.__sections[i], UI.Help.views);

			$('#help-views-' + UI.Help.__sections[i], UI.Help.views).append(Template.create('help', 'help-' + UI.Help.__sections[i]));
		}

		$('.help-questions header', UI.Help.views)
			.addClass('group-collapsed temporary-expand')
			.attr('data-expander', 1);

		UI.Help.views
			.on('click', '.help-questions-show-all, .help-questions-hide-all', function () {
				$('.help-questions header', UI.Help.views).toggleClass('group-collapsed', this.className._contains('hide'));
			});

		UI.view.switchTo('#help-views-page');
	},

	events: {
		viewWillSwitch: function (event) {
			if (event.detail.to.id === '#main-views-help') {
				event.preventDefault();

				Tabs.create('mailto:helpme@toggleable.com?subject=I need help with JSB5&body=Please thoroughly describe the problem you are having. Include screenshots if you think it will help.', true);
				// Tabs.create(ExtensionURL('help/index.html'));
			}
		}
	}
};

UI.event.addCustomEventListener('viewWillSwitch', UI.Help.events.viewWillSwitch);

document.addEventListener('DOMContentLoaded', UI.Help.init, true);
