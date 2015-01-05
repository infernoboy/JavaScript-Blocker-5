"use strict";

var UI = {
	__popoverWidthSetting: 'popoverWidth',
	__popoverHeightSetting: 'popoverHeight',
	drag: false,

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
								height = (event.originalEvent.screenY > resizeStartY) ? resizeStartHeight + (event.originalEvent.screenY - resizeStartY) : resizeStartHeight - (resizeStartY - event.originalEvent.screenY);

						UI.resizePopover(Popover.popover.width, height);
					} else {
						var resizeStartX = parseInt(UI.drag.getAttribute('data-resizeStartX'), 10),
								resizeStartWidth = parseInt(UI.drag.getAttribute('data-resizeStartWidth'), 10);

						if (UI.drag.classList.contains('popover-resize-left'))
							var width = (event.originalEvent.screenX < resizeStartX) ? resizeStartWidth - (event.originalEvent.screenX - resizeStartX) : resizeStartWidth + (resizeStartX - event.originalEvent.screenX);
						else
							var width = (event.originalEvent.screenX < resizeStartX) ? resizeStartWidth + (event.originalEvent.screenX - resizeStartX) : resizeStartWidth - (resizeStartX - event.originalEvent.screenX);

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

			.on('mousemove mouseup click', function (event) {
				var timerExisted = Utilities.Timer.remove('timeout', 'showPoppyMenu');

				if (timerExisted)
					$('*[data-poppyMenuWillShow]', UI.container).removeAttr('data-poppyMenuWillShow')
			});

		$(document)
			.on('mousedown', '.popover-resize', function (event) {
				event.preventDefault();

				UI.drag = this;

				this.setAttribute('data-resizeStartX', event.originalEvent.screenX);
				this.setAttribute('data-resizeStartY', event.originalEvent.screenY);
				this.setAttribute('data-resizeStartWidth', Popover.popover.width);
				this.setAttribute('data-resizeStartHeight', Popover.popover.height);
			})

			.on('mousedown', '.select-custom-input + .select-wrapper select:not(.select-cycle)', function (event) {
				event.preventDefault();
			})

			.on('click', '.select-custom-input + .select-wrapper select:not(.select-cycle)', function (event) {
				var input = $(this.parentNode).prev(),
						poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, true),
						options = $('option', this);

				var optionsTemplate = Template.create('poppy', 'select-custom-options', {
					options: options
				});

				$('li', optionsTemplate).click(function (event) {
					input.val(this.getAttribute('data-value')).focus();

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

			.on('change', 'select', function (event) {
				if (this.value === 'select-custom-option') {
					var self = this,
							previousIndex = this.getAttribute('data-currentIndex'),
							originalIndex = this.selectedIndex,
							previousOption = $('option', this).eq(previousIndex),
							option = $('option', this).eq(originalIndex),
							label = $(this).next(),
							offset = label.offset(),
							poppy = new Poppy(Math.floor(offset.left + 7), Math.floor(offset.top + 12), true);

					var template = Template.create('poppy', 'select-custom-option', {
						default: previousOption.attr('data-page') || previousOption.attr('data-domain')
					}, true);

					UI.event.addCustomEventListener('poppyWillClose', function (event) {
						if (event.detail === poppy) {
							event.unbind();

							if (!poppy.useThisOption)
								self.selectedIndex = previousIndex;
						}
					});

					UI.event.addCustomEventListener('poppyDidShow', function (event) {
						if (event.detail === poppy) {
							event.unbind();

							$('.select-custom-option', event.detail.content).focus();
						}
					});

					template
						.on('click', '.select-custom-option-cancel', function () {
							poppy.close();
						})

						.on('click', '.select-custom-option-save', function () {
							var newOptionValue = $.trim($('.select-custom-option', poppy.content).val());

							if (newOptionValue.length) {
								poppy.useThisOption = newOptionValue;

								$('<option />').text(poppy.useThisOption).insertBefore(option);

								self.selectedIndex = originalIndex;
							}

							poppy.close();
						});

					poppy.setContent(template).show();
				} else
					this.setAttribute('data-currentIndex', this.selectedIndex);
			})

			.on('keypress', '.trigger-on-enter', function (event) {
				if (event.which === 3 || event.which === 13)
					$('.on-enter', this.parentNode).click();
			})

			.on('input', 'textarea.render-as-input', function (event) {
				this.value = this.value.replace(/\n/g, '');
			})

			.on('click', '*[data-expander] > *', function (event) {
				if (event.originalEvent.offsetX > this.offsetWidth) {
					var COLLAPSE_HEIGHT = 0,
							COLLAPSE_OFFSET = 3;

					var header = $(this.parentNode),
							groupWrapper = header.next(),
							group = $('> *:first-child', groupWrapper);

					if (group.is(':animated'))
						return;

					var groupWrapperHeight = groupWrapper.outerHeight(true),
							isCollapsed = header.hasClass('group-collapsed'),
							expandingClass = isCollapsed ? 'group-expanding' : 'group-collapsing';

					header.addClass(expandingClass);

					Settings.setItem('expander', !isCollapsed, header.attr('data-expander'));

					groupWrapper.show();

					if (isCollapsed) {
						header.removeClass('group-collapsed');

						var view = header.parents('.ui-view-container:first'),
								offset = groupWrapper.offset(),
								viewOffset = view.offset(),
								bottom = offset.top + groupWrapperHeight;

						if (bottom > view.height() + viewOffset.top)
							view.animate({
								scrollTop: '+=' + (bottom - view.height() - viewOffset.top)
							}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad');
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

							group.css('margin-top', 0);

							Utilities.Element.repaint(document.body);
						});
				}
			});

		UI.event
			.addCustomEventListener('viewWillSwitch', function (event) {		
				if (event.detail.from.id === '#main-views-resource-content') 
					$(event.detail.from.id, UI.view.views).empty();

				if (event.detail.to.id === '#main-views-rule') {
					var a = [
						'<p class="jsb-info">Rule management is not yet available.</p>',
						'<p class="jsb-info"><b>Always</b></p>',
						'<pre>' + JSON.stringify(globalPage.Rules.list.active.rules.all(), null, 1) + '</pre>',
						'<p class="jsb-info"><b>Temporary</b></p>',
						'<pre>' + JSON.stringify(globalPage.Rules.list.temporary.rules.all(), null, 1) + '</pre>'
					].join('');

					event.detail.to.view.find('#rules').html(a);
				} else if (event.detail.to.id === '#main-views-snapshot')
					event.detail.to.view.html('<pre>' + JSON.stringify(globalPage.Rules.list.user.rules.snapshot.snapshots.all(), null, 1) + '</pre>');
			})

			.addCustomEventListener('viewDidSwitch', function (event) {
				if (event.detail.id._startsWith('#main-views'))
					$('#full-toggle', UI.view.viewToolbar).toggleClass('poppy-menu-disabled', $('li[data-view=' + event.detail.id + ']', event.detail.switcher).hasClass('view-switcher-collapses'));
			})

			.addCustomEventListener('disabled', function (event) {
				$('#full-toggle', UI.view.viewToolbar).toggleClass('is-disabled', event.detail);
			})

			.addCustomEventListener('elementWasAdded', function (event) {
				if (event.detail.querySelectorAll) {
					var customSelects = event.detail.querySelectorAll('.select-custom-input + select:not(.select-custom-ready)');

					for (var i = customSelects.length; i--;) {
						if (customSelects[i].classList.contains('select-single')) {
							$(customSelects[i]).prev().hide();

							continue;
						}

						customSelects[i].classList.add('select-custom-ready');

						customSelects[i].previousElementSibling.value = customSelects[i].value;

						$(customSelects[i])
							.next()
							.addBack()
							.wrapAll('<div class="select-wrapper"></div>')
							.end()
							.parent()
							.parent()
							.wrapInner('<div class="select-custom-wrapper"></div>');

						if (!customSelects[i].classList.contains('select-cycle'))
							customSelects[i].selectedIndex = -1;
					}
				}
			})

			.addCustomEventListener('elementWasAdded', function (event) {
				if (event.detail.querySelectorAll) {
					var headers = event.detail.querySelectorAll('*[data-expander]');

					for (var i = headers.length; i--;) {
						if (headers[i].classList.contains('header-expander-ready'))
							continue;

						headers[i].classList.add('header-expander-ready');

						$(headers[i])
							.toggleClass('group-collapsed', !!Settings.getItem('expander', headers[i].getAttribute('data-expander')))
							.find('> *')
							.attr({
								'data-i18n-show': _('expander.show'),
								'data-i18n-hide': _('expander.hide')
							})
							.end()
							.next()
							.wrapAll('<div class="collapsible-group-wrapper"></div>')
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
		__default: '#main-views-page',

		init: function () {
			this.views = $('#main-views', UI.container);
			this.viewContainer = $('#view-container', UI.container);
			this.viewToolbar = $('#view-toolbar', this.viewContainer);
			this.viewSwitcher = $('.view-switcher', this.viewToolbar);

			UI.container
				.on('click', '*[data-poppy] .poppy-menu-target', function (event) {
					UI.view.showPoppyMenu(this, event);
				})

				.on('mousedown', '*[data-poppy]', function (event) {
					Utilities.Timer.timeout('showPoppyMenu', function (event, tab) {						
						UI.view.showPoppyMenu(tab.querySelector('.poppy-menu-target'), event, true);
					}, 200, [event, this]);
				})

				.on('click', '#full-toggle', function () {
					if (!UI.event.trigger('willDisable', window.globalSetting.disabled))
						globalPage.Command.toggleDisabled();
				})

				.on('click', '#open-menu', function (event) {
					if (this.classList.contains('unread-error')) {
						this.classList.remove('unread-error');

						var consolePoppy = new Poppy(event.pageX, event.pageY, true, 'console');

						consolePoppy
							.setContent(Template.create('poppy', 'console'))
							.stayOpenOnScroll()
							.show();

						return;
					}

					var poppy = new Poppy(event.pageX, event.pageY, true, 'main-menu');

					poppy.setContent(Template.create('poppy', 'main-menu')).stayOpenOnScroll().show();
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
					viewContainer.trigger('scroll');

				onComplete();
			} else
				viewContainer
					.animate({
						scrollTop: 0,
						scrollLeft: 0
					}, 225 * window.globalSetting.speedMultiplier, onComplete)
					.trigger('scroll');
		},

		switchTo: function (viewID) {
			var switchToView = $(viewID, UI.view.views);

			if (!switchToView.length)
				throw new Error('view not found - ' + viewID);

			var viewContainer = switchToView.parents('.ui-view-container:first');

			if (!viewContainer.length)
				throw new Error('not a view - ' + viewID);

			var activeID = viewContainer.attr('data-activeView');

			if (activeID === viewID)
				return UI.view.toTop(viewContainer, false, function () {
					UI.event.trigger('viewAlreadyActive', activeID)
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

			viewContainer.trigger('scroll');

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
					offset = self.offset().left,
					rightOffset = offset + width,
					inRange = (event.pageX > rightOffset - 9 && event.pageX < rightOffset + 3);

			if (inRange || force) {
				UI.event.addCustomEventListener('viewWillScrollToTop', function (event) {
					event.preventDefault();
				}, true);

				if (!(force && inRange)) {
					event.stopPropagation();

					if (!self.parent().hasClass('active-view') && force)
						UI.event.addCustomEventListener('viewWillSwitch', function (event) {
							event.preventDefault();
						}, true);

					var poppyName = self.parent().attr('data-poppy'),
							poppy = new Poppy(event.pageX, event.pageY, true, poppyName);

					poppy.setContent(Template.create('poppy', poppyName)).stayOpenOnScroll();

					if (force)
						UI.event.addCustomEventListener('poppyWillClose', function (event) {
							if (event.detail === poppy) {
								event.unbind();
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
							UI.event.addCustomEventListener('willDisable', function (event) {
								event.preventDefault();
							}, true);

						setTimeout(function (poppy, menuHolder) {
							UI.event.addCustomEventListener('poppyDidShow', function () {
								menuHolder.removeAttr('data-poppyMenuWillShow', 1);
							}, true);

							poppy.show();
						}, 0, poppy, menuHolder);
					}
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
				UI.event.addCustomEventListener('popoverOpened', function (viewContainerSelector, headerSelector, related, offset) {
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
			
					viewContainer.data('floatingHeaders', true).scroll(Utilities.throttle(UI.view.floatingHeaders.__onScroll, 40, [viewContainerSelector]));
				}.bind(null, viewContainerSelector, headerSelector, related, offset));
			}
		}
	}
};

UI.events.__keys._createReverseMap();

globalPage.UI = UI;

document.addEventListener('DOMContentLoaded', UI.init, true);
