var config = require('config');
var dgram = require('dgram');
var printf = require('printf');
var q = require('q');

var db = require('./db.js');
var huffman = require('./huffman.js');
var packet = require('./packet.js');
var webapp = require('./webapp.js');
var zan = require('./zandronum.js');

var socket = dgram.createSocket('udp4');
var huf = new huffman.Huffman(zan.huffmanFreqs);

function send_query(socket) {
	var flags = zan.SQF_MAXPLAYERS | zan.SQF_MAXCLIENTS | zan.SQF_FORCEPASSWORD |
				zan.SQF_IWAD | zan.SQF_MAPNAME | zan.SQF_GAMETYPE | zan.SQF_NAME |
				zan.SQF_URL | zan.SQF_EMAIL | zan.SQF_PLAYERDATA | zan.SQF_PWADS;
	var queryFlags = new Buffer(4);
	queryFlags.writeUInt32LE(flags, 0);

	const timestamp = new Buffer([0, 0, 0, 0]);
	const challenge = huf.encode(Buffer.concat([zan.LAUNCHER_SERVER_CHALLENGE, queryFlags, timestamp]));

	db.each('SELECT id, address, port FROM servers;', function(err, row) {
		socket.send(challenge, 0, challenge.length, row.port, row.address, function(error, length) {
			if (error) {
				console.log('server query error: ' + error + '.');
			}
		});
	});
}

function send_challenge(socket) {
	const masters = config.masters;
	const challenge = huf.encode(Buffer.concat([zan.LAUNCHER_MASTER_CHALLENGE, zan.MASTER_SERVER_VERSION]));

	for (var i = 0;i < masters.length;i++) {
		(function(i) {
			socket.send(challenge, 0, challenge.length, masters[i].port, masters[i].address, function(error, length) {
				if (error) {
					console.log('mater challenge error: ' + error + '.');
				}
			});
		})(i);
	}
}

socket.on('message', function(msg, rinfo) {
	var data = huf.decode(msg);
	var flag = data.readUInt32LE(0);

	switch (flag) {
	case zan.MSC_IPISBANNED:
		console.log('master query ignored, banned from the master server.');
		break;
	case zan.MSC_REQUESTIGNORED:
		// console.log('master query ignored, please throttle your requests.');
		break;
	case zan.MSC_WRONGVERSION:
		console.log('master query ignored, protocol version out of date.');
		break;
	case zan.MSC_BEGINSERVERLISTPART:
		var serverList = packet.unmarshallServerList(data.slice(4));
		var servers = serverList.servers;
		var stmt = 'INSERT INTO servers (address, port) VALUES (?, ?);';

		for (var i = 0;i < servers.length;i++) {
			var address = servers[i].address;
			for (var j = 0;j < servers[i].ports.length;j++) {
				var port = servers[i].ports[j];
				db.run(stmt, address, port, function(error) {
					if (error) {
						throw new Error(error);
					}
				});
			}
		}
		break;
	case zan.SERVER_LAUNCHER_CHALLENGE:
		// Look up the id associated with the given address and port.  Stores
		// the value in a promise so we can unmarshall packets while we wait
		// on the id to be returned.
		var serverId = q.defer();
		db.get(
			'SELECT id FROM servers WHERE address = ? AND port = ?;',
			rinfo.address, rinfo.port,
			function(err, row) {
				if (err) {
					serverId.reject(err);
				} else {
					serverId.resolve(row.id);
				}
			}
		);

		// Update basic server information.
		var serverInfo = packet.unmarshallServerInfo(data.slice(4));
		const validServerColumns = [
			'name', 'url', 'email', 'map', 'maxclients', 'maxplayers',
			'gametype', 'iwad', 'password'
		];
		var sets = [];
		var params = [];

		for (var i = 0;i < validServerColumns.length;i++) {
			if (validServerColumns[i] in serverInfo) {
				sets.push(validServerColumns[i] + '=?');
				params.push(serverInfo[validServerColumns[i]]);
			}
		}

		if (params.length > 0) {
			serverId.promise.then(function(value) {
				params.push(value);
				var stmt =
					'UPDATE servers SET ' + sets.join(',') +
					',updated=datetime(\'now\') WHERE id = ?';
				db.run(stmt, params, function(error) {
					if (error) {
						throw new Error(error);
					}
				});
			}, function(reason) {
				console.log(reason);
			});
		}
		break;
	case zan.SERVER_LAUNCHER_IGNORING:
		// console.log('server query ignored, please throttle your requests.');
		break;
	case zan.SERVER_LAUNCHER_BANNED:
		console.log('server query ignored, banned from the server.');
		break;
	default:
		throw new Error('unrecognized response ' + flag + '.');
	}
});

socket.on('listening', function() {
	var address = this.address();
	console.log('UDP socket listening on ' + address.address + ':' + address.port + '.');

	send_challenge(this);

	setInterval(send_challenge, 30000, this);
	setInterval(send_query, 5000, this);
});

socket.bind(config.dmaster.udpPort);
webapp.listen(config.dmaster.webPort);
