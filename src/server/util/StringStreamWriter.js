/*jshint node: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var Stream = require('stream'),
    util = require('util');

function StringStreamWriter(str, opt) {
    Stream.Writable.call(this, opt);
    this._buffer = new Buffer(0);
}

util.inherits(StringStreamWriter, Stream.Writable);

StringStreamWriter.prototype._write = function (chunk, encoding, callback) {
    // FIXME: This might be slow for big files.
    this._buffer = Buffer.concat([this._buffer, new Buffer(chunk)]);
    callback(null);
};

StringStreamWriter.prototype.getBuffer = function () {
    return this._buffer;
};

StringStreamWriter.prototype.toString = function () {
    return this._buffer.toString();
};

StringStreamWriter.prototype.toJSON = function () {
    return JSON.parse(this.toString());
};

module.exports = StringStreamWriter;