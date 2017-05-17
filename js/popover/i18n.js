/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Strings = {
	__currentLanguage: null,
	__defaultLanguage: 'en-us',

	strings: {},

	loadLanguage: function (language) {
		if (this.strings[language])
			return Log(language, 'is already loaded.');

		if (!this.strings[this.__defaultLanguage] && language !== this.__defaultLanguage)
			this.loadLanguage(this.__defaultLanguage);

		language = language.replace(/\./g, '_');

		return $.ajax({
			async: false,
			url: ExtensionURL('i18n/' + language + '/strings.json'),
			dataType: 'json'
		})
			.done(function (strings) {
				Strings.__currentLanguage = language;

				Strings.strings[language] = strings;

				$('#language-style').attr('href', ExtensionURL('i18n/' + language + '/style.less'));
			})

			.fail(function (error) {
				LogDebug('failed to load language - ' + language, error.status);

				Strings.__currentLanguage = Strings.__defaultLanguage;
			});
	},

	getLanguage: function () {
		if (this.__currentLanguage)
			return this.__currentLanguage;

		var setLanguage = window.Settings ? Settings.getItem('language') : 'auto',
			useLanguage = (setLanguage !== 'auto') ? setLanguage : window.navigator.language.toLowerCase();

		if (this.__currentLanguage !== useLanguage)
			this.loadLanguage(useLanguage);

		return this.__currentLanguage;
	},

	localizedCSSPath: function (path) {
		return ExtensionURL('i18n/' + this.getLanguage() + '/css/' + path);
	},

	isLocalized: function (string) {
		var language = Strings.getLanguage();

		return Strings.strings[language] && Strings.strings[language][string];
	},

	localizationExist: function (string) {
		var language = Strings.getLanguage();
		
		if (Strings.strings[language] && typeof Strings.strings[language][string] === 'string')
			return true;

		if (Strings.strings[Strings.__defaultLanguage] && typeof Strings.strings[Strings.__defaultLanguage][string] === 'string')
			return true;

		return false;
	}
};

function _ (string, args, hideNotLocalized) {
	if (typeof string !== 'string' || !string.length)
		throw new TypeError(string + ' is not a valid string.');

	var localized = null,
		language = Strings.getLanguage();

	if (Strings.strings[language] && typeof Strings.strings[language][string] === 'string')
		localized = Strings.strings[language][string];
	else if (Strings.strings[Strings.__defaultLanguage] && typeof Strings.strings[Strings.__defaultLanguage][string] === 'string')
		localized = Strings.strings[Strings.__defaultLanguage][string];

	localized = (!localized && !hideNotLocalized) ? string + ':NOT_LOCALIZED' : (localized || string);

	if (args)
		localized = localized._format(args);

	return localized;
}
