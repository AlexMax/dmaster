var assert = require('assert');
var fs = require('fs');
var printf = require('printf');
var util = require('util');

var packet = require('../packet');

describe('unmarshallServerList()', function() {
	it('should unmarshall kvas_pleiades.dat.', function() {
		assert.doesNotThrow(function() {
			var data = fs.readFileSync(__dirname + '/packets/kvas_pleiades.dat');
			packet.unmarshallServerInfo(data.slice(4));
		});
	});
});