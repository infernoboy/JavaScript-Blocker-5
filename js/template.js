"use strict";

function Template (template, file) {
	this.cache = {
		'true': {},
		'false': {}
	};

	this.name = file;
	this.template = $(template);

	// document.createDocumentFragment();
};

Template.__templates = {};

Template.event = new EventListener;

Template.load = function (file) {
	if (Template.__templates[file])
		return Template.__templates[file];

	$.ajax({
		async: false,
		url: ExtensionURL('template/' + file + '.html')
	}).done(function (template) {
			Template.__templates[file] = new Template(template, file);

			Template.event.trigger('load.' + file, template, true);
		})
		.fail(function (error) {
			LogError('failed to load template file - ' + file, error);
		});

	return Template.__templates[file];
};

Template.unload = function (file) {
	delete Template.__templates[file];
};

Template.create = function (template, section, data, shouldBeWrapped, returnString) {
	if (!Template.__templates.hasOwnProperty(template))
		throw new Error('template file not loaded - ' + template);

	var element = Template.__templates[template].create(section, data, false, returnString);

	if (shouldBeWrapped)
		return $('<div />').append(element);

	return element;
};

Template.prototype.create = function (section, data, isHTML, returnString) {
	// Simple JavaScript Templating
	// John Resig - http://ejohn.org/ - MIT Licensed

	var fn;

	if (data !== false && typeof data !== 'object')
		data = {};

	var cache = this.cache[!!returnString];

	if (section in cache)
		fn = cache[section];
	else if (!isHTML) {
		var template = this.get(section);

		if (!template.length)
			throw new Error('section not found in template: ' + this.name + ' - ' + section);

		fn = this.create(template.text(), false, true, returnString);

		cache[section] = fn;
	} else
		fn = cache[section] = new Function('self', "var p=[];p.push('" +
			section
				.replace(/[\r\t\n]/g, " ")
				.replace(/'(?=[^%]*%>)/g, "\t")
				.replace(/'/g, "\\'")
				.replace(/\t/g, "'")
				.replace(/<%=(.+?)%>/g, "',$1,'")
				.replace(/<%/g, "');")
				.replace(/%>/g, "p.push('")
			+ "');return " + (returnString ? "p.join('');" : "$(p.join(''));"));

	section = undefined;

	return data ? fn(data) : fn;
};

Template.prototype.get = function (section) {
	return this.template.filter('#' + section);
};
