var buffertools = require('buffertools');
var printf = require('printf');

var Huffman = function(freq) {
	if (!(this instanceof arguments.callee)) {
		throw new Error("Constructor called as a function");
	}

	if (!Array.isArray(freq)) {
		throw new TypeError('First argument must be an array.');
	}

	if (freq.length != 256) {
		throw new TypeError('First argument must be a frequency array of length 256.');
	}

	this.freq = freq;
	this.tree = [];
	this.table = [];

	var self = this;

	// The original C++ code uses floats and Javascript uses doubles.  This
	// epsilon is necessary in order to make sure our float comparisons work.
	const epsilon = 0.0000001;

	// Create starting leaves
	for (var i = 0;i < 256;i++) {
		this.tree[i] = {
			frq: freq[i],
			asc: i
		};
	}

	// Pair leaves and branches based on frequency until there is a single root
	for (var i = 0;i < 255;i++) {
		var minat1 = -1;
		var minat2 = -1;
		var min1 = 1e30;
		var min2 = 1e30;

		// Find two lowest frequencies
		for (var j = 0;j < 256;j++) {
			if (!this.tree[j]) {
				continue;
			}
			if (this.tree[j].frq < min1 - epsilon) {
				minat2 = minat1;
				min2 = min1;
				minat1 = j;
				min1 = this.tree[j].frq;
			} else if (this.tree[j].frq < min2 - epsilon) {
				minat2 = j;
				min2 = this.tree[j].frq;
			}
		}

		// Join the two together under a new branch
		this.tree[minat1] = {
			frq: min1 + min2,
			0: this.tree[minat2],
			1: this.tree[minat1],
		}
		this.tree[minat2] = undefined;
	}

	// Make the root the list
	this.tree = this.tree[minat1];

	// Create a lookup table from the binary tree
	function treeWalker(branch, path) {
		path = path || '';

		// Go through a branch finding leaves while tracking the path taken
		if ('0' in branch) {
			treeWalker(branch[0], path + '0');
			treeWalker(branch[1], path + '1');
			return;
		}

		// Found a leaf, so save the binary path to the table.
		self.table[branch.asc] = path;
	}

	treeWalker(this.tree);
};
Huffman.prototype.encode = function(data) {
	if (!Buffer.isBuffer(data)) {
		throw new TypeError('Argument must be a Buffer.');
	}

	// Do no encoding yet...
	encoded = new Buffer(data.length + 1);
	encoded.writeUInt8(0xff, 0);
	data.copy(encoded, 1);
	return encoded;
};
Huffman.prototype.decode = function(data) {
	var padding = data.readUInt8(0);

	// If the padding bit is set to 0xff, no decoding is necessary.
	if (padding === 0xff) {
		decoded = new Buffer(data.length - 1);
		data.copy(decoded, 0, 1);
		return decoded;
	}

	// Convert ascii string into binary string.
	var bitString = '';
	for (var i = 1;i < data.length;i++) {
		bitString += printf('%08b', data[i]).split('').reverse().join('');
	}

	// Remove padding bits from the end.
	var bitString = bitString.substring(0, bitString.length - padding);

	// Repeatedly traverse the huffman tree turning the huffman code
	// into the original byte.
	var decoded = new buffertools.WritableBufferStream();
	var node = this.tree;
	for (var i = 0;i < bitString.length;i++) {
		var bit = bitString.charAt(i);
		if (bit in node) {
			node = node[bit];
		} else {
			decoded.write(new Buffer([node.asc]));
			node = this.tree[bit];
		}
	}
	decoded.write(new Buffer([node.asc]));

	return decoded.getBuffer();
};

exports.Huffman = Huffman;
