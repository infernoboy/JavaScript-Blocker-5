/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var SplitView = {
	COLLAPSE_WIDTH: 120,
	MIN_WIDTH: 1.5,

	Divider: function () {
		this.elementEvents = {
			mousedown: function () {
				event.preventDefault();

				UI.drag = this;

				this.classList.add('dragging');

				document.documentElement.setAttribute('data-cursor', 'col-resize');
			},

			dblclick: function (_, event) {
				var splitView = $(event.currentTarget).parents('.split-view');

				SplitView.resizeTo(0.5, $(event.currentTarget).parents('.split-view')[0]);

				SplitView.Divider.events.dragEnd(null, splitView);
			}
		};

		this.super();
	}._extends(MagicBinder),

	init: function () {
		$(window)
			.on('mousemove', function () {
				if (UI.drag && UI.drag.classList.contains('split-view-divider')) {
					var target = $(UI.drag).parent();

					SplitView.resizeTo((event.pageX - target.offset().left) / target.outerWidth(), target[0], { noAnimation: true });
				}
			});

		new SplitView.Divider('body', '.split-view-divider');

		SplitView.events.elementWasAdded({
			detail: document.body
		});
	},
	
	resizeTo: function (leftColumnWidth, splitViewElement, $$ /* ? noAnimation: Bool, isInitialResize: Bool */) {
		if (!$$) $$ = {};

		if (!$(splitViewElement).is(':visible')) {
			splitViewElement.style.opacity = 0;

			return Utilities.Timer.timeout(splitViewElement, function () {
				if (SplitView.resizeTo.apply(null, arguments) === true)
					SplitView.Divider.events.dragEnd(null, arguments[1]);
			}, 100, Utilities.makeArray(arguments));
		}

		var splitViewName = splitViewElement.getAttribute('data-splitView'),
			canCollapse = !splitViewElement.classList.contains('split-view-fixed');

		splitViewElement.style.opacity = 1;

		if (splitViewName && !$$.isInitialResize)
			Utilities.Timer.timeout('splitView-' + splitViewName, function (leftColumnWidth, splitViewName) {
				Settings.setItem('splitView', leftColumnWidth, splitViewName);
			}, 100, [leftColumnWidth, splitViewName]);

		leftColumnWidth = Math.min(100 - SplitView.MIN_WIDTH, Math.max(SplitView.MIN_WIDTH, leftColumnWidth * 100));

		var divider = $('.split-view-divider', splitViewElement),
			splitViewLeft = $('.split-view-left', splitViewElement),
			splitViewRight = $('.split-view-right', splitViewElement);				

		if ($$.noAnimation)
			divider.addClass('dragging');
		
		if ($$.isInitialResize) {
			splitViewElement.classList.add('no-animation');

			setTimeout(function (splitViewElement) {
				splitViewElement.classList.remove('no-animation');
			}, 100, splitViewElement);
		}

		divider.css('left', leftColumnWidth + '%');

		splitViewLeft
			.css('-webkit-flex-basis', leftColumnWidth + '%')
			.add(splitViewRight)
			.removeClass('collapsed');

		splitViewLeft
			.toggleClass('collapses', (canCollapse && $$.noAnimation) ? splitViewLeft.outerWidth() <= SplitView.COLLAPSE_WIDTH : false);

		splitViewRight
			.toggleClass('collapses', (canCollapse && $$.noAnimation) ? splitViewRight.outerWidth() <= SplitView.COLLAPSE_WIDTH : false);

		return true;
	},

	events: {
		elementWasAdded: function (event) {
			if (!event.detail.querySelectorAll)
				return;

			var splitViewName,
				splitViewSize;

			var splitViewElements = event.detail.classList.contains('split-view') ? [event.detail] : event.detail.querySelectorAll('.split-view:not(.split-view-ready)');

			for (var i = splitViewElements.length; i--;) {
				if (splitViewElements[i].classList.contains('split-view-ready'))
					continue;

				splitViewElements[i].classList.add('split-view-ready');

				splitViewName = splitViewElements[i].getAttribute('data-splitView');

				if (!splitViewElements[i].classList.contains('split-view-fixed')) {
					$('<div class="split-view-divider">')
						.attr('title', _('double_click_split'))
						.prependTo(splitViewElements[i]);

					$('.split-view-left, .split-view-right', splitViewElements[i]).prepend($('<div class="split-view-will-collapse">'));

					splitViewSize = splitViewName ? Settings.getItem('splitView', splitViewName) : null;
				} else
					splitViewSize = null;

				if (!splitViewSize)
					splitViewSize = parseFloat(splitViewElements[i].getAttribute('data-splitViewSize') || 0.5, 10);

				if (SplitView.resizeTo(splitViewSize, splitViewElements[i], { noAnimation: true, isInitialResize: true }) === true)
					SplitView.Divider.events.dragEnd(null, splitViewElements[i]);
			}
		}
	},
};

SplitView.Divider.events = {
	dragEnd: function (_, event) {
		var splitViews = (event && event.classList) ? $(event) : $('.split-view');

		splitViews.each(function () {
			var divider = $('.split-view-divider', this),
				splitViewLeft = $('.split-view-left', this),
				splitViewRight = $('.split-view-right', this),
				leftCollapses = splitViewLeft.hasClass('collapses'),
				rightCollapses = splitViewRight.hasClass('collapses');

			if (leftCollapses || rightCollapses) {
				divider.css('left', (leftCollapses ? SplitView.MIN_WIDTH : 100 - SplitView.MIN_WIDTH) + '%');

				splitViewLeft
					.css('-webkit-flex-basis', (leftCollapses ? SplitView.MIN_WIDTH : 100 - SplitView.MIN_WIDTH) + '%')
					.toggleClass('collapsed', leftCollapses);

				splitViewRight.toggleClass('collapsed', rightCollapses);
			}

			if (event === true)
				setTimeout(function (divider) {
					divider.removeClass('dragging');
				}, 1000, divider);
			else if (!UI.drag)
				divider.removeClass('dragging');
		});
	}
};

document.addEventListener('DOMContentLoaded', SplitView.init, true);

UI.event.addCustomEventListener('dragEnd', SplitView.Divider.events.dragEnd);
UI.event.addCustomEventListener('elementWasAdded', SplitView.events.elementWasAdded);
