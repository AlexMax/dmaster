(function() {
	function filter(query) {
		var servers = $('div[data-name]');

		if (!query) {
			servers.show();
			return;
		}

		var query = query.toLowerCase().split(' ');

		servers.each(function(i) {
			var self = $(this)
			var name = self.data('name');

			for (var i = 0;i < query.length;i++) {
				if (name.indexOf(query[i]) == -1) {
					self.hide();
					return;
				}
			}
			self.show();
		});
	}

	$('#filter').keyup(function(e) {
		filter($(this).val());
	});

	var flags_cache = {};

	// Check boxes based on numeric value
	function recheck(base, flags) {
		for (var i = 0;i < 32;i++) {
			var shifted = 1 << i;

			var key = '#' + base + '_' + shifted + '_check';
			if (!(key in flags_cache)) {
				flags_cache[key] = $(key);
			}
			var selector = flags_cache[key];

			if (flags & shifted) {
				selector.prop('checked', true)
			} else {
				selector.prop('checked', false);
			}
		}
	}

	// Change numeric value based on check
	function recalculate(base) {
		var numeric = $('#' + base + '_numeric');

		var flags = 0;
		for (var i = 0;i < 32;i++) {
			var shifted = 1 << i;

			var key = '#' + base + '_' + shifted + '_check';
			if (!(key in flags_cache)) {
				flags_cache[key] = $(key);
			}

			var selector = flags_cache[key];
			if (selector.length > 0) {
				var checked = selector.prop('checked');
				if (checked) {
					flags += shifted;
				}
			}
		}

		numeric.val(flags);
	}

	// DMFlags functionality
	$('.flags_numeric').change(function(e) {
		recheck($(this).data('for'), $(this).val());
	});

	$('.flag_check').change(function(e) {
		recalculate($(this).data('for'));
	});

	$('.flag_help').click(function(e) {
		e.preventDefault();
		alert($(this).data('description'));
	});
})();
