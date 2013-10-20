var config = require('config');
var dgram = require('dgram');
var printf = require('printf');

var db = require('./db.js');
var huffman = require('./huffman.js');
var webapp = require('./webapp.js');
var zan = require('./zandronum.js');

var socket = dgram.createSocket('udp4');
var huf = new huffman.Huffman(zan.huffmanFreqs);

function send_query(socket) {
	var flags = zan.SQF_MAXPLAYERS | zan.SQF_MAXCLIENTS | zan.SQF_FORCEPASSWORD |
				zan.SQF_IWAD | zan.SQF_MAPNAME | zan.SQF_GAMETYPE | zan.SQF_NAME |
				zan.SQF_URL | zan.SQF_EMAIL | zan.SQF_PWADS | zan.SQF_PLAYERDATA |
				zan.SQF_TEAMINFO_NUMBER | zan.SQF_TEAMINFO_NAME | zan.SQF_TEAMINFO_COLOR |
				zan.SQF_TEAMINFO_SCORE;
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

function unmarshallServerList(data) {
	// Packet number
	var sequence = data.readUInt8(0);

	// Server block, must be MSC_SERVERBLOCK
	var serverBlock = data.readUInt8(1);
	if (serverBlock !== zan.MSC_SERVERBLOCK) {
		throw new Error('invalid MSC_BEGINSERVERLISTPART: expected MSC_SERVERBLOCK, got ' + serverBlock + '.');
	}

	// Parse out servers
	var servers = [];
	var marker = 2;
	var serverCount = data.readUInt8(marker);
	while (serverCount !== 0) {
		var ip1 = data.readUInt8(marker + 1);
		var ip2 = data.readUInt8(marker + 2);
		var ip3 = data.readUInt8(marker + 3);
		var ip4 = data.readUInt8(marker + 4);
		var ports = [];
		for (var i = 0;i < serverCount;i++) {
			ports.push(data.readUInt16LE(marker + 5 + (i * 2)));
		}

		// Add server
		servers.push({
			'address': [ip1, ip2, ip3, ip4].join('.'),
			'ports': ports
		});

		// Increment read marker
		marker += 1 + 4 + serverCount * 2;
		var serverCount = data.readUInt8(marker);
	}

	// Check for end of list
	var sequenceEnd;
	var ending = data.readUInt8(marker + 1);
	switch (ending) {
	case zan.MSC_ENDSERVERLIST:
		sequenceEnd = true;
		break;
	case zan.MSC_ENDSERVERLISTPART:
		sequenceEnd = false;
		break;
	default:
		throw new Error('invalid MSC_BEGINSERVERLISTPART: expected MSC_ENDSERVERLIST or MSC_ENDSERVERLISTPART, got ' + ending + '.');
	}

	return {
		'sequence': sequence,
		'sequenceEnd': sequenceEnd,
		'servers': servers
	}
}

function unmarshallServerInfo(data) {
	var nullByte = new Buffer([0x00]);
	var output = {};

	// Version
	var versionNULL = data.indexOf(nullByte, 4);
	var version = data.toString('ascii', 4, versionNULL);

	// Pick apart the rest of the response based on what flags we got.
	var flags = data.readUInt32LE(versionNULL + 1);
	var marker = versionNULL + 5;

	// Name
	if (flags & zan.SQF_NAME) {
		var nameNULL = data.indexOf(nullByte, marker);
		output['name'] = data.toString('ascii', marker, nameNULL);
		marker = nameNULL + 1;
	}

	// URL
	if (flags & zan.SQF_URL) {
		var urlNULL = data.indexOf(nullByte, marker);
		output['url'] = data.toString('ascii', marker, urlNULL);
		marker = urlNULL + 1;
	}

	// Email
	if (flags & zan.SQF_EMAIL) {
		var emailNULL = data.indexOf(nullByte, marker);
		output['email'] = data.toString('ascii', marker, emailNULL);
		marker = emailNULL + 1;
	}

	// Map name
	if (flags & zan.SQF_MAPNAME) {
		var mapNameNULL = data.indexOf(nullByte, marker);
		output['map'] = data.toString('ascii', marker, mapNameNULL);
		marker = mapNameNULL + 1;
	}

	// Maximum clients
	if (flags & zan.SQF_MAXCLIENTS) {
		output['maxclients'] = data.readUInt8(marker);
		marker += 1;
	}

	// Maximum players
	if (flags & zan.SQF_MAXPLAYERS) {
		output['maxplayers'] = data.readUInt8(marker);
		marker += 1;
	}

	// PWADs
	if (flags & zan.SQF_PWADS) {
		var len = data.readUInt8(marker);
		output['pwads'] = Array(len);
		marker += 1;

		for (var i = 0;i < len;i++) {
			var pwadNULL = data.indexOf(nullByte, marker);
			output['pwads'][i] = data.toString('ascii', marker, pwadNULL);
			marker = pwadNULL + 1;
		}
	}

	// Gametype
	var gametype = null; // Also used in SQF_PLAYERDATA.
	if (flags & zan.SQF_GAMETYPE) {
		gametype = data.readUInt8(marker);
		var instagib = data.readUInt8(marker + 1);
		var buckshot = data.readUInt8(marker + 2);

		output['gametype'] = zan.GAMEMODES[gametype].name;
		marker += 3;
	}

	// Gamename
	if (flags & zan.SQF_GAMENAME) {
		var gameNameNULL = data.indexOf(nullByte, marker);
		output['gamename'] = data.toString('ascii', marker, gameNameNULL);
		marker = gameNameNULL + 1;
	}

	// IWAD
	if (flags & zan.SQF_IWAD) {
		var iwadNULL = data.indexOf(nullByte, marker);
		output['iwad'] = data.toString('ascii', marker, iwadNULL);
		marker = iwadNULL + 1;
	}

	// Password
	if (flags & zan.SQF_FORCEPASSWORD) {
		output['password'] = data.readUInt8(marker);
		marker += 1;
	}

	// Join password
	if (flags & zan.SQF_FORCEJOINPASSWORD) {
		output['joinpassword'] = data.readUInt8(marker);
		marker += 1;
	}

	// Game skill
	if (flags & zan.SQF_GAMESKILL) {
		output['joinpassword'] = data.readUInt8(marker);
		marker += 1;
	}

	// Bot skill
	if (flags & zan.SQF_BOTSKILL) {
		output['joinpassword'] = data.readUInt8(marker);
		marker += 1;
	}

	// DMFlags
	if (flags & zan.SQF_DMFLAGS) {
		output['dmflags'] = data.readUInt32LE(marker);
		output['dmflags2'] = data.readUInt32LE(marker + 4);
		output['compatflags'] = data.readUInt32LE(marker + 8);
		marker += 12;
	}

	// Game limits
	if (flags & zan.SQF_LIMITS) {
		output['fraglimit'] = data.readUInt16LE(marker);
		output['timelimit'] = data.readUInt16LE(marker + 2);

		if (output['timelimit'] > 0) {
			output['timeleft'] = data.readUInt16LE(marker);
			marker += 2; // So the rest of the reads will line up
		}

		output['duellimit'] = data.readUInt16LE(marker + 4);
		output['pointlimit'] = data.readUInt16LE(marker + 6);
		output['winlimit'] = data.readUInt16LE(marker + 8);
		marker += 10;
	}

	// Team damage
	if (flags & zan.SQF_TEAMDAMAGE) {
		output['teamdamage'] = data.readFloatLE(marker);
		marker += 4;
	}

	// Depricated.
	if (flags & zan.SQF_TEAMSCORES) {
		marker += 4;
	}

	// Player count.  We don't deal with this directly, but we do need the
	// count in order to know how many players we need to loop through.
	var players = null;
	if (flags & zan.SQF_NUMPLAYERS) {
		players = data.readUInt8(marker);
		marker += 1;
	}

	// Player information.
	if (flags & zan.SQF_PLAYERDATA) {
		if (players === null) {
			throw new Error('Player data without player count.');
		}

		if (gametype === null) {
			throw new Error('Player data without gametype.');
		}

		output['players'] = Array(players);
		for (var i = 0;i < players;i++) {
			var player = {};

			var playerNameNULL = data.indexOf(nullByte, marker);
			player['name'] = data.toString('ascii', marker, playerNameNULL);
			marker = playerNameNULL + 1;

			player['score'] = data.readUInt16LE(marker);
			player['ping'] = data.readUInt16LE(marker + 2);
			player['spectator'] = data.readUInt8(marker + 4);
			player['bot'] = data.readUInt8(marker + 5);

			if (zan.GAMEMODES[gametype].playersOnTeams) {
				player['team'] = data.readUInt8(marker + 6);
				marker += 1;
			}

			player['time'] = data.readUInt8(marker + 6);
			marker += 7;

			output['players'][i] = player;
		}
	}

	// Team count.  Same as player count, we don't deal with this directly.
	var teams = null;
	if (flags & zan.SQF_TEAMINFO_NUMBER) {
		teams = data.readUInt8(marker);
		marker += 1;
	}

	// Populate the team information array if we have information to populate.
	if (flags & zan.SQF_TEAMINFO_NAME || flags & zan.SQF_TEAMINFO_COLOR ||
	    flags & zan.SQF_TEAMINFO_SCORE) {
		output['teams'] = Array(teams);
		for (var i = 0;i < teams;i++) {
			output['teams'][i] = {};
		}
	}

	// Team names.
	if (flags & zan.SQF_TEAMINFO_NAME) {
		if (teams === null) {
			throw new Error('Team data without team count.');
		}

		for (var i = 0;i < teams;i++) {
			var teamNameNULL = data.indexOf(nullByte, marker);
			output['teams'][i]['name'] = data.toString('ascii', marker, teamNameNULL);
			marker = teamNameNULL + 1;
		}
	}

	// Team colors.
	if (flags & zan.SQF_TEAMINFO_COLOR) {
		if (players === null) {
			throw new Error('Team data without team count.');
		}

		for (var i = 0;i < teams;i++) {
			output['teams'][i]['color'] = data.readUInt32LE(marker);
			marker += 4;
		}
	}

	// Team scores.
	if (flags & zan.SQF_TEAMINFO_SCORE) {
		if (players === null) {
			throw new Error('Team data without team count.');
		}

		for (var i = 0;i < teams;i++) {
			output['teams'][i]['score'] = data.readUInt16LE(marker);
			marker += 2;
		}
	}

	return output;
}

socket.on('message', function(msg, rinfo) {
	var data = huf.decode(msg);
	var flag = data.readUInt32LE(0);

	switch (flag) {
	case zan.MSC_IPISBANNED:
		console.log('master query ignored, banned from the master server.');
		break;
	case zan.MSC_REQUESTIGNORED:
		console.log('master query ignored, please throttle your requests.');
		break;
	case zan.MSC_WRONGVERSION:
		console.log('master query ignored, protocol version out of date.');
		break;
	case zan.MSC_BEGINSERVERLISTPART:
		var serverList = unmarshallServerList(data.slice(4));
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
		var serverInfo = unmarshallServerInfo(data.slice(4));

		console.log(serverInfo);

		var stmt = 'UPDATE servers SET name=?, updated=datetime(\'now\') WHERE address = ? AND port = ?;'

		db.run(stmt, serverInfo.name, rinfo.address, rinfo.port, function(error) {
			if (error) {
				throw new Error(error);
			}
		});
		break;
	case zan.SERVER_LAUNCHER_IGNORING:
		console.log('server query ignored, please throttle your requests.');
		break;
	case zan.SERVER_LAUNCHER_BANNED:
		console.log('server query ignored, banned from the  server.');
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
