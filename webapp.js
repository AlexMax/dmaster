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
var fs = require('fs');
var express = require('express');
var q = require('q');
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
			// Sanitized data-name
			rows[i].dataname = rows[i].name.toLowerCase();

			// Country flags
			if (rows[i].country) {
				rows[i].flagclass = 'flag-' + rows[i].country.toLowerCase();
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
	var address = req.params.address;
	var port = req.params.port;

	q.spread(
		[db.server(address, port), db.serverPlayers(address, port)],
		function (server, players) {
			// If server doesn't exist, 404 the page.
			if (server === undefined) {
				res.send(404);
				return;
			}

			// Country flags
			if (server.country) {
				server.flagclass = 'flag-' + server.country.toLowerCase();
			}

			// Correct URLs to obtain IWADs.
			var iwad = server.iwad.toLowerCase();
			if (iwad === 'doom1.wad' || iwad === 'heretic1.wad' || iwad === 'strife0.wad') {
				server.iwad_url = 'http://www.doomworld.com/classicdoom/info/shareware.php';
			} else if (iwad === 'doom.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2280/';
			} else if (iwad === 'doom2.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2300/';
			} else if (iwad === 'plutonia.wad' || iwad === 'tnt.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2290/';
			} else if (iwad === 'heretic.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2390/';
			} else if (iwad === 'hexen.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2360/';
			} else if (iwad === 'hexdd.wad') {
				server.iwad_url = 'http://store.steampowered.com/app/2370/';
			} else if (iwad === 'chex3.wad') {
				server.iwad_url = 'http://www.chucktropolis.com/gamers.htm';
			} else if (iwad === 'megagame.wad') {
				server.iwad_url = 'http://cutstuff.net/mm8bdm/';
			}

			server.players = 0;
			teamgame = false;
			spectators = [];
			for (var i = 0;i < players.length;i++) {
				if (players[i].team !== null) {
					teamgame = true;
				}

				if (players[i].spectator === false) {
					delete players[i].spectator;
					server.players += 1;
				} else {
					delete players[i].spectator;
					spectators.push(players[i]);
					delete players[i];
				}
			}

			res.locals = {
				server: server,
				players: players,
				spectators: spectators,
				teamgame: teamgame
			};
			res.render('server', {subtitle: 'Server'});
		}
	)
	.fail(function(error) {
		util.log(error);
		res.send(500);
	})
	.done();
});
webapp.get('/players', function(req, res) {
	res.render('players', {subtitle: 'Players'});
});
webapp.get('/api', function(req, res) {
	res.render('api', {subtitle: 'API'});
});
webapp.get('/dmflags', function(req, res) {
	var dmflags = JSON.parse(fs.readFileSync('dmflags.json', 'utf8'));
	res.render('dmflags', {subtitle: 'DMFlags', dmflags: dmflags});
});
webapp.get('/about', function(req, res) {
	res.render('about', {subtitle: 'About'});
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
	webapp.get(prefix + '/servers/:address::port', function(req, res) {
		var address = req.params.address;
		var port = req.params.port;

		q.spread(
			[db.server(address, port), db.serverPlayers(address, port)],
			function (server, players) {
				// If server doesn't exist, 404 the page.
				if (server === undefined) {
					res.send(404, {'code': 404, 'error': 'Not Found'});
					return;
				}

				// Send back players as part of the server response.
				server.players = players;
				res.send(server);
			}
		)
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
})('/api/v1');

module.exports = webapp;
