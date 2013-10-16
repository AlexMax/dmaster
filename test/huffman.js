var assert = require('assert');
var zan = require('../zandronum.js');

var huffman = require('../huffman.js');

describe('Huffman', function() {
	describe('new Huffman()', function() {
		it('should accept a frequency table as an argument.', function() {
			new huffman.Huffman(zan.huffmanFreqs);
		});
		it('should throw an exception if you forget `new`.', function() {
			assert.throws(function() {
				new huffman.Huffman();
			}, Error);
		});
		it('should throw an exception if you pass nothing.', function() {
			assert.throws(function() {
				new huffman.Huffman();
			}, Error);
		});
		it('should throw an exception if you pass a non-Array argument.', function() {
			assert.throws(function() {
				new huffman.Huffman('foobar');
			}, Error);
		});
		it('should throw an exception if you pass an incomplete frequency Array.', function() {
			assert.throws(function() {
				new huffman.Huffman([0.5, 0.5]);
			}, Error);
		});
	});
	describe('Huffman.encode()', function() {
		it('should huffman-encode a buffer if it saves space.', function() {
			var h = new huffman.Huffman(zan.huffmanFreqs);
			var encoded = h.encode(new Buffer([0x00, 0x73, 0x03, 0x05]));
			var test = new Buffer([0x02, 0x1a, 0x4b, 0x28]);
			assert.equal(test.toString('hex'), encoded.toString('hex'));
		});
		it('should pad the original buffer with 0xff if there is no space saved.', function() {
			var h = new huffman.Huffman(zan.huffmanFreqs);
			var encoded = h.encode(new Buffer([0x00, 0x73, 0x03, 0x05]));
			var test = new Buffer([0x02, 0x1a, 0x4b, 0x28]);
			assert.equal(test.toString('hex'), encoded.toString('hex'));
		});
	});
	describe('Huffman.decode()', function() {
		it('should be able to huffman-decode the Zandronum master challenge.', function() {
			var h = new huffman.Huffman(zan.huffmanFreqs);
			var decoded = h.decode(new Buffer([0x06, 0x68, 0x12, 0xf1, 0x52, 0x27, 0x01]));
			var test = Buffer.concat([zan.LAUNCHER_MASTER_CHALLENGE, zan.MASTER_SERVER_VERSION]);
			assert.equal('7c5d56000200', decoded.toString('hex'));
		});
	});
});
