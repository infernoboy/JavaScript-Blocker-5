/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var Paginator = function (element, options) {
	if (!Object._isPlainObject(options))
		options = {};

	this.__lastPage = null;
	this.__updateControllerTimeout = null;

	this.elementEvents = Paginator.elementEvents;

	this.itemCount = 0;
	this.container = element;
	this.itemsPerPage = options.itemsPerPage || 200;
	this.pageItemWrapper = (options.pageItemWrapper || $('<div>')).clone();
	this.paginatorWrapper = Template.create('main', 'paginator-wrapper');
	this.pagesContainer = $('.paginator-pages-container', this.paginatorWrapper);
	this.controller = $('.paginator-controller', this.paginatorWrapper);

	if (options.pageItemWrapper)
		options.pageItemWrapper.remove();

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

	this.controller.toggleClass('jsb-hidden', this.pagesContainer.children('.paginator-page').length < 2);

	$('.paginator-controller-count-from', this.controller).text(activePage.children('.paginator-item:first').attr('data-paginatorItemNumber'));
	$('.paginator-controller-count-to', this.controller).text(activePage.children('.paginator-item:last').attr('data-paginatorItemNumber'));
	$('.paginator-controller-count-of', this.controller).text(this.itemCount);

	$('.paginator-controller-previous', this.controller).toggleClass('jsb-hidden', !activePage.prev().length);
	$('.paginator-controller-next', this.controller).toggleClass('jsb-hidden', !activePage.next().length);
};

Paginator.prototype.appendTo = function (element) {
	this.paginatorWrapper.appendTo(element);
};

Paginator.prototype.hasPages = function () {
	return this.pagesContainer.children().length > 0;
};

Paginator.prototype.createPage = function (setActive) {
	var isFirstPage = !this.__lastPage,
			pageItemWrapper = this.pageItemWrapper.clone().addClass('paginator-page');

	pageItemWrapper.appendTo(this.pagesContainer);

	this.__lastPage = pageItemWrapper;

	if (setActive) {
		$('> .paginator-page', this.pagesContainer).removeClass('paginator-active');

		pageItemWrapper.addClass('paginator-active');
	}

	if (!isFirstPage) {
		clearTimeout(this.__updateControllerTimeout)

		this.__updateControllerTimeout = setTimeout(function (self) {
			self.__updateController();
		}, 100, this)
	}

	return pageItemWrapper;
};

Paginator.prototype.activePage = function () {
	return this.pagesContainer.children('.paginator-active')
};

Paginator.prototype.addItem = function (item) {
	if (!this.__lastPage || $('> .paginator-item', this.__lastPage).length >= this.itemsPerPage)
		this.createPage(!this.__lastPage);

	item.addClass('paginator-item').attr('data-paginatorItemNumber', ++this.itemCount);

	this.__lastPage.append(item);

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
