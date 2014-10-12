"use strict";

var UI = {
	__popoverWidthSetting: 'popoverWidth',
	__popoverHeightSetting: 'popoverHeight',

	readyState: {
		Page: false
	},
	show: ToolbarItems.showPopover,
	event: new EventListener,
	document: document,

	onReady: function (fn) {
		UI.event.addCustomEventListener('UIReady', fn, true);
	},

	init: function () {
		$(document).on('click', 'a', UI.events.anchor);

		if (!Utilities.safariVersionSupported) {
			globalPage.Command.toggleDisabled(true);

			$('#too-old').show();

			throw new Error('safari version too old');
		}

		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++)
				if (mutations[i].type === 'childList')
					for (var j = 0; j < mutations[i].addedNodes.length; j++)
						UI.event.trigger('elementWasAdded', mutations[i].addedNodes[j]);
		});

		observer.observe(document, {
			childList: true,
			subtree: true
		});

		var userAgent = window.navigator.userAgent;

		Settings.map.useAnimations.props.onChange();
		Settings.map.largeFont.props.onChange();

		document.documentElement.classList.toggle('yosemite', userAgent._contains('10_10'));
		document.documentElement.classList.toggle('mavericks', userAgent._contains('10_9'));
		document.documentElement.classList.toggle('mountain-lion', userAgent._contains('10_8'));
		document.documentElement.classList.toggle('lion', userAgent._contains('10_7'));
		document.documentElement.classList.toggle('snow-leopard', userAgent._contains('10_6'));
		
		UI.container = Template.create('main', 'container');

		$('body').empty().append(UI.container);

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

		$(document)
			.on('change', '.select-custom-input + .select-wrapper select', function (event) {
				$(this).parent().prev().val(this.value).focus();

				if (!this.classList.contains('select-cycle'))
					this.selectedIndex = -1;
			})
			.on('input', 'textarea.render-as-input', function (event) {
				this.value = this.value.replace(/\n/g, '');
			});

		UI.event
			.addCustomEventListener('viewWillSwitch', function (event) {
				if (event.detail.from.id === '#resource-content-view') 
					$(event.detail.from.id, UI.view.views).empty();

				if (event.detail.to.id === '#rule-view')
					event.detail.to.view.find('#rules').html('<pre>' + JSON.stringify(globalPage.Rules.list.active.rules.all(), null, 1) + '</pre>');
				else if (event.detail.to.id === '#snapshot-view')
					event.detail.to.view.html('<pre>' + JSON.stringify(globalPage.Rules.list.user.rules.snapshot.snapshots.all(), null, 1) + '</pre>');
			})

			.addCustomEventListener('disabled', function (event) {
				$('#full-toggle', UI.view.viewToolbar).toggleClass('is-disabled', event.detail);
			})

			.addCustomEventListener('elementWasAdded', function (event) {
				if (event.detail.querySelectorAll) {
					var selects = event.detail.querySelectorAll('.select-custom-input + select:not(.select-custom-ready)');

					for (var i = selects.length; i--;) {
						if (selects[i].classList.contains('select-single')) {
							$(selects[i]).prev().hide();

							continue;
						}

						selects[i].classList.add('select-custom-ready');

						selects[i].previousElementSibling.value = selects[i].value;

						$(selects[i])
							.next()
							.addBack()
							.wrapAll('<div class="select-wrapper"></div>')
							.end()
							.parent()
							.parent()
							.wrapInner('<div class="select-custom-wrapper"></div>');

						if (!selects[i].classList.contains('select-cycle'))
							selects[i].selectedIndex = -1;
					}
				}
			});

		UI.view.init();

		Settings.map.showResourceURLs.props.onChange();

		window.addEventListener('keydown', UI.events.keyboardShortcut, true);
		window.addEventListener('keypress', UI.events.keyboardShortcut, true);
		window.addEventListener('keyup', UI.events.keyup, true);
	},

	resizePopover: function (width, height) {
		width = Math.max(Settings.map[UI.__popoverWidthSetting].props.default, width);
		height = Math.max(Settings.map[UI.__popoverHeightSetting].props.default, height);

		var popover = Popover.popover,
				originalWidth = parseInt(popover.width, 10),
				originalHeight = parseInt(popover.height, 10);

		popover.width = width;
		popover.height = height;

		setTimeout(function (originalWidth, originalHeight, popover) {
			Utilities.Timer.timeout('savePopoverDimensions', function (popover) {
				Settings.setItem(UI.__popoverWidthSetting, popover.width);
				Settings.setItem(UI.__popoverHeightSetting, popover.height);
			}, 100, [popover]);

			UI.event.trigger('popoverDidResize', {
				widthDifference: originalWidth - popover.width,
				heightDifference: originalHeight - popover.height,
			});
		}, 10, originalWidth, originalHeight, popover);
	},

	events: {
		__keys: {
			UP: 38,
			DOWN: 40,
			LEFT: 37,
			RIGHT: 39,
			SHIFT: 16,
			ESCAPE: 27
		},

		keyboardShortcut: function (event) {
			var metaKey = Utilities.OSXVersion ? event.metaKey : event.ctrlKey,
					metaShift = metaKey && event.shiftKey;

			var key = String.fromCharCode(event.which).toLowerCase();

			if (event.type === 'keypress') {
				if (metaShift) {
					if (key ==='c') {
						event.preventDefault();

						var consolePoppy = new Poppy(.999, 0, true, 'console');

						consolePoppy
							.setContent(Template.create('poppy', 'console'))
							.stayOpenOnScroll()
							.show();
					}
				}
			} else {
				if (event.which === UI.events.__keys.ESCAPE) {
					if (Poppy.poppyExist()) {
						event.preventDefault();

						Poppy.closeAll();
					}
				} else if (metaShift) {
					if (event.which in UI.events.__keys)
						event.preventDefault();

					if (event.which === UI.events.__keys.UP)
						UI.resizePopover(Popover.popover.width, Popover.popover.height - 6);
					else if (event.which === UI.events.__keys.DOWN)
						UI.resizePopover(Popover.popover.width, Popover.popover.height + 6);
					else if (event.which === UI.events.__keys.LEFT)
						UI.resizePopover(Popover.popover.width - 6, Popover.popover.height);
					else if (event.which === UI.events.__keys.RIGHT)
						UI.resizePopover(Popover.popover.width + 6, Popover.popover.height);
				}
			}
		},

		keyup: function (event) {

		},

		anchor: function (event) {
			if (this.href._startsWith('http')) {
				Tabs.create(this.href);

				Popover.hide();
			}
		}
	},

	view: {
		__switching: false,
		__default: '#page-view',
		__scale: {
			behind: 0.85,
			above: 1.2
		},

		init: function () {
			this.views = $('#main-views', UI.container);
			this.viewContainer = $('#view-container', UI.container);
			this.viewToolbar = $('#view-toolbar', this.viewContainer);
			this.viewSwitcher = $('.view-switcher', this.viewToolbar);

			this.viewSwitcher.on('click', 'li', function () {
				UI.view.switchTo(UI.view.viewSwitcher, this.getAttribute('data-view'));
			});

			this.viewToolbar
				.on('click', '#full-toggle', function () {
					globalPage.Command.toggleDisabled();
				})
				.on('click', '#open-menu', function (event) {
					this.classList.remove('unread-error');

					var poppy = new Poppy(event.pageX, event.pageY, true, 'mainMenu');

					poppy.setContent(Template.create('poppy', 'main-menu')).stayOpenOnScroll().show();
				});

			$('#container').click(function (event) {
				return;

				Poppy.closeAll();
				
				var poppy = new Poppy(event.pageX, event.pageY);

				poppy
					.setContent('hello there at ' + Date.now() + 'hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>')
					.moveWithView(UI.view.views)
					.show();
			});

			UI.event
				.addCustomEventListener('poppyDidShow', function () {
					UI.view.views.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
				})
				.addCustomEventListener('poppyModalOpened', function () {
					UI.view.viewContainer.addClass('modal-blur');
				})
				.addCustomEventListener('poppyModalClosed', function () {
					UI.view.viewContainer.removeClass('modal-blur');
				});

			this.switchTo(this.viewSwitcher, this.__default);
		},

		toTop: function (viewContainer) {
			viewContainer
				.animate({
					scrollTop: 0,
					scrollLeft: 0
				}, 225 * window.globalSetting.speedMultiplier)
				.trigger('scroll')
		},

		switchTo: function (viewSwitcher, viewID) {
			var viewContainer = $(viewSwitcher.attr('data-container')),
					activeID = viewContainer.attr('data-activeView');

			if (activeID === viewID)
				return UI.view.toTop(viewContainer);

			var previousView = viewContainer.find(activeID),
					activeView = viewContainer.find(viewID);

			if (!activeView.length)
				throw new Error('view not found - ' + viewID);

			var defaultPrevented = UI.event.trigger('viewWillSwitch', {
				from: {
					view: previousView,
					id: activeID,
				},
				to: {
					view: activeView,
					id: viewID
				}
			});

			if (defaultPrevented)
				return;

			$('li', viewSwitcher)
				.removeClass('active-view')
				.filter('[data-view="' + viewID + '"]')
				.addClass('active-view')

			document.activeElement.blur();

			UI.view.toTop(viewContainer.attr('data-activeView', viewID));

			previousView.removeClass('active-view');

			activeView.addClass('active-view');

			viewContainer.trigger('scroll');

			UI.event.trigger('viewDidSwitch', {
				view: activeView,
				id: viewID
			});

		},

		isActive: function (viewSwitcher, viewID) {
			var viewContainer = $(viewSwitcher.attr('data-container'));

			if (viewContainer.find(viewID).length)
				throw new Error('view not found - ' + viewID);

			return viewContainer.data('data-activeView') === viewID;
		},

		floatingHeaders: {
			__floating: {},

			__onScroll: function (event, viewContainerSelector) {
				var viewContainer,
						viewContainerOffsetTop,
						offset,
						related;

				var headersInView = UI.view.floatingHeaders.__floating[viewContainerSelector];

				for (var headerSelector in headersInView) {
					viewContainer = headersInView[headerSelector].viewContainer;
					viewContainerOffsetTop = headersInView[headerSelector].viewContainerOffsetTop;
					offset = headersInView[headerSelector].offset;
					related = headersInView[headerSelector].related;

					if (typeof offset === 'function')
						offset = offset(viewContainer, headerSelector, offset);

					var top = viewContainerOffsetTop + offset,
							allHeaders = $(headerSelector, viewContainer),
							unfloatedHeaders = allHeaders.not('.floated-header');

					var currentHeader =
						unfloatedHeaders
							.filter(function () {
								var self = $(this);

								return self.is(':visible') && self.offset().top <= viewContainerOffsetTop + offset;
							})
							.filter(':last');

					var nextHeader = unfloatedHeaders.eq(unfloatedHeaders.index(currentHeader) + 1);

					$(headerSelector, viewContainer).remove('.floated-header');

					if (!currentHeader.length)
						return;

					var floatedHeaderID = 'floated-header-' + Utilities.Token.generate();
					
					var currentHeaderClone =
						currentHeader
							.clone(true, true)
							.attr('id', floatedHeaderID)
							.addClass('floated-header')
							.insertBefore(currentHeader);

					var relatedElementCache = currentHeader.data('relatedElement');

					if (relatedElementCache)
						var relatedElement = relatedElementCache;
					else {
						var relatedElement = typeof related === 'function' ? related(viewContainer, currentHeader) : null;

						if (relatedElement && relatedElement.saveToCache)
							currentHeader.data('relatedElement', relatedElement);
					}
					
					var relatedShifted = false,
							currentHeaderMarginHeight = currentHeader.outerHeight(true);

					if (relatedElement) {
						var offsetTop = relatedElement.offset().top + relatedElement.outerHeight() + currentHeaderMarginHeight - currentHeader.outerHeight();

						if (offsetTop <= currentHeaderMarginHeight + offset + viewContainerOffsetTop) {
							top = offsetTop - currentHeaderMarginHeight;
							relatedShifted = true;

							currentHeaderClone.addClass('floated-header-related-push');
						}
					}

					if (nextHeader.length && !relatedShifted) {
						var offsetTop = nextHeader.offset().top + offset - currentHeader.innerHeight() - viewContainerOffsetTop;

						if (offsetTop < 0) {
							top += offsetTop;

							currentHeaderClone.addClass('floated-header-push');
						}
					}

					currentHeaderClone.css({
						top: top,
						left: currentHeader.offset().left,
						width: currentHeader.width()
					});
				}
			},

			add: function (viewContainerSelector, headerSelector, related, offset) {
				var headersInView = UI.view.floatingHeaders.__floating._getWithDefault(viewContainerSelector, {});

				if (headerSelector in headersInView)
					return;

				var viewContainer = $(viewContainerSelector, UI.container);

				headersInView[headerSelector] = {
					viewContainer: viewContainer,
					viewContainerOffsetTop: viewContainer.offset().top,
					related: related,
					offset: offset
				};

				if (viewContainer.data('floatingHeaders'))
					return;

				viewContainer.data('floatingHeaders', true).scroll(Utilities.throttle(UI.view.floatingHeaders.__onScroll, 40, [viewContainerSelector]));
			}
		}
	}
};

UI.events.__keys._createReverseMap();

globalPage.UI = UI;

document.addEventListener('DOMContentLoaded', UI.init, true);
