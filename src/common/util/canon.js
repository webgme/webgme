//jshint ignore: start
/* 2012 David Chambers <dc@hashify.me>  */
define([], function() {
    var CANON = {},
        keys, map, nativeMap, pad,
        __slice = [].slice,
        __hasProp = {}.hasOwnProperty;


    CANON.stringify = (function() {
        var canonicalize;
        canonicalize = function(value) {
            var pair, _ref;
            switch (Object.prototype.toString.call(value)) {
                case '[object Array]':
                    return ['Array'].concat(__slice.call(map(value, canonicalize)));
                case '[object Date]':
                    return ['Date'].concat(isFinite(+value) ? value.getUTCFullYear() + '-' + pad(value.getUTCMonth() + 1) + '-' + pad(value.getUTCDate()) + 'T' + pad(value.getUTCHours()) + ':' + pad(value.getUTCMinutes()) + ':' + pad(value.getUTCSeconds()) + '.' + pad(value.getUTCMilliseconds(), 3) + 'Z' : null);
                case '[object Function]':
                    throw new TypeError('functions cannot be serialized');
                    break;
                case '[object Number]':
                    if (isFinite(value)) {
                        return value;
                    } else {
                        return ['Number', "" + value];
                    }
                    break;
                case '[object Object]':
                    pair = function(key) {
                        return [key, canonicalize(value[key])];
                    };
                    return (_ref = ['Object']).concat.apply(_ref, map(keys(value).sort(), pair));
                case '[object RegExp]':
                    return ['RegExp', "" + value];
                case '[object Undefined]':
                    return ['Undefined'];
                default:
                    return value;
            }
        };
        return function(value) {
            return JSON.stringify(canonicalize(value));
        };
    })();

    CANON.parse = (function() {
        var canonicalize;
        canonicalize = function(value) {
            var element, elements, idx, object, what, _i, _ref;
            if (Object.prototype.toString.call(value) !== '[object Array]') {
                return value;
            }
            what = value[0], elements = 2 <= value.length ? __slice.call(value, 1) : [];
            element = elements[0];
            switch (what) {
                case 'Array':
                    return map(elements, canonicalize);
                case 'Date':
                    return new Date(element);
                case 'Number':
                    return +element;
                case 'Object':
                    object = {};
                    for (idx = _i = 0, _ref = elements.length; _i < _ref; idx = _i += 2) {
                        object[elements[idx]] = canonicalize(elements[idx + 1]);
                    }
                    return object;
                case 'RegExp':
                    return (function(func, args, ctor) {
                        ctor.prototype = func.prototype;
                        var child = new ctor, result = func.apply(child, args);
                        return Object(result) === result ? result : child;
                    })(RegExp, /^[/](.+)[/]([gimy]*)$/.exec(element).slice(1), function(){});
                case 'Undefined':
                    return void 0;
                default:
                    throw new Error('invalid input');
            }
        };
        return function(string) {
            return canonicalize(JSON.parse(string));
        };
    })();

    nativeMap = Array.prototype.map;

    map = function(array, iterator) {
        var el, _i, _len, _results;
        if (nativeMap && array.map === nativeMap) {
            return array.map(iterator);
        } else {
            _results = [];
            for (_i = 0, _len = array.length; _i < _len; _i++) {
                el = array[_i];
                _results.push(iterator(el));
            }
            return _results;
        }
    };

    keys = Object.keys || function(object) {
        var key, _results;
        _results = [];
        for (key in object) {
            if (!__hasProp.call(object, key)) continue;
            _results.push(key);
        }
        return _results;
    };

    pad = function(n, min) {
        if (min == null) {
            min = 2;
        }
        return ("" + (1000 + n)).substr(4 - min);
    };

    return CANON;

});
