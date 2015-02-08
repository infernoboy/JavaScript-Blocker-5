"use strict";

(function () {
	var poppies = {};

	window.Poppy = function Poppy (x, y, closeExisting, scriptName) {
		if (typeof x !== 'number' || typeof y !== 'number')
			throw new TypeError('x or y is not a number');

		var self = this;

		if (closeExisting)
			window.Poppy.closeAll();

		if (Utilities.isFloat(x))
			x = window.Poppy.__container.outerWidth() * x;

		if (Utilities.isFloat(y))
			y = window.Poppy.__container.outerHeight() * y;

		this.id = Utilities.Token.generate();
		this.displayed = false;
		this.willMoveWithView = false;
		this.willRemoveOnScroll = true;
		this.isUpArrow = false;
		this.noArrow = false;
		this.scriptName = scriptName;

		this.originalPosition = {
			x: x,
			y: y
		};

		this.poppy = Template.create('poppy', 'poppy', {
			id: this.id
		});

		this.poppy.css('z-index', window.Poppy.__zIndex++);

		this.content = $('.poppy-content', this.poppy);
		this.arrow = $('.poppy-arrow', this.poppy);
		this.arrowSettings = $('.poppy-arrow-settings', this.poppy);
		this.arrowSettingsUp = $('.poppy-arrow-settings-up', this.poppy);

		poppies[this.id] = this;

		this.viewDidScroll = this.viewDidScroll.bind(this);

		$('.poppy-close', this.poppy).click(this.close.bind(this));
	};

	Poppy = Poppy._extendClass(EventListener);

	Poppy.__offset = -4;
	Poppy.__zIndex = 700;
	Poppy.__creating = false;

	Poppy.scripts = {};

	Poppy.poppies = poppies;

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

	Poppy.closeAll = function (eventOrImmediate) {
		if (UI.event.trigger('poppyWillCloseAll'))
			return Promise.all([]);

		var promiseArray = [];

		for (var poppyID in poppies) {
			if ((eventOrImmediate && eventOrImmediate.type === 'scroll' && !poppies[poppyID].willRemoveOnScroll) || poppies[poppyID].isModal)
				continue;

			promiseArray.push(poppies[poppyID].close(eventOrImmediate));
		}

		return Promise.all(promiseArray);
	};

	Poppy.closeModal = function () {
		if (Poppy.modalOpen) {
			Poppy.modalOpen = false;

			Poppy.__modal.stop(true).fadeOut(130 * window.globalSetting.speedMultiplier, function () {
				UI.event.trigger('poppyModalClosed');
			});
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
		arrowContext.fillStyle = arrowBackgroundColor

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

		UI.event.addCustomEventListener('poppyIsFullyShown', function (event) {
			if (event.detail === loadingPoppy) {
				event.unbind();
				
				if (typeof onFullyShown === 'function')
					onFullyShown(loadingPoppy);
			}
		});

		return loadingPoppy;
	};

	Poppy.prototype.shake = function () {
		this.poppy.shake();
		this.arrow.shake(true);
	};

	Poppy.prototype.calculatePosition = function () {
		this.position = Object._copy(this.originalPosition);

		this.isUpArrow = false;
		this.noArrow = false;

		this.poppy.removeClass('poppy-up poppy-no-arrow');

		this.content.width('');		

		var spacing = 5;

		var position = {
			arrow: {
				left: 0,
				bottom: -this.arrow.height(),
				top: 'auto'
			},

			poppy: {
				left: 0,
				bottom: Math.max(this.arrow.height() + Poppy.__offset, (Poppy.__container.height() - this.position.y) + this.arrow.height() + Poppy.__offset),
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
				
		if (this.position.x - poppyWidth / 2 <= spacing) { // If overflow on left side
			position.poppy.left = spacing;
			position.arrow.left = this.position.x - halfArrowWidth - spacing;
			
			if (position.arrow.left < halfArrowWidth / 2)
				position.arrow.left = 3;
		} else if (this.position.x + poppyWidth / 2 > containerWidth - spacing) { // If overflow on right side
			position.poppy.left = containerWidth - poppyWidth - spacing;
			position.arrow.left = this.position.x - position.poppy.left - halfArrowWidth;
				
			if (position.arrow.left > poppyWidth - (halfArrowWidth * 2) - spacing)
				position.arrow.left = poppyWidth - (halfArrowWidth * 2) - 3;
		} else { // If fits
			position.poppy.left = this.position.x - Math.floor(poppyWidth / 2);
			position.arrow.left = Math.floor(poppyWidth / 2) - halfArrowWidth;
		}
		
		if (this.position.y - poppyHeight - arrowHeight <= 0) {
			if (this.position.y < containerHeight / 2) {
				this.poppy.addClass('poppy-up');

				this.isUpArrow = true;

				position.poppy.bottom = 'auto';
				position.poppy.top = Math.max(arrowHeight + Poppy.__offset, this.position.y + arrowHeight - spacing);

				position.arrow.bottom = 'auto';
				position.arrow.top = -(arrowHeight);
				
				if (position.poppy.top + poppyHeight + arrowHeight > containerHeight) { // If overflow on bottom side
					var currentHeightTotal;

					while ((currentHeightTotal = position.poppy.top + this.poppy.outerHeight() + 15) > containerHeight) {
						this.noArrow = true;

						if (position.poppy.top > spacing) {
							position.poppy.top--;
							this.position.y--;
						} else {
							poppyAndContent.css('height', '-=' + (currentHeightTotal - containerHeight - 15 + spacing) + 'px');

							break;
						}
					}
				}
			} else {
				if (poppyHeight + arrowHeight > this.position.y) { // If overflow on top side
					var currentHeightTotal;

					while ((currentHeightTotal = this.poppy.outerHeight() + arrowHeight + 15) > this.position.y) {
						this.noArrow = true;

						if (position.poppy.bottom > spacing) {
							position.poppy.bottom--;
							this.position.y++;
						} else {
							poppyAndContent.css('height', '-=' + (currentHeightTotal - this.position.y - 15 + spacing) + 'px');

							break;
						}
					}
				}
			}
		}

		this.poppy.toggleClass('poppy-no-arrow', this.noArrow);

		this.poppy.css({
			WebkitTransformOriginX: this.noArrow ? 'center' : ((((position.arrow.left + halfArrowWidth) / poppyWidth) * 100) + '%'),
			WebkitTransformOriginY: this.noArrow ? 'center' : ((this.isUpArrow ? -(arrowHeight / 2) : this.poppy.outerHeight() + arrowHeight / 2) + 'px')
		});
		
		return position;
	};

	Poppy.prototype.setPosition = function () {
		var position = this.calculatePosition();

		this.poppy.css(position.poppy);
		this.arrow.css(position.arrow);

		Poppy.createArrow(this);

		return this;
	};

	Poppy.prototype.setContent = function (content, script) {
		this.content.off().empty().append(content);

		if (this.displayed) {
			this.executeScript();

			return this.setPosition();
		}

		return this;
	};

	Poppy.prototype.viewDidScroll = function (event) {
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

		view.bind('scroll', this, this.viewDidScroll);

		return this;
	};

	Poppy.prototype.stayOpenOnScroll = function () {
		this.willRemoveOnScroll = false;

		return this;
	};

	Poppy.prototype.modal = function () {
		Poppy.modalOpen = true;

		this.isModal = true;

		Poppy.__modal.stop().fadeIn(200 * window.globalSetting.speedMultiplier);

		UI.event.trigger('poppyModalOpened');

		return this;
	};

	Poppy.prototype.linkTo = function (poppy) {
		if (!(poppy instanceof Poppy))
			throw new TypeError(poppy + ' is not a Poppy');

		this.linkedTo = poppy;

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

	Poppy.prototype.show = function (quick, instant) {
		if (this.closed || UI.event.trigger('poppyWillShow', this))
			return this;

		Poppy.__creating = true;

		this.poppy.prependTo(Poppy.__container);

		this.displayed = true;

		this.setPosition();

		UI.event.trigger('poppyDidShow', this);

		this.poppy
			.toggleClass('poppy-open-quick', !!quick)
			.toggleClass('poppy-open-instant', !!instant)
			.addClass('poppy-open poppy-displayed')
			.one('webkitAnimationEnd', function (event) {
				UI.event.trigger('poppyIsFullyShown', this);

				this.poppy.removeClass('poppy-open');
			}.bind(this));

		Utilities.Timer.timeout('PoppyCreating', function () {
			Poppy.__creating = false;
		}, 0);

		this.executeScript();

		Utilities.setImmediateTimeout(function (poppy) {
			poppy.setPosition();
		}, [this]);

		return this;
	};

	Poppy.prototype.remove = function () {
		this.poppy.remove();

		UI.event.trigger('poppyDidClose', this);

		delete poppies[this.id];
	};

	Poppy.prototype.close = function (immediate) {
		return new Promise(function (resolve, reject) {
			if (this.closed || !this.displayed || UI.event.trigger('poppyWillClose', this))
				return this;

			Poppy.closeLinksTo(this);

			var self = this,
					shouldHideModal = true;

			this.closed = true;

			for (var poppyID in poppies)
				if (poppies[poppyID].isModal && poppyID !== this.id) {
					shouldHideModal = false;

					break;
				}

			if (shouldHideModal)
				Poppy.closeModal();

			if (this.view)
				this.view.unbind('scroll', this.viewDidScroll);

			if (immediate === true || !this.displayed) {
				this.remove();

				resolve(this);
			} else {
				this.poppy
					.find('*')
					.addBack()
					.css('pointer-events', 'none')
					.end()
					.end()
					.fadeOut(130 * window.globalSetting.speedMultiplier, function () {
						self.remove();

						resolve(self);
					});
			}

			return this;
		}.bind(this));
	};

	UI.onReady(function () {
		Poppy.__modal = $('#modal-overlay');
		Poppy.__container = $('#container');
		Poppy.__viewOffsetTop = UI.view.views.offset().top;

		Poppy.__container
			.bind('mouseup dblclick', function (event) {
				if (event.type === 'dblclick')
					Poppy.__creating = false;
				
				if (Poppy.__creating || !$.contains(document, event.target) || event.target === Poppy.__modal[0])
					return;

				var poppyElement = $(event.target).parents('.poppy');

				if (!poppyElement.length)
					return Poppy.closeAll();

				var poppyID = poppyElement.attr('data-id'),
						poppy = poppies[poppyID],
						linkTree = poppy ? poppy.linkTree() : [];

				for (var otherPoppyID in poppies)
					if (otherPoppyID !== poppyID && (!poppy.linkedTo || !linkTree._contains(otherPoppyID)))
						poppies[otherPoppyID].close();
			});
	}, true);

	UI.event.addCustomEventListener('pageWillRender', Poppy.closeAll);
	UI.event.addCustomEventListener('popoverOpened', Poppy.closeAll.bind(Poppy, true));
	UI.event.addCustomEventListener('popoverDidResize', Poppy.closeAll);

	Template.load('poppy');
})();
