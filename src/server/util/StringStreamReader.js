/*jshint node: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var Stream = require('stream'),
    util = require('util');


var StringStreamReader = function (str, opt) {
    Stream.Readable.call(this, opt);
    this._str = str;
};

util.inherits(StringStreamReader, Stream.Readable);

StringStreamReader.prototype._read = function () {
    var buf = new Buffer(this._str, 'utf-8');
    this.push(buf);
    this.push(null);
};

StringStreamReader.prototype.toString = function () {
    return this._str;
};

StringStreamReader.prototype.toJSON = function () {
    return JSON.parse(this._str);
};

module.exports = StringStreamReader;