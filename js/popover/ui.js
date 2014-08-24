"use strict";

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,

	__renderPage: function (page) {
		if (!Popover.visible())
			return;

		var tree = page.tree();

		$('#main').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a><br/><pre>' + JSON.stringify(tree, null, 1)._escapeHTML() + '</pre>');
	},

	init: function () {
		var i18n,
				i18nArgs,
				localized,
				attribute;

		$('*[data-i18n]').each(function (index) {
			attribute = null;
			i18n = this.getAttribute('data-i18n');
			i18nArgs = this.getAttribute('data-i18n-args');
			localized = _(i18n, i18nArgs ? JSON.parse(i18nArgs) : null);

			if (this.type === 'search')
				attribute = 'placeholder';
			else if (this.nodeName === 'INPUT')
				attribute = 'value';
			else if (this.nodeName === 'OPTGROUP')
				attribute = 'label';
			else
				attribute = 'innerHTML';

			if (attribute)
				this[attribute] = localized;
		});
	},
	
	clear: function () {
		$('#main').html('<a href="' + ExtensionURL('settings.html') + '">SETTINGS</a>');
	},

	renderPage: Utilities.throttle(function (page) {
		UI.__renderPage(page);
	}, 50, null, true),

	events: {
		openedPopover: function () {
			UI.clear();
		}
	}
};

globalPage.UI = UI;

Events.addApplicationListener('popover', UI.events.openedPopover);

document.addEventListener('DOMContentLoaded', UI.init, true);
