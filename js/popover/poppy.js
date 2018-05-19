/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

(function () {
	var poppies = {};

	window.Poppy = function Poppy (x, y, closeExisting, scriptName) {
		if (typeof x !== 'number' || typeof y !== 'number') {
			console.trace();
			throw new TypeError('x or y is not a number');
		}

		if (closeExisting)
			window.Poppy.closeAll();

		this.userPosition = {
			x: x,
			y: y
		};

		this.changePosition(x, y, true);

		this.id = Utilities.Token.generate();
		this.displayed = false;
		this.willMoveWithView = false;
		this.willRemoveOnScroll = true;
		this.isUpArrow = false;
		this.noArrow = false;
		this.scriptName = scriptName;

		this.poppy = Template.create('poppy', 'poppy', {
			id: this.id
		});

		this.zIndex = window.Poppy.__zIndex++;

		this.poppy.css('z-index', this.zIndex);

		this.content = $('.poppy-content', this.poppy);
		this.arrow = $('.poppy-arrow', this.poppy);
		this.arrowSettings = $('.poppy-arrow-settings', this.poppy);
		this.arrowSettingsUp = $('.poppy-arrow-settings-up', this.poppy);

		poppies[this.id] = this;

		this.__viewDidScroll = this.__viewDidScroll.bind(this);
		this.__scaleWithForce = Utilities.throttle(this.__scaleWithForce.bind(this), 1, true);
		this.__firstForceChange = this.__firstForceChange.bind(this);
		this.close = this.close.bind(this);
		this.cancelScaleWithForce = this.cancelScaleWithForce.bind(this);

		this.poppy.on('click', '.poppy-close', this.close);
	};

	Poppy = Poppy._extendClass(EventListener);

	Poppy.__offset = -4;
	Poppy.__zIndex = 700;
	Poppy.__creating = false;

	Poppy.event = new EventListener;
	Poppy.scripts = {};

	Poppy.setAllPositions = function () {
		for (var poppyID in poppies)
			poppies[poppyID].setPosition();
	};

	Poppy.poppyExist = function () {
		return !poppies._isEmpty();
	};

	Poppy.poppyDisplayed = function () {
		return $('.poppy-displayed', Poppy.__container).length > 0;
	};

	Poppy.poppyWithScriptNameExist = function (scriptName) {
		for (var poppyID in poppies)
			if (poppies[poppyID].scriptName === scriptName)
				return true;

		return false;
	};

	Poppy.preventNextCloseAll = function () {
		Poppy.__preventNextCloseAll = true;
	};

	Poppy.closeAll = function (eventOrImmediate, isPopoverOpen) {
		if (Poppy.event.trigger('poppyWillCloseAll'))
			return Promise.all([]);

		var promiseArray = [];

		for (var poppyID in poppies) {
			if ((isPopoverOpen && poppies[poppyID].staysOpenOnPopoverOpen) || (eventOrImmediate && eventOrImmediate.type === 'scroll' && !poppies[poppyID].willRemoveOnScroll) || poppies[poppyID].isModal)
				continue;

			promiseArray.push(poppies[poppyID].close(eventOrImmediate));
		}

		return Promise.all(promiseArray);
	};

	Poppy.closeModal = function () {
		if (Poppy.modalOpen) {
			Poppy.modalOpen = false;

			Poppy.__modal.stop(true).fadeOut(130 * window.globalSetting.speedMultiplier, 'easeOutQuad');

			Poppy.event.trigger('poppyModalClosed');

			for (var poppyID in poppies)
				poppies[poppyID].poppy.removeClass('poppy-blur');
		}
	};

	Poppy.closeLinksTo = function (poppy) {
		var linkTree;

		var promiseArray = [];

		for (var poppyID in poppies) {
			linkTree = poppies[poppyID].linkTree();

			if (linkTree._contains(poppy.id))
				promiseArray.push(poppies[poppyID].close());
		}

		return Promise.all(promiseArray);
	};

	Poppy.createArrow = function (poppy) {
		var	arrowStyle = window.getComputedStyle(poppy.isUpArrow ? poppy.arrowSettingsUp[0] : poppy.arrowSettings[0]),
			shadowColor = 'rgba(1, 0, 1, ' + (Settings.getItem('darkMode') ? 1 : 0.26) + ')',
			arrowBackgroundColor = arrowStyle.backgroundColor,
			arrowContext = document.getCSSCanvasContext('2d', poppy.isUpArrow ? 'poppy-arrow-up' : 'poppy-arrow', 30, 20);

		arrowContext.clearRect(0, 0, 30, 20);

		arrowContext.shadowOffsetX = 0;
		arrowContext.shadowOffsetY = poppy.isUpArrow ? -1 : 1;
		arrowContext.shadowBlur = 6;
		arrowContext.shadowColor = shadowColor;
		arrowContext.fillStyle = arrowBackgroundColor;

		if (poppy.isUpArrow) {
			arrowContext.beginPath();
			arrowContext.moveTo(3, 20);
			arrowContext.lineTo(15, 9);
			arrowContext.lineTo(27, 20);
			arrowContext.closePath();
			arrowContext.fill();
		} else {
			arrowContext.beginPath();
			arrowContext.moveTo(3, 0);
			arrowContext.lineTo(15 ,11);
			arrowContext.lineTo(27, 0);
			arrowContext.closePath();
			arrowContext.fill();
		}
	};

	Poppy.createLoadingPoppy = function (x, y, closeExisting, onFullyShown) {
		var loadingPoppy = new Poppy(x, y, closeExisting);

		Poppy.event.addCustomEventListener('poppyIsFullyShown', function (event) {
			if (event.detail === loadingPoppy) {
				event.unbind();
				
				if (typeof onFullyShown === 'function')
					onFullyShown(loadingPoppy);
			}
		});

		return loadingPoppy;
	};

	Poppy.prototype.__firstForceChange = function () {
		if (this.poppy.hasClass('poppy-fully-shown'))
			return;

		this.poppy.removeClass('poppy-open').addClass('poppy-did-scale-with-force').css({
			'opacity': 0
		});
	};

	Poppy.prototype.__scaleWithForce = function (event) {
		if (this.poppy.hasClass('poppy-fully-shown'))
			return;

		this.poppy.removeClass('poppy-open').addClass('poppy-did-scale-with-force').css({
			'-webkit-transform': 'scale(' + event.detail.quadForce + ')',
			'opacity': event.detail.quadForce < 0.11 ? 0 : event.detail.quadForce + 0.4
		});
	};

	Poppy.prototype.__viewDidScroll = function () {
		var scrollTop = this.view.scrollTop(),
			scrollLeft = this.view.scrollLeft();

		this.originalPosition.y -= scrollTop - this.lastScroll.top;
		this.originalPosition.x -= scrollLeft - this.lastScroll.left;

		this.lastScroll = {
			top: scrollTop,
			left: scrollLeft
		};

		this.setPosition();
	};

	Poppy.prototype.linkToOpenPoppy = function () {
		for (var poppyID in poppies)
			if (poppies[poppyID].displayed && !poppies[poppyID].closed && !poppies[poppyID].reverseLink && poppies[poppyID] !== this && poppies[poppyID].reverseLink !== this) {
				this.linkTo(poppies[poppyID]);

				break;
			}

		return this;
	};

	Poppy.prototype.shake = function () {
		this.poppy.shake();
		this.arrow.shake(true);
	};

	Poppy.prototype.changePosition = function (x, y, noSetPosition) {
		if (Utilities.isFloat(x))
			x = window.Poppy.__container.outerWidth() * x;

		if (Utilities.isFloat(y))
			y = window.Poppy.__container.outerHeight() * y;

		this.originalPosition = {
			x: x,
			y: y
		};

		if (!noSetPosition)
			this.setPosition(true);

		return this;
	};

	Poppy.prototype.setPosition = function (canHideCloseButton) {
		this.poppy.show();
		
		this.position = Object._copy(this.originalPosition);

		this.isUpArrow = false;
		this.noArrow = false;

		this.poppy.removeClass('poppy-up poppy-no-arrow');

		this.content.width('');

		var defaultArrowHeight = this.arrow.height();

		var position = {
			arrow: {
				left: 0,
				bottom: -defaultArrowHeight,
				top: 'auto'
			},

			poppy: {
				left: 0,
				bottom: Math.max(defaultArrowHeight + Poppy.__offset, (Poppy.__container.height() - this.position.y) + defaultArrowHeight + Poppy.__offset),
				top: 'auto'
			}
		};

		this.poppy.css(position.poppy);
		this.arrow.css(position.arrow);

		this.content.width(this.content.width() + 1); // Prevents annoying Safari rounding

		var poppyAndContent = this.poppy.find(this.content).addBack();

		poppyAndContent.css('height', '');

		var containerWidth = Poppy.__container.width(),
			containerHeight = Poppy.__container.height(),
			poppyWidth = this.poppy.outerWidth(),
			poppyHeight = this.poppy.outerHeight(),
			halfArrowWidth = Math.floor(this.arrow.outerWidth() / 2),
			arrowHeight = this.arrow.outerHeight();
				
		if (this.position.x - poppyWidth / 2 <= -Poppy.__offset) { // If overflow on left side
			position.poppy.left = -Poppy.__offset;
			position.arrow.left = this.position.x - halfArrowWidth + Poppy.__offset;
			
			if (position.arrow.left < halfArrowWidth / 2)
				position.arrow.left = 3;

		} else if (this.position.x + poppyWidth / 2 > containerWidth + Poppy.__offset) { // If overflow on right side
			position.poppy.left = containerWidth - poppyWidth + Poppy.__offset;
			position.arrow.left = this.position.x - position.poppy.left - halfArrowWidth;
				
			if (position.arrow.left > poppyWidth - (halfArrowWidth * 2) + Poppy.__offset)
				position.arrow.left = poppyWidth - (halfArrowWidth * 2) - 3;

		} else { // If fits
			position.poppy.left = this.position.x - Math.floor(poppyWidth / 2);
			position.arrow.left = Math.floor(poppyWidth / 2) - halfArrowWidth;
		}

		var currentHeightTotal;

		if (this.position.y - poppyHeight - arrowHeight <= 0)
			if (this.position.y < containerHeight / 2) {
				this.poppy.addClass('poppy-up');

				this.isUpArrow = true;

				position.poppy.bottom = 'auto';
				position.poppy.top = Math.max(arrowHeight + Poppy.__offset, this.position.y + arrowHeight + Poppy.__offset);

				position.arrow.bottom = 'auto';
				position.arrow.top = -arrowHeight;
				
				if (position.poppy.top + poppyHeight + arrowHeight > containerHeight) // If overflow on bottom side
					while ((currentHeightTotal = position.poppy.top + this.poppy.outerHeight() + 5 - Poppy.__offset) > containerHeight) {
						this.noArrow = true;

						if (position.poppy.top > -Poppy.__offset) {
							position.poppy.top--;
							this.position.y--;
						} else {
							poppyAndContent.css('height', '-=' + (currentHeightTotal - containerHeight - 5) + 'px');

							break;
						}
					}
			} else {
				if (poppyHeight + arrowHeight > this.position.y) // If overflow on top side
					while ((currentHeightTotal = this.poppy.outerHeight() + arrowHeight + 5) > this.position.y) {
						this.noArrow = true;

						if (position.poppy.bottom > -Poppy.__offset) {
							position.poppy.bottom--;
							this.position.y++;
						} else {
							poppyAndContent.css('height', '-=' + (currentHeightTotal - this.position.y - 5) + 'px');

							break;
						}
					}
			}

		this.poppy.toggleClass('poppy-no-arrow', this.noArrow);

		if (this.noArrow)
			this.showCloseButton();
		else if (canHideCloseButton)
			this.hideCloseButton();

		this.poppy.css({
			WebkitTransformOriginX: this.noArrow ? 'center' : ((((position.arrow.left + halfArrowWidth) / poppyWidth) * 100) + '%'),
			WebkitTransformOriginY: this.noArrow ? 'center' : ((this.isUpArrow ? -(arrowHeight / 2) : this.poppy.outerHeight() + arrowHeight / 2) + 'px')
		});

		this.poppy.css(position.poppy);
		this.arrow.css(position.arrow);

		Poppy.createArrow(this);

		return this;
	};

	Poppy.prototype.setContent = function (content) {
		this.content.off().empty().append(content);

		if (this.displayed) {
			this.executeScript();

			return this.setPosition();
		}

		return this;
	};

	Poppy.prototype.moveWithView = function (view) {
		if (this.willMoveWithView)
			return this;

		this.view = view;
		this.willMoveWithView = true;
		this.willRemoveOnScroll = false;

		if (this.originalPosition.y < Poppy.__viewOffsetTop)
			return this;

		this.lastScroll = {
			top: view.scrollTop(),
			left: view.scrollLeft()
		};

		view.bind('scroll', this, this.__viewDidScroll);

		return this;
	};

	Poppy.prototype.stayOpenOnPopoverOpen = function () {
		this.staysOpenOnPopoverOpen = true;

		return this;
	};

	Poppy.prototype.stayOpenOnScroll = function () {
		this.willRemoveOnScroll = false;

		return this;
	};

	Poppy.prototype.modal = function (lightModal, closeModal) {
		this.isModal = !closeModal;
		this.isLightModal = !!lightModal;

		if (closeModal)
			Poppy.closeModal();

		return this;
	};

	Poppy.prototype.linkTo = function (poppy) {
		if (!(poppy instanceof Poppy))
			throw new TypeError(poppy + ' is not a Poppy');

		this.linkedTo = poppy;
		poppy.reverseLink = this;

		return this;
	};

	Poppy.prototype.linkTree = function () {
		if (!this.linkedTo)
			return [];

		return [this.linkedTo.id].concat(this.linkedTo.linkTree());
	};

	Poppy.prototype.executeScript = function () {
		if (this.scriptName && window.Poppy.scripts[this.scriptName])
			window.Poppy.scripts[this.scriptName](this);
	};

	Poppy.prototype.showCloseButton = function () {
		this.poppy.addClass('poppy-show-close');

		return this;
	};

	Poppy.prototype.hideCloseButton = function () {
		this.poppy.removeClass('poppy-show-close');

		return this;
	};

	Poppy.prototype.show = function (quick, instant) {
		if (!Popover.visible())
			return UI.event.addCustomEventListener('popoverOpened', function () {
				this.changePosition(this.userPosition.x, this.userPosition.y, true).show(quick, instant);
			}.bind(this), true);

		poppies[this.id] = this;

		if (Poppy.event.trigger('poppyWillShow', this))
			return this;

		if (Poppy.modalOpen)
			this.poppy.addClass('poppy-show-close');

		if (this.isModal) {
			Poppy.modalOpen = true;

			for (var poppyID in poppies)
				if (poppies[poppyID] !== this)
					poppies[poppyID].poppy.addClass('poppy-blur');

			Poppy.__modal.toggleClass('light-modal', this.isLightModal).stop().fadeIn(200 * window.globalSetting.speedMultiplier, 'easeOutQuad').css('z-index', this.zIndex - 1);

			Poppy.event.trigger('poppyModalOpened');
		}

		this.closed = false;

		Poppy.__creating = true;

		this.poppy.hide();

		this.poppy.prependTo(Poppy.__container);

		this.displayed = true;

		this.poppy
			.toggleClass('poppy-open-quick', !!quick)
			.toggleClass('poppy-open-instant', !!instant)
			.addClass('poppy-open poppy-displayed');

		Utilities.setImmediateTimeout(function (self) {
			self.setPosition();

			self.executeScript();
		}, [this]);

		Poppy.event.trigger('poppyDidShow', this);

		Utilities.Timer.timeout('PoppyCreating', function (self) {
			Poppy.__creating = false;

			if (Settings.getItem('useAnimations'))
				self.poppy.one('webkitAnimationEnd', self.fullyShown.bind(self));
			else
				self.fullyShown();
		}, 0, [this]);

		return this;
	};

	Poppy.prototype.fullyShown = function () {
		Poppy.event.trigger('poppyIsFullyShown', this);

		this.poppy.removeClass('poppy-open').addClass('poppy-fully-shown');
	};

	Poppy.prototype.remove = function () {
		this.poppy.remove();

		Poppy.event.trigger('poppyDidClose', this);

		delete poppies[this.id];
	};

	Poppy.prototype.close = function (immediate, doNotCheckEvent) {
		return CustomPromise(function (resolve) {
			if (this.closed || (!doNotCheckEvent && Poppy.event.trigger('poppyWillClose', this)))
				return resolve(this);

			if (this.view)
				this.view.unbind('scroll', this.__viewDidScroll);

			if (this.forceClickElement && this.forceClickElement.event)
				this.forceClickElement.event
					.removeCustomEventListener('firstForceChange', this.__firstForceChange)
					.removeCustomEventListener('forceChange', this.__scaleWithForce)
					.removeCustomEventListener('forceDown', this.cancelScaleWithForce)
					.removeCustomEventListener('forceClickCancelled', this.close)
					.removeCustomEventListener('click', this.cancelScaleWithForce);

			if (!this.displayed)
				return resolve(this);

			Poppy.closeLinksTo(this);

			var self = this,
				keepModalOpen = false;

			this.closed = true;
			this.displayed = false;

			if (this.linkedTo)
				this.linkedTo.reverseLink = undefined;

			var poppyIDs = Object.keys(poppies);

			for (var i = poppyIDs.length; i--;)
				if (poppies[poppyIDs[i]].isModal && poppyIDs[i] !== this.id) {
					keepModalOpen = poppies[poppyIDs[i]];

					break;
				}

			if (!keepModalOpen)
				Poppy.closeModal();
			else {
				Poppy.__modal.css('z-index', keepModalOpen.zIndex - 1);

				keepModalOpen.poppy.removeClass('poppy-blur');
			}

			if (immediate === true || !this.displayed) {
				this.remove();

				resolve(this);
			} else
				this.poppy
					.addClass('poppy-closed')
					.fadeOut(100 * window.globalSetting.speedMultiplier, 'easeOutQuad', function () {
						self.remove();

						resolve(self);
					});
		}.bind(this));
	};

	Poppy.prototype.scaleWithForce = function (forceClickElement) {
		if (this.forceClickElement || !forceClickElement || !ForceClickElement.isSupported)
			return;

		if (!(forceClickElement instanceof ForceClickElement))
			throw new TypeError('forceClick is not an instance of ForceClickElement');

		this.poppy.addClass('poppy-scales-with-force');

		this.forceClickElement = forceClickElement;

		this.forceClickElement.event
			.addCustomEventListener('firstForceChange', this.__firstForceChange)
			.addCustomEventListener('forceChange', this.__scaleWithForce)
			.addCustomEventListener('forceDown', this.cancelScaleWithForce)
			.addCustomEventListener('forceClickCancelled', this.close)
			.addCustomEventListener('click', this.cancelScaleWithForce);

		return this;
	};

	Poppy.prototype.cancelScaleWithForce = function () {
		if (this.forceClickElement && this.forceClickElement.event)
			this.forceClickElement.event
				.removeCustomEventListener('firstForceChange', this.__firstForceChange)
				.removeCustomEventListener('forceChange', this.__scaleWithForce)
				.removeCustomEventListener('forceDown', this.cancelScaleWithForce)
				.removeCustomEventListener('forceClickCancelled', this.close)
				.removeCustomEventListener('click', this.cancelScaleWithForce);

		if (this.poppy.hasClass('poppy-did-scale-with-force') && this.poppy.hasClass('poppy-scales-with-force')) {
			var self = this;
		
			this.poppy.removeClass('poppy-scales-with-force').css({ '-webkit-transform': 'scale(1.22)', opacity: 1 }).on('webkitTransitionEnd', function (event) {
				if (event.originalEvent.propertyname === 'opacity')
					return;

				this.style.webkitTransform = '';

				self.poppy.addClass('poppy-fully-shown');

				Poppy.preventNextCloseAll();
			});
		}

		return this;
	};

	UI.onReady(function () {
		Poppy.__modal = $('#modal-overlay');
		Poppy.__container = $('#container');
		Poppy.__viewOffsetTop = UI.view.views.offset().top;

		Poppy.__container
			.bind('mouseup dblclick', function (event) {
				if (Poppy.__preventNextCloseAll)
					return Poppy.__preventNextCloseAll = false;

				if (event.type === 'dblclick')
					Poppy.__creating = false;
				
				if (Poppy.__creating || !$.contains(document, event.target) || event.target === Poppy.__modal[0])
					return;

				var poppyElement = $(event.target).parents('.poppy');

				if (!poppyElement.length)
					return Poppy.closeAll();

				var poppyID = poppyElement.attr('data-id'),
					poppy = poppies[poppyID],
					zIndex = poppy ? poppy.zIndex : 0,
					linkTree = poppy ? poppy.linkTree() : [];

				for (var otherPoppyID in poppies)
					if (otherPoppyID !== poppyID && poppies[otherPoppyID].zIndex > zIndex && (!poppy.linkedTo || !linkTree._contains(otherPoppyID)))
						poppies[otherPoppyID].close();
			});
	}, true);

	UI.event.addCustomEventListener('pageWillRender', Poppy.closeAll);
	UI.event.addCustomEventListener('popoverOpened', Poppy.closeAll.bind(Poppy, true, true));
	UI.event.addCustomEventListener('popoverDidResize', Poppy.closeAll);
})();
