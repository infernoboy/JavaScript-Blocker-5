"use strict";

if (!window.safari)
	throw new Error('preventing execution.');

Special.specials = {
	inlineScriptsCheck: function () {
		messageExtension('inlineScriptsAllowed');
	},

	zoom: function () {
		document.addEventListener('DOMContentLoaded', function () {
			document.body.style.setProperty('zoom', JSB.value + '%', 'important');
		}, true);
	},

	window_resize: function () {
		var windowOpen = window.open;

		window.resizeBy = function () {};
		window.resizeTo = function () {};
		window.moveTo = function () {};

		window.open = function (URL, name, specs, replace) {
			return windowOpen(URL, name, undefined, replace);
		};
	},

	contextmenu_overrides: function () {
		var stopPropagation = function (event) {
			event.stopImmediatePropagation();
			event.stopPropagation();
		};

		var stopMouseDown = function (event) {
			if (event.which && event.which === 3)
				stopPropagation(event);
		};

		var blockContextMenuOverrides = function () {
			window.oncontextmenu = null;
			document.oncontextmenu = null;
			
			window.removeEventListener('contextmenu', stopPropagation);
			window.removeEventListener('mousedown', stopMouseDown);
			document.removeEventListener('contextmenu', stopPropagation);
			document.removeEventListener('mousedown', stopMouseDown);
			
			window.addEventListener('contextmenu', stopPropagation, true);
			window.addEventListener('mousedown', stopMouseDown, true);
			document.addEventListener('contextmenu', stopPropagation, true);
			document.addEventListener('mousedown', stopMouseDown, true);
		};
		
		setInterval(blockContextMenuOverrides, 20000);
		
		blockContextMenuOverrides();
	},

	autocomplete_disabler: function () {
		var build = JSB.data;

		function withNode(node) {
			if (node.nodeName === 'INPUT')
				node.setAttribute('autocomplete', 'on');
		}

		document.addEventListener('DOMContentLoaded', function () {
			var inputs = document.getElementsByTagName('input');
			
			for (var i = 0; i < inputs.length; i++)
				withNode(inputs[i]);
		}, true);

		if (build >= 536) {
			var observer = new WebKitMutationObserver(function (mutations) {
				mutations.forEach(function (mutation) {
					if (mutation.type === 'childList')
						for (var i = 0; i < mutation.addedNodes.length; i++)
							withNode(mutation.addedNodes[i]);
				});
			});

			observer.observe(document, {
				childList: true,
				subtree: true
			});
		} else
			document.addEventListener('DOMNodeInserted', function (event) {
				withNode(event.target);
			}, true);
	}
};

Special.specials.autocomplete_disabler.data = Utilities.safariBuildVersion;

Special.begin();
