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

		UI.Page.stateContainer.empty().append(renderedSections.children());

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
		return !UI.Page.view.is('.active-view') || (UI.view.views.scrollTop() < 10 && !Poppy.poppyExist() && $('.page-host-editing', UI.Page.view).length === 0);
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

			UI.event.addMissingCustomEventListener(['poppyDidClose', 'sectionSwitchOutOfEditMode'], UI.Page.throttledRequestFromActive, true);
		}
	}, 50, null, true),

	render: {
		section: function (page) {
			var section = Template.create('page', 'host-section');
		}
	},

	section: {
		toggleEditMode: function (section) {
			$('.page-host-section', section.parent()).not(section).toggleClass('page-host-section-disabled');

			section.toggleClass('page-host-editing');

			var editButtons = $('.page-host-edit', section),
					items = $('.page-host-columns .page-host-item:not([data-action="6"])', section).find('.page-host-item-container, .page-host-item-edit-container'),
					pageHostEditor = section.find('.page-host-editor').stop(true, true),
					wasInEditMode = pageHostEditor.is(':visible');

			if (!wasInEditMode)
				section.scrollIntoView(UI.view.views, 225 * window.globalSetting.speedMultiplier, section.is(':first-child') ? 0 : 1);

			editButtons.val(wasInEditMode ? _('view.page.host.edit') : _('view.page.host.done'));

			pageHostEditor
				.stop(true, true)
				.slideToggle(225 * window.globalSetting.speedMultiplier);
		
			items.toggle()

			UI.event.trigger(wasInEditMode ? 'sectionSwitchOutOfEditMode' : 'sectionSwitchedToEditMode', section);
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

		sectionSwitchOutOfEditMode: function (event) {
			$('.page-host-item', event.detail).removeClass('page-host-item-disabled');
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

						poppy.setContent(_('view.page.from_cache')).show();

						UI.event.addCustomEventListener('awaitPageFromTabDone', function () {
							poppy.close();
						}, true);
					}
				}, true);

				UI.Page.renderPage(lastPage);
			} else
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

				.on('change', '.page-host-editor-kind', function (event) {
					var editor = $(this).parents('.page-host-editor'),
							subtext = $('.page-host-editor-kind-subtext', editor);

					if (this.value === 'disable' || this.value === 'enable')
						subtext.text(_('JSB'));
					else
						subtext.text(_('view.page.host.editor.selected_items'));
				})

				.on('change', '.page-host-editor-where', function (event) {
					var section = $(this).parents('.page-host-section'),
							items = $('.page-host-columns .page-host-item', section),
							option = $('option', this).eq(this.selectedIndex),
							optgroup = option.parent();

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

				.on('click', '.page-host-edit, .page-host-columns .page-host-item:not([data-action="6"]) .page-host-item-source', function (event) {
					var self = $(this);

					if (self.is('.page-host-item-source'))
						self.parents('.page-host-item').find('.page-host-item-edit-check').prop('checked', true);

					UI.Page.section.toggleEditMode(self.parents('.page-host-section'));							
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
				});
		}
	}
};

Template.load('page');

UI.event.addCustomEventListener('viewWillSwitch', UI.Page.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Page.events.viewDidSwitch);
UI.event.addCustomEventListener('awaitPageFromTabTimeout', UI.Page.events.awaitPageFromTabTimeout);
UI.event.addCustomEventListener('popoverDidResize', UI.Page.events.popoverDidResize);
UI.event.addCustomEventListener('sectionSwitchOutOfEditMode', UI.Page.events.sectionSwitchOutOfEditMode);
UI.event.addCustomEventListener('disabled', UI.Page.events.disabled);

Events.addApplicationListener('popover', UI.Page.events.openedPopover);

document.addEventListener('DOMContentLoaded', UI.Page.init, true);
