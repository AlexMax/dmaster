var express = require('express');
var db = require('./db.js');

var webapp = express();

webapp.get('/', function(req, res) {
	res.redirect(301, 'servers');
});
webapp.get('/servers', function(req, res) {
	db.all('SELECT * FROM servers;', function(err, rows) {
		res.send(rows);
	});
});
webapp.get('/servers/:address::port', function(req, res) {
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

module.exports = webapp;
