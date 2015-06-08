/*jshint node: true*/

'use strict';

var Stream = require('stream'),
    util = require('util');


var BufferStreamReader = function (buf, opt) {
    Stream.Readable.call(this, opt);
    this._buf = buf;
};

util.inherits(BufferStreamReader, Stream.Readable);

BufferStreamReader.prototype._read = function () {
    this.push(this._buf);
    this.push(null);
};

module.exports = BufferStreamReader;
