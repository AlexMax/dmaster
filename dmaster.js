// == START CONFIG ==

var dmaster_port = 10700;

var master_address = 'master.zandronum.com';
var master_port = 15300;

// == END CONFIG ==

var dgram = require('dgram');
var huffman = require('./huffman.js');
var zan = require('./zandronum.js');

var socket = dgram.createSocket('udp4');
var huf = huffman.createHuffman(zan.huffmanFreqs);

function send_challenge(socket) {
	var challenge = huf.encode(Buffer.concat([zan.LAUNCHER_MASTER_CHALLENGE, zan.MASTER_SERVER_VERSION]));

	socket.send(challenge, 0, challenge.length, master_port, master_address, function(error, length) {
		if (error) {
			console.log('error ' + error + '.');
		} else {
			console.log('sent challenge to ' + master_address + ':' + master_port + '.');
		}
	});
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

socket.on('message', function(msg, rinfo) {
	var data = huf.decode(msg);
	var flag = data.readUInt32LE(0);

	switch (flag) {
	case zan.MSC_IPISBANNED:
		console.log('master query ignored, permanently banned from the master server.');
		break;
	case zan.MSC_REQUESTIGNORED:
		console.log('master query ignored, please throttle requests to a minimum 3 seconds.');
		break;
	case zan.MSC_WRONGVERSION:
		console.log('master query ignored, protocol version out of date.');
		break;
	case zan.MSC_BEGINSERVERLISTPART:
		var serverList = unmarshallServerList(data.slice(4));
		break;
	default:
		throw new Error('unrecognized response ' + flag + '.');
	}

	console.log(data);
	console.log(rinfo);
});

socket.on('listening', function() {
	var address = this.address();
	console.log('dmaster listening on ' + address.address + ':' + address.port);

	send_challenge(this);
});

socket.bind(dmaster_port);
