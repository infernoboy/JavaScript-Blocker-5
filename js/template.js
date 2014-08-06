"use strict";

function Template (template, file) {
	this.cache = {};
	this.name = file;
	this.template = $(template);

	// document.createDocumentFragment();
};

Template.__templates = {};

Template.event = new EventListener;

Template.ref = function (template) {
	return Template.__templates[template];
};

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
			LogError(['unable to load template file', file, error]);
		});

	return Template.__templates[file];
};

Template.create = function (template, section, data, shouldBeWrapped) {
	if (!Template.__templates.hasOwnProperty(template))
		throw new Error('template file not loaded - ' + template);

	var element = Template.__templates[template].create(section, data);

	if (shouldBeWrapped)
		return $('<div />').append(element);

	return element;
};

Template.prototype.create = function (section, data, isHTML) {
	// Simple JavaScript Templating
	// John Resig - http://ejohn.org/ - MIT Licensed

	var fn;

	if (data !== false && typeof data !== 'object')
		data = {};

	if (section in this.cache)
		fn = this.cache[section];
	else if (!isHTML) {
		var template = this.get(section);

		if (!template.length)
			throw new Error('section not found in template: ' + this.name + ' - ' + section);

		fn = this.create(template.text(), false, true);

		this.cache[section] = fn;
	} else
		fn = this.cache[section] = new Function('self', "var p=[];p.push('" +
			section
				.replace(/[\r\t\n]/g, " ")
				.replace(/'(?=[^%]*%>)/g, "\t")
				.replace(/'/g, "\\'")
				.replace(/\t/g, "'")
				.replace(/<%=(.+?)%>/g, "',$1,'")
				.replace(/<%/g, "');")
				.replace(/%>/g, "p.push('")
			+ "');return $(p.join(''));");

	section = undefined;

	return data ? fn(data) : fn;
};

Template.prototype.get = function (section) {
	return this.template.filter('#' + section);
};
