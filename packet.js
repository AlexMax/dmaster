var zan = require('./zandronum.js');

function unmarshallServerList(data) {
	if (!Buffer.isBuffer(data)) {
		throw new TypeError('Argument must be a Buffer.');
	}

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
	if (!Buffer.isBuffer(data)) {
		throw new TypeError('Argument must be a Buffer.');
	}

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
		if (teams === null) {
			throw new Error('Team data without team count.');
		}

		for (var i = 0;i < teams;i++) {
			output['teams'][i]['color'] = data.readUInt32LE(marker);
			marker += 4;
		}
	}

	// Team scores.
	if (flags & zan.SQF_TEAMINFO_SCORE) {
		if (teams === null) {
			throw new Error('Team data without team count.');
		}

		for (var i = 0;i < teams;i++) {
			output['teams'][i]['score'] = data.readUInt16LE(marker);
			marker += 2;
		}
	}

	// Test server
	if (flags & zan.SQF_TESTING_SERVER) {
		data.readUInt8(marker);

		var testingNULL = data.indexOf(nullByte, marker + 1);
		var testing = data.toString('ascii', marker, testingNULL);
		marker = testingNULL + 1;

		output['testing'] = (testing === '') ? testing : null;
	}

	// Ignored.  Skip past it if it's been supplied.
	if (flags & zan.SQF_DATA_MD5SUM) {
		marker += data.indexOf(nullByte, marker) + 1;
	}

	// DMFlags.
	if (flags & zan.SQF_ALL_DMFLAGS) {
		const flagkeys = ['dmflags', 'dmflags2', 'dmflags3', 'compatflags', 'compatflags2'];
		var flags = data.readUInt8(marker);
		marker += 1;

		for (var i = 0;i < flags;i++) {
			output[flagkeys[i]] = data.readUInt32LE(marker);
			marker += 4;
		}
	}

	// Server enforces master banlist?
	if (flags & zan.SQF_SECURITY_SETTINGS) {
		output['masterbanlist'] = data.readUInt8(marker);
	}

	return output;
}

exports.unmarshallServerList = unmarshallServerList;
exports.unmarshallServerInfo = unmarshallServerInfo;
