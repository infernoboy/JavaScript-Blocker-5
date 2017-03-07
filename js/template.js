/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function Template (template, file) {
	this.cache = {};

	this.name = file;
	this.template = $(template);

	// document.createDocumentFragment();
}

Template.__templates = {};
Template.__autoLoaded = [];

Template.event = new EventListener;

Template.load = function (file) {
	if (Template.__templates[file])
		return Template.__templates[file];

	$.ajax({
		async: false,
		url: ExtensionURL('template/' + file + '.html')
	})
		.done(function (template) {
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
	if (!Template.__templates.hasOwnProperty(template)) {
		if (Template.__autoLoaded._contains(template))
			throw new Error('auto load for template failed - ' + template);

		Template.__autoLoaded.push(template);

		Template.load(template);

		return Template.create.apply(null, arguments);
	}

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

	if (section in this.cache)
		fn = this.cache[section];
	else if (!isHTML) {
		var template = this.get(section);

		if (!template.length)
			throw new Error('section not found in template: ' + this.name + ' - ' + section);

		fn = this.create(template.text(), false, true, returnString);

		this.cache[section] = fn;
	} else
		fn = this.cache[section] = new Function('self', 'returnString', "var ___=[];___.push('" +
			section
				.replace(/[\r\t\n]/g, " ")
				.replace(/'(?=[^%]*%>)/g, "\t")
				.replace(/'/g, "\\'")
				.replace(/\t/g, "'")
				.replace(/<%=(.+?)%>/g, "',$1,'")
				.replace(/<%/g, "');")
				.replace(/%>/g, "___.push('")
			+ "');return returnString ? ___.join('') : $(___.join(''));");

	section = undefined;

	return data ? fn(data, returnString) : fn;
};

Template.prototype.get = function (section) {
	return this.template.filter('#' + section);
};
