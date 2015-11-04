/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var Expando = {
	init: function () {
		$(document)
			.on('click', '*[data-expander]:not(.keep-expanded) .header-expander-label', Expando.events.labelWasClicked);
	},

	toggleGroupByHeader: function (header) {
		var groupWrapper = header.next(),
				group = $('> *:first-child', groupWrapper);

		if (group.is(':animated'))
			return;

		var groupWrapperHeight = groupWrapper.outerHeight(true),
				isCollapsed = header.hasClass('group-collapsed'),
				expandingClass = isCollapsed ? 'group-expanding' : 'group-collapsing';

		header.addClass(expandingClass);

		if (!header.hasClass('temporary-expand'))
			Settings.setItem('expander', !isCollapsed, header.attr('data-expander'));

		groupWrapper.show();

		if (isCollapsed) {
			header.removeClass('group-collapsed');

			var view = header.parents('.ui-view-container:first');

			if (view.length) {
				var offset = groupWrapper.offset(),
						viewOffset = view.offset(),
						bottom = offset.top + groupWrapperHeight;

				if (bottom > view.height() + viewOffset.top)
					view.animate({
						scrollTop: '+=' + (bottom - view.height() - viewOffset.top)
					}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad');
			}
		}

		group
			.css({
				marginTop: isCollapsed ? -groupWrapperHeight : 0,
				opacity: isCollapsed ? 0.3 : 1
			})
			.animate({
				marginTop: isCollapsed ? 0 : -groupWrapperHeight,
				opacity: isCollapsed ? 1 : 0.3
			}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad', function () {
				header.removeClass(expandingClass);

				if (!isCollapsed)
					header.addClass('group-collapsed');

				groupWrapper.css('display', '');

				group.css({
					marginTop: 0,
					opacity: 1
				});

				// Utilities.Element.repaint(document.documentElement);
			});
	},

	events: {
		labelWasClicked: function () {
			Expando.toggleGroupByHeader($(this.parentNode.parentNode));
		},

		elementWasAdded: function (event) {
			if (event.detail.querySelectorAll) {
				var expander,
						keepExpanded,
						headerWrapper,
						header,
						headerLabel;

				var headers = event.detail.querySelectorAll('*[data-expander]'),
						showExpanderLabels = Settings.getItem('showExpanderLabels');

				for (var i = headers.length; i--;) {
					if (headers[i].classList.contains('header-expander-ready'))
						continue;

					headerWrapper = $(headers[i]);

					expander = headers[i].getAttribute('data-expander');
					keepExpanded = expander === '0';

					headers[i].classList.add('header-expander-ready');

					header =
						headerWrapper
							.toggleClass('keep-expanded', keepExpanded)
							.toggleClass('show-label', showExpanderLabels)
							.toggleClass('group-collapsed', !keepExpanded && !!Settings.getItem('expander', expander))
							.find('> *');

					headerLabel =
						$('<span class="header-expander-label"></span>')
							.attr({
								'data-i18n-show': _('expander.show'),
								'data-i18n-hide': _('expander.hide')
							})
							.appendTo(header);

					headerWrapper
						.next()
						.wrapAll('<div class="collapsible-group-wrapper"></div>');

					UI
						.executeLessScript('lighten(' + header.css('color') + ', 20%)')
						.then((function (headerLabel, value) {
							headerLabel.css('color', value);
						}).bind(null, headerLabel));
				}
			}
		}
	}
};

Expando.init();

UI.event.addCustomEventListener('elementWasAdded', Expando.events.elementWasAdded);
