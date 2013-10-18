var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database(':memory:');

db.on('open', function() {
	this.exec(
		'PRAGMA foreign_keys = ON;' +
		'CREATE TABLE servers(' +
			'id INTEGER PRIMARY KEY AUTOINCREMENT, address TEXT, port INT,' +
			'maxplayers INT, maxclients INT, password INT, iwad TEXT,' +
			'map TEXT, gametype TEXT, name TEXT, url TEXT, email TEXT, ' +
			'updated INT, UNIQUE (address, port) ON CONFLICT IGNORE' +
		');' +
		'CREATE TABLE players(' +
			'server_id INT, ping INT, score INT, team INT, spec INT,' +
			'name TEXT, FOREIGN KEY(server_id) REFERENCES servers(id)' +
		');' +
		'CREATE TABLE pwads(' +
			'server_id INT, pwad TEXT,' +
			'FOREIGN KEY(server_id) REFERENCES servers(id)' +
		');'
	);
});

module.exports = db;
