"use strict";

(function () {
	var poppies = {};

	window.Poppy = function Poppy (x, y, closeExisting, script) {
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
		this.isUpArrow = false;

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

		if (script && window.Poppy.scripts[script])
			this.addCustomEventListener('poppyDidShow', window.Poppy.scripts[script], true);
	};

	Poppy = Poppy._extendClass(EventListener);

	Poppy.__offset = -2;
	Poppy.__zIndex = 700;
	Poppy.__creating = false;

	Poppy.scripts = {};

	UI.event.addCustomEventListener('UIReady', function () {
		Poppy.__modal = $('#modal-overlay');
		Poppy.__container = $('#container');
		Poppy.__viewOffsetTop = UI.view.views.offset().top;

		Poppy.__container.click(function (event) {
			if (Poppy.__creating || !$.contains(document, event.target))
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

	Poppy.closeAll = function (event) {
		for (var poppyID in poppies) {
			if (event && event.type === 'scroll' && poppies[poppyID].willMoveWithView)
				continue;

			poppies[poppyID].close();
		}
	};

	Poppy.closeLinksTo = function (poppy) {
		var linkTree;

		for (var poppyID in poppies) {
			linkTree = poppies[poppyID].linkTree();

			if (linkTree._contains(poppy.id))
				poppies[poppyID].close();
		}
	};

	Poppy.createArrow = function (poppy) {
		var	arrowStyle = window.getComputedStyle(poppy.isUpArrow ? poppy.arrowSettingsUp[0] : poppy.arrowSettings[0]),
				shadowColor = 'rgba(0, 0, 0, 0.25)',
				arrowBackgroundColor = arrowStyle.backgroundColor,
				arrowContext = document.getCSSCanvasContext('2d', poppy.isUpArrow ? 'poppy-arrow-up' : 'poppy-arrow', 30, 22);

		arrowContext.clearRect(0, 0, 30, 22);

		arrowContext.shadowOffsetX = 0;
		arrowContext.shadowOffsetY = poppy.isUpArrow ? -1 : 1;
		arrowContext.shadowBlur = 6;
		arrowContext.shadowColor = shadowColor;
		arrowContext.fillStyle = arrowBackgroundColor

		if (poppy.isUpArrow) {
			arrowContext.beginPath();
			arrowContext.moveTo(3, 22);
			arrowContext.lineTo(15, 10);
			arrowContext.lineTo(27, 22);
			arrowContext.closePath();
			arrowContext.fill();
		} else {
			arrowContext.beginPath();
			arrowContext.moveTo(3, 0);
			arrowContext.lineTo(15 ,12);
			arrowContext.lineTo(27, 0);
			arrowContext.closePath();
			arrowContext.fill();
		}
	};

	Poppy.prototype.calculatePosition = function () {
		this.position = Object._copy(this.originalPosition);

		this.isUpArrow = false;

		this.poppy.removeClass('poppy-up');

		this.content.width('');

		this.content.width(this.content.width() + 1); // Prevents annoying Safari rounding

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

		var poppyAndContent = this.poppy.find(this.content).andSelf();

		poppyAndContent.css('height', '');

		var containerWidth = Poppy.__container.width(),
				containerHeight = Poppy.__container.height(),
				poppyWidth = this.poppy.outerWidth(),
				poppyHeight = this.poppy.outerHeight(),
				halfArrowWidth = this.arrow.outerWidth() / 2,
				arrowHeight = this.arrow.outerHeight();
				
		if (this.position.x - poppyWidth / 2 <= 1) { // If overflow on left side
			position.poppy.left = 1;
			position.arrow.left = this.position.x - halfArrowWidth;
			
			if (position.arrow.left < halfArrowWidth / 2)
				position.arrow.left = 5;
		} else if (this.position.x + poppyWidth / 2 > containerWidth - 1) { // If overflow on right side
			position.poppy.left = containerWidth - poppyWidth - 1;
			position.arrow.left = this.position.x - position.poppy.left - halfArrowWidth;
				
			if (position.arrow.left > poppyWidth - (halfArrowWidth * 2) - 5)
				position.arrow.left = poppyWidth - (halfArrowWidth * 2) - 5;
		} else { // If fits
			position.poppy.left = this.position.x - (poppyWidth / 2);
			position.arrow.left = (poppyWidth / 2) - halfArrowWidth;
		}
		
		if (this.position.y - poppyHeight - arrowHeight <= 0) {
			if (this.position.y < containerHeight / 2) {
				this.poppy.addClass('poppy-up');

				this.isUpArrow = true;

				this.position.y += Poppy.__offset;

				position.poppy.bottom = 'auto';
				position.poppy.top = Math.max(arrowHeight, this.position.y + arrowHeight - 5);

				position.arrow.bottom = 'auto';
				position.arrow.top = -(arrowHeight);
				
				if (this.position.y + poppyHeight + arrowHeight > containerHeight) { // If overflow on bottom side
					while (this.position.y + this.poppy.outerHeight() + arrowHeight > containerHeight)
						poppyAndContent.css('height', '-=5px');
				}
			} else {
				if (poppyHeight + arrowHeight > this.position.y) { // If overflow on top side
					while (this.poppy.outerHeight() + arrowHeight > this.position.y)
						poppyAndContent.css('height', '-=5px');
				}
			}
		}

		this.poppy.css({
			WebkitTransformOriginX: (((position.arrow.left + halfArrowWidth) / poppyWidth) * 100) + '%',
			WebkitTransformOriginY: (this.isUpArrow ? -(arrowHeight / 2) : poppyHeight + arrowHeight / 2) + 'px'
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

	Poppy.prototype.setContent = function (content) {
		this.content.empty().append(content);

		if (this.displayed)
			return this.setPosition();

		return this;
	};

	Poppy.prototype.viewDidScroll = function (event) {
		var scrollTop = UI.view.views.scrollTop(),
				scrollLeft = UI.view.views.scrollLeft();

		this.originalPosition.y -= scrollTop - this.lastScroll.top;
		this.originalPosition.x -= scrollLeft - this.lastScroll.left;

		this.lastScroll = {
			top: scrollTop,
			left: scrollLeft
		};

		this.setPosition();
	};

	Poppy.prototype.moveWithView = function () {
		if (this.willMoveWithView)
			return this;

		this.willMoveWithView = true;

		if (this.originalPosition.y < Poppy.__viewOffsetTop)
			return this;

		this.lastScroll = {
			top: UI.view.views.scrollTop(),
			left: UI.view.views.scrollLeft()
		};

		UI.view.views.bind('scroll', this, this.viewDidScroll);

		return this;
	};

	Poppy.prototype.modal = function () {
		this.isModal = true;

		Poppy.__modal.stop().fadeIn(200);

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

	Poppy.prototype.show = function () {
		Poppy.__creating = true;

		this.trigger('poppyWillShow', this);

		this.poppy.prependTo(Poppy.__container);

		this.displayed = true;

		this.setPosition();

		this.poppy.addClass('poppy-open');

		this.trigger('poppyDidShow', this);

		UI.view.views.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);

		Utilities.Timer.timeout('PoppyCreating', function () {
			Poppy.__creating = false;
		}, 100);

		return this;
	};

	Poppy.prototype.close = function () {
		if (this.closed)
			return this;

		Poppy.closeLinksTo(this);

		this.closed = true;

		var self = this,
				shouldHideModal = true;

		this.trigger('poppyWillClose', this);

		for (var poppyID in poppies)
			if (poppies[poppyID].isModal && poppyID !== this.id) {
				shouldHideModal = false;

				break;
			}

		if (shouldHideModal)
			Poppy.__modal.stop().fadeOut(200);

		UI.view.views.unbind('scroll', this.viewDidScroll);

		this.poppy.fadeOut(200, function () {
			self.poppy.remove();

			self.trigger('poppyDidClose', self);

			delete poppies[self.id];
		});

		return this;
	};

	UI.event.addCustomEventListener('popoverOpened', Poppy.closeAll);

	Template.load('poppy');
})();
