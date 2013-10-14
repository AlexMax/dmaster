// == START CONFIG ==

var dmaster_port = 10700;

var master_address = 'master.zandronum.com';
var master_port = 15300;

// == END CONFIG ==

var dgram = require('dgram');

var huffman = require('./huffman.js');

// Client queries
var LAUNCHER_MASTER_CHALLENGE = new Buffer([0x00, 0x56, 0x5d, 0x7c]);
var MASTER_SERVER_VERSION = new Buffer([0x00, 0x02]);

// Client data queries
var SQF_NAME              = 1 << 0;
var SQF_URL               = 1 << 1;
var SQF_EMAIL             = 1 << 2;
var SQF_MAPNAME           = 1 << 3;
var SQF_MAXCLIENTS        = 1 << 4;
var SQF_MAXPLAYERS        = 1 << 5;
var SQF_PWADS             = 1 << 6;
var SQF_GAMETYPE          = 1 << 7;
var SQF_GAMENAME          = 1 << 8;
var SQF_IWAD              = 1 << 9;
var SQF_FORCEPASSWORD     = 1 << 10;
var SQF_FORCEJOINPASSWORD = 1 << 11;
var SQF_GAMESKILL         = 1 << 12;
var SQF_BOTSKILL          = 1 << 13;
var SQF_LIMITS            = 1 << 16;
var SQF_TEAMDAMAGE        = 1 << 17;
var SQF_NUMPLAYERS        = 1 << 19;
var SQF_PLAYERDATA        = 1 << 20;
var SQF_TEAMINFO_NUMBER   = 1 << 21;
var SQF_TEAMINFO_NAME     = 1 << 22;
var SQF_TEAMINFO_COLOR    = 1 << 23;
var SQF_TEAMINFO_SCORE    = 1 << 24;
var SQF_TESTING_SERVER    = 1 << 25;
var SQF_DATA_MD5SUM       = 1 << 26;
var SQF_ALL_DMFLAGS       = 1 << 27;
var SQF_SECURITY_SETTINGS = 1 << 28;

// Possible master responses
var MSC_ENDSERVERLIST = new Buffer([0x02]);
var MSC_IPISBANNED = new Buffer([0x03]);
var MSC_REQUESTIGNORED = new Buffer([0x04]);
var MSC_WRONGVERSION = new Buffer([0x05]);
var MSC_BEGINSERVERLISTPART = new Buffer([0x06]);
var MSC_ENDSERVERLISTPART = new Buffer([0x07]);
var MSC_SERVERBLOCK = new Buffer([0x08]);

var socket = dgram.createSocket('udp4');

function send_challenge(socket) {
	var NO_PADDING = new Buffer([0xff]);
	var challenge = Buffer.concat([NO_PADDING, LAUNCHER_MASTER_CHALLENGE, MASTER_SERVER_VERSION]);
	socket.send(challenge, 0, challenge.length, master_port, master_address, function(error, length) {
		if (error) {
			console.log('error ' + error + '.');
		} else {
			console.log('sent challenge to ' + master_address + ':' + master_port + '.');
		}
	});
}

socket.on('message', function(msg, rinfo) {
	console.log(msg);
	console.log(rinfo);
});

socket.on('listening', function() {
	var address = this.address();
	console.log('dmaster listening on ' + address.address + ':' + address.port);

	send_challenge(this);
});

socket.bind(dmaster_port);
