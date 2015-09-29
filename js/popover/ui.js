"use strict";

var UI = {
	__popoverWidthSetting: 'popoverWidth',
	__popoverHeightSetting: 'popoverHeight',

	drag: false,
	event: new EventListener,

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

		document.documentElement.classList.toggle('capitan', userAgent._contains('10_11'));
		document.documentElement.classList.toggle('yosemite', userAgent._contains('10_10'));
		document.documentElement.classList.toggle('mavericks', userAgent._contains('10_9'));
		document.documentElement.classList.toggle('mountain-lion', userAgent._contains('10_8'));
		document.documentElement.classList.toggle('lion', userAgent._contains('10_7'));
		
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

		$(window)
			.on('mousemove', function (event) {
				if (UI.drag) {
					event.preventDefault();

					window.getSelection().removeAllRanges();

					document.documentElement.classList.add('jsb-no-select');

					Utilities.setImmediateTimeout(function () {
						window.getSelection().removeAllRanges();
					});
				}
			})

			.on('mousemove', function (event) {
				if (UI.drag && UI.drag.classList.contains('popover-resize')) {
					if (UI.drag.classList.contains('popover-resize-bottom')) {
						var resizeStartY = parseInt(UI.drag.getAttribute('data-resizeStartY'), 10),
								resizeStartHeight = parseInt(UI.drag.getAttribute('data-resizeStartHeight'), 10),
								height = (event.screenY > resizeStartY) ? resizeStartHeight + (event.screenY - resizeStartY) : resizeStartHeight - (resizeStartY - event.screenY);

						UI.resizePopover(Popover.popover.width, height);
					} else {
						var resizeStartX = parseInt(UI.drag.getAttribute('data-resizeStartX'), 10),
								resizeStartWidth = parseInt(UI.drag.getAttribute('data-resizeStartWidth'), 10);

						if (UI.drag.classList.contains('popover-resize-left'))
							var width = (event.screenX < resizeStartX) ? resizeStartWidth - (event.screenX - resizeStartX) : resizeStartWidth + (resizeStartX - event.screenX);
						else
							var width = (event.screenX < resizeStartX) ? resizeStartWidth + (event.screenX - resizeStartX) : resizeStartWidth - (resizeStartX - event.screenX);

						var widthDifference = Popover.popover.width - width;

						if (!(widthDifference % 2))
							UI.resizePopover(width, Popover.popover.height);
					}
				}
			})

			.on('mouseup', function (event) {
				if (UI.drag) {
					UI.drag = false;

					window.getSelection().removeAllRanges();

					document.documentElement.classList.remove('jsb-no-select');
					document.documentElement.classList.remove('jsb-drag-cursor');

					UI.event.trigger('dragEnd');
				}
			})

			.on('mousemove mouseup click dblclick', Utilities.throttle(function (event) {
				Utilities.setImmediateTimeout(function () {
					var timerExisted = Utilities.Timer.remove('timeout', 'showPoppyMenu');

					if (timerExisted)
						$('*[data-poppyMenuWillShow]', UI.container).removeAttr('data-poppyMenuWillShow')
				});
			}, 0, true));

		$(document)
			.on('mousedown', '.popover-resize', function (event) {
				event.preventDefault();

				UI.drag = this;

				this.setAttribute('data-resizeStartX', event.screenX);
				this.setAttribute('data-resizeStartY', event.screenY);
				this.setAttribute('data-resizeStartWidth', Popover.popover.width);
				this.setAttribute('data-resizeStartHeight', Popover.popover.height);
			})

			.on('input', '.select-custom-input', Utilities.throttle(function () {
				var select = $(this).next().find('select');

				if (select)
					$('.select-custom-option', select).prop('selected', true).attr('value', this.value).change();
			}, 500, null, true))

			.on('mousedown', '.select-custom-input + .select-wrapper select:not(.select-cycle)', function (event) {
				event.preventDefault();
			})

			.on('click', '.select-custom-input + .select-wrapper select:not(.select-cycle)', function (event) {
				var self = $(this),
						input = $(this.parentNode).prev(),
						poppy = new Poppy(event.pageX, event.pageY, false),
						options = $('option:not(.select-custom-option)', this);

				var optionsTemplate = Template.create('poppy', 'select-custom-options', {
					options: options,
					value: self.val()
				});

				$('li', optionsTemplate).click(function (event) {
					input.val(this.getAttribute('data-value')).focus().trigger('input');

					poppy.close();

					UI.event.trigger('selectCustomOptionChanged', input);
				});

				poppy.setContent(optionsTemplate).show();
			})

			.on('change', '.select-custom-input + .select-wrapper select.select-cycle', function (event) {
				$(this.parentNode).prev().val(this.value).focus();
			})

			.on('focus', 'select', function (event) {
				this.setAttribute('data-currentIndex', this.selectedIndex);
			})

			.on('keypress', '.trigger-on-enter', function (event) {
				if (event.which === 3 || event.which === 13) {
					this.blur();

					var clickElement;

					var clickContainer = this.parentNode;

					for (var i = 0; i < 10; i++) {

						clickElement = $('.on-enter', clickContainer);

						if (clickElement.length) {
							clickElement.click();

							break;
						}
						
						clickContainer = clickContainer.parentNode;
					}
				}
			})

			.on('input', 'textarea.render-as-input', function (event) {
				this.value = this.value.replace(/\n/g, '');
			})

			.on('click', '*[data-expander]:not(.keep-expanded) > *', function (event) {
				if (event.offsetX > this.offsetWidth) {
					var header = $(this.parentNode),
							groupWrapper = header.next(),
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
				}
			});

		UI.event
			.addCustomEventListener('viewWillSwitch', function (event) {
				event.afterwards(function (event) {
					if (!event.defaultPrevented && event.detail.from.id === '#main-views-resource-content') 
						$(event.detail.from.id, UI.view.views).empty();					
				});
			})

			.addCustomEventListener('viewDidSwitch', function (event) {
				if (event.detail.id._startsWith('#main-views'))
					$('#full-toggle', UI.view.viewToolbar).toggleClass('poppy-menu-disabled', $('li[data-view=' + event.detail.id + ']', event.detail.switcher).hasClass('view-switcher-collapses'));

				Poppy.closeAll();
			})

			.addCustomEventListener('disabled', function (event) {
				$('#full-toggle', UI.view.viewToolbar).toggleClass('is-disabled', event.detail);
			})

			.addCustomEventListener('elementWasAdded', function (event) {
				if (event.detail.querySelectorAll) {
					// ===== Custom Selects =====
					var customSelects = event.detail.querySelectorAll('.select-custom-input + select:not(.select-custom-ready)');

					for (var i = customSelects.length; i--;) {
						if (customSelects[i].classList.contains('select-single')) {
							$(customSelects[i]).prev().hide();

							continue;
						}

						customSelects[i].classList.add('select-custom-ready');

						customSelects[i].previousElementSibling.value = customSelects[i].value;

						$(customSelects[i])
							.append('<option class="select-custom-option">Custom Option</option>')
							.next()
							.addBack()
							.wrapAll('<div class="select-wrapper"></div>')
							.end()
							.parent()
							.prev()
							.addBack()
							.wrapAll('<div class="select-custom-wrapper"></div>');

						// if (!customSelects[i].classList.contains('select-cycle'))
						// 	customSelects[i].selectedIndex = -1;
					}


					// ===== Poppy Menus =====

					var poppyMenus = event.detail.querySelectorAll('*[data-poppy]:not(.poppy-menu-ready)');

					for (var i = poppyMenus.length; i--;) {
						poppyMenus[i].classList.add('poppy-menu-ready');

						poppyMenus[i].querySelector('.poppy-menu-target').addEventListener('click', function (event) {
							UI.view.showPoppyMenu(this, event);
						});

						poppyMenus[i].addEventListener('mousedown', function (event) {
							Utilities.Timer.timeout('showPoppyMenu', function (event, tab) {						
								UI.view.showPoppyMenu(tab.querySelector('.poppy-menu-target'), event, true);
							}, 400, [event, this]);
						});
					}


					// ===== Double-click Buttons =====

					var doubleClickButtons = event.detail.querySelectorAll('.double-click:not(.double-click-ready)');

					for (var i = doubleClickButtons.length; i--;) {
						doubleClickButtons[i].classList.add('double-click-ready');

						doubleClickButtons[i].addEventListener('click', function (event) {
							if (!this.classList.contains('one-more-time')) {
								this.classList.add('one-more-time');

								Utilities.Timer.timeout(this, function (self) {
									self.classList.remove('one-more-time');
								}, 2000, [this]);

								event.stopImmediatePropagation();

								event.preventDefault();

								return;
							}

							this.classList.remove('one-more-time');
						}, true);
					}


					// ===== Expanders =====

					var expander,
							keepExpanded;

					var headers = event.detail.querySelectorAll('*[data-expander]'),
							showExpanderLabels = Settings.getItem('showExpanderLabels');

					for (var i = headers.length; i--;) {
						if (headers[i].classList.contains('header-expander-ready'))
							continue;

						expander = headers[i].getAttribute('data-expander');
						keepExpanded = expander === '0';

						headers[i].classList.add('header-expander-ready');

						$(headers[i])
							.toggleClass('keep-expanded', keepExpanded)
							.toggleClass('show-label', showExpanderLabels)
							.toggleClass('group-collapsed', !keepExpanded && !!Settings.getItem('expander', expander))
							.find('> *')
							.attr({
								'data-i18n-show': _('expander.show'),
								'data-i18n-hide': _('expander.hide')
							})
							.end()
							.next()
							.wrapAll('<div class="collapsible-group-wrapper"></div>');
					}
				}
			});

		UI.view.init();

		setTimeout(function () {
			UI.setLessVariables();

			UI.event.trigger('UIReady', null, true);
			globalPage.Command.event.trigger('UIReady', null, true);
		}, 500);

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

	setLessVariables: function (variables) {
		variables = variables || {};

		(window.less || Popover.window.less).modifyVars({
			speedMultiplier: variables.speedMultiplier || window.globalSetting.speedMultiplier,
			darkMode: variables.darkMode || Settings.getItem('darkMode'),
			darknessLevel: variables.darknessLevel || Settings.getItem('darkMode') ? 84 : 0,
			baseColor: variables.baseColor || Settings.getItem('baseColor')
		});
	},

	events: {
		__keys: {
			UP: 38,
			DOWN: 40,
			LEFT: 37,
			RIGHT: 39,
			SHIFT: 16,
			ESCAPE: 27,
			TAB: 9
		},

		openedPopover: function () {
			Utilities.setImmediateTimeout(function () {
				UI.event.trigger('popoverOpened');
			});
		},

		keyboardShortcut: function (event) {
			if (document.activeElement) {
				var nodeName = document.activeElement.nodeName.toUpperCase();

				if (nodeName === 'TEXTAREA' || ((nodeName === 'INPUT' && ['text', 'search', 'password']._contains(document.activeElement.type)))) {
					if (nodeName === 'TEXTAREA' && event.which === UI.events.__keys.TAB && !document.activeElement.classList.contains('render-as-input')) {
						event.preventDefault();

						Utilities.Element.insertText(document.activeElement, "\t");
					}

					return;
				}
			}

			var metaKey = Utilities.OSXVersion ? event.metaKey : event.ctrlKey,
					metaShift = metaKey && event.shiftKey;

			var key = String.fromCharCode(event.which).toLowerCase();

			if (event.type === 'keypress') {
				if (metaShift) {
					switch (key) {
						case 'c':
							event.preventDefault();

							UI.Locker
								.showLockerPrompt('console')
								.then(function () {
									var consolePoppy = new Poppy(0.5, 0, true, 'console');

									consolePoppy
										.setContent(Template.create('poppy', 'console'))
										.stayOpenOnScroll()
										.show();
								});
						break;

						case 's':
							event.preventDefault();

							$('.page-host-create-rules', UI.Page.view).click();
						break;
					}
				}
			} else {
				if (event.which === UI.events.__keys.SHIFT) {
					// window.globalSetting.speedMultiplier = 20;

					// UI.setLessVariables();
				} else if (event.which === UI.events.__keys.ESCAPE) {
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
			// if (event.which === UI.events.__keys.SHIFT)
			// 	Settings.map.useAnimations.props.onChange();
		},

		anchor: function (event) {
			if (this.href._startsWith('http')) {
				Tabs.create(this.href);

				Popover.hide();
			}
		}
	},

	view: {
		__default: '#main-views-page',

		init: function () {
			this.views = $('#main-views', UI.container);
			this.viewContainer = $('#view-container', UI.container);
			this.viewToolbar = $('#view-toolbar', this.viewContainer);
			this.viewSwitcher = $('.view-switcher', this.viewToolbar);

			UI.container
				.on('click', '.more-info[data-moreInfo]', function (event) {
					var poppy = new Poppy(event.pageX, event.pageY, false);

					poppy
						.linkToOpenPoppy()
						.setContent(Template.create('main', 'jsb-readable', {
							string: this.getAttribute('data-moreInfo')
						}))
						.show();
				})

				.on('click', '#full-toggle', function () {
					if (!UI.event.trigger('willDisable', window.globalSetting.disabled) && !UI.event.trigger('pressAndHoldSucceeded'))
						globalPage.Command.toggleDisabled();
				})

				.on('click', '#open-menu', function (event) {
					var openMenu = function () {
						var poppy = new Poppy(event.pageX, event.pageY, true, 'main-menu');

						poppy.setContent(Template.create('poppy', 'main-menu')).stayOpenOnScroll().show();
					};

					if (this.classList.contains('unread-error')) {
						var self = this;

						this.classList.remove('unread-error');

						UI.Locker
							.showLockerPrompt('console')
							.then(function () {
								var consolePoppy = new Poppy(event.pageX, event.pageY, true, 'console');

								consolePoppy
									.setContent(Template.create('poppy', 'console'))
									.stayOpenOnScroll()
									.show();
							}, function () {
								openMenu();
							});

						return;
					}

					openMenu();
				})

				.on('click', '.view-switcher li', function () {
					UI.view.switchTo(this.getAttribute('data-view'));
				})

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

			this.switchTo(this.__default);
		},

		create: function (prefix, viewID, container) {
			var view = Template.create('main', 'view', {
				prefix: prefix,
				viewID: viewID
			});

			container.append(view);
		},

		toTop: function (viewContainer, evenIfPoppy, onComplete) {
			if (UI.event.trigger('viewWillScrollToTop', viewContainer))
				return false;

			onComplete = onComplete || $.noop;

			if (!evenIfPoppy && viewContainer.scrollTop() === 0 && Poppy.poppyExist())
				UI.event.addCustomEventListener('poppyWillCloseAll', function (event) {
					event.preventDefault();
				}, true);

			if (viewContainer.scrollTop() === 0 && viewContainer.scrollLeft() === 0) {
				if (!Settings.getItem('showPageEditorImmediately'))
					UI.view.floatingHeaders.adjustAll();

				onComplete();
			} else {
				viewContainer
					.animate({
						scrollTop: 0,
						scrollLeft: 0
					}, 0 * window.globalSetting.speedMultiplier, onComplete);

				UI.view.floatingHeaders.adjustAll();
			}
		},

		switchTo: function (viewID, evenIfPoppy) {
			var switchToView = $(viewID, UI.view.views);

			if (!switchToView.length)
				throw new Error('view not found - ' + viewID);

			var viewContainer = switchToView.parents('.ui-view-container:first');

			if (!viewContainer.length)
				throw new Error('not a view - ' + viewID);

			var activeID = viewContainer.attr('data-activeView');

			if (activeID === viewID)
				return UI.view.toTop(viewContainer, evenIfPoppy, function () {
					UI.event.trigger('viewAlreadyActive', {
						view: switchToView,
						id: activeID
					})
				});

			var previousView = viewContainer.find(activeID),
					viewSwitcher = $('.view-switcher[data-container="#' + viewContainer.attr('id') + '"]');

			var defaultPrevented = UI.event.trigger('viewWillSwitch', {
				switcher: viewSwitcher,

				from: {
					view: previousView,
					id: activeID
				},

				to: {
					view: switchToView,
					id: viewID
				}
			});

			if (defaultPrevented)
				return;

			var viewSwitcherItems =	$('li', viewSwitcher),
					previousViewSwitcherItem = viewSwitcherItems.filter('.active-view').removeClass('active-view'),
					activeViewSwitcherItem = viewSwitcherItems.filter('[data-view="' + viewID + '"]').addClass('active-view');

			document.activeElement.blur();

			UI.view.toTop(viewContainer.attr('data-activeView', viewID));

			previousView.removeClass('active-view');

			switchToView.addClass('active-view');

			UI.view.floatingHeaders.adjustAll();

			UI.event.trigger('viewDidSwitch', {
				view: switchToView,
				switcher: viewSwitcher,
				id: viewID
			});

			if (previousViewSwitcherItem.hasClass('view-switcher-collapses') || activeViewSwitcherItem.hasClass('view-switcher-collapses'))
				setTimeout(function (viewSwitcher) {
					Utilities.Element.repaint(viewSwitcher);
				}, 170 * window.globalSetting.speedMultiplier, viewSwitcher[0]);
			else
				Utilities.Element.repaint(viewSwitcher[0]);
		},

		isActive: function (viewSwitcher, viewID) {
			var viewContainer = $(viewSwitcher.attr('data-container'));

			if (viewContainer.find(viewID).length)
				throw new Error('view not found - ' + viewID);

			return viewContainer.data('data-activeView') === viewID;
		},

		showPoppyMenu: function (tab, event, force) {
			var self = $(tab),
					menuHolder = self.parents('*[data-poppy]'),
					width = self.outerWidth(),
					poppyName = self.parent().attr('data-poppy'),
					offset = self.offset().left,
					rightOffset = offset + width,
					inRange = (event.pageX > rightOffset - 12 && event.pageX < rightOffset);

			if (inRange && force)
				return;

			if (inRange || force) {
				event.stopPropagation();

				var pageX = event.pageX,
						pageY = event.pageY;

				if (force)
					UI.event.addCustomEventListener(self.parent().hasClass('active-view') ? 'viewWillScrollToTop' : 'viewWillSwitch', function (event) {
						var moveX = Math.abs(event.pageX - pageX),
								moveY = Math.abs(event.pageY - pageY);

						if (moveX < 5 && moveY < 5)
							event.preventDefault();
					}, true);

				if (Poppy.poppyWithScriptNameExist(poppyName) && !force)
					return Poppy.closeAll();

				var poppy = new Poppy(event.pageX, event.pageY, true, poppyName);

				poppy.poppy.attr('data-menuMeta', menuHolder.attr('data-poppyMenuMeta'));

				poppy.setContent(Template.create('poppy', poppyName, {
					poppy: poppy.poppy
				})).stayOpenOnScroll();

				if (force)
					UI.event.addCustomEventListener('poppyWillClose', function (event) {
						if (event.detail === poppy) {
							event.unbind();

							var moveX = Math.abs(event.pageX - pageX),
									moveY = Math.abs(event.pageY - pageY);

							if (moveX < 5 && moveY < 5)
								event.preventDefault();
						}
					});

				var preventDefault = UI.event.trigger('poppyMenuWillShow', {
					target: self,
					menuHolder: menuHolder
				});

				if (!preventDefault) {
					menuHolder.attr('data-poppyMenuWillShow', 1);

					if (!inRange)
						UI.event.addCustomEventListener('pressAndHoldSucceeded', function (event) {
							event.unbind();

							var moveX = Math.abs(event.pageX - pageX),
									moveY = Math.abs(event.pageY - pageY);

							if (moveX < 5 && moveY < 5)
								event.preventDefault();
						}, true);

					UI.event.addCustomEventListener('poppyDidShow', function () {
						menuHolder.removeAttr('data-poppyMenuWillShow', 1);
					}, true);

					poppy.show()
				}
			}
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
						offset = offset(viewContainer, headerSelector);

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
							.addClass('floated-header');

					$('*', currentHeaderClone).removeClass('poppy-menu-ready');

					currentHeaderClone.insertBefore(currentHeader);

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

			adjustAll: function () {
				for (var viewContainerSelector in UI.view.floatingHeaders.__floating)
					UI.view.floatingHeaders.__onScroll(null, viewContainerSelector);
			},

			requestFrame: function (viewContainer, viewContainerSelector, self, timestamp) {
				var lastScrollTop = viewContainer.data('requestScrollTop');

				if (lastScrollTop === viewContainer[0].scrollTop)
					return window.requestAnimationFrame(self.bind(null, self));

				viewContainer.data('requestScrollTop', viewContainer[0].scrollTop);

				UI.view.floatingHeaders.__onScroll(null, viewContainerSelector);

				window.requestAnimationFrame(self.bind(null, self));
			},

			add: function (viewContainerSelector, headerSelector, related, offset) {
				UI.event.addCustomEventListener(['popoverOpened', 'pageDidRender'], function (viewContainerSelector, headerSelector, related, offset) {
					var headersInView = UI.view.floatingHeaders.__floating._getWithDefault(viewContainerSelector, {}),
							viewContainer = $(viewContainerSelector, UI.container);

					headersInView[headerSelector] = {
						viewContainer: viewContainer,
						viewContainerOffsetTop: viewContainer.offset().top,
						related: related,
						offset: offset
					};

					if (viewContainer.data('floatingHeaders'))
						return;

					var boundRequestFrame = UI.view.floatingHeaders.requestFrame.bind(null, viewContainer, viewContainerSelector);

					boundRequestFrame(boundRequestFrame);
				}.bind(null, viewContainerSelector, headerSelector, related, offset));
			}
		}
	}
};

UI.events.__keys._createReverseMap();

globalPage.UI = UI;

document.addEventListener('DOMContentLoaded', UI.init, true);

Events.addApplicationListener('popover', UI.events.openedPopover);
