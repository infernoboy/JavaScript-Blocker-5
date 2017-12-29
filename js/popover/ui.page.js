/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

UI.Page = {
	__forceRuleColorTemplate: 'rgba(252, 240, 255, {0})',
	__forceRuleColorTemplateDarkMode: 'rgba(60, 40, 60, {0})',
	__rendering: false,

	__renderPage: function (page) {
		if (!Popover.visible() || UI.Page.__rendering || !UI.Page.view.is('.active-view') || UI.event.trigger('pageWillRender', page))
			return;

		UI.Page.__rendering = true;

		UI.Page.modalInfo.hide();

		UI.Page.hideSwitcherBadge();

		var pageInfo = page.tree(),
			renderedSections = $('<div>');

		pageInfo.private = page.tab.private;

		renderedSections.append(Template.create('page', 'host-section', pageInfo));

		for (var frameID in pageInfo.frames) {
			pageInfo.frames[frameID].private = page.tab.private;
			
			renderedSections.append(Template.create('page', 'host-section', pageInfo.frames[frameID]));
		}

		var sections = renderedSections.children();

		$('.page-host-item-edit-container', renderedSections).hide();

		sections.each(function () {
			var	hiddenCount = 0,
				hiddenCountText = $('.page-host-hidden-count', this);

			$('.page-host-items', this).each(function () {
				var items = $(this);

				if (!items.children().length)
					items.prev().addBack().remove();
				else
					$('.page-host-item', this).each(function () {
						var resources = $(this).data('resources', {}).data('resources'),
							resourceIDs = JSON.parse(this.getAttribute('data-resourceIDs'));

						for (var i = resourceIDs.length; i--;)
							resources[resourceIDs[i]] = pageInfo._findKey(resourceIDs[i]);
					});
			});

			$('.page-host-items-hidden', this).each(function () {
				hiddenCount += parseInt(this.value, 10);
			});

			if (hiddenCount)
				hiddenCountText.text(_('view.page.header.' + (hiddenCount === 1 ? 'hidden_item' : 'hidden_items'), [hiddenCount]));
			else
				hiddenCountText.addClass('jsb-hidden');

			$(this).data('tab', page.tab);
		});

		UI.Page.events.bindSectionEvents(sections, page, pageInfo);

		UI.Page.stateContainer
			.empty()
			.data('page', page)
			.append(sections);

		UI.Page.__rendering = false;

		UI.event.trigger('pageDidRender', page);

		FloatingHeader.adjustAll();

		setTimeout(function (sections) {
			sections.find('.page-host-editor-kind').trigger('change');
		}, 150, sections);
	},

	init: function () {
		UI.Page.view = $('#main-views-page', UI.view.views);
		UI.Page.toolbarItem = $('*[data-view="#main-views-page"]', UI.view.viewSwitcher);
		UI.Page.badge = $('.view-switcher-item-badge', UI.Page.toolbarItem);
		UI.Page.modalInfo = $('#page-modal-info', UI.Page.view);
		UI.Page.stateContainer = $('#page-state-container', UI.Page.view);

		new FloatingHeader(UI.view.views, '.page-host-header', null, -1, true);

		UI.container
			.on('click', '.show-resource-source', function (event) {
				var url = this.getAttribute('data-url'),
					kind = this.getAttribute('data-kind'),
					protocol = Utilities.URL.protocol(url);

				if (kind === 'image') {
					var imageContainer = Template.create('page', 'resource-image', {
						url: decodeURIComponent(url)
					});

					$('img', imageContainer).load(function () {
						imageContainer.removeClass('loading');
					});

					UI.Page.showResource(imageContainer);

					return;
				}

				if (protocol === 'data:' || protocol === 'javascript:') {
					var script = protocol === 'data:' ? url.substr(url.indexOf(',') + 1) : url.substr(url.indexOf(':') + 1);

					UI.Page.showResource(Utilities.beautifyScript(script));

					return;
				}

				var loadingPoppy = Poppy.createLoadingPoppy(event.pageX, event.pageY, false, function (loadingPoppy) {
					var xhr = $.ajax({
						dataType: 'text',
						url: url
					});

					xhr
						.done(function (source) {
							UI.Page.showResource(Utilities.beautifyScript(source));
						})

						.fail(function (result) {
							loadingPoppy.setContent(result.statusText + ' - ' + result.status);
						});
				});

				loadingPoppy.setContent(_('view.page.item.info.loading')).show(true);
			});
		
		var forceClickPageItems = new ForceClickElement(UI.Page.view, '.page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-source, .page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-description, .page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-will-create-rule');

		forceClickPageItems.setThreshold(0.5, 0.05).modifyNormalizedForce(0, 1);

		forceClickPageItems.event
			.addCustomEventListener('forceClickCancelled', function () {
				Poppy.closeAll();

				$('.page-host-item', UI.Page.view).css('background', '');
			})

			.addCustomEventListener('forceChange', function (event) {
				var target = $(event.detail.target),
					section = target.parents('.page-host-section'),
					colorTemplate = Settings.getItem('darkMode') ? UI.Page.__forceRuleColorTemplateDarkMode : UI.Page.__forceRuleColorTemplate;

				if (section.hasClass('page-host-editing') || globalPage.Rules.isLocked())
					return;
				
				target
					.parents('.page-host-item')
					.css('background', event.detail.normalizedForce > 0.6 ? colorTemplate._format([event.detail.normalizedForce - 0.3]) : '');

				if (!Poppy.poppyWithScriptNameExist('force-click-resource')) {
					var poppy = new Poppy(event.pageX, event.pageY, true, 'force-click-resource');

					poppy.scaleWithForce(forceClickPageItems).setContent(_('force_click_add_rule')).show();
				}
			})

			.addCustomEventListener('forceDown', function (event) {
				var target = $(event.detail.target),
					section = target.parents('.page-host-section'),
					colorTemplate = Settings.getItem('darkMode') ? UI.Page.__forceRuleColorTemplateDarkMode : UI.Page.__forceRuleColorTemplate;

				if (section.hasClass('page-host-editing') || globalPage.Rules.isLocked())
					return;

				target
					.parents('.page-host-item')
					.css('background', colorTemplate._format([1]));

				Poppy.closeAll();

				target.click();

				UI.Page.section.createRules(section, true);
			});

		var forceClickPageKinds = new ForceClickElement(UI.Page.view, '.page-host-column .page-host-kind h4');

		forceClickPageKinds
			.setThreshold(0.5, 0.05)
			.modifyNormalizedForce(0, 1);

		forceClickPageKinds.event
			.addCustomEventListener('forceClickCancelled', function (event) {
				Poppy.closeAll();

				$(event.detail.target).parents('.page-host-section').find('.page-host-item').css('background', '');
			})

			.addCustomEventListener('forceChange', function (event) {
				if (event.detail.target.nodeName.toUpperCase() !== 'H4' || globalPage.Rules.isLocked())
					return;

				var target = $(event.detail.target),
					section = target.parents('.page-host-section'),
					colorTemplate = Settings.getItem('darkMode') ? UI.Page.__forceRuleColorTemplateDarkMode : UI.Page.__forceRuleColorTemplate;

				if (section.hasClass('page-host-editing'))
					return;

				target
					.parent()
					.next()
					.find('.page-host-item')
					.css('background', event.detail.normalizedForce > 0.6 ? colorTemplate._format([event.detail.normalizedForce - 0.3]) : '');

				if (!Poppy.poppyWithScriptNameExist('force-click-resource')) {
					var poppy = new Poppy(event.pageX, event.pageY, true, 'force-click-resource');

					poppy.scaleWithForce(forceClickPageKinds).setContent(_('force_click_add_kind_rules')).show();
				}
			})

			.addCustomEventListener('forceDown', function (event) {
				if (event.detail.target.nodeName.toUpperCase() !== 'H4' || globalPage.Rules.isLocked())
					return;

				var section = $(event.detail.target).parents('.page-host-section');

				if (section.hasClass('page-host-editing'))
					return;

				Poppy.closeAll();

				$(event.detail.target).click();

				UI.Page.section.createRules(section, true);
			});

		var foreClickHostCount = new ForceClickElement(UI.Page.view, '.page-host-host-count');

		foreClickHostCount.setThreshold(0.5, 0.05).modifyNormalizedForce(0, 1);

		foreClickHostCount.event
			.addCustomEventListener('forceClickCancelled', function () {
				Poppy.closeAll();
			})

			.addCustomEventListener('forceChange', function (event) {
				var isShowingResourceURLs = Settings.getItem('showResourceURLs') || Settings.getItem('temporarilyShowResourceURLs');

				if (!isShowingResourceURLs && !Poppy.poppyWithScriptNameExist('force-click-host-count')) {
					var poppy = new Poppy(event.pageX, event.pageY, true, 'force-click-host-count');

					poppy.scaleWithForce(foreClickHostCount).setContent(_(Settings.getItem('showResourceURLsOnNumberClick') ? 'force_click_host_count_popup' : 'force_click_host_count_switch')).show();
				}
			});
	},

	showSwitcherBadge: function (text) {
		UI.Page.badge.text(text).css('display', 'inline-block');
	},

	hideSwitcherBadge: function () {
		UI.Page.badge.hide();
	},

	showResource: function (resource) {
		$('#main-views-resource-content', UI.view.views).empty().append(resource);

		Poppy.closeAll();

		UI.view.switchTo('#main-views-resource-content');
	},

	clear: function () {
		UI.Page.stateContainer.empty();
	},

	canRender: function () {
		if (!UI.Page.view || Settings.RESTART_REQUIRED)
			return false;

		if (Settings.getItem('createRulesOnClick') && $('.page-host-item-edit-check:checked', UI.Page.view).length)
			return false;

		return !UI.Page.view.is('.active-view') || (UI.view.views.scrollTop() < 10 && !UI.drag && !Poppy.poppyDisplayed() && $('.page-host-editing', UI.Page.view).length === 0 && $('.advanced-rule-created', UI.Page.view).length === 0);
	},

	showModalInfo: function (info) {
		UI.Page.clear();

		UI.Page.modalInfo
			.empty()
			.append(Template.create('page', 'modal-info', {
				info: info
			}))
			.show();

		UI.Page.hideSwitcherBadge();
	},

	throttledRequestFromActive: Utilities.throttle(function () {
		globalPage.Page.requestPageFromActive();
	}, 250, null, true),

	renderPage: Utilities.throttle(function (page) {
		if (window.globalSetting.disabled)
			return;

		if (UI.Page.canRender())
			UI.onReady(UI.Page.__renderPage.bind(UI.Page, page));
		else {
			UI.Page.showSwitcherBadge('...');

			Utilities.Timer.timeout('renderPage', UI.Page.throttledRequestFromActive, 1000);
		}
	}, 200, null, true),

	section: {
		toggleEditMode: function (section, force, quick, forceAdvanced) {
			if (globalPage.Rules.isLocked())
				return;

			var pageHostEditor = section.find('.page-host-editor').stop(true, true),
				wasInEditMode = pageHostEditor.is(':visible');

			if (forceAdvanced && Settings.getItem('useSimplePageEditor'))
				$('.page-host-editor-advanced:not(.is-advanced)', pageHostEditor).toggleClass('jsb-hidden').addClass('is-advanced');

			if ((wasInEditMode && force === true) || (!wasInEditMode && force === false))
				return;

			var editButtons = $('.page-host-edit .poppy-menu-target-text', section),
				items = $('.page-host-columns .page-host-item', section).find('.page-host-item-container, .page-host-item-edit-container');

			editButtons.text(wasInEditMode ? _('view.page.host.edit') : _('view.page.host.done'));

			if (quick)
				pageHostEditor.toggle().css('margin-top', 0);
			else {
				var viewContainer = UI.Page.view.parents('.ui-view-container'),
					viewScrollTop = viewContainer.scrollTop();

				if (wasInEditMode)
					pageHostEditor.marginSlideUp(310 * window.globalSetting.speedMultiplier, 'easeOutQuad');
				else {
					pageHostEditor.marginSlideDown(310 * window.globalSetting.speedMultiplier, 'easeOutQuad');

					$('.page-host-editor-which-items', section).trigger('change');
				}

				var editorHeight = pageHostEditor.outerHeight();

				if (viewScrollTop !== undefined && viewScrollTop > editorHeight)
					viewContainer.animate({
						scrollTop: viewScrollTop + editorHeight
					}, 310 * window.globalSetting.speedMultiplier, 'easeOutQuad');
			}
		
			items.toggle();

			section.toggleClass('page-host-editing');

			UI.event.trigger(wasInEditMode ? 'sectionSwitchedOutOfEditMode' : 'sectionSwitchedToEditMode', section);
		},

		createRules: function (section, hideInstantly) {
			if (!hideInstantly && section.find('.page-host-editor').is(':not(:visible)'))
				return;

			var ruleDomain;

			var ruleWasCreated = false,
				Rules = globalPage.Rules,
				ruleKindPrefix = section.find('.page-host-editor-when-framed').is(':checked') ? 'framed:' : '',
				notWhere = section.find('.page-host-editor-where-not').is(':checked'),
				ruleList = Rules.list[section.find('.page-host-editor-list').val()],
				addRule = notWhere ? ruleList.addNotDomain : ruleList.addDomain,
				ruleType = section.find('.page-host-editor-kind').val(),
				ruleWhere = section.find('.page-host-editor-where'),
				ruleWhereValue = ruleWhere.val(),
				ruleWhichItems = section.find('.page-host-editor-which-items').val(),
				items = section.find('.page-host-columns .page-host-item:not(.page-host-item-disabled)');

			if (ruleType === 'hide' || ruleType === 'show')
				ruleKindPrefix = 'hide:' + ruleKindPrefix;

			if (ruleWhereValue === 'domain-all')
				ruleDomain = '*';
			else if (ruleWhereValue._startsWith('domain'))
				ruleDomain = $('option', ruleWhere).eq(ruleWhere[0].selectedIndex).attr('data-domain');
			else if (ruleWhereValue._startsWith('page')) {
				addRule = notWhere ? ruleList.addNotPage : ruleList.addPage;

				var ruleOption = $('option', ruleWhere).eq(ruleWhere[0].selectedIndex),
					rulePage = ruleOption.attr('data-page')._escapeRegExp();

				if (ruleOption.is(':not(:last-child)'))
					rulePage += '.*';

				ruleDomain = '^' + rulePage + '$';
			} else {
				if (Rules.isRegExp(ruleWhereValue))
					addRule = notWhere ? ruleList.addNotPage : ruleList.addPage;

				ruleDomain = ruleWhereValue;
			}

			UI.Locker
				.showLockerPrompt('disable', ruleType !== 'disable' && ruleType !== 'enable')
				.then(function () {
					var ruleAction;

					if (ruleType === 'disable' || ruleType === 'enable') {
						ruleAction = ruleType === 'disable' ? 0 : 1;

						addRule(ruleKindPrefix + 'disable', ruleDomain, {
							rule: '*',
							action: ruleAction
						});

						ruleWasCreated = true;

						setTimeout(function () {
							globalPage.Page.requestPageFromActive();
						}, 1000);
					} else if (ruleWhichItems === 'items-all') {
						addRule(ruleKindPrefix + '*', ruleDomain, {
							rule: '*',
							action: (ruleType === 'block' || ruleType === 'hide') ? 0 : 1
						});

						ruleWasCreated = true;
					} else if (ruleWhichItems === 'items-of-kind') {
						var checked = $('.page-host-editor-kinds input:checked', section);

						ruleAction = (ruleType === 'block' || ruleType === 'hide') ? 0 : 1;

						checked.each(function () {
							addRule(ruleKindPrefix + this.getAttribute('data-kind'), ruleDomain, {
								rule: '*',
								action: ruleAction
							});

							ruleWasCreated = true;
						});
					} else
						items.each(function () {
							var item = $(this),
								isBlocked = item.parents('.page-host-column').is('.page-host-column-blocked'),
								ruleAction = isBlocked ? 1 : 0,
								checked = item.find('.page-host-item-edit-check');

							if (!checked.is(':checked'))
								return;

							var itemSource = item.find('.select-custom-input, .page-host-item-edit-select'),
								itemSourceVal = itemSource.val(),
								kind = item.parents('.page-host-items').attr('data-kind'),
								protocol = item.attr('data-protocol'),
								resources = item.data('resources');

							if (['block/allow', 'block', 'allow', 'hide', 'show']._contains(ruleType)) {
								var hasAffect;

								if (ruleType === 'block' || ruleType === 'hide')
									ruleAction = 0;
								else if (ruleType === 'allow' || ruleType === 'show')
									ruleAction = 1;

								var rule = addRule(ruleKindPrefix + kind, ruleDomain, {
									rule: (protocol === 'none:' || itemSource.is('.select-custom-input')) ? itemSourceVal : protocol + '|' + itemSourceVal,
									action: ruleAction
								});

								/* eslint-disable */
								for (var resourceID in resources)
									do {
										hasAffect = ruleList.hasAffectOnResource(rule, resources[resourceID], ['hide', 'show']._contains(ruleType));

										if (hasAffect.hasAffect || !hasAffect.detail)
											break;

										hasAffect.detail.ruleList.__remove(false, hasAffect.detail.ruleType, hasAffect.detail.ruleKind, hasAffect.detail.domain, hasAffect.detail.rule);
									} while (true);
								/* eslint-enable */

								ruleWasCreated = true;
							} else
								throw new Error('not yet supported');
						});

					UI.Page.section.toggleEditMode(section, false, !!hideInstantly);

					var tab = UI.Page.stateContainer.data('page').tab;

					globalPage.Rule.event.addCustomEventListener('fixedCanLoadCache', function () {
						MessageTarget({
							target: tab
						}, ruleWasCreated ? 'reload' : 'sendPage');
					}, true);

					Utilities.Timer.timeout(tab, function () {
						UI.view.toTop(UI.view.views);

						$('.page-host-item-edit-check', UI.Page.view).prop('checked', false);
					}, 310);
				});
		}
	},

	events: {
		popoverOpened: function () {
			if (!Poppy.modalOpen)
				UI.Page.clear();

			if (Settings.getItem('temporarilyShowResourceURLs'))
				Settings.setItem('temporarilyShowResourceURLs', false);

			globalPage.Page.requestPageFromActive();
		},

		viewAlreadyActive: function (event) {
			if (event.detail.id === '#main-views-page') {
				UI.Page.clear();

				globalPage.Page.requestPageFromActive();
			}
		},

		viewWillSwitch: function (event) {
			UI.event.addCustomEventListener('UIReady', function () {
				if (event.detail.to.view[0] === UI.Page.view[0])
					globalPage.Page.requestPageFromActive();
			}, true);
		},

		viewDidSwitch: function (event) {
			UI.event.addCustomEventListener('UIReady', function () {
				if (event.detail.view[0] !== UI.Page.view[0])
					UI.Page.hideSwitcherBadge();
			}, true);
		},

		popoverDidResize: function () {
			FloatingHeader.adjustAll();
		},

		sectionSwitchedOutOfEditMode: function (event) {
			$('.page-host-item', event.detail).removeClass('page-host-item-disabled');
			$('.page-host-kind', event.detail).removeClass('page-host-kind-disabled');
			$('.page-host-columns input[type="checkbox"]', event.detail).prop('checked', false);

			setTimeout(function () {
				FloatingHeader.adjustAll();
			}, 225 * window.globalSetting.speedMultiplier);
		},

		selectCustomOptionChanged: function (event) {
			var input = $(event.detail),
				editContainer = input.parents('.page-host-item-edit-container');

			if (editContainer.length)
				$('.page-host-item-edit-check', editContainer).prop('checked', true).change();
		},

		awaitPageFromTabTimeout: function (event) {
			var lastPage = globalPage.Page.lastPageForTab(event.detail);

			if (lastPage) {
				lastPage.badgeState(Settings.getItem('toolbarDisplay'));

				UI.event.addCustomEventListener('pageDidRender', function (event) {
					if (event.detail === lastPage) {
						var pageToolbar = $('li[data-view="#main-views-page"]', UI.view.viewSwitcher),
							pageToolbarOffset = pageToolbar.offset().left,
							pageToolbarWidth = pageToolbar.outerWidth(),
							pageToolbarHeight = pageToolbar.outerHeight(),
							poppy = new Poppy(Math.floor(pageToolbarOffset + pageToolbarWidth / 2), Math.floor(pageToolbarHeight) - 6);

						poppy.setContent(_('view.page.from_cache')).stayOpenOnScroll().show();

						UI.event.addCustomEventListener('awaitPageFromTabDone', function () {
							poppy.close();
						}, true);
					}
				}, true);

				UI.Page.renderPage(lastPage);
			} else if (UI.Page.canRender())
				UI.Page.showModalInfo(_('view.page.no_info'));
		},

		disabled: function (event) {
			UI.event.addCustomEventListener('UIReady', function () {
				UI.Page.clear();

				if (event.detail)
					UI.Page.showModalInfo(_('view.page.full_disable'));

				UI.Page.stateContainer.toggleClass('jsb-hidden', event.detail);
			}, true);
		},

		bindSectionEvents: function (sections, page, pageInfo) {
			sections
				.on('click', '.page-host-first-visit-keep-blocked, .page-host-first-visit-unblock', function () {
					var thisPageInfo = pageInfo,
						section = $(this).parents('.page-host-section'),
						pageID = section.attr('data-id');

					if (pageID !== pageInfo.id)
						thisPageInfo = pageInfo.frames[pageID];

					$(this).siblings().addBack().prop('disabled', true);

					if (this.className._contains('keep-blocked'))
						globalPage.Page.blockFirstVisit(thisPageInfo.blockFirstVisitStatus.host, true, page.tab.private);
					else
						globalPage.Page.unblockFirstVisit(thisPageInfo.blockFirstVisitStatus.host, page.tab.private);

					UI.Page.section.toggleEditMode(section, false);

					UI.view.toTop(UI.view.views);

					globalPage.Rule.event.addCustomEventListener('fixedCanLoadCache', function () {
						MessageTarget({
							target: page.tab
						}, 'reload');
					}, true);
				})

				.on('click', '.page-host-first-visit .more-info', function (event, forceClickEvent, forceClick) {
					if (forceClickEvent)
						event = forceClickEvent;

					var poppy = new Poppy(event.pageX, event.pageY, true);

					poppy.scaleWithForce(forceClick);

					poppy.setContent(Template.create('main', 'jsb-readable', {
						string: _('first_visit.unblock_more_info')
					})).show();
				})

				.on('click', '.page-host-header', function (event) {
					if (event.target.classList.contains('page-host-edit') || event.target.classList.contains('poppy-menu-target'))
						return;

					var section = $(this).parents('.page-host-section');

					section.scrollIntoView(UI.view.views, 225 * window.globalSetting.speedMultiplier, section.is(':first-child') ? 0 : 2);
				})

				.on('click', '.page-host-editor-advanced-options', function () {
					var editor = $(this).parents('.page-host-editor');

					$('.page-host-editor-advanced:not(.is-advanced)', editor).toggleClass('jsb-hidden').addClass('is-advanced');

					this.classList.add('jsb-hidden');
				})

				.on('change', '.page-host-editor-kind', function () {
					var enableOptions;

					var editor = $(this).parents('.page-host-editor'),
						whichItems = $('.page-host-editor-which-items', editor),
						selectedIndex = whichItems[0].selectedIndex,
						newSelectIndex = 0,
						options = $('option', whichItems);

					options.prop('disabled', true);

					if (this.value === 'disable' || this.value === 'enable')
						enableOptions = options.filter('[value="jsb"]');
					else if (this.value === 'block/allow')
						enableOptions = options.filter('[value="items-checked"]');
					else if (this.value === 'block' || this.value === 'allow') {
						enableOptions = options.filter('[value="items-checked"], [value="items-all"], [value="items-of-kind"]');

						newSelectIndex = 2;
					}	else if (this.value === 'hide' || this.value === 'show')
						enableOptions = options.not('[value="jsb"]');

					enableOptions.prop('disabled', false);

					if (options.eq(selectedIndex).prop('disabled') || newSelectIndex)
						enableOptions.eq(newSelectIndex).prop('selected', true);

					whichItems.trigger('change');
				})

				.on('change', '.page-host-editor-which-items', function () {
					var section = $(this).parents('.page-host-section'),
						kinds = section.find('.page-host-editor-kinds');

					if (this.value === 'items-of-kind')
						kinds.stop(true).slideDown(225 * window.globalSetting.speedMultiplier);
					else
						kinds.stop(true).slideUp(225 * window.globalSetting.speedMultiplier);

					$('.page-host-columns .page-host-item', section).toggleClass('page-host-item-disabled', this.value !== 'items-checked');
					$('.page-host-columns .page-host-kind', section).toggleClass('page-host-kind-disabled', this.value !== 'items-checked');

					$('.page-host-editor-where', section).trigger('change');
				})

				.on('change', '.page-host-editor-where', function () {
					var section = $(this).parents('.page-host-section'),
						whichItems = $('.page-host-editor-which-items', section),
						items = $('.page-host-columns .page-host-item', section),
						option = $('option', this).eq(this.selectedIndex),
						optgroup = option.parent();

					if (whichItems.val() !== 'items-checked')
						return;

					if (optgroup.is('optgroup')) {
						var resources,
							resourceID;

						var location = optgroup.attr('data-location');

						items.each(function () {
							resources = $(this).data('resources');

							for (resourceID in resources) {
								if (resources[resourceID].fullLocation === location) {
									this.classList.remove('page-host-item-disabled');

									break;
								}

								this.classList.add('page-host-item-disabled');
							}
						});
					} else
						items.removeClass('page-host-item-disabled');
				})

				.on('click', '.page-host-toggle-disable', function (event) {
					var self = this;

					UI.Locker
						.showLockerPrompt('disable')
						.then(function () {
							self.disabled = true;

							event.stopImmediatePropagation();

							var thisPageInfo = pageInfo,
								section = $(self).parents('.page-host-section'),
								pageID = section.attr('data-id'),
								tab = UI.Page.stateContainer.data('page').tab;

							if (pageID !== pageInfo.id)
								thisPageInfo = pageInfo.frames[pageID];

							var ruleList = thisPageInfo.private || Settings.getItem('quickDisableTemporary') ? globalPage.Rules.list.temporary : globalPage.Rules.list.user;
					
							ruleList.addDomain('disable', thisPageInfo.host, {
								rule: '*',
								action: section.attr('data-disabled') === '1' ? 1 : 0
							});

							globalPage.Rule.event.addCustomEventListener('fixedCanLoadCache', function () {
								MessageTarget({
									target: tab
								}, 'reload');
							}, true);
						});
				})

				.on('click', '.page-host-create-rules', function (event) {
					event.stopImmediatePropagation();

					$('.page-host-section.page-host-editing', UI.Page.view).each(function () {
						UI.Page.section.createRules($(this));
					});
				})

				.on('click webkitmouseforcedown', '.page-host-host-count', function (event) {	
					var isShowingResourceURLs = Settings.getItem('showResourceURLs') || Settings.getItem('temporarilyShowResourceURLs'),
						showResourceURLsOnNumberClick = Settings.getItem('showResourceURLsOnNumberClick'),
						isForceClick = event.type === 'webkitmouseforcedown';

					if (isForceClick) {
						Poppy.preventNextCloseAll();

						showResourceURLsOnNumberClick = !showResourceURLsOnNumberClick;
					}

					if (!isShowingResourceURLs && showResourceURLsOnNumberClick) {
						UI.Page.clear();

						return Settings.setItem('temporarilyShowResourceURLs', true);
					}

					var item = $(this).parents('.page-host-item'),
						resources = item.data('resources'),
						poppy = new Poppy(EventListener.eventInfo.pageX, EventListener.eventInfo.pageY, true),
						items = [];

					for (var resourceID in resources)
						items.push({
							kind: resources[resourceID].kind,
							baseSource: resources[resourceID].baseSource,
							fullSource: resources[resourceID].fullSource,
							meta: resources[resourceID].meta && resources[resourceID].meta._isEmpty() ? undefined : resources[resourceID].meta
						});

					poppy.setContent(Template.create('poppy.page', 'resource-list', {
						items: items
					}));

					poppy.show();
				})

				.on('click', '.page-host-item-info', function (event, forceClickEvent, forceClick) {
					if (forceClickEvent)
						event = forceClickEvent;

					var item = $(this).parents('.page-host-item');

					var poppy = new Poppy(event.pageX, event.pageY, true, 'item-info');

					poppy.scaleWithForce(forceClick);

					poppy.isAllowed = item.parents('.page-host-column').is('.page-host-column-allowed');
					poppy.resources = item.data('resources');

					poppy.setContent(Template.create('poppy.page', 'item-info', {
						kind: item.parents('.page-host-items').attr('data-kind'),
						action: parseInt(item.attr('data-action'), 10),
						source: item.attr('data-source'),
						isAllowed: poppy.isAllowed
					}));

					if (poppy.content.is(':empty'))
						poppy.setContent(Template.create('main', 'jsb-readable', {
							string: _('view.page.item.info.no_info')
						}));

					poppy.show();
				})

				.on('click', '.page-host-edit, .page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-source, .page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-description, .page-host-columns .page-host-item:not([data-action="-11"]) .page-host-item-will-create-rule', function (event) {
					if (Poppy.Menu.event.trigger('pressAndHoldSucceeded') || Poppy.Menu.event.trigger('forceClicked'))
						return;

					var self = $(this),
						isItem = self.is('.page-host-item-source') || self.is('.page-host-item-description') || self.is('.page-host-item-will-create-rule'),
						pageHostItem = self.parents('.page-host-item'),
						createRulesOnClick = (!event.isTrigger && isItem && Settings.getItem('createRulesOnClick'));

					self.removeClass('force-click-began');

					var section = self.parents('.page-host-section');

					if (section.is('.page-host-editing') && isItem)
						return;

					if (globalPage.Rules.isLocked())
						return (new Poppy(event.pageX, event.pageY, true))
							.setContent(Template.create('main', 'jsb-readable', {
								string: _('view.page.host.rules_locked')
							}))
							.show();

					if (isItem) {
						var checkbox = $('.page-host-item-edit-check', pageHostItem),
							wasChecked = checkbox.prop('checked');

						checkbox
							.prop('checked', createRulesOnClick ? !wasChecked : true)
							.change();

						$('.page-host-editor-kind', section)
							.find('option:first')
							.prop('selected', true)
							.end()
							.change();
					}

					if (createRulesOnClick) {
						var colorTemplate = Settings.getItem('darkMode') ? UI.Page.__forceRuleColorTemplateDarkMode : UI.Page.__forceRuleColorTemplate;

						pageHostItem
							.css('background', wasChecked ? '' : colorTemplate._format([1]))
							.find('.page-host-item-will-create-rule')
							.toggleClass('is-pending', !wasChecked);

						Utilities.Timer.timeout('createRulesOnClick' + section.attr('data-id'), function (section) {
							UI.Page.section.createRules(section, true);
						}, 1500, [section]);
					}	else
						UI.Page.section.toggleEditMode(section);
				})

				.on('click', '.page-host-unblocked .page-host-items[data-kind="script"] .page-host-item-source', function (event) {
					var item = $(this).parents('.page-host-item'),
						resources = item.data('resources');
					
					var loadingPoppy = Poppy.createLoadingPoppy(event.pageX, event.pageY, true, function (loadingPoppy) {
						for (var resourceID in resources) {
							$('#main-views-resource-content', UI.view.views).empty().append(Utilities.beautifyScript(resources[resourceID].fullSource));

							UI.view.switchTo('#main-views-resource-content');

							break;
						}

						loadingPoppy.close();
					});

					loadingPoppy.setContent(_('poppy.beautifying_script')).show(true);
				})

				.on('mousedown', '.page-host-item-edit-container .select-single', function (event) {
					event.preventDefault();
				})

				.on('click', '.page-host-item-edit-container .select-single', function () {
					var check = $(this).parents('.page-host-item-edit-container').find('.page-host-item-edit-check');

					check.prop('checked', !check.prop('checked')).change();
				})

				.on('change', '.page-host-item-edit-check', function () {
					var items = $(this).parents('.page-host-items');

					Utilities.Timer.timeout(items[0], function (items) {
						var totalChecks = $('.page-host-item-edit-check', items),
							checked = totalChecks.filter(':checked'),
							selectAll = items.parent().prev().find('.page-host-kind-select-all');

						selectAll.toggleClass('select-some', totalChecks.length !== checked.length);

						if (!checked.length)
							selectAll.prop('checked', false);
					}, 100, [items]);
				})

				.on('change input', '.page-host-item-edit-select, .page-host-item-edit-container .select-custom-input', function () {
					var check = $(this).parents('.page-host-item-edit-container').find('.page-host-item-edit-check');

					check.prop('checked', true).change();
				})

				.on('change', '.page-host-kind-select-all', function () {
					if (this.classList.contains('select-some')) {
						this.classList.remove('select-some');

						this.checked = true;

						return $(this).change();
					}

					$(this).parent().parent().next()
						.find('.page-host-item-edit-check')
						.prop('checked', this.checked)
						.change();
				})

				.on('click', '.page-host-column .page-host-items-quick-action', function (event) {
					this.disabled = true;

					event.stopImmediatePropagation();

					var thisPageInfo = pageInfo,
						section = $(this).parents('.page-host-section'),
						column = $(this).parents('.page-host-column'),
						state = column.attr('data-state'),
						pageID = section.attr('data-id'),
						tab = UI.Page.stateContainer.data('page').tab;

					if (pageID !== pageInfo.id)
						thisPageInfo = pageInfo.frames[pageID];

					var ruleList = thisPageInfo.private ? globalPage.Rules.list.temporary : globalPage.Rules.list.allResources;

					ruleList.addDomain('*', thisPageInfo.host, {
						rule: '*',
						action: state === 'blocked' ? 1 : 0
					});

					UI.Page.section.toggleEditMode(section, false);

					globalPage.Rule.event.addCustomEventListener('fixedCanLoadCache', function () {
						MessageTarget({
							target: tab
						}, 'reload');
					}, true);
				})

				.on('click', '.page-host-column .page-host-kind h4', function (event) {
					if (event.target.nodeName.toUpperCase() !== 'H4' || event.offsetX > this.offsetWidth)
						return;

					var check = $(this).parent().find('.page-host-kind-select-all'),
						wasChecked = check.is(':checked'),
						section = $(this).parents('.page-host-section'),
						isInEditMode = section.find('.page-host-editor:visible').length;

					check.prop('checked', !check.is(':checked')).change();

					if (!isInEditMode && !event.isTrigger && Settings.getItem('createRulesOnClick')) {
						var colorTemplate = Settings.getItem('darkMode') ? UI.Page.__forceRuleColorTemplateDarkMode : UI.Page.__forceRuleColorTemplate;

						$(this).parent().next()
							.find('.page-host-item')
							.css('background', wasChecked ? '' : colorTemplate._format([1]))
							.find('.page-host-item-will-create-rule')
							.toggleClass('is-pending', !wasChecked);

						Utilities.Timer.timeout('createRulesOnClick' + section.attr('data-id'), function (section) {
							UI.Page.section.createRules(section, true);
						}, 1500, [section]);
					} else
						UI.Page.section.toggleEditMode(section, true);
				});
		}
	}
};

UI.event.addCustomEventListener('viewAlreadyActive', UI.Page.events.viewAlreadyActive);
UI.event.addCustomEventListener('viewWillSwitch', UI.Page.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Page.events.viewDidSwitch);
UI.event.addCustomEventListener('awaitPageFromTabTimeout', UI.Page.events.awaitPageFromTabTimeout);
UI.event.addCustomEventListener('popoverDidResize', UI.Page.events.popoverDidResize);
UI.event.addCustomEventListener('sectionSwitchedOutOfEditMode', UI.Page.events.sectionSwitchedOutOfEditMode);
UI.event.addCustomEventListener('selectCustomOptionChanged', UI.Page.events.selectCustomOptionChanged);
UI.event.addCustomEventListener('disabled', UI.Page.events.disabled);
UI.event.addCustomEventListener('popoverOpened', UI.Page.events.popoverOpened);

document.addEventListener('DOMContentLoaded', UI.Page.init, true);
