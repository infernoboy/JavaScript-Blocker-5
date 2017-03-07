/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function Predefined () {
	Rules.list['$predefined'].clear();

	if (Settings.getItem('ignorePredefined'))
		return;
	
	var kind,
		domain,
		i;

	var whitelistValue = {
		action: 5
	};

	var blacklistValue = {
		action: 4
	};

	/* ====================WHITELIST===================== */	

	var whitelistDomains = {
		'*': {
			'.reddit.com': ['reddit.com']
		},
		script: {
			'*': [
				'www\\.readability\\.com',
				'seal\\.verisign\\.com',
				'api\\.solvemedia\\.com',
				's1\\.wp\\.com'
			],
			'.homedepot.com': ['nexus\\.ensighten\\.com'],
			'.amazon.com': ['(ssl\\-)?images\\-amazon\\.com'],
			'.reddit.com': ['www\\.redditstatic\\.com', 'redditstatic.s3.amazonaws.com'],
			'.paypal.com': ['www\\.paypalobjects\\.com'],
			'.google.com': ['gstatic\\.com'],
			'.youtube.com': ['ytimg\\.com', 'clients[0-9]+\\.google\\.com'],
			'.readability.com': ['cloudfront\\.net'],
			'.icloud.com': ['gstatic\\.com'],
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
		xhr_get: {
			'.digg.com': ['digg\\.com']
		}
	};

	var addWhitelist = Rules.list['$predefined'].addMany({
		script: {
			domain: {
				'*': {
					'^https?:\\/\\/ajax\\.googleapis\\.com\\/ajax\\/libs\\/.*\\.js((\\?|#)+.*)?$': whitelistValue,
					'^https?:\\/\\/www\\.google\\.com\\/jsapi((\\?|#)+.*)?$': whitelistValue,
					'^.*\\/prototype\\.js((\\?|#)+.*)?$': whitelistValue,
					'^.*\\/jquery(\\-ui)?\\-[1-9]\\.[0-9]+\\.[0-9]+(\\.min)?\\.js((\\?|#)+.*)?$': whitelistValue,
					'^.*\\/jquery\\.[^.\\/]+\\.js((\\?|#)+.*)?$': whitelistValue,
					'^.*\\/jquery\\.js((\\?|#)+.*)?$': whitelistValue,
					'^.*\\/jquery(\\-ui|\\.ui)(\\.[^.\\/]+)?\\.js$': whitelistValue,
					'^https?:\\/\\/www\\.google\\.com\\/recaptcha\\/api\\/.*$': whitelistValue
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
		},
		xhr_get: {
			domain: {
				'player.pbs.org': {
					'https?:\\/\\/pubads\\.g\\.doubleclick\\.net\\/gampad\\/ads.*': whitelistValue
				}
			}
		}
	});

	addWhitelist = addWhitelist.then(function () {
		for (kind in whitelistDomains)
			for (domain in whitelistDomains[kind])
				for (i = 0; i < whitelistDomains[kind][domain].length; i++) 
					Rules.list['$predefined'].addDomain(kind, domain, {
						rule: '^https?:\\/\\/([^\\/]+\.)?' + whitelistDomains[kind][domain][i] + '\\/.*$',
						action: 5
					});

		var scriptRules = Rules.list['$predefined'].kind('script').domain();

		scriptRules.setMany({
			'.google.co.uk': scriptRules.get('.google.com'),
			'.google.de': scriptRules.get('.google.com'),
			'.amazon.co.uk': scriptRules.get('.amazon.com'),
			'.amazon.de': scriptRules.get('.amazon.com')
		});
	});
	

	/* ====================BLACKLIST===================== */

	var addBlacklist = addWhitelist.then(function () {
		return Rules.list['$predefined'].addMany({
			'*': {
				domain: {
					'*': {
						'^.*JSB_BLOCKED_SOURCE.*$': blacklistValue
					}
				}
			},
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
	});

	addBlacklist.then(function () {
		var blacklistDomain = {
			'*': {
				'*': [
					'tynt\\.com',
					'kontera\\.com',
					'snap\\.com',
					'(edge|pixel)\\.quantserve\\.com',
					'pagead[0-9]+\\.googlesyndication\\.com',
					'blogads\\.com',
					'admeld\\.com',
					'scorecardresearch\\.com',
					'connect\\.facebook\\.(com|net)',
					'platform\\.twitter\\.com',
					'engine\\.carbonads\\.com',
					'widgets\\.twimg\\.com',
					'media6degrees\\.com',
					'(ssl|www)\\.google\\-analytics\\.com',
					'(ad|stats)\.([a-z]+\\.)?doubleclick\.net',
					'getclicky\\.com',
					'infolinks\\.com',
					'clicktale\\.(net|com)',
					'zedo\\.com',
					'monster\\.com',
					'ensighten\\.com',
					'gorillanation\\.com',
					'bizographics\\.com',
					'widgets\\.digg\\.com',
					'chartbeat\\.com',
					'redditstatic.s3.amazonaws.com',
					'reddit.com',
					'verticalacuity\\.com',
					'sail\\-horizon\\.com',
					'kissmetrics\\.com',
					'legolas\\-media\\.com',
					'adzerk\\.(com|net)',
					'adtechus\\.com',
					'skimlinks\\.com',
					'visualwebsiteoptimizer\\.com',
					'marketo\\.(net|com)',
					'coremetrics\\.com',
					'serving\\-sys\\.com',
					'insightexpressai\\.com',
					'googletagservices\\.com',
					'live\\.spokenlayer\\.com',
					'linksalpha\\.com',
					'sharethis\\.com',
					'addthis\\.com'
				]
			},
			frame: {
				'*': [
					'facebook\\.com',
					'twitter\\.com',
					'plusone\\.google\\.(com|ca|co\\.uk)',
					'ads\\.[^\\.]+\\..*',
					'mediaplex\\.com',
					'legolas\\-media\\.com',
					'reddit.com',
					'linksalpha.com'
				]
			}
		};

		for (kind in blacklistDomain)
			for (domain in blacklistDomain[kind])
				for (i = 0; i < blacklistDomain[kind][domain].length; i++)
					Rules.list['$predefined'].addDomain(kind, domain, {
						rule: '^https?:\\/\\/([^\\/]+\.)?' + blacklistDomain[kind][domain][i] + '\\/.*$',
						action: 4,
						thirdParty: true
					});
	});
}
