var express = require('express');
var db = require('./db.js');

var webapp = express();

// App configuration
webapp.use(express.logger());
webapp.use(express.compress());
webapp.use('/static', express.static('static'));

// App routes
webapp.get('/', function(req, res) {
	res.send('hello, world!');
});

// REST routes v1
(function(prefix) {
	webapp.get(prefix + '/servers', function(req, res) {
		db.all('SELECT * FROM servers;', function(err, rows) {
			res.send(rows);
		});
	});
	webapp.get(prefix + '/servers/:address::port', function(req, res) {
		var address = req.params.address;
		var port = req.params.port;

		db.get(
			'SELECT * FROM servers AS s ' +
			'WHERE s.address = ? AND s.port = ?;'
		, address, port, function(err, row) {
			if (row) {
				res.send(row);
			} else {
				res.send(404);
			}
		});
	});
})('/api/v1');

module.exports = webapp;
