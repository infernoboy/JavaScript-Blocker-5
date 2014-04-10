"use strict";

/***************************************
 * @file js/predefined.js
 * @author Travis Roman (travis@toggleable.com)
 * @package JavaScript Blocker (http://javascript-blocker.toggleable.com)
 ***************************************/

 throw new Error('Preventing whitelist/blacklist additions.')

/* ====================WHITELIST===================== */

Rules.list.blacklist.rules.lock = false;
Rules.list.whitelist.rules.lock = false;

var whitelistValue = {
	action: 5,
	regexp: true
};

var blacklistValue = {
	action: 5,
	regexp: true
};

var wld = {
	script: {
		'*': [
			'www\\.readability\\.com',
			'seal\\.verisign\\.com',
			'api\\.solvemedia\\.com',
			's1\\.wp\\.com'
		],
		'.amazon.com': ['(ssl\\-)?images\\-amazon\\.com'],
		'.reddit.com': ['www\\.redditstatic\\.com'],
		'.paypal.com': ['www\\.paypalobjects\\.com'],
		'.google.com': ['gstatic\\.com'],
		'.youtube.com': ['ytimg\\.com', 'clients[0-9]+\\.google\\.com'],
		'.readability.com': ['cloudfront\\.net'],
		'.icloud.com': ['gstatic\\.com'],
		'.monster.com': ['monster\\.com'],
		'.ensighten.com': ['ensighten\\.com'],
		'.gorillanation.com': ['gorillanation\\.com'],
		'.digg.com': ['digg\\.com']
	},
	frame: {
		'.facebook.com': ['facebook\\.com'],
		'.stumbleupon.com': ['.*(All Frames)?']
	},
	embed: {
		'.youtube.com': ['ytimg\\.com']
	},
	image: {
		'.google.com': ['gstatic\\.com']
	},
	ajax_get: {
		'.digg.com': ['digg\\.com']
	}
};

Rules.list.whitelist.addMany({
	script: {
		domain: {
			'*': {
				'^(Google hosted JavaScript frameworks)?https?:\\/\\/ajax\\.googleapis\\.com\\/ajax\\/libs\\/.*\\.js((\\?|#)+.*)?$': whitelistValue,
				'^(Google hosted JavaScript frameworks)?https?:\\/\\/www\\.google\\.com\\/jsapi((\\?|#)+.*)?$': whitelistValue,
				'^(Prototype, the JavaScript framework)?.*\\/prototype\\.js((\\?|#)+.*)?$': whitelistValue,
				'^(jQuery, the JavaScript framework)?.*\\/jquery(\\-ui)?\\-[1-9]\\.[0-9]+\\.[0-9]+(\\.min)?\\.js((\\?|#)+.*)?$': whitelistValue,
				'^(jQuery, the JavaScript framework)?.*\\/jquery\\.[^.\\/]+\\.js((\\?|#)+.*)?$': whitelistValue,
				'^(jQuery, the JavaScript framework)?.*\\/jquery\\.js((\\?|#)+.*)?$': whitelistValue,
				'^(jQuery UI, the JavaScript framework to make things pretty)?.*\\/jquery(\\-ui|\\.ui)(\\.[^.\\/]+)?\\.js$': whitelistValue,
				'^(reCAPTCHA)?https?:\\/\\/www\\.google\\.com\\/recaptcha\\/api\\/.*$': whitelistValue
			},
			'.docs.google.com': {
				'^https?:\/\/docs\.google\.com\/static\/.*$': whitelistValue
			}
		}
	},
	embed: {
		domain: {
			'*': {
				'https?:\\/\\/images\\.apple\\.com\\/apple\-events\\/includes\\/qtbutton\\.mov$': whitelistValue
			}
		}
	},
	image: {
		domain: {
			'.google.com': {
				'^data:.*$': whitelistValue
			}
		}
	}
});

var rule;

for (var kind in wld) {
	for (var domain in wld[kind]) {
		for (var i = 0; i < wld[kind][domain].length; i++) {
			rule = [
					'^', typeof wld[kind][domain][i] === 'object' ? '(' + wld[kind][domain][i][0] + ')?' : '',
					'https?:\\/\\/([^\\/]+\.)?', typeof wld[kind][domain][i] === 'object' ? wld[kind][domain][i][1] : wld[kind][domain][i], '\\/.*$'].join('')

			Rules.list.whitelist.addDomain(kind, domain, {
				rule: rule,
				action: 5
			});
		}
	}
}

var wlScriptRules = Rules.list.whitelist.kind('script').domain();

wlScriptRules.setMany({
	'.google.co.uk': wlScriptRules.get('.google.com'),
	'.google.de': wlScriptRules.get('.google.com'),
	'.amazon.co.uk': wlScriptRules.get('.amazon.com'),
	'.amazon.de': wlScriptRules.get('.amazon.com')
});

/* ====================BLACKLIST===================== */

