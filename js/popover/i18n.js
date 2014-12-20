"use strict";

var Strings = {
	__currentLanguage: null,

	strings: {},
	defaultLanguage: 'en-us',

	loadLanguage: function (language) {
		if (this.strings[language])
			return Log(language, 'is already loaded.');

		if (!this.strings[this.defaultLanguage] && language !== this.defaultLanguage)
			this.loadLanguage(this.defaultLanguage);

		language = language.replace(/\./g, '_');

		return $.ajax({
			async: false,
			url: ExtensionURL('i18n/' + language + '/strings.json'),
			dataType: 'json'
		}).done(function (strings) {
			Strings.strings[language] = strings;

			$('#language-style').attr('href', ExtensionURL('i18n/' + language + '/style.css'));
		}).fail(function (error) {
			LogError('failed to load language - ' + language, error);
		});
	},

	getLanguage: function () {
		if (this.__currentLanguage)
			return this.__currentLanguage;

		var setLanguage = Settings.getItem('language'),
				useLanguage = (setLanguage !== 'auto') ? setLanguage : window.navigator.language.toLowerCase();

		if (this.__currentLanguage !== useLanguage)
			this.loadLanguage(useLanguage);

		this.__currentLanguage = useLanguage;

		return this.__currentLanguage;
	},

	localizedCSSPath: function (path) {
		return ExtensionURL('i18n/' + this.getLanguage() + '/css/' + path);
	},

	isLocalized: function (string) {
		var language = Strings.getLanguage();

		return Strings.strings[language] && Strings.strings[language][string];
	}
};

function _ (string, args, hideNotLocalized) {
	if (typeof string !== 'string' || !string.length)
		throw new TypeError(string + ' is not a valid string.');

	var localized = null,
			language = Strings.getLanguage();

	if (Strings.strings[language] && typeof Strings.strings[language][string] === 'string')
		localized = Strings.strings[language][string];
	else if (Strings.strings[Strings.defaultLanguage] && typeof Strings.strings[Strings.defaultLanguage][string] === 'string') {
		localized = Strings.strings[Strings.defaultLanguage][string];

		LogDebug('"' + string + '" is not localized in ' + language);
	}

	localized = (!localized && !hideNotLocalized) ? string + ':NOT_LOCALIZED' : (localized || string);

	if (args)
		localized = localized._format(args);

	return localized;
};


if (window.globalPage) {
	globalPage.Strings = Strings;
	globalPage._ = _;
}
