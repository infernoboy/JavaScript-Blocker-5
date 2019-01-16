/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

UI.Help = {
	__sections: ['contact', 'faq', 'about', 'privacy'],

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

		for (i = 0; i < UI.Help.__sections.length; i++) {
			UI.view.create('help-views', UI.Help.__sections[i], UI.Help.views);

			$('#help-views-' + UI.Help.__sections[i], UI.Help.views).append(Template.create('help', 'help-' + UI.Help.__sections[i]));
		}

		UI.view.switchTo('#help-views-contact');
	},

	FAQ: {
		__sections: ['general', 'page', 'rules', 'settings'],

		init: function () {
			UI.Help.FAQ.view = $('#help-views-faq', UI.view.views);

			UI.Help.FAQ.view.append(Template.create('help', 'help-faq-container'));

			UI.Help.FAQ.toolbar = $('#help-faq-toolbar', UI.Help.view);
			UI.Help.FAQ.views = $('#help-faq-views-container', UI.Help.view);

			var viewSwitcherData = {
				id: 'help-faq-views-switcher',
				container: '#help-faq-views-container',
				views: {}
			};

			for (var i = 0; i < UI.Help.FAQ.__sections.length; i++)
				viewSwitcherData.views['#help-faq-views-' + UI.Help.FAQ.__sections[i]] = {
					value: _('help.faq.' + UI.Help.FAQ.__sections[i])
				};

			UI.Help.FAQ.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

			UI.Help.FAQ.viewSwitcher = $('.view-switcher', UI.Help.FAQ.view);

			for (i = 0; i < UI.Help.FAQ.__sections.length; i++) {
				UI.view.create('help-faq-views', UI.Help.FAQ.__sections[i], UI.Help.FAQ.views);

				$('#help-faq-views-' + UI.Help.FAQ.__sections[i], UI.Help.FAQ.views).append(Template.create('help', 'help-faq-' + UI.Help.FAQ.__sections[i]));
			}

			$('.help-questions header', UI.Help.FAQ.views)
				.addClass('group-collapsed temporary-expand')
				.attr('data-expander', 1);

			UI.Help.FAQ.views
				.on('click', '.help-questions-show-all, .help-questions-hide-all', function () {
					$('.help-questions header', UI.Help.FAQ.views).toggleClass('group-collapsed', this.className._contains('hide'));
				});

			setTimeout(function () {
				$('.group-collapsed', UI.Help.FAQ.views).removeClass('group-collapsed');
			});

			UI.view.switchTo('#help-faq-views-page');
		}
	},

	events: {
		viewWillSwitch: function (event) {
			if (event.detail.to.id === '#main-views-help') {
				// event.preventDefault();

				// Tabs.create('mailto:helpme@toggleable.com?subject=I need help with JSB5&body=Please thoroughly describe the problem you are having. Include screenshots if you think it will help.', true);
				// Tabs.create(ExtensionURL('help/index.html'));
			}
		}
	}
};

UI.event.addCustomEventListener('viewWillSwitch', UI.Help.events.viewWillSwitch);

document.addEventListener('DOMContentLoaded', UI.Help.init, true);
document.addEventListener('DOMContentLoaded', UI.Help.FAQ.init, true);