Rules.list.blacklist.addMany({
	script: {
		domain: {
			'*': {
				'^.*google\\.[^\\/]+\\/.*\\/plusone\\.js((\\?|#)+.*)?$': blacklistValue,
				'^https?:\\/\\/platform\.stumbleupon\\.com\\/.*\\/widgets\\.js((\\?|#)+.*)?$': blacklistValue,
				'^https?:\\/\\/widgets\\.getpocket\\.com\\/.*\\/btn.js((\\?|#)+.*)?$': blacklistValue,
				'^https?:\\/\\/assets\\.pinterest\\.com\\/js\\/pinit.js((\\?|#)+.*)?$': blacklistValue,
				'^https?:\\/\\/([^\\/]+\\.)?platform\\.linkedin\\.com\\/in\\.js.*((\\?|#)+.*)?$': blacklistValue
			},
			'.thepiratebay.sx': {
				'^https?:\\/\\/([^\\/]+\\.)?thepiratebay\\.sx\\/static\\/js\\/((?!tpb).)*\\.js((\\?|#)+.*)?$': blacklistValue
			}
		}
	}
});

var bld = {
	script: {
		'*': [
			['Blocks copy and paste on websites', 'tynt\\.com'],
			['Turns words on webpages into clickable ads', 'kontera\\.com'],
			['Makes a popup appear over a link when hovered on', 'snap\\.com'],
			['User tracking and advertising', '(edge|pixel)\\.quantserve\\.com'],
			['Advertisements', 'pagead[0-9]+\\.googlesyndication\\.com'],
			['Advertisements', 'blogads\\.com'],
			['Advertisements', 'admeld\\.com'],
			['Tracks users', 'scorecardresearch\\.com'],
			['Social media tracking', 'connect\\.facebook\\.(com|net)'],
			['Social media tracking', 'platform\\.twitter\\.com'],
			['Advertisements', 'engine\\.carbonads\\.com'],
			['Adds a "tweet-this" button on webpages', 'widgets\\.twimg\\.com'],
			['Tracks users', 'media6degrees\\.com'],
			['Tracks users', '(ssl|www)\\.google\\-analytics\\.com'],
			['User tracking and advertisements', '(ad|stats)\.([a-z]+\\.)?doubleclick\.net'],
			['Tracks users', 'getclicky\\.com'],
			['Advertisements', 'infolinks\\.com'],
			['Tracks users', 'clicktale\\.(net|com)'],
			['User tracking and advertisements', 'zedo\\.com'],
			['Tracks users', 'monster\\.com'],
			['Tracks users', 'ensighten\\.com'],
			['User tracking and advertisements', 'gorillanation\\.com'],
			['Tracks users', 'bizographics\\.com'],
			['Adds a "digg-this" button on webpages', 'widgets\\.digg\\.com'],
			['Tracks users', 'chartbeat\\.com'],
			['Adds a "reddit-this" button on webpages', 'redditstatic.s3.amazonaws.com'],
			['Adds a "reddit-this" button on webpages', 'reddit.com'],
			['Tracks users', 'verticalacuity\\.com'],
			['Tracks users', 'sail\\-horizon\\.com'],
			['Tracks users', 'kissmetrics\\.com'],
			['Advertisements', 'legolas\\-media\\.com'],
			['Advertisements', 'adzerk\\.(com|net)'],
			['Advertisements', 'adtechus\\.com'],
			['Marketing', 'skimlinks\\.com'],
			['Marketing', 'visualwebsiteoptimizer\\.com'],
			['Marketing', 'marketo\\.(net|com)'],
			['Tracks users', 'coremetrics\\.com'],
			['Tracks users', 'serving\\-sys\\.com'],
			['Advertisements', 'insightexpressai\\.com'],
			['Advertisements', 'googletagservices.com'],
			['Layers', 'live.spokenlayer.com'],
			['Tracks users', 'linksalpha.com'],
			['ShareThis', 'sharethis.com'],
			['AddThis', 'AddThis.com']
		]
	},
	frame: {
		'*': [
			['Facebook social media tracking', 'facebook\\.com'],
			['Twitter social media tracking', 'twitter\\.com'],
			['Google social media tracking', 'plusone\\.google\\.(com|ca|co\\.uk)'],
			'ads\\.[^\\.]+\\..*',
			['Tracks users', 'mediaplex\\.com'],
			['Advertisements', 'legolas\\-media\\.com'],
			['Adds a "reddit-this" button on webpages', 'reddit.com'],
			['Tracks users', 'linksalpha.com']
		]
	}
};

for (var kind in bld) {
	for (var domain in bld[kind]) {
		for (var i = 0; i < bld[kind][domain].length; i++) {
			rule = [
					'^', typeof bld[kind][domain][i] === 'object' ? '(' + bld[kind][domain][i][0] + ')?' : '',
					'https?:\\/\\/([^\\/]+\.)?', typeof bld[kind][domain][i] === 'object' ? bld[kind][domain][i][1] : bld[kind][domain][i], '\\/.*$'].join('')

			Rules.list.blacklist.addDomain(kind, domain, {
				rule: rule,
				action: 4
			});
		}
	}
}

Rules.list.blacklist.rules.lock = true;
Rules.list.whitelist.rules.lock = true;

wld = bld = undefined;