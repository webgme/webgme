/**
 * Created by zsolt on 4/19/14.
 */

define(['stream', 'util'], function(Stream, util) {
    var StringStreamWriter = function (str, opt) {
        Stream.Writable.call(this, opt);
        this._str = '';
    };

    util.inherits(StringStreamWriter, Stream.Writable);

    StringStreamWriter.prototype._write = function (chunk, encoding, callback) {
        this._str += chunk.toString();
        callback(null);
    };

    StringStreamWriter.prototype.toString = function () {
        return this._str;
    };

    StringStreamWriter.prototype.toJSON = function () {
        return JSON.parse(this._str);
    };

    return StringStreamWriter;
});