"use strict";

var UI = {
	show: ToolbarItems.showPopover,
	disabled: false,
	event: new EventListener,
	document: document,

	__renderPage: function (page) {
		if (!Popover.visible())
			return;

		var tree = page.tree();

		UI.pageStateContainer.html('<pre>' + JSON.stringify(tree, null, 1)._escapeHTML() + '</pre>');
	},

	onReady: function (fn) {
		UI.event.addCustomEventListener('UIReady', fn, true);
	},

	init: function () {
		var userAgent = window.navigator.userAgent;

		Settings.map.useAnimations.props.onChange();
		
		document.documentElement.classList.toggle('jsb-large-font', Settings.getItem('largeFont'));
		document.documentElement.classList.toggle('yosemite', userAgent._contains('10_10'));
		document.documentElement.classList.toggle('mavericks', userAgent._contains('10_9'));
		document.documentElement.classList.toggle('mountain-lion', userAgent._contains('10_8'));
		document.documentElement.classList.toggle('lion', userAgent._contains('10_7'));
		document.documentElement.classList.toggle('snow-leopard', userAgent._contains('10_6'));
		
		UI.container = Template.create('main', 'container');

		UI.pageStateContainer = $('#page-state-container', UI.container);

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

		UI.view.init();

		UI.event.addCustomEventListener('viewWillSwitch', function (event) {
			if (event.viewID === '#page-view')
				UI.events.openedPopover();
			else if (event.viewID === '#rule-view')
				event.view.find('#rules').html('<pre>' + JSON.stringify(globalPage.Rules.list.active.rules.all(), null, 1) + '</pre>');
			else if (event.viewID === '#snapshot-view')
				event.view.html('<pre>' + JSON.stringify(globalPage.Rules.list.user.rules.snapshot.snapshots.all(), null, 1) + '</pre>');
		});

		UI.event.trigger('UIReady', null, true);
		globalPage.Command.event.trigger('UIReady', null, true);
	},
	
	clear: function () {
		UI.pageStateContainer.empty();
	},

	renderPage: Utilities.throttle(function (page) {
		UI.onReady(UI.__renderPage.bind(UI, page));
	}, 50, null, true),

	events: {
		openedPopover: function () {
			globalPage.Page.requestPageFromActive();

			UI.event.trigger('popoverOpened');
		}
	},

	view: {
		__switching: false,
		__default: '#page-view',
		__scale: {
			behind: 0.85,
			above: 1.2
		},

		get active () {
			return this.viewSwitcher.data('active-view');
		},

		set active (view) {
			this.viewSwitcher.data('active-view', view)
		},

		init: function () {
			if (Utilities.safariBuildVersion < 537) {
				globalPage.Command.toggleDisabled(true);

				$('#too-old').show();

				return;
			}

			this.views = $('#views', UI.container);
			this.viewToolbar = $('#view-toolbar');
			this.viewSwitcher = $('#view-switcher');

			this.views.children().hide();

			this.viewSwitcher.on('click', 'li', function () {
				UI.view.switchTo(this.getAttribute('data-view'));
			});

			this.viewToolbar
				.on('click', '#full-toggle', function () {
					globalPage.Command.toggleDisabled();
				})
				.on('click', '#open-menu', function (event) {
					var poppy = new Poppy(event.pageX, event.pageY, true, 'mainMenu');

					poppy.setContent(Template.create('poppy', 'main-menu')).moveWithView().show();
				});

			$('#container').click(function (event) {
				return;

				Poppy.closeAll();
				
				var poppy = new Poppy(event.pageX, event.pageY);

				poppy
					.setContent('hello there at ' + Date.now() + 'hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>hi<br>')
					.moveWithView()
					.show();
			});

			this.switchTo(this.__default);
		},

		switchTo: function (viewID) {
			if (this.active === viewID)
				return;

			var previousView = this.views.find(this.active),
					activeView = this.views.find(viewID);

			if (!activeView.length)
				throw new Error('view not found - ' + viewID);

			UI.event.trigger('viewWillSwitch', {
				view: activeView,
				viewID: viewID
			});

			this.active = viewID;

			$('li', this.viewSwitcher)
				.removeClass('active-view')
				.filter('[data-view="' + viewID + '"]')
				.addClass('active-view');

			previousView.hide().find('*:focus').blur();

			activeView.show();

			this.views.scrollTop(0);

			UI.event.trigger('viewDidSwitch', {
				view: activeView,
				viewID: viewID
			});
		}
	}
};

globalPage.UI = UI;

Events.addApplicationListener('popover', UI.events.openedPopover);

document.addEventListener('DOMContentLoaded', UI.init, true);
