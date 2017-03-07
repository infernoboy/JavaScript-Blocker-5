/*
* @Last modified in Sublime on Feb 28, 2017 12:21:29 PM
*/

'use strict';

var LibraryRoot = 'https://imac.toggleable.com:8443/jsblocker/';

var Libraries = {
	CryptoJS: {
		source: LibraryRoot + 'bower_components/crypto-js/crypto-js.min.js',
		sha512: 'ead09189b23890d6676df068ea21d6f6c675eef200000aa7775c06466d5cbf43636e57b1cebc0d78318c0faed82e1d08f93905c5a335978a76cfcdcfb0b29273'
	},
	JSRP: {
		source: LibraryRoot + 'js/jsrp-browser.js',
		sha512: '429534120b8383f8314060cbf58234a1df86b5140c65cb4f14f892273d2a659c3f141126b697f7fbbdb7a3ea258e38fc7793b03b75448793ace6d13c368a1f34'
	},
	SocketIO: {
		source: LibraryRoot + 'js/socket.io.slim.min.js',
		sha512: 'b40b399fb9322fbdd91cf633ee1401e603cdc811e00f71ece80663a36da26dbe5adba36a1fc4b203aeeb15f04fe8963ff07004bf2a91caeabd23d16057c3a40b'
	}
};

for (var key in Libraries)
	$.ajax({
		async: false,
		url: Libraries[key].source,
		cache: false,
		dataType: 'text'
	}).then(function (name, library, content) {
		if (typeof content === 'string' && sha512(content) === library.sha512) {
			library.blobURL = Utilities.URL.createFromContent(content, 'application/javascript');

			/* eslint-disable */
			$('<script>').attr('data-library', name).text('//@ sourceURL=' + name + "\n" + content).prependTo(document.head);
			/* eslinst-enable */
		} else
			LogError('Library sha512 mismatch!', name);
	}.bind(null, key, Libraries[key]), function (err) {
		LogError('Could not load library:', name);
		LogError(err);
	});
