/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var SourceDescription = {	
	getDescription: function (host, url) {
		var ref;

		for (var simplified in SourceDescription.__map) {
			ref = SourceDescription.__map[simplified];

			if (ref instanceof Array) {
				for (var i = ref.length; i--;)
					if (ref[i] instanceof RegExp) {
						if (ref[i].test(url.toLowerCase()))
							return simplified;
					} else if ((ref[i][0] === '.' && host._endsWith(ref[i])) || host === ref[i])
						return simplified;
			} else if ((ref instanceof RegExp) && ref.test(url.toLowerCase()))
				return simplified;
		}

		return null;
	},

	describe: function (domain, rule, descriptions) {
		if (Object._isPlainObject(rule)) {
			for (var ruleText in rule)
				SourceDescription.describe(domain, ruleText, rule[ruleText]);

			return;
		}

		Rules.list.description.addDomain('*', domain, {
			rule: rule,
			meta: descriptions
		});
	}
};

SourceDescription.describe('*', {
	// Allowed
	'^https?:\\/\\/www\\.google\\.com\\/jsapi((\\?|#)+.*)?$': ['required', 'jsFrameworks'],
	'^.*\\/prototype\\.js((\\?|#)+.*)?$': ['required', 'prototype'],
	'^.*\\/jquery(\\-ui)?\\-[1-9]\\.[0-9]+\\.[0-9]+(\\.min)?\\.js((\\?|#)+.*)?$': ['required', 'jquery'],
	'^.*\\/jquery\\.[^.\\/]+\\.js((\\?|#)+.*)?$': ['required', 'jquery'],
	'^.*\\/jquery\\.js((\\?|#)+.*)?$': ['required', 'jquery'],
	'^.*\\/jquery(\\-ui|\\.ui)(\\.[^.\\/]+)?\\.js$': ['required', 'jquery'],
	'^https?:\\/\\/www\\.google\\.com\\/recaptcha\\/api\\/.*$': ['required', 'recaptcha'],

	'ajax.googleapis.com': ['required', 'jsFrameworks'],
	'www.readability.com': ['readability'],
	'seal.verisign.com': ['verisign'],
	'api.solvemedia.com': ['solvemedia'],
	's1.wp.com': ['wordpress'],


	// Blocked
	'^(^.*\\?file=ads&.*$)|(^https?:\\/\\/([^\\/]+\\.)?(adsafeprotected|bkrtx)\\.com\\/.*$)|(^.*\\/recommendations\\/ad\\..*$)|(^.*\\/smartbanner\\/.*$)|(^https?:\\/\\/([^\\/]+\\.)?ads\\.[^\\.]+\\..*\\/.*$)|(^.*:\\/\\/ads\\..*$)|(^.*_(160x600|728x90|320x250)_?\\..*$)|(^.*(160x600|728x90)\\.html?.*$)|(^.*=300x250&.*$)$': ['ads'],
	'^(.*\\/analytics\\/js\\/.*)|(.*\/spc\.php.*)$': ['tracking'],
	'^(.*\\/google-analytics-.*)|(https?:\\/\\/([^\\/]+\\.)?(google-analytics|googletagservices)\\.com\\/.*)$': ['googleTracking'],
	'^(^https?:\\/\\/apis\\.google\\.com\\/js\\/plusone\\.js$)|(^.*\\/googleplus\\..*$)$': ['googlePlus'],
	'^https?:\\/\\/([^\\/]+\\.)?intellitxt\\.com\\/intellitxt\\/.*$': ['intellitxt'],
	'^(.*\\/quant\\.js.*$)|(https?:\\/\\/(edge|secure|pixel)\\.quantserve\\.com\\/.*)$': ['quantserve'],
	'^.*\\.openx\\..*$': ['openx'],
	'^(^https?:\\/\\/([^\\/]+\\.)?amazonaws\\.com\\/ki\\.js\\/.*$)$': ['qualaroo'],
	'^https?:\\/\\/([^\\/]+\\.)?lijit\\.com\\/delivery\\/.*$': ['liji'],
	'^(^https?:\\/\\/([^\\/]+\\.)?amazon-adsystem\\.com([^a-zA-Z0-9_\\.%-]+|$).*$)|(^https?:\\/\\/([^\\/]+\\.)?amazon\\.com\\/aan\\/.*$)|(^https?:\\/\\/([^\\/]+\\.)?amazon\\.com([^a-zA-Z0-9_\\.%-]+|$).*\\/getaanad\\?.*$)$': ['amazonAds'],
	'^https?:\\/\\/([^\\/]+\\.)?contextly\\.com([^a-zA-Z0-9_\\.%-]+|$).*$': ['contextly'],
	'^https?:\\/\\/([^\\/]+\\.)?truste\\.com\\/notice\\?.*consent-track.*$': ['truste'],
	'^https?:\\/\\/([^\\/]+\\.)?amazonaws\\.com\\/ansible\\.js.*$': ['motherjones'],
	'^https?:\\/\\/([^\\/]+\\.)?fonts\\.com\\/t\\/trackingCode\\.js.*$': ['fonts'],
	'^https?:\\/\\/([^\\/]+\\.)?pricegrabber\\.com\\/cb_table\\.php.*$': ['pricegrabber'],
	'^https?:\\/\\/([^\\/]+\\.)?github\\.com\\/_stats.*$': ['githubTracking'],
	'^.*\\/foresee\\/.*$': ['foresee'],
	'^.*\\/wt(base|init)\\.js.*$': ['webtrends'],
	'^(https?:\\/\\/([^\\/]+\\.)?247realmedia\\.com\\/.*)|(.*\\/adstream_.*)|(.*\\/realmedia\\/ads\\/.*)$': ['realmedia'],

	'.crazyegg.com': ['crazyegg'],
	'.wikia-beacon.com': ['wikiaTracking'],
	'collector-cdn.github.com': ['githubTracking'],
	'fls-na.amazon.com': ['amazonTracking'],
	'tynt.com': ['tynt'],
	'industrybrains.com': ['industrybrains'],
	'criteo.com': ['criteo'],
	'visualrevenue.com': ['visual'],
	'newsinc.com': ['newsinc'],
	'simpli.fi': ['simplifi'],
	'skimlinks.com': ['skimlinks'],
	'skimresources.com': ['skimlinks'],
	'ru4.com': ['ru4'],
	'omtrdc.net': ['adobe'],
	'buysellads.com': ['buysell'],
	'gwallet.com': ['radium'],
	'zdtag.com': ['zdtag'],
	'betrad.com': ['evidon'],
	'statcounter.com': ['statcounter'],
	'adexcite.com': ['adexcite'],
	'netshelter.net': ['netshelter'],
	'monetate.net': ['monetate'],
	'owneriq.net': ['owneriq'],
	'mookie1.com': ['mig'],
	'.digg.com': ['digg'],
	'.atdmt.com': ['atlas'],
	'platform.twitter.com': ['twitter'],
	'www.twitter.com': ['twitter'],
	'www.reddit.com': ['reddit'],
	'.facebook.com': ['facebook'],
	'.facebook.net': ['facebook'],
	'static.chartbeat.com': ['chartbeat'],
	'.googleadservices.com': ['googleAds'],
	'pagead2.googlesyndication.com': ['googleAds'],
	'.doubleclick.net': ['googleAds'],
	'.scorecardresearch.com': ['scorecard'],
	'.cpmstar.com': ['cpmstar'],
	'cdn.triggertag.gorillanation.com': ['gorilla'],
	'cdn.krxd.net': ['krux'],
	'tags.pubgears.com': ['pubgears'],
	'.crwdcntrl.net': ['lotame'],
	'munchkin.marketo.net': ['marketo'],
	'media.fastclick.net': ['valueclick'],
	'rum-static.pingdom.net': ['pingdom'],
	'cdn.gotraffic.net': ['gotraffic'],
	'widget.perfectmarket.com': ['perfect'],
	'static.newstogram.com': ['newstogram'],
	'.quintelligence.com': ['quint'],
	'js-agent.newrelic.com': ['newRelic'],
	'static.parsely.com': ['parsely'],
	'assets.pinterest.com': ['pinterest'],
	'.optimizely.com': ['optimizely'],
	'adserver.adtech.com': ['adtech'],
	'nexus.ensighten.com': ['ensighten'],
	'contextual.media.net': ['medianet'],
	'cdn.linksmart.com': ['linksmart'],
	'bounceexchange.com': ['bounce'],
	'content.dl-rms.com': ['dynamic'],
	'.addthis.com': ['addthis'],
	'.sharethis.com': ['sharethis'],
	'platform.tumblr.com': ['tumblr'],
	'apis.sharethrough.com': ['sharethrough'],
	'native.sharethrough.com': ['sharethrough'],
	'.bizographics.com': ['bizographics'],
	'.adroll.com': ['adroll'],
	'.compete.com': ['compete'],
	'.maxmind.com': ['maxmind'],
	'stags.peer39.net': ['peer39'],
	'.adspeed.com': ['adspeed'],
	'me-cdn.effectivemeasure.net': ['effectivemeasure'],
	'adspubmatic.com': ['pubmatic'],
	'.moatads.com': ['moatads'],
	'.insightexpressai.com': ['insight'],
	'.llnwd.net': ['limelight'],
	'platform.linkedin.com': ['linkedin'],
	'api.nrelate.com': ['nrelate'],
	'stats.wordpress.com': ['wordpress'],
	'stats.wp.com': ['wordpress'],
	'static.yieldmo.com': ['yieldmo'],
	'www.stumbleupon.com': ['stumbleupon'],
	'www.projectwonderful.com': ['wonderful'],
	'static.adzerk.net': ['adzerk'],
	'static.fmpub.net': ['federated'],
	'.rubiconproject.com': ['rubicon'],
	'.3lift.com': ['triple']
});

SourceDescription.describe('.reddit.com', {
	'^https?:\\/\\/(www\\.|ssl\\.)?reddit\\.com\\/(?!api\\/request_promo.*)$': ['required', 'reddit'],
	'www.redditstatic.com': ['required', 'reddit'],
	'redditstatic.s3.amazonaws.com': ['required', 'reddit']
});

SourceDescription.describe('.amazon.com', {
	'.ssl-images-amazon.com': ['required'],
	'.images-amazon.com': ['required']
});

SourceDescription.describe('.digg.com', '.digg.com', ['required']);
SourceDescription.describe('.twitter.com', '^.*advertiser_name=.*$', ['twitterAds']);
SourceDescription.describe('.homedepot.com', 'nexus.ensighten.com', ['required']);
SourceDescription.describe('.youtube.com', '.ytimg.com', ['required', 'youtube']);
