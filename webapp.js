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

var config = require('config');
var express = require('express');
var security = require('security');
var util = require('util');

var db = require('./db.js');

var webapp = express();

// App configuration
webapp.enable('trust proxy');

// App middleware
webapp.use(express.logger());
webapp.use(express.compress());
webapp.use('/static', express.static('static'));
webapp.locals.ga = config.dmaster.ga;
webapp.locals.static = '/static/';
webapp.locals.title = config.dmaster.title;

// Hogan templates
webapp.set('view engine', 'hgn');
webapp.set('layout', 'layout');
webapp.enable('view cache');
webapp.engine('hgn', require('hogan-express'));
webapp.locals.partials = {menu: 'menu'};

// App routes
webapp.get('/', function(req, res) {
	res.redirect(301, '/servers');
});
webapp.get('/servers', function(req, res) {
	db.servers()
	.then(function(rows) {
		for (var i = 0;i < rows.length;i++) {
			// Mustache does not escape HTML attribute data according to
			// OWASP recommendations, so I do it here.  In theory, normal
			// HTML escaping is adequite for double-quoted attributes, but
			// I feel safer with this.
			rows[i].sanitized = {
				name: security.escapeHTMLAttribute(rows[i].name.toLowerCase())
			};

			// Handle the flag classes here.  No escaping here because this is
			// not userdata.
			if (rows[i].country) {
				rows[i].sanitized.flagclass = 'flag-' + rows[i].country.toLowerCase();
			}
		}
		res.locals = {servers: rows};
		res.render('servers', {subtitle: 'Servers'});
	})
	.fail(function(error) {
		util.log(error);
		res.send(500);
	})
	.done();
});
webapp.get('/servers/:address::port', function(req, res) {
	res.send('server');
});

// REST routes v1
(function(prefix) {
	webapp.get(prefix + '/servers', function(req, res) {
		db.servers()
		.then(function(rows) {
			res.send(rows);
		})
		.fail(function(error) {
			util.log(error);
			res.send(500, {'code': 500, 'error': 'Internal Server Error'});
		})
		.done();
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
