function createHuffman(freq) {
	if (!(freq instanceof Array)) {
		throw new TypeError('First argument must be an array.');
	}

	if (freq.length != 256) {
		throw new TypeError('First argument must be a frequency array of length 256.');
	}

	return {
		encode: function(data) {

		},
		decode: function(data) {

		}
	}
}

exports = {
	createHuffman: createHuffman
};
