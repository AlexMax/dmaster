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

	// Create starting leaves
	for (var i = 0;i < 256;i++) {
		this.tree[i] = {
			frq: freq[i],
			asc: i
		};
	}

	// Pair leaves and branches based on frequency until there is a single root
	for (var i = 0;i < 255;i++) {
		var lowest_key1 = -1
		var lowest_key2 = -1
		var lowest_frq1 = 1e30
		var lowest_frq2 = 1e30

		// Find two lowest frequencies
		for (var j = 0;j < 256;j++) {
			if (!this.tree[j]) {
				continue;
			}
			if (this.tree[j].frq < lowest_frq1) {
				lowest_key2 = lowest_key1;
				lowest_frq2 = lowest_frq1;
				lowest_key1 = j;
				lowest_frq1 = this.tree[j].frq;
			} else if (this.tree[j].frq < lowest_frq2) {
				lowest_key2 = j;
				lowest_frq2 = this.tree[j].frq;
			}
		}

		// Join the two together under a new branch
		this.tree[lowest_key1] = {
			frq: lowest_frq1 + lowest_frq2,
			0: this.tree[lowest_key2],
			1: this.tree[lowest_key1],
		}
		this.tree[lowest_key2] = null;
	}

	// Make the root the list
	this.tree = this.tree[lowest_key1];

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
	if (data.readUInt8(0) === 0xff) {
		// Data does not need to be decoded.
		decoded = new Buffer(data.length - 1);
		data.copy(decoded, 0, 1);
		return decoded;
	}

	throw new Error('Huffman decoding not implemented yet.');
};

exports.Huffman = Huffman;
