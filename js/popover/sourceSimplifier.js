"use strict";

var SourceSimplifier = {
	simplifySource: function (host, url) {
		var ref;

		for (var simplified in SourceSimplifier.__map) {
			ref = SourceSimplifier.__map[simplified];

			if (ref instanceof Array) {
				for (var i = ref.length; i--;) {
					if (ref[i] instanceof RegExp) {
						if (ref[i].test(url.toLowerCase()))
							return simplified
					} else if ((ref[i][0] === '.' && host._endsWith(ref[i])) || host === ref[i])
						return simplified;
				}
			} else if ((ref instanceof RegExp) && ref.test(url.toLowerCase()))
				return simplified;
		}

		return null;
	}
};

SourceSimplifier.__map = {
	'Advertisements': /(^.*\?file=ads&.*$)|(^https?:\/\/([^\/]+\.)?(adsafeprotected|bkrtx)\.com\/.*$)|(^.*\/recommendations\/ad\..*$)|(^.*\/smartbanner\/.*$)|(^https?:\/\/([^\/]+\.)?ads\.[^\.]+\..*\/.*$)|(^.*:\/\/ads\..*$)|(^.*_(160x600|728x90|320x250)_?\..*$)|(^.*(160x600|728x90)\.html?.*$)|(^.*=300x250&.*$)/,
	'Tracking': /^(https?:\/\/([^\/]+\.)?a\.wikia-beacon\.com\/.*)|(.*\/analytics\/js\/.*)$/,

	'Atlas Tracking': ['.atdmt.com'],
	'JavaScript Frameworks': ['ajax.googleapis.com'],
	'Google Tracking': /^(.*\/google-analytics-.*)|(https?:\/\/([^\/]+\.)?(google-analytics|googletagservices)\.com\/.*)$/,
	'Twitter': ['platform.twitter.com', 'www.twitter.com'],
	'Reddit': ['www.reddit.com'],
	'Facebook': /^https?:\/\/([^\/]+\.)?facebook\.(com|net)\/.*$/,
	'Chartbeat Tracking': ['static.chartbeat.com'],
	'Google Plus': /(^https?:\/\/apis\.google\.com\/js\/plusone\.js$)|(^.*\/googleplus\..*$)/,
	'Google Advertisements': ['.googleadservices.com', 'googleadservices.com', 'pagead2.googlesyndication.com', '.doubleclick.net', 'doubleclick.net'],
	'IntelliTXT Advertisements': /^https?:\/\/([^\/]+\.)?intellitxt\.com\/intellitxt\/.*$/,
	'Scorecard Research Tracking': ['.scorecardresearch.com'],
	'CPMStar Advertisements': ['.cpmstar.com', 'cpmstar.com'],
	'Gorilla Nation Advertisements': ['cdn.triggertag.gorillanation.com'],
	'Quantserve Tracking and Ads': /^(.*\/quant\.js.*$)|(https?:\/\/(edge|secure|pixel)\.quantserve\.com\/.*)$/,
	'Krux Tracking': ['cdn.krxd.net'],
	'PubGears Advertisements': ['tags.pubgears.com'],
	'OpenX Advertisements': /^.*\.openx\..*$/,
	'Lotame Advertisements': ['.crwdcntrl.net'],
	'Marketo Tracking': ['munchkin.marketo.net'],
	'Qualaroo Tracking': /(^https?:\/\/([^\/]+\.)?amazonaws\.com\/ki\.js\/.*$)/,
	'Liji Tracking and Ads': /^https?:\/\/([^\/]+\.)?lijit\.com\/delivery\/.*$/,
	'Amazon Advertisements': /(^https?:\/\/([^\/]+\.)?amazon-adsystem\.com([^a-zA-Z0-9_\.%-]+|$).*$)|(^https?:\/\/([^\/]+\.)?amazon\.com\/aan\/.*$)|(^https?:\/\/([^\/]+\.)?amazon\.com([^a-zA-Z0-9_\.%-]+|$).*\/getaanad\?.*$)/,
	'ValueClick Advertisements': ['media.fastclick.net'],
	'Contextly Recommendations': /^https?:\/\/([^\/]+\.)?contextly\.com([^a-zA-Z0-9_\.%-]+|$).*$/,
	'Pingdom Website Monitoring': ['rum-static.pingdom.net'],
	'GoTraffic Advertisements': ['cdn.gotraffic.net'],
	'Perfect Market Tracking': ['widget.perfectmarket.com'],
	'Truste Tracking': /^https?:\/\/([^\/]+\.)?truste\.com\/notice\?.*consent-track.*$/,
	'Newstogram Recommendations': ['static.newstogram.com'],
	'Quintelligence Tracking': ['.quintelligence.com', 'quintelligence.com'],
	'New Relic Website Monitoring': ['js-agent.newrelic.com'],
	'Skimlinks Tracking': /^https?:\/\/([^\/]+\.)?(skimresources|skimlinks)\.com\/.*$/,
	'Parsely Tracking': ['static.parsely.com'],
	'Pinterest': ['assets.pinterest.com'],
	'Optimizely Tracking': ['.optimizely.com'],
	'ADTECH Advertisements': ['adserver.adtech.com'],
	'MotherJones Tracking': /^https?:\/\/([^\/]+\.)?amazonaws\.com\/ansible\.js.*$/,
	'Ensighten Tracking': ['nexus.ensighten.com'],
	'Media.net Advertisements': ['contextual.media.net'],
	'LinkSmart Tracking': ['cdn.linksmart.com'],
	'Tynt Clipboard Modifier': /^https?:\/\/([^\/]+\.)?tynt\.com\/.*$/,
	'Bounce Exchange Tracking': ['bounceexchange.com'],
	'IndustryBrains Advertisements': /^https?:\/\/([^\/]+\.)?industrybrains\.com([^a-zA-Z0-9_\.%-]+|$).*$/,
	'Dynamic Logic Advertisements': ['content.dl-rms.com'],
	'AddThis Social': ['addthis.com', '.addthis.com'],
	'ShareThis Social': ['sharethis.com', '.sharethis.com'],
	'Tumblr': ['platform.tumblr.com'],
	'Sharethrough Advertisements': ['apis.sharethrough.com', 'native.sharethrough.com'],
	'Bizographics Advertisements': ['bizographics.com', '.bizographics.com'],
	'AdRoll Advertisements': ['adroll.com', '.adroll.com'],
	'Compete Tracking': ['compete.com', '.compete.com'],
	'MaxMind Tracking': ['maxmind.com', '.maxmind.com'],
	'Peer39 Advertisements': ['stags.peer39.net'],
	'AdSpeed Advertisements': ['adspeed.com', '.adspeed.com'],
	'Effective Measure Advertisements': ['me-cdn.effectivemeasure.net'],
	'PubMatic Advertisements': ['adspubmatic.com'],
	'Moat Ad Advertisements': ['moatads.com', '.moatads.com'],
	'InsightExpress Tracking': ['insightexpressai.com', '.insightexpressai.com'],
	'LimeLightNetworks Ads': ['llnwd.net', '.llnwd.net'],
	'LinkedIn': ['platform.linkedin.com'],
	'nRelate Recommendations': ['api.nrelate.com'],
	'Wordpress Tracking': ['stats.wordpress.com', 'stats.wp.com'],
	'Criteo Advertisements': /^https?:\/\/([^\/]+\.)?criteo\.com\/.*$/,
	'Visual Revenue Tracking': /^https?:\/\/([^\/]+\.)?visualrevenue\.com\/.*$/,
	'Newsinc Tracking': /^https?:\/\/([^\/]+\.)?newsinc\.com\/.*$/,
	'YieldMo Advertisements': ['static.yieldmo.com'],
	'StumbleUpon': ['www.stumbleupon.com'],
	'Simplifi Advertisements': /^https?:\/\/([^\/]+\.)?simpli\.fi\/.*$/,
	'Project Wonderful Ads': ['www.projectwonderful.com'],
	'Adzerk Advertisements': ['static.adzerk.net'],
	'Fonts.com Tracking': /^https?:\/\/([^\/]+\.)?fonts\.com\/t\/trackingCode\.js.*$/,
	'ru4 Advertisements': /^https?:\/\/([^\/]+\.)?ru4\.com\/.*$/,
	'Adobe Tracking': /^https?:\/\/([^\/]+\.)?omtrdc\.net([^a-zA-Z0-9_\.%-]+|$).*$/,
	'Federated Media Ads': ['static.fmpub.net'],
	'BuySellAds Advertisements': /^https?:\/\/([^\/]+\.)?buysellads\.com\/.*$/,
	'RadiumOne Advertisements': /^https?:\/\/([^\/]+\.)?gwallet\.com\/.*$/,
	'ZDTag Tracking': /^https?:\/\/([^\/]+\.)?zdtag\.com\/.*$/,
	'PriceGrabber': /^https?:\/\/([^\/]+\.)?pricegrabber\.com\/cb_table\.php.*$/,
	'Evidon Tracking': /^https?:\/\/([^\/]+\.)?betrad\.com\/.*$/,
	'StatCounter Tracking': /^https?:\/\/([^\/]+\.)?statcounter\.com\/.*$/,
	'AdExcite Advertisements': /^https?:\/\/([^\/]+\.)?adexcite\.com\/.*$/,
	'NetShelter Advertisements': /^https?:\/\/([^\/]+\.)?netshelter\.net\/.*$/,
	'Monetate Tracking': /^https?:\/\/([^\/]+\.)?monetate\.net\/.*$/,
	'Foresee Tracking': /^.*\/foresee\/.*$/,
	'WebTrends Tracking': /^.*\/wt(base|init)\.js.*$/,
	'24/7 RealMedia Advertisements': /^(https?:\/\/([^\/]+\.)?247realmedia\.com\/.*)|(.*\/adstream_.*)|(.*\/realmedia\/ads\/.*)$/,
	'OwnerIQ Tracking': /^https?:\/\/([^\/]+\.)?owneriq\.net\/.*$/,
	'MIG Advertisements': /^https?:\/\/([^\/]+\.)?mookie1\.com\/.*$/,
	'Rubicon Advertisements': ['.rubiconproject.com'],
	'TripleLift Advertisements': ['.3lift.com']
};
