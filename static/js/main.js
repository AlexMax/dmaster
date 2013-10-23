(function() {
	function filter(query) {
		var servers = $('tr[data-name]');

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
	})
})();
