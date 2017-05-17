/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Expando = {
	init: function () {
		$(document)
			.on('click', '*[data-expander]:not(.keep-expanded) .header-expander-label', Expando.events.labelWasClicked);
	},

	toggleGroupByHeader: function (header) {
		var groupWrapper = header.next(),
			group = groupWrapper.children(':first-child');

		if (group.is(':animated'))
			return;

		var maxGroupWrapperHeight = UI.container.height(),
			groupWrapperHeight = groupWrapper.outerHeight(true),
			isTooLarge = groupWrapperHeight > maxGroupWrapperHeight,
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
					viewHeight = view.height(),
					bottom = offset.top + (isTooLarge ? maxGroupWrapperHeight : groupWrapperHeight);

				if (bottom > (viewHeight + viewOffset.top) && header.attr('data-noScroll') !== '1')
					Utilities.setImmediateTimeout(function (view, bottom, viewHeight, viewOffset, header) {
						view.animate({
							scrollTop: '+=' + (isTooLarge ? (header.offset().top - viewOffset.top - 5) : (bottom - viewHeight - viewOffset.top))
						}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad');
					}, [view, bottom, viewHeight, viewOffset, header]);
			}
		}

		group
			.css({
				marginTop: isCollapsed ? (isTooLarge ? -maxGroupWrapperHeight : -groupWrapperHeight) : 0,
				opacity: isCollapsed ? 0.2 : 1,
				height: isTooLarge ? maxGroupWrapperHeight : 'auto',
				overflow: 'hidden'
			})
			.animate({
				marginTop: isCollapsed ? 0 : (isTooLarge ? -maxGroupWrapperHeight : -groupWrapperHeight),
				opacity: isCollapsed ? 1 : 0.2
			}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad', function () {
				header.removeClass(expandingClass);

				if (!isCollapsed)
					header.addClass('group-collapsed');

				groupWrapper.css('display', '');

				group.css({
					marginTop: 0,
					opacity: 1,
					height: 'auto',
					overflow: 'visible'
				});
			});
	},

	events: {
		labelWasClicked: function () {
			Expando.toggleGroupByHeader($(this.parentNode.parentNode));
		},

		rulesChanged: function () {
			Utilities.Timer.timeout('expandoRulesChanged', function () {
				var expander = Settings.__stores.get('expander'),
					expanderCopy = expander.clone('rulesChanged'),
					lists = globalPage.Rules.list,
					listLength = Object.keys(globalPage.Rules.list).filter(function (listName) {
						return !listName._startsWith('$');
					}).length;

				expanderCopy.forEach(function (key) {
					var split = key.split('ruleGroupDomain,');

					if (split[1]) {
						var domain = split[1].split(',')[0];

						if (domain && domain.length) {
							var shouldRemove = 0;

							for (var list in lists) {
								if (list._startsWith('$'))
									continue;

								var found = lists[list].rules.deepFindKey(domain, 2);

								if (!found.store)
									shouldRemove++;
							}

							if (shouldRemove === listLength)
								Settings.removeItem('expander', key);
						}
					}
				});
			}, 3000);
		},

		elementWasAdded: function (event) {
			if (event.detail.querySelectorAll) {
				var expander,
					keepExpanded,
					headerWrapper,
					header,
					headerLabel,
					expandedState;

				var setHeaderColor = function (header, headerLabel) {
					UI
						.executeLessScript('lighten(' + (header.css('color') || 'red') + ', 20%)')
						.then((function (headerLabel, value) {
							headerLabel.css('color', value);
						}).bind(null, headerLabel), function () {
							LogError('Error assigning color to header', header, header.css('color'));
						});
				};

				var headers = event.detail.querySelectorAll('*[data-expander]:not(.header-expander-ready)'),
					showExpanderLabels = Settings.getItem('showExpanderLabels');

				for (var i = headers.length; i--;) {
					headerWrapper = $(headers[i]);

					expander = headers[i].getAttribute('data-expander');
					keepExpanded = expander === '0';

					headers[i].classList.add('header-expander-ready');

					expandedState = Settings.getItem('expander', expander);

					header =
						headerWrapper
							.toggleClass('keep-expanded', keepExpanded)
							.toggleClass('show-label', showExpanderLabels || headers[i].getAttribute('data-showLabel') === '1')
							.toggleClass('group-collapsed', !keepExpanded && (expandedState === undefined ? headers[i].getAttribute('data-defaultCollapse') === '1' : expandedState))
							.children();

					headerLabel =
						$('<span class="header-expander-label"></span>')
							.attr({
								'data-i18n-show': _('expander.show'),
								'data-i18n-hide': _('expander.hide')
							});

					header.append(headerLabel);

					headerWrapper
						.next()
						.wrapAll('<div class="collapsible-group-wrapper"></div>');

					if (headers.length > 100)
						setTimeout(setHeaderColor, 5 * i, header, headerLabel);
					else
						setHeaderColor(header, headerLabel);
				}
			}
		}
	}
};

Expando.init();

globalPage.Rule.event.addCustomEventListener(['rulesWereCleared', 'ruleWasAdded', 'ruleWasRemoved', 'manyRulesAdded'], Expando.events.rulesChanged);
UI.event.addCustomEventListener('elementWasAdded', Expando.events.elementWasAdded);
