function createHuffman(freq) {
	if (!Array.isArray(freq)) {
		throw new TypeError('First argument must be an array.');
	}

	if (freq.length != 256) {
		throw new TypeError('First argument must be a frequency array of length 256.');
	}

	return {
		encode: function(data) {
			if (!Buffer.isBuffer(data)) {
				throw new TypeError('Argument must be a Buffer.');
			}

			// Do no encoding yet...
			encoded = new Buffer(data.length + 1);
			encoded.writeUInt8(0xff, 0);
			data.copy(encoded, 1);
			return encoded;
		},
		decode: function(data) {
			if (data.readUInt8(0) === 0xff) {
				// Data does not need to be decoded.
				decoded = new Buffer(data.length - 1);
				data.copy(decoded, 0, 1);
				return decoded;
			}

			throw new Error('Huffman decoding not implemented yet.');
		}
	}
}

exports.createHuffman = createHuffman;
