$(function() {
	$('li section, .help-text')
		.css('display', 'none')
		.prev('p')
		.addClass('clickable')
		.click(function() {
			$(this).next().toggle();
		})
		.prepend($('<img class="info" src="images/info.png" alt="More Info" height="16" width="16" />'));

	$('img').click(function () {
		window.open(this.src);
	});

	$('article > header').each(function () {
		if (this.id)
			$('<li><a href="#' + this.id + '">' + $('h3', this).html() + '</a></li>').appendTo($('#jump-to'));
	})
});