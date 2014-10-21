"use strict";

UI.Page = {
	__rendering: false,

	__renderPage: function (page) {
		if (!Popover.visible() || UI.Page.__rendering || !UI.Page.view.is('.active-view') || UI.event.trigger('pageWillRender', page))
			return;

		UI.Page.__rendering = true;

		UI.Page.modalInfo.hide();

		UI.Page.notification.hide();

		var pageInfo = page.tree(),
				renderedSections = $('<div />');

		renderedSections.append(Template.create('page', 'host-section', pageInfo));

		for (var frameID in pageInfo.frames)
			renderedSections.append(Template.create('page', 'host-section', pageInfo.frames[frameID]));

		$('.page-host-item-edit-container', renderedSections).hide();

		$('.page-host-item', renderedSections).each(function (i) {
			var self = $(this),
					resourceIDs = JSON.parse(this.getAttribute('data-resourceIDs')),
					resources = self.data('resources', {}).data('resources');

			for (var i = resourceIDs.length; i--;)
				resources[resourceIDs[i]] = pageInfo._findKey(resourceIDs[i]);
		});

		UI.Page.events.bindSectionEvents(renderedSections, page, pageInfo);

		UI.Page.stateContainer
			.empty()
			.data('page', page)
			.append(renderedSections.children())
			.find('.page-host-editor-kind')
			.trigger('change');

		UI.Page.resizeColumns(Settings.getItem('pageHostColumnAllowedWidth'));

		UI.view.toTop(UI.view.views);

		UI.Page.__rendering = false;

		UI.event.trigger('pageDidRender', page);
	},

	init: function () {
		UI.Page.view = $('#page-view', UI.view.views);
		UI.Page.toolbarItem = $('*[data-view="#page-view"]', UI.view.viewSwitcher);
		UI.Page.notification = $('.view-switcher-item-notification', UI.Page.toolbarItem);
		UI.Page.modalInfo = $('#page-modal-info', UI.Page.view);
		UI.Page.stateContainer = $('#page-state-container', UI.Page.view);

		UI.view.floatingHeaders.add(UI.view.views.selector, '.page-host-header', null, -1);

		UI.event.trigger('UIReady', null, true);
		globalPage.Command.event.trigger('UIReady', null, true);
	},

	clear: function () {
		UI.Page.stateContainer.empty();
	},

	canRender: function () {
		return !UI.Page.view.is('.active-view') || (UI.view.views.scrollTop() < 10 && !UI.drag && !Poppy.poppyExist() && $('.page-host-editing', UI.Page.view).length === 0);
	},

	showModalInfo: function (info) {
		UI.Page.clear();

		UI.Page.modalInfo
			.empty()
			.append(Template.create('page', 'modal-info', {
				info: info
			}))
			.show();
	},

	throttledRequestFromActive: Utilities.throttle(function (event) {
		globalPage.Page.requestPageFromActive();
	}, 250, null, true),

	renderPage: Utilities.throttle(function (page) {
		if (window.globalSetting.disabled)
			return;

		if (UI.Page.canRender())
			UI.onReady(UI.Page.__renderPage.bind(UI.Page, page));
		else {
			UI.Page.notification.text('...').show();

			UI.view.views.unbind('scroll', UI.Page.throttledRequestFromActive).one('scroll', UI.Page.throttledRequestFromActive);

			UI.event.addMissingCustomEventListener(['poppyDidClose', 'sectionSwitchedOutOfEditMode', 'dragEnd'], UI.Page.throttledRequestFromActive, true);
		}
	}, 50, null, true),

	resizeColumns: function (allowedColumnWidth) {
		var resizers = $('.page-host-columns-resize'),
				useLargeFont = Settings.getItem('largeFont'),
				allowedColumnWidth = Math.min(useLargeFont ? 0.73 : 0.78, Math.max(useLargeFont ? 0.27 : 0.22, allowedColumnWidth)),
				allowedColumnWidthPercent = (allowedColumnWidth * 100),
				blockedColumnWidthPercent = 100 - allowedColumnWidthPercent;

		resizers.css('left', (allowedColumnWidth * 100) + '%');

		$('.page-host-column-allowed').css('-webkit-flex-basis', allowedColumnWidthPercent + '%');
		$('.page-host-column-blocked').css('-webkit-flex-basis', blockedColumnWidthPercent + '%');

		Utilities.Timer.timeout('setColumnWidth', function () {
			Settings.setItem('pageHostColumnAllowedWidth', allowedColumnWidth);
		}, 20);
	},

	render: {
		section: function (page) {
			var section = Template.create('page', 'host-section');
		}
	},

	section: {
		toggleEditMode: function (section, force, scrollToTop) {
			var pageHostEditor = section.find('.page-host-editor').stop(true, true),
					wasInEditMode = pageHostEditor.is(':visible');

			if ((wasInEditMode && force === true) || (!wasInEditMode && force === false))
				return;

			section.toggleClass('page-host-editing');

			var editButtons = $('.page-host-edit', section),
					items = $('.page-host-columns .page-host-item', section).find('.page-host-item-container, .page-host-item-edit-container');

			editButtons.val(wasInEditMode ? _('view.page.host.edit') : _('view.page.host.done'));

			pageHostEditor
				.stop(true, true)
				.slideToggle(225 * window.globalSetting.speedMultiplier, function () {
					if (!wasInEditMode && scrollToTop)
						section.scrollIntoView(UI.view.views, 225 * window.globalSetting.speedMultiplier, section.is(':first-child') ? 0 : 1);
				});
		
			items.toggle();

			UI.event.trigger(wasInEditMode ? 'sectionSwitchedOutOfEditMode' : 'sectionSwitchedToEditMode', section);
		},

		createRules: function (section) {
			var ruleAction,
					ruleDomain;

			var Rules = globalPage.Rules,
					ruleKindPrefix = section.find('.page-host-editor-when-framed').is(':checked') ? 'framed:' : '',
					ruleList = section.find('.page-host-editor-duration').val() === 'always' ? Rules.list.user : Rules.list.temporary,
					addRule = ruleList.addDomain,
					ruleType = section.find('.page-host-editor-kind').val(),
					ruleWhere = section.find('.page-host-editor-where'),
					ruleWhereValue = ruleWhere.val(),
					ruleWhichItems = section.find('.page-host-editor-which-items').val(),
					items = section.find('.page-host-columns .page-host-item:not(.page-host-item-disabled)');

			if (ruleType === 'hide')
				ruleKindPrefix = 'hide:' + ruleKindPrefix;

			if (ruleWhereValue === 'domain-all')
				ruleDomain = '*';
			else if (ruleWhereValue._startsWith('domain'))
				ruleDomain = $('option', ruleWhere).eq(ruleWhere[0].selectedIndex).attr('data-domain');
			else if (ruleWhereValue._startsWith('page')) {
				addRule = ruleList.addPage;

				var ruleOption = $('option', ruleWhere).eq(ruleWhere[0].selectedIndex),
						rulePage = ruleOption.attr('data-page')._escapeRegExp();

				if (ruleOption.is(':not(:last-child)'))
					rulePage += '.*';

				ruleDomain = '^' + rulePage + '$';
			} else {
				if (Rules.isRegExp(ruleWhereValue))
					addRule = ruleList.addPage;

				ruleDomain = ruleWhereValue;
			}

			if (ruleType === 'disable' || ruleType === 'enable') {
				ruleAction = ruleType === 'disable' ? 0 : 1;

				addRule(ruleKindPrefix + 'disable', ruleDomain, {
					rule: '*',
					action: ruleAction
				});

				setTimeout(function () {
					globalPage.Page.requestPageFromActive();
				}, 1000);
			} else if (ruleWhichItems === 'items-all') {
				addRule(ruleKindPrefix + '*', ruleDomain, {
					rule: '*',
					action: (ruleType === 'block' || ruleType === 'hide') ? 0 : 1
				});
			} else if (ruleWhichItems === 'items-of-kind') {
				var checked = $('.page-host-editor-kinds input:checked', section),
						ruleAction = (ruleType === 'block' || ruleType === 'hide') ? 0 : 1;

				checked.each(function () {
					addRule(ruleKindPrefix + this.getAttribute('data-kind'), ruleDomain, {
						rule: '*',
						action: ruleAction
					});
				});
			} else {
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

					if (ruleType === 'block/allow') {
						var hasAffect;

						var rule = addRule(ruleKindPrefix + kind, ruleDomain, {
							rule: (protocol === 'none:' || itemSource.is('.select-custom-input')) ? itemSourceVal : protocol + '|' + itemSourceVal,
							action: ruleAction
						});

						for (var resourceID in resources)
							do {
								hasAffect = ruleList.hasAffectOnResource(rule, resources[resourceID]);

								if (hasAffect.hasAffect || !hasAffect.detail)
									break;

								hasAffect.detail.ruleList.__remove(hasAffect.detail.ruleType, hasAffect.detail.ruleKind, hasAffect.detail.domain, hasAffect.detail.rule);
							} while (true);
					} else
						throw new Error('not yet supported');
				});
			}

			UI.Page.section.toggleEditMode(section, false);

			UI.view.toTop(UI.view.views);

			setTimeout(function () {
				MessageTarget({
					target: UI.Page.stateContainer.data('page').tab
				}, 'reload');
			}, 225);
		}
	},

	events: {
		openedPopover: function () {
			UI.Page.clear();

			globalPage.Page.requestPageFromActive();

			UI.event.trigger('popoverOpened');
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
					UI.Page.notification.hide();
			}, true);
		},

		popoverDidResize: function () {
			UI.view.views.trigger('scroll');
		},

		sectionSwitchedOutOfEditMode: function (event) {
			$('.page-host-item', event.detail).removeClass('page-host-item-disabled');
		},

		selectCustomOptionChanged: function (event) {
			var input = $(event.detail),
					editContainer = input.parents('.page-host-item-edit-container');

			if (editContainer.length)
				$('.page-host-item-edit-check', editContainer).prop('checked', true);
		},

		awaitPageFromTabTimeout: function (event) {
			var lastPage = globalPage.Page.lastPageForTab(event.detail);

			if (lastPage) {
				lastPage.badgeState(Settings.getItem('toolbarDisplay'));

				UI.event.addCustomEventListener('pageDidRender', function (event) {
					if (event.detail === lastPage) {
						var pageToolbar = $('li[data-view="#page-view"]', UI.view.viewSwitcher),
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

		bindSectionEvents: function (renderedSections, page, pageInfo) {
			renderedSections
				.children()
				.on('mousedown', '.page-host-columns-resize', function (event) {
					event.preventDefault();

					UI.drag = this;

					document.documentElement.classList.add('jsb-drag-cursor');
					document.documentElement.setAttribute('data-cursor', 'col-resize');
				})

				.on('dblclick', '.page-host-columns-resize', function (event) {
					UI.Page.resizeColumns(0.5);
				})

				.on('mousemove', '.page-host-columns', function (event) {
					if (UI.drag && UI.drag.classList.contains('page-host-columns-resize'))
						UI.Page.resizeColumns(event.originalEvent.pageX / $(this).outerWidth());
				})

				.on('click', '.page-host-first-visit-keep-blocked, .page-host-first-visit-unblock', function (event) {
					var thisPageInfo = pageInfo,
							section = $(this).parents('.page-host-section'),
							pageID = section.attr('data-id');

					if (pageID !== pageInfo.id)
						thisPageInfo = pageInfo.frames[pageID];

					$(this).siblings().addBack().prop('disabled', true);

					if (this.className._contains('keep-blocked'))
						globalPage.Page.blockFirstVisit(thisPageInfo.blockedByFirstVisit.host, true);
					else
						globalPage.Page.unblockFirstVisit(thisPageInfo.blockedByFirstVisit.host);

					UI.Page.section.toggleEditMode(section, false);

					UI.view.toTop(UI.view.views);

					MessageTarget({
						target: page.tab
					}, 'reload');
				})

				.on('click', '.page-host-first-visit .more-info', function (event) {
					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, true);

					poppy.setContent(Template.create('main', 'jsb-readable', {
						string: _('first_visit.unblock_more_info')
					})).show();
				})

				.on('click', '.page-host-header', function (event) {
					if (event.originalEvent.target.classList.contains('page-host-edit'))
						return;

					var section = $(this).parents('.page-host-section');

					section.scrollIntoView(UI.view.views, 225 * window.globalSetting.speedMultiplier, section.is(':first-child') ? 0 : 1);
				})

				.on('change', '.page-host-editor-create-on-close', function (event) {
					Settings.setItem('createRulesOnClose', this.checked);
				})

				.on('change', '.page-host-editor-kind', function (event) {
					var enableOptions;

					var editor = $(this).parents('.page-host-editor'),
							whichItems = $('.page-host-editor-which-items', editor),
							options = $('option', whichItems);

					options.prop('disabled', true)

					if (this.value === 'disable' || this.value === 'enable')
						enableOptions = options.filter('[value="jsb"]');
					else if (this.value === 'block/allow')
						enableOptions = options.filter('[value="items-checked"]');
					else if (this.value === 'block' || this.value === 'allow')
						enableOptions = options.filter('[value="items-all"], [value="items-of-kind"]');
					else if (this.value === 'hide')
						enableOptions = options.not('[value="jsb"]');

					enableOptions.prop('disabled', false).eq(0).prop('selected', true);

					whichItems.trigger('change');
				})

				.on('change', '.page-host-editor-which-items', function (event) {
					var section = $(this).parents('.page-host-section'),
							kinds = section.find('.page-host-editor-kinds');

					if (this.value === 'items-of-kind')
						kinds.slideDown(225 * window.globalSetting.speedMultiplier);
					else
						kinds.slideUp(225 * window.globalSetting.speedMultiplier);

					$('.page-host-columns .page-host-item', section).toggleClass('page-host-item-disabled', this.value !== 'items-checked');
				})

				.on('click', '.page-host-editor-create', function (event) {
					this.disabled = true;

					UI.Page.section.createRules($(this).parents('.page-host-section'));
				})

				.on('change', '.page-host-editor-where', function (event) {
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

				.on('click', '.page-host-host-count', function (event) {
					var item = $(this).parents('.page-host-item'),
							resources = item.data('resources'),
							poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, true),
							items = [];

					for (var resourceID in resources)
						items.push({
							fullSource: resources[resourceID].fullSource,
							meta: resources[resourceID].meta && resources[resourceID].meta._isEmpty() ? undefined : resources[resourceID].meta
						});

					poppy.setContent('<pre>' + JSON.stringify(items, null, 1)._escapeHTML() + '</pre>').show();
				})

				.on('click', '.page-host-edit, .page-host-columns .page-host-item .page-host-item-source', function (event) {
					if (globalPage.Rules.list.active !== globalPage.Rules.list.user)
						return (new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, true))
							.setContent(Template.create('main', 'jsb-readable', {
								string: _('view.page.host.snapshot_in_use_no_rules')
							}))
							.show();

					var self = $(this),
							isItem = self.is('.page-host-item-source');

					if (isItem)
						self.parents('.page-host-item').find('.page-host-item-edit-check').prop('checked', true);

					UI.Page.section.toggleEditMode(self.parents('.page-host-section'), null, !isItem);
				})

				.on('click', '.page-host-unblocked .page-host-items[data-kind="script"] .page-host-item-source', function (event) {
					var item = $(this).parents('.page-host-item'),
							resources = item.data('resources');
					
					var loadingPoppy = Poppy.createLoadingPoppy(event.originalEvent.pageX, event.originalEvent.pageY, true, function (loadingPoppy) {
						for (var resourceID in resources) {
							$('#resource-content-view', UI.view.views).empty().append(Utilities.beautifyScript(resources[resourceID].fullSource));

							UI.view.switchTo(UI.view.viewSwitcher, '#resource-content-view');

							break;
						}
					});

					loadingPoppy.setContent(_('poppy.beautifying_script')).show(true);
				})

				.on('mousedown', '.page-host-item-edit-container .select-single', function (event) {
					event.preventDefault();
				})

				.on('click', '.page-host-item-edit-container .select-single', function (event) {
					var check = $(this).parents('.page-host-item-edit-container').find('.page-host-item-edit-check');

					check.prop('checked', !check.prop('checked'));
				})

				.on('mousedown', '.page-host-item-edit-select', function (event) {
					if (Settings.getItem('quickCyclePageItems') && !this.classList.contains('select-single')) {
						event.preventDefault();

						var optionLength = $(this).parent().find('option').length - 1;

						if (this.selectedIndex === optionLength)
							this.selectedIndex = 0;
						else
							this.selectedIndex++;

						$(this).trigger('change');
					}
				})

				.on('change input', '.page-host-item-edit-select, .page-host-item-edit-container .select-custom-input', function (event) {
					var check = $(this).parents('.page-host-item-edit-container').find('.page-host-item-edit-check');

					check.prop('checked', true);
				});
		}
	}
};

Template.load('page');

UI.event.addCustomEventListener('viewWillSwitch', UI.Page.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Page.events.viewDidSwitch);
UI.event.addCustomEventListener('awaitPageFromTabTimeout', UI.Page.events.awaitPageFromTabTimeout);
UI.event.addCustomEventListener('popoverDidResize', UI.Page.events.popoverDidResize);
UI.event.addCustomEventListener('sectionSwitchedOutOfEditMode', UI.Page.events.sectionSwitchedOutOfEditMode);
UI.event.addCustomEventListener('selectCustomOptionChanged', UI.Page.events.selectCustomOptionChanged);
UI.event.addCustomEventListener('disabled', UI.Page.events.disabled);

Events.addApplicationListener('popover', UI.Page.events.openedPopover);

document.addEventListener('DOMContentLoaded', UI.Page.init, true);
