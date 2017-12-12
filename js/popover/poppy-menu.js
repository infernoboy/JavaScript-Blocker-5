/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

Poppy.Menu = {
	__poppy: null,

	event: new EventListener,
	forceClick: new ForceClickElement(document, '*[data-poppyMenu]'),
	pressAndHold: new PressAndHoldElement(document, '*[data-poppyMenu]', true),

	init: function () {
		Poppy.Menu.pressAndHold.successPreventsClick();

		Poppy.Menu.pressAndHold.event
			.addCustomEventListener('resolve', function (event) {
				Poppy.Menu.show(event.detail.event.currentTarget.querySelector('.poppy-menu-target'), event.detail.event);

				if (!event.detail.data && Poppy.Menu.__poppy)
					Poppy.Menu.__poppy.cancelScaleWithForce();
			});

		Poppy.Menu.forceClick
			.setThreshold(0.5)
			.modifyNormalizedForce(0, 0.85, 0.1);

		Poppy.Menu.forceClick.event
			.addCustomEventListener('firstForceChange', function () {
				Poppy.Menu.pressAndHold.now(true);
			})

			.addCustomEventListener(['forceClickCancelled', 'forceDown', 'forceUp'], function (event) {
				if (!Poppy.Menu.__poppy)
					return;

				if (event.type !== 'forceClickCancelled')
					Poppy.Menu.__poppy.cancelScaleWithForce();
			})

			.addCustomEventListener('forceDown', function () {
				if (!Poppy.Menu.__poppy)
					return;

				Poppy.Menu.__poppy.cancelScaleWithForce();
			})

			.addCustomEventListener('forceClickCancelled', function (event) {
				if (!Poppy.Menu.__poppy)
					return;

				Poppy.Menu.__poppy.close(null, !event.detail.cancelledBelowStartThreshold || Poppy.Menu.forceClick.normalizedForce);
			});
	},

	show: function (element, event) {
		var self = $(element),
			menuHolder = self.parents('*[data-poppyMenu]'),
			poppyName = menuHolder.attr('data-poppyMenu');

		if (!poppyName)
			return;

		var preventDefault = Poppy.Menu.event.trigger('poppyMenuWillShow', {
			target: self,
			menuHolder: menuHolder
		});

		if (preventDefault)
			return;

		event.stopPropagation();

		Poppy.closeAll();

		var poppy = new Poppy(event.pageX, event.pageY, true, poppyName);

		Poppy.Menu.__poppy = poppy;

		poppy.scaleWithForce(Poppy.Menu.forceClick);

		Poppy.event
			.addCustomEventListener('poppyIsFullyShown', function () {
				poppy.cancelScaleWithForce();
			}, true)

			.addCustomEventListener('poppyWillClose', function (event) {
				if (event.detail === poppy) {
					event.unbind();

					Poppy.Menu.__poppy = undefined;
				}
			});

		poppy.poppy.attr('data-poppyMenuMeta', menuHolder.attr('data-poppyMenuMeta'));

		poppy
			.setContent(Template.create('poppy', poppyName, {
				poppy: poppy.poppy
			}))
			.stayOpenOnScroll();

		poppy.show();
	},

	events: {
		elementWasAdded: function (event) {
			if (!event.detail.querySelectorAll)
				return;

			var poppyTargets = event.detail.querySelectorAll('.poppy-menu-target:not(.poppy-menu-target-ready)');

			for (var i = poppyTargets.length; i--;) {
				poppyTargets[i].classList.add('poppy-menu-target-ready');

				$('<span class="poppy-menu-divider" aria-hidden="true">&nbsp;</span>').appendTo($(poppyTargets[i]));

				$(poppyTargets[i]).click(function (event) {
					var self = $(event.currentTarget),
						menuHolder = self.parents('*[data-poppyMenu]'),
						poppyName = menuHolder.attr('data-poppyMenu');

					if (Poppy.poppyWithScriptNameExist(poppyName))
						return event.stopImmediatePropagation();

					var width = self.outerWidth(),
						offset = self.offset().left,
						rightOffset = offset + width,
						inRange = (event.pageX > rightOffset - 12 && event.pageX < rightOffset);

					if (inRange) {
						event.stopImmediatePropagation();

						Poppy.Menu.show(this, event);
					}
				});
			}
		}
	}
};

Poppy.Menu.init();

UI.event.addCustomEventListener('elementWasAdded', Poppy.Menu.events.elementWasAdded);
