/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Paginator = function (element, options) {
	if (!Object._isPlainObject(options))
		options = {};

	this.__lastPage = null;
	this.__updateControllerTimeout = null;

	this.elementEvents = Paginator.elementEvents;

	this.pageCount = 0;
	this.itemCount = 0;
	this.container = element;
	this.itemsPerPage = options.itemsPerPage || 150;
	this.pageItemWrapper = (options.pageItemWrapper || $('<div>')).clone();
	this.paginatorWrapper = Template.create('main', 'paginator-wrapper');
	this.pagesContainer = $('.paginator-pages-container', this.paginatorWrapper);
	this.controller = $('.paginator-controller', this.paginatorWrapper);

	if (options.pageItemWrapper)
		options.pageItemWrapper.remove();

	this.superWithArgs(this.controller, '.paginator-controller-previous, .paginator-controller-next');
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
	var self = this,
		activePage = this.activePage(),
		from = (parseInt(activePage.attr('data-paginatorPageNumber'), 10) - 1) * this.itemsPerPage,
		to = Math.min(from + this.itemsPerPage, this.itemCount);

	this.controller.toggleClass('jsb-hidden', this.pagesContainer.children().length < 2);

	$('.paginator-controller-count-from', this.controller).each(function () {
		this.innerText = from + 1;
	});

	$('.paginator-controller-count-to', this.controller).each(function () { 
		this.innerText = to;
	});

	$('.paginator-controller-count-of', this.controller).each(function () {
		this.innerText = self.itemCount;
	});

	$('.paginator-controller-previous', this.controller).toggleClass('jsb-hidden', !activePage.prev().length);
	$('.paginator-controller-next', this.controller).toggleClass('jsb-hidden', !activePage.next().length);
};

Paginator.prototype.appendTo = function (element) {
	element.append(this.paginatorWrapper);
};

Paginator.prototype.hasPages = function () {
	return this.pagesContainer[0].hasChildNodes();
};

Paginator.prototype.createPage = function (setActive, ignoreController) {
	var isFirstPage = !this.__lastPage,
		pageItemWrapper = this.pageItemWrapper.clone().attr('data-paginatorPageNumber', ++this.pageCount);

	this.pagesContainer.append(pageItemWrapper);

	this.__lastPage = pageItemWrapper;

	if (setActive) {
		this.pagesContainer.children().removeClass('paginator-active');

		pageItemWrapper.addClass('paginator-active');
	}

	if (!isFirstPage && !ignoreController) {
		clearTimeout(this.__updateControllerTimeout);

		this.__updateControllerTimeout = setTimeout(function (self) {
			self.__updateController();
		}, 100, this);
	}

	return pageItemWrapper;
};

Paginator.prototype.activePage = function () {
	return this.pagesContainer.children('.paginator-active');
};

Paginator.prototype.addItem = function (item) {
	if (!this.__lastPage || this.__lastPage.children().length >= this.itemsPerPage)
		this.createPage(!this.__lastPage);

	this.__lastPage.append(item);

	this.itemCount++;

	return this;
};

Paginator.prototype.addItems = function (items) {
	var remainingItemSpace = this.__lastPage ? this.itemsPerPage - this.__lastPage.children().length : 0,
		fillCurrentPageItems = items.splice(0, remainingItemSpace),
		chunkedItems = items._chunk(this.itemsPerPage);

	if (remainingItemSpace)
		chunkedItems.unshift([fillCurrentPageItems]);		

	if (!this.__lastPage)
		this.createPage(true);

	for (var i = 0, b = chunkedItems.length; i < b; i++) {
		this.__lastPage.append(chunkedItems[i]);

		if (chunkedItems[i + 1])
			this.createPage();
	}

	this.itemCount += items.length;

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
