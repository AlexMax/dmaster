// dmaster: A web-based Doom server browser and REST API.
// Copyright (C) 2013  Alex Mayfield
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var express = require('express');
var security = require('security');

var db = require('./db.js');

var webapp = express();

// App configuration
webapp.enable('trust proxy');

// App middleware
webapp.use(express.logger());
webapp.use(express.compress());
webapp.use('/static', express.static('static'));
webapp.locals.static = '/static/';

// Hogan templates
webapp.set('view engine', 'hgn');
webapp.set('layout', 'layout');
webapp.enable('view cache');
webapp.engine('hgn', require('hogan-express'));

// App routes
webapp.get('/', function(req, res) {
	res.redirect(301, '/servers');
});
webapp.get('/servers', function(req, res) {
	db.all(
		'SELECT DISTINCT address, port, servers.name, map, maxplayers, ' +
		'(SELECT COUNT(*) FROM players WHERE players.server_id = servers.id AND spectator = 0) AS players ' +
		'FROM servers LEFT JOIN players ON servers.id = players.server_id '+
		'WHERE servers.updated IS NOT NULL ORDER BY players DESC, servers.name;',
		function(err, rows) {
			if (err) {
				throw err;
			} else {
				// Mustache does not escape HTML attribute data according to
				// OWASP recommendations, so I do it here.
				for (var i = 0;i < rows.length;i++) {
					rows[i].escaped = {
						name: security.escapeHTMLAttribute(rows[i].name.toLowerCase())
					};
				}
				res.locals = {servers: rows};
				res.render('servers');
			}
		}
	);
});
webapp.get('/servers/:address::port', function(req, res) {
	res.send('server');
});

// REST routes v1
(function(prefix) {
	webapp.get(prefix + '/servers', function(req, res) {
		db.all(
			'SELECT address, port, maxplayers, maxclients, ' +
			'password, iwad, map, gametype, name, url, email ' +
			'FROM servers WHERE updated IS NOT NULL;',
			function(err, rows) {
				res.send(rows);
			}
		);
	});
	webapp.get(prefix + '/players', function(req, res) {
		db.all(
			'SELECT address, port, ping, score, team, spectator, players.name ' +
			'FROM players LEFT JOIN servers ON players.server_id = servers.id;',
			function(err, rows) {
				if (err) {
					throw err;
				} else {
					res.send(rows);
				}
			}
		);
	});
	webapp.get(prefix + '/servers/:address::port', function(req, res) {
		var address = req.params.address;
		var port = req.params.port;

		db.get(
			'SELECT address, port, maxplayers, maxclients, ' +
			'password, iwad, map, gametype, name, url, email ' +
			'FROM servers WHERE servers.address = ? AND servers.port = ?;',
			address, port, function(err, row) {
				if (row) {
					res.send(row);
				} else {
					res.send(404);
				}
			}
		);
	});
})('/api/v1');

module.exports = webapp;
