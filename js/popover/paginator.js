/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var Paginator = function (element, options) {
	if (!Object._isPlainObject(options))
		options = {};

	this.elementEvents = Paginator.elementEvents;

	this.container = element;
	this.itemsPerPage = options.itemsPerPage || 150;
	this.pagesWrapper = (options.pagesWrapper || $('<div>')).clone();
	this.paginatorWrapper = Template.create('main', 'paginator-wrapper');
	this.pagesContainer = $('.paginator-pages-container', this.paginatorWrapper);
	this.controller = $('.paginator-controller', this.paginatorWrapper);

	this.superWithArgs(element, '.paginator-controller-previous, .paginator-controller-next');
}._extends(MagicBinder);

Paginator.elementEvents = {
	click: function (self, event) {
		if (event.target.classList.contains('paginator-controller-previous'))
			self.previousPage();
		else
			self.nextPage();
	}
};

Paginator.prototype.__updateController = function () {
	var activePage = this.activePage();

	this.controller.toggleClass('jsb-hidden', $('.paginator-page', this.pagesContainer).length < 2);

	$('.paginator-controller-count-from', this.controller).text(activePage.find('.paginator-item:first').attr('data-paginatorItemNumber'));
	$('.paginator-controller-count-to', this.controller).text(activePage.find('.paginator-item:last').attr('data-paginatorItemNumber'));
	$('.paginator-controller-count-of', this.controller).text($('.paginator-item:last', this.pagesContainer).attr('data-paginatorItemNumber'));

	$('.paginator-controller-previous', this.controller).toggleClass('jsb-hidden', !activePage.prev().length);
	$('.paginator-controller-next', this.controller).toggleClass('jsb-hidden', !activePage.next().length);
};

Paginator.prototype.appendTo = function (element) {
	this.paginatorWrapper.appendTo(element);
};

Paginator.prototype.hasPages = function () {
	return $('.paginator-page', this.pagesContainer).length > 0;
};

Paginator.prototype.createPage = function (setActive) {
	var pagesWrapper = this.pagesWrapper.clone().addClass('paginator-page');

	pagesWrapper.appendTo(this.pagesContainer);

	if (setActive) {
		$('.paginator-page', this.pagesContainer).removeClass('paginator-active');

		pagesWrapper.addClass('paginator-active');
	}

	this.__updateController();

	return pagesWrapper;
};

Paginator.prototype.activePage = function () {
	return $('.paginator-active', this.paginatorWrapper);
};

Paginator.prototype.lastPage = function () {
	var lastPage = $('.paginator-page:last', this.paginatorWrapper);

	return lastPage.length ? lastPage : this.createPage(true);
};

Paginator.prototype.addItem = function (item, isPreWrapped) {
	var lastPage = this.lastPage();

	if ($('.paginator-item', lastPage).length >= this.itemsPerPage)
		lastPage = this.createPage();

	item.addClass('paginator-item').attr('data-paginatorItemNumber', $('.paginator-item', this.pagesContainer).length + 1);

	lastPage.append(item);

	return this;
};

Paginator.prototype.nextPage = function () {
	var activePage = this.activePage(),
			nextPage = activePage.next();

	if (nextPage.length) {
		activePage.removeClass('paginator-active');
		nextPage.addClass('paginator-active');
	}

	this.__updateController();

	return this;
};

Paginator.prototype.previousPage = function () {
	var activePage = this.activePage(),
			previousPage = activePage.prev();

	if (previousPage.length) {
		activePage.removeClass('paginator-active');
		previousPage.addClass('paginator-active');
	}

	this.__updateController();

	return this;
};
