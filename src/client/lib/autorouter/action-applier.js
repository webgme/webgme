(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.AutoRouterActionApplier = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":5}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":4,"_process":3,"inherits":2}],6:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":7}],7:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":8}],8:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],9:[function(require,module,exports){
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */
'use strict';

var AutoRouter = require('./AutoRouter'),
    assert = require('./AutoRouter.Utils').assert;

var AutoRouterActionApplier = function () {
};

AutoRouterActionApplier.AutoRouter = AutoRouter;

AutoRouterActionApplier.prototype.init = function () {
    this._portSeparator = this._portSeparator || '_x_';
    this.autorouter = new AutoRouter();
    this.debugActionSequence = '[';
    this._clearRecords();
};

AutoRouterActionApplier.prototype._clearRecords = function () {
    this._autorouterBoxes = {};  // Define container that will map obj+subID -> box
    this._autorouterPorts = {};  // Maps boxIds to an array of port ids that have been mapped
    this._autorouterPaths = {};
    this._arPathId2Original = {};
};

/**
 * Replace id stored at the given indices of the array with the item from the dictionary.
 *
 * @param {Dictionary} dictionary
 * @param {Array} array
 * @param {Array<Number>} indices
 * @return {undefined}
 */
AutoRouterActionApplier.prototype._lookupItem = function (dictionary, array, indices) {  // jshint ignore:line
    var index,
        id;

    for (var i = 2; i < arguments.length; i++) {
        index = arguments[i];
        id = array[index];
        array[index] = dictionary[id];
    }
};

AutoRouterActionApplier.prototype._fixArgs = function (command, args) {
    var id;
    // Fix args, if needed
    switch (command) {
        case 'move':  // args[0] is id should be the box
            this._lookupItem(this._autorouterBoxes, args, 0);
            args[0] = args[0].box;
            break;

        case 'getPathPoints':
            this._lookupItem(this._autorouterPaths, args, 0);
            break;

        case 'setPathCustomPoints':
            id = args[0].path;
            args[0].path = this._autorouterPaths[id];
            break;

        case 'setBoxRect':
            this._lookupItem(this._autorouterBoxes, args, 0);
            break;

        case 'getBoxRect':
            this._lookupItem(this._autorouterBoxes, args, 0);
            args[0] = args[0].box.id;
            break;

        case 'updatePort':
            this._lookupItem(this._autorouterBoxes, args, 0);
            break;

        case 'setComponent':
            this._lookupItem(this._autorouterBoxes, args, 0, 1);
            break;

        case 'addPath':
            this._fixPortArgs(args[0].src, args[0].dst);
            args.pop();  // Remove the connection id
            break;

        case 'remove':
            var item;

            id = args[0];
            if (this._autorouterBoxes[id]) {
                item = this._autorouterBoxes[id];
            } else if (this._autorouterPaths[id]) {
                item = this._autorouterPaths[id];  // If objId is a connection
            }

            args[0] = item;
            break;

        case 'addBox':
            args.pop();
            break;

        default:
            break;
    }

};

AutoRouterActionApplier.prototype._fixPortArgs = function (port1, port2) { // jshint ignore:line
    var portId,
        portIds,
        arPortId,
        boxId,
        ports;

    for (var i = arguments.length; i--;) {
        ports = arguments[i];
        portIds = Object.keys(ports);
        for (var j = portIds.length; j--;) {
            portId = portIds[j];
            boxId = ports[portId];

            arPortId = this.autorouter.getPortId(portId, this._autorouterBoxes[boxId]);
            ports[portId] = this._autorouterBoxes[boxId].ports[arPortId];
            assert(this._autorouterBoxes[boxId].ports[arPortId], 'AR Port not found!');
        }
    }
};

/**
 * Invoke an AutoRouter method. This allows the action to be logged and bugs replicated.
 *
 * @param {String} command
 * @param {Array} args
 * @return {undefined}
 */
AutoRouterActionApplier.prototype._invokeAutoRouterMethod = function (command, args) {
    try {
        return this._invokeAutoRouterMethodUnsafe(command, args);

    } catch (e) {
        this.logger.error('AutoRouter.' + command + ' failed with error: ' + e);
    }
};

AutoRouterActionApplier.prototype._invokeAutoRouterMethodUnsafe = function (command, args) {
    var result,
        oldArgs = args.slice();

    if (this._recordActions) {
        this._recordAction(command, args.slice());
    }

    // Some arguments are simply ids for easier recording
    this._fixArgs(command, args);

    result = this.autorouter[command].apply(this.autorouter, args);
    this._updateRecords(command, oldArgs, result);
    return result;
};

AutoRouterActionApplier.prototype._updateRecords = function (command, input, result) {
    assert (input instanceof Array);
    var id,
        args = input.slice(),
        i;

    switch (command) {
        case 'addPath':
            id = args.pop();
            this._autorouterPaths[id] = result;
            this._arPathId2Original[result] = id;
            break;

        case 'addBox':
            id = args.pop();
            this._autorouterBoxes[id] = result;

            // Add ports
            this._autorouterPorts[id] = [];
            var ids = Object.keys(result.ports);
            for (i = ids.length; i--;) {
                this._autorouterPorts[id].push(result.ports[ids[i]]);
            }
            break;

        case 'remove':
            id = args[0];
            if (this._autorouterBoxes[id]) {
                i = this._autorouterPorts[id] ? this._autorouterPorts[id].length : 0;
                while (i--) {
                    var portId = id + this._portSeparator + this._autorouterPorts[id][i]; //ID of child port
                    delete this._autorouterBoxes[portId];
                }

                delete this._autorouterBoxes[id];
                delete this._autorouterPorts[id];

            } else if (this._autorouterPaths[id]) {
                var arId = this._autorouterPaths[id];
                delete this._autorouterPaths[id];
                delete this._arPathId2Original[arId];
            }
            break;

        case 'setComponent':
            var len,
                subCompId;

            id = args[0];
            len = id.length + this._portSeparator.length;
            subCompId = args[1].substring(len);

            if (this._autorouterPorts[id].indexOf(subCompId) === -1) {
                this._autorouterPorts[id].push(subCompId);
            }
            break;

        case 'updatePort':
            id = args[1].id;
            break;
    }
};

/**
 * Add the given action to the current sequence of autorouter commands.
 *
 * @param objId
 * @param subCompId
 * @return {undefined}
 */
AutoRouterActionApplier.prototype._recordAction = function (command, args) {

    var action = {action: command, args: args},
        circularFixer = function (key, value) {
            if (value && value.owner) {
                return value.id;
            }

            return value;
        };

    this.debugActionSequence += JSON.stringify(action, circularFixer) + ',';
};

AutoRouterActionApplier.prototype._getActionSequence = function () {
    var index = this.debugActionSequence.lastIndexOf(','),
        result = this.debugActionSequence.substring(0, index) + ']';

    return result;
};

module.exports = AutoRouterActionApplier;

},{"./AutoRouter":23,"./AutoRouter.Utils":22}],10:[function(require,module,exports){
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point'),
    ArRect = require('./AutoRouter.Rect'),
    AutoRouterPort = require('./AutoRouter.Port');


var AutoRouterBox = function () {
    this.owner = null;
    this.rect = new ArRect();
    this.atomic = false;
    this.selfPoints = [];
    this.ports = [];
    this.childBoxes = [];//dependent boxes
    this.parent = null;
    this.id = null;

    this.calculateSelfPoints(); //Part of initialization
};

AutoRouterBox.prototype.calculateSelfPoints = function () {
    this.selfPoints = [];
    this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

    this.selfPoints.push(new ArPoint(this.rect.right, this.rect.ceil));
    this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
    this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
};

AutoRouterBox.prototype.deleteAllPorts = function () {
    for (var i = 0; i < this.ports.length; i++) {
        this.ports[i].destroy();
    }

    this.ports = [];

    this.atomic = false;
};

AutoRouterBox.prototype.hasOwner = function () {
    return this.owner !== null;
};

AutoRouterBox.prototype.createPort = function () {
    var port = new AutoRouterPort();
    assert(port !== null, 'ARBox.createPort: port !== null FAILED');

    return port;
};

AutoRouterBox.prototype.hasNoPort = function () {
    return this.ports.length === 0;
};

AutoRouterBox.prototype.isAtomic = function () {
    return this.atomic;
};

AutoRouterBox.prototype.addPort = function (port) {
    assert(port !== null, 'ARBox.addPort: port !== null FAILED');

    port.owner = this;
    this.ports.push(port);

    if (this.owner) {  // Not pointing to the ARGraph
        this.owner._addEdges(port);
    }
};

AutoRouterBox.prototype.deletePort = function (port) {
    assert(port !== null, 'ARBox.deletePort: port !== null FAILED');
    if (port === null) {
        return;
    }

    var index = this.ports.indexOf(port),
        graph = this.owner;

    assert(index !== -1, 'ARBox.deletePort: index !== -1 FAILED');

    graph.deleteEdges(port);
    this.ports.splice(index, 1);

    this.atomic = false;

};

AutoRouterBox.prototype.isRectEmpty = function () {
    return this.rect.isRectEmpty();
};

AutoRouterBox.prototype.setRect = function (r) {
    assert(r instanceof ArRect, 'Invalthis.id arg in ARBox.setRect. Requires ArRect');

    assert(r.getWidth() >= 3 && r.getHeight() >= 3,
        'ARBox.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!');

    assert(r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= CONSTANTS.ED_MINCOORD,
        'ARBox.setRect: r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= ' +
        'CONSTANTS.ED_MAXCOORD FAILED!');

    assert(r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= CONSTANTS.ED_MAXCOORD,
        'ARBox.setRect:  r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= ' +
        'CONSTANTS.ED_MAXCOORD FAILED!');

    assert(this.ports.length === 0 || this.atomic,
        'ARBox.setRect: this.ports.length === 0 || this.atomic FAILED!');

    this.rect.assign(r);
    this.calculateSelfPoints();

    if (this.atomic) {
        assert(this.ports.length === 1, 'ARBox.setRect: this.ports.length === 1 FAILED!');
        this.ports[0].setRect(r);
    }
};

AutoRouterBox.prototype.shiftBy = function (offset) {
    this.rect.add(offset);

    var i = this.ports.length;
    while (i--) {
        this.ports[i].shiftBy(offset);
    }

    /*
     This is not necessary; the ARGraph will shift all children
     i = this.childBoxes.length;
     while(i--){
     this.childBoxes[i].shiftBy(offset);
     }
     */
    this.calculateSelfPoints();
};

AutoRouterBox.prototype.resetPortAvailability = function () {
    for (var i = this.ports.length; i--;) {
        this.ports[i].resetAvailableArea();
    }
};

AutoRouterBox.prototype.adjustPortAvailability = function (box) {
    if (!box.hasAncestorWithId(this.id) &&   // Boxes are not dependent on one another
        !this.hasAncestorWithId(box.id)) {

        for (var i = this.ports.length; i--;) {
            this.ports[i].adjustAvailableArea(box.rect);
        }
    }
};

AutoRouterBox.prototype.addChild = function (box) {
    assert(this.childBoxes.indexOf(box) === -1,
        'ARBox.addChild: box already is child of ' + this.id);
    assert(box instanceof AutoRouterBox,
        'Child box must be of type AutoRouterBox');

    this.childBoxes.push(box);
    box.parent = this;
};

AutoRouterBox.prototype.removeChild = function (box) {
    var i = this.childBoxes.indexOf(box);
    assert(i !== -1, 'ARBox.removeChild: box isn\'t child of ' + this.id);
    this.childBoxes.splice(i, 1);
    box.parent = null;
};

AutoRouterBox.prototype.hasAncestorWithId = function (id) {
    var box = this;
    while (box) {
        if (box.id === id) {
            return true;
        }
        box = box.parent;
    }
    return false;
};

AutoRouterBox.prototype.getRootBox = function () {
    var box = this;
    while (box.parent) {
        box = box.parent;
    }
    return box;
};

AutoRouterBox.prototype.isBoxAt = function (point, nearness) {
    return Utils.isPointIn(point, this.rect, nearness);
};

AutoRouterBox.prototype.isBoxClip = function (r) {
    return Utils.isRectClip(this.rect, r);
};

AutoRouterBox.prototype.isBoxIn = function (r) {
    return Utils.isRectIn(this.rect, r);
};

AutoRouterBox.prototype.destroy = function () {
    var i = this.childBoxes.length;

    //notify this.parent of destruction
    //if there is a this.parent, of course
    if (this.parent) {
        this.parent.removeChild(this);
    }

    this.owner = null;
    this.deleteAllPorts();

    while (i--) {
        this.childBoxes[i].destroy();
    }
};

AutoRouterBox.prototype.assertValid = function () {
    for (var p = this.ports.length; p--;) {
        this.ports[p].assertValid();
    }
};

module.exports = AutoRouterBox;

},{"./AutoRouter.Constants":11,"./AutoRouter.Point":17,"./AutoRouter.Port":19,"./AutoRouter.Rect":20,"./AutoRouter.Utils":22,"assert":1}],11:[function(require,module,exports){
/*jshint node: true, bitwise: false*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';
var ArPoint = require('./AutoRouter.Point');

module.exports = {
    EMPTY_POINT: new ArPoint(-100000, -100000),
    ED_MAXCOORD: 100000,
    ED_MINCOORD: -2,//This allows connections to be still be draw when box is pressed against the edge
    ED_SMALLGAP: 15,
    CONNECTIONCUSTOMIZATIONDATAVERSION: 0,
    EMPTYCONNECTIONCUSTOMIZATIONDATAMAGIC: -1,
    DEBUG: false,
    BUFFER: 10,

    EDLS_S: 15,//ED_SMALLGAP
    EDLS_R: 15 + 1, //ED_SMALLGAP+1
    EDLS_D: 100000 + 2,//ED_MAXCOORD - ED_MINCOORD,

    PathEndOnDefault: 0x0000,
    PathEndOnTop: 0x0010,
    PathEndOnRight: 0x0020,
    PathEndOnBottom: 0x0040,
    PathEndOnLeft: 0x0080,
    PathEndMask: (0x0010 | 0x0020 | 0x0040 | 0x0080),
    // (PathEndOnTop | PathEndOnRight | PathEndOnBottom | PathEndOnLeft),

    PathStartOnDefault: 0x0000,
    PathStartOnTop: 0x0100,
    PathStartOnRight: 0x0200,
    PathStartOnBottom: 0x0400,
    PathStartOnLeft: 0x0800,
    PathStartMask: (0x0100 | 0x0200 | 0x0400 | 0x0800),
    // (PathStartOnTop | PathStartOnRight | PathStartOnBottom | PathStartOnLeft),

    PathHighLighted: 0x0002,		// attributes,
    PathFixed: 0x0001,
    PathDefault: 0x0000,

    PathStateConnected: 0x0001,		// states,
    PathStateDefault: 0x0000,

    // Port Connection Variables
    PortEndOnTop: 0x0001,
    PortEndOnRight: 0x0002,
    PortEndOnBottom: 0x0004,
    PortEndOnLeft: 0x0008,
    PortEndOnAll: 0x000F,

    PortStartOnTop: 0x0010,
    PortStartOnRight: 0x0020,
    PortStartOnBottom: 0x0040,
    PortStartOnLeft: 0x0080,
    PortStartOnAll: 0x00F0,

    PortConnectOnAll: 0x00FF,
    PortConnectToCenter: 0x0100,

    PortStartEndHorizontal: 0x00AA,
    PortStartEndVertical: 0x0055,

    PortDefault: 0x00FF,

    // RoutingDirection vars 
    DirNone: -1,
    DirTop: 0,
    DirRight: 1,
    DirBottom: 2,
    DirLeft: 3,
    DirSkew: 4,

    //Path Custom Data
    SimpleEdgeDisplacement: 'EdgeDisplacement',
    CustomPointCustomization: 'PointCustomization'
    //CONNECTIONCUSTOMIZATIONDATAVERSION : null
};

},{"./AutoRouter.Point":17}],12:[function(require,module,exports){
/*globals define*/
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point');

var AutoRouterEdge = function () {
    /*
     In this section every comment refer to the horizontal case, that is, each	edge is
     horizontal.
     */

    /*
     * TODO Update this comment
     *
     Every CAutoRouterEdge belongs to an edge of a CAutoRouterPath, CAutoRouterBox or CAutoRouterPort. This edge is
     Represented by a CAutoRouterPoint with its next point. The variable 'point' will refer
     to this CAutoRouterPoint.

     The coordinates of an edge are 'x1', 'x2' and 'y' where x1/x2 is the x-coordinate
     of the left/right point, and y is the common y-coordinate of the points.

     The edges are ordered according to their y-coordinates. The first edge has
     the least y-coordinate (topmost), and its pointer is in 'orderFirst'.
     We use the 'order' prefix in the variable names to refer to this order.

     We will walk from top to bottom (from the 'orderFirst' along the 'this.orderNext').
     We keep track a 'section' of some edges. If we have an infinite horizontal line,
     then the section consists of those edges that are above the line and not blocked
     by another edge which is closer to the line. Each edge in the section has
     a viewable portion from the line (the not blocked portion). The coordinates
     of this portion are 'this.sectionX1' and 'this.sectionX2'. We have an order of the edges
     belonging to the current section. The 'section_first' refers to the leftmost
     edge in the section, while the 'this.sectionNext' to the next from left to right.

     We say that the CAutoRouterEdge E1 'precede' the CAutoRouterEdge E2 if there is no other CAutoRouterEdge which
     totally	blocks S1 from S2. So a section consists of the preceding edges of an
     infinite edge. We say that E1 is 'adjacent' to E2, if E1 is the nearest edge
     to E2 which precede it. Clearly, every edge has at most one adjacent precedence.

     The edges of any CAutoRouterBox or CAutoRouterPort are fixed. We will continually fix the edges
     of the CAutoRouterPaths. But first we need some definition.

     We call a set of edges as a 'block' if the topmost (first) and bottommost (last)
     edges of it are fixed while the edges between them are not. Furthermore, every
     edge is adjacent to	the next one in the order. Every edge in the block has an
     'index'. The index of the first one (topmost) is 0, of the second is 1, and so on.
     We call the index of the last edge (# of edges - 1) as the index of the entire box.
     The 'depth' of a block is the difference of the y-coordinates of the first and last
     edges of it. The 'goal gap' of the block is the quotient of the depth and index
     of the block. If the difference of the y-coordinates of the adjacent edges in
     the block are all equal to the goal gap, then we say that the block is evenly
     distributed.

     So we search the block which has minimal goal gap. Then if it is not evenly
     distributed, then we shift the not fixed edges to the desired position. It is
     not hard to see	that if the block has minimal goal gap (among the all
     possibilities of blocks), then in this way we do not move any edges into boxes.
     Finally, we set the (inner) edges of the block to be fixed (except the topmost and
     bottommost edges, since they are already fixed). And we again begin the search.
     If every edge is fixed, then we have finished. This is the basic idea. We will
     refine this algorithm.

     The variables related to the blocks are prefixed by 'block'. Note that the
     variables of an edge are refer to that block in which this edge is inner! The
     'block_oldgap' is the goal gap of the block when it was last evenly distributed.

     The variables 'canstart' and 'canend' means that this egde can start and/or end
     a block. The top edge of a box only canend, while a fixed edge of a path can both
     start and end of a block.

     */

    this.owner = null;
    this.startpointPrev = null;
    this.startpoint = null;
    this.endpoint = null;
    this.endpointNext = null;

    this.positionY = 0;
    this.positionX1 = 0;
    this.positionX2 = 0;
    this.bracketClosing = false;
    this.bracketOpening = false;

    this.orderPrev = null;
    this.orderNext = null;

    this.sectionX1 = null;
    this.sectionX2 = null;
    this.sectionNext = null;
    this.sectionDown = null;

    this.edgeFixed = false;
    this.edgeCustomFixed = false;
    this.edgeCanPassed = false;
    this.edgeDirection = null;

    this.blockPrev = null;
    this.blockNext = null;
    this.blockTrace = null;

    this.closestPrev = null;
    this.closestNext = null;

};


AutoRouterEdge.prototype.assign = function (otherEdge) {

    if (otherEdge !== null) {
        this.owner = otherEdge.owner;
        this.setStartPoint(otherEdge.startpoint, false);

        //Only calculateDirection if this.endpoint is not null
        this.setEndPoint(otherEdge.endpoint, otherEdge.endpoint !== null);

        this.startpointPrev = otherEdge.startpointPrev;
        this.endpointNext = otherEdge.endpointNext;

        this.positionY = otherEdge.positionY;
        this.positionX1 = otherEdge.positionX1;
        this.positionX2 = otherEdge.positionX2;
        this.bracketClosing = otherEdge.bracketClosing;
        this.bracketOpening = otherEdge.bracketOpening;

        this.orderNext = otherEdge.orderNext;
        this.orderPrev = otherEdge.orderPrev;

        this.sectionX1 = otherEdge.sectionX1;
        this.sectionX2 = otherEdge.sectionX2;
        this.setSectionNext(otherEdge.getSectionNext(true));
        this.setSectionDown(otherEdge.getSectionDown(true));

        this.edgeFixed = otherEdge.edgeFixed;
        this.edgeCustomFixed = otherEdge.edgeCustomFixed;
        this.setEdgeCanpassed(otherEdge.getEdgeCanpassed());
        this.setDirection(otherEdge.getDirection());

        this.setBlockPrev(otherEdge.getBlockPrev());
        this.setBlockNext(otherEdge.getBlockNext());
        this.setBlockTrace(otherEdge.getBlockTrace());

        this.setClosestPrev(otherEdge.getClosestPrev());
        this.setClosestNext(otherEdge.getClosestNext());

        return this;
    }

    return null;
};

AutoRouterEdge.prototype.equals = function (otherEdge) {
    return this === otherEdge; // This checks if they reference the same object
};

AutoRouterEdge.prototype.getStartPointPrev = function () {
    return this.startpointPrev !== null ? this.startpointPrev || this.startpointPrev : null;
};

AutoRouterEdge.prototype.isStartPointPrevNull = function () {
    return !this.startpointPrev;
};

AutoRouterEdge.prototype.getStartPoint = function () {
    return this.startpoint !== null ?
        (this.startpoint instanceof Array ? new ArPoint(this.startpoint) : new ArPoint(this.startpoint)) :
        CONSTANTS.EMPTY_POINT;  // returning copy of this.startpoint
};

AutoRouterEdge.prototype.isSameStartPoint = function (point) {
    return this.startpoint === point;
};

AutoRouterEdge.prototype.isStartPointNull = function () {
    return this.startpoint === null;
};

AutoRouterEdge.prototype.setStartPoint = function (point, b) {
    this.startpoint = point;

    if (b !== false) {
        this.recalculateDirection();
    }
};

AutoRouterEdge.prototype.setStartPointX = function (_x) {
    this.startpoint.x = _x;
};

AutoRouterEdge.prototype.setStartPointY = function (_y) {
    this.startpoint.y = _y;
};

AutoRouterEdge.prototype.getEndPoint = function () {
    return this.endpoint !== null ?
        (this.endpoint instanceof Array ?
            new ArPoint(this.endpoint) :
            new ArPoint(this.endpoint)) :
        CONSTANTS.EMPTY_POINT;
};

AutoRouterEdge.prototype.isEndPointNull = function () {
    return this.endpoint === null;
};

AutoRouterEdge.prototype.setEndPoint = function (point, b) {
    this.endpoint = point;

    if (b !== false) {
        this.recalculateDirection();
    }
};

AutoRouterEdge.prototype.setStartAndEndPoint = function (startPoint, endPoint) {
    this.setStartPoint(startPoint, false); //wait until setting the this.endpoint to recalculateDirection
    this.setEndPoint(endPoint);
};

AutoRouterEdge.prototype.setEndPointX = function (_x) {
    this.endpoint.x = _x;
};

AutoRouterEdge.prototype.setEndPointY = function (_y) {
    this.endpoint.y = _y;
};

AutoRouterEdge.prototype.isEndPointNextNull = function () {
    return !this.endpointNext;
};

AutoRouterEdge.prototype.getSectionNext = function () {

    return this.sectionNext !== undefined ? this.sectionNext[0] : null;
};

AutoRouterEdge.prototype.getSectionNextPtr = function () {
    if (!this.sectionNext || !this.sectionNext[0]) {
        this.sectionNext = [new AutoRouterEdge()];
    }
    return this.sectionNext;
};

AutoRouterEdge.prototype.setSectionNext = function (nextSection) {
    nextSection = nextSection instanceof Array ? nextSection[0] : nextSection;
    if (this.sectionNext instanceof Array) {
        this.sectionNext[0] = nextSection;
    } else {
        this.sectionNext = [nextSection];
    }
};

AutoRouterEdge.prototype.getSectionDown = function () { //Returns pointer - if not null

    return this.sectionDown !== undefined ? this.sectionDown[0] : null;

};

AutoRouterEdge.prototype.getSectionDownPtr = function () {
    if (!this.sectionDown || !this.sectionDown[0]) {
        this.sectionDown = [new AutoRouterEdge()];
    }
    return this.sectionDown;
};

AutoRouterEdge.prototype.setSectionDown = function (downSection) {
    downSection = downSection instanceof Array ? downSection[0] : downSection;
    if (this.sectionDown instanceof Array) {
        this.sectionDown[0] = downSection;
    } else {
        this.sectionDown = [downSection];
    }
};

AutoRouterEdge.prototype.getEdgeCanpassed = function () {
    return this.edgeCanPassed;
};

AutoRouterEdge.prototype.setEdgeCanpassed = function (ecp) {
    this.edgeCanPassed = ecp;
};

AutoRouterEdge.prototype.getDirection = function () {
    return this.edgeDirection;
};

AutoRouterEdge.prototype.setDirection = function (dir) {
    this.edgeDirection = dir;
};

AutoRouterEdge.prototype.recalculateDirection = function () {
    assert(this.startpoint !== null && this.endpoint !== null,
        'AREdge.recalculateDirection: this.startpoint !== null && this.endpoint !== null FAILED!');
    this.edgeDirection = Utils.getDir(this.endpoint.minus(this.startpoint));
};

AutoRouterEdge.prototype.getBlockPrev = function () {
    return this.blockPrev;
};

AutoRouterEdge.prototype.setBlockPrev = function (prevBlock) {
    this.blockPrev = prevBlock;
};

AutoRouterEdge.prototype.getBlockNext = function () {
    return this.blockNext;
};

AutoRouterEdge.prototype.setBlockNext = function (nextBlock) {
    this.blockNext = nextBlock;
};

AutoRouterEdge.prototype.getBlockTrace = function () {
    return this.blockTrace;
};

AutoRouterEdge.prototype.setBlockTrace = function (traceBlock) {
    this.blockTrace = traceBlock;
};

AutoRouterEdge.prototype.getClosestPrev = function () {
    return this.closestPrev;
};

AutoRouterEdge.prototype.setClosestPrev = function (cp) {
    this.closestPrev = cp;
};

AutoRouterEdge.prototype.getClosestNext = function () {
    return this.closestNext;
};

AutoRouterEdge.prototype.setClosestNext = function (cp) {
    this.closestNext = cp;
};

module.exports = AutoRouterEdge;

},{"./AutoRouter.Constants":11,"./AutoRouter.Point":17,"./AutoRouter.Utils":22,"assert":1}],13:[function(require,module,exports){
/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var Logger = require('./AutoRouter.Logger'),
    assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    AutoRouterPath = require('./AutoRouter.Path'),
    AutoRouterPort = require('./AutoRouter.Port'),
    AutoRouterBox = require('./AutoRouter.Box'),
    AutoRouterEdge = require('./AutoRouter.Edge');


    //----------------------AutoRouterEdgeList

var _logger = new Logger('AutoRouter.EdgeList');
var AutoRouterEdgeList = function (b) {
    this.owner = null;

    //--Edges
    this.ishorizontal = b;

    //--Order
    this.orderFirst = null;
    this.orderLast = null;

    //--Section
    this.sectionFirst = null;
    this.sectionBlocker = null;
    this.sectionPtr2Blocked = []; // This is an array to emulate the pointer to a pointer functionality in CPP. 
    // That is, this.sectionPtr2Blocked[0] = this.sectionPtr2Blocked*

    this._initOrder();
    this._initSection();
};

// Public Functions
AutoRouterEdgeList.prototype.contains = function (start, end) {
    var currentEdge = this.orderFirst,
        startpoint,
        endpoint;

    while (currentEdge) {
        startpoint = currentEdge.startpoint;
        endpoint = currentEdge.endpoint;
        if (start.equals(startpoint) && end.equals(endpoint)) {
            return true;
        }
        currentEdge = currentEdge.orderNext;
    }

    return false;
};

AutoRouterEdgeList.prototype.destroy = function () {
    this.checkOrder();
    this.checkSection();
};

AutoRouterEdgeList.prototype.addPathEdges = function (path) {
    assert(path.owner === this.owner,
        'AREdgeList.addEdges: path.owner === owner FAILED!');

    var isPathAutoRouted = path.isAutoRouted(),
        hasCustomEdge = false,
        customizedIndexes = {},
        indexes = [],
        startpoint,
        endpoint,
        dir,
        edge,
        i;

    if (isPathAutoRouted) {
        i = -1;
        while (++i < indexes.length) {
            hasCustomEdge = true;
            customizedIndexes[indexes[i]] = 0;
        }
    } else {
        hasCustomEdge = true;
    }

    var pointList = path.getPointList(),
        ptrsObject = pointList.getTailEdgePtrs(),
        indItr,
        currEdgeIndex = pointList.length - 2,
        goodAngle,
        pos = ptrsObject.pos,
        skipEdge,
        isMoveable,
        isEdgeCustomFixed,
        startPort,
        endPort,
        isStartPortConnectToCenter,
        isEndPortConnectToCenter,
        isPathFixed;

    startpoint = ptrsObject.start;
    endpoint = ptrsObject.end;

    while (pointList.length && pos >= 0) {

        dir = Utils.getDir(endpoint.minus(startpoint));

        skipEdge = dir === CONSTANTS.DirNone ? true : false;
        isMoveable = path.isMoveable();

        if (!isMoveable && dir !== CONSTANTS.DirSkew) {
            goodAngle = Utils.isRightAngle(dir);
            assert(goodAngle,
                'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

            if (!goodAngle) {
                skipEdge = true;
            }

        }

        if (!skipEdge &&
            (Utils.isRightAngle(dir) && Utils.isHorizontal(dir) === this.ishorizontal)) {
            edge = new AutoRouterEdge();
            edge.owner = path;

            edge.setStartAndEndPoint(startpoint, endpoint);
            edge.startpointPrev = pointList.getPointBeforeEdge(pos);
            edge.endpointNext = pointList.getPointAfterEdge(pos);

            if (hasCustomEdge) {
                isEdgeCustomFixed = false;
                if (isPathAutoRouted) {
                    indItr = customizedIndexes.indexOf(currEdgeIndex);
                    isEdgeCustomFixed = (indItr !== customizedIndexes.length - 1);
                } else {
                    isEdgeCustomFixed = true;
                }

                edge.edgeCustomFixed = isEdgeCustomFixed;

            } else {

                edge.edgeCustomFixed = dir === CONSTANTS.DirSkew;
            }

            startPort = path.getStartPort();

            assert(startPort !== null,
                'AREdgeList.addEdges: startPort !== null FAILED!');

            isStartPortConnectToCenter = startPort.isConnectToCenter();
            endPort = path.getEndPort();

            assert(endPort !== null,
                'AREdgeList.addEdges: endPort !== null FAILED!');

            isEndPortConnectToCenter = endPort.isConnectToCenter();
            isPathFixed = path.isFixed() || !path.isAutoRouted();

            edge.edgeFixed = edge.edgeCustomFixed || isPathFixed ||
            (edge.isStartPointPrevNull() && isStartPortConnectToCenter) ||
            (edge.isEndPointNextNull() && isEndPortConnectToCenter);

            if (dir !== CONSTANTS.DirSkew) {
                this._positionLoadY(edge);
                this._positionLoadB(edge);
            } else {
                edge.positionY = 0;
                edge.bracketOpening = false;
                edge.bracketClosing = false;
            }

            this.insert(edge);

        }

        ptrsObject = pointList.getPrevEdgePtrs(pos);
        pos = ptrsObject.pos;
        startpoint = ptrsObject.start;
        endpoint = ptrsObject.end;
        currEdgeIndex--;
    }

    return true;
};

AutoRouterEdgeList.prototype.addPortEdges = function (port) {
    var startpoint,
        endpoint,
        edge,
        selfPoints,
        startpointPrev,
        endpointNext,
        dir,
        i,
        canHaveStartEndPointHorizontal;

    assert(port.owner.owner === this.owner,
        'AREdgeList.addEdges: port.owner === (owner) FAILED!');

    if (port.isConnectToCenter() || port.owner.isAtomic()) {
        return;
    }

    selfPoints = port.selfPoints;

    for (i = 0; i < 4; i++) {

        startpointPrev = selfPoints[(i + 3) % 4];
        startpoint = selfPoints[i];
        endpoint = selfPoints[(i + 1) % 4];
        endpointNext = selfPoints[(i + 2) % 4];
        dir = Utils.getDir(endpoint.minus(startpoint));

        assert(Utils.isRightAngle(dir),
            'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

        canHaveStartEndPointHorizontal = port.canHaveStartEndPointHorizontal(this.ishorizontal);
        if (Utils.isHorizontal(dir) === this.ishorizontal && canHaveStartEndPointHorizontal) {
            edge = new AutoRouterEdge();

            edge.owner = port;
            edge.setStartAndEndPoint(startpoint, endpoint);
            edge.startpointPrev = startpointPrev;
            edge.endpointNext = endpointNext;

            edge.edgeFixed = true;

            this._positionLoadY(edge);
            this._positionLoadB(edge);

            if (edge.bracketClosing) {
                edge.addToPosition(0.999);
            }

            this.insert(edge);
        }
    }
};

AutoRouterEdgeList.prototype.addEdges = function (path) {
    var selfPoints,
        startpoint,
        startpointPrev,
        endpointNext,
        endpoint,
        edge,
        dir,
        i;

    if (path instanceof AutoRouterBox) {
        var box = path;

        assert(box.owner === this.owner,
            'AREdgeList.addEdges: box.owner === (owner) FAILED!');


        selfPoints = box.selfPoints;

        for (i = 0; i < 4; i++) {
            startpointPrev = selfPoints[(i + 3) % 4];
            startpoint = selfPoints[i];
            endpoint = selfPoints[(i + 1) % 4];
            endpointNext = selfPoints[(i + 2) % 4];
            dir = Utils.getDir(endpoint.minus(startpoint));

            assert(Utils.isRightAngle(dir),
                'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

            if (Utils.isHorizontal(dir) === this.ishorizontal) {
                edge = new AutoRouterEdge();

                edge.owner = box;
                edge.setStartAndEndPoint(startpoint, endpoint);
                edge.startpointPrev = startpointPrev;
                edge.endpointNext = endpointNext;

                edge.edgeFixed = true;

                this._positionLoadY(edge);
                this._positionLoadB(edge);

                if (edge.bracketClosing) {
                    edge.addToPosition(0.999);
                }

                this.insert(edge);
            }
        }
    } else if (path) {  // path is an ARGraph
        var graph = path;
        assert(graph === this.owner,
            'AREdgeList.addEdges: graph === this.owner FAILED!');

        selfPoints = graph.selfPoints;

        for (i = 0; i < 4; i++) {

            startpointPrev = selfPoints[(i + 3) % 4];
            startpoint = selfPoints[i];
            endpoint = selfPoints[(i + 1) % 4];
            endpointNext = selfPoints[(i + 2) % 4];
            dir = Utils.getDir(endpoint.minus(startpoint));

            assert(Utils.isRightAngle(dir),
                'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

            if (Utils.isHorizontal(dir) === this.ishorizontal) {
                edge = new AutoRouterEdge();

                edge.owner = graph;
                edge.setStartAndEndPoint(startpoint, endpoint);
                edge.startpointPrev = startpointPrev;
                edge.endpointNext = endpointNext;

                edge.edgeFixed = true;

                this._positionLoadY(edge);
                this.insert(edge);
            }
        }

    }
};

AutoRouterEdgeList.prototype.deleteEdges = function (object) {
    var edge = this.orderFirst,
        next;

    while (edge !== null) {
        if (edge.owner === object) {
            next = edge.orderNext;
            this.remove(edge);
            edge = next;
        } else {
            edge = edge.orderNext;
        }
    }

};

AutoRouterEdgeList.prototype.deleteAllEdges = function () {
    while (this.orderFirst) {
        this.remove(this.orderFirst);
    }
};

AutoRouterEdgeList.prototype.getEdge = function (path, startpoint) {
    var edge = this.orderFirst;
    while (edge !== null) {

        if (edge.isSameStartPoint(startpoint)) {
            break;
        }

        edge = edge.orderNext;
    }

    assert(edge !== null,
        'AREdgeList.getEdge: edge !== null FAILED!');
    return edge;
};

AutoRouterEdgeList.prototype.getEdgeByPointer = function (startpoint) {
    var edge = this.orderFirst;
    while (edge !== null) {
        if (edge.isSameStartPoint(startpoint)) {
            break;
        }

        edge = edge.orderNext;
    }

    assert(edge !== null,
        'AREdgeList.getEdgeByPointer: edge !== null FAILED!');
    return edge;
};

AutoRouterEdgeList.prototype.setEdgeByPointer = function (pEdge, newEdge) {
    assert(newEdge instanceof AutoRouterEdge,
        'AREdgeList.setEdgeByPointer: newEdge instanceof AutoRouterEdge FAILED!');
    var edge = this.sectionFirst;
    while (edge !== null) {
        if (pEdge === edge) {
            break;
        }

        edge = edge.getSectionDown();
    }

    assert(edge !== null,
        'AREdgeList.setEdgeByPointer: edge !== null FAILED!');
    edge = newEdge;
};

AutoRouterEdgeList.prototype.getEdgeAt = function (point, nearness) {
    var edge = this.orderFirst;
    while (edge) {

        if (Utils.isPointNearLine(point, edge.startpoint, edge.endpoint, nearness)) {
            return edge;
        }

        edge = edge.orderNext;
    }

    return null;
};

AutoRouterEdgeList.prototype.dumpEdges = function (msg, logger) {
    var edge = this.orderFirst,
        log = logger || _logger.debug,
        total = 1;

    log(msg);

    while (edge !== null) {
        log('\t' + edge.startpoint.x + ', ' + edge.startpoint.y + '\t\t' + edge.endpoint.x + ', ' +
        edge.endpoint.y + '\t\t\t(' + (edge.edgeFixed ? 'FIXED' : 'MOVEABLE' ) + ')\t\t' +
        (edge.bracketClosing ? 'Bracket Closing' : (edge.bracketOpening ? 'Bracket Opening' : '')));

        edge = edge.orderNext;
        total++;
    }

    log('Total Edges: ' + total);
};

AutoRouterEdgeList.prototype.getEdgeCount = function () {
    var edge = this.orderFirst,
        total = 1;
    while (edge !== null) {
        edge = edge.orderNext;
        total++;
    }
    return total;
};

//--Private Functions
AutoRouterEdgeList.prototype._positionGetRealY = function (edge, y) {
    if (y === undefined) {
        if (this.ishorizontal) {
            assert(edge.startpoint.y === edge.endpoint.y,
                'AREdgeList.position_GetRealY: edge.startpoint.y === edge.endpoint.y FAILED!');
            return edge.startpoint.y;
        }

        assert(edge.startpoint.x === edge.endpoint.x,
            'AREdgeList.position_GetRealY: edge.startpoint.x === edge.endpoint.x FAILED!');
        return edge.startpoint.x;
    } else {

        assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
            'AREdgeList.position_GetRealY: edge !== null && !edge.isStartPointNull() && ' +
            '!edge.isEndPointNull() FAILED!');

        if (this.ishorizontal) {
            assert(edge.startpoint.y === edge.endpoint.y,
                'AREdgeList.position_GetRealY: edge.startpoint.y === edge.endpoint.y FAILED!');
            edge.setStartPointY(y);
            edge.setEndPointY(y);
        } else {
            assert(edge.startpoint.x === edge.endpoint.x,
                'AREdgeList.position_GetRealY: edge.startpoint.x === edge.endpoint.x FAILED');

            edge.setStartPointX(y);
            edge.setEndPointX(y);
        }
    }
};

AutoRouterEdgeList.prototype._positionSetRealY = function (edge, y) {
    if (edge instanceof Array) {
        edge = edge[0];
    }

    assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
        'AREdgeList.position_SetRealY: edge != null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

    if (this.ishorizontal) {
        assert(edge.startpoint.y === edge.endpoint.y,
            'AREdgeList.position_SetRealY: edge.startpoint.y === edge.endpoint.y FAILED');
        edge.setStartPointY(y);
        edge.setEndPointY(y);
    } else {
        assert(edge.startpoint.x === edge.endpoint.x,
            'AREdgeList.position_SetRealY: edge.startpoint.x === edge.endpoint.x FAILED');
        edge.setStartPointX(y);
        edge.setEndPointX(y);
    }
};

/**
 * Normalize the edge endpoints so x1 < x2
 */
AutoRouterEdgeList.prototype._positionGetRealX = function (edge) {
    assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
        'AREdgeList.position_GetRealX: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');
    var x1, x2;

    if (this.ishorizontal) {
        assert(edge.startpoint.y === edge.endpoint.y,
            'AREdgeList.position_GetRealX: edge.startpoint.y === edge.endpoint.y FAILED');

        if (edge.startpoint.x < edge.endpoint.x) {

            x1 = edge.startpoint.x;
            x2 = edge.endpoint.x;
        } else {

            x1 = edge.endpoint.x;
            x2 = edge.startpoint.x;
        }
    } else {
        assert(edge.startpoint.x === edge.endpoint.x,
            'AREdgeList.position_GetRealX: edge.startpoint.x === edge.endpoint.x FAILED');
        if (edge.startpoint.y < edge.endpoint.y) {

            x1 = edge.startpoint.y;
            x2 = edge.endpoint.y;
        } else {

            x1 = edge.endpoint.y;
            x2 = edge.startpoint.y;
        }
    }

    return [x1, x2];
};

AutoRouterEdgeList.prototype._positionGetRealO = function (edge) {
    assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
        'AREdgeList.position_GetRealO: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');
    var o1, o2;

    if (this.ishorizontal) {
        assert(edge.startpoint.y === edge.endpoint.y,
            'AREdgeList.position_GetRealO: edge.startpoint.y === edge.endpoint.y FAILED');
        if (edge.startpoint.x < edge.endpoint.x) {

            o1 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.y - edge.startpoint.y;
            o2 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.y - edge.endpoint.y;
        } else {

            o1 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.y - edge.endpoint.y;
            o2 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.y - edge.startpoint.y;
        }
    } else {
        assert(edge.startpoint.x === edge.endpoint.x,
            'AREdgeList.position_GetRealO: edge.startpoint.x === edge.endpoint.x FAILED');
        if (edge.startpoint.y < edge.endpoint.y) {

            o1 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.x - edge.startpoint.x;
            o2 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.x - edge.endpoint.x;
        } else {

            o1 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.x - edge.endpoint.x;
            o2 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.x - edge.startpoint.x;
        }
    }

    return [o1, o2];
};

AutoRouterEdgeList.prototype._positionLoadY = function (edge) {
    assert(edge !== null && edge.orderNext === null && edge.orderPrev === null,
        'AREdgeList.position_LoadY: edge !== null && edge.orderNext === null && edge.orderPrev === null FAILED');

    edge.positionY = this._positionGetRealY(edge);
};

AutoRouterEdgeList.prototype._positionLoadB = function (edge) {
    assert(edge !== null,
        'AREdgeList.position_LoadB: edge !== null FAILED');

    edge.bracketOpening = !edge.edgeFixed && this._bracketIsOpening(edge);
    edge.bracketClosing = !edge.edgeFixed && this._bracketIsClosing(edge);
};

AutoRouterEdgeList.prototype._positionAllStoreY = function () {
    var edge = this.orderFirst;
    while (edge) {
        this._positionSetRealY(edge, edge.positionY);
        edge = edge.orderNext;
    }

};

AutoRouterEdgeList.prototype._positionAllLoadX = function () {
    var edge = this.orderFirst,
        pts;
    while (edge) {
        pts = this._positionGetRealX(edge);
        edge.positionX1 = pts[0];
        edge.positionX2 = pts[1];

        edge = edge.orderNext;
    }
};

AutoRouterEdgeList.prototype._initOrder = function () {
    this.orderFirst = null;
    this.orderLast = null;
};

AutoRouterEdgeList.prototype._checkOrder = function () {
    assert(this.orderFirst === null && this.orderLast === null,
        'AREdgeList.checkOrder: this.orderFirst === null && this.orderLast === null FAILED');
};

//---Order

AutoRouterEdgeList.prototype.insertBefore = function (edge, before) {
    assert(edge !== null && before !== null && edge !== before,
        'AREdgeList.insertBefore: edge !== null && before !== null && edge !== before FAILED');
    assert(edge.orderNext === null && edge.orderPrev === null,
        'AREdgeList.insertBefore: edge.orderNext === null && edge.orderPrev === null FAILED');

    edge.orderPrev = before.orderPrev;
    edge.orderNext = before;

    if (before.orderPrev) {
        assert(before.orderPrev.orderNext === before,
            'AREdgeList.insertBefore: before.orderPrev.orderNext === before FAILED\nbefore.orderPrev.orderNext ' +
            'is ' + before.orderPrev.orderNext + ' and before is ' + before);

        before.orderPrev.orderNext = edge;

        assert(this.orderFirst !== before,
            'AREdgeList.insertBefore: this.orderFirst !== before FAILED');
    } else {

        assert(this.orderFirst === before,
            'AREdgeList.insertBefore: this.orderFirst === before FAILED');
        this.orderFirst = edge;
    }

    before.orderPrev = edge;
};

AutoRouterEdgeList.prototype.insertAfter = function (edge, after) {
    assert(edge !== null && after !== null && !edge.equals(after),
        'AREdgeList.insertAfter:  edge !== null && after !== null && !edge.equals(after) FAILED');
    assert(edge.orderNext === null && edge.orderPrev === null,
        'AREdgeList.insertAfter: edge.orderNext === null && edge.orderPrev === null FAILED ');

    edge.orderNext = after.orderNext;
    edge.orderPrev = after;

    if (after.orderNext) {
        assert(after.orderNext.orderPrev.equals(after),
            'AREdgeList.insertAfter:  after.orderNext.orderPrev.equals(after) FAILED');
        after.orderNext.orderPrev = edge;

        assert(!this.orderLast.equals(after), 'AREdgeList.insertAfter: !orderLast.equals(after) FAILED');
    } else {
        assert(this.orderLast.equals(after), 'AREdgeList.insertAfter: this.orderLast.equals(after) FAILED');
        this.orderLast = edge;
    }

    after.orderNext = edge;
};

AutoRouterEdgeList.prototype.insertLast = function (edge) {
    assert(edge !== null,
        'AREdgeList.insertLast: edge !== null FAILED');
    assert(edge.orderPrev === null && edge.orderNext === null,
        'AREdgeList.insertLast: edge.orderPrev === null && edge.orderNext === null FAILED');

    edge.orderPrev = this.orderLast;

    if (this.orderLast) {
        assert(this.orderLast.orderNext === null,
            'AREdgeList.insertLast: this.orderLast.orderNext === null FAILED');
        assert(this.orderFirst !== null,
            'AREdgeList.insertLast: this.orderFirst != null FAILED');

        this.orderLast.orderNext = edge;
        this.orderLast = edge;
    } else {
        assert(this.orderFirst === null,
            'AREdgeList.insertLast:  this.orderFirst === null FAILED');

        this.orderFirst = edge;
        this.orderLast = edge;
    }
};

AutoRouterEdgeList.prototype.insert = function (edge) {
    assert(edge !== null,
        'AREdgeList.insert:  edge !== null FAILED');
    assert(edge.orderPrev === null && edge.orderNext === null,
        'AREdgeList.insert: edge.orderPrev === null && edge.orderNext === null FAILED');

    var y = edge.positionY;

    assert(CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD,
        'AREdgeList.insert: CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD FAILED (y is ' + y + ')');

    var insert = this.orderFirst;

    while (insert && insert.positionY < y) {
        insert = insert.orderNext;
    }

    if (insert) {
        this.insertBefore(edge, insert);
    } else {
        this.insertLast(edge);
    }
};

AutoRouterEdgeList.prototype.remove = function (edge) {
    assert(edge !== null,
        'AREdgeList.remove:  edge !== null FAILED');

    if (this.orderFirst === edge) {
        this.orderFirst = edge.orderNext;
    }

    if (edge.orderNext) {
        edge.orderNext.orderPrev = edge.orderPrev;
    }

    if (this.orderLast === edge) {
        this.orderLast = edge.orderPrev;
    }

    if (edge.orderPrev) {
        edge.orderPrev.orderNext = edge.orderNext;
    }

    edge.orderNext = null;
    edge.orderPrev = null;
};

//-- Private

AutoRouterEdgeList.prototype._slideButNotPassEdges = function (edge, y) {
    assert(edge !== null, 'AREdgeList.slideButNotPassEdges: edge != null FAILED');
    assert(CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD,
        'AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD FAILED');

    var oldy = edge.positionY;
    assert(CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD,
        'AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD FAILED');

    if (oldy === y) {
        return null;
    }

    var x1 = edge.positionX1,
        x2 = edge.positionX2,
        ret = null,
        insert = edge;

    //If we are trying to slide down

    if (oldy < y) {
        while (insert.orderNext) {
            insert = insert.orderNext;

            if (y < insert.positionY) {
                //Then we won't be shifting past the new edge (insert)
                break;
            }

            //If you can't pass the edge (but want to) and the lines will overlap x values...
            if (!insert.getEdgeCanpassed() && Utils.intersect(x1, x2, insert.positionX1, insert.positionX2)) {
                ret = insert;
                y = insert.positionY;
                break;
            }
        }

        if (edge !== insert && insert.orderPrev !== edge) {
            this.remove(edge);
            this.insertBefore(edge, insert);
        }

    } else { // If we are trying to slide up
        while (insert.orderPrev) {
            insert = insert.orderPrev;

            if (y > insert.positionY) {
                break;
            }

            //If insert cannot be passed and it is in the way of the edge (if the edge were to slide up).
            if (!insert.getEdgeCanpassed() && Utils.intersect(x1, x2, insert.positionX1, insert.positionX2)) {
                ret = insert;
                y = insert.positionY;
                break;
            }
        }

        if (edge !== insert && insert.orderNext !== edge) {
            this.remove(edge);//This is where I believe the error could lie!
            this.insertAfter(edge, insert);
        }

    }

    edge.positionY = y;

    return ret;
};

//------Section

// private

AutoRouterEdgeList.prototype._initSection = function () {
    this.sectionFirst = null;
    this.sectionBlocker = null;
    this.sectionPtr2Blocked = null;
};

AutoRouterEdgeList.prototype.checkSection = function () {
    if (!(this.sectionBlocker === null && this.sectionPtr2Blocked === null)) {
        // This used to be contained in an assert.
        // Generally this fails when the router does not have a clean exit then is asked to reroute.
        this._logger.warn('sectionBlocker and this.sectionPtr2Blocked are not null. ' +
        'Assuming last run did not exit cleanly. Fixing...');
        this.sectionBlocker = null;
        this.sectionPtr2Blocked = null;
    }
};

AutoRouterEdgeList.prototype.sectionReset = function () {
    this.checkSection();

    this.sectionFirst = null;
};

/**
 * Initialize the section data structure.
 *
 * @param blocker
 * @return {undefined}
 */
AutoRouterEdgeList.prototype._sectionBeginScan = function (blocker) {
    this.checkSection();

    this.sectionBlocker = blocker;

    this.sectionBlocker.sectionX1 = this.sectionBlocker.positionX1;
    this.sectionBlocker.sectionX2 = this.sectionBlocker.positionX2;

    this.sectionBlocker.setSectionNext(null);
    this.sectionBlocker.setSectionDown(null);
};

AutoRouterEdgeList.prototype._sectionIsImmediate = function () {
    assert(this.sectionBlocker !== null && this.sectionPtr2Blocked !== null && this.sectionPtr2Blocked !== null,
        'AREdgeList._sectionIsImmediate: this.sectionBlocker != null && this.sectionPtr2Blocked != null ' +
        '&& *sectionPtr2Blocked != null FAILED');

    var sectionBlocked = this.sectionPtr2Blocked[0],
        e = sectionBlocked.getSectionDown(),
        a1 = sectionBlocked.sectionX1,
        a2 = sectionBlocked.sectionX2,
        p1 = sectionBlocked.positionX1,
        p2 = sectionBlocked.positionX2,
        b1 = this.sectionBlocker.sectionX1,
        b2 = this.sectionBlocker.sectionX2;

    if (e !== null) {
        e = (e.startpoint === null || e.sectionX1 === undefined ? null : e);
    }

    assert(b1 <= a2 && a1 <= b2,
        'AREdgeList._sectionIsImmediate: b1 <= a2 && a1 <= b2 FAILED');                     // not case 1 or 6

    // NOTE WE CHANGED THE CONDITIONS (A1<=B1 AND B2<=A2)
    // BECAUSE HERE WE NEED THIS!

    if (a1 <= b1) {
        while (!(e === null || e.startpoint === null) && e.sectionX2 < b1) {
            e = e.getSectionNext();
        }

        if (b2 <= a2) {
            return (e === null || e.startpoint === null) || b2 < e.sectionX1;               // case 3
        }

        return (e === null || e.startpoint === null) && a2 === p2;                          // case 2
    }

    if (b2 <= a2) {
        return a1 === p1 && ((e === null || e.startpoint === null) || b2 < e.sectionX1);    // case 5
    }

    return (e === null || e.startpoint === null) && a1 === p1 && a2 === p2;                 // case 4
};


// The following methods are convenience methods for adjusting the 'section' 
// of an edge.
/**
 * Get either min+1 or a value between min and max. Technically,
 * we are looking for [min, max).
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number} result
 */
var getLargerEndpoint = function (min, max) {
    var result;
    assert(min < max);

    result = Math.min(min + 1, (min + max) / 2);
    if (result === max) {
        result = min;
    }
    assert(result < max);
    return result;
};

/**
 * Get either max-1 or a value between min and max. Technically,
 * we are looking for (min, max].
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number} result
 */
var getSmallerEndpoint = function (min, max) {
    var result;
    assert(min < max);

    // If min is so small that 
    // 
    //      (min+max)/2 === min
    //
    // then we will simply use max value for the result
    result = Math.max(max - 1, (min + max) / 2);
    if (result === min) {
        result = max;
    }

    assert(result > min);
    return result;
};

AutoRouterEdgeList.prototype._sectionHasBlockedEdge = function () {
    assert(this.sectionBlocker !== null,
        'AREdgeList._sectionHasBlockedEdge: this.sectionBlocker != null FAILED');

    var newSectionX1,
        newSectionX2,
        e,
        blockerX1 = this.sectionBlocker.sectionX1,
        blockerX2 = this.sectionBlocker.sectionX2;

    assert(blockerX1 <= blockerX2,
        'AREdgeList._sectionHasBlockedEdge: blockerX1 <= blockerX2 FAILED');

    // Setting this.sectionPtr2Blocked
    if (this.sectionPtr2Blocked === null) {  // initialize sectionPtr2Blocked

        this.sectionFirst = this.sectionFirst === null ? [new AutoRouterEdge()] : this.sectionFirst;
        this.sectionPtr2Blocked = this.sectionFirst;
    } else {   // get next sectionPtr2Blocked
        var currentEdge = this.sectionPtr2Blocked[0];

        assert(currentEdge.startpoint !== null,
            'AREdgeList._sectionHasBlockedEdge: currentEdge.startpoint === null');

        var o = null;

        e = currentEdge.getSectionDownPtr()[0];
        newSectionX1 = currentEdge.sectionX1;
        newSectionX2 = currentEdge.sectionX2;

        assert(newSectionX1 <= newSectionX2,
            'AREdgeList._sectionHasBlockedEdge: newSectionX1 <= newSectionX2 FAILED (' + newSectionX1 +
            ' <= ' + newSectionX2 + ')' + '\nedge is ');

        assert(blockerX1 <= newSectionX2 && newSectionX1 <= blockerX2,
            'AREdgeList._sectionHasBlockedEdge: blockerX1 <= newSectionX2 &&  newSectionX1 <= blockerX2 FAILED');
        // not case 1 or 6
        if (newSectionX1 < blockerX1 && blockerX2 < newSectionX2) {                                 // case 3
            this.sectionPtr2Blocked = currentEdge.getSectionDownPtr();

        } else if (blockerX1 <= newSectionX1 && newSectionX2 <= blockerX2) {                        // case 4

            if (e && e.startpoint !== null) {
                while (e.getSectionNext() && e.getSectionNext().startpoint !== null) {
                    e = e.getSectionNext();
                }

                e.setSectionNext(currentEdge.getSectionNext());
                this.sectionPtr2Blocked[0] = currentEdge.getSectionDown();
            } else {

                this.sectionPtr2Blocked[0] = (currentEdge.getSectionNext());

            }
        } else if (blockerX1 <= newSectionX1 && blockerX2 < newSectionX2) {                         // case 5

            assert(newSectionX1 <= blockerX2,
                'AREdgeList._sectionHasBlockedEdge: newSectionX1 <= blockerX2 FAILED');

            // Move newSectionX1 such that blockerX2 < newSectionX1 < newSectionX2
            newSectionX1 = getLargerEndpoint(blockerX2, newSectionX2);

            while ((e && e.startpoint !== null) && e.sectionX1 <= newSectionX1) {
                assert(e.sectionX1 <= e.sectionX2,
                    'AREdgeList._sectionHasBlockedEdge: e.sectionX1 <= e.sectionX2 FAILED');

                if (newSectionX1 <= e.sectionX2) {
                    newSectionX1 = getLargerEndpoint(e.sectionX2, newSectionX2);
                }

                o = e;
                e = e.getSectionNext();
            }

            if (o) {
                // Insert currentEdge to be sectionNext of the given edge in the list 
                // of sectionDown (basically, collapsing currentEdge into the sectionDown 
                // list. The values in the list following currentEdge will then be set to 
                // be sectionDown of the currentEdge.)
                this.sectionPtr2Blocked[0] = currentEdge.getSectionDownPtr()[0];
                o.setSectionNext(currentEdge);
                currentEdge.setSectionDown(e);
            }

            assert(blockerX2 < newSectionX1,
                'AREdgeList._sectionHasBlockedEdge: blockerX2 < newSectionX1 FAILED (' +
                blockerX2 + ' < ' + newSectionX1 + ') ' +
                currentEdge.sectionX2 + ' is ' + newSectionX2 + ')');
            // Shifting the front of the p2b so it no longer overlaps this.sectionBlocker

            currentEdge.sectionX1 = newSectionX1;

            assert(currentEdge.sectionX1 < currentEdge.sectionX2,
                'currentEdge.sectionX1 < currentEdge.sectionX2 (' +
                currentEdge.sectionX1 + ' < ' + currentEdge.sectionX2 + ')');
        } else {                                                                                        // case 2
            assert(newSectionX1 < blockerX1 && blockerX1 <= newSectionX2 && newSectionX2 <= blockerX2,
                'AREdgeList._sectionHasBlockedEdge:  newSectionX1 < blockerX1 && blockerX1 <= newSectionX2 && ' +
                'newSectionX2 <= blockerX2 FAILED');

            this.sectionPtr2Blocked = currentEdge.getSectionDownPtr();

            while (e && e.startpoint !== null) {
                o = e;
                e = e.getSectionNext();

                if (o.sectionX2 + 1 < blockerX1 && (e === null || e.startpoint === null ||
                    o.sectionX2 + 1 < e.sectionX1)) {

                    this.sectionPtr2Blocked = o.getSectionNextPtr();
                }
            }

            if (this.sectionPtr2Blocked[0].startpoint !== null) {
                assert(o !== null,
                    'AREdgeList._sectionHasBlockedEdge: o != null FAILED');
                o.setSectionNext(currentEdge.getSectionNext());

                var larger = blockerX1;

                if (this.sectionPtr2Blocked[0].sectionX1 < blockerX1) {
                    larger = this.sectionPtr2Blocked[0].sectionX1;
                }

                currentEdge.sectionX2 = getSmallerEndpoint(newSectionX1, larger);

                currentEdge.setSectionNext(this.sectionPtr2Blocked[0]);
                this.sectionPtr2Blocked[0] = new AutoRouterEdge(); //This seems odd
                this.sectionPtr2Blocked = null;

            } else {
                currentEdge.sectionX2 = getSmallerEndpoint(newSectionX1, blockerX1);
            }

            assert(currentEdge.sectionX1 < currentEdge.sectionX2,
                'Expected sectionX1 < sectionX2 but ' + currentEdge.sectionX1 +
                ' is not < ' + currentEdge.sectionX2);

            this.sectionPtr2Blocked = currentEdge.getSectionNextPtr();
        }
    }

    assert(this.sectionPtr2Blocked !== null,
        'AREdgeList._sectionHasBlockedEdge: this.sectionPtr2Blocked != null FAILED');
    while (this.sectionPtr2Blocked[0] !== null && this.sectionPtr2Blocked[0].startpoint !== null) {
        newSectionX1 = this.sectionPtr2Blocked[0].sectionX1;
        newSectionX2 = this.sectionPtr2Blocked[0].sectionX2;

        if (newSectionX2 < blockerX1) {                                                 // case 1
            //If this.sectionPtr2Blocked is completely to the left (or above) this.sectionBlocker
            this.sectionPtr2Blocked = this.sectionPtr2Blocked[0].getSectionNextPtr();

            assert(this.sectionPtr2Blocked !== null,
                'AREdgeList._sectionHasBlockedEdge: this.sectionPtr2Blocked != null FAILED');
            continue;
        } else if (blockerX2 < newSectionX1) {                                        // case 6
            //If this.sectionBlocker is completely to the right (or below) this.sectionPtr2Blocked
            break;
        }

        if (newSectionX1 < blockerX1 && blockerX2 < newSectionX2) {                     // case 3
            //If this.sectionPtr2Blocked starts before and ends after this.sectionBlocker
            var x = blockerX1;
            e = this.sectionPtr2Blocked[0].getSectionDown();

            for (; ;) {

                if (e === null || e.startpoint === null || x < e.sectionX1) {
                    return true;
                } else if (x <= e.sectionX2) {
                    x = e.sectionX2 + 1;
                    if (blockerX2 < x) {
                        break;
                    }
                }

                e = e.getSectionNext();
            }

            this.sectionPtr2Blocked = this.sectionPtr2Blocked[0].getSectionDownPtr();
            continue;
        }
        // This leaves the regular partial overlap possibility.
        // They also include this.sectionBlocker starting before and ending after this.sectionPtr2Blocked.

        return true;
    }

    assert(this.sectionBlocker.getSectionNext() === null &&
        (this.sectionBlocker.getSectionDown() === null ||
        this.sectionBlocker.getSectionDown().startpoint === null),
        'AREdgeList._sectionHasBlockedEdge: this.sectionBlocker.getSectionNext() === null &&' +
        'this.sectionBlocker.getSectionDown() === null FAILED');

    this.sectionBlocker.setSectionNext(this.sectionPtr2Blocked[0]);

    // Set anything pointing to this.sectionPtr2Blocked to point to this.sectionBlocker (eg, sectionDown)
    this.sectionPtr2Blocked[0] = this.sectionBlocker;

    this.sectionBlocker = null;
    this.sectionPtr2Blocked = null;

    return false;
};

AutoRouterEdgeList.prototype._sectionGetBlockedEdge = function () {
    assert(this.sectionBlocker !== null && this.sectionPtr2Blocked !== null,
        'AREdgeList.sectionGetBlockedEdge: this.sectionBlocker !== null && ' +
        'this.sectionPtr2Blocked !== null FAILED');

    return this.sectionPtr2Blocked[0];
};

//----Bracket

AutoRouterEdgeList.prototype._bracketIsClosing = function (edge) {
    assert(edge !== null, 'AREdgeList._bracketIsClosing: edge !== null FAILED');
    assert(!edge.isStartPointNull() && !edge.isEndPointNull(),
        'AREdgeList._bracketIsClosing: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

    var start = edge.startpoint,
        end = edge.endpoint;

    if (edge.isStartPointPrevNull() || edge.isEndPointNextNull()) {
        return false;
    }

    return this.ishorizontal ?
        (edge.startpointPrev.y < start.y && edge.endpointNext.y < end.y ) :
        (edge.startpointPrev.x < start.x && edge.endpointNext.x < end.x );
};

AutoRouterEdgeList.prototype._bracketIsOpening = function (edge) {
    assert(edge !== null, 'AREdgeList._bracketIsOpening: edge !== null FAILED');
    assert(!edge.isStartPointNull() && !edge.isEndPointNull(),
        'AREdgeList._bracketIsOpening: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

    var start = edge.startpoint || edge.startpoint,
        end = edge.endpoint || edge.endpoint,
        prev,
        next;

    if (edge.isStartPointPrevNull() || edge.isEndPointNextNull()) {
        return false;
    }

    next = edge.endpointNext || edge.endpointNext;
    prev = edge.startpointPrev || edge.startpointPrev;

    return this.ishorizontal ?
        (prev.y > start.y && next.y > end.y ) :
        (prev.x > start.x && next.x > end.x );
};

AutoRouterEdgeList.prototype._bracketShouldBeSwitched = function (edge, next) {
    assert(edge !== null && next !== null,
        'AREdgeList._bracketShouldBeSwitched: edge !== null && next !== null FAILED');

    var ex = this._positionGetRealX(edge),
        ex1 = ex[0],
        ex2 = ex[1],
        eo = this._positionGetRealO(edge),
        eo1 = eo[0],
        eo2 = eo[1],
        nx = this._positionGetRealX(next),
        nx1 = nx[0],
        nx2 = nx[1],
        no = this._positionGetRealO(next),
        no1 = no[0],
        no2 = no[1];

    var c1, c2;

    if ((nx1 < ex1 && ex1 < nx2 && eo1 > 0 ) || (ex1 < nx1 && nx1 < ex2 && no1 < 0)) {
        c1 = +1;
    } else if (ex1 === nx1 && eo1 === 0 && no1 === 0) {
        c1 = 0;
    } else {
        c1 = -9;
    }

    if ((nx1 < ex2 && ex2 < nx2 && eo2 > 0 ) || (ex1 < nx2 && nx2 < ex2 && no2 < 0)) {
        c2 = +1;
    } else if (ex2 === nx2 && eo2 === 0 && no2 === 0) {
        c2 = 0;
    } else {
        c2 = -9;
    }

    return (c1 + c2) > 0;
};

//---Block

AutoRouterEdgeList.prototype._blockGetF = function (d, b, s) {
    var f = d / (b + s), //f is the total distance between edges divided by the total number of edges
        S = CONSTANTS.EDLS_S, //This is 'SMALLGAP'
        R = CONSTANTS.EDLS_R,//This is 'SMALLGAP + 1'
        D = CONSTANTS.EDLS_D; //This is the total distance of the graph

    //If f is greater than the SMALLGAP, then make some checks/edits
    if (b === 0 && R <= f) {
        // If every comparison resulted in an overlap AND SMALLGAP + 1 is less than
        // the distance between each edge (in the given range).
        f += (D - R);
    } else if (S < f && s > 0) {
        f = ((D - S) * d - S * (D - R) * s) / ((D - S) * b + (R - S) * s);
    }

    return f;
};

AutoRouterEdgeList.prototype._blockGetG = function (d, b, s) {
    var g = d / (b + s),
        S = CONSTANTS.EDLS_S,
        R = CONSTANTS.EDLS_R,
        D = CONSTANTS.EDLS_D;

    if (S < g && b > 0) {
        g = ((R - S) * d + S * (D - R) * b) / ((D - S) * b + (R - S) * s);
    }

    return g;
};

AutoRouterEdgeList.prototype._blockPushBackward = function (blocked, blocker) {
    var modified = false;

    assert(blocked !== null && blocker !== null,
        'AREdgeList._blockPushBackward: blocked !== null && blocker !== null FAILED');
    assert(blocked.positionY <= blocker.positionY,
        'AREdgeList._blockPushBackward: blocked.positionY <= blocker.positionY FAILED');
    assert(blocked.getBlockPrev() !== null,
        'AREdgeList._blockPushBackward: blocked.getBlockPrev() !== null FAILED');

    var f = 0,
        g = 0,
        edge = blocked,
        trace = blocker,
        d = trace.positionY - edge.positionY;

    assert(d >= 0,
        'AREdgeList._blockPushBackward: d >= 0 FAILED');

    var s = (edge.bracketOpening || trace.bracketClosing),
        b = 1 - s,
        d2;

    for (; ;) {
        edge.setBlockTrace(trace);
        trace = edge;
        edge = edge.getBlockPrev();

        if (edge === null) {
            break;
        }

        d2 = trace.positionY - edge.positionY;
        assert(d2 >= 0,
            'AREdgeList._blockPushBackward:  d2 >= 0 FAILED');

        if (edge.bracketOpening || trace.bracketClosing) {
            g = this._blockGetG(d, b, s);
            if (d2 <= g) {
                f = this._blockGetF(d, b, s);
                break;
            }
            s++;
        } else {
            f = this._blockGetF(d, b, s);
            if (d2 <= f) {
                g = this._blockGetG(d, b, s);
                break;
            }
            b++;
        }

        d += d2;
    }

    if (b + s > 1) {
        if (edge === null) {
            f = this._blockGetF(d, b, s);
            g = this._blockGetG(d, b, s);
        }

        assert(Utils.floatEquals(d, f * b + g * s),
            'AREdgeList._blockPushBackward: floatEquals(d, f*b + g*s) FAILED');

        edge = trace;
        assert(edge !== null && edge !== blocked,
            'AREdgeList._blockPushBackward: edge !== null && edge !== blocked FAILED');

        var y = edge.positionY;

        do {
            assert(edge !== null && edge.getBlockTrace() !== null,
                'AREdgeList._blockPushBackward: edge !== null && edge.getBlockTrace() !== null FAILED');

            trace = edge.getBlockTrace();

            y += (edge.bracketOpening || trace.bracketClosing) ? g : f;
            y = Utils.roundTrunc(y, 10);  // Fix any floating point errors

            if (y + 0.001 < trace.positionY) {
                modified = true;
                if (this._slideButNotPassEdges(trace, y)) {
                    trace.setBlockPrev(null);
                }
            }

            edge = trace;
        } while (edge !== blocked);

        if (CONSTANTS.DEBUG) {
            //y += (edge.bracketOpening || blocker.bracketClosing) ? g : f;
            assert(Utils.floatEquals(y, blocker.positionY),
                'AREdgeList._blockPushBackward: floatEquals(y, blocker.positionY) FAILED');
        }
    }

    return modified;
};

AutoRouterEdgeList.prototype._blockPushForward = function (blocked, blocker) {
    var modified = false;

    assert(blocked !== null && blocker !== null,
        'AREdgeList._blockPushForward: blocked !== null && blocker !== null FAILED');
    assert(blocked.positionY >= blocker.positionY,
        'AREdgeList._blockPushForward: blocked.positionY >= blocker.positionY FAILED');
    assert(blocked.getBlockNext() !== null,
        'AREdgeList._blockPushForward: blocked.getBlockNext() !== null FAILED');

    var f = 0,
        g = 0,
        edge = blocked,
        trace = blocker,
        d = edge.positionY - trace.positionY;

    assert(d >= 0,
        'AREdgeList._blockPushForward:  d >= 0 FAILED');

    var s = (trace.bracketOpening || edge.bracketClosing),
        b = 1 - s,
        d2;

    for (; ;) {
        edge.setBlockTrace(trace);
        trace = edge;
        edge = edge.getBlockNext();

        if (edge === null) {
            break;
        }

        d2 = edge.positionY - trace.positionY;
        assert(d2 >= 0,
            'AREdgeList._blockPushForward: d2 >= 0 FAILED');

        if (trace.bracketOpening || edge.bracketClosing) {
            g = this._blockGetG(d, b, s);
            if (d2 <= g) {
                f = this._blockGetF(d, b, s);
                break;
            }
            s++;
        } else {
            f = this._blockGetF(d, b, s);
            if (d2 <= f) {
                g = this._blockGetG(d, b, s);
                break;
            }
            b++;
        }

        d += d2;
    }

    if (b + s > 1) { //Looking at more than one edge (or edge/trace comparison) {
        if (edge === null) {
            f = this._blockGetF(d, b, s);
            g = this._blockGetG(d, b, s);
        }

        assert(Utils.floatEquals(d, f * b + g * s),
            'AREdgeList._blockPushForward: floatEquals(d, f*b + g*s) FAILED');

        edge = trace;
        assert(edge !== null && !edge.equals(blocked),
            'AREdgeList._blockPushForward: edge != null && !edge.equals(blocked) FAILED');

        var y = edge.positionY;

        do {
            assert(edge !== null && edge.getBlockTrace() !== null,
                'AREdgeList._blockPushForward: edge !== null && edge.getBlockTrace() !== null FAILED');
            trace = edge.getBlockTrace();

            y -= (trace.bracketOpening || edge.bracketClosing) ? g : f;

            if (trace.positionY < y - 0.001) {
                modified = true;

                if (this._slideButNotPassEdges(trace, y)) {
                    trace.setBlockNext(null);
                }
            }

            edge = trace;
        } while (edge !== blocked);
    }


    return modified;
};

AutoRouterEdgeList.prototype.blockScanForward = function () {
    this._positionAllLoadX();

    var modified = false;

    this.sectionReset();

    var blocker = this.orderFirst,
        blocked,
        bmin,
        smin,
        bMinF,
        sMinF;

    while (blocker) {
        bmin = null; //block min?
        smin = null; //section min?
        bMinF = CONSTANTS.ED_MINCOORD - 1;
        sMinF = CONSTANTS.ED_MINCOORD - 1;

        this._sectionBeginScan(blocker);
        while (this._sectionHasBlockedEdge()) {
            if (this._sectionIsImmediate()) {
                blocked = this._sectionGetBlockedEdge();
                assert(blocked !== null,
                    'AREdgeList._blockPushForward: blocked !== null FAILED');

                if (blocked.getBlockPrev() !== null) {
                    modified = this._blockPushBackward(blocked, blocker) || modified;
                }

                if (!blocker.edgeFixed) {
                    if (blocked.bracketOpening || blocker.bracketClosing) {
                        if (sMinF < blocked.positionY) {
                            sMinF = blocked.positionY;
                            smin = blocked;
                        }
                    } else {
                        if (bMinF < blocked.positionY) {
                            bMinF = blocked.positionY;
                            bmin = blocked;
                        }
                    }
                }
            }

        }

        if (bmin) {
            if (smin) {
                blocker.setClosestPrev(sMinF > bMinF ? smin : bmin);

                bMinF = blocker.positionY - bMinF;
                sMinF = this._blockGetF(blocker.positionY - sMinF, 0, 1);

                blocker.setBlockPrev(sMinF < bMinF ? smin : bmin);
            } else {
                blocker.setBlockPrev(bmin);
                blocker.setClosestPrev(bmin);
            }
        } else {
            blocker.setBlockPrev(smin);
            blocker.setClosestPrev(smin);
        }


        blocker = blocker.orderNext;
    }

    this._positionAllStoreY();

    return modified;
};

AutoRouterEdgeList.prototype.blockScanBackward = function () {
    this._positionAllLoadX();

    var modified = false;

    this.sectionReset();
    var blocker = this.orderLast,
        blocked,
        bmin,
        smin,
        bMinF,
        sMinF;

    while (blocker) {
        bmin = null;
        smin = null;
        bMinF = CONSTANTS.ED_MAXCOORD + 1;
        sMinF = CONSTANTS.ED_MAXCOORD + 1;

        this._sectionBeginScan(blocker);

        while (this._sectionHasBlockedEdge()) {
            if (this._sectionIsImmediate()) {
                blocked = this._sectionGetBlockedEdge();

                assert(blocked !== null,
                    'AREdgeList.blockScanBackward: blocked !== null FAILED');

                if (blocked.getBlockNext() !== null) {
                    modified = this._blockPushForward(blocked, blocker) || modified;
                }

                if (!blocker.edgeFixed) {
                    if (blocker.bracketOpening || blocked.bracketClosing) {
                        if (sMinF > blocked.positionY) {
                            sMinF = blocked.positionY;
                            smin = blocked;
                        }
                    } else {
                        if (bMinF > blocked.positionY) {
                            bMinF = blocked.positionY;
                            bmin = blocked;
                        }
                    }
                }
            }
        }

        if (bmin) {
            if (smin) {
                blocker.setClosestNext(sMinF < bMinF ? smin : bmin);

                bMinF = bMinF - blocker.positionY;
                sMinF = this._blockGetF(sMinF - blocker.positionY, 0, 1);

                blocker.setBlockNext(sMinF < bMinF ? smin : bmin);
            } else {
                blocker.setBlockNext(bmin);
                blocker.setClosestNext(bmin);
            }
        } else {
            blocker.setBlockNext(smin);
            blocker.setClosestNext(smin);
        }

        blocker = blocker.orderPrev;
    }

    this._positionAllStoreY();

    return modified;
};

AutoRouterEdgeList.prototype.blockSwitchWrongs = function () {
    var was = false;

    this._positionAllLoadX();
    var second = this.orderFirst,
        edge,
        next,
        ey,
        ny,
        a;

    while (second !== null) {
        //Check if it references itself
        if (second.getClosestPrev() !== null && second.getClosestPrev().getClosestNext() !== (second) &&
            second.getClosestNext() !== null && second.getClosestNext().getClosestPrev() === (second)) {

            assert(!second.edgeFixed,
                'AREdgeList.blockSwitchWrongs: !second.edgeFixed FAILED');

            edge = second;
            next = edge.getClosestNext();

            while (next !== null && edge === next.getClosestPrev()) {
                assert(edge !== null && !edge.edgeFixed,
                    'AREdgeList.blockSwitchWrongs: edge != null && !edge.edgeFixed FAILED');
                assert(next !== null && !next.edgeFixed,
                    'AREdgeList.blockSwitchWrongs: next != null && !next.edgeFixed FAILED');

                ey = edge.positionY;
                ny = next.positionY;

                assert(ey <= ny,
                    'AREdgeList.blockSwitchWrongs: ey <= ny FAILED');

                if (ey + 1 <= ny && this._bracketShouldBeSwitched(edge, next)) {
                    was = true;

                    assert(!edge.getEdgeCanpassed() && !next.getEdgeCanpassed(),
                        'AREdgeList.blockSwitchWrongs: !edge.getEdgeCanpassed() && ' +
                        '!next.getEdgeCanpassed() FAILED');
                    edge.setEdgeCanpassed(true);
                    next.setEdgeCanpassed(true);

                    a = this._slideButNotPassEdges(edge, (ny + ey) / 2 + 0.001) !== null;
                    a = this._slideButNotPassEdges(next, (ny + ey) / 2 - 0.001) !== null || a;

                    if (a) {
                        edge.setClosestPrev(null);
                        edge.setClosestNext(null);
                        next.setClosestPrev(null);
                        next.setClosestNext(null);

                        edge.setEdgeCanpassed(false);
                        next.setEdgeCanpassed(false);
                        break;
                    }

                    if (edge.getClosestPrev() !== null && edge.getClosestPrev().getClosestNext() === edge) {
                        edge.getClosestPrev().setClosestNext(next);
                    }

                    if (next.getClosestNext() !== null && next.getClosestNext().getClosestPrev() === next) {
                        next.getClosestNext().setClosestPrev(edge);
                    }

                    edge.setClosestNext(next.getClosestNext());
                    next.setClosestNext(edge);
                    next.setClosestPrev(edge.getClosestPrev());
                    edge.setClosestPrev(next);

                    edge.setEdgeCanpassed(false);
                    next.setEdgeCanpassed(false);

                    assert(!this._bracketShouldBeSwitched(next, edge),
                        'AREdgeList.blockSwitchWrongs: !bracketShouldBeSwitched(next, edge) FAILED');

                    if (next.getClosestPrev() !== null && next.getClosestPrev().getClosestNext() === next) {
                        edge = next.getClosestPrev();
                    } else {
                        next = edge.getClosestNext();
                    }
                } else {
                    edge = next;
                    next = next.getClosestNext();
                }
            }
        }

        second = second.orderNext;
    }

    if (was) {
        this._positionAllStoreY();
    }

    return was;
};

AutoRouterEdgeList.prototype.assertValid = function () {
    // Check that all edges have start/end points
    var edge = this.orderFirst;
    while (edge) {
        assert(edge.startpoint.x !== undefined, 'Edge has unrecognized startpoint: ' + edge.startpoint);
        assert(edge.endpoint.x !== undefined, 'Edge has unrecognized endpoint: ' + edge.endpoint);
        edge = edge.orderNext;
    }
};

module.exports = AutoRouterEdgeList;

},{"./AutoRouter.Box":10,"./AutoRouter.Constants":11,"./AutoRouter.Edge":12,"./AutoRouter.Logger":15,"./AutoRouter.Path":16,"./AutoRouter.Port":19,"./AutoRouter.Utils":22,"assert":1}],14:[function(require,module,exports){
/*globals define, WebGMEGlobal*/
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var Logger = require('./AutoRouter.Logger'),  // FIXME
    assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point'),
    ArPointListPath = require('./AutoRouter.PointList'),
    ArRect = require('./AutoRouter.Rect'),
    AutoRouterPath = require('./AutoRouter.Path'),
    AutoRouterPort = require('./AutoRouter.Port'),
    AutoRouterBox = require('./AutoRouter.Box'),
    AutoRouterEdge = require('./AutoRouter.Edge'),
    AutoRouterEdgeList = require('./AutoRouter.EdgeList');

var _logger = new Logger('AutoRouter.Graph'),
    COUNTER = 1;  // Used for unique ids

var AutoRouterGraph = function () {
    this.completelyConnected = true;  // true if all paths are connected
    this.horizontal = new AutoRouterEdgeList(true);
    this.vertical = new AutoRouterEdgeList(false);
    this.boxes = {};
    this.paths = [];
    this.bufferBoxes = [];
    this.box2bufferBox = {}; // maps boxId to corresponding bufferbox object

    this.horizontal.owner = this;
    this.vertical.owner = this;

    //Initializing selfPoints
    this.selfPoints = [
        new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MINCOORD),
        new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MINCOORD),
        new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MAXCOORD),
        new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MAXCOORD)
    ];

    this._addSelfEdges();
};

//Functions
AutoRouterGraph.prototype._deleteAllBoxes = function () {
    var ids = Object.keys(this.boxes);
    for (var i = ids.length; i--;) {
        this.boxes[ids[i]].destroy();
        delete this.boxes[ids[i]];
    }
    // Clean up the bufferBoxes
    this.bufferBoxes = [];
    this.box2bufferBox = {};
};

AutoRouterGraph.prototype._getBoxAt = function (point, nearness) {
    var ids = Object.keys(this.boxes);
    for (var i = ids.length; i--;) {
        if (this.boxes[ids[i]].isBoxAt(point, nearness)) {
            return this.boxes[ids[i]];
        }
    }

    return null;
};

AutoRouterGraph.prototype._setPortAttr = function (port, attr) {
    this._disconnectPathsFrom(port);
    port.attributes = attr;
};

AutoRouterGraph.prototype._isRectClipBoxes = function (rect) {
    var boxRect;
    var ids = Object.keys(this.boxes);
    for (var i = ids.length; i--;) {
        boxRect = this.boxes[ids[i]].rect;
        if (Utils.isRectClip(rect, boxRect)) {
            return true;
        }
    }
    return false;
};

AutoRouterGraph.prototype._isRectClipBufferBoxes = function (rect) {
    var i = this.bufferBoxes.length,
        c;

    while (i--) {
        c = this.bufferBoxes[i].children.length;

        while (c--) {
            if (Utils.isRectClip(rect, this.bufferBoxes[i].children[c])) {
                return true;
            }
        }
    }

    return false;
};

AutoRouterGraph.prototype._isLineClipBufferBoxes = function (p1, p2) {
    var rect = new ArRect(p1, p2);
    rect.normalizeRect();
    assert(rect.left === rect.right || rect.ceil === rect.floor,
        'ARGraph.this._isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED');

    if (rect.left === rect.right) {
        rect.right++;
    }
    if (rect.ceil === rect.floor) {
        rect.floor++;
    }

    return this._isRectClipBufferBoxes(rect);
};

AutoRouterGraph.prototype._isLineClipBoxes = function (p1, p2) {
    var rect = new ArRect(p1, p2);
    rect.normalizeRect();
    assert(rect.left === rect.right || rect.ceil === rect.floor,
        'ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED');

    if (rect.left === rect.right) {
        rect.right++;
    }
    if (rect.ceil === rect.floor) {
        rect.floor++;
    }

    return this._isRectClipBoxes(rect);
};

AutoRouterGraph.prototype._canBoxAt = function (rect) {
    return !this._isRectClipBoxes.inflatedRect(rect, 1);
};

AutoRouterGraph.prototype._add = function (path) {
    assert(path !== null, 'ARGraph.add: path !== null FAILED');
    assert(!path.hasOwner(), 'ARGraph.add: !path.hasOwner() FAILED');

    path.owner = this;

    this.paths.push(path);

    this.horizontal.addPathEdges(path);
    this.vertical.addPathEdges(path);

    if (CONSTANTS.DEBUG) {
        this._assertValidPath(path);
    }

};

AutoRouterGraph.prototype._deleteAllPaths = function () {
    for (var i = this.paths.length; i--;) {
        this.paths[i].destroy();  // Remove point from start/end port
    }

    this.paths = [];
};

AutoRouterGraph.prototype._hasNoPath = function () {
    return this.paths.length === 0;
};

AutoRouterGraph.prototype._getPathCount = function () {
    return this.paths.length;
};

AutoRouterGraph.prototype._getListEdgeAt = function (point, nearness) {

    var edge = this.horizontal.getEdgeAt(point, nearness);
    if (edge) {
        return edge;
    }

    return this.vertical.getEdgeAt(point, nearness);
};

AutoRouterGraph.prototype._getSurroundRect = function () {
    var rect = new ArRect(0, 0, 0, 0),
        i;

    var ids = Object.keys(this.boxes);
    for (i = ids.length; i--;) {
        rect.unionAssign(this.boxes[ids[i]].rect);
    }

    for (i = this.paths.length; i--;) {
        rect.unionAssign(this.paths[i].getSurroundRect());
    }

    return rect;
};

AutoRouterGraph.prototype._getOutOfBox = function (details) {
    var bufferObject = this.box2bufferBox[details.box.id],
        children = bufferObject.children,
        i = bufferObject.children.length,
        point = details.point,
        dir = details.dir,
        boxRect = new ArRect(details.box.rect);

    boxRect.inflateRect(CONSTANTS.BUFFER); //Create a copy of the buffer box

    assert(Utils.isRightAngle(dir), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir) FAILED');

    while (boxRect.ptInRect(point)) {
        if (Utils.isHorizontal(dir)) {
            point.x = Utils.getRectOuterCoord(boxRect, dir);
        } else {
            point.y = Utils.getRectOuterCoord(boxRect, dir);
        }

        while (i--) {
            if (children[i].ptInRect(point)) {
                boxRect = children[i];
                break;
            }
        }
        i = bufferObject.children.length;
    }

    assert(!boxRect.ptInRect(point), 'ARGraph.getOutOfBox: !boxRect.ptInRect( point) FAILED');
};

AutoRouterGraph.prototype._goToNextBufferBox = function (args) {
    var point = args.point,
        end = args.end,
        dir = args.dir,
        dir2 = args.dir2 === undefined || !Utils.isRightAngle(args.dir2) ? (end instanceof ArPoint ?
            Utils.exGetMajorDir(end.minus(point)) : CONSTANTS.DirNone) : args.dir2,
        stophere = args.end !== undefined ? args.end :
            (dir === 1 || dir === 2 ? CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD );

    if (dir2 === dir) {
        dir2 = Utils.isRightAngle(Utils.exGetMinorDir(end.minus(point))) ?
            Utils.exGetMinorDir(end.minus(point)) : (dir + 1) % 4;
    }

    if (end instanceof ArPoint) {
        stophere = Utils.getPointCoord(stophere, dir);
    }

    assert(Utils.isRightAngle(dir), 'ArGraph.goToNextBufferBox: Utils.isRightAngle (dir) FAILED');
    assert(Utils.getPointCoord(point, dir) !== stophere,
        'ArGraph.goToNextBufferBox: Utils.getPointCoord (point, dir) !== stophere FAILED');

    var boxby = null,
        i = -1,
        boxRect;
    //jscs:disable maximumLineLength
    while (++i < this.bufferBoxes.length) {
        boxRect = this.bufferBoxes[i].box;

        if (!Utils.isPointInDirFrom(point, boxRect, dir) && //Add support for entering the parent box
            Utils.isPointBetweenSides(point, boxRect, dir) &&  // if it will not put the point in a corner (relative to dir2)
            Utils.isCoordInDirFrom(stophere,
                Utils.getChildRectOuterCoordFrom(this.bufferBoxes[i], dir, point).coord, dir)) {
            //Return extreme (parent box) for this comparison
            stophere = Utils.getChildRectOuterCoordFrom(this.bufferBoxes[i], dir, point).coord;
            boxby = this.bufferBoxes[i];
        }
    }
    //jscs:enable maximumLineLength

    if (Utils.isHorizontal(dir)) {
        point.x = stophere;
    } else {
        point.y = stophere;
    }

    return boxby;
};

AutoRouterGraph.prototype._hugChildren = function (bufferObject, point, dir1, dir2, exitCondition) {
    // This method creates a path that enters the parent box and 'hugs' the children boxes
    // (remains within one pixel of them) and follows them out.
    assert((dir1 + dir2) % 2 === 1, 'ARGraph.hugChildren: One and only one direction must be horizontal');
    var children = bufferObject.children,
        parentBox = bufferObject.box,
        initPoint = new ArPoint(point),
        child = this._goToNextBox(point, dir1, (dir1 === 1 || dir1 === 2 ?
            CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD ), children),
        finalPoint,
        dir = dir2,
        nextDir = Utils.nextClockwiseDir(dir1) === dir2 ? Utils.nextClockwiseDir : Utils.prevClockwiseDir,
        points = [new ArPoint(point)],
        hasExit = true,
        nextChild,
        old;

    assert(child !== null, 'ARGraph.hugChildren: child !== null FAILED');
    exitCondition = exitCondition === undefined ? function (pt) {
        return !parentBox.ptInRect(pt);
    } : exitCondition;

    _logger.info('About to hug child boxes to find a path');
    while (hasExit && !exitCondition(point, bufferObject)) {
        old = new ArPoint(point);
        nextChild = this._goToNextBox(point, dir, Utils.getRectOuterCoord(child, dir), children);

        if (!points[points.length - 1].equals(old)) {
            points.push(new ArPoint(old)); //The points array should not contain the most recent point.
        }

        if (nextChild === null) {
            dir = Utils.reverseDir(nextDir(dir));
        } else if (Utils.isCoordInDirFrom(Utils.getRectOuterCoord(nextChild, Utils.reverseDir(nextDir(dir))),
                Utils.getPointCoord(point, Utils.reverseDir(nextDir(dir))), Utils.reverseDir(nextDir(dir)))) {
            dir = nextDir(dir);
            child = nextChild;
        }

        if (finalPoint === undefined) {
            finalPoint = new ArPoint(point);
        } else if (!finalPoint.equals(old)) {
            hasExit = !point.equals(finalPoint);
        }
    }

    if (points[0].equals(initPoint)) {
        points.splice(0, 1);
    }

    if (!hasExit) {
        points = null;
        point.assign(initPoint);
    }

    return points;

};

AutoRouterGraph.prototype._goToNextBox = function (point, dir, stop1, boxList) {
    var stophere = stop1;

    /*
     if (stop2 !== undefined) {
     if (stop2 instanceof Array) {
     boxList = stop2;
     } else {
     stophere = stop1 instanceof ArPoint ?
     chooseInDir.getPointCoord (stop1, dir), Utils.getPointCoord (stop2, dir), Utils.reverseDir (dir)) :
     chooseInDir(stop1, stop2, Utils.reverseDir (dir));
     }

     }else */
    if (stop1 instanceof ArPoint) {
        stophere = Utils.getPointCoord(stophere, dir);
    }

    assert(Utils.isRightAngle(dir), 'ArGraph.goToNextBox: Utils.isRightAngle (dir) FAILED');
    assert(Utils.getPointCoord(point, dir) !== stophere,
        'ArGraph.goToNextBox: Utils.getPointCoord (point, dir) !== stophere FAILED');

    var boxby = null,
        iter = boxList.length,
        boxRect;

    while (iter--) {
        boxRect = boxList[iter];

        if (Utils.isPointInDirFrom(point, boxRect, Utils.reverseDir(dir)) &&
            Utils.isPointBetweenSides(point, boxRect, dir) &&
            Utils.isCoordInDirFrom(stophere, Utils.getRectOuterCoord(boxRect, Utils.reverseDir(dir)), dir)) {
            stophere = Utils.getRectOuterCoord(boxRect, Utils.reverseDir(dir));
            boxby = boxList[iter];
        }
    }

    if (Utils.isHorizontal(dir)) {
        point.x = stophere;
    } else {
        point.y = stophere;
    }

    return boxby;
};

AutoRouterGraph.prototype._getLimitsOfEdge = function (startPt, endPt, min, max) {
    var t,
        start = (new ArPoint(startPt)),
        end = (new ArPoint(endPt)),
        ids = Object.keys(this.boxes),
        i,
        rect;

    if (start.y === end.y) {
        if (start.x > end.x) {
            t = start.x;
            start.x = end.x;
            end.x = t;
        }

        for (i = ids.length; i--;) {
            rect = this.boxes[ids[i]].rect;

            if (start.x < rect.right && rect.left <= end.x) {
                if (rect.floor <= start.y && rect.floor > min) {
                    min = rect.floor;
                }
                if (rect.ceil > start.y && rect.ceil < max) {
                    max = rect.ceil;
                }
            }
        }
    } else {
        assert(start.x === end.x, 'ARGraph.this.getLimitsOfEdge: start.x === end.x FAILED');

        if (start.y > end.y) {
            t = start.y;
            start.y = end.y;
            end.y = t;
        }

        for (i = ids.length; i--;) {
            rect = this.boxes[ids[i]].rect;

            if (start.y < rect.floor && rect.ceil <= end.y) {
                if (rect.right <= start.x && rect.right > min) {
                    min = rect.right;
                }
                if (rect.left > start.x && rect.left < max) {
                    max = rect.left;
                }
            }
        }
    }

    max--;

    return {min: min, max: max};
};

AutoRouterGraph.prototype._connect = function (path) {
    var startport = path.getStartPort(),
        endport = path.getEndPort(),
        startpoint = path.startpoint,
        endpoint = path.endpoint;

    assert(startport.hasPoint(startpoint), 'ARGraph.connect: startport.hasPoint(startpoint) FAILED');
    assert(endport.hasPoint(endpoint), 'ARGraph.connect: endport.hasPoint(endpoint) FAILED');

    var startRoot = startport.owner.getRootBox(),
        endRoot = endport.owner.getRootBox(),
        startId = startRoot.id,
        endId = endRoot.id,
        startdir = startport.portOnWhichEdge(startpoint),
        enddir = endport.portOnWhichEdge(endpoint);

    if (startpoint.equals(endpoint)) {
        Utils.stepOneInDir(startpoint, Utils.nextClockwiseDir(startdir));
    }

    if (!path.isAutoRouted()) {
        path.createCustomPath();
        return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);
    } else if (this.box2bufferBox[startId] === this.box2bufferBox[endId] &&
        startdir === Utils.reverseDir(enddir) && startRoot !== endRoot) {

        return this._connectPointsSharingParentBox(path, startpoint, endpoint, startdir);
    } else {

        return this._connectPathWithPoints(path, startpoint, endpoint);
    }

};

AutoRouterGraph.prototype._connectPathWithPoints = function (path, startpoint, endpoint) {
    assert(startpoint instanceof ArPoint, 'ARGraph.connect: startpoint instanceof ArPoint FAILED');
    assert(path !== null && path.owner === this, 'ARGraph.connect: path !== null && path.owner === self FAILED');
    assert(!path.isConnected(), 'ARGraph.connect: !path.isConnected() FAILED');
    assert(!startpoint.equals(endpoint), 'ARGraph.connect: !startpoint.equals(endpoint) FAILED');

    var startPort = path.getStartPort();
    assert(startPort !== null, 'ARGraph.connect: startPort !== null FAILED');

    var startdir = startPort.portOnWhichEdge(startpoint),
        endPort = path.getEndPort();

    assert(endPort !== null, 'ARGraph.connect: endPort !== null FAILED');
    var enddir = endPort.portOnWhichEdge(endpoint);
    assert(Utils.isRightAngle(startdir) && Utils.isRightAngle(enddir),
        'ARGraph.connect: Utils.isRightAngle (startdir) && Utils.isRightAngle (enddir) FAILED');

    //Find the bufferbox containing startpoint, endpoint
    var start = new ArPoint(startpoint);
    this._getOutOfBox({
        point: start,
        dir: startdir,
        end: endpoint,
        box: startPort.owner
    });
    assert(!start.equals(startpoint), 'ARGraph.connect: !start.equals(startpoint) FAILED');

    var end = new ArPoint(endpoint);
    this._getOutOfBox({
        point: end,
        dir: enddir,
        end: start,
        box: endPort.owner
    });
    assert(!end.equals(endpoint), 'ARGraph.connect: !end.equals(endpoint) FAILED');

    var points,
        isAutoRouted = path.isAutoRouted();
    if (isAutoRouted) {
        points = this._connectPoints(start, end, startdir, enddir);
    }

    path.points = points;
    path.points.unshift(startpoint);
    path.points.push(endpoint);

    if (isAutoRouted) {
        this._simplifyPathCurves(path);
        path.simplifyTrivially();
        this._simplifyPathPoints(path);
        this._centerStairsInPathPoints(path, startdir, enddir);
    }
    path.setState(CONSTANTS.PathStateConnected);

    return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);
};

AutoRouterGraph.prototype._connectPointsSharingParentBox = function (path, startpoint, endpoint, startdir) {
    // Connect points that share a parent box and face each other
    // These will not need the simplification and complicated path finding
    var start = new ArPoint(startpoint),
        dx = endpoint.x - start.x,
        dy = endpoint.y - start.y;

    path.deleteAll();

    path.addTail(startpoint);
    if (dx !== 0 && dy !== 0) {
        if (Utils.isHorizontal(startdir)) {
            start.x += dx / 2;
            path.addTail(new ArPoint(start));
            start.y += dy;
            path.addTail(new ArPoint(start));
        } else {
            start.y += dy / 2;
            path.addTail(new ArPoint(start));
            start.x += dx;
            path.addTail(new ArPoint(start));
        }
    }
    path.addTail(endpoint);

    path.setState(CONSTANTS.PathStateConnected);

    return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);

};

AutoRouterGraph.prototype._connectPoints = function (start, end, hintstartdir, hintenddir, flipped) {
    var ret = new ArPointListPath(),
        thestart = new ArPoint(start),
        bufferObject,
        box,
        rect,
        dir1,
        dir2,
        old,
        oldEnd,
        ret2,
        pts,
        rev,
        i,

    //Exit conditions
    //if there is a straight line to the end point
        findExitToEndpoint = function (pt, bo) {
            return (pt.x === end.x || pt.y === end.y) && !Utils.isLineClipRects(pt, end, bo.children);
        },  //If you pass the endpoint, you need to have a way out.

    //exitCondition is when you get to the dir1 side of the box or when you pass end
        getToDir1Side = function (pt, bo) {
            return Utils.getPointCoord(pt, dir1) === Utils.getRectOuterCoord(bo.box, dir1) ||
                ( Utils.isPointInDirFrom(pt, end, dir1));
        };


    //This is where we create the original path that we will later adjust
    while (!start.equals(end)) {

        dir1 = Utils.exGetMajorDir(end.minus(start));
        dir2 = Utils.exGetMinorDir(end.minus(start));

        assert(dir1 !== CONSTANTS.DirNone, 'ARGraph.connectPoints: dir1 !== CONSTANTS.DirNone FAILED');
        assert(dir1 === Utils.getMajorDir(end.minus(start)),
            'ARGraph.connectPoints: dir1 === Utils.getMajorDir(end.minus(start)) FAILED');
        assert(dir2 === CONSTANTS.DirNone || dir2 === Utils.getMinorDir(end.minus(start)),
            'ARGraph.connectPoints: dir2 === CONSTANTS.DirNone || ' +
            'dir2 === Utils.getMinorDir(end.minus(start)) FAILED');

        if (dir2 === hintstartdir && dir2 !== CONSTANTS.DirNone) {
            // i.e. std::swap(dir1, dir2);
            dir2 = dir1;
            dir1 = hintstartdir;
        }

        ret.push(new ArPoint(start));

        old = new ArPoint(start);

        bufferObject = this._goToNextBufferBox({
            point: start,
            dir: dir1,
            dir2: dir2,
            end: end
        });  // Modified goToNextBox (that allows entering parent buffer boxes here
        box = bufferObject === null ? null : bufferObject.box;

        //If goToNextBox does not modify start
        if (start.equals(old)) {

            assert(box !== null, 'ARGraph.connectPoints: box !== null FAILED');
            rect = box instanceof ArRect ? box : box.rect;

            if (dir2 === CONSTANTS.DirNone) {
                dir2 = Utils.nextClockwiseDir(dir1);
            }

            assert(dir1 !== dir2 && dir1 !== CONSTANTS.DirNone && dir2 !== CONSTANTS.DirNone,
                'ARGraph.connectPoints: dir1 !== dir2 && dir1 !== CONSTANTS.DirNone && dir2 !== ' +
                'CONSTANTS.DirNone FAILED');
            if (bufferObject.box.ptInRect(end) && !bufferObject.box.ptInRect(start) && flipped) {
                //Unfortunately, if parentboxes are a pixel apart, start/end can get stuck and not cross the border
                //separating them.... This is a nudge to get them to cross it.
                if (Utils.isHorizontal(dir1)) {
                    start.x = end.x;
                } else {
                    start.y = end.y;
                }
            } else if (bufferObject.box.ptInRect(end)) {
                if (!flipped) {
                    _logger.info('Could not find path from',start,'to', end,'. Flipping start and end points');
                    oldEnd = new ArPoint(end);

                    ret2 = this._connectPoints(end, start, hintenddir, dir1, true);
                    i = ret2.length - 1;

                    while (i-- > 1) {
                        ret.push(ret2[i]);
                    }

                    assert(start.equals(end), 'ArGraph.connectPoints: start.equals(end) FAILED');
                    old = CONSTANTS.EMPTY_POINT;
                    start = end = oldEnd;
                } else {  //If we have flipped and both points are in the same bufferbox
                    // We will hugchildren until we can connect both points.
                    // If we can't, force it
                    pts = this._hugChildren(bufferObject, start, dir1, dir2, findExitToEndpoint);
                    if (pts !== null) {  // There is a path from start -> end
                        if (pts.length) {  // Add new points to the current list 
                            ret = ret.concat(pts);
                        }
                        ret.push(new ArPoint(start));
                        start.assign(end);  // These should not be skew! FIXME

                    } else { //Force to the endpoint
                        assert(Utils.isRightAngle(dir1), 'ARGraph.connectPoints: Utils.isRightAngle (dir1) FAILED');

                        if (Utils.isHorizontal(dir1)) {
                            start.x = end.x;
                        } else {
                            start.y = end.y;
                        }

                        ret.push(new ArPoint(start));

                        if (!Utils.isHorizontal(dir1)) {
                            start.x = end.x;
                        } else {
                            start.y = end.y;
                        }

                        ret.push(new ArPoint(start));

                        assert(start.equals(end));  // We are forcing out so these should be the same now

                    }
                    assert(!start.equals(old));
                }
            } else if (Utils.isPointInDirFrom(end, rect, dir2)) {

                assert(!Utils.isPointInDirFrom(start, rect, dir2),
                    'ARGraph.connectPoints: !Utils.isPointInDirFrom(start, rect, dir2) FAILED');
                box = this._goToNextBufferBox({
                    point: start,
                    dir: dir2,
                    dir2: dir1,
                    end: end
                });

                // this assert fails if two boxes are adjacent, and a connection wants to go between
                //assert(Utils.isPointInDirFrom(start, rect, dir2),
                // 'ARGraph.connectPoints: Utils.isPointInDirFrom(start, rect, dir2) FAILED');
                // This is not the best check with parent boxes
                if (start.equals(old)) { //Then we are in a corner
                    if (box.children.length > 1) {
                        pts = this._hugChildren(box, start, dir2, dir1, getToDir1Side);
                    } else {
                        pts = this._hugChildren(bufferObject, start, dir1, dir2);
                    }
                    if (pts !== null) {

                        //Add new points to the current list 
                        ret = ret.concat(pts);

                    } else { //Go through the blocking box
                        assert(Utils.isRightAngle(dir1), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir1) FAILED');

                        if (Utils.isHorizontal(dir1)) {
                            start.x = Utils.getRectOuterCoord(bufferObject.box, dir1);
                        } else {
                            start.y = Utils.getRectOuterCoord(bufferObject.box, dir1);
                        }
                    }
                }
            } else {
                assert(Utils.isPointBetweenSides(end, rect, dir1),
                    'ARGraph.connectPoints: Utils.isPointBetweenSides(end, rect, dir1) FAILED');
                assert(!Utils.isPointIn(end, rect), 'ARGraph.connectPoints: !Utils.isPointIn(end, rect) FAILED');

                rev = 0;

                if (Utils.reverseDir(dir2) === hintenddir &&
                    Utils.getChildRectOuterCoordFrom(bufferObject, Utils.reverseDir(dir2), start) ===
                    Utils.getRectOuterCoord(rect, Utils.reverseDir(dir2))) { //And if point can exit that way
                    rev = 1;
                } else if (dir2 !== hintenddir) {
                    if (Utils.isPointBetweenSides(thestart, rect, dir1)) {
                        if (Utils.isPointInDirFrom(rect.getTopLeft().plus(rect.getBottomRight()),
                                start.plus(end), dir2)) {
                            rev = 1;
                        }
                    } else if (Utils.isPointInDirFrom(start, thestart, dir2)) {
                        rev = 1;
                    }
                }

                if (rev) {
                    dir2 = Utils.reverseDir(dir2);
                }

                //If the box in the way has one child
                if (bufferObject.children.length === 1) {
                    if (Utils.isHorizontal(dir2)) {
                        start.x = Utils.getRectOuterCoord(rect, dir2);
                    } else {
                        start.y = Utils.getRectOuterCoord(rect, dir2);
                    }

                    assert(!start.equals(old), 'ARGraph.connectPoints: !start.equals(old) FAILED');
                    ret.push(new ArPoint(start));
                    old.assign(start);

                    if (Utils.isHorizontal(dir1)) {
                        start.x = Utils.getRectOuterCoord(rect, dir1);
                    } else {
                        start.y = Utils.getRectOuterCoord(rect, dir1);
                    }

                    assert(Utils.isPointInDirFrom(end, start, dir1),
                        'ARGraph.connectPoints: Utils.isPointInDirFrom(end, start, dir1) FAILED');
                    if (Utils.getPointCoord(start, dir1) !== Utils.getPointCoord(end, dir1)) {
                        this._goToNextBufferBox({
                            point: start,
                            dir: dir1,
                            end: end
                        });
                    }

                } else { //If the box has multiple children
                    pts = this._hugChildren(bufferObject, start, dir1, dir2, getToDir1Side);
                    if (pts !== null) {

                        //Add new points to the current list 
                        ret = ret.concat(pts);

                    } else { //Go through the blocking box
                        assert(Utils.isRightAngle(dir1), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir1) FAILED');

                        if (Utils.isHorizontal(dir1)) {
                            start.x = Utils.getRectOuterCoord(bufferObject.box, dir1);
                        } else {
                            start.y = Utils.getRectOuterCoord(bufferObject.box, dir1);
                        }
                    }
                }
            }

            assert(!start.equals(old), 'ARGraph.connectPoints: !start.equals(old) FAILED');
        }

    }

    ret.push(end);

    if (CONSTANTS.DEBUG) {
        ret.assertValid();  // Check that all edges are horizontal are vertical
    }

    return ret;
};

AutoRouterGraph.prototype._disconnectAll = function () {
    for (var i = this.paths.length; i--;) {
        this.disconnect(this.paths[i]);
    }
};

AutoRouterGraph.prototype.disconnect = function (path) {
    if (path.isConnected()) {
        this.deleteEdges(path);
    }

    path.deleteAll();
    this.completelyConnected = false;
};

AutoRouterGraph.prototype._disconnectPathsClipping = function (rect) {
    for (var i = this.paths.length; i--;) {
        if (this.paths[i].isPathClip(rect)) {
            this.disconnect(this.paths[i]);
        }
    }
};

AutoRouterGraph.prototype._disconnectPathsFrom = function (obj) {
    var iter = this.paths.length,
        path,
        startport,
        endport;

    if (obj instanceof AutoRouterBox) {
        var box = obj,
            startbox,
            endbox;
        while (iter--) {
            path = this.paths[iter];

            assert(path.startports !== null, 'ARGraph.disconnectPathsFrom: startport !== null FAILED');
            assert(path.startports.length > 0, 'ARGraph.disconnectPathsFrom: Path has no startports');
            assert(path.endports !== null, 'ARGraph.disconnectPathsFrom: endport !== null FAILED');
            assert(path.endports.length > 0, 'ARGraph.disconnectPathsFrom: Path has no endports');

            // Can simply select any start/end port to check the owner
            startbox = path.startports[0].owner;
            endbox = path.endports[0].owner;

            assert(startbox !== null, 'ARGraph.disconnectPathsFrom: startbox !== null FAILED');
            assert(endbox !== null, 'ARGraph.disconnectPathsFrom: endbox !== null FAILED');

            if ((startbox === box || endbox === box)) {
                this.disconnect(path);
            }

        }
    } else {  // Assuming 'box' is a port

        var port = obj;
        while (iter--) {
            path = this.paths[iter];
            startport = path.getStartPort();
            endport = path.getEndPort();

            if ((startport === port || endport === port)) {
                this.disconnect(path);
            }

        }
    }
};

AutoRouterGraph.prototype._addSelfEdges = function () {
    this.horizontal.addEdges(this);
    this.vertical.addEdges(this);
};

AutoRouterGraph.prototype._addEdges = function (obj) {
    assert(!(obj instanceof AutoRouterPath), 'No Paths should be here!');
    if (obj instanceof AutoRouterPort) {
        this.horizontal.addPortEdges(obj);
        this.vertical.addPortEdges(obj);
    } else {
        this.horizontal.addEdges(obj);
        this.vertical.addEdges(obj);
    }
};

AutoRouterGraph.prototype.deleteEdges = function (object) {
    this.horizontal.deleteEdges(object);
    this.vertical.deleteEdges(object);
};

AutoRouterGraph.prototype._addAllEdges = function () {
    assert(this.horizontal.isEmpty() && this.vertical.isEmpty(),
        'ARGraph.addAllEdges: horizontal.isEmpty() && vertical.isEmpty() FAILED');

    var ids = Object.keys(this.boxes),
        i;

    for (i = ids.length; i--;) {
        this._addBoxAndPortEdges(this.boxes[ids[i]]);
    }

    for (i = this.paths.length; i--;) {
        this.horizontal.addPathEdges(this.paths[i]);
        this.vertical.addPathEdges(this.paths[i]);
    }
};

AutoRouterGraph.prototype._deleteAllEdges = function () {
    this.horizontal.deleteAllEdges();
    this.vertical.deleteAllEdges();
};

AutoRouterGraph.prototype._addBoxAndPortEdges = function (box) {
    assert(box !== null, 'ARGraph.addBoxAndPortEdges: box !== null FAILED');

    this._addEdges(box);

    for (var i = box.ports.length; i--;) {
        this._addEdges(box.ports[i]);
    }

    // Add to bufferboxes
    this._addToBufferBoxes(box);
    this._updateBoxPortAvailability(box);
};

AutoRouterGraph.prototype._deleteBoxAndPortEdges = function (box) {
    assert(box !== null, 'ARGraph.deleteBoxAndPortEdges: box !== null FAILED');

    this.deleteEdges(box);

    for (var i = box.ports.length; i--;) {
        this.deleteEdges(box.ports[i]);
    }

    this._removeFromBufferBoxes(box);
};

AutoRouterGraph.prototype._getEdgeList = function (ishorizontal) {
    return ishorizontal ? this.horizontal : this.vertical;
};

AutoRouterGraph.prototype._candeleteTwoEdgesAt = function (path, points, pos) {
    if (CONSTANTS.DEBUG) {
        assert(path.owner === this, 'ARGraph.candeleteTwoEdgesAt: path.owner === this FAILED');
        path.assertValid();
        assert(path.isConnected(), 'ARGraph.candeleteTwoEdgesAt: path.isConnected() FAILED');
        points.AssertValidPos(pos);
    }

    if (pos + 2 >= points.length || pos < 1) {
        return false;
    }

    var pointpos = pos,
        point = points[pos++],
        npointpos = pos,
        npoint = points[pos++],
        nnpointpos = pos;

    pos = pointpos;
    pos--;
    var ppointpos = pos;

    var ppoint = points[pos--],
        pppointpos = pos;

    if (npoint.equals(point)) {
        return false; // direction of zero-length edges can't be determined, so don't delete them
    }

    assert(pppointpos < points.length && ppointpos < points.length && pointpos < points.length &&
        npointpos < points.length && nnpointpos < points.length,
        'ARGraph.candeleteTwoEdgesAt: pppointpos < points.length && ppointpos < points.length &&' +
        'pointpos < points.length && npointpos < points.length && nnpointpos < points.length FAILED');

    var dir = Utils.getDir(npoint.minus(point));

    assert(Utils.isRightAngle(dir), 'ARGraph.candeleteTwoEdgesAt: Utils.isRightAngle (dir) FAILED');
    var ishorizontal = Utils.isHorizontal(dir);

    var newpoint = new ArPoint();

    if (ishorizontal) {
        newpoint.x = Utils.getPointCoord(npoint, ishorizontal);
        newpoint.y = Utils.getPointCoord(ppoint, !ishorizontal);
    } else {
        newpoint.y = Utils.getPointCoord(npoint, ishorizontal);
        newpoint.x = Utils.getPointCoord(ppoint, !ishorizontal);
    }

    assert(Utils.getDir(newpoint.minus(ppoint)) === dir,
        'ARGraph.candeleteTwoEdgesAt: Utils.getDir (newpoint.minus(ppoint)) === dir FAILED');

    if (this._isLineClipBoxes(newpoint, npoint)) {
        return false;
    }
    if (this._isLineClipBoxes(newpoint, ppoint)) {
        return false;
    }

    return true;
};

AutoRouterGraph.prototype._deleteTwoEdgesAt = function (path, points, pos) {
    if (CONSTANTS.DEBUG) {
        assert(path.owner === this, 'ARGraph.deleteTwoEdgesAt: path.owner === this FAILED');
        path.assertValid();
        assert(path.isConnected(), 'ARGraph.deleteTwoEdgesAt: path.isConnected() FAILED');
        points.AssertValidPos(pos);
    }

    var pointpos = pos, //Getting the next, and next-next, points
        point = points[pos++],
        npointpos = pos,
        npoint = points[pos++],
        nnpointpos = pos,
        nnpoint = points[pos++],
        nnnpointpos = pos;

    pos = pointpos;
    pos--;

    var ppointpos = pos, //Getting the prev, prev-prev points
        ppoint = points[pos--],
        pppointpos = pos,
        pppoint = points[pos--];

    assert(pppointpos < points.length && ppointpos < points.length && pointpos < points.length &&
    npointpos < points.length && nnpointpos < points.length,
        'ARGraph.deleteTwoEdgesAt: pppointpos < points.length && ppointpos < points.length && pointpos < ' +
        'points.length && npointpos < points.length && nnpointpos < points.length FAILED');
    assert(pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null,
        'ARGraph.deleteTwoEdgesAt: pppoint !== null && ppoint !== null && point !== null && npoint !== null &&' +
        ' nnpoint !== null FAILED');

    var dir = Utils.getDir(npoint.minus(point));

    assert(Utils.isRightAngle(dir), 'ARGraph.deleteTwoEdgesAt: Utils.isRightAngle (dir) FAILED');
    var ishorizontal = Utils.isHorizontal(dir);

    var newpoint = new ArPoint();
    if (ishorizontal) {
        newpoint.x = Utils.getPointCoord(npoint, ishorizontal);
        newpoint.y = Utils.getPointCoord(ppoint, !ishorizontal);
    } else {
        newpoint.x = Utils.getPointCoord(ppoint, !ishorizontal);
        newpoint.y = Utils.getPointCoord(npoint, ishorizontal);
    }

    assert(Utils.getDir(newpoint.minus(ppoint)) === dir,
        'ARGraph.deleteTwoEdgesAt: Utils.getDir (newpoint.minus(ppoint)) === dir FAILED');

    assert(!this._isLineClipBoxes(newpoint, npoint),
        'ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, npoint) FAILED');
    assert(!this._isLineClipBoxes(newpoint, ppoint),
        'ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, ppoint) FAILED');

    var hlist = this._getEdgeList(ishorizontal),
        vlist = this._getEdgeList(!ishorizontal);

    var ppedge = hlist.getEdgeByPointer(pppoint),
        pedge = vlist.getEdgeByPointer(ppoint),
        nedge = hlist.getEdgeByPointer(point),
        nnedge = vlist.getEdgeByPointer(npoint);

    assert(ppedge !== null && pedge !== null && nedge !== null && nnedge !== null,
        'ARGraph.deleteTwoEdgesAt:  ppedge !== null && pedge !== null && nedge !== null && nnedge !== null FAILED');

    vlist.remove(pedge);
    hlist.remove(nedge);

    points.splice(ppointpos, 3, newpoint);
    ppedge.endpointNext = nnpoint;
    ppedge.endpoint = newpoint;

    nnedge.startpoint = newpoint;
    nnedge.startpointPrev = pppoint;

    if (nnnpointpos < points.length) {
        var nnnedge = hlist.getEdgeByPointer(nnpoint, (nnnpointpos));
        assert(nnnedge !== null,
            'ARGraph.deleteTwoEdgesAt: nnnedge !== null FAILED');
        assert(nnnedge.startpointPrev.equals(npoint) && nnnedge.startpoint.equals(nnpoint),
            'ARGraph.deleteTwoEdgesAt: nnnedge.startpointPrev.equals(npoint)' +
            '&& nnnedge.startpoint.equals(nnpoint) FAILED');
        nnnedge.startpointPrev = ppoint;
    }

    if (nnpoint.equals(newpoint)) {
        this._deleteSamePointsAt(path, points, ppointpos);
    }

};

AutoRouterGraph.prototype._deleteSamePointsAt = function (path, points, pos) {
    if (CONSTANTS.DEBUG) {
        assert(path.owner === this, 'ARGraph.deleteSamePointsAt: path.owner === this FAILED');
        path.assertValid();
        assert(path.isConnected(), 'ARGraph.deleteSamePointsAt: path.isConnected() FAILED');
        points.AssertValidPos(pos);
    }

    var pointpos = pos,
        point = points[pos++],
        npointpos = pos,
        npoint = points[pos++],
        nnpointpos = pos,
        nnpoint = points[pos++],
        nnnpointpos = pos;

    pos = pointpos;
    pos--;

    var ppointpos = pos,
        ppoint = points[pos--],
        pppointpos = pos,
        pppoint = pos === points.length ? null : points[pos--];

    assert(ppointpos < points.length && pointpos < points.length && npointpos < points.length &&
    nnpointpos < points.length);
    assert(ppoint !== null && point !== null && npoint !== null && nnpoint !== null,
        'ARGraph.deleteSamePointsAt: ppoint !== null && point !== null && npoint !== null && ' +
        'nnpoint !== null FAILED');
    assert(point.equals(npoint) && !point.equals(ppoint),
        'ARGraph.deleteSamePointsAt: point.equals(npoint) && !point.equals(ppoint) FAILED');

    var dir = Utils.getDir(point.minus(ppoint));
    assert(Utils.isRightAngle(dir), 'ARGraph.deleteSamePointsAt: Utils.isRightAngle (dir) FAILED');

    var ishorizontal = Utils.isHorizontal(dir),
        hlist = this._getEdgeList(ishorizontal),
        vlist = this._getEdgeList(!ishorizontal),

        pedge = hlist.getEdgeByPointer(ppoint, point),
        nedge = vlist.getEdgeByPointer(point, npoint),
        nnedge = hlist.getEdgeByPointer(npoint, nnpoint);

    assert(pedge !== null && nedge !== null && nnedge !== null, 'ARGraph.deleteSamePointsAt: pedge !== null ' +
    '&& nedge !== null && nnedge !== null FAILED');

    vlist.remove(pedge);
    hlist.remove(nedge);

    points.splice(pointpos, 2);

    if (pppointpos < points.length) {
        var ppedge = vlist.getEdgeByPointer(pppoint, ppoint);
        assert(ppedge !== null && ppedge.endpoint.equals(ppoint) && ppedge.endpointNext.equals(point),
            'ARGraph.deleteSamePointsAt: ppedge !== null && ppedge.endpoint.equals(ppoint) && ' +
            'ppedge.endpointNext.equals(point) FAILED');
        ppedge.endpointNext = nnpoint;
    }

    assert(nnedge.startpoint.equals(npoint) && nnedge.startpointPrev.equals(point),
        'ARGraph.deleteSamePointsAt: nnedge.startpoint.equals(npoint) && nnedge.startpointPrev.equals(point)' +
        ' FAILED');
    nnedge.setStartPoint(ppoint);
    nnedge.startpointPrev = pppoint;

    if (nnnpointpos < points.length) {
        var nnnedge = vlist.getEdgeByPointer(nnpoint, (nnnpointpos)); //&*
        assert(nnnedge !== null && nnnedge.startpointPrev.equals(npoint) && nnnedge.startpoint.equals(nnpoint),
            'ARGraph.deleteSamePointsAt: nnnedge !== null && nnnedge.startpointPrev.equals(npoint) && ' +
            'nnnedge.startpoint.equals(nnpoint) FAILED');
        nnnedge.startpointPrev = ppoint;
    }

    if (CONSTANTS.DEBUG_DEEP) {
        path.assertValid();
    }
};

AutoRouterGraph.prototype._simplifyPaths = function () {
    var modified = false,
        path,
        pointList,
        pointpos;

    for (var i = this.paths.length; i--;) {
        path = this.paths[i];

        if (path.isAutoRouted()) {
            pointList = path.getPointList();
            pointpos = 0;

            modified = this._fixShortPaths(path) || modified;

            while (pointpos < pointList.length) {
                if (this._candeleteTwoEdgesAt(path, pointList, pointpos)) {
                    this._deleteTwoEdgesAt(path, pointList, pointpos);
                    modified = true;
                    break;
                }
                pointpos++;
            }
        }
    }

    return modified;
};

AutoRouterGraph.prototype._centerStairsInPathPoints = function (path, hintstartdir, hintenddir) {
    assert(path !== null, 'ARGraph.centerStairsInPathPoints: path !== null FAILED');
    assert(!path.isConnected(), 'ARGraph.centerStairsInPathPoints: !path.isConnected() FAILED');

    var pointList = path.getPointList();
    assert(pointList.length >= 2, 'ARGraph.centerStairsInPathPoints: pointList.length >= 2 FAILED');

    if (CONSTANTS.DEBUG) {
        path.assertValidPoints();
    }

    var p1,
        p2,
        p3,
        p4,

        p1p = pointList.length,
        p2p = pointList.length,
        p3p = pointList.length,
        p4p = pointList.length,

        d12 = CONSTANTS.DirNone,
        d23 = CONSTANTS.DirNone,
        d34 = CONSTANTS.DirNone,

        outOfBoxStartPoint = path.getOutOfBoxStartPoint(hintstartdir),
        outOfBoxEndPoint = path.getOutOfBoxEndPoint(hintenddir),

        pos = 0;
    assert(pos < pointList.length, 'ARGraph.centerStairsInPathPoints pos < pointList.length FAILED');

    p1p = pos;
    p1 = (pointList[pos++]);

    var np2,
        np3,
        h,
        p4x,
        p3x,
        p1x,
        tmp,
        t,
        m;


    while (pos < pointList.length) {
        p4p = p3p;
        p3p = p2p;
        p2p = p1p;
        p1p = pos;

        p4 = p3;
        p3 = p2;
        p2 = p1;
        p1 = (pointList[pos++]);

        d34 = d23;
        d23 = d12;

        if (p2p < pointList.length) {
            d12 = Utils.getDir(p2.minus(p1));
            if (CONSTANTS.DEBUG) {
                assert(Utils.isRightAngle(d12), 'ARGraph.centerStairsInPathPoints: ' +
                'Utils.isRightAngle (d12) FAILED');
                if (p3p !== pointList.end()) {
                    assert(Utils.areInRightAngle(d12, d23), 'ARGraph.centerStairsInPathPoints: ' +
                    'Utils.areInRightAngle (d12, d23) FAILED');
                }
            }
        }

        if (p4p < pointList.length && d12 === d34) {
            assert(p1p < pointList.length && p2p < pointList.length && p3p < pointList.length &&
            p4p < pointList.length, 'ARGraph.centerStairsInPathPoints: p1p < pointList.length && ' +
            'p2p < pointList.length && p3p < pointList.length && p4p < pointList.length FAILED');

            np2 = new ArPoint(p2);
            np3 = new ArPoint(p3);
            h = Utils.isHorizontal(d12);

            p4x = Utils.getPointCoord(p4, h);
            p3x = Utils.getPointCoord(p3, h);
            p1x = Utils.getPointCoord(p1, h);

            // p1x will represent the larger x value in this 'step' situation
            if (p1x < p4x) {
                t = p1x;
                p1x = p4x;
                p4x = t;
            }

            if (p4x < p3x && p3x < p1x) {
                m = Math.round((p4x + p1x) / 2);
                if (h) {
                    np2.x = m;
                    np3.x = m;
                } else {
                    np2.y = m;
                    np3.y = m;
                }

                tmp = this._getLimitsOfEdge(np2, np3, p4x, p1x);
                p4x = tmp.min;
                p1x = tmp.max;

                m = Math.round((p4x + p1x) / 2);

                if (h) {
                    np2.x = m;
                    np3.x = m;
                } else {
                    np2.y = m;
                    np3.y = m;
                }

                if (!this._isLineClipBoxes(np2, np3) && !this._isLineClipBoxes(p1p === pointList.length ?
                        outOfBoxEndPoint : p1, np2) && !this._isLineClipBoxes(p4p === 0 ?
                        outOfBoxStartPoint : p4, np3)) {
                    p2 = np2;
                    p3 = np3;
                    pointList.splice(p2p, 1, p2);
                    pointList.splice(p3p, 1, p3);
                }
            }
        }
    }

    if (CONSTANTS.DEBUG) {
        path.assertValidPoints();
    }
};

/**
 * Make sure if a straight line is possible, create a straight line for
 * the path.
 *
 * @param {AutoRouterPath} path
 */
AutoRouterGraph.prototype._fixShortPaths = function (path) {

    var modified = false,
        startport = path.getStartPort(),
        endport = path.getEndPort(),
        len = path.getPointList().length;

    if (len === 4) {
        var points = path.getPointList(),
            startpoint = points[0],
            endpoint = points[len - 1],
            startDir = startport.portOnWhichEdge(startpoint),
            endDir = endport.portOnWhichEdge(endpoint),
            tstStart,
            tstEnd;

        if (startDir === Utils.reverseDir(endDir)) {
            var isHorizontal = Utils.isHorizontal(startDir),
                newStart = new ArPoint(startpoint),
                newEnd = new ArPoint(endpoint),
                startRect = startport.rect,
                endRect = endport.rect,
                minOverlap,
                maxOverlap;

            if (isHorizontal) {
                minOverlap = Math.min(startRect.floor, endRect.floor);
                maxOverlap = Math.max(startRect.ceil, endRect.ceil);

                var newY = (minOverlap + maxOverlap) / 2;
                newStart.y = newY;
                newEnd.y = newY;

                tstStart = new ArPoint(Utils.getRectOuterCoord(startport.owner.rect, startDir), newStart.y);
                tstEnd = new ArPoint(Utils.getRectOuterCoord(endport.owner.rect, endDir), newEnd.y);

            } else {
                minOverlap = Math.min(startRect.right, endRect.right);
                maxOverlap = Math.max(startRect.left, endRect.left);

                var newX = (minOverlap + maxOverlap) / 2;
                newStart.x = newX;
                newEnd.x = newX;

                tstStart = new ArPoint(newStart.x, Utils.getRectOuterCoord(startport.owner.rect, startDir));
                tstEnd = new ArPoint(newEnd.x, Utils.getRectOuterCoord(endport.owner.rect, endDir));
            }

            var validPointLocation = startRect.ptInRect(newStart) && !startRect.onCorner(newStart) &&
                endRect.ptInRect(newEnd) && !endRect.onCorner(newEnd);

            if (validPointLocation && !this._isLineClipBoxes(tstStart, tstEnd)) {
                var hlist = this._getEdgeList(isHorizontal),
                    vlist = this._getEdgeList(!isHorizontal),
                    edge = hlist.getEdgeByPointer(startpoint),
                    edge2 = vlist.getEdgeByPointer(points[1]),
                    edge3 = hlist.getEdgeByPointer(points[2]);

                vlist.remove(edge2);
                hlist.remove(edge3);
                hlist.remove(edge);

                // The values of startpoint is changed but we don't change the startpoint of the edge
                startpoint.assign(newStart);
                // to maintain the reference that the port has to the startpoint
                endpoint.assign(newEnd);
                edge.setEndPoint(endpoint);

                edge.startpointPrev = null;
                edge.endpointNext = null;

                edge.positionY = Utils.getPointCoord(newStart, Utils.nextClockwiseDir(startDir));
                hlist.insert(edge);

                points.splice(1, 2);
                modified = true;
            }
        }
    }

    return modified;
};

/**
 * Remove unnecessary curves inserted into the path from the
 * tracing the edges of overlapping boxes. (hug children)
 *
 * @param {AutoRouterPath} path
 */
AutoRouterGraph.prototype._simplifyPathCurves = function (path) {
    // Incidently, this will also contain the functionality of simplifyTrivially
    var pointList = path.getPointList(),
        p1,
        p2,
        i = 0,
        j;

    // I will be taking the first point and checking to see if it can create a straight line
    // that does not Utils.intersect  any other boxes on the graph from the test point to the other point.
    // The 'other point' will be the end of the path iterating back til the two points before the 
    // current.
    while (i < pointList.length - 3) {
        p1 = pointList[i];
        j = pointList.length;

        while (j-- > 0) {
            p2 = pointList[j];
            if (Utils.isRightAngle(Utils.getDir(p1.minus(p2))) && !this._isLineClipBoxes(p1, p2) ||
                p1.equals(p2)) {
                pointList.splice(i + 1, j - i - 1); // Remove all points between i, j
                break;
            }
        }
        ++i;
    }
};

/* The following shape in a path
 * _______
 *       |       ___
 *       |      |
 *       |______|
 *
 * will be replaced with 
 * _______
 *       |______
 *
 * if possible.
 */
/**
 * Replace 5 points for 3 where possible. This will replace 'u'-like shapes
 * with 'z' like shapes.
 *
 * @param path
 * @return {undefined}
 */
AutoRouterGraph.prototype._simplifyPathPoints = function (path) {
    assert(path !== null, 'ARGraph.simplifyPathPoints: path !== null FAILED');
    assert(!path.isConnected(), 'ARGraph.simplifyPathPoints: !path.isConnected() FAILED');

    var pointList = path.getPointList();
    assert(pointList.length >= 2, 'ARGraph.simplifyPathPoints: pointList.length >= 2 FAILED');

    if (CONSTANTS.DEBUG) {
        path.assertValidPoints();
    }

    var p1,
        p2,
        p3,
        p4,
        p5,

        p1p = pointList.length,
        p2p = pointList.length,
        p3p = pointList.length,
        p4p = pointList.length,
        p5p = pointList.length,

        pos = 0,

        np3,
        d,
        h;

    assert(pos < pointList.length, 'ARGraph.simplifyPathPoints: pos < pointList.length FAILED');

    p1p = pos;
    p1 = pointList[pos++];

    while (pos < pointList.length) {
        p5p = p4p;
        p4p = p3p;
        p3p = p2p;
        p2p = p1p;
        p1p = pos;

        p5 = p4;
        p4 = p3;
        p3 = p2;
        p2 = p1;
        p1 = pointList[pos++];

        if (p5p < pointList.length) {
            assert(p1p < pointList.length && p2p < pointList.length && p3p < pointList.length &&
                p4p < pointList.length && p5p < pointList.length,
                'ARGraph.simplifyPathPoints: p1p < pointList.length && p2p < pointList.length && ' +
                'p3p < pointList.length && p4p < pointList.length && p5p < pointList.length FAILED');

            assert(!p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5),
                'ARGraph.simplifyPathPoints: !p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && ' +
                '!p4.equals(p5) FAILED');

            d = Utils.getDir(p2.minus(p1));
            assert(Utils.isRightAngle(d), 'ARGraph.simplifyPathPoints: Utils.isRightAngle (d) FAILED');
            h = Utils.isHorizontal(d);

            np3 = new ArPoint();
            if (h) {
                np3.x = Utils.getPointCoord(p5, h);
                np3.y = Utils.getPointCoord(p1, !h);
            } else {
                np3.x = Utils.getPointCoord(p1, !h);
                np3.y = Utils.getPointCoord(p5, h);
            }

            if (!this._isLineClipBoxes(p2, np3) && !this._isLineClipBoxes(np3, p4)) {
                pointList.splice(p2p, 1);
                pointList.splice(p3p, 1);
                pointList.splice(p4p, 1);

                if (!np3.equals(p1) && !np3.equals(p5)) {
                    pointList.splice(p4p, 0, np3);
                }

                p1p = pointList.length;
                p2p = pointList.length;
                p3p = pointList.length;
                p4p = pointList.length;

                pos = 0;
            }
        }
    }

    if (CONSTANTS.DEBUG) {
        path.assertValidPoints();
    }
};

AutoRouterGraph.prototype._connectAllDisconnectedPaths = function () {
    var i,
        len = this.paths.length,
        success = false,
        giveup = false,
        path;

    while (!success && !giveup) {
        success = true;
        i = len;
        while (i-- && success) {
            path = this.paths[i];

            if (!path.isConnected()) {
                success = this._connect(path);

                if (!success) {
                    // Something is messed up, probably an existing edge customization results in a zero length edge
                    // In that case we try to delete any customization for this path to recover from the problem
                    if (path.areTherePathCustomizations()) {
                        path.removePathCustomizations();
                    } else {
                        giveup = true;
                    }
                }
            }
        }
        if (!success && !giveup) {
            this._disconnectAll();	// There was an error, delete halfway results to be able to start a new pass
        }
    }
    this.completelyConnected = true;
};

AutoRouterGraph.prototype._updateBoxPortAvailability = function (inputBox) {
    var bufferbox,
        siblings,
        skipBoxes = {},
        box,
        id;

    bufferbox = this.box2bufferBox[inputBox.id];
    assert(bufferbox, 'Bufferbox not found for ' + inputBox.id);
    siblings = bufferbox.children;
    // Ignore overlap from ancestor boxes in the box trees
    box = inputBox;
    do {
        skipBoxes[box.id] = true;
        box = box.parent;
    } while (box);

    for (var i = siblings.length; i--;) {
        id = siblings[i].id;
        if (skipBoxes[id]) {  // Skip boxes on the box tree
            continue;
        }

        if (inputBox.rect.touching(siblings[i])) {
            inputBox.adjustPortAvailability(this.boxes[siblings[i].id]);
            this.boxes[siblings[i].id].adjustPortAvailability(inputBox);
        }
    }
};

AutoRouterGraph.prototype._addToBufferBoxes = function (inputBox) {
    var box = {rect: new ArRect(inputBox.rect), id: inputBox.id},
        overlapBoxesIndices = [],
        bufferBox,
        children = [],
        parentBox,
        ids = [inputBox.id],
        child,
        i,
        j;

    box.rect.inflateRect(CONSTANTS.BUFFER);
    assert(!this.box2bufferBox[inputBox.id],
        'Can\'t add box to 2 bufferboxes');

    // For every buffer box touching the input box
    // Record the buffer boxes with children touching 
    // the input box
    for (i = this.bufferBoxes.length; i--;) {
        if (!box.rect.touching(this.bufferBoxes[i].box)) {
            continue;
        }

        j = this.bufferBoxes[i].children.length;
        while (j--) {
            child = this.bufferBoxes[i].children[j];
            if (box.rect.touching(child)) {
                inputBox.adjustPortAvailability(this.boxes[child.id]);
                this.boxes[child.id].adjustPortAvailability(inputBox);

                if (overlapBoxesIndices.indexOf(i) === -1) {
                    overlapBoxesIndices.push(i);
                }
            }

        }
    }

    parentBox = new ArRect(box.rect);
    // If overlapped other boxes, create the new bufferbox parent rect
    if (overlapBoxesIndices.length !== 0) {

        for (i = 0; i < overlapBoxesIndices.length; i++) {
            assert(overlapBoxesIndices[i] < this.bufferBoxes.length,
                'ArGraph.addToBufferBoxes: overlapBoxes index out of bounds. (' +
                overlapBoxesIndices[i] + ' < ' + this.bufferBoxes.length + ')');

            bufferBox = this.bufferBoxes.splice(overlapBoxesIndices[i], 1)[0];

            for (j = bufferBox.children.length; j--;) {
                children.push(bufferBox.children[j]);
                ids.push(bufferBox.children[j].id);  // Store the ids of the children that need to be adjusted
            }

            parentBox.unionAssign(bufferBox.box);
        }
    }

    box.rect.id = inputBox.id;
    children.push(box.rect);

    this.bufferBoxes.push({box: parentBox, children: children});

    for (i = ids.length; i--;) {
        this.box2bufferBox[ids[i]] = this.bufferBoxes[this.bufferBoxes.length - 1];
    }
};

AutoRouterGraph.prototype._removeFromBufferBoxes = function (box) {
    // Get the children of the parentBox (not including the box to remove)
    // Create bufferboxes from these children
    var bufferBox = this.box2bufferBox[box.id],
        i = this.bufferBoxes.indexOf(bufferBox),
        children = bufferBox.children,
        groups = [],
        add = false,
        parentBox,
        child,
        group,
        ids,
        id,
        j,
        g;

    assert(i !== -1, 'ARGraph.removeFromBufferBoxes: Can\'t find the correct bufferbox.');

    // Remove record of removed box
    this.bufferBoxes.splice(i, 1);
    this.box2bufferBox[box.id] = undefined;

    //Create groups of overlap from children
    i = children.length;
    while (i--) {
        g = groups.length;
        child = children[i];
        group = [child];
        add = false;

        this.boxes[child.id].resetPortAvailability();  // Reset box's ports availableAreas

        if (child.id === box.id) {
            continue;
        }

        while (g--) {
            j = groups[g].length;

            while (j--) {
                if (groups[g][j].touching(child)) {
                    id = groups[g][j].id;
                    this.boxes[child.id].adjustPortAvailability(this.boxes[id]);
                    this.boxes[id].adjustPortAvailability(this.boxes[child.id]);
                    add = true;
                }
            }

            if (add) {
                // group will accumulate all things overlapping the child
                group = group.concat(groups.splice(g, 1)[0]);
            }
        }

        groups.push(group);  // Add group to groups
    }

    i = groups.length;
    while (i--) {
        j = groups[i].length;
        parentBox = new ArRect(groups[i][0]);
        ids = [];

        while (j--) {
            parentBox.unionAssign(groups[i][j]);
            ids.push(groups[i][j].id);
        }

        this.bufferBoxes.push({box: parentBox, children: groups[i]});

        j = ids.length;
        while (j--) {
            this.box2bufferBox[ids[j]] = this.bufferBoxes[this.bufferBoxes.length - 1];
        }
    }

};

//Public Functions

AutoRouterGraph.prototype.setBuffer = function (newBuffer) {
    CONSTANTS.BUFFER = newBuffer;
};

AutoRouterGraph.prototype.calculateSelfPoints = function () {
    this.selfPoints = [];
    this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MINCOORD));
    this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MINCOORD));
    this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MAXCOORD));
    this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MAXCOORD));
};

AutoRouterGraph.prototype.createBox = function () {
    var box = new AutoRouterBox();
    assert(box !== null, 'ARGraph.createBox: box !== null FAILED');

    return box;
};

AutoRouterGraph.prototype.addBox = function (box) {
    assert(box !== null,
        'ARGraph.addBox: box !== null FAILED');
    assert(box instanceof AutoRouterBox,
        'ARGraph.addBox: box instanceof AutoRouterBox FAILED');

    var rect = box.rect;

    this._disconnectPathsClipping(rect);

    box.owner = this;
    var boxId = (COUNTER++).toString();
    while (boxId.length < 6) {
        boxId = '0' + boxId;
    }
    boxId = 'BOX_' + boxId;
    box.id = boxId;

    this.boxes[boxId] = box;

    this._addBoxAndPortEdges(box);

    // add children of the box
    var children = box.childBoxes,
        i = children.length;
    while (i--) {
        this.addBox(children[i]);
    }
};

AutoRouterGraph.prototype.deleteBox = function (box) {
    assert(box !== null, 'ARGraph.deleteBox: box !== null FAILED');

    if (box.hasOwner()) {
        var parent = box.parent,
            children = box.childBoxes,
            i = children.length;

        // notify the parent of the deletion
        if (parent) {
            parent.removeChild(box);
        }

        // remove children
        while (i--) {
            this.deleteBox(children[i]);
        }

        this._deleteBoxAndPortEdges(box);
        box.owner = null;
        assert(this.boxes[box.id] !== undefined, 'ARGraph.remove: Box does not exist');

        delete this.boxes[box.id];
    }

    box.destroy();
    box = null;
};

AutoRouterGraph.prototype.shiftBoxBy = function (box, offset) {
    assert(box !== null, 'ARGraph.shiftBoxBy: box !== null FAILED');
    assert(!!this.boxes[box.id], 'ARGraph.shiftBoxBy: Box does not exist!');

    var rect = this.box2bufferBox[box.id].box,
        children = box.childBoxes;

    this._disconnectPathsClipping(rect); // redraw all paths clipping parent box.
    this._disconnectPathsFrom(box);

    this._deleteBoxAndPortEdges(box);

    box.shiftBy(offset);
    this._addBoxAndPortEdges(box);

    rect = box.rect;
    this._disconnectPathsClipping(rect);

    for (var i = children.length; i--;) {
        this.shiftBoxBy(children[i], offset);
    }
};

AutoRouterGraph.prototype.setBoxRect = function (box, rect) {
    if (box === null) {
        return;
    }

    this._deleteBoxAndPortEdges(box);
    box.setRect(rect);
    this._addBoxAndPortEdges(box);

    this._disconnectPathsClipping(rect);
};

AutoRouterGraph.prototype.routeSync = function () {
    var state = {finished: false};

    this._connectAllDisconnectedPaths();

    while (!state.finished) {
        state = this._optimize(state);
    }

};

AutoRouterGraph.prototype.routeAsync = function (options) {
    var self = this,
        updateFn = options.update || Utils.nop,
        firstFn = options.first || Utils.nop,
        callbackFn = options.callback || Utils.nop,
        time = options.time || 5,
        optimizeFn = function (state) {
            _logger.info('Async optimization cycle started');

            // If a path has been disconnected, start the routing over
            if (!self.completelyConnected) {
                _logger.info('Async optimization interrupted');
                return setTimeout(startRouting, time);
            }

            updateFn(self.paths);
            if (state.finished) {
                _logger.info('Async routing finished');
                return callbackFn(self.paths);
            } else {
                state = self._optimize(state);
                return setTimeout(optimizeFn, time, state);
            }
        },
        startRouting = function () {
            _logger.info('Async routing started');
            var state = {finished: false};
            self._connectAllDisconnectedPaths();

            // Start the optimization
            setTimeout(optimizeFn, time, state);
        };

    _logger.info('Async routing triggered');
    // Connect all disconnected paths with a straight line
    var disconnected = this._quickConnectDisconnectedPaths();
    firstFn(disconnected);

    this._disconnectTempPaths(disconnected);

    setTimeout(startRouting, time);
};

/**
 * Connect all disconnected paths in a quick way while a better layout is
 * being calculated.
 *
 * @return {Array<Path>} disconnected paths
 */
AutoRouterGraph.prototype._quickConnectDisconnectedPaths = function () {
    var path,
        disconnected = [];
    for (var i = this.paths.length; i--;) {
        path = this.paths[i];
        if (!path.isConnected()) {
            path.calculateStartEndPorts();
            path.points = new ArPointListPath(path.startpoint, path.endpoint);
            disconnected.push(path);
        }
    }
    return disconnected;
};

AutoRouterGraph.prototype._disconnectTempPaths = function (paths) {
    for (var i = paths.length; i--;) {
        paths[i].points = new ArPointListPath();
    }
};

/**
 * Performs one set of optimizations.
 *
 * @param {Number} count This stores the max number of optimizations allowed
 * @param {Number} last This stores the last optimization type made
 *
 * @return {Object} Current count, last values
 */
AutoRouterGraph.prototype._optimize = function (options) {
    var maxOperations = options.maxOperations || 100,
        last = options.last || 0,
        dm = options.dm || 10,		// max # of distribution op
        d = options.d || 0,
        getState = function (finished) {
            return {
                finished: finished || !maxOperations,
                maxOperations: maxOperations,
                last: last,
                dm: dm,
                d: d
            };
        };

    if (maxOperations > 0) {

        if (last === 1) {
            return getState(true);
        }

        maxOperations--;
        if (this._simplifyPaths()) {
            last = 1;
        }
    }

    if (maxOperations > 0) {
        if (last === 2) {
            return getState(true);
        }

        maxOperations--;
        if (this.horizontal.blockScanBackward()) {

            do {
                maxOperations--;
            } while (maxOperations > 0 && this.horizontal.blockScanBackward());

            if (last < 2 || last > 5) {
                d = 0;
            } else if (++d >= dm) {
                return getState(true);
            }

            last = 2;
        }
    }

    if (maxOperations > 0) {
        if (last === 3) {
            return getState(true);
        }

        maxOperations--;
        if (this.horizontal.blockScanForward()) {

            do {
                maxOperations--;
            } while (maxOperations > 0 && this.horizontal.blockScanForward());

            if (last < 2 || last > 5) {
                d = 0;
            } else if (++d >= dm) {
                return getState(true);
            }

            last = 3;
        }
    }

    if (maxOperations > 0) {
        if (last === 4) {
            return getState(true);
        }

        maxOperations--;
        if (this.vertical.blockScanBackward()) {
            do {
                maxOperations--;
            } while (maxOperations > 0 && this.vertical.blockScanBackward());

            if (last < 2 || last > 5) {
                d = 0;
            } else if (++d >= dm) {
                return getState(true);
            }

            last = 4;
        }
    }

    if (maxOperations > 0) {
        if (last === 5) {
            return getState(true);
        }

        maxOperations--;
        if (this.vertical.blockScanForward()) {

            do {
                maxOperations--;
            } while (maxOperations > 0 && this.vertical.blockScanForward());

            if (last < 2 || last > 5) {
                d = 0;
            } else if (++d >= dm) {
                return getState(true);
            }

            last = 5;
        }
    }

    if (maxOperations > 0) {
        if (last === 6) {
            return getState(true);
        }

        maxOperations--;
        if (this.horizontal.blockSwitchWrongs()) {
            last = 6;
        }
    }

    if (maxOperations > 0) {
        if (last === 7) {
            return getState(true);
        }

        maxOperations--;
        if (this.vertical.blockSwitchWrongs()) {
            last = 7;
        }
    }

    if (last === 0) {
        return getState(true);
    }

    return getState(false);
};

AutoRouterGraph.prototype.deletePath = function (path) {
    assert(path !== null, 'ARGraph.deletePath: path !== null FAILED');

    if (path.hasOwner()) {
        assert(path.owner === this, 'ARGraph.deletePath: path.owner === this FAILED');

        this.deleteEdges(path);
        path.owner = null;
        var index = this.paths.indexOf(path);

        assert(index > -1, 'ARGraph.remove: Path does not exist');
        this.paths.splice(index, 1);
    }

    path.destroy();
};

AutoRouterGraph.prototype.clear = function (addBackSelfEdges) {
    this._deleteAllPaths();
    this._deleteAllBoxes();
    this._deleteAllEdges();
    if (addBackSelfEdges) {
        this._addSelfEdges();
    }
};

AutoRouterGraph.prototype.addPath = function (isAutoRouted, startports, endports) {
    var path = new AutoRouterPath();

    path.setAutoRouting(isAutoRouted);
    path.setStartPorts(startports);
    path.setEndPorts(endports);
    this._add(path);

    return path;
};

AutoRouterGraph.prototype.isEdgeFixed = function (path, startpoint, endpoint) {
    var d = Utils.getDir(endpoint.minus(startpoint)),
        h = Utils.isHorizontal(d),

        elist = this._getEdgeList(h),

        edge = elist.getEdge(path, startpoint, endpoint);
    if (edge !== null) {
        return edge.getEdgeFixed() && !edge.getEdgeCustomFixed();
    }

    assert(false, 'ARGraph.isEdgeFixed: FAILED');
    return true;
};

AutoRouterGraph.prototype.destroy = function () {
    this.deleteAll(false);

    this.horizontal.SetOwner(null);
    this.vertical.SetOwner(null);
};

AutoRouterGraph.prototype.assertValid = function () {
    var ids = Object.keys(this.boxes),
        i;

    for (i = this.boxes.length; i--;) {
        this.assertValidBox(this.boxes[ids[i]]);
    }

    for (i = this.paths.length; i--;) {
        this._assertValidPath(this.paths[i]);
    }

    this.horizontal.assertValid();
    this.vertical.assertValid();
};

AutoRouterGraph.prototype.assertValidBox = function (box) {
    box.assertValid();
    assert(box.owner === this,
        'ARGraph.assertValidBox: box.owner === this FAILED');
    assert(this.boxes[box.id] !== undefined,
        'ARGraph.assertValidBox: this.boxes[box.id] !== undefined FAILED');

    // Verify that the box (and port) edges are on the graph
    assert(this._containsRectEdges(box.rect),
        'Graph does not contain edges for box ' + box.id);

};

AutoRouterGraph.prototype._containsRectEdges = function (rect) {
    var topLeft = rect.getTopLeft(),
        bottomRight = rect.getBottomRight(),
        points = [],
        result = true,
        len,
        start,
        end;

    points.push(topLeft);
    points.push(new ArPoint(bottomRight.x, topLeft.y));  // top right
    points.push(bottomRight);
    points.push(new ArPoint(topLeft.x, bottomRight.y));  // bottom left

    len = points.length;
    for (var i = 0; i < len; i++) {
        start = points[i];
        end = points[(i + 1) % len];
        result = result && this._containsEdge(start, end);
    }

    return result;
};

/**
 * This checks for an edge with the given start/end points. This will only
 * work for fixed edges such as boxes or ports.
 *
 * @param start
 * @param end
 * @return {undefined}
 */
AutoRouterGraph.prototype._containsEdge = function (start, end) {
    var dir;

    dir = Utils.getDir(start.minus(end));
    assert(Utils.isRightAngle(dir),
        'Edge is invalid: ' + Utils.stringify(start) + ' and ' + Utils.stringify(end));

    if (Utils.isHorizontal(dir)) {
        return this.horizontal.contains(start, end) || this.horizontal.contains(end, start);
    } else {
        return this.vertical.contains(start, end) || this.vertical.contains(end, start);
    }
};

AutoRouterGraph.prototype._assertValidPath = function (path) {
    assert(path.owner === this,
        'ARGraph.assertValidBox: box.owner === this FAILED');
    path.assertValid();
};

AutoRouterGraph.prototype.dumpPaths = function (pos, c) {
    _logger.debug('Paths dump pos ' + pos + ', c ' + c);

    for (var i = 0; i < this.paths.length; i++) {
        _logger.debug(i + '. Path: ');
        this.paths[i].getPointList().dumpPoints('DumpPaths');
    }

};

AutoRouterGraph.prototype.dumpEdgeLists = function () {
    this.horizontal.dumpEdges('Horizontal edges:');
    this.vertical.dumpEdges('Vertical edges:');
};

module.exports = AutoRouterGraph;

},{"./AutoRouter.Box":10,"./AutoRouter.Constants":11,"./AutoRouter.Edge":12,"./AutoRouter.EdgeList":13,"./AutoRouter.Logger":15,"./AutoRouter.Path":16,"./AutoRouter.Point":17,"./AutoRouter.PointList":18,"./AutoRouter.Port":19,"./AutoRouter.Rect":20,"./AutoRouter.Utils":22,"assert":1}],15:[function(require,module,exports){
'use strict';
var debug = require('debug'),
    LEVELS = ['warn', 'debug', 'info'];

var Logger = function(name){
    for (var i = LEVELS.length; i--;) {
        this[LEVELS[i]] = debug(name + ':' + LEVELS[i]);
    }
};

module.exports = Logger;

},{"debug":6}],16:[function(require,module,exports){
/*globals define*/
/*jshint browser: true, bitwise: false*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point'),
    ArRect = require('./AutoRouter.Rect'),
    ArPointListPath = require('./AutoRouter.PointList');

// AutoRouterPath
var AutoRouterPath = function () {
    this.id = 'None';
    this.owner = null;
    this.startpoint = null;
    this.endpoint = null;
    this.startports = null;
    this.endports = null;
    this.startport = null;
    this.endport = null;
    this.attributes = CONSTANTS.PathDefault;
    this.state = CONSTANTS.PathStateDefault;
    this.isAutoRoutingOn = true;
    this.customPathData = [];
    this.customizationType = 'Points';
    this.pathDataToDelete = [];
    this.points = new ArPointListPath();
};


//----Points

AutoRouterPath.prototype.hasOwner = function () {
    return this.owner !== null;
};

AutoRouterPath.prototype.setStartPorts = function (newPorts) {
    this.startports = newPorts;

    if (this.startport) {
        this.calculateStartPorts();
    }
};

AutoRouterPath.prototype.setEndPorts = function (newPorts) {
    this.endports = newPorts;

    if (this.endport) {
        this.calculateEndPorts();
    }
};

AutoRouterPath.prototype.clearPorts = function () {
    // remove the start/endpoints from the given ports
    if (this.startpoint) {
        this.startport.removePoint(this.startpoint);
        this.startpoint = null;
    }
    if (this.endpoint) {
        this.endport.removePoint(this.endpoint);
        this.endpoint = null;
    }
    this.startport = null;
    this.endport = null;
};

AutoRouterPath.prototype.getStartPort = function () {
    assert(this.startports.length, 
        'ARPort.getStartPort: Can\'t retrieve start port. from '+this.id);

    if (!this.startport) {
        this.calculateStartPorts();
    }
    return this.startport;
};

AutoRouterPath.prototype.getEndPort = function () {
    assert(this.endports.length, 
        'ARPort.getEndPort: Can\'t retrieve end port from '+this.id);
    if (!this.endport) {
        this.calculateEndPorts();
    }
    return this.endport;
};

/**
 * Remove port from start/end port lists.
 *
 * @param port
 * @return {undefined}
 */
AutoRouterPath.prototype.removePort = function (port) {
    var removed = Utils.removeFromArrays(port, this.startports, this.endports);
    assert(removed, 'Port was not removed from path start/end ports');

    // If no more start/end ports, remove the path
    // assert(this.startports.length && this.endports.length, 'Removed all start/endports of path ' + this.id);
    this.owner.disconnect(this);
};

AutoRouterPath.prototype.calculateStartEndPorts = function () {
    return {src: this.calculateStartPorts(), dst: this.calculateEndPorts()};
};

AutoRouterPath.prototype.calculateStartPorts = function () {
    var srcPorts = [],
        tgt,
        i;

    assert(this.startports.length > 0, 'ArPath.calculateStartEndPorts: this.startports cannot be empty!');

    //Remove this.startpoint
    if (this.startport && this.startport.hasPoint(this.startpoint)) {
        this.startport.removePoint(this.startpoint);
    }

    //Get available ports
    for (i = this.startports.length; i--;) {
        assert(this.startports[i].owner,
            'ARPath.calculateStartEndPorts: port ' + this.startports[i].id + ' has invalid this.owner!');
        if (this.startports[i].isAvailable()) {
            srcPorts.push(this.startports[i]);
        }
    }

    if (srcPorts.length === 0) {
        srcPorts = this.startports;
    }

    //Preventing same start/endport
    if (this.endport && srcPorts.length > 1) {
        i = srcPorts.length;
        while (i--) {
            if (srcPorts[i] === this.endport) {
                srcPorts.splice(i, 1);
            }
        }
    }


    // Getting target
    if (this.isAutoRouted()) {
        var accumulatePortCenters = function (prev, current) {
            var center = current.rect.getCenter();
            prev.x += center.x;
            prev.y += center.y;
            return prev;
        };
        tgt = this.endports.reduce(accumulatePortCenters, new ArPoint(0, 0));

        tgt.x /= this.endports.length;
        tgt.y /= this.endports.length;
    } else {
        tgt = this.customPathData[0];
    }
    // Get the optimal port to the target
    this.startport = Utils.getOptimalPorts(srcPorts, tgt);

    // Create a this.startpoint at the port
    var startdir = this.getStartDir(),
        startportHasLimited = false,
        startportCanHave = true;

    if (startdir !== CONSTANTS.DirNone) {
        startportHasLimited = this.startport.hasLimitedDirs();
        startportCanHave = this.startport.canHaveStartEndPointOn(startdir, true);
    }
    if (startdir === CONSTANTS.DirNone ||							// recalc startdir if empty
        startportHasLimited && !startportCanHave) {		// or is limited and userpref is invalid
        startdir = this.startport.getStartEndDirTo(tgt, true);
    }

    this.startpoint = this.startport.createStartEndPointTo(tgt, startdir);
    this.startpoint.owner = this;
    return this.startport;
};

AutoRouterPath.prototype.calculateEndPorts = function () {
    var dstPorts = [],
        tgt,
        i = this.endports.length;

    assert(this.endports.length > 0, 'ArPath.calculateStartEndPorts: this.endports cannot be empty!');

    //Remove old this.endpoint
    if (this.endport && this.endport.hasPoint(this.endpoint)) {
        this.endport.removePoint(this.endpoint);
    }

    //Get available ports
    while (i--) {
        assert(this.endports[i].owner, 'ARPath.calculateStartEndPorts: this.endport has invalid this.owner!');
        if (this.endports[i].isAvailable()) {
            dstPorts.push(this.endports[i]);
        }
    }

    if (dstPorts.length === 0) {
        dstPorts = this.endports;
    }

    //Preventing same start/this.endport
    if (this.startport && dstPorts.length > 1) {
        i = dstPorts.length;
        while (i--) {
            if (dstPorts[i] === this.startport) {
                dstPorts.splice(i, 1);
            }
        }
    }

    //Getting target
    if (this.isAutoRouted()) {

        var accumulatePortCenters = function (prev, current) {
            var center = current.rect.getCenter();
            prev.x += center.x;
            prev.y += center.y;
            return prev;
        };
        tgt = this.startports.reduce(accumulatePortCenters, new ArPoint(0, 0));

        tgt.x /= this.startports.length;
        tgt.y /= this.startports.length;

    } else {
        tgt = this.customPathData[this.customPathData.length - 1];
    }

    //Get the optimal port to the target
    this.endport = Utils.getOptimalPorts(dstPorts, tgt);

    //Create this.endpoint at the port
    var enddir = this.getEndDir(),
        startdir = this.getStartDir(),
        endportHasLimited = false,
        endportCanHave = true;

    if (enddir !== CONSTANTS.DirNone) {
        endportHasLimited = this.endport.hasLimitedDirs();
        endportCanHave = this.endport.canHaveStartEndPointOn(enddir, false);
    }
    if (enddir === CONSTANTS.DirNone ||                         // like above
        endportHasLimited && !endportCanHave) {
        enddir = this.endport.getStartEndDirTo(tgt, false, this.startport === this.endport ?
            startdir : CONSTANTS.DirNone);
    }

    this.endpoint = this.endport.createStartEndPointTo(tgt, enddir);
    this.endpoint.owner = this;
    return this.endport;
};

AutoRouterPath.prototype.isConnected = function () {
    return (this.state & CONSTANTS.PathStateConnected) !== 0;
};

AutoRouterPath.prototype.addTail = function (pt) {
    assert(!this.isConnected(),
        'ARPath.addTail: !this.isConnected() FAILED');
    this.points.push(pt);
};

AutoRouterPath.prototype.deleteAll = function () {
    this.points = new ArPointListPath();
    this.state = CONSTANTS.PathStateDefault;
    this.clearPorts();
};

AutoRouterPath.prototype.getStartBox = function () {
    var port = this.startport || this.startports[0];
    return port.owner.getRootBox();
};

AutoRouterPath.prototype.getEndBox = function () {
    var port = this.endport || this.endports[0];
    return port.owner.getRootBox();
};

AutoRouterPath.prototype.getOutOfBoxStartPoint = function (hintDir) {
    var startBoxRect = this.getStartBox();

    assert(hintDir !== CONSTANTS.DirSkew, 'ARPath.getOutOfBoxStartPoint: hintDir !== CONSTANTS.DirSkew FAILED');
    assert(this.points.length >= 2, 'ARPath.getOutOfBoxStartPoint: this.points.length >= 2 FAILED');

    var pos = 0,
        p = new ArPoint(this.points[pos++]),
        d = Utils.getDir(this.points[pos].minus(p));

    if (d === CONSTANTS.DirSkew) {
        d = hintDir;
    }
    assert(Utils.isRightAngle(d), 'ARPath.getOutOfBoxStartPoint: Utils.isRightAngle (d) FAILED');

    if (Utils.isHorizontal(d)) {
        p.x = Utils.getRectOuterCoord(startBoxRect, d);
    } else {
        p.y = Utils.getRectOuterCoord(startBoxRect, d);
    }

    //assert(Utils.getDir (this.points[pos].minus(p)) === Utils.reverseDir ( d ) ||
    // Utils.getDir (this.points[pos].minus(p)) === d, 'Utils.getDir (this.points[pos].minus(p)) ===
    // Utils.reverseDir ( d ) || Utils.getDir (this.points[pos].minus(p)) === d FAILED');

    return p;
};

AutoRouterPath.prototype.getOutOfBoxEndPoint = function (hintDir) {
    var endBoxRect = this.getEndBox();

    assert(hintDir !== CONSTANTS.DirSkew, 'ARPath.getOutOfBoxEndPoint: hintDir !== CONSTANTS.DirSkew FAILED');
    assert(this.points.length >= 2, 'ARPath.getOutOfBoxEndPoint: this.points.length >= 2 FAILED');

    var pos = this.points.length - 1,
        p = new ArPoint(this.points[pos--]),
        d = Utils.getDir(this.points[pos].minus(p));

    if (d === CONSTANTS.DirSkew) {
        d = hintDir;
    }
    assert(Utils.isRightAngle(d), 'ARPath.getOutOfBoxEndPoint: Utils.isRightAngle (d) FAILED');

    if (Utils.isHorizontal(d)) {
        p.x = Utils.getRectOuterCoord(endBoxRect, d);
    } else {
        p.y = Utils.getRectOuterCoord(endBoxRect, d);
    }

    //assert(Utils.getDir (this.points[pos].minus(p)) === Utils.reverseDir ( d ) ||
    // Utils.getDir (this.points[pos].minus(p)) === d, 'ARPath.getOutOfBoxEndPoint: Utils.getDir
    // (this.points[pos].minus(p)) === d || Utils.getDir (this.points[pos].minus(p)) === d FAILED');

    return p;
};

AutoRouterPath.prototype.simplifyTrivially = function () {
    assert(!this.isConnected(), 'ARPath.simplifyTrivially: !isConnected() FAILED');

    if (this.points.length <= 2) {
        return;
    }

    var pos = 0,
        pos1 = pos;

    assert(pos1 !== this.points.length, 'ARPath.simplifyTrivially: pos1 !== this.points.length FAILED');
    var p1 = this.points[pos++],
        pos2 = pos;

    assert(pos2 !== this.points.length, 'ARPath.simplifyTrivially: pos2 !== this.points.length FAILED');
    var p2 = this.points[pos++],
        dir12 = Utils.getDir(p2.minus(p1)),
        pos3 = pos;

    assert(pos3 !== this.points.length, 'ARPath.simplifyTrivially: pos3 !== this.points.length FAILED');
    var p3 = this.points[pos++],
        dir23 = Utils.getDir(p3.minus(p2));

    for (; ;) {
        if (dir12 === CONSTANTS.DirNone || dir23 === CONSTANTS.DirNone ||
            (dir12 !== CONSTANTS.DirSkew && dir23 !== CONSTANTS.DirSkew &&
            (dir12 === dir23 || dir12 === Utils.reverseDir(dir23)) )) {
            this.points.splice(pos2, 1);
            pos--;
            pos3--;
            dir12 = Utils.getDir(p3.minus(p1));
        } else {
            pos1 = pos2;
            p1 = p2;
            dir12 = dir23;
        }

        if (pos === this.points.length) {
            return;
        }

        pos2 = pos3;
        p2 = p3;

        pos3 = pos;
        p3 = this.points[pos++];

        dir23 = Utils.getDir(p3.minus(p2));
    }

    if (CONSTANTS.DEBUG) {
        this.assertValidPoints();
    }
};

AutoRouterPath.prototype.getPointList = function () {
    return this.points;
};

AutoRouterPath.prototype.isPathClip = function (r, isStartOrEndRect) {
    var tmp = this.points.getTailEdge(),
        a = tmp.start,
        b = tmp.end,
        pos = tmp.pos,
        i = 0,
        numEdges = this.points.length - 1;

    while (pos >= 0) {
        if (isStartOrEndRect && ( i === 0 || i === numEdges - 1 )) {
            if (Utils.isPointIn(a, r, 1) &&
                Utils.isPointIn(b, r, 1)) {
                return true;
            }
        } else if (Utils.isLineClipRect(a, b, r)) {
            return true;
        }

        tmp = this.points.getPrevEdge(pos, a, b);
        a = tmp.start;
        b = tmp.end;
        pos = tmp.pos;
        i++;
    }

    return false;
};

AutoRouterPath.prototype.isFixed = function () {
    return ((this.attributes & CONSTANTS.PathFixed) !== 0);
};

AutoRouterPath.prototype.isMoveable = function () {
    return ((this.attributes & CONSTANTS.PathFixed) === 0);
};

AutoRouterPath.prototype.setState = function (s) {
    assert(this.owner !== null, 'ARPath.setState: this.owner !== null FAILED');

    this.state = s;
    if (CONSTANTS.DEBUG) {
        this.assertValid();
    }
};

AutoRouterPath.prototype.getEndDir = function () {
    var a = this.attributes & CONSTANTS.PathEndMask;
    return a & CONSTANTS.PathEndOnTop ? CONSTANTS.DirTop :
        a & CONSTANTS.PathEndOnRight ? CONSTANTS.DirRight :
            a & CONSTANTS.PathEndOnBottom ? CONSTANTS.DirBottom :
                a & CONSTANTS.PathEndOnLeft ? CONSTANTS.DirLeft : CONSTANTS.DirNone;
};

AutoRouterPath.prototype.getStartDir = function () {
    var a = this.attributes & CONSTANTS.PathStartMask;
    return a & CONSTANTS.PathStartOnTop ? CONSTANTS.DirTop :
        a & CONSTANTS.PathStartOnRight ? CONSTANTS.DirRight :
            a & CONSTANTS.PathStartOnBottom ? CONSTANTS.DirBottom :
                a & CONSTANTS.PathStartOnLeft ? CONSTANTS.DirLeft : CONSTANTS.DirNone;
};

AutoRouterPath.prototype.setEndDir = function (pathEnd) {
    this.attributes = (this.attributes & ~CONSTANTS.PathEndMask) + pathEnd;
};

AutoRouterPath.prototype.setStartDir = function (pathStart) {
    this.attributes = (this.attributes & ~CONSTANTS.PathStartMask) + pathStart;
};

/**
 * Set the custom points of the path and determine start/end points/ports.
 *
 * @param {Array<ArPoint>} points
 * @return {undefined}
 */
AutoRouterPath.prototype.setCustomPathPoints = function (points) {
    this.customPathData = points;

    // Find the start/endports
    this.calculateStartEndPorts();

    this.points = new ArPointListPath().concat(points);

    // Add the start/end points to the list
    this.points.unshift(this.startpoint);
    this.points.push(this.endpoint);

    // Set as connected
    this.setState(CONSTANTS.PathStateConnected);
};

AutoRouterPath.prototype.createCustomPath = function () {
    this.points.shift();
    this.points.pop();

    this.points.unshift(this.startpoint);
    this.points.push(this.endpoint);

    this.setState(CONSTANTS.PathStateConnected);
};

AutoRouterPath.prototype.removePathCustomizations = function () {
    this.customPathData = [];
};

AutoRouterPath.prototype.areTherePathCustomizations = function () {
    return this.customPathData.length !== 0;
};

AutoRouterPath.prototype.isAutoRouted = function () {
    return this.isAutoRoutingOn;
};

AutoRouterPath.prototype.setAutoRouting = function (arState) {
    this.isAutoRoutingOn = arState;
};

AutoRouterPath.prototype.destroy = function () {
    if (this.isConnected()) {
        this.startport.removePoint(this.startpoint);
        this.endport.removePoint(this.endpoint);
    }
};

AutoRouterPath.prototype.assertValid = function () {
    var i;

    assert(this.startports.length > 0, 'Path has no startports!');
    assert(this.endports.length > 0, 'Path has no endports!');

    for (i = this.startports.length; i--;) {
        this.startports[i].assertValid();
    }

    for (i = this.endports.length; i--;) {
        this.endports[i].assertValid();
    }

    if (this.isAutoRouted()) {
        if (this.isConnected()) {
            assert(this.points.length !== 0,
                'ARPath.assertValid: this.points.length !== 0 FAILED');
            var points = this.getPointList();
            points.assertValid();
        }
    }

    // If it has a startpoint, must also have a startport
    if (this.startpoint) {
        assert(this.startport, 'Path has a startpoint without a startport');
    }
    if (this.endpoint) {
        assert(this.endport, 'Path has a endpoint without a endport');
    }

    assert(this.owner, 'Path does not have owner!');
};

AutoRouterPath.prototype.assertValidPoints = function () {
};

module.exports = AutoRouterPath;

},{"./AutoRouter.Constants":11,"./AutoRouter.Point":17,"./AutoRouter.PointList":18,"./AutoRouter.Rect":20,"./AutoRouter.Utils":22,"assert":1}],17:[function(require,module,exports){
/*globals define*/
/*jshint browser: true, bitwise: false*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var ArSize = require('./AutoRouter.Size');

var ArPoint = function (x, y) {
    // Multiple Constructors
    if (x === undefined) {
        x = 0;
        y = 0;
    } else if (y === undefined) {
        y = x.y;
        x = x.x;
    }

    this.x = x;
    this.y = y;
};

/**
 * Check if the points have the same coordinates.
 *
 * @param {ArPoint} otherPoint
 * @return {Boolean}
 */
ArPoint.prototype.equals = function (otherPoint) {
    return this.x === otherPoint.x && this.y === otherPoint.y;
};

ArPoint.prototype.shift = function (otherObject) { //equivalent to +=
    this.x += otherObject.dx;
    this.y += otherObject.dy;

    return this;
};

ArPoint.prototype.add = function (otherObject) { //equivalent to +=
    if (otherObject instanceof ArSize) {
        this.x += otherObject.cx;
        this.y += otherObject.cy;
    } else if (otherObject instanceof ArPoint) {
        this.x += otherObject.x;
        this.y += otherObject.y;
    }
};

ArPoint.prototype.subtract = function (otherObject) { //equivalent to +=
    if (otherObject instanceof ArSize) {
        this.x -= otherObject.cx;
        this.y -= otherObject.cy;
    } else if (otherObject instanceof ArPoint) {
        this.x -= otherObject.x;
        this.y -= otherObject.y;
    }
};

ArPoint.prototype.plus = function (otherObject) { //equivalent to +
    var objectCopy = null;

    if (otherObject instanceof ArSize) {
        objectCopy = new ArPoint(this);
        objectCopy.add(otherObject);

    } else if (otherObject instanceof ArPoint) {
        objectCopy = new ArPoint(otherObject);
        objectCopy.x += this.x;
        objectCopy.y += this.y;
    }
    return objectCopy || undefined;
};

ArPoint.prototype.minus = function (otherObject) {
    var objectCopy = new ArPoint(otherObject);

    if (otherObject.cx || otherObject.cy) {
        objectCopy.subtract(this);

    } else if (otherObject.x || otherObject.y) {
        objectCopy = new ArSize();
        objectCopy.cx = this.x - otherObject.x;
        objectCopy.cy = this.y - otherObject.y;

    }
    return objectCopy;
};

ArPoint.prototype.assign = function (otherPoint) {
    this.x = otherPoint.x;
    this.y = otherPoint.y;

    return this;
};

ArPoint.prototype.toString = function () {
    return '(' + this.x + ', ' + this.y + ')';
};

module.exports = ArPoint;

},{"./AutoRouter.Size":21}],18:[function(require,module,exports){
/*jshint node: true, bitwise: false*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var Logger = require('./AutoRouter.Logger'),  // FIXME
    assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    _logger = new Logger('AutoRouter.PointList');

var ArPointListPath = function () {
    for (var i = arguments.length; i--;) {
        this.unshift(arguments[i]);
    }
};

ArPointListPath.prototype = [];

// Wrapper Functions
ArPointListPath.prototype.concat = function (list) {
    var newPoints = new ArPointListPath(),
        i;

    for (i = 0; i < this.length; i++) {
        newPoints.push(this[i]);
    }

    for (i = 0; i < list.length; i++) {
        newPoints.push(list[i]);
    }
    return newPoints;
};

// Functions

ArPointListPath.prototype.end = function () {
    return this[this.length - 1];
};

ArPointListPath.prototype.getTailEdge = function () {
    if (this.length < 2) {
        return this.length;
    }

    var pos = this.length - 1,
        end = this[pos--],
        start = this[pos];

    return {'pos': pos, 'start': start, 'end': end};
};

ArPointListPath.prototype.getPrevEdge = function (pos, start, end) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    end = this[pos--];
    if (pos !== this.length) {
        start = this[pos];
    }

    return {'pos': pos, 'start': start, 'end': end};
};

ArPointListPath.prototype.getEdge = function (pos, start, end) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    start = this[pos++];
    assert(pos < this.length, 'ArPointListPath.getEdge: pos < this.length FAILED');

    end = this[pos];
};

ArPointListPath.prototype.getTailEdgePtrs = function () {
    var pos = this.length,
        start,
        end;

    if (this.length < 2) {
        return {'pos': pos};
    }

    assert(--pos < this.length, 'ArPointListPath.getTailEdgePtrs: --pos < this.length FAILED');

    end = this[pos--];
    assert(pos < this.length, 'ArPointListPath.getTailEdgePtrs: pos < this.length FAILED');

    start = this[pos];

    return {'pos': pos, 'start': start, 'end': end};
};

ArPointListPath.prototype.getPrevEdgePtrs = function (pos) {
    var start,
        end;

    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    end = this[pos];

    if (pos-- > 0) {
        start = this[pos];
    }

    return {pos: pos, start: start, end: end};
};

ArPointListPath.prototype.getStartPoint = function (pos) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    return this[pos];
};

ArPointListPath.prototype.getEndPoint = function (pos) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    pos++;
    assert(pos < this.length,
        'ArPointListPath.getEndPoint: pos < this.length FAILED');

    return this[pos];
};

ArPointListPath.prototype.getPointBeforeEdge = function (pos) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    pos--;
    if (pos === this.length) {
        return null;
    }

    return this[pos];
};

ArPointListPath.prototype.getPointAfterEdge = function (pos) {
    if (CONSTANTS.DEBUG) {
        this.AssertValidPos(pos);
    }

    pos++;
    assert(pos < this.length,
        'ArPointListPath.getPointAfterEdge: pos < this.length FAILED');

    pos++;
    if (pos === this.length) {
        return null;
    }

    return this[pos];
};

ArPointListPath.prototype.assertValid = function (msg) {
    // Check to make sure each point makes a horizontal/vertical line with it's neighbors
    msg = msg || '';
    for (var i = this.length - 1; i > 0; i--) {
        assert(!!this[i].minus, 'Bad value at position ' + i + ' (' + Utils.stringify(this[i]) + ')');
        assert(!!this[i - 1].minus, 'Bad value at position ' + (i - 1) + ' (' + Utils.stringify(this[i - 1]) + ')');

        assert(Utils.isRightAngle(Utils.getDir(this[i - 1].minus(this[i]))),
            msg + '\n\tArPointListPath contains skew edge:\n' + Utils.stringify(this));
    }
};

ArPointListPath.prototype.assertValidPos = function (pos) {
    assert(pos < this.length, 'ArPointListPath.assertValidPos: pos < this.length FAILED');
};

ArPointListPath.prototype.dumpPoints = function (msg) {
    msg += ', points dump begin:\n';
    var pos = 0,
        i = 0,
        p;
    while (pos < this.length) {
        p = this[pos++];
        msg += i + '.: (' + p.x + ', ' + p.y + ')\n';
        i++;
    }
    msg += 'points dump end.';
    _logger.debug(msg);
    return msg;
};

module.exports = ArPointListPath;


},{"./AutoRouter.Constants":11,"./AutoRouter.Logger":15,"./AutoRouter.Utils":22,"assert":1}],19:[function(require,module,exports){
/*jshint node: true, bitwise: false*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point'),
    ArSize = require('./AutoRouter.Size'),
    ArRect = require('./AutoRouter.Rect');

var AutoRouterPort = function () {
    this.id = null;
    this.owner = null;
    this.limitedDirections = true;
    this.rect = new ArRect();
    this.attributes = CONSTANTS.PortDefault;

    // For this.points on CONSTANTS.DirTop, CONSTANTS.DirLeft, CONSTANTS.DirRight, etc
    this.points = [[], [], [], []];
    this.selfPoints = [];
    this.availableArea = [];  // availableAreas keeps track of visible (not overlapped) portions of the port

    this.calculateSelfPoints();
};

AutoRouterPort.prototype.calculateSelfPoints = function () {
    this.selfPoints = [];
    this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

    this.selfPoints.push(new ArPoint(this.rect.right, this.rect.ceil));
    this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
    this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
    this.resetAvailableArea();
};

AutoRouterPort.prototype.hasOwner = function () {
    return this.owner !== null;
};

AutoRouterPort.prototype.isRectEmpty = function () {
    return this.rect.isRectEmpty();
};

AutoRouterPort.prototype.getCenter = function () {
    return this.rect.getCenterPoint();
};

AutoRouterPort.prototype.setRect = function (r) {
    assert(r.getWidth() >= 3 && r.getHeight() >= 3,
        'ARPort.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!');

    this.rect.assign(r);
    this.calculateSelfPoints();
    this.resetAvailableArea();
};

AutoRouterPort.prototype.shiftBy = function (offset) {
    assert(!this.rect.isRectEmpty(), 'ARPort.shiftBy: !this.rect.isRectEmpty() FAILED!');

    this.rect.add(offset);

    this.calculateSelfPoints();
    // Shift points
    this.shiftPoints(offset);
};

AutoRouterPort.prototype.isConnectToCenter = function () {
    return (this.attributes & CONSTANTS.PortConnectToCenter) !== 0;
};

AutoRouterPort.prototype.hasLimitedDirs = function () {
    return this.limitedDirections;
};

AutoRouterPort.prototype.setLimitedDirs = function (ltd) {
    this.limitedDirections = ltd;
};

AutoRouterPort.prototype.portOnWhichEdge = function (point) {
    return Utils.onWhichEdge(this.rect, point);
};

AutoRouterPort.prototype.canHaveStartEndPointOn = function (dir, isStart) {
    assert(0 <= dir && dir <= 3, 'ARPort.canHaveStartEndPointOn: 0 <= dir && dir <= 3 FAILED!');

    if (isStart) {
        dir += 4;
    }

    return ((this.attributes & (1 << dir)) !== 0);
};

AutoRouterPort.prototype.canHaveStartEndPoint = function (isStart) {
    return ((this.attributes & (isStart ? CONSTANTS.PortStartOnAll : CONSTANTS.PortEndOnAll)) !== 0);
};

AutoRouterPort.prototype.canHaveStartEndPointHorizontal = function (isHorizontal) {
    return ((this.attributes &
    (isHorizontal ? CONSTANTS.PortStartEndHorizontal : CONSTANTS.PortStartEndVertical)) !== 0);
};

AutoRouterPort.prototype.getStartEndDirTo = function (point, isStart, notthis) {
    assert(!this.rect.isRectEmpty(), 'ARPort.getStartEndDirTo: !this.rect.isRectEmpty() FAILED!');

    notthis = notthis ? notthis : CONSTANTS.DirNone; // if notthis is undefined, set it to CONSTANTS.DirNone (-1)

    var offset = point.minus(this.rect.getCenterPoint()),
        dir1 = Utils.getMajorDir(offset);

    if (dir1 !== notthis && this.canHaveStartEndPointOn(dir1, isStart)) {
        return dir1;
    }

    var dir2 = Utils.getMinorDir(offset);

    if (dir2 !== notthis && this.canHaveStartEndPointOn(dir2, isStart)) {
        return dir2;
    }

    var dir3 = Utils.reverseDir(dir2);

    if (dir3 !== notthis && this.canHaveStartEndPointOn(dir3, isStart)) {
        return dir3;
    }

    var dir4 = Utils.reverseDir(dir1);

    if (dir4 !== notthis && this.canHaveStartEndPointOn(dir4, isStart)) {
        return dir4;
    }

    if (this.canHaveStartEndPointOn(dir1, isStart)) {
        return dir1;
    }

    if (this.canHaveStartEndPointOn(dir2, isStart)) {
        return dir2;
    }

    if (this.canHaveStartEndPointOn(dir3, isStart)) {
        return dir3;
    }

    if (this.canHaveStartEndPointOn(dir4, isStart)) {
        return dir4;
    }

    return CONSTANTS.DirTop;
};

AutoRouterPort.prototype.roundToHalfGrid = function (left, right) {
    var btwn = (left + right) / 2;
    assert(btwn < Math.max(left, right) && btwn > Math.min(left, right),
        'roundToHalfGrid: btwn variable not between left, right values. Perhaps box/connectionArea is too small?');
    return btwn;
};

AutoRouterPort.prototype.createStartEndPointTo = function (point, dir) {
    // calculate pathAngle
    var dx = point.x - this.getCenter().x,
        dy = point.y - this.getCenter().y,
        pathAngle = Math.atan2(-dy, dx),
        k = 0,
        maxX = this.rect.right,
        maxY = this.rect.floor,
        minX = this.rect.left,
        minY = this.rect.ceil,
        resultPoint,
        smallerPt = new ArPoint(minX, minY),  // The this.points that the resultPoint is centered between
        largerPt = new ArPoint(maxX, maxY);

    // Find the smaller and larger points
    // As the points cannot be on the corner of an edge (ambiguous direction), 
    // we will shift the min, max in one pixel
    if (Utils.isHorizontal(dir)) {  // shift x coordinates
        minX++;
        maxX--;
    } else { // shift y coordinates
        minY++;
        maxY--;
    }

    // Adjust angle based on part of port to which it is connecting
    switch (dir) {

        case CONSTANTS.DirTop:
            pathAngle = 2 * Math.PI - (pathAngle + Math.PI / 2);
            largerPt.y = this.rect.ceil;
            break;

        case CONSTANTS.DirRight:
            pathAngle = 2 * Math.PI - pathAngle;
            smallerPt.x = this.rect.right;
            break;

        case CONSTANTS.DirBottom:
            pathAngle -= Math.PI / 2;
            smallerPt.y = this.rect.floor;
            break;

        case CONSTANTS.DirLeft:
            largerPt.x = this.rect.left;
            break;
    }

    if (pathAngle < 0) {
        pathAngle += 2 * Math.PI;
    }

    pathAngle *= 180 / Math.PI;  // Using degrees for easier debugging

    // Finding this.points ordering
    while (k < this.points[dir].length && pathAngle > this.points[dir][k].pathAngle) {
        k++;
    }

    if (this.points[dir].length) {
        if (k === 0) {
            largerPt = new ArPoint(this.points[dir][k]);

        } else if (k !== this.points[dir].length) {
            smallerPt = new ArPoint(this.points[dir][k - 1]);
            largerPt = new ArPoint(this.points[dir][k]);

        } else {
            smallerPt = new ArPoint(this.points[dir][k - 1]);

        }
    }

    resultPoint = new ArPoint((largerPt.x + smallerPt.x) / 2, (largerPt.y + smallerPt.y) / 2);
    resultPoint.pathAngle = pathAngle;

    // Move the point over to an 'this.availableArea' if appropriate
    var i = this.availableArea.length,
        closestArea = 0,
        distance = Infinity,
        start,
        end;

    // Find distance from each this.availableArea and store closest index
    while (i--) {
        start = this.availableArea[i][0];
        end = this.availableArea[i][1];

        if (Utils.isOnEdge(start, end, resultPoint)) {
            closestArea = -1;
            break;
        } else if (Utils.distanceFromLine(resultPoint, start, end) < distance) {
            closestArea = i;
            distance = Utils.distanceFromLine(resultPoint, start, end);
        }
    }

    if (closestArea !== -1 && this.isAvailable()) { // resultPoint needs to be moved to the closest available area
        var dir2 = Utils.getDir(this.availableArea[closestArea][0].minus(resultPoint));

        assert(Utils.isRightAngle(dir2),
            'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(dir2) FAILED');

        if (dir2 === CONSTANTS.DirLeft || dir2 === CONSTANTS.DirTop) { // Then resultPoint must be moved up
            largerPt = this.availableArea[closestArea][1];
        } else { // Then resultPoint must be moved down
            smallerPt = this.availableArea[closestArea][0];
        }

        resultPoint = new ArPoint((largerPt.x + smallerPt.x) / 2, (largerPt.y + smallerPt.y) / 2);
    }

    this.points[dir].splice(k, 0, resultPoint);

    assert(Utils.isRightAngle(this.portOnWhichEdge(resultPoint)),
        'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(this.portOnWhichEdge(resultPoint)) FAILED');

    return resultPoint;
};

AutoRouterPort.prototype.removePoint = function (pt) {
    var removed;

    removed = Utils.removeFromArrays.apply(null, [pt].concat(this.points));
};

AutoRouterPort.prototype.hasPoint = function (pt) {
    var i = 0,
        k;

    while (i < 4) { //Check all sides for the point
        k = this.points[i].indexOf(pt);

        if (k > -1) { //If the point is on this side of the port
            return true;
        }
        i++;
    }

    return false;
};

AutoRouterPort.prototype.shiftPoints = function (shift) {
    for (var s = this.points.length; s--;) {
        for (var i = this.points[s].length; i--;) {
            // Shift this point
            this.points[s][i].add(shift);
        }
    }
};

AutoRouterPort.prototype.getPointCount = function () {
    var i = 0,
        count = 0;

    while (i < 4) { // Check all sides for the point
        count += this.points[i++].length;
    }

    return count;
};

AutoRouterPort.prototype.resetAvailableArea = function () {
    this.availableArea = [];

    if (this.canHaveStartEndPointOn(CONSTANTS.DirTop)) {
        this.availableArea.push([this.rect.getTopLeft(), new ArPoint(this.rect.right, this.rect.ceil)]);
    }

    if (this.canHaveStartEndPointOn(CONSTANTS.DirRight)) {
        this.availableArea.push([new ArPoint(this.rect.right, this.rect.ceil), this.rect.getBottomRight()]);
    }

    if (this.canHaveStartEndPointOn(CONSTANTS.DirBottom)) {
        this.availableArea.push([new ArPoint(this.rect.left, this.rect.floor), this.rect.getBottomRight()]);
    }

    if (this.canHaveStartEndPointOn(CONSTANTS.DirLeft)) {
        this.availableArea.push([this.rect.getTopLeft(), new ArPoint(this.rect.left, this.rect.floor)]);
    }

};

AutoRouterPort.prototype.adjustAvailableArea = function (r) {
    //For all lines specified in availableAreas, check if the line Utils.intersect s the rectangle
    //If it does, remove the part of the line that Utils.intersect s the rectangle
    if (!this.rect.touching(r)) {
        return;
    }

    var i = this.availableArea.length,
        intersection,
        line;

    while (i--) {

        if (Utils.isLineClipRect(this.availableArea[i][0], this.availableArea[i][1], r)) {
            line = this.availableArea.splice(i, 1)[0];
            intersection = Utils.getLineClipRectIntersect(line[0], line[1], r);

            if (!intersection[0].equals(line[0])) {
                this.availableArea.push([line[0], intersection[0]]);
            }

            if (!intersection[1].equals(line[1])) {
                this.availableArea.push([intersection[1], line[1]]);
            }
        }
    }
};

AutoRouterPort.prototype.getTotalAvailableArea = function () {
    var i = this.availableArea.length,
        length = new ArSize();

    while (i--) {
        length.add(this.availableArea[i][1].minus(this.availableArea[i][0]));
    }

    assert(length.cx === 0 || length.cy === 0,
        'ARPort.getTotalAvailableArea: length[0] === 0 || length[1] === 0 FAILED');
    return length.cx || length.cy;
};

AutoRouterPort.prototype.isAvailable = function () {
    return this.availableArea.length > 0;
};

AutoRouterPort.prototype.assertValid = function () {
    // Check that all points are on a side of the port
    var point;

    assert(this.owner, 'Port ' + this.id + ' does not have valid owner!');
    for (var s = this.points.length; s--;) {
        for (var i = this.points[s].length; i--;) {
            point = this.points[s][i];
            assert(Utils.isRightAngle(this.portOnWhichEdge(point)),
                'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(this.portOnWhichEdge(resultPoint))' +
                ' FAILED');
        }
    }
};

AutoRouterPort.prototype.destroy = function () {
    // Remove all points
    this.owner = null;

    // Remove all points and self from all paths
    var point,
        path;

    for (var i = this.points.length; i--;) {
        for (var j = this.points[i].length; j--;) {
            point = this.points[i][j];
            path = point.owner;
            assert(path, 'start/end point does not have an owner!');
            path.removePort(this);
        }
    }

    this.points = [[], [], [], []];

};

module.exports = AutoRouterPort;

},{"./AutoRouter.Constants":11,"./AutoRouter.Point":17,"./AutoRouter.Rect":20,"./AutoRouter.Size":21,"./AutoRouter.Utils":22,"assert":1}],20:[function(require,module,exports){
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var debug = require('debug'),
    ArPoint = require('./AutoRouter.Point'),
    ArSize = require('./AutoRouter.Size'),
    Logger = require('./AutoRouter.Logger'),
    _logger = new Logger('AutoRouter.Rect');

var ArRect = function (Left, Ceil, Right, Floor) {
    if (Left === undefined) { //No arguments
        Left = 0;
        Ceil = 0;
        Right = 0;
        Floor = 0;

    } else if (Ceil === undefined && Left instanceof ArRect) { // One argument
        // Left is an ArRect
        Ceil = Left.ceil;
        Right = Left.right;
        Floor = Left.floor;
        Left = Left.left;

    } else if (Right === undefined && Left instanceof ArPoint) { // Two arguments
        // Creating ArRect with ArPoint and either another ArPoint or ArSize
        if (Ceil instanceof ArSize) {
            Right = Left.x + Ceil.cx;
            Floor = Left.y + Ceil.cy;
            Ceil = Left.y;
            Left = Left.x;

        } else if (Left instanceof ArPoint && Ceil instanceof ArPoint) {
            Right = Math.round(Ceil.x);
            Floor = Math.round(Ceil.y);
            Ceil = Math.round(Left.y);
            Left = Math.round(Left.x);
        } else {
            throw new Error('Invalid ArRect Constructor');
        }

    } else if (Floor === undefined) { // Invalid
        throw new Error('Invalid ArRect Constructor');
    }

    this.left = Math.round(Left);
    this.ceil = Math.round(Ceil);
    this.floor = Math.round(Floor);
    this.right = Math.round(Right);
};

ArRect.prototype.getCenter = function () {
    return {'x': (this.left + this.right) / 2, 'y': (this.ceil + this.floor) / 2};
};

ArRect.prototype.getWidth = function () {
    return (this.right - this.left);
};

ArRect.prototype.getHeight = function () {
    return (this.floor - this.ceil);
};

ArRect.prototype.getSize = function () {
    return new ArSize(this.getWidth(), this.getHeight());
};

ArRect.prototype.getTopLeft = function () {
    return new ArPoint(this.left, this.ceil);
};

ArRect.prototype.getBottomRight = function () {
    return new ArPoint(this.right, this.floor);
};

ArRect.prototype.getCenterPoint = function () {
    return new ArPoint(this.left + this.getWidth() / 2, this.ceil + this.getHeight() / 2);
};

ArRect.prototype.isRectEmpty = function () {
    if ((this.left >= this.right) && (this.ceil >= this.floor)) {
        return true;
    }

    return false;
};


ArRect.prototype.isRectNull = function () {
    if (this.left === 0 &&
        this.right === 0 &&
        this.ceil === 0 &&
        this.floor === 0) {
        return true;
    }

    return false;
};

ArRect.prototype.ptInRect = function (pt) {
    if (pt instanceof Array) {
        pt = pt[0];
    }

    if (pt.x >= this.left &&
        pt.x <= this.right &&
        pt.y >= this.ceil &&
        pt.y <= this.floor) {
        return true;
    }

    return false;
};

ArRect.prototype.setRect = function (nLeft, nCeil, nRight, nFloor) {
    if (nCeil === undefined && nLeft instanceof ArRect) { //
        this.assign(nLeft);

    } else if (nRight === undefined || nFloor === undefined) { //invalid
        _logger.debug('Invalid args for [ArRect].setRect');

    } else {
        this.left = nLeft;
        this.ceil = nCeil;
        this.right = nRight;
        this.floor = nFloor;
    }

};

ArRect.prototype.setRectEmpty = function () {

    this.ceil = 0;
    this.right = 0;
    this.floor = 0;
    this.left = 0;
};

ArRect.prototype.inflateRect = function (x, y) {
    if (x !== undefined && x.cx !== undefined && x.cy !== undefined) {
        y = x.cy;
        x = x.cx;
    } else if (y === undefined) {
        y = x;
    }

    this.left -= x;
    this.right += x;
    this.ceil -= y;
    this.floor += y;
};

ArRect.prototype.deflateRect = function (x, y) {
    if (x !== undefined && x.cx !== undefined && x.cy !== undefined) {
        y = x.cy;
        x = x.cx;
    }

    this.left += x;
    this.right -= x;
    this.ceil += y;
    this.floor -= y;
};

ArRect.prototype.normalizeRect = function () {
    var temp;

    if (this.left > this.right) {
        temp = this.left;
        this.left = this.right;
        this.right = temp;
    }

    if (this.ceil > this.floor) {
        temp = this.ceil;
        this.ceil = this.floor;
        this.floor = temp;
    }
};

ArRect.prototype.assign = function (rect) {

    this.ceil = rect.ceil;
    this.right = rect.right;
    this.floor = rect.floor;
    this.left = rect.left;
};

ArRect.prototype.equals = function (rect) {
    if (this.left === rect.left &&
        this.right === rect.right &&
        this.ceil === rect.ceil &&
        this.floor === rect.floor) {
        return true;
    }

    return false;

};

ArRect.prototype.add = function (ArObject) {
    var dx,
        dy;
    if (ArObject instanceof ArPoint) {
        dx = ArObject.x;
        dy = ArObject.y;

    } else if (ArObject.cx !== undefined && ArObject.cy !== undefined) {
        dx = ArObject.cx;
        dy = ArObject.cy;

    } else {
        _logger.debug('Invalid arg for [ArRect].add method');
    }

    this.left += dx;
    this.right += dx;
    this.ceil += dy;
    this.floor += dy;
};

ArRect.prototype.subtract = function (ArObject) {
    if (ArObject instanceof ArPoint) {
        this.deflateRect(ArObject.x, ArObject.y);

    } else if (ArObject instanceof ArSize) {
        this.deflateRect(ArObject);

    } else if (ArObject instanceof ArRect) {
        this.left += ArObject.left;
        this.right -= ArObject.right;
        this.ceil += ArObject.ceil;
        this.floor -= ArObject.floor;

    } else {
        _logger.debug('Invalid arg for [ArRect].subtract method');
    }
};

ArRect.prototype.plus = function (ArObject) {
    var resObject = new ArRect(this);
    resObject.add(ArObject);

    return resObject;
};

ArRect.prototype.minus = function (ArObject) {
    var resObject = new ArRect(this);
    resObject.subtract(ArObject);

    return resObject;
};

ArRect.prototype.unionAssign = function (rect) {
    if (rect.isRectEmpty()) {
        return;
    }
    if (this.isRectEmpty()) {
        this.assign(rect);
        return;
    }

    //Take the outermost dimension
    this.left = Math.min(this.left, rect.left);
    this.right = Math.max(this.right, rect.right);
    this.ceil = Math.min(this.ceil, rect.ceil);
    this.floor = Math.max(this.floor, rect.floor);

};

ArRect.prototype.union = function (rect) {
    var resRect = new ArRect(this);
    resRect.unionAssign(rect);

    return resRect;
};

ArRect.prototype.intersectAssign = function (rect1, rect2) {
    rect2 = rect2 ? rect2 : this;
    //Sets this rect to the intersection rect
    this.left = Math.max(rect1.left, rect2.left);
    this.right = Math.min(rect1.right, rect2.right);
    this.ceil = Math.max(rect1.ceil, rect2.ceil);
    this.floor = Math.min(rect1.floor, rect2.floor);

    if (this.left >= this.right || this.ceil >= this.floor) {
        this.setRectEmpty();
        return false;
    }

    return true;
};

ArRect.prototype.intersect = function (rect) {
    var resRect = new ArRect(this);

    resRect.intersectAssign(rect);
    return resRect;
};

ArRect.prototype.touching = function (rect) {
    //One pixel is added to the minimums so, if they are not deemed to be touching
    //there is guaranteed to be at lease a one pixel path between them
    return Math.max(rect.left, this.left) <= Math.min(rect.right, this.right) + 1 &&
        Math.max(rect.ceil, this.ceil) <= Math.min(rect.floor, this.floor) + 1;
};

/**
 * Returns true if the given point is on one of the corners of the rectangle.
 *
 * @param point
 * @return {undefined}
 */
ArRect.prototype.onCorner = function (point) {
    var onHorizontalSide,
        onVerticalSide;

    onHorizontalSide = point.x === this.left || point.x === this.right;
    onVerticalSide = point.y === this.ceil || point.y === this.floor;

    return onHorizontalSide && onVerticalSide;
};

ArRect.prototype.toString = function () {
    return this.getTopLeft().toString() + ' ' + this.getBottomRight().toString();
};

module.exports = ArRect;

},{"./AutoRouter.Logger":15,"./AutoRouter.Point":17,"./AutoRouter.Size":21,"debug":6}],21:[function(require,module,exports){
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var ArSize = function (x, y) {
    //Multiple Constructors
    if (x === undefined) { //No arguments were passed to constructor
        x = 0;
        y = 0;
    } else if (y === undefined) { //One argument passed to constructor
        y = x.cy;
        x = x.cx;
    }

    this.cx = x;
    this.cy = y;
};

ArSize.prototype.equals = function (otherSize) {
    if (this.cx === otherSize.cx && this.cy === otherSize.cy) {
        return true;
    }

    return false;
};

ArSize.prototype.add = function (otherSize) { //equivalent to +=
    if (otherSize.cx || otherSize.cy) {
        this.cx += otherSize.cx;
        this.cy += otherSize.cy;
    }
    if (otherSize.x || otherSize.y) {
        this.cx += otherSize.x;
        this.cy += otherSize.y;
    }
};

ArSize.prototype.getArray = function () {
    var res = [];
    res.push(this.cx);
    res.push(this.cy);
    return res;
};

module.exports = ArSize;

},{}],22:[function(require,module,exports){
/*jshint node: true*/

/**
 * @author brollb / https://github/brollb
 */


'use strict';

var CONSTANTS = require('./AutoRouter.Constants'),
    assert = require('assert'),
    ArRect = require('./AutoRouter.Rect'),
    ArPoint = require('./AutoRouter.Point');

var _getOptimalPorts = function (ports, tgt) {
    //I will get the dx, dy that to the src/dst target and then I will calculate
    // a priority value that will rate the ports as candidates for the 
    //given path
    var srcC = new ArPoint(), //src center
        vector,
        port, //result
        maxP = -Infinity,
        maxArea = 0,
        sPoint,
        i;

    //Get the center points of the src,dst ports
    for (i = 0; i < ports.length; i++) {
        sPoint = ports[i].rect.getCenter();
        srcC.x += sPoint.x;
        srcC.y += sPoint.y;

        //adjust maxArea
        if (maxArea < ports[i].getTotalAvailableArea()) {
            maxArea = ports[i].getTotalAvailableArea();
        }

    }

    //Get the average center point of src
    srcC.x = srcC.x / ports.length;
    srcC.y = srcC.y / ports.length;

    //Get the directions
    vector = (tgt.minus(srcC).getArray());

    //Create priority function
    function createPriority(port, center) {
        var priority = 0,
        //point = [  center.x - port.rect.getCenter().x, center.y - port.rect.getCenter().y],
            point = [port.rect.getCenter().x - center.x, port.rect.getCenter().y - center.y],
            lineCount = (port.getPointCount() || 1),
            //If there is a problem with maxArea, just ignore density
            density = (port.getTotalAvailableArea() / lineCount) / maxArea || 1,
            major = Math.abs(vector[0]) > Math.abs(vector[1]) ? 0 : 1,
            minor = (major + 1) % 2;

        if (point[major] > 0 === vector[major] > 0 && (point[major] === 0) === (vector[major] === 0)) {
            //handling the === 0 error
            //If they have the same parity, assign the priority to maximize that is > 1
            priority = (Math.abs(vector[major]) / Math.abs(vector[major] - point[major])) * 25;
        }

        if (point[minor] > 0 === vector[minor] > 0 && (point[minor] === 0) === (vector[minor] === 0)) {
            //handling the === 0 error
            //If they have the same parity, assign the priority to maximize that is < 1
            priority += vector[minor] !== point[minor] ?
            (Math.abs(vector[minor]) / Math.abs(vector[minor] - point[minor])) * 1 : 0;
        }

        //Adjust priority based on the density of the lines...
        priority *= density;

        return priority;
    }

    //Create priority values for each port.
    var priority;
    for (i = 0; i < ports.length; i++) {
        priority = createPriority(ports[i], srcC) || 0;
        if (priority >= maxP) {
            port = ports[i];
            maxP = priority;
        }
    }

    assert(port.owner, 'ARGraph.getOptimalPorts: port has invalid owner');

    return port;
};

var _getPointCoord = function (point, horDir) {
    if (horDir === true || _isHorizontal(horDir)) {
        return point.x;
    } else {
        return point.y;
    }
};

var _inflatedRect = function (rect, a) {
    var r = rect;
    r.inflateRect(a, a);
    return r;
};

var _isPointNear = function (p1, p2, nearness) {
    return p2.x - nearness <= p1.x && p1.x <= p2.x + nearness &&
        p2.y - nearness <= p1.y && p1.y <= p2.y + nearness;
};

var _isPointIn = function (point, rect, nearness) {
    var tmpR = new ArRect(rect);
    tmpR.inflateRect(nearness, nearness);
    return tmpR.ptInRect(point) === true;
};

var _isRectIn = function (r1, r2) {
    return r2.left <= r1.left && r1.right <= r2.right &&
        r2.ceil <= r1.ceil && r1.floor <= r2.floor;
};

var _isRectClip = function (r1, r2) {
    var rect = new ArRect();
    return rect.intersectAssign(r1, r2) === true;
};

var _distanceFromHLine = function (p, x1, x2, y) {
    assert(x1 <= x2, 'ArHelper.distanceFromHLine: x1 <= x2 FAILED');

    return Math.max(Math.abs(p.y - y), Math.max(x1 - p.x, p.x - x2));
};

var _distanceFromVLine = function (p, y1, y2, x) {
    assert(y1 <= y2, 'ArHelper.distanceFromVLine: y1 <= y2 FAILED');

    return Math.max(Math.abs(p.x - x), Math.max(y1 - p.y, p.y - y2));
};

var _distanceFromLine = function (pt, start, end) {
    var dir = _getDir(end.minus(start));

    if (_isHorizontal(dir)) {
        return _distanceFromVLine(pt, start.y, end.y, start.x);
    } else {
        return _distanceFromHLine(pt, start.x, end.x, start.y);
    }
};

var _isOnEdge = function (start, end, pt) {
    if (start.x === end.x) {			// vertical edge, horizontal move
        if (end.x === pt.x && pt.y <= Math.max(end.y, start.y) && pt.y >= Math.min(end.y, start.y)) {
            return true;
        }
    } else if (start.y === end.y) {	// horizontal line, vertical move
        if (start.y === pt.y && pt.x <= Math.max(end.x, start.x) && pt.x >= Math.min(end.x, start.x)) {
            return true;
        }
    }

    return false;
};

var _isPointNearLine = function (point, start, end, nearness) {
    assert(0 <= nearness, 'ArHelper.isPointNearLine: 0 <= nearness FAILED');

    // begin Zolmol
    // the routing may create edges that have start==end
    // thus confusing this algorithm
    if (end.x === start.x && end.y === start.y) {
        return false;
    }
    // end Zolmol

    var point2 = point;

    point2.subtract(start);

    var end2 = end;
    end2.subtract(start);

    var x = end2.x,
        y = end2.y,
        u = point2.x,
        v = point2.y,
        xuyv = x * u + y * v,
        x2y2 = x * x + y * y;

    if (xuyv < 0 || xuyv > x2y2) {
        return false;
    }

    var expr1 = (x * v - y * u);
    expr1 *= expr1;
    var expr2 = nearness * nearness * x2y2;

    return expr1 <= expr2;
};

var _isLineMeetHLine = function (start, end, x1, x2, y) {
    assert(x1 <= x2, 'ArHelper.isLineMeetHLine: x1 <= x2 FAILED');
    if (start instanceof Array) {//Converting from 'pointer'
        start = start[0];
    }
    if (end instanceof Array) {
        end = end[0];
    }

    if (!((start.y <= y && y <= end.y) || (end.y <= y && y <= start.y ))) {
        return false;
    }

    var end2 = new ArPoint(end);
    end2.subtract(start);
    x1 -= start.x;
    x2 -= start.x;
    y -= start.y;

    if (end2.y === 0) {
        return y === 0 && (( x1 <= 0 && 0 <= x2 ) || (x1 <= end2.x && end2.x <= x2));
    }

    var x = ((end2.x) / end2.y) * y;
    return x1 <= x && x <= x2;
};

var _isLineMeetVLine = function (start, end, y1, y2, x) {
    assert(y1 <= y2, 'ArHelper.isLineMeetVLine: y1 <= y2  FAILED');
    if (start instanceof Array) {//Converting from 'pointer'
        start = start[0];
    }
    if (end instanceof Array) {
        end = end[0];
    }

    if (!((start.x <= x && x <= end.x) || (end.x <= x && x <= start.x ))) {
        return false;
    }

    var end2 = new ArPoint(end);
    end2.subtract(start);
    y1 -= start.y;
    y2 -= start.y;
    x -= start.x;

    if (end2.x === 0) {
        return x === 0 && (( y1 <= 0 && 0 <= y2 ) || (y1 <= end2.y && end2.y <= y2));
    }

    var y = ((end2.y) / end2.x) * x;
    return y1 <= y && y <= y2;
};

var _isLineClipRects = function (start, end, rects) {
    var i = rects.length;
    while (i--) {
        if (_isLineClipRect(start, end, rects[i])) {
            return true;
        }
    }
    return false;
};

var _isLineClipRect = function (start, end, rect) {
    if (rect.ptInRect(start) || rect.ptInRect(end)) {
        return true;
    }

    return _isLineMeetHLine(start, end, rect.left, rect.right, rect.ceil) ||
        _isLineMeetHLine(start, end, rect.left, rect.right, rect.floor) ||
        _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.left) ||
        _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.right);
};

var _getLineClipRectIntersect = function (start, end, rect) {
    //return the endpoints of the intersection line
    var dir = _getDir(end.minus(start)),
        endpoints = [new ArPoint(start), new ArPoint(end)];

    if (!_isLineClipRect(start, end, rect)) {
        return null;
    }

    assert(_isRightAngle(dir), 'ArHelper.getLineClipRectIntersect: _isRightAngle(dir) FAILED');

    //Make sure we are working left to right or top down
    if (dir === CONSTANTS.DirLeft || dir === CONSTANTS.DirTop) {
        dir = _reverseDir(dir);
        endpoints.push(endpoints.splice(0, 1)[0]); //Swap point 0 and point 1
    }

    if (_isPointInDirFrom(endpoints[0], rect.getTopLeft(), _reverseDir(dir))) {
        endpoints[0].assign(rect.getTopLeft());
    }

    if (_isPointInDirFrom(endpoints[1], rect.getBottomRight(), dir)) {
        endpoints[1].assign(rect.getBottomRight());
    }

    if (_isHorizontal(dir)) {
        endpoints[0].y = start.y;
        endpoints[1].y = end.y;
    } else {
        endpoints[0].x = start.x;
        endpoints[1].x = end.x;
    }

    return endpoints;

};

var _intersect = function (a1, a2, b1, b2) {
    return Math.min(a1, a2) <= Math.max(b1, b2) && Math.min(b1, b2) <= Math.max(a1, a2);
};

// --------------------------- RoutingDirection

var _isHorizontal = function (dir) {
    return dir === CONSTANTS.DirRight || dir === CONSTANTS.DirLeft;
};

var _isVertical = function (dir) {
    return dir === CONSTANTS.DirTop || dir === CONSTANTS.DirBottom;
};

var _isRightAngle = function (dir) {
    return CONSTANTS.DirTop <= dir && dir <= CONSTANTS.DirLeft;
};

var _areInRightAngle = function (dir1, dir2) {
    assert(_isRightAngle(dir1) && _isRightAngle(dir2),
        'ArHelper.areInRightAngle: _isRightAngle(dir1) && _isRightAngle(dir2) FAILED');
    return _isHorizontal(dir1) === _isVertical(dir2);
};

var _nextClockwiseDir = function (dir) {
    if (_isRightAngle(dir)) {
        return ((dir + 1) % 4);
    }

    return dir;
};

var _prevClockwiseDir = function (dir) {
    if (_isRightAngle(dir)) {
        return ((dir + 3) % 4);
    }

    return dir;
};

var _reverseDir = function (dir) {
    if (_isRightAngle(dir)) {
        return ((dir + 2) % 4);
    }

    return dir;
};

var _stepOneInDir = function (point, dir) {
    assert(_isRightAngle(dir), 'ArHelper.stepOnInDir: _isRightAngle(dir) FAILED');

    switch (dir) {
        case CONSTANTS.DirTop:
            point.y--;
            break;

        case CONSTANTS.DirRight:
            point.x++;
            break;

        case CONSTANTS.DirBottom:
            point.y++;
            break;

        case CONSTANTS.DirLeft:
            point.x--;
            break;
    }

};

var _getChildRectOuterCoordFrom = function (bufferObject, inDir, point) { //Point travels inDir until hits child box
    var children = bufferObject.children,
        i = -1,
        box = null,
        res = _getRectOuterCoord(bufferObject.box, inDir);

    assert(_isRightAngle(inDir), 'getChildRectOuterCoordFrom: _isRightAngle(inDir) FAILED');
    //The next assert fails if the point is in the opposite direction of the rectangle that it is checking.
    // e.g. The point is checking when it will hit the box from the right but the point is on the left
    assert(!_isPointInDirFrom(point, bufferObject.box, inDir),
        'getChildRectOuterCoordFrom: !isPointInDirFrom(point, bufferObject.box.rect, (inDir)) FAILED');

    while (++i < children.length) {

        if (_isPointInDirFrom(point, children[i], _reverseDir(inDir)) &&
            _isPointBetweenSides(point, children[i], inDir) &&
            _isCoordInDirFrom(res, _getRectOuterCoord(children[i], _reverseDir(inDir)), (inDir))) {

            res = _getRectOuterCoord(children[i], _reverseDir(inDir));
            box = children[i];
        }
    }

    return {'box': box, 'coord': res};
};

var _getRectOuterCoord = function (rect, dir) {
    assert(_isRightAngle(dir), 'Utils.getRectOuterCoord: isRightAngle(dir) FAILED');
    var t = rect.ceil - 1,
        r = rect.right + 1,
        b = rect.floor + 1,
        l = rect.left - 1;

    switch (dir) {
        case CONSTANTS.DirTop:
            return t;

        case CONSTANTS.DirRight:
            return r;

        case CONSTANTS.DirBottom:
            return b;
    }

    return l;
};

//	Indexes:
//				 04
//				1  5
//				3  7
//				 26

var getDirTableIndex = function (offset) {
    return (offset.cx >= 0) * 4 + (offset.cy >= 0) * 2 + (Math.abs(offset.cx) >= Math.abs(offset.cy));
};

var majorDirTable =
    [
        CONSTANTS.DirTop,
        CONSTANTS.DirLeft,
        CONSTANTS.DirBottom,
        CONSTANTS.DirLeft,
        CONSTANTS.DirTop,
        CONSTANTS.DirRight,
        CONSTANTS.DirBottom,
        CONSTANTS.DirRight
    ];

var _getMajorDir = function (offset) {
    return majorDirTable[getDirTableIndex(offset)];
};

var minorDirTable =
    [
        CONSTANTS.DirLeft,
        CONSTANTS.DirTop,
        CONSTANTS.DirLeft,
        CONSTANTS.DirBottom,
        CONSTANTS.DirRight,
        CONSTANTS.DirTop,
        CONSTANTS.DirRight,
        CONSTANTS.DirBottom
    ];

var _getMinorDir = function (offset) {
    return minorDirTable[getDirTableIndex(offset)];
};

//	FG123
//	E   4
//	D 0 5
//	C   6
//  BA987


var _exGetDirTableIndex = function (offset) {
    //This required a variable assignment; otherwise this function
    //returned undefined...
    var res =
        offset.cx > 0 ?
            (
                offset.cy > 0 ?
                    (
                        offset.cx > offset.cy ?
                            (
                                6
                            ) :
                            (offset.cx < offset.cy ?
                                (
                                    8
                                ) :
                                (
                                    7
                                ))
                    ) :
                    (offset.cy < 0 ?
                        (
                            offset.cx > -offset.cy ?
                                (
                                    4
                                ) :
                                (offset.cx < -offset.cy ?
                                    (
                                        2
                                    ) :
                                    (
                                        3
                                    ))
                        ) :
                        (
                            5
                        ))
            ) :
            (offset.cx < 0 ?
                (
                    offset.cy > 0 ?
                        (
                            -offset.cx > offset.cy ?
                                (
                                    12
                                ) :
                                (-offset.cx < offset.cy ?
                                    (
                                        10
                                    ) :
                                    (
                                        11
                                    ))
                        ) :
                        (offset.cy < 0 ?
                            (
                                offset.cx < offset.cy ?
                                    (
                                        14
                                    ) :
                                    (offset.cx > offset.cy ?
                                        (
                                            16
                                        ) :
                                        (
                                            15
                                        ))
                            ) :
                            (
                                13
                            ))
                ) :
                (
                    offset.cy > 0 ?
                        (
                            9
                        ) :
                        (offset.cy < 0 ?
                            (
                                1
                            ) :
                            (
                                0
                            ))
                ));

    return res;
};
var exMajorDirTable =
    [
        CONSTANTS.DirNone,
        CONSTANTS.DirTop,
        CONSTANTS.DirTop,
        CONSTANTS.DirRight,
        CONSTANTS.DirRight,
        CONSTANTS.DirRight,
        CONSTANTS.DirRight,
        CONSTANTS.DirRight,
        CONSTANTS.DirBottom,
        CONSTANTS.DirBottom,
        CONSTANTS.DirBottom,
        CONSTANTS.DirLeft,
        CONSTANTS.DirLeft,
        CONSTANTS.DirLeft,
        CONSTANTS.DirLeft,
        CONSTANTS.DirLeft,
        CONSTANTS.DirTop
    ];

var _exGetMajorDir = function (offset) {
    return exMajorDirTable[_exGetDirTableIndex(offset)];
};

var exMinorDirTable =
    [
        CONSTANTS.DirNone,
        CONSTANTS.DirNone,
        CONSTANTS.DirRight,
        CONSTANTS.DirTop,
        CONSTANTS.DirTop,
        CONSTANTS.DirNone,
        CONSTANTS.DirBottom,
        CONSTANTS.DirBottom,
        CONSTANTS.DirRight,
        CONSTANTS.DirNone,
        CONSTANTS.DirLeft,
        CONSTANTS.DirBottom,
        CONSTANTS.DirBottom,
        CONSTANTS.DirNone,
        CONSTANTS.DirTop,
        CONSTANTS.DirTop,
        CONSTANTS.DirLeft
    ];

var _exGetMinorDir = function (offset) {
    return exMinorDirTable[_exGetDirTableIndex(offset)];
};

var _getDir = function (offset, nodir) {
    if (offset.cx === 0) {
        if (offset.cy === 0) {
            return nodir;
        }

        if (offset.cy < 0) {
            return CONSTANTS.DirTop;
        }

        return CONSTANTS.DirBottom;
    }

    if (offset.cy === 0) {
        if (offset.cx > 0) {
            return CONSTANTS.DirRight;
        }

        return CONSTANTS.DirLeft;
    }

    return CONSTANTS.DirSkew;
};

var _isPointInDirFromChildren = function (point, fromParent, dir) {
    var children = fromParent.children,
        i = 0;

    assert(_isRightAngle(dir), 'isPointInDirFromChildren: _isRightAngle(dir) FAILED');

    while (i < children.length) {
        if (_isPointInDirFrom(point, children[i].rect, dir)) {
            return true;
        }
        ++i;
    }

    return false;
};

var _isPointInDirFrom = function (point, from, dir) {
    if (from instanceof ArRect) {
        var rect = from;
        assert(_isRightAngle(dir), 'ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED');

        switch (dir) {
            case CONSTANTS.DirTop:
                return point.y < rect.ceil;

            case CONSTANTS.DirRight:
                return point.x >= rect.right;

            case CONSTANTS.DirBottom:
                return point.y >= rect.floor;

            case CONSTANTS.DirLeft:
                return point.x < rect.left;
        }

        return false;

    } else {
        assert(_isRightAngle(dir), 'ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED');

        switch (dir) {
            case CONSTANTS.DirTop:
                return point.y <= from.y;

            case CONSTANTS.DirRight:
                return point.x >= from.x;

            case CONSTANTS.DirBottom:
                return point.y >= from.y;

            case CONSTANTS.DirLeft:
                return point.x <= from.x;
        }

        return false;

    }
};

var _isPointBetweenSides = function (point, rect, ishorizontal) {
    if (ishorizontal === true || _isHorizontal(ishorizontal)) {
        return rect.ceil <= point.y && point.y < rect.floor;
    }

    return rect.left <= point.x && point.x < rect.right;
};

var _isCoordInDirFrom = function (coord, from, dir) {
    assert(_isRightAngle(dir), 'ArHelper.isCoordInDirFrom: _isRightAngle(dir) FAILED');
    if (from instanceof ArPoint) {
        from = _getPointCoord(from, dir);
    }

    if (dir === CONSTANTS.DirTop || dir === CONSTANTS.DirLeft) {
        return coord <= from;
    }

    return coord >= from;
};

// This next method only supports unambiguous orientations. That is, the point
// cannot be in a corner of the rectangle.
// NOTE: the right and floor used to be - 1. 
var _onWhichEdge = function (rect, point) {
    if (point.y === rect.ceil && rect.left < point.x && point.x < rect.right) {
        return CONSTANTS.DirTop;
    }

    if (point.y === rect.floor && rect.left < point.x && point.x < rect.right) {
        return CONSTANTS.DirBottom;
    }

    if (point.x === rect.left && rect.ceil < point.y && point.y < rect.floor) {
        return CONSTANTS.DirLeft;
    }

    if (point.x === rect.right && rect.ceil < point.y && point.y < rect.floor) {
        return CONSTANTS.DirRight;
    }

    return CONSTANTS.DirNone;
};
// --------------------------- CArFindNearestLine

var ArFindNearestLine = function (pt) {
    this.point = pt;
    this.dist1 = Infinity;
    this.dist2 = Infinity;
};

ArFindNearestLine.prototype.hLine = function (x1, x2, y) {
    assert(x1 <= x2, 'ArFindNearestLine.hLine: x1 <= x2  FAILED');

    var d1 = _distanceFromHLine(this.point, x1, x2, y),
        d2 = Math.abs(this.point.y - y);

    if (d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2)) {
        this.dist1 = d1;
        this.dist2 = d2;
        return true;
    }

    return false;
};

ArFindNearestLine.prototype.vLine = function (y1, y2, x) {
    assert(y1 <= y2, 'ArFindNearestLine.hLine: y1 <= y2 FAILED');

    var d1 = _distanceFromVLine(this.point, y1, y2, x),
        d2 = Math.abs(this.point.x - x);

    if (d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2)) {
        this.dist1 = d1;
        this.dist2 = d2;
        return true;
    }

    return false;
};

ArFindNearestLine.prototype.was = function () {
    return this.dist1 < Infinity && this.dist2 < Infinity;
};

// Convenience Functions
var removeFromArrays = function (value) {
    var index,
        removed = false,
        array;

    for (var i = arguments.length - 1; i > 0; i--) {
        array = arguments[i];
        index = array.indexOf(value);
        if (index !== -1) {
            array.splice(index, 1);
            removed = true;
        }
    }

    return removed;
};

var stringify = function (value) {
    return JSON.stringify(value, function (key, value) {
        if (key === 'owner' && value) {
            return value.id || typeof value;
        }
        return value;
    });
};

/**
 * Round the number to the given decimal places. Truncate following digits.
 *
 * @param {Number} value
 * @param {Number} places
 * @return {Number} result
 */
var roundTrunc = function (value, places) {
    value = +value;
    var scale = Math.pow(10, +places),
        fn = 'floor';

    if (value < 0) {
        fn = 'ceil';
    }

    return Math[fn](value * scale) / scale;
};

//Float equals
var floatEquals = function (a, b) {
    return ((a - 0.1) < b) && (b < (a + 0.1));
};

/**
 * Convert an object with increasing integer keys to an array.
 * Using method from http://jsperf.com/arguments-performance/6
 *
 * @param {Object} obj
 * @return {Array}
 */
var toArray = function (obj) {
    var result = new Array(obj.length||0),
        i = 0;
    while (obj[i] !== undefined) {
        result[i] = obj[i++];
    }
    return result;
};

var pick = function(keys, obj) {
    var res = {};
    for (var i = keys.length; i--;) {
        res[keys[i]] = obj[keys[i]];
    }
    return res;
};

var nop = function() {
    // nop
};

var assert = function(cond, msg) {
    if (!cond) {
        throw new Error(msg || 'Assert failed');
    }
};

module.exports = {
    onWhichEdge: _onWhichEdge,
    isCoordInDirFrom: _isCoordInDirFrom,
    isPointBetweenSides: _isPointBetweenSides,
    isPointInDirFrom: _isPointInDirFrom,
    isPointInDirFromChildren: _isPointInDirFromChildren,
    isPointIn: _isPointIn,
    isPointNear: _isPointNear,
    getDir: _getDir,
    exGetMinorDir: _exGetMinorDir,
    exGetMajorDir: _exGetMajorDir,
    exGetDirTableIndex: _exGetDirTableIndex,
    getMinorDir: _getMinorDir,
    getMajorDir: _getMajorDir,
    getRectOuterCoord: _getRectOuterCoord,
    getChildRectOuterCoordFrom: _getChildRectOuterCoordFrom,
    stepOneInDir: _stepOneInDir,
    reverseDir: _reverseDir,
    prevClockwiseDir: _prevClockwiseDir,
    nextClockwiseDir: _nextClockwiseDir,
    areInRightAngle: _areInRightAngle,
    isRightAngle: _isRightAngle,
    isHorizontal: _isHorizontal,
    intersect: _intersect,
    getLineClipRectIntersect: _getLineClipRectIntersect,
    isLineClipRect: _isLineClipRect,
    isLineClipRects: _isLineClipRects,
    isPointNearLine: _isPointNearLine,
    isOnEdge: _isOnEdge,
    distanceFromLine: _distanceFromLine,
    isRectClip: _isRectClip,
    isRectIn: _isRectIn,
    inflatedRect: _inflatedRect,
    getPointCoord: _getPointCoord,
    getOptimalPorts: _getOptimalPorts,
    ArFindNearestLine: ArFindNearestLine,

    removeFromArrays: removeFromArrays,
    stringify: stringify,
    floatEquals: floatEquals,
    roundTrunc: roundTrunc,
    toArray: toArray,
    nop: nop,
    assert: assert,
    pick: pick 
};

},{"./AutoRouter.Constants":11,"./AutoRouter.Point":17,"./AutoRouter.Rect":20,"assert":1}],23:[function(require,module,exports){
/*globals define*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

'use strict';

var assert = require('assert'),
    CONSTANTS = require('./AutoRouter.Constants'),
    Utils = require('./AutoRouter.Utils'),
    ArPoint = require('./AutoRouter.Point'),
    ArRect = require('./AutoRouter.Rect'),
    AutoRouterGraph = require('./AutoRouter.Graph'),
    AutoRouterBox = require('./AutoRouter.Box'),
    AutoRouterPort = require('./AutoRouter.Port'),
    AutoRouterPath = require('./AutoRouter.Path');

var AutoRouter = function () {
    this.paths = {};
    this.ports = {};
    this.pCount = 0;  // A not decrementing count of paths for unique path id's
    this.portId2Path = {};
    this.portId2Box = {};

    this.graph = new AutoRouterGraph();
};

var ArBoxObject = function (b, p) {
    // Stores a box with ports used to connect to the box
    this.box = b;
    this.ports = p || {};
};

AutoRouter.prototype.clear = function () {
    this.graph.clear(true);
    this.paths = {};
    this.portId2Path = {};
    this.ports = {};
};

AutoRouter.prototype.destroy = function () {
    this.graph.destroy();
    this.graph = null;
};

AutoRouter.prototype._createBox = function (size) {
    var x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
        x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
        y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
        y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
        box = this.graph.createBox(),
        rect = new ArRect(x1, y1, x2, y2);

    assert(x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined,
        'Missing size info for box');

    // Make sure the rect is at least 3x3
    var height = rect.getHeight(),
        width = rect.getWidth(),
        dx = Math.max((3 - width) / 2, 0),
        dy = Math.max((3 - height) / 2, 0);

    rect.inflateRect(dx, dy);

    box.setRect(rect);
    return box;
};

AutoRouter.prototype.addBox = function (size) {
    var box = this._createBox(size),
        portsInfo = size.ports || {},
        boxObject;

    boxObject = new ArBoxObject(box);
    this.graph.addBox(box);

    // Adding each port
    var portIds = Object.keys(portsInfo);
    for (var i = portIds.length; i--;) {
        this.addPort(boxObject, portsInfo[portIds[i]]);
    }

    this.portId2Path[box.id] = {in: [], out: []};

    return boxObject;
};

AutoRouter.prototype.addPort = function (boxObject, portInfo) {
    // Adding a port to an already existing box (also called in addBox method)
    // Default is no connection ports (more relevant when creating a box)
    var box = boxObject.box,
        port,
        container,
        rect;

    // A connection area is specified
    /*
     *  Multiple connections specified
     *    [ [ [x1, y1], [x2, y2] ], ... ]
     *
     * I will make them all 'multiple' connections
     *  then handle them the same
     *
     */

    port = this._createPort(portInfo, box);

    // Add port entry to portId2Path dictionary
    var id = this.getPortId(portInfo.id, boxObject);
    port.id = id;
    this.portId2Path[id] = {in: [], out: []};
    this.ports[id] = port;

    // Create child box
    rect = new ArRect(port.rect);
    rect.inflateRect(3);
    container = this._createBox({
        x1: rect.left,
        x2: rect.right,
        y1: rect.ceil,
        y2: rect.floor
    });
    box.addChild(container);

    // add port to child box
    container.addPort(port);

    boxObject.ports[port.id] = port;

    // Record the port2box mapping
    this.portId2Box[port.id] = boxObject;
    this.graph.addBox(container);

    return port;
};

AutoRouter.prototype.getPortId = function (id, box) {
    var SPLITTER = '__',
        boxObject = this.portId2Box[id] || box,
        boxObjectId = boxObject.box.id,
        uniqueId = boxObjectId + SPLITTER + id;

    assert(id.toString, 'Invalid Port Id! (' + id + ')');
    id = id.toString();
    if (id.indexOf(boxObjectId + SPLITTER) !== -1) {  // Assume id is already absolute id
        return id;
    }

    return uniqueId;
};

AutoRouter.prototype._createPort = function (connData, box) {
    var angles = connData.angles || [], // Incoming angles. If defined, it will set attr at the end
        attr = 0, // Set by angles. Defaults to guessing by location if angles undefined
        type = 'any', // Specify start, end, or any
        port = box.createPort(),
        rect = box.rect,
        connArea = connData.area;

    var isStart = 17,
        arx1,
        arx2,
        ary1,
        ary2;

    var _x1,
        _x2,
        _y1,
        _y2,
        horizontal;

    var r;

    var a1, // min angle
        a2, // max angle
        rightAngle = 0,
        bottomAngle = 90,
        leftAngle = 180,
        topAngle = 270;

    if (connArea instanceof Array) {
        isStart = 17;

        // This gives us a coefficient to multiply our attributes by to govern incoming
        // or outgoing connection. Now, the port needs only to determine the direction
        if (type !== 'any') {
            isStart -= (type === 'start' ? 1 : 16);
        }

        // using points to designate the connection area: [ [x1, y1], [x2, y2] ]
        _x1 = Math.min(connArea[0][0], connArea[1][0]);
        _x2 = Math.max(connArea[0][0], connArea[1][0]);
        _y1 = Math.min(connArea[0][1], connArea[1][1]);
        _y2 = Math.max(connArea[0][1], connArea[1][1]);
        horizontal = _y1 === _y2;

        // If it is a single point of connection, we will expand it to a rect
        // We will determine that it is horizontal by if it is closer to a horizontal edges
        // or the vertical edges
        if (_y1 === _y2 && _x1 === _x2) {
            horizontal = Math.min(Math.abs(rect.ceil - _y1), Math.abs(rect.floor - _y2)) <
            Math.min(Math.abs(rect.left - _x1), Math.abs(rect.right - _x2));
            if (horizontal) {
                _x1 -= 1;
                _x2 += 1;
            } else {
                _y1 -= 1;
                _y2 += 1;
            }
        }

        assert(horizontal || _x1 === _x2,
            'AutoRouter:addBox Connection Area for box must be either horizontal or vertical');

        arx1 = _x1;
        arx2 = _x2;
        ary1 = _y1;
        ary2 = _y2;

        if (horizontal) {
            if (Math.abs(_y1 - rect.ceil) < Math.abs(_y1 - rect.floor)) { // Closer to the top (horizontal)
                ary1 = _y1 + 1;
                ary2 = _y1 + 5;
                attr = CONSTANTS.PortStartOnTop + CONSTANTS.PortEndOnTop;
            } else { // Closer to the top (horizontal)
                ary1 = _y1 - 5;
                ary2 = _y1 - 1;
                attr = CONSTANTS.PortStartOnBottom + CONSTANTS.PortEndOnBottom;
            }

        } else {
            if (Math.abs(_x1 - rect.left) < Math.abs(_x1 - rect.right)) {// Closer to the left (vertical)
                arx1 += 1;
                arx2 += 5;
                attr = CONSTANTS.PortStartOnLeft + CONSTANTS.PortEndOnLeft;
            } else {// Closer to the right (vertical)
                arx1 -= 5;
                arx2 -= 1;
                attr = CONSTANTS.PortStartOnRight + CONSTANTS.PortEndOnRight;
            }
        }

    }
    // Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
    if (arx2 - arx1 < 3) {
        arx1 -= 2;
        arx2 += 2;
    }
    // Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
    if (ary2 - ary1 < 3) {
        ary1 -= 2;
        ary2 += 2;
    }

    r = new ArRect(arx1, ary1, arx2, ary2);

    // If 'angles' is defined, I will use it to set attr
    if (angles[0] !== undefined && angles[1] !== undefined) {
        a1 = angles[0]; // min angle
        a2 = angles[1]; // max angle

        attr = 0; // Throw away our guess of attr

        if (rightAngle >= a1 && rightAngle <= a2) {
            attr += CONSTANTS.PortStartOnRight + CONSTANTS.PortEndOnRight;
        }

        if (topAngle >= a1 && topAngle <= a2) {
            attr += CONSTANTS.PortStartOnTop + CONSTANTS.PortEndOnTop;
        }

        if (leftAngle >= a1 && leftAngle <= a2) {
            attr += CONSTANTS.PortStartOnLeft + CONSTANTS.PortEndOnLeft;
        }

        if (bottomAngle >= a1 && bottomAngle <= a2) {
            attr += CONSTANTS.PortStartOnBottom + CONSTANTS.PortEndOnBottom;
        }
    }

    port.setLimitedDirs(false);
    port.attributes = attr;
    port.setRect(r);

    return port;
};

/**
 * Convenience method to modify port in paths (as both start and end port)
 *
 * @param port
 * @param action
 * @return {undefined}
 */
AutoRouter.prototype._removePortsMatching = function (port) {
    var id = port.id,
        startPaths = this.portId2Path[id].out,
        endPaths = this.portId2Path[id].in,
        i;

    var paths = '';
    for (i = startPaths.length; i--;) {
        assert(Utils.removeFromArrays(port, startPaths[i].startports),
            'Port ' + port.id + ' not removed from startports');
        paths += startPaths[i].id + ', ';
    }

    paths = '';
    for (i = endPaths.length; i--;) {
        assert(Utils.removeFromArrays(port, endPaths[i].endports),
            'Port ' + port.id + ' not removed from endports');
        paths += endPaths[i].id + ', ';
    }

    // Check every path to see that it has no port with tmpId
    for (i = this.graph.paths.length; i--;) {
        assert(this.graph.paths[i].startports.indexOf(port) === -1,
            'port not removed from path startports! (' + this.graph.paths[i].id + ')');
        assert(this.graph.paths[i].endports.indexOf(port) === -1,
            'port not removed from path endports!');
    }

};

AutoRouter.prototype.removePort = function (port) {
    // Remove port and parent box!
    var container = port.owner,
        id = port.id;

    assert(container.parent, 'Port container should have a parent box!');
    this.graph.deleteBox(container);

    // update the paths
    this._removePortsMatching(port);

    // remove port from ArBoxObject
    var boxObject = this.portId2Box[id];

    assert(boxObject !== undefined, 'Box Object not found for port (' + id + ')!');
    delete boxObject.ports[id];

    // Clean up the port records
    this.ports[id] = undefined;
    this.portId2Path[id] = undefined;
    this.portId2Box[id] = undefined;

};

AutoRouter.prototype.addPath = function (params) {
    // Assign a pathId to the path (return this id).
    // If there is only one possible path connection, create the path.
    // if not, store the path info in the pathsToResolve array
    var pathId = (this.pCount++).toString();

    // Generate pathId
    while (pathId.length < 6) {
        pathId = '0' + pathId;
    }
    pathId = 'PATH_' + pathId;

    params.id = pathId;
    this._createPath(params);

    return pathId;
};

/**
 * Convert either a port or Hashmap of ports to an
 * array of AutoRouterPorts
 *
 * @param port
 * @return {Array} Array of AutoRouterPorts
 */
var unpackPortInfo = function (port) {
    var ports = [];

    if (port instanceof AutoRouterPort) {
        ports.push(port);
    } else {
        var ids = Object.keys(port);
        for (var i = ids.length; i--;) {
            assert(port[ids[i]] instanceof AutoRouterPort, 'Invalid port option: ' + port[i]);
            ports.push(port[ids[i]]);
        }
    }

    assert(ports.length > 0, 'Did not receive valid start or end ports');
    return ports;
};

AutoRouter.prototype._createPath = function (params) {
    if (!params.src || !params.dst) {
        throw 'AutoRouter:_createPath missing source or destination ports';
    }

    var id = params.id,
        autoroute = params.autoroute || true,
        startDir = params.startDirection || params.start,
        endDir = params.endDirection || params.end,
        srcPorts,
        dstPorts,
        path,
        i;

    srcPorts = unpackPortInfo(params.src);
    dstPorts = unpackPortInfo(params.dst);

    path = this.graph.addPath(autoroute, srcPorts, dstPorts);

    if (startDir || endDir) {
        var start = startDir !== undefined ? (startDir.indexOf('top') !== -1 ? CONSTANTS.PathStartOnTop : 0) +
        (startDir.indexOf('bottom') !== -1 ? CONSTANTS.PathStartOnBottom : 0) +
        (startDir.indexOf('left') !== -1 ? CONSTANTS.PathStartOnLeft : 0) +
        (startDir.indexOf('right') !== -1 ? CONSTANTS.PathStartOnRight : 0) ||
        (startDir.indexOf('all') !== -1 ? CONSTANTS.PathDefault : 0) : CONSTANTS.PathDefault;
        var end = endDir !== undefined ? (endDir.indexOf('top') !== -1 ? CONSTANTS.PathEndOnTop : 0) +
        (endDir.indexOf('bottom') !== -1 ? CONSTANTS.PathEndOnBottom : 0) +
        (endDir.indexOf('left') !== -1 ? CONSTANTS.PathEndOnLeft : 0) +
        (endDir.indexOf('right') !== -1 ? CONSTANTS.PathEndOnRight : 0) ||
        (endDir.indexOf('all') !== -1 ? CONSTANTS.PathDefault : 0) : CONSTANTS.PathDefault;

        path.setStartDir(start);
        path.setEndDir(end);
    } else {
        path.setStartDir(CONSTANTS.PathDefault);
        path.setEndDir(CONSTANTS.PathDefault);
    }

    path.id = id;
    this.paths[id] = path;

    // Register the path under box id
    // Id the ports and register the paths with each port...
    for (i = srcPorts.length; i--;) {
        this.portId2Path[srcPorts[i].id].out.push(path);
    }
    for (i = dstPorts.length; i--;) {
        this.portId2Path[dstPorts[i].id].in.push(path);
    }
    return path;
};

AutoRouter.prototype.routeSync = function () {
    this.graph.routeSync();
};

AutoRouter.prototype.routeAsync = function (options) {
    this.graph.routeAsync(options);
};

AutoRouter.prototype.getPathPoints = function (pathId) {
    assert(this.paths[pathId] !== undefined,
        'AutoRouter:getPath requested path does not match any current paths');
    var path = this.paths[pathId];

    return path.points.map(function (point) {
        return {x: point.x, y: point.y};
    });
};

AutoRouter.prototype.getBoxRect = function (boxId) {
    assert(this.graph.boxes[boxId] !== undefined,
        'AutoRouter:getBoxRect requested box does not match any current boxes');
    var rect = this.graph.boxes[boxId].rect;

    return Utils.pick(['left', 'right', 'ceil', 'floor'], rect);
};

AutoRouter.prototype.setBoxRect = function (boxObject, size) {
    var box = boxObject.box,
        x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
        x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
        y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
        y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
        rect = new ArRect(x1, y1, x2, y2);

    this.graph.setBoxRect(box, rect);

};

AutoRouter.prototype._changePortId = function (oldId, newId) {
    this.ports[newId] = this.ports[oldId];
    this.portId2Path[newId] = this.portId2Path[oldId];
    this.portId2Box[newId] = this.portId2Box[oldId];
    this.ports[newId].id = newId;

    this.ports[oldId] = undefined;
    this.portId2Path[oldId] = undefined;
    this.portId2Box[oldId] = undefined;
};

/**
 * Updates the port with the given id to
 * match the parameters in portInfo
 *
 * @param {Object} portInfo
 * @return {undefined}
 */
AutoRouter.prototype.updatePort = function (boxObject, portInfo) {
    // Remove owner box from graph
    var portId = this.getPortId(portInfo.id, boxObject),
        oldPort = this.ports[portId],
        tmpId = '##TEMP_ID##',
        incomingPaths = this.portId2Path[portId].in,
        outgoingPaths = this.portId2Path[portId].out,
        newPort;

    // FIXME: this should be done better
    this._changePortId(portId, tmpId);
    newPort = this.addPort(boxObject, portInfo);

    // For all paths using this port, add the new port
    var path,
        i;

    for (i = outgoingPaths.length; i--;) {
        path = outgoingPaths[i];
        path.startports.push(newPort);
        this.graph.disconnect(path);
        this.portId2Path[portId].out.push(path);
    }

    for (i = incomingPaths.length; i--;) {
        path = incomingPaths[i];
        path.endports.push(newPort);
        this.graph.disconnect(path);
        this.portId2Path[portId].in.push(path);
    }

    this.removePort(oldPort);

    // update the boxObject
    boxObject.ports[portId] = newPort;

    return newPort;
};

AutoRouter.prototype.remove = function (item) {
    assert(item !== undefined, 'AutoRouter:remove Cannot remove undefined object');
    var i;

    if (item.box instanceof AutoRouterBox) {
        var ports = Object.keys(item.ports);
        for (i = ports.length; i--;) {
            this.portId2Path[ports[i]] = undefined;
        }

        this.graph.deleteBox(item.box);

    } else if (this.paths[item] !== undefined) {
        if (this.paths[item] instanceof AutoRouterPath) {
            var path,
                srcId,
                dstId,
                index;

            // Remove path from all portId2Path entries
            path = this.paths[item];
            for (i = path.startports.length; i--;) {
                srcId = path.startports[i].id;
                index = this.portId2Path[srcId].out.indexOf(path);
                this.portId2Path[srcId].out.splice(index, 1);
            }

            for (i = path.endports.length; i--;) {
                dstId = path.endports[i].id;
                index = this.portId2Path[dstId].in.indexOf(path);
                this.portId2Path[dstId].in.splice(index, 1);
            }

            this.graph.deletePath(path);
        }
        delete this.paths[item];  // Remove dictionary entry

    } else {
        throw 'AutoRouter:remove Unrecognized item type. Must be an AutoRouterBox or an AutoRouterPath ID';
    }
};

AutoRouter.prototype.move = function (box, details) {
    // Make sure details are in terms of dx, dy
    box = box instanceof AutoRouterBox ? box : box.box;
    var dx = details.dx !== undefined ? details.dx : Math.round(details.x - box.rect.left),
        dy = details.dy !== undefined ? details.dy : Math.round(details.y - box.rect.ceil);

    assert(box instanceof AutoRouterBox, 'AutoRouter:move First argument must be an AutoRouterBox or ArBoxObject');

    this.graph.shiftBoxBy(box, {'cx': dx, 'cy': dy});
};

AutoRouter.prototype.setMinimumGap = function (min) {
    this.graph.setBuffer(Math.floor(min / 2));
};

AutoRouter.prototype.setComponent = function (pBoxObj, chBoxObj) {
    var parent = pBoxObj.box,
        child = chBoxObj.box;

    parent.addChild(child);
};

AutoRouter.prototype.setPathCustomPoints = function (args) { // args.points = [ [x, y], [x2, y2], ... ]
    var path = this.paths[args.path],
        points;
    if (path === undefined) {
        throw 'AutoRouter: Need to have an AutoRouterPath type to set custom path points';
    }

    if (args.points.length > 0) {
        path.setAutoRouting(false);
    } else {
        path.setAutoRouting(true);
    }

    // Convert args.points to array of [ArPoint] 's
    points = args.points.map(function (point) {
        return new ArPoint(point[0], point[1]);
    });

    path.setCustomPathPoints(points);
};

/**
 * Check that each path is registered under portId2Path for each start/end port.
 *
 * @return {undefined}
 */
AutoRouter.prototype._assertPortId2PathIsValid = function () {
    var id,
        path,
        j;
    for (var i = this.graph.paths.length; i--;) {
        path = this.graph.paths[i];
        for (j = path.startports.length; j--;) {
            id = path.startports[j].id;
            assert(this.portId2Path[id].out.indexOf(path) !== -1,
                'Port ' + id + ' is missing registered startport for ' + path.id);
        }

        for (j = path.endports.length; j--;) {
            id = path.endports[j].id;
            assert(this.portId2Path[id].in.indexOf(path) !== -1,
                'Port ' + id + ' is missing registered endport for ' + path.id);
        }
    }
};

module.exports = AutoRouter;

},{"./AutoRouter.Box":10,"./AutoRouter.Constants":11,"./AutoRouter.Graph":14,"./AutoRouter.Path":16,"./AutoRouter.Point":17,"./AutoRouter.Port":19,"./AutoRouter.Rect":20,"./AutoRouter.Utils":22,"assert":1}]},{},[9])(9)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9kZWJ1Zy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2RlYnVnL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2RlYnVnL25vZGVfbW9kdWxlcy9tcy9pbmRleC5qcyIsInNyYy9BdXRvUm91dGVyLkFjdGlvbkFwcGxpZXIuanMiLCJzcmMvQXV0b1JvdXRlci5Cb3guanMiLCJzcmMvQXV0b1JvdXRlci5Db25zdGFudHMuanMiLCJzcmMvQXV0b1JvdXRlci5FZGdlLmpzIiwic3JjL0F1dG9Sb3V0ZXIuRWRnZUxpc3QuanMiLCJzcmMvQXV0b1JvdXRlci5HcmFwaC5qcyIsInNyYy9BdXRvUm91dGVyLkxvZ2dlci5qcyIsInNyYy9BdXRvUm91dGVyLlBhdGguanMiLCJzcmMvQXV0b1JvdXRlci5Qb2ludC5qcyIsInNyYy9BdXRvUm91dGVyLlBvaW50TGlzdC5qcyIsInNyYy9BdXRvUm91dGVyLlBvcnQuanMiLCJzcmMvQXV0b1JvdXRlci5SZWN0LmpzIiwic3JjL0F1dG9Sb3V0ZXIuU2l6ZS5qcyIsInNyYy9BdXRvUm91dGVyLlV0aWxzLmpzIiwic3JjL0F1dG9Sb3V0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2w1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyB3aGVuIHVzZWQgaW4gbm9kZSwgdGhpcyB3aWxsIGFjdHVhbGx5IGxvYWQgdGhlIHV0aWwgbW9kdWxlIHdlIGRlcGVuZCBvblxuLy8gdmVyc3VzIGxvYWRpbmcgdGhlIGJ1aWx0aW4gdXRpbCBtb2R1bGUgYXMgaGFwcGVucyBvdGhlcndpc2Vcbi8vIHRoaXMgaXMgYSBidWcgaW4gbm9kZSBtb2R1bGUgbG9hZGluZyBhcyBmYXIgYXMgSSBhbSBjb25jZXJuZWRcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcblxudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBzdGFja1N0YXJ0RnVuY3Rpb24ubmFtZTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGtleSwgdmFsdWUpIHtcbiAgaWYgKHV0aWwuaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnICsgdmFsdWU7XG4gIH1cbiAgaWYgKHV0aWwuaXNOdW1iZXIodmFsdWUpICYmICFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSB8fCB1dGlsLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodXRpbC5pc1N0cmluZyhzKSkge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuYWN0dWFsLCByZXBsYWNlciksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmV4cGVjdGVkLCByZXBsYWNlciksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKHV0aWwuaXNCdWZmZXIoYWN0dWFsKSAmJiB1dGlsLmlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIGlmIChhY3R1YWwubGVuZ3RoICE9IGV4cGVjdGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3R1YWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhY3R1YWxbaV0gIT09IGV4cGVjdGVkW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKCF1dGlsLmlzT2JqZWN0KGFjdHVhbCkgJiYgIXV0aWwuaXNPYmplY3QoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiKSB7XG4gIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGEpIHx8IHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHJldHVybiBmYWxzZTtcbiAgLy8gaWYgb25lIGlzIGEgcHJpbWl0aXZlLCB0aGUgb3RoZXIgbXVzdCBiZSBzYW1lXG4gIGlmICh1dGlsLmlzUHJpbWl0aXZlKGEpIHx8IHV0aWwuaXNQcmltaXRpdmUoYikpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgfVxuICB2YXIgYUlzQXJncyA9IGlzQXJndW1lbnRzKGEpLFxuICAgICAgYklzQXJncyA9IGlzQXJndW1lbnRzKGIpO1xuICBpZiAoKGFJc0FyZ3MgJiYgIWJJc0FyZ3MpIHx8ICghYUlzQXJncyAmJiBiSXNBcmdzKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGlmIChhSXNBcmdzKSB7XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiKTtcbiAgfVxuICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAga2IgPSBvYmplY3RLZXlzKGIpLFxuICAgICAga2V5LCBpO1xuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9IGVsc2UgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodXRpbC5pc1N0cmluZyhleHBlY3RlZCkpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsID0gZTtcbiAgfVxuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKCFzaG91bGRUaHJvdyAmJiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbdHJ1ZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW2ZhbHNlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikge3Rocm93IGVycjt9fTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwiLypqc2hpbnQgbm9kZTogdHJ1ZSovXG5cbi8qKlxuICogQGF1dGhvciBicm9sbGIgLyBodHRwczovL2dpdGh1Yi9icm9sbGJcbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQXV0b1JvdXRlciA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlcicpLFxuICAgIGFzc2VydCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5VdGlscycpLmFzc2VydDtcblxudmFyIEF1dG9Sb3V0ZXJBY3Rpb25BcHBsaWVyID0gZnVuY3Rpb24gKCkge1xufTtcblxuQXV0b1JvdXRlckFjdGlvbkFwcGxpZXIuQXV0b1JvdXRlciA9IEF1dG9Sb3V0ZXI7XG5cbkF1dG9Sb3V0ZXJBY3Rpb25BcHBsaWVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3BvcnRTZXBhcmF0b3IgPSB0aGlzLl9wb3J0U2VwYXJhdG9yIHx8ICdfeF8nO1xuICAgIHRoaXMuYXV0b3JvdXRlciA9IG5ldyBBdXRvUm91dGVyKCk7XG4gICAgdGhpcy5kZWJ1Z0FjdGlvblNlcXVlbmNlID0gJ1snO1xuICAgIHRoaXMuX2NsZWFyUmVjb3JkcygpO1xufTtcblxuQXV0b1JvdXRlckFjdGlvbkFwcGxpZXIucHJvdG90eXBlLl9jbGVhclJlY29yZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYXV0b3JvdXRlckJveGVzID0ge307ICAvLyBEZWZpbmUgY29udGFpbmVyIHRoYXQgd2lsbCBtYXAgb2JqK3N1YklEIC0+IGJveFxuICAgIHRoaXMuX2F1dG9yb3V0ZXJQb3J0cyA9IHt9OyAgLy8gTWFwcyBib3hJZHMgdG8gYW4gYXJyYXkgb2YgcG9ydCBpZHMgdGhhdCBoYXZlIGJlZW4gbWFwcGVkXG4gICAgdGhpcy5fYXV0b3JvdXRlclBhdGhzID0ge307XG4gICAgdGhpcy5fYXJQYXRoSWQyT3JpZ2luYWwgPSB7fTtcbn07XG5cbi8qKlxuICogUmVwbGFjZSBpZCBzdG9yZWQgYXQgdGhlIGdpdmVuIGluZGljZXMgb2YgdGhlIGFycmF5IHdpdGggdGhlIGl0ZW0gZnJvbSB0aGUgZGljdGlvbmFyeS5cbiAqXG4gKiBAcGFyYW0ge0RpY3Rpb25hcnl9IGRpY3Rpb25hcnlcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKiBAcGFyYW0ge0FycmF5PE51bWJlcj59IGluZGljZXNcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH1cbiAqL1xuQXV0b1JvdXRlckFjdGlvbkFwcGxpZXIucHJvdG90eXBlLl9sb29rdXBJdGVtID0gZnVuY3Rpb24gKGRpY3Rpb25hcnksIGFycmF5LCBpbmRpY2VzKSB7ICAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICB2YXIgaW5kZXgsXG4gICAgICAgIGlkO1xuXG4gICAgZm9yICh2YXIgaSA9IDI7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW5kZXggPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGlkID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICBhcnJheVtpbmRleF0gPSBkaWN0aW9uYXJ5W2lkXTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQWN0aW9uQXBwbGllci5wcm90b3R5cGUuX2ZpeEFyZ3MgPSBmdW5jdGlvbiAoY29tbWFuZCwgYXJncykge1xuICAgIHZhciBpZDtcbiAgICAvLyBGaXggYXJncywgaWYgbmVlZGVkXG4gICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgIGNhc2UgJ21vdmUnOiAgLy8gYXJnc1swXSBpcyBpZCBzaG91bGQgYmUgdGhlIGJveFxuICAgICAgICAgICAgdGhpcy5fbG9va3VwSXRlbSh0aGlzLl9hdXRvcm91dGVyQm94ZXMsIGFyZ3MsIDApO1xuICAgICAgICAgICAgYXJnc1swXSA9IGFyZ3NbMF0uYm94O1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnZ2V0UGF0aFBvaW50cyc6XG4gICAgICAgICAgICB0aGlzLl9sb29rdXBJdGVtKHRoaXMuX2F1dG9yb3V0ZXJQYXRocywgYXJncywgMCk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdzZXRQYXRoQ3VzdG9tUG9pbnRzJzpcbiAgICAgICAgICAgIGlkID0gYXJnc1swXS5wYXRoO1xuICAgICAgICAgICAgYXJnc1swXS5wYXRoID0gdGhpcy5fYXV0b3JvdXRlclBhdGhzW2lkXTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ3NldEJveFJlY3QnOlxuICAgICAgICAgICAgdGhpcy5fbG9va3VwSXRlbSh0aGlzLl9hdXRvcm91dGVyQm94ZXMsIGFyZ3MsIDApO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnZ2V0Qm94UmVjdCc6XG4gICAgICAgICAgICB0aGlzLl9sb29rdXBJdGVtKHRoaXMuX2F1dG9yb3V0ZXJCb3hlcywgYXJncywgMCk7XG4gICAgICAgICAgICBhcmdzWzBdID0gYXJnc1swXS5ib3guaWQ7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICd1cGRhdGVQb3J0JzpcbiAgICAgICAgICAgIHRoaXMuX2xvb2t1cEl0ZW0odGhpcy5fYXV0b3JvdXRlckJveGVzLCBhcmdzLCAwKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ3NldENvbXBvbmVudCc6XG4gICAgICAgICAgICB0aGlzLl9sb29rdXBJdGVtKHRoaXMuX2F1dG9yb3V0ZXJCb3hlcywgYXJncywgMCwgMSk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdhZGRQYXRoJzpcbiAgICAgICAgICAgIHRoaXMuX2ZpeFBvcnRBcmdzKGFyZ3NbMF0uc3JjLCBhcmdzWzBdLmRzdCk7XG4gICAgICAgICAgICBhcmdzLnBvcCgpOyAgLy8gUmVtb3ZlIHRoZSBjb25uZWN0aW9uIGlkXG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgICAgICAgdmFyIGl0ZW07XG5cbiAgICAgICAgICAgIGlkID0gYXJnc1swXTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9hdXRvcm91dGVyQm94ZXNbaWRdKSB7XG4gICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1tpZF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2F1dG9yb3V0ZXJQYXRoc1tpZF0pIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5fYXV0b3JvdXRlclBhdGhzW2lkXTsgIC8vIElmIG9iaklkIGlzIGEgY29ubmVjdGlvblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmdzWzBdID0gaXRlbTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2FkZEJveCc6XG4gICAgICAgICAgICBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxufTtcblxuQXV0b1JvdXRlckFjdGlvbkFwcGxpZXIucHJvdG90eXBlLl9maXhQb3J0QXJncyA9IGZ1bmN0aW9uIChwb3J0MSwgcG9ydDIpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgdmFyIHBvcnRJZCxcbiAgICAgICAgcG9ydElkcyxcbiAgICAgICAgYXJQb3J0SWQsXG4gICAgICAgIGJveElkLFxuICAgICAgICBwb3J0cztcblxuICAgIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHBvcnRzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBwb3J0SWRzID0gT2JqZWN0LmtleXMocG9ydHMpO1xuICAgICAgICBmb3IgKHZhciBqID0gcG9ydElkcy5sZW5ndGg7IGotLTspIHtcbiAgICAgICAgICAgIHBvcnRJZCA9IHBvcnRJZHNbal07XG4gICAgICAgICAgICBib3hJZCA9IHBvcnRzW3BvcnRJZF07XG5cbiAgICAgICAgICAgIGFyUG9ydElkID0gdGhpcy5hdXRvcm91dGVyLmdldFBvcnRJZChwb3J0SWQsIHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1tib3hJZF0pO1xuICAgICAgICAgICAgcG9ydHNbcG9ydElkXSA9IHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1tib3hJZF0ucG9ydHNbYXJQb3J0SWRdO1xuICAgICAgICAgICAgYXNzZXJ0KHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1tib3hJZF0ucG9ydHNbYXJQb3J0SWRdLCAnQVIgUG9ydCBub3QgZm91bmQhJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIEludm9rZSBhbiBBdXRvUm91dGVyIG1ldGhvZC4gVGhpcyBhbGxvd3MgdGhlIGFjdGlvbiB0byBiZSBsb2dnZWQgYW5kIGJ1Z3MgcmVwbGljYXRlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtIHtBcnJheX0gYXJnc1xuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyQWN0aW9uQXBwbGllci5wcm90b3R5cGUuX2ludm9rZUF1dG9Sb3V0ZXJNZXRob2QgPSBmdW5jdGlvbiAoY29tbWFuZCwgYXJncykge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbnZva2VBdXRvUm91dGVyTWV0aG9kVW5zYWZlKGNvbW1hbmQsIGFyZ3MpO1xuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignQXV0b1JvdXRlci4nICsgY29tbWFuZCArICcgZmFpbGVkIHdpdGggZXJyb3I6ICcgKyBlKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQWN0aW9uQXBwbGllci5wcm90b3R5cGUuX2ludm9rZUF1dG9Sb3V0ZXJNZXRob2RVbnNhZmUgPSBmdW5jdGlvbiAoY29tbWFuZCwgYXJncykge1xuICAgIHZhciByZXN1bHQsXG4gICAgICAgIG9sZEFyZ3MgPSBhcmdzLnNsaWNlKCk7XG5cbiAgICBpZiAodGhpcy5fcmVjb3JkQWN0aW9ucykge1xuICAgICAgICB0aGlzLl9yZWNvcmRBY3Rpb24oY29tbWFuZCwgYXJncy5zbGljZSgpKTtcbiAgICB9XG5cbiAgICAvLyBTb21lIGFyZ3VtZW50cyBhcmUgc2ltcGx5IGlkcyBmb3IgZWFzaWVyIHJlY29yZGluZ1xuICAgIHRoaXMuX2ZpeEFyZ3MoY29tbWFuZCwgYXJncyk7XG5cbiAgICByZXN1bHQgPSB0aGlzLmF1dG9yb3V0ZXJbY29tbWFuZF0uYXBwbHkodGhpcy5hdXRvcm91dGVyLCBhcmdzKTtcbiAgICB0aGlzLl91cGRhdGVSZWNvcmRzKGNvbW1hbmQsIG9sZEFyZ3MsIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkF1dG9Sb3V0ZXJBY3Rpb25BcHBsaWVyLnByb3RvdHlwZS5fdXBkYXRlUmVjb3JkcyA9IGZ1bmN0aW9uIChjb21tYW5kLCBpbnB1dCwgcmVzdWx0KSB7XG4gICAgYXNzZXJ0IChpbnB1dCBpbnN0YW5jZW9mIEFycmF5KTtcbiAgICB2YXIgaWQsXG4gICAgICAgIGFyZ3MgPSBpbnB1dC5zbGljZSgpLFxuICAgICAgICBpO1xuXG4gICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgIGNhc2UgJ2FkZFBhdGgnOlxuICAgICAgICAgICAgaWQgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5fYXV0b3JvdXRlclBhdGhzW2lkXSA9IHJlc3VsdDtcbiAgICAgICAgICAgIHRoaXMuX2FyUGF0aElkMk9yaWdpbmFsW3Jlc3VsdF0gPSBpZDtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2FkZEJveCc6XG4gICAgICAgICAgICBpZCA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB0aGlzLl9hdXRvcm91dGVyQm94ZXNbaWRdID0gcmVzdWx0O1xuXG4gICAgICAgICAgICAvLyBBZGQgcG9ydHNcbiAgICAgICAgICAgIHRoaXMuX2F1dG9yb3V0ZXJQb3J0c1tpZF0gPSBbXTtcbiAgICAgICAgICAgIHZhciBpZHMgPSBPYmplY3Qua2V5cyhyZXN1bHQucG9ydHMpO1xuICAgICAgICAgICAgZm9yIChpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2F1dG9yb3V0ZXJQb3J0c1tpZF0ucHVzaChyZXN1bHQucG9ydHNbaWRzW2ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgICAgICAgaWQgPSBhcmdzWzBdO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1tpZF0pIHtcbiAgICAgICAgICAgICAgICBpID0gdGhpcy5fYXV0b3JvdXRlclBvcnRzW2lkXSA/IHRoaXMuX2F1dG9yb3V0ZXJQb3J0c1tpZF0ubGVuZ3RoIDogMDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3J0SWQgPSBpZCArIHRoaXMuX3BvcnRTZXBhcmF0b3IgKyB0aGlzLl9hdXRvcm91dGVyUG9ydHNbaWRdW2ldOyAvL0lEIG9mIGNoaWxkIHBvcnRcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F1dG9yb3V0ZXJCb3hlc1twb3J0SWRdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9hdXRvcm91dGVyQm94ZXNbaWRdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9hdXRvcm91dGVyUG9ydHNbaWRdO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2F1dG9yb3V0ZXJQYXRoc1tpZF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJJZCA9IHRoaXMuX2F1dG9yb3V0ZXJQYXRoc1tpZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F1dG9yb3V0ZXJQYXRoc1tpZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2FyUGF0aElkMk9yaWdpbmFsW2FySWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnc2V0Q29tcG9uZW50JzpcbiAgICAgICAgICAgIHZhciBsZW4sXG4gICAgICAgICAgICAgICAgc3ViQ29tcElkO1xuXG4gICAgICAgICAgICBpZCA9IGFyZ3NbMF07XG4gICAgICAgICAgICBsZW4gPSBpZC5sZW5ndGggKyB0aGlzLl9wb3J0U2VwYXJhdG9yLmxlbmd0aDtcbiAgICAgICAgICAgIHN1YkNvbXBJZCA9IGFyZ3NbMV0uc3Vic3RyaW5nKGxlbik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdXRvcm91dGVyUG9ydHNbaWRdLmluZGV4T2Yoc3ViQ29tcElkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdXRvcm91dGVyUG9ydHNbaWRdLnB1c2goc3ViQ29tcElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ3VwZGF0ZVBvcnQnOlxuICAgICAgICAgICAgaWQgPSBhcmdzWzFdLmlkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGQgdGhlIGdpdmVuIGFjdGlvbiB0byB0aGUgY3VycmVudCBzZXF1ZW5jZSBvZiBhdXRvcm91dGVyIGNvbW1hbmRzLlxuICpcbiAqIEBwYXJhbSBvYmpJZFxuICogQHBhcmFtIHN1YkNvbXBJZFxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyQWN0aW9uQXBwbGllci5wcm90b3R5cGUuX3JlY29yZEFjdGlvbiA9IGZ1bmN0aW9uIChjb21tYW5kLCBhcmdzKSB7XG5cbiAgICB2YXIgYWN0aW9uID0ge2FjdGlvbjogY29tbWFuZCwgYXJnczogYXJnc30sXG4gICAgICAgIGNpcmN1bGFyRml4ZXIgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLm93bmVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmlkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICB0aGlzLmRlYnVnQWN0aW9uU2VxdWVuY2UgKz0gSlNPTi5zdHJpbmdpZnkoYWN0aW9uLCBjaXJjdWxhckZpeGVyKSArICcsJztcbn07XG5cbkF1dG9Sb3V0ZXJBY3Rpb25BcHBsaWVyLnByb3RvdHlwZS5fZ2V0QWN0aW9uU2VxdWVuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5kZWJ1Z0FjdGlvblNlcXVlbmNlLmxhc3RJbmRleE9mKCcsJyksXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuZGVidWdBY3Rpb25TZXF1ZW5jZS5zdWJzdHJpbmcoMCwgaW5kZXgpICsgJ10nO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b1JvdXRlckFjdGlvbkFwcGxpZXI7XG4iLCIvKmpzaGludCBub2RlOiB0cnVlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpLFxuICAgIENPTlNUQU5UUyA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Db25zdGFudHMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5VdGlscycpLFxuICAgIEFyUG9pbnQgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUG9pbnQnKSxcbiAgICBBclJlY3QgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUmVjdCcpLFxuICAgIEF1dG9Sb3V0ZXJQb3J0ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBvcnQnKTtcblxuXG52YXIgQXV0b1JvdXRlckJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm93bmVyID0gbnVsbDtcbiAgICB0aGlzLnJlY3QgPSBuZXcgQXJSZWN0KCk7XG4gICAgdGhpcy5hdG9taWMgPSBmYWxzZTtcbiAgICB0aGlzLnNlbGZQb2ludHMgPSBbXTtcbiAgICB0aGlzLnBvcnRzID0gW107XG4gICAgdGhpcy5jaGlsZEJveGVzID0gW107Ly9kZXBlbmRlbnQgYm94ZXNcbiAgICB0aGlzLnBhcmVudCA9IG51bGw7XG4gICAgdGhpcy5pZCA9IG51bGw7XG5cbiAgICB0aGlzLmNhbGN1bGF0ZVNlbGZQb2ludHMoKTsgLy9QYXJ0IG9mIGluaXRpYWxpemF0aW9uXG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5jYWxjdWxhdGVTZWxmUG9pbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VsZlBvaW50cyA9IFtdO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5nZXRUb3BMZWZ0KCkpKTtcblxuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5yaWdodCwgdGhpcy5yZWN0LmNlaWwpKTtcbiAgICB0aGlzLnNlbGZQb2ludHMucHVzaChuZXcgQXJQb2ludCh0aGlzLnJlY3QucmlnaHQsIHRoaXMucmVjdC5mbG9vcikpO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5sZWZ0LCB0aGlzLnJlY3QuZmxvb3IpKTtcbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLmRlbGV0ZUFsbFBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnBvcnRzW2ldLmRlc3Ryb3koKTtcbiAgICB9XG5cbiAgICB0aGlzLnBvcnRzID0gW107XG5cbiAgICB0aGlzLmF0b21pYyA9IGZhbHNlO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuaGFzT3duZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXIgIT09IG51bGw7XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5jcmVhdGVQb3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3J0ID0gbmV3IEF1dG9Sb3V0ZXJQb3J0KCk7XG4gICAgYXNzZXJ0KHBvcnQgIT09IG51bGwsICdBUkJveC5jcmVhdGVQb3J0OiBwb3J0ICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgcmV0dXJuIHBvcnQ7XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5oYXNOb1BvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMucG9ydHMubGVuZ3RoID09PSAwO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuaXNBdG9taWMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXRvbWljO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuYWRkUG9ydCA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgYXNzZXJ0KHBvcnQgIT09IG51bGwsICdBUkJveC5hZGRQb3J0OiBwb3J0ICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgcG9ydC5vd25lciA9IHRoaXM7XG4gICAgdGhpcy5wb3J0cy5wdXNoKHBvcnQpO1xuXG4gICAgaWYgKHRoaXMub3duZXIpIHsgIC8vIE5vdCBwb2ludGluZyB0byB0aGUgQVJHcmFwaFxuICAgICAgICB0aGlzLm93bmVyLl9hZGRFZGdlcyhwb3J0KTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5kZWxldGVQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICBhc3NlcnQocG9ydCAhPT0gbnVsbCwgJ0FSQm94LmRlbGV0ZVBvcnQ6IHBvcnQgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgaWYgKHBvcnQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpbmRleCA9IHRoaXMucG9ydHMuaW5kZXhPZihwb3J0KSxcbiAgICAgICAgZ3JhcGggPSB0aGlzLm93bmVyO1xuXG4gICAgYXNzZXJ0KGluZGV4ICE9PSAtMSwgJ0FSQm94LmRlbGV0ZVBvcnQ6IGluZGV4ICE9PSAtMSBGQUlMRUQnKTtcblxuICAgIGdyYXBoLmRlbGV0ZUVkZ2VzKHBvcnQpO1xuICAgIHRoaXMucG9ydHMuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgIHRoaXMuYXRvbWljID0gZmFsc2U7XG5cbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLmlzUmVjdEVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnJlY3QuaXNSZWN0RW1wdHkoKTtcbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLnNldFJlY3QgPSBmdW5jdGlvbiAocikge1xuICAgIGFzc2VydChyIGluc3RhbmNlb2YgQXJSZWN0LCAnSW52YWx0aGlzLmlkIGFyZyBpbiBBUkJveC5zZXRSZWN0LiBSZXF1aXJlcyBBclJlY3QnKTtcblxuICAgIGFzc2VydChyLmdldFdpZHRoKCkgPj0gMyAmJiByLmdldEhlaWdodCgpID49IDMsXG4gICAgICAgICdBUkJveC5zZXRSZWN0OiByLmdldFdpZHRoKCkgPj0gMyAmJiByLmdldEhlaWdodCgpID49IDMgRkFJTEVEIScpO1xuXG4gICAgYXNzZXJ0KHIuZ2V0VG9wTGVmdCgpLnggPj0gQ09OU1RBTlRTLkVEX01JTkNPT1JEICYmIHIuZ2V0VG9wTGVmdCgpLnkgPj0gQ09OU1RBTlRTLkVEX01JTkNPT1JELFxuICAgICAgICAnQVJCb3guc2V0UmVjdDogci5nZXRUb3BMZWZ0KCkueCA+PSBDT05TVEFOVFMuRURfTUlOQ09PUkQgJiYgci5nZXRUb3BMZWZ0KCkueSA+PSAnICtcbiAgICAgICAgJ0NPTlNUQU5UUy5FRF9NQVhDT09SRCBGQUlMRUQhJyk7XG5cbiAgICBhc3NlcnQoci5nZXRCb3R0b21SaWdodCgpLnggPD0gQ09OU1RBTlRTLkVEX01BWENPT1JEICYmIHIuZ2V0Qm90dG9tUmlnaHQoKS55IDw9IENPTlNUQU5UUy5FRF9NQVhDT09SRCxcbiAgICAgICAgJ0FSQm94LnNldFJlY3Q6ICByLmdldEJvdHRvbVJpZ2h0KCkueCA8PSBDT05TVEFOVFMuRURfTUFYQ09PUkQgJiYgci5nZXRCb3R0b21SaWdodCgpLnkgPD0gJyArXG4gICAgICAgICdDT05TVEFOVFMuRURfTUFYQ09PUkQgRkFJTEVEIScpO1xuXG4gICAgYXNzZXJ0KHRoaXMucG9ydHMubGVuZ3RoID09PSAwIHx8IHRoaXMuYXRvbWljLFxuICAgICAgICAnQVJCb3guc2V0UmVjdDogdGhpcy5wb3J0cy5sZW5ndGggPT09IDAgfHwgdGhpcy5hdG9taWMgRkFJTEVEIScpO1xuXG4gICAgdGhpcy5yZWN0LmFzc2lnbihyKTtcbiAgICB0aGlzLmNhbGN1bGF0ZVNlbGZQb2ludHMoKTtcblxuICAgIGlmICh0aGlzLmF0b21pYykge1xuICAgICAgICBhc3NlcnQodGhpcy5wb3J0cy5sZW5ndGggPT09IDEsICdBUkJveC5zZXRSZWN0OiB0aGlzLnBvcnRzLmxlbmd0aCA9PT0gMSBGQUlMRUQhJyk7XG4gICAgICAgIHRoaXMucG9ydHNbMF0uc2V0UmVjdChyKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5zaGlmdEJ5ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIHRoaXMucmVjdC5hZGQob2Zmc2V0KTtcblxuICAgIHZhciBpID0gdGhpcy5wb3J0cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICB0aGlzLnBvcnRzW2ldLnNoaWZ0Qnkob2Zmc2V0KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICBUaGlzIGlzIG5vdCBuZWNlc3Nhcnk7IHRoZSBBUkdyYXBoIHdpbGwgc2hpZnQgYWxsIGNoaWxkcmVuXG4gICAgIGkgPSB0aGlzLmNoaWxkQm94ZXMubGVuZ3RoO1xuICAgICB3aGlsZShpLS0pe1xuICAgICB0aGlzLmNoaWxkQm94ZXNbaV0uc2hpZnRCeShvZmZzZXQpO1xuICAgICB9XG4gICAgICovXG4gICAgdGhpcy5jYWxjdWxhdGVTZWxmUG9pbnRzKCk7XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5yZXNldFBvcnRBdmFpbGFiaWxpdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMucG9ydHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHRoaXMucG9ydHNbaV0ucmVzZXRBdmFpbGFibGVBcmVhKCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuYWRqdXN0UG9ydEF2YWlsYWJpbGl0eSA9IGZ1bmN0aW9uIChib3gpIHtcbiAgICBpZiAoIWJveC5oYXNBbmNlc3RvcldpdGhJZCh0aGlzLmlkKSAmJiAgIC8vIEJveGVzIGFyZSBub3QgZGVwZW5kZW50IG9uIG9uZSBhbm90aGVyXG4gICAgICAgICF0aGlzLmhhc0FuY2VzdG9yV2l0aElkKGJveC5pZCkpIHtcblxuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5wb3J0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgICAgIHRoaXMucG9ydHNbaV0uYWRqdXN0QXZhaWxhYmxlQXJlYShib3gucmVjdCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uIChib3gpIHtcbiAgICBhc3NlcnQodGhpcy5jaGlsZEJveGVzLmluZGV4T2YoYm94KSA9PT0gLTEsXG4gICAgICAgICdBUkJveC5hZGRDaGlsZDogYm94IGFscmVhZHkgaXMgY2hpbGQgb2YgJyArIHRoaXMuaWQpO1xuICAgIGFzc2VydChib3ggaW5zdGFuY2VvZiBBdXRvUm91dGVyQm94LFxuICAgICAgICAnQ2hpbGQgYm94IG11c3QgYmUgb2YgdHlwZSBBdXRvUm91dGVyQm94Jyk7XG5cbiAgICB0aGlzLmNoaWxkQm94ZXMucHVzaChib3gpO1xuICAgIGJveC5wYXJlbnQgPSB0aGlzO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUucmVtb3ZlQ2hpbGQgPSBmdW5jdGlvbiAoYm94KSB7XG4gICAgdmFyIGkgPSB0aGlzLmNoaWxkQm94ZXMuaW5kZXhPZihib3gpO1xuICAgIGFzc2VydChpICE9PSAtMSwgJ0FSQm94LnJlbW92ZUNoaWxkOiBib3ggaXNuXFwndCBjaGlsZCBvZiAnICsgdGhpcy5pZCk7XG4gICAgdGhpcy5jaGlsZEJveGVzLnNwbGljZShpLCAxKTtcbiAgICBib3gucGFyZW50ID0gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLmhhc0FuY2VzdG9yV2l0aElkID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIGJveCA9IHRoaXM7XG4gICAgd2hpbGUgKGJveCkge1xuICAgICAgICBpZiAoYm94LmlkID09PSBpZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgYm94ID0gYm94LnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuZ2V0Um9vdEJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm94ID0gdGhpcztcbiAgICB3aGlsZSAoYm94LnBhcmVudCkge1xuICAgICAgICBib3ggPSBib3gucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gYm94O1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuaXNCb3hBdCA9IGZ1bmN0aW9uIChwb2ludCwgbmVhcm5lc3MpIHtcbiAgICByZXR1cm4gVXRpbHMuaXNQb2ludEluKHBvaW50LCB0aGlzLnJlY3QsIG5lYXJuZXNzKTtcbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLmlzQm94Q2xpcCA9IGZ1bmN0aW9uIChyKSB7XG4gICAgcmV0dXJuIFV0aWxzLmlzUmVjdENsaXAodGhpcy5yZWN0LCByKTtcbn07XG5cbkF1dG9Sb3V0ZXJCb3gucHJvdG90eXBlLmlzQm94SW4gPSBmdW5jdGlvbiAocikge1xuICAgIHJldHVybiBVdGlscy5pc1JlY3RJbih0aGlzLnJlY3QsIHIpO1xufTtcblxuQXV0b1JvdXRlckJveC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaSA9IHRoaXMuY2hpbGRCb3hlcy5sZW5ndGg7XG5cbiAgICAvL25vdGlmeSB0aGlzLnBhcmVudCBvZiBkZXN0cnVjdGlvblxuICAgIC8vaWYgdGhlcmUgaXMgYSB0aGlzLnBhcmVudCwgb2YgY291cnNlXG4gICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICAgIHRoaXMucGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMub3duZXIgPSBudWxsO1xuICAgIHRoaXMuZGVsZXRlQWxsUG9ydHMoKTtcblxuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgdGhpcy5jaGlsZEJveGVzW2ldLmRlc3Ryb3koKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyQm94LnByb3RvdHlwZS5hc3NlcnRWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBwID0gdGhpcy5wb3J0cy5sZW5ndGg7IHAtLTspIHtcbiAgICAgICAgdGhpcy5wb3J0c1twXS5hc3NlcnRWYWxpZCgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b1JvdXRlckJveDtcbiIsIi8qanNoaW50IG5vZGU6IHRydWUsIGJpdHdpc2U6IGZhbHNlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcbnZhciBBclBvaW50ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBvaW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEVNUFRZX1BPSU5UOiBuZXcgQXJQb2ludCgtMTAwMDAwLCAtMTAwMDAwKSxcbiAgICBFRF9NQVhDT09SRDogMTAwMDAwLFxuICAgIEVEX01JTkNPT1JEOiAtMiwvL1RoaXMgYWxsb3dzIGNvbm5lY3Rpb25zIHRvIGJlIHN0aWxsIGJlIGRyYXcgd2hlbiBib3ggaXMgcHJlc3NlZCBhZ2FpbnN0IHRoZSBlZGdlXG4gICAgRURfU01BTExHQVA6IDE1LFxuICAgIENPTk5FQ1RJT05DVVNUT01JWkFUSU9OREFUQVZFUlNJT046IDAsXG4gICAgRU1QVFlDT05ORUNUSU9OQ1VTVE9NSVpBVElPTkRBVEFNQUdJQzogLTEsXG4gICAgREVCVUc6IGZhbHNlLFxuICAgIEJVRkZFUjogMTAsXG5cbiAgICBFRExTX1M6IDE1LC8vRURfU01BTExHQVBcbiAgICBFRExTX1I6IDE1ICsgMSwgLy9FRF9TTUFMTEdBUCsxXG4gICAgRURMU19EOiAxMDAwMDAgKyAyLC8vRURfTUFYQ09PUkQgLSBFRF9NSU5DT09SRCxcblxuICAgIFBhdGhFbmRPbkRlZmF1bHQ6IDB4MDAwMCxcbiAgICBQYXRoRW5kT25Ub3A6IDB4MDAxMCxcbiAgICBQYXRoRW5kT25SaWdodDogMHgwMDIwLFxuICAgIFBhdGhFbmRPbkJvdHRvbTogMHgwMDQwLFxuICAgIFBhdGhFbmRPbkxlZnQ6IDB4MDA4MCxcbiAgICBQYXRoRW5kTWFzazogKDB4MDAxMCB8IDB4MDAyMCB8IDB4MDA0MCB8IDB4MDA4MCksXG4gICAgLy8gKFBhdGhFbmRPblRvcCB8IFBhdGhFbmRPblJpZ2h0IHwgUGF0aEVuZE9uQm90dG9tIHwgUGF0aEVuZE9uTGVmdCksXG5cbiAgICBQYXRoU3RhcnRPbkRlZmF1bHQ6IDB4MDAwMCxcbiAgICBQYXRoU3RhcnRPblRvcDogMHgwMTAwLFxuICAgIFBhdGhTdGFydE9uUmlnaHQ6IDB4MDIwMCxcbiAgICBQYXRoU3RhcnRPbkJvdHRvbTogMHgwNDAwLFxuICAgIFBhdGhTdGFydE9uTGVmdDogMHgwODAwLFxuICAgIFBhdGhTdGFydE1hc2s6ICgweDAxMDAgfCAweDAyMDAgfCAweDA0MDAgfCAweDA4MDApLFxuICAgIC8vIChQYXRoU3RhcnRPblRvcCB8IFBhdGhTdGFydE9uUmlnaHQgfCBQYXRoU3RhcnRPbkJvdHRvbSB8IFBhdGhTdGFydE9uTGVmdCksXG5cbiAgICBQYXRoSGlnaExpZ2h0ZWQ6IDB4MDAwMixcdFx0Ly8gYXR0cmlidXRlcyxcbiAgICBQYXRoRml4ZWQ6IDB4MDAwMSxcbiAgICBQYXRoRGVmYXVsdDogMHgwMDAwLFxuXG4gICAgUGF0aFN0YXRlQ29ubmVjdGVkOiAweDAwMDEsXHRcdC8vIHN0YXRlcyxcbiAgICBQYXRoU3RhdGVEZWZhdWx0OiAweDAwMDAsXG5cbiAgICAvLyBQb3J0IENvbm5lY3Rpb24gVmFyaWFibGVzXG4gICAgUG9ydEVuZE9uVG9wOiAweDAwMDEsXG4gICAgUG9ydEVuZE9uUmlnaHQ6IDB4MDAwMixcbiAgICBQb3J0RW5kT25Cb3R0b206IDB4MDAwNCxcbiAgICBQb3J0RW5kT25MZWZ0OiAweDAwMDgsXG4gICAgUG9ydEVuZE9uQWxsOiAweDAwMEYsXG5cbiAgICBQb3J0U3RhcnRPblRvcDogMHgwMDEwLFxuICAgIFBvcnRTdGFydE9uUmlnaHQ6IDB4MDAyMCxcbiAgICBQb3J0U3RhcnRPbkJvdHRvbTogMHgwMDQwLFxuICAgIFBvcnRTdGFydE9uTGVmdDogMHgwMDgwLFxuICAgIFBvcnRTdGFydE9uQWxsOiAweDAwRjAsXG5cbiAgICBQb3J0Q29ubmVjdE9uQWxsOiAweDAwRkYsXG4gICAgUG9ydENvbm5lY3RUb0NlbnRlcjogMHgwMTAwLFxuXG4gICAgUG9ydFN0YXJ0RW5kSG9yaXpvbnRhbDogMHgwMEFBLFxuICAgIFBvcnRTdGFydEVuZFZlcnRpY2FsOiAweDAwNTUsXG5cbiAgICBQb3J0RGVmYXVsdDogMHgwMEZGLFxuXG4gICAgLy8gUm91dGluZ0RpcmVjdGlvbiB2YXJzIFxuICAgIERpck5vbmU6IC0xLFxuICAgIERpclRvcDogMCxcbiAgICBEaXJSaWdodDogMSxcbiAgICBEaXJCb3R0b206IDIsXG4gICAgRGlyTGVmdDogMyxcbiAgICBEaXJTa2V3OiA0LFxuXG4gICAgLy9QYXRoIEN1c3RvbSBEYXRhXG4gICAgU2ltcGxlRWRnZURpc3BsYWNlbWVudDogJ0VkZ2VEaXNwbGFjZW1lbnQnLFxuICAgIEN1c3RvbVBvaW50Q3VzdG9taXphdGlvbjogJ1BvaW50Q3VzdG9taXphdGlvbidcbiAgICAvL0NPTk5FQ1RJT05DVVNUT01JWkFUSU9OREFUQVZFUlNJT04gOiBudWxsXG59O1xuIiwiLypnbG9iYWxzIGRlZmluZSovXG4vKmpzaGludCBub2RlOiB0cnVlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpLFxuICAgIENPTlNUQU5UUyA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Db25zdGFudHMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5VdGlscycpLFxuICAgIEFyUG9pbnQgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUG9pbnQnKTtcblxudmFyIEF1dG9Sb3V0ZXJFZGdlID0gZnVuY3Rpb24gKCkge1xuICAgIC8qXG4gICAgIEluIHRoaXMgc2VjdGlvbiBldmVyeSBjb21tZW50IHJlZmVyIHRvIHRoZSBob3Jpem9udGFsIGNhc2UsIHRoYXQgaXMsIGVhY2hcdGVkZ2UgaXNcbiAgICAgaG9yaXpvbnRhbC5cbiAgICAgKi9cblxuICAgIC8qXG4gICAgICogVE9ETyBVcGRhdGUgdGhpcyBjb21tZW50XG4gICAgICpcbiAgICAgRXZlcnkgQ0F1dG9Sb3V0ZXJFZGdlIGJlbG9uZ3MgdG8gYW4gZWRnZSBvZiBhIENBdXRvUm91dGVyUGF0aCwgQ0F1dG9Sb3V0ZXJCb3ggb3IgQ0F1dG9Sb3V0ZXJQb3J0LiBUaGlzIGVkZ2UgaXNcbiAgICAgUmVwcmVzZW50ZWQgYnkgYSBDQXV0b1JvdXRlclBvaW50IHdpdGggaXRzIG5leHQgcG9pbnQuIFRoZSB2YXJpYWJsZSAncG9pbnQnIHdpbGwgcmVmZXJcbiAgICAgdG8gdGhpcyBDQXV0b1JvdXRlclBvaW50LlxuXG4gICAgIFRoZSBjb29yZGluYXRlcyBvZiBhbiBlZGdlIGFyZSAneDEnLCAneDInIGFuZCAneScgd2hlcmUgeDEveDIgaXMgdGhlIHgtY29vcmRpbmF0ZVxuICAgICBvZiB0aGUgbGVmdC9yaWdodCBwb2ludCwgYW5kIHkgaXMgdGhlIGNvbW1vbiB5LWNvb3JkaW5hdGUgb2YgdGhlIHBvaW50cy5cblxuICAgICBUaGUgZWRnZXMgYXJlIG9yZGVyZWQgYWNjb3JkaW5nIHRvIHRoZWlyIHktY29vcmRpbmF0ZXMuIFRoZSBmaXJzdCBlZGdlIGhhc1xuICAgICB0aGUgbGVhc3QgeS1jb29yZGluYXRlICh0b3Btb3N0KSwgYW5kIGl0cyBwb2ludGVyIGlzIGluICdvcmRlckZpcnN0Jy5cbiAgICAgV2UgdXNlIHRoZSAnb3JkZXInIHByZWZpeCBpbiB0aGUgdmFyaWFibGUgbmFtZXMgdG8gcmVmZXIgdG8gdGhpcyBvcmRlci5cblxuICAgICBXZSB3aWxsIHdhbGsgZnJvbSB0b3AgdG8gYm90dG9tIChmcm9tIHRoZSAnb3JkZXJGaXJzdCcgYWxvbmcgdGhlICd0aGlzLm9yZGVyTmV4dCcpLlxuICAgICBXZSBrZWVwIHRyYWNrIGEgJ3NlY3Rpb24nIG9mIHNvbWUgZWRnZXMuIElmIHdlIGhhdmUgYW4gaW5maW5pdGUgaG9yaXpvbnRhbCBsaW5lLFxuICAgICB0aGVuIHRoZSBzZWN0aW9uIGNvbnNpc3RzIG9mIHRob3NlIGVkZ2VzIHRoYXQgYXJlIGFib3ZlIHRoZSBsaW5lIGFuZCBub3QgYmxvY2tlZFxuICAgICBieSBhbm90aGVyIGVkZ2Ugd2hpY2ggaXMgY2xvc2VyIHRvIHRoZSBsaW5lLiBFYWNoIGVkZ2UgaW4gdGhlIHNlY3Rpb24gaGFzXG4gICAgIGEgdmlld2FibGUgcG9ydGlvbiBmcm9tIHRoZSBsaW5lICh0aGUgbm90IGJsb2NrZWQgcG9ydGlvbikuIFRoZSBjb29yZGluYXRlc1xuICAgICBvZiB0aGlzIHBvcnRpb24gYXJlICd0aGlzLnNlY3Rpb25YMScgYW5kICd0aGlzLnNlY3Rpb25YMicuIFdlIGhhdmUgYW4gb3JkZXIgb2YgdGhlIGVkZ2VzXG4gICAgIGJlbG9uZ2luZyB0byB0aGUgY3VycmVudCBzZWN0aW9uLiBUaGUgJ3NlY3Rpb25fZmlyc3QnIHJlZmVycyB0byB0aGUgbGVmdG1vc3RcbiAgICAgZWRnZSBpbiB0aGUgc2VjdGlvbiwgd2hpbGUgdGhlICd0aGlzLnNlY3Rpb25OZXh0JyB0byB0aGUgbmV4dCBmcm9tIGxlZnQgdG8gcmlnaHQuXG5cbiAgICAgV2Ugc2F5IHRoYXQgdGhlIENBdXRvUm91dGVyRWRnZSBFMSAncHJlY2VkZScgdGhlIENBdXRvUm91dGVyRWRnZSBFMiBpZiB0aGVyZSBpcyBubyBvdGhlciBDQXV0b1JvdXRlckVkZ2Ugd2hpY2hcbiAgICAgdG90YWxseVx0YmxvY2tzIFMxIGZyb20gUzIuIFNvIGEgc2VjdGlvbiBjb25zaXN0cyBvZiB0aGUgcHJlY2VkaW5nIGVkZ2VzIG9mIGFuXG4gICAgIGluZmluaXRlIGVkZ2UuIFdlIHNheSB0aGF0IEUxIGlzICdhZGphY2VudCcgdG8gRTIsIGlmIEUxIGlzIHRoZSBuZWFyZXN0IGVkZ2VcbiAgICAgdG8gRTIgd2hpY2ggcHJlY2VkZSBpdC4gQ2xlYXJseSwgZXZlcnkgZWRnZSBoYXMgYXQgbW9zdCBvbmUgYWRqYWNlbnQgcHJlY2VkZW5jZS5cblxuICAgICBUaGUgZWRnZXMgb2YgYW55IENBdXRvUm91dGVyQm94IG9yIENBdXRvUm91dGVyUG9ydCBhcmUgZml4ZWQuIFdlIHdpbGwgY29udGludWFsbHkgZml4IHRoZSBlZGdlc1xuICAgICBvZiB0aGUgQ0F1dG9Sb3V0ZXJQYXRocy4gQnV0IGZpcnN0IHdlIG5lZWQgc29tZSBkZWZpbml0aW9uLlxuXG4gICAgIFdlIGNhbGwgYSBzZXQgb2YgZWRnZXMgYXMgYSAnYmxvY2snIGlmIHRoZSB0b3Btb3N0IChmaXJzdCkgYW5kIGJvdHRvbW1vc3QgKGxhc3QpXG4gICAgIGVkZ2VzIG9mIGl0IGFyZSBmaXhlZCB3aGlsZSB0aGUgZWRnZXMgYmV0d2VlbiB0aGVtIGFyZSBub3QuIEZ1cnRoZXJtb3JlLCBldmVyeVxuICAgICBlZGdlIGlzIGFkamFjZW50IHRvXHR0aGUgbmV4dCBvbmUgaW4gdGhlIG9yZGVyLiBFdmVyeSBlZGdlIGluIHRoZSBibG9jayBoYXMgYW5cbiAgICAgJ2luZGV4Jy4gVGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvbmUgKHRvcG1vc3QpIGlzIDAsIG9mIHRoZSBzZWNvbmQgaXMgMSwgYW5kIHNvIG9uLlxuICAgICBXZSBjYWxsIHRoZSBpbmRleCBvZiB0aGUgbGFzdCBlZGdlICgjIG9mIGVkZ2VzIC0gMSkgYXMgdGhlIGluZGV4IG9mIHRoZSBlbnRpcmUgYm94LlxuICAgICBUaGUgJ2RlcHRoJyBvZiBhIGJsb2NrIGlzIHRoZSBkaWZmZXJlbmNlIG9mIHRoZSB5LWNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBhbmQgbGFzdFxuICAgICBlZGdlcyBvZiBpdC4gVGhlICdnb2FsIGdhcCcgb2YgdGhlIGJsb2NrIGlzIHRoZSBxdW90aWVudCBvZiB0aGUgZGVwdGggYW5kIGluZGV4XG4gICAgIG9mIHRoZSBibG9jay4gSWYgdGhlIGRpZmZlcmVuY2Ugb2YgdGhlIHktY29vcmRpbmF0ZXMgb2YgdGhlIGFkamFjZW50IGVkZ2VzIGluXG4gICAgIHRoZSBibG9jayBhcmUgYWxsIGVxdWFsIHRvIHRoZSBnb2FsIGdhcCwgdGhlbiB3ZSBzYXkgdGhhdCB0aGUgYmxvY2sgaXMgZXZlbmx5XG4gICAgIGRpc3RyaWJ1dGVkLlxuXG4gICAgIFNvIHdlIHNlYXJjaCB0aGUgYmxvY2sgd2hpY2ggaGFzIG1pbmltYWwgZ29hbCBnYXAuIFRoZW4gaWYgaXQgaXMgbm90IGV2ZW5seVxuICAgICBkaXN0cmlidXRlZCwgdGhlbiB3ZSBzaGlmdCB0aGUgbm90IGZpeGVkIGVkZ2VzIHRvIHRoZSBkZXNpcmVkIHBvc2l0aW9uLiBJdCBpc1xuICAgICBub3QgaGFyZCB0byBzZWVcdHRoYXQgaWYgdGhlIGJsb2NrIGhhcyBtaW5pbWFsIGdvYWwgZ2FwIChhbW9uZyB0aGUgYWxsXG4gICAgIHBvc3NpYmlsaXRpZXMgb2YgYmxvY2tzKSwgdGhlbiBpbiB0aGlzIHdheSB3ZSBkbyBub3QgbW92ZSBhbnkgZWRnZXMgaW50byBib3hlcy5cbiAgICAgRmluYWxseSwgd2Ugc2V0IHRoZSAoaW5uZXIpIGVkZ2VzIG9mIHRoZSBibG9jayB0byBiZSBmaXhlZCAoZXhjZXB0IHRoZSB0b3Btb3N0IGFuZFxuICAgICBib3R0b21tb3N0IGVkZ2VzLCBzaW5jZSB0aGV5IGFyZSBhbHJlYWR5IGZpeGVkKS4gQW5kIHdlIGFnYWluIGJlZ2luIHRoZSBzZWFyY2guXG4gICAgIElmIGV2ZXJ5IGVkZ2UgaXMgZml4ZWQsIHRoZW4gd2UgaGF2ZSBmaW5pc2hlZC4gVGhpcyBpcyB0aGUgYmFzaWMgaWRlYS4gV2Ugd2lsbFxuICAgICByZWZpbmUgdGhpcyBhbGdvcml0aG0uXG5cbiAgICAgVGhlIHZhcmlhYmxlcyByZWxhdGVkIHRvIHRoZSBibG9ja3MgYXJlIHByZWZpeGVkIGJ5ICdibG9jaycuIE5vdGUgdGhhdCB0aGVcbiAgICAgdmFyaWFibGVzIG9mIGFuIGVkZ2UgYXJlIHJlZmVyIHRvIHRoYXQgYmxvY2sgaW4gd2hpY2ggdGhpcyBlZGdlIGlzIGlubmVyISBUaGVcbiAgICAgJ2Jsb2NrX29sZGdhcCcgaXMgdGhlIGdvYWwgZ2FwIG9mIHRoZSBibG9jayB3aGVuIGl0IHdhcyBsYXN0IGV2ZW5seSBkaXN0cmlidXRlZC5cblxuICAgICBUaGUgdmFyaWFibGVzICdjYW5zdGFydCcgYW5kICdjYW5lbmQnIG1lYW5zIHRoYXQgdGhpcyBlZ2RlIGNhbiBzdGFydCBhbmQvb3IgZW5kXG4gICAgIGEgYmxvY2suIFRoZSB0b3AgZWRnZSBvZiBhIGJveCBvbmx5IGNhbmVuZCwgd2hpbGUgYSBmaXhlZCBlZGdlIG9mIGEgcGF0aCBjYW4gYm90aFxuICAgICBzdGFydCBhbmQgZW5kIG9mIGEgYmxvY2suXG5cbiAgICAgKi9cblxuICAgIHRoaXMub3duZXIgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRwb2ludFByZXYgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRwb2ludCA9IG51bGw7XG4gICAgdGhpcy5lbmRwb2ludCA9IG51bGw7XG4gICAgdGhpcy5lbmRwb2ludE5leHQgPSBudWxsO1xuXG4gICAgdGhpcy5wb3NpdGlvblkgPSAwO1xuICAgIHRoaXMucG9zaXRpb25YMSA9IDA7XG4gICAgdGhpcy5wb3NpdGlvblgyID0gMDtcbiAgICB0aGlzLmJyYWNrZXRDbG9zaW5nID0gZmFsc2U7XG4gICAgdGhpcy5icmFja2V0T3BlbmluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5vcmRlclByZXYgPSBudWxsO1xuICAgIHRoaXMub3JkZXJOZXh0ID0gbnVsbDtcblxuICAgIHRoaXMuc2VjdGlvblgxID0gbnVsbDtcbiAgICB0aGlzLnNlY3Rpb25YMiA9IG51bGw7XG4gICAgdGhpcy5zZWN0aW9uTmV4dCA9IG51bGw7XG4gICAgdGhpcy5zZWN0aW9uRG93biA9IG51bGw7XG5cbiAgICB0aGlzLmVkZ2VGaXhlZCA9IGZhbHNlO1xuICAgIHRoaXMuZWRnZUN1c3RvbUZpeGVkID0gZmFsc2U7XG4gICAgdGhpcy5lZGdlQ2FuUGFzc2VkID0gZmFsc2U7XG4gICAgdGhpcy5lZGdlRGlyZWN0aW9uID0gbnVsbDtcblxuICAgIHRoaXMuYmxvY2tQcmV2ID0gbnVsbDtcbiAgICB0aGlzLmJsb2NrTmV4dCA9IG51bGw7XG4gICAgdGhpcy5ibG9ja1RyYWNlID0gbnVsbDtcblxuICAgIHRoaXMuY2xvc2VzdFByZXYgPSBudWxsO1xuICAgIHRoaXMuY2xvc2VzdE5leHQgPSBudWxsO1xuXG59O1xuXG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5hc3NpZ24gPSBmdW5jdGlvbiAob3RoZXJFZGdlKSB7XG5cbiAgICBpZiAob3RoZXJFZGdlICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMub3duZXIgPSBvdGhlckVkZ2Uub3duZXI7XG4gICAgICAgIHRoaXMuc2V0U3RhcnRQb2ludChvdGhlckVkZ2Uuc3RhcnRwb2ludCwgZmFsc2UpO1xuXG4gICAgICAgIC8vT25seSBjYWxjdWxhdGVEaXJlY3Rpb24gaWYgdGhpcy5lbmRwb2ludCBpcyBub3QgbnVsbFxuICAgICAgICB0aGlzLnNldEVuZFBvaW50KG90aGVyRWRnZS5lbmRwb2ludCwgb3RoZXJFZGdlLmVuZHBvaW50ICE9PSBudWxsKTtcblxuICAgICAgICB0aGlzLnN0YXJ0cG9pbnRQcmV2ID0gb3RoZXJFZGdlLnN0YXJ0cG9pbnRQcmV2O1xuICAgICAgICB0aGlzLmVuZHBvaW50TmV4dCA9IG90aGVyRWRnZS5lbmRwb2ludE5leHQ7XG5cbiAgICAgICAgdGhpcy5wb3NpdGlvblkgPSBvdGhlckVkZ2UucG9zaXRpb25ZO1xuICAgICAgICB0aGlzLnBvc2l0aW9uWDEgPSBvdGhlckVkZ2UucG9zaXRpb25YMTtcbiAgICAgICAgdGhpcy5wb3NpdGlvblgyID0gb3RoZXJFZGdlLnBvc2l0aW9uWDI7XG4gICAgICAgIHRoaXMuYnJhY2tldENsb3NpbmcgPSBvdGhlckVkZ2UuYnJhY2tldENsb3Npbmc7XG4gICAgICAgIHRoaXMuYnJhY2tldE9wZW5pbmcgPSBvdGhlckVkZ2UuYnJhY2tldE9wZW5pbmc7XG5cbiAgICAgICAgdGhpcy5vcmRlck5leHQgPSBvdGhlckVkZ2Uub3JkZXJOZXh0O1xuICAgICAgICB0aGlzLm9yZGVyUHJldiA9IG90aGVyRWRnZS5vcmRlclByZXY7XG5cbiAgICAgICAgdGhpcy5zZWN0aW9uWDEgPSBvdGhlckVkZ2Uuc2VjdGlvblgxO1xuICAgICAgICB0aGlzLnNlY3Rpb25YMiA9IG90aGVyRWRnZS5zZWN0aW9uWDI7XG4gICAgICAgIHRoaXMuc2V0U2VjdGlvbk5leHQob3RoZXJFZGdlLmdldFNlY3Rpb25OZXh0KHRydWUpKTtcbiAgICAgICAgdGhpcy5zZXRTZWN0aW9uRG93bihvdGhlckVkZ2UuZ2V0U2VjdGlvbkRvd24odHJ1ZSkpO1xuXG4gICAgICAgIHRoaXMuZWRnZUZpeGVkID0gb3RoZXJFZGdlLmVkZ2VGaXhlZDtcbiAgICAgICAgdGhpcy5lZGdlQ3VzdG9tRml4ZWQgPSBvdGhlckVkZ2UuZWRnZUN1c3RvbUZpeGVkO1xuICAgICAgICB0aGlzLnNldEVkZ2VDYW5wYXNzZWQob3RoZXJFZGdlLmdldEVkZ2VDYW5wYXNzZWQoKSk7XG4gICAgICAgIHRoaXMuc2V0RGlyZWN0aW9uKG90aGVyRWRnZS5nZXREaXJlY3Rpb24oKSk7XG5cbiAgICAgICAgdGhpcy5zZXRCbG9ja1ByZXYob3RoZXJFZGdlLmdldEJsb2NrUHJldigpKTtcbiAgICAgICAgdGhpcy5zZXRCbG9ja05leHQob3RoZXJFZGdlLmdldEJsb2NrTmV4dCgpKTtcbiAgICAgICAgdGhpcy5zZXRCbG9ja1RyYWNlKG90aGVyRWRnZS5nZXRCbG9ja1RyYWNlKCkpO1xuXG4gICAgICAgIHRoaXMuc2V0Q2xvc2VzdFByZXYob3RoZXJFZGdlLmdldENsb3Nlc3RQcmV2KCkpO1xuICAgICAgICB0aGlzLnNldENsb3Nlc3ROZXh0KG90aGVyRWRnZS5nZXRDbG9zZXN0TmV4dCgpKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXJFZGdlKSB7XG4gICAgcmV0dXJuIHRoaXMgPT09IG90aGVyRWRnZTsgLy8gVGhpcyBjaGVja3MgaWYgdGhleSByZWZlcmVuY2UgdGhlIHNhbWUgb2JqZWN0XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuZ2V0U3RhcnRQb2ludFByZXYgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhcnRwb2ludFByZXYgIT09IG51bGwgPyB0aGlzLnN0YXJ0cG9pbnRQcmV2IHx8IHRoaXMuc3RhcnRwb2ludFByZXYgOiBudWxsO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmlzU3RhcnRQb2ludFByZXZOdWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAhdGhpcy5zdGFydHBvaW50UHJldjtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5nZXRTdGFydFBvaW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXJ0cG9pbnQgIT09IG51bGwgP1xuICAgICAgICAodGhpcy5zdGFydHBvaW50IGluc3RhbmNlb2YgQXJyYXkgPyBuZXcgQXJQb2ludCh0aGlzLnN0YXJ0cG9pbnQpIDogbmV3IEFyUG9pbnQodGhpcy5zdGFydHBvaW50KSkgOlxuICAgICAgICBDT05TVEFOVFMuRU1QVFlfUE9JTlQ7ICAvLyByZXR1cm5pbmcgY29weSBvZiB0aGlzLnN0YXJ0cG9pbnRcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5pc1NhbWVTdGFydFBvaW50ID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhcnRwb2ludCA9PT0gcG9pbnQ7XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuaXNTdGFydFBvaW50TnVsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGFydHBvaW50ID09PSBudWxsO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldFN0YXJ0UG9pbnQgPSBmdW5jdGlvbiAocG9pbnQsIGIpIHtcbiAgICB0aGlzLnN0YXJ0cG9pbnQgPSBwb2ludDtcblxuICAgIGlmIChiICE9PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnJlY2FsY3VsYXRlRGlyZWN0aW9uKCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldFN0YXJ0UG9pbnRYID0gZnVuY3Rpb24gKF94KSB7XG4gICAgdGhpcy5zdGFydHBvaW50LnggPSBfeDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXRTdGFydFBvaW50WSA9IGZ1bmN0aW9uIChfeSkge1xuICAgIHRoaXMuc3RhcnRwb2ludC55ID0gX3k7XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuZ2V0RW5kUG9pbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZW5kcG9pbnQgIT09IG51bGwgP1xuICAgICAgICAodGhpcy5lbmRwb2ludCBpbnN0YW5jZW9mIEFycmF5ID9cbiAgICAgICAgICAgIG5ldyBBclBvaW50KHRoaXMuZW5kcG9pbnQpIDpcbiAgICAgICAgICAgIG5ldyBBclBvaW50KHRoaXMuZW5kcG9pbnQpKSA6XG4gICAgICAgIENPTlNUQU5UUy5FTVBUWV9QT0lOVDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5pc0VuZFBvaW50TnVsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5lbmRwb2ludCA9PT0gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXRFbmRQb2ludCA9IGZ1bmN0aW9uIChwb2ludCwgYikge1xuICAgIHRoaXMuZW5kcG9pbnQgPSBwb2ludDtcblxuICAgIGlmIChiICE9PSBmYWxzZSkge1xuICAgICAgICB0aGlzLnJlY2FsY3VsYXRlRGlyZWN0aW9uKCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldFN0YXJ0QW5kRW5kUG9pbnQgPSBmdW5jdGlvbiAoc3RhcnRQb2ludCwgZW5kUG9pbnQpIHtcbiAgICB0aGlzLnNldFN0YXJ0UG9pbnQoc3RhcnRQb2ludCwgZmFsc2UpOyAvL3dhaXQgdW50aWwgc2V0dGluZyB0aGUgdGhpcy5lbmRwb2ludCB0byByZWNhbGN1bGF0ZURpcmVjdGlvblxuICAgIHRoaXMuc2V0RW5kUG9pbnQoZW5kUG9pbnQpO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldEVuZFBvaW50WCA9IGZ1bmN0aW9uIChfeCkge1xuICAgIHRoaXMuZW5kcG9pbnQueCA9IF94O1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldEVuZFBvaW50WSA9IGZ1bmN0aW9uIChfeSkge1xuICAgIHRoaXMuZW5kcG9pbnQueSA9IF95O1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmlzRW5kUG9pbnROZXh0TnVsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gIXRoaXMuZW5kcG9pbnROZXh0O1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldFNlY3Rpb25OZXh0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgcmV0dXJuIHRoaXMuc2VjdGlvbk5leHQgIT09IHVuZGVmaW5lZCA/IHRoaXMuc2VjdGlvbk5leHRbMF0gOiBudWxsO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldFNlY3Rpb25OZXh0UHRyID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5zZWN0aW9uTmV4dCB8fCAhdGhpcy5zZWN0aW9uTmV4dFswXSkge1xuICAgICAgICB0aGlzLnNlY3Rpb25OZXh0ID0gW25ldyBBdXRvUm91dGVyRWRnZSgpXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2VjdGlvbk5leHQ7XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuc2V0U2VjdGlvbk5leHQgPSBmdW5jdGlvbiAobmV4dFNlY3Rpb24pIHtcbiAgICBuZXh0U2VjdGlvbiA9IG5leHRTZWN0aW9uIGluc3RhbmNlb2YgQXJyYXkgPyBuZXh0U2VjdGlvblswXSA6IG5leHRTZWN0aW9uO1xuICAgIGlmICh0aGlzLnNlY3Rpb25OZXh0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgdGhpcy5zZWN0aW9uTmV4dFswXSA9IG5leHRTZWN0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VjdGlvbk5leHQgPSBbbmV4dFNlY3Rpb25dO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5nZXRTZWN0aW9uRG93biA9IGZ1bmN0aW9uICgpIHsgLy9SZXR1cm5zIHBvaW50ZXIgLSBpZiBub3QgbnVsbFxuXG4gICAgcmV0dXJuIHRoaXMuc2VjdGlvbkRvd24gIT09IHVuZGVmaW5lZCA/IHRoaXMuc2VjdGlvbkRvd25bMF0gOiBudWxsO1xuXG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuZ2V0U2VjdGlvbkRvd25QdHIgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLnNlY3Rpb25Eb3duIHx8ICF0aGlzLnNlY3Rpb25Eb3duWzBdKSB7XG4gICAgICAgIHRoaXMuc2VjdGlvbkRvd24gPSBbbmV3IEF1dG9Sb3V0ZXJFZGdlKCldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zZWN0aW9uRG93bjtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXRTZWN0aW9uRG93biA9IGZ1bmN0aW9uIChkb3duU2VjdGlvbikge1xuICAgIGRvd25TZWN0aW9uID0gZG93blNlY3Rpb24gaW5zdGFuY2VvZiBBcnJheSA/IGRvd25TZWN0aW9uWzBdIDogZG93blNlY3Rpb247XG4gICAgaWYgKHRoaXMuc2VjdGlvbkRvd24gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICB0aGlzLnNlY3Rpb25Eb3duWzBdID0gZG93blNlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWN0aW9uRG93biA9IFtkb3duU2VjdGlvbl07XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldEVkZ2VDYW5wYXNzZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWRnZUNhblBhc3NlZDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXRFZGdlQ2FucGFzc2VkID0gZnVuY3Rpb24gKGVjcCkge1xuICAgIHRoaXMuZWRnZUNhblBhc3NlZCA9IGVjcDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWRnZURpcmVjdGlvbjtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXREaXJlY3Rpb24gPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhpcy5lZGdlRGlyZWN0aW9uID0gZGlyO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnJlY2FsY3VsYXRlRGlyZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIGFzc2VydCh0aGlzLnN0YXJ0cG9pbnQgIT09IG51bGwgJiYgdGhpcy5lbmRwb2ludCAhPT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZS5yZWNhbGN1bGF0ZURpcmVjdGlvbjogdGhpcy5zdGFydHBvaW50ICE9PSBudWxsICYmIHRoaXMuZW5kcG9pbnQgIT09IG51bGwgRkFJTEVEIScpO1xuICAgIHRoaXMuZWRnZURpcmVjdGlvbiA9IFV0aWxzLmdldERpcih0aGlzLmVuZHBvaW50Lm1pbnVzKHRoaXMuc3RhcnRwb2ludCkpO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldEJsb2NrUHJldiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9ja1ByZXY7XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuc2V0QmxvY2tQcmV2ID0gZnVuY3Rpb24gKHByZXZCbG9jaykge1xuICAgIHRoaXMuYmxvY2tQcmV2ID0gcHJldkJsb2NrO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldEJsb2NrTmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9ja05leHQ7XG59O1xuXG5BdXRvUm91dGVyRWRnZS5wcm90b3R5cGUuc2V0QmxvY2tOZXh0ID0gZnVuY3Rpb24gKG5leHRCbG9jaykge1xuICAgIHRoaXMuYmxvY2tOZXh0ID0gbmV4dEJsb2NrO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldEJsb2NrVHJhY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYmxvY2tUcmFjZTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlLnByb3RvdHlwZS5zZXRCbG9ja1RyYWNlID0gZnVuY3Rpb24gKHRyYWNlQmxvY2spIHtcbiAgICB0aGlzLmJsb2NrVHJhY2UgPSB0cmFjZUJsb2NrO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldENsb3Nlc3RQcmV2ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNsb3Nlc3RQcmV2O1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldENsb3Nlc3RQcmV2ID0gZnVuY3Rpb24gKGNwKSB7XG4gICAgdGhpcy5jbG9zZXN0UHJldiA9IGNwO1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLmdldENsb3Nlc3ROZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNsb3Nlc3ROZXh0O1xufTtcblxuQXV0b1JvdXRlckVkZ2UucHJvdG90eXBlLnNldENsb3Nlc3ROZXh0ID0gZnVuY3Rpb24gKGNwKSB7XG4gICAgdGhpcy5jbG9zZXN0TmV4dCA9IGNwO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRvUm91dGVyRWRnZTtcbiIsIi8qZ2xvYmFscyBkZWZpbmUsIFdlYkdNRUdsb2JhbCovXG4vKmpzaGludCBicm93c2VyOiB0cnVlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Mb2dnZXInKSxcbiAgICBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKSxcbiAgICBDT05TVEFOVFMgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuQ29uc3RhbnRzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuVXRpbHMnKSxcbiAgICBBdXRvUm91dGVyUGF0aCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5QYXRoJyksXG4gICAgQXV0b1JvdXRlclBvcnQgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUG9ydCcpLFxuICAgIEF1dG9Sb3V0ZXJCb3ggPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuQm94JyksXG4gICAgQXV0b1JvdXRlckVkZ2UgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuRWRnZScpO1xuXG5cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1BdXRvUm91dGVyRWRnZUxpc3RcblxudmFyIF9sb2dnZXIgPSBuZXcgTG9nZ2VyKCdBdXRvUm91dGVyLkVkZ2VMaXN0Jyk7XG52YXIgQXV0b1JvdXRlckVkZ2VMaXN0ID0gZnVuY3Rpb24gKGIpIHtcbiAgICB0aGlzLm93bmVyID0gbnVsbDtcblxuICAgIC8vLS1FZGdlc1xuICAgIHRoaXMuaXNob3Jpem9udGFsID0gYjtcblxuICAgIC8vLS1PcmRlclxuICAgIHRoaXMub3JkZXJGaXJzdCA9IG51bGw7XG4gICAgdGhpcy5vcmRlckxhc3QgPSBudWxsO1xuXG4gICAgLy8tLVNlY3Rpb25cbiAgICB0aGlzLnNlY3Rpb25GaXJzdCA9IG51bGw7XG4gICAgdGhpcy5zZWN0aW9uQmxvY2tlciA9IG51bGw7XG4gICAgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgPSBbXTsgLy8gVGhpcyBpcyBhbiBhcnJheSB0byBlbXVsYXRlIHRoZSBwb2ludGVyIHRvIGEgcG9pbnRlciBmdW5jdGlvbmFsaXR5IGluIENQUC4gXG4gICAgLy8gVGhhdCBpcywgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0gPSB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCpcblxuICAgIHRoaXMuX2luaXRPcmRlcigpO1xuICAgIHRoaXMuX2luaXRTZWN0aW9uKCk7XG59O1xuXG4vLyBQdWJsaWMgRnVuY3Rpb25zXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgY3VycmVudEVkZ2UgPSB0aGlzLm9yZGVyRmlyc3QsXG4gICAgICAgIHN0YXJ0cG9pbnQsXG4gICAgICAgIGVuZHBvaW50O1xuXG4gICAgd2hpbGUgKGN1cnJlbnRFZGdlKSB7XG4gICAgICAgIHN0YXJ0cG9pbnQgPSBjdXJyZW50RWRnZS5zdGFydHBvaW50O1xuICAgICAgICBlbmRwb2ludCA9IGN1cnJlbnRFZGdlLmVuZHBvaW50O1xuICAgICAgICBpZiAoc3RhcnQuZXF1YWxzKHN0YXJ0cG9pbnQpICYmIGVuZC5lcXVhbHMoZW5kcG9pbnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50RWRnZSA9IGN1cnJlbnRFZGdlLm9yZGVyTmV4dDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja09yZGVyKCk7XG4gICAgdGhpcy5jaGVja1NlY3Rpb24oKTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuYWRkUGF0aEVkZ2VzID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBhc3NlcnQocGF0aC5vd25lciA9PT0gdGhpcy5vd25lcixcbiAgICAgICAgJ0FSRWRnZUxpc3QuYWRkRWRnZXM6IHBhdGgub3duZXIgPT09IG93bmVyIEZBSUxFRCEnKTtcblxuICAgIHZhciBpc1BhdGhBdXRvUm91dGVkID0gcGF0aC5pc0F1dG9Sb3V0ZWQoKSxcbiAgICAgICAgaGFzQ3VzdG9tRWRnZSA9IGZhbHNlLFxuICAgICAgICBjdXN0b21pemVkSW5kZXhlcyA9IHt9LFxuICAgICAgICBpbmRleGVzID0gW10sXG4gICAgICAgIHN0YXJ0cG9pbnQsXG4gICAgICAgIGVuZHBvaW50LFxuICAgICAgICBkaXIsXG4gICAgICAgIGVkZ2UsXG4gICAgICAgIGk7XG5cbiAgICBpZiAoaXNQYXRoQXV0b1JvdXRlZCkge1xuICAgICAgICBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBpbmRleGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaGFzQ3VzdG9tRWRnZSA9IHRydWU7XG4gICAgICAgICAgICBjdXN0b21pemVkSW5kZXhlc1tpbmRleGVzW2ldXSA9IDA7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBoYXNDdXN0b21FZGdlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnRMaXN0ID0gcGF0aC5nZXRQb2ludExpc3QoKSxcbiAgICAgICAgcHRyc09iamVjdCA9IHBvaW50TGlzdC5nZXRUYWlsRWRnZVB0cnMoKSxcbiAgICAgICAgaW5kSXRyLFxuICAgICAgICBjdXJyRWRnZUluZGV4ID0gcG9pbnRMaXN0Lmxlbmd0aCAtIDIsXG4gICAgICAgIGdvb2RBbmdsZSxcbiAgICAgICAgcG9zID0gcHRyc09iamVjdC5wb3MsXG4gICAgICAgIHNraXBFZGdlLFxuICAgICAgICBpc01vdmVhYmxlLFxuICAgICAgICBpc0VkZ2VDdXN0b21GaXhlZCxcbiAgICAgICAgc3RhcnRQb3J0LFxuICAgICAgICBlbmRQb3J0LFxuICAgICAgICBpc1N0YXJ0UG9ydENvbm5lY3RUb0NlbnRlcixcbiAgICAgICAgaXNFbmRQb3J0Q29ubmVjdFRvQ2VudGVyLFxuICAgICAgICBpc1BhdGhGaXhlZDtcblxuICAgIHN0YXJ0cG9pbnQgPSBwdHJzT2JqZWN0LnN0YXJ0O1xuICAgIGVuZHBvaW50ID0gcHRyc09iamVjdC5lbmQ7XG5cbiAgICB3aGlsZSAocG9pbnRMaXN0Lmxlbmd0aCAmJiBwb3MgPj0gMCkge1xuXG4gICAgICAgIGRpciA9IFV0aWxzLmdldERpcihlbmRwb2ludC5taW51cyhzdGFydHBvaW50KSk7XG5cbiAgICAgICAgc2tpcEVkZ2UgPSBkaXIgPT09IENPTlNUQU5UUy5EaXJOb25lID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgICBpc01vdmVhYmxlID0gcGF0aC5pc01vdmVhYmxlKCk7XG5cbiAgICAgICAgaWYgKCFpc01vdmVhYmxlICYmIGRpciAhPT0gQ09OU1RBTlRTLkRpclNrZXcpIHtcbiAgICAgICAgICAgIGdvb2RBbmdsZSA9IFV0aWxzLmlzUmlnaHRBbmdsZShkaXIpO1xuICAgICAgICAgICAgYXNzZXJ0KGdvb2RBbmdsZSxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5hZGRFZGdlczogVXRpbHMuaXNSaWdodEFuZ2xlIChkaXIpIEZBSUxFRCEnKTtcblxuICAgICAgICAgICAgaWYgKCFnb29kQW5nbGUpIHtcbiAgICAgICAgICAgICAgICBza2lwRWRnZSA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2tpcEVkZ2UgJiZcbiAgICAgICAgICAgIChVdGlscy5pc1JpZ2h0QW5nbGUoZGlyKSAmJiBVdGlscy5pc0hvcml6b250YWwoZGlyKSA9PT0gdGhpcy5pc2hvcml6b250YWwpKSB7XG4gICAgICAgICAgICBlZGdlID0gbmV3IEF1dG9Sb3V0ZXJFZGdlKCk7XG4gICAgICAgICAgICBlZGdlLm93bmVyID0gcGF0aDtcblxuICAgICAgICAgICAgZWRnZS5zZXRTdGFydEFuZEVuZFBvaW50KHN0YXJ0cG9pbnQsIGVuZHBvaW50KTtcbiAgICAgICAgICAgIGVkZ2Uuc3RhcnRwb2ludFByZXYgPSBwb2ludExpc3QuZ2V0UG9pbnRCZWZvcmVFZGdlKHBvcyk7XG4gICAgICAgICAgICBlZGdlLmVuZHBvaW50TmV4dCA9IHBvaW50TGlzdC5nZXRQb2ludEFmdGVyRWRnZShwb3MpO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ3VzdG9tRWRnZSkge1xuICAgICAgICAgICAgICAgIGlzRWRnZUN1c3RvbUZpeGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKGlzUGF0aEF1dG9Sb3V0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kSXRyID0gY3VzdG9taXplZEluZGV4ZXMuaW5kZXhPZihjdXJyRWRnZUluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgaXNFZGdlQ3VzdG9tRml4ZWQgPSAoaW5kSXRyICE9PSBjdXN0b21pemVkSW5kZXhlcy5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpc0VkZ2VDdXN0b21GaXhlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWRnZS5lZGdlQ3VzdG9tRml4ZWQgPSBpc0VkZ2VDdXN0b21GaXhlZDtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGVkZ2UuZWRnZUN1c3RvbUZpeGVkID0gZGlyID09PSBDT05TVEFOVFMuRGlyU2tldztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhcnRQb3J0ID0gcGF0aC5nZXRTdGFydFBvcnQoKTtcblxuICAgICAgICAgICAgYXNzZXJ0KHN0YXJ0UG9ydCAhPT0gbnVsbCxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5hZGRFZGdlczogc3RhcnRQb3J0ICE9PSBudWxsIEZBSUxFRCEnKTtcblxuICAgICAgICAgICAgaXNTdGFydFBvcnRDb25uZWN0VG9DZW50ZXIgPSBzdGFydFBvcnQuaXNDb25uZWN0VG9DZW50ZXIoKTtcbiAgICAgICAgICAgIGVuZFBvcnQgPSBwYXRoLmdldEVuZFBvcnQoKTtcblxuICAgICAgICAgICAgYXNzZXJ0KGVuZFBvcnQgIT09IG51bGwsXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuYWRkRWRnZXM6IGVuZFBvcnQgIT09IG51bGwgRkFJTEVEIScpO1xuXG4gICAgICAgICAgICBpc0VuZFBvcnRDb25uZWN0VG9DZW50ZXIgPSBlbmRQb3J0LmlzQ29ubmVjdFRvQ2VudGVyKCk7XG4gICAgICAgICAgICBpc1BhdGhGaXhlZCA9IHBhdGguaXNGaXhlZCgpIHx8ICFwYXRoLmlzQXV0b1JvdXRlZCgpO1xuXG4gICAgICAgICAgICBlZGdlLmVkZ2VGaXhlZCA9IGVkZ2UuZWRnZUN1c3RvbUZpeGVkIHx8IGlzUGF0aEZpeGVkIHx8XG4gICAgICAgICAgICAoZWRnZS5pc1N0YXJ0UG9pbnRQcmV2TnVsbCgpICYmIGlzU3RhcnRQb3J0Q29ubmVjdFRvQ2VudGVyKSB8fFxuICAgICAgICAgICAgKGVkZ2UuaXNFbmRQb2ludE5leHROdWxsKCkgJiYgaXNFbmRQb3J0Q29ubmVjdFRvQ2VudGVyKTtcblxuICAgICAgICAgICAgaWYgKGRpciAhPT0gQ09OU1RBTlRTLkRpclNrZXcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbkxvYWRZKGVkZ2UpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uTG9hZEIoZWRnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVkZ2UucG9zaXRpb25ZID0gMDtcbiAgICAgICAgICAgICAgICBlZGdlLmJyYWNrZXRPcGVuaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWRnZS5icmFja2V0Q2xvc2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmluc2VydChlZGdlKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgcHRyc09iamVjdCA9IHBvaW50TGlzdC5nZXRQcmV2RWRnZVB0cnMocG9zKTtcbiAgICAgICAgcG9zID0gcHRyc09iamVjdC5wb3M7XG4gICAgICAgIHN0YXJ0cG9pbnQgPSBwdHJzT2JqZWN0LnN0YXJ0O1xuICAgICAgICBlbmRwb2ludCA9IHB0cnNPYmplY3QuZW5kO1xuICAgICAgICBjdXJyRWRnZUluZGV4LS07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLmFkZFBvcnRFZGdlcyA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgdmFyIHN0YXJ0cG9pbnQsXG4gICAgICAgIGVuZHBvaW50LFxuICAgICAgICBlZGdlLFxuICAgICAgICBzZWxmUG9pbnRzLFxuICAgICAgICBzdGFydHBvaW50UHJldixcbiAgICAgICAgZW5kcG9pbnROZXh0LFxuICAgICAgICBkaXIsXG4gICAgICAgIGksXG4gICAgICAgIGNhbkhhdmVTdGFydEVuZFBvaW50SG9yaXpvbnRhbDtcblxuICAgIGFzc2VydChwb3J0Lm93bmVyLm93bmVyID09PSB0aGlzLm93bmVyLFxuICAgICAgICAnQVJFZGdlTGlzdC5hZGRFZGdlczogcG9ydC5vd25lciA9PT0gKG93bmVyKSBGQUlMRUQhJyk7XG5cbiAgICBpZiAocG9ydC5pc0Nvbm5lY3RUb0NlbnRlcigpIHx8IHBvcnQub3duZXIuaXNBdG9taWMoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VsZlBvaW50cyA9IHBvcnQuc2VsZlBvaW50cztcblxuICAgIGZvciAoaSA9IDA7IGkgPCA0OyBpKyspIHtcblxuICAgICAgICBzdGFydHBvaW50UHJldiA9IHNlbGZQb2ludHNbKGkgKyAzKSAlIDRdO1xuICAgICAgICBzdGFydHBvaW50ID0gc2VsZlBvaW50c1tpXTtcbiAgICAgICAgZW5kcG9pbnQgPSBzZWxmUG9pbnRzWyhpICsgMSkgJSA0XTtcbiAgICAgICAgZW5kcG9pbnROZXh0ID0gc2VsZlBvaW50c1soaSArIDIpICUgNF07XG4gICAgICAgIGRpciA9IFV0aWxzLmdldERpcihlbmRwb2ludC5taW51cyhzdGFydHBvaW50KSk7XG5cbiAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIpLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuYWRkRWRnZXM6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyKSBGQUlMRUQhJyk7XG5cbiAgICAgICAgY2FuSGF2ZVN0YXJ0RW5kUG9pbnRIb3Jpem9udGFsID0gcG9ydC5jYW5IYXZlU3RhcnRFbmRQb2ludEhvcml6b250YWwodGhpcy5pc2hvcml6b250YWwpO1xuICAgICAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKGRpcikgPT09IHRoaXMuaXNob3Jpem9udGFsICYmIGNhbkhhdmVTdGFydEVuZFBvaW50SG9yaXpvbnRhbCkge1xuICAgICAgICAgICAgZWRnZSA9IG5ldyBBdXRvUm91dGVyRWRnZSgpO1xuXG4gICAgICAgICAgICBlZGdlLm93bmVyID0gcG9ydDtcbiAgICAgICAgICAgIGVkZ2Uuc2V0U3RhcnRBbmRFbmRQb2ludChzdGFydHBvaW50LCBlbmRwb2ludCk7XG4gICAgICAgICAgICBlZGdlLnN0YXJ0cG9pbnRQcmV2ID0gc3RhcnRwb2ludFByZXY7XG4gICAgICAgICAgICBlZGdlLmVuZHBvaW50TmV4dCA9IGVuZHBvaW50TmV4dDtcblxuICAgICAgICAgICAgZWRnZS5lZGdlRml4ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvbkxvYWRZKGVkZ2UpO1xuICAgICAgICAgICAgdGhpcy5fcG9zaXRpb25Mb2FkQihlZGdlKTtcblxuICAgICAgICAgICAgaWYgKGVkZ2UuYnJhY2tldENsb3NpbmcpIHtcbiAgICAgICAgICAgICAgICBlZGdlLmFkZFRvUG9zaXRpb24oMC45OTkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmluc2VydChlZGdlKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuYWRkRWRnZXMgPSBmdW5jdGlvbiAocGF0aCkge1xuICAgIHZhciBzZWxmUG9pbnRzLFxuICAgICAgICBzdGFydHBvaW50LFxuICAgICAgICBzdGFydHBvaW50UHJldixcbiAgICAgICAgZW5kcG9pbnROZXh0LFxuICAgICAgICBlbmRwb2ludCxcbiAgICAgICAgZWRnZSxcbiAgICAgICAgZGlyLFxuICAgICAgICBpO1xuXG4gICAgaWYgKHBhdGggaW5zdGFuY2VvZiBBdXRvUm91dGVyQm94KSB7XG4gICAgICAgIHZhciBib3ggPSBwYXRoO1xuXG4gICAgICAgIGFzc2VydChib3gub3duZXIgPT09IHRoaXMub3duZXIsXG4gICAgICAgICAgICAnQVJFZGdlTGlzdC5hZGRFZGdlczogYm94Lm93bmVyID09PSAob3duZXIpIEZBSUxFRCEnKTtcblxuXG4gICAgICAgIHNlbGZQb2ludHMgPSBib3guc2VsZlBvaW50cztcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgICAgICBzdGFydHBvaW50UHJldiA9IHNlbGZQb2ludHNbKGkgKyAzKSAlIDRdO1xuICAgICAgICAgICAgc3RhcnRwb2ludCA9IHNlbGZQb2ludHNbaV07XG4gICAgICAgICAgICBlbmRwb2ludCA9IHNlbGZQb2ludHNbKGkgKyAxKSAlIDRdO1xuICAgICAgICAgICAgZW5kcG9pbnROZXh0ID0gc2VsZlBvaW50c1soaSArIDIpICUgNF07XG4gICAgICAgICAgICBkaXIgPSBVdGlscy5nZXREaXIoZW5kcG9pbnQubWludXMoc3RhcnRwb2ludCkpO1xuXG4gICAgICAgICAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGRpciksXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuYWRkRWRnZXM6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyKSBGQUlMRUQhJyk7XG5cbiAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyKSA9PT0gdGhpcy5pc2hvcml6b250YWwpIHtcbiAgICAgICAgICAgICAgICBlZGdlID0gbmV3IEF1dG9Sb3V0ZXJFZGdlKCk7XG5cbiAgICAgICAgICAgICAgICBlZGdlLm93bmVyID0gYm94O1xuICAgICAgICAgICAgICAgIGVkZ2Uuc2V0U3RhcnRBbmRFbmRQb2ludChzdGFydHBvaW50LCBlbmRwb2ludCk7XG4gICAgICAgICAgICAgICAgZWRnZS5zdGFydHBvaW50UHJldiA9IHN0YXJ0cG9pbnRQcmV2O1xuICAgICAgICAgICAgICAgIGVkZ2UuZW5kcG9pbnROZXh0ID0gZW5kcG9pbnROZXh0O1xuXG4gICAgICAgICAgICAgICAgZWRnZS5lZGdlRml4ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcG9zaXRpb25Mb2FkWShlZGdlKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbkxvYWRCKGVkZ2UpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVkZ2UuYnJhY2tldENsb3NpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgZWRnZS5hZGRUb1Bvc2l0aW9uKDAuOTk5KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydChlZGdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGF0aCkgeyAgLy8gcGF0aCBpcyBhbiBBUkdyYXBoXG4gICAgICAgIHZhciBncmFwaCA9IHBhdGg7XG4gICAgICAgIGFzc2VydChncmFwaCA9PT0gdGhpcy5vd25lcixcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0LmFkZEVkZ2VzOiBncmFwaCA9PT0gdGhpcy5vd25lciBGQUlMRUQhJyk7XG5cbiAgICAgICAgc2VsZlBvaW50cyA9IGdyYXBoLnNlbGZQb2ludHM7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDQ7IGkrKykge1xuXG4gICAgICAgICAgICBzdGFydHBvaW50UHJldiA9IHNlbGZQb2ludHNbKGkgKyAzKSAlIDRdO1xuICAgICAgICAgICAgc3RhcnRwb2ludCA9IHNlbGZQb2ludHNbaV07XG4gICAgICAgICAgICBlbmRwb2ludCA9IHNlbGZQb2ludHNbKGkgKyAxKSAlIDRdO1xuICAgICAgICAgICAgZW5kcG9pbnROZXh0ID0gc2VsZlBvaW50c1soaSArIDIpICUgNF07XG4gICAgICAgICAgICBkaXIgPSBVdGlscy5nZXREaXIoZW5kcG9pbnQubWludXMoc3RhcnRwb2ludCkpO1xuXG4gICAgICAgICAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGRpciksXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuYWRkRWRnZXM6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyKSBGQUlMRUQhJyk7XG5cbiAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyKSA9PT0gdGhpcy5pc2hvcml6b250YWwpIHtcbiAgICAgICAgICAgICAgICBlZGdlID0gbmV3IEF1dG9Sb3V0ZXJFZGdlKCk7XG5cbiAgICAgICAgICAgICAgICBlZGdlLm93bmVyID0gZ3JhcGg7XG4gICAgICAgICAgICAgICAgZWRnZS5zZXRTdGFydEFuZEVuZFBvaW50KHN0YXJ0cG9pbnQsIGVuZHBvaW50KTtcbiAgICAgICAgICAgICAgICBlZGdlLnN0YXJ0cG9pbnRQcmV2ID0gc3RhcnRwb2ludFByZXY7XG4gICAgICAgICAgICAgICAgZWRnZS5lbmRwb2ludE5leHQgPSBlbmRwb2ludE5leHQ7XG5cbiAgICAgICAgICAgICAgICBlZGdlLmVkZ2VGaXhlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9wb3NpdGlvbkxvYWRZKGVkZ2UpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0KGVkZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLmRlbGV0ZUVkZ2VzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHZhciBlZGdlID0gdGhpcy5vcmRlckZpcnN0LFxuICAgICAgICBuZXh0O1xuXG4gICAgd2hpbGUgKGVkZ2UgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGVkZ2Uub3duZXIgPT09IG9iamVjdCkge1xuICAgICAgICAgICAgbmV4dCA9IGVkZ2Uub3JkZXJOZXh0O1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUoZWRnZSk7XG4gICAgICAgICAgICBlZGdlID0gbmV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVkZ2UgPSBlZGdlLm9yZGVyTmV4dDtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5kZWxldGVBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB3aGlsZSAodGhpcy5vcmRlckZpcnN0KSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHRoaXMub3JkZXJGaXJzdCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5nZXRFZGdlID0gZnVuY3Rpb24gKHBhdGgsIHN0YXJ0cG9pbnQpIHtcbiAgICB2YXIgZWRnZSA9IHRoaXMub3JkZXJGaXJzdDtcbiAgICB3aGlsZSAoZWRnZSAhPT0gbnVsbCkge1xuXG4gICAgICAgIGlmIChlZGdlLmlzU2FtZVN0YXJ0UG9pbnQoc3RhcnRwb2ludCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgZWRnZSA9IGVkZ2Uub3JkZXJOZXh0O1xuICAgIH1cblxuICAgIGFzc2VydChlZGdlICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5nZXRFZGdlOiBlZGdlICE9PSBudWxsIEZBSUxFRCEnKTtcbiAgICByZXR1cm4gZWRnZTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuZ2V0RWRnZUJ5UG9pbnRlciA9IGZ1bmN0aW9uIChzdGFydHBvaW50KSB7XG4gICAgdmFyIGVkZ2UgPSB0aGlzLm9yZGVyRmlyc3Q7XG4gICAgd2hpbGUgKGVkZ2UgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGVkZ2UuaXNTYW1lU3RhcnRQb2ludChzdGFydHBvaW50KSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBlZGdlID0gZWRnZS5vcmRlck5leHQ7XG4gICAgfVxuXG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwsXG4gICAgICAgICdBUkVkZ2VMaXN0LmdldEVkZ2VCeVBvaW50ZXI6IGVkZ2UgIT09IG51bGwgRkFJTEVEIScpO1xuICAgIHJldHVybiBlZGdlO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5zZXRFZGdlQnlQb2ludGVyID0gZnVuY3Rpb24gKHBFZGdlLCBuZXdFZGdlKSB7XG4gICAgYXNzZXJ0KG5ld0VkZ2UgaW5zdGFuY2VvZiBBdXRvUm91dGVyRWRnZSxcbiAgICAgICAgJ0FSRWRnZUxpc3Quc2V0RWRnZUJ5UG9pbnRlcjogbmV3RWRnZSBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJFZGdlIEZBSUxFRCEnKTtcbiAgICB2YXIgZWRnZSA9IHRoaXMuc2VjdGlvbkZpcnN0O1xuICAgIHdoaWxlIChlZGdlICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChwRWRnZSA9PT0gZWRnZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBlZGdlID0gZWRnZS5nZXRTZWN0aW9uRG93bigpO1xuICAgIH1cblxuICAgIGFzc2VydChlZGdlICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5zZXRFZGdlQnlQb2ludGVyOiBlZGdlICE9PSBudWxsIEZBSUxFRCEnKTtcbiAgICBlZGdlID0gbmV3RWRnZTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuZ2V0RWRnZUF0ID0gZnVuY3Rpb24gKHBvaW50LCBuZWFybmVzcykge1xuICAgIHZhciBlZGdlID0gdGhpcy5vcmRlckZpcnN0O1xuICAgIHdoaWxlIChlZGdlKSB7XG5cbiAgICAgICAgaWYgKFV0aWxzLmlzUG9pbnROZWFyTGluZShwb2ludCwgZWRnZS5zdGFydHBvaW50LCBlZGdlLmVuZHBvaW50LCBuZWFybmVzcykpIHtcbiAgICAgICAgICAgIHJldHVybiBlZGdlO1xuICAgICAgICB9XG5cbiAgICAgICAgZWRnZSA9IGVkZ2Uub3JkZXJOZXh0O1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5kdW1wRWRnZXMgPSBmdW5jdGlvbiAobXNnLCBsb2dnZXIpIHtcbiAgICB2YXIgZWRnZSA9IHRoaXMub3JkZXJGaXJzdCxcbiAgICAgICAgbG9nID0gbG9nZ2VyIHx8IF9sb2dnZXIuZGVidWcsXG4gICAgICAgIHRvdGFsID0gMTtcblxuICAgIGxvZyhtc2cpO1xuXG4gICAgd2hpbGUgKGVkZ2UgIT09IG51bGwpIHtcbiAgICAgICAgbG9nKCdcXHQnICsgZWRnZS5zdGFydHBvaW50LnggKyAnLCAnICsgZWRnZS5zdGFydHBvaW50LnkgKyAnXFx0XFx0JyArIGVkZ2UuZW5kcG9pbnQueCArICcsICcgK1xuICAgICAgICBlZGdlLmVuZHBvaW50LnkgKyAnXFx0XFx0XFx0KCcgKyAoZWRnZS5lZGdlRml4ZWQgPyAnRklYRUQnIDogJ01PVkVBQkxFJyApICsgJylcXHRcXHQnICtcbiAgICAgICAgKGVkZ2UuYnJhY2tldENsb3NpbmcgPyAnQnJhY2tldCBDbG9zaW5nJyA6IChlZGdlLmJyYWNrZXRPcGVuaW5nID8gJ0JyYWNrZXQgT3BlbmluZycgOiAnJykpKTtcblxuICAgICAgICBlZGdlID0gZWRnZS5vcmRlck5leHQ7XG4gICAgICAgIHRvdGFsKys7XG4gICAgfVxuXG4gICAgbG9nKCdUb3RhbCBFZGdlczogJyArIHRvdGFsKTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuZ2V0RWRnZUNvdW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBlZGdlID0gdGhpcy5vcmRlckZpcnN0LFxuICAgICAgICB0b3RhbCA9IDE7XG4gICAgd2hpbGUgKGVkZ2UgIT09IG51bGwpIHtcbiAgICAgICAgZWRnZSA9IGVkZ2Uub3JkZXJOZXh0O1xuICAgICAgICB0b3RhbCsrO1xuICAgIH1cbiAgICByZXR1cm4gdG90YWw7XG59O1xuXG4vLy0tUHJpdmF0ZSBGdW5jdGlvbnNcbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuX3Bvc2l0aW9uR2V0UmVhbFkgPSBmdW5jdGlvbiAoZWRnZSwgeSkge1xuICAgIGlmICh5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNob3Jpem9udGFsKSB7XG4gICAgICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsWTogZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSBGQUlMRUQhJyk7XG4gICAgICAgICAgICByZXR1cm4gZWRnZS5zdGFydHBvaW50Lnk7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnggPT09IGVkZ2UuZW5kcG9pbnQueCxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0LnBvc2l0aW9uX0dldFJlYWxZOiBlZGdlLnN0YXJ0cG9pbnQueCA9PT0gZWRnZS5lbmRwb2ludC54IEZBSUxFRCEnKTtcbiAgICAgICAgcmV0dXJuIGVkZ2Uuc3RhcnRwb2ludC54O1xuICAgIH0gZWxzZSB7XG5cbiAgICAgICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgIWVkZ2UuaXNTdGFydFBvaW50TnVsbCgpICYmICFlZGdlLmlzRW5kUG9pbnROdWxsKCksXG4gICAgICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsWTogZWRnZSAhPT0gbnVsbCAmJiAhZWRnZS5pc1N0YXJ0UG9pbnROdWxsKCkgJiYgJyArXG4gICAgICAgICAgICAnIWVkZ2UuaXNFbmRQb2ludE51bGwoKSBGQUlMRUQhJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNob3Jpem9udGFsKSB7XG4gICAgICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsWTogZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSBGQUlMRUQhJyk7XG4gICAgICAgICAgICBlZGdlLnNldFN0YXJ0UG9pbnRZKHkpO1xuICAgICAgICAgICAgZWRnZS5zZXRFbmRQb2ludFkoeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnggPT09IGVkZ2UuZW5kcG9pbnQueCxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsWTogZWRnZS5zdGFydHBvaW50LnggPT09IGVkZ2UuZW5kcG9pbnQueCBGQUlMRUQnKTtcblxuICAgICAgICAgICAgZWRnZS5zZXRTdGFydFBvaW50WCh5KTtcbiAgICAgICAgICAgIGVkZ2Uuc2V0RW5kUG9pbnRYKHkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5fcG9zaXRpb25TZXRSZWFsWSA9IGZ1bmN0aW9uIChlZGdlLCB5KSB7XG4gICAgaWYgKGVkZ2UgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBlZGdlID0gZWRnZVswXTtcbiAgICB9XG5cbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCAmJiAhZWRnZS5pc1N0YXJ0UG9pbnROdWxsKCkgJiYgIWVkZ2UuaXNFbmRQb2ludE51bGwoKSxcbiAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fU2V0UmVhbFk6IGVkZ2UgIT0gbnVsbCAmJiAhZWRnZS5pc1N0YXJ0UG9pbnROdWxsKCkgJiYgIWVkZ2UuaXNFbmRQb2ludE51bGwoKSBGQUlMRUQnKTtcblxuICAgIGlmICh0aGlzLmlzaG9yaXpvbnRhbCkge1xuICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0LnBvc2l0aW9uX1NldFJlYWxZOiBlZGdlLnN0YXJ0cG9pbnQueSA9PT0gZWRnZS5lbmRwb2ludC55IEZBSUxFRCcpO1xuICAgICAgICBlZGdlLnNldFN0YXJ0UG9pbnRZKHkpO1xuICAgICAgICBlZGdlLnNldEVuZFBvaW50WSh5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnggPT09IGVkZ2UuZW5kcG9pbnQueCxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0LnBvc2l0aW9uX1NldFJlYWxZOiBlZGdlLnN0YXJ0cG9pbnQueCA9PT0gZWRnZS5lbmRwb2ludC54IEZBSUxFRCcpO1xuICAgICAgICBlZGdlLnNldFN0YXJ0UG9pbnRYKHkpO1xuICAgICAgICBlZGdlLnNldEVuZFBvaW50WCh5KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZWRnZSBlbmRwb2ludHMgc28geDEgPCB4MlxuICovXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9wb3NpdGlvbkdldFJlYWxYID0gZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCAmJiAhZWRnZS5pc1N0YXJ0UG9pbnROdWxsKCkgJiYgIWVkZ2UuaXNFbmRQb2ludE51bGwoKSxcbiAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fR2V0UmVhbFg6IGVkZ2UgIT09IG51bGwgJiYgIWVkZ2UuaXNTdGFydFBvaW50TnVsbCgpICYmICFlZGdlLmlzRW5kUG9pbnROdWxsKCkgRkFJTEVEJyk7XG4gICAgdmFyIHgxLCB4MjtcblxuICAgIGlmICh0aGlzLmlzaG9yaXpvbnRhbCkge1xuICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnkgPT09IGVkZ2UuZW5kcG9pbnQueSxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0LnBvc2l0aW9uX0dldFJlYWxYOiBlZGdlLnN0YXJ0cG9pbnQueSA9PT0gZWRnZS5lbmRwb2ludC55IEZBSUxFRCcpO1xuXG4gICAgICAgIGlmIChlZGdlLnN0YXJ0cG9pbnQueCA8IGVkZ2UuZW5kcG9pbnQueCkge1xuXG4gICAgICAgICAgICB4MSA9IGVkZ2Uuc3RhcnRwb2ludC54O1xuICAgICAgICAgICAgeDIgPSBlZGdlLmVuZHBvaW50Lng7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHgxID0gZWRnZS5lbmRwb2ludC54O1xuICAgICAgICAgICAgeDIgPSBlZGdlLnN0YXJ0cG9pbnQueDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGFzc2VydChlZGdlLnN0YXJ0cG9pbnQueCA9PT0gZWRnZS5lbmRwb2ludC54LFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fR2V0UmVhbFg6IGVkZ2Uuc3RhcnRwb2ludC54ID09PSBlZGdlLmVuZHBvaW50LnggRkFJTEVEJyk7XG4gICAgICAgIGlmIChlZGdlLnN0YXJ0cG9pbnQueSA8IGVkZ2UuZW5kcG9pbnQueSkge1xuXG4gICAgICAgICAgICB4MSA9IGVkZ2Uuc3RhcnRwb2ludC55O1xuICAgICAgICAgICAgeDIgPSBlZGdlLmVuZHBvaW50Lnk7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHgxID0gZWRnZS5lbmRwb2ludC55O1xuICAgICAgICAgICAgeDIgPSBlZGdlLnN0YXJ0cG9pbnQueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbeDEsIHgyXTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuX3Bvc2l0aW9uR2V0UmVhbE8gPSBmdW5jdGlvbiAoZWRnZSkge1xuICAgIGFzc2VydChlZGdlICE9PSBudWxsICYmICFlZGdlLmlzU3RhcnRQb2ludE51bGwoKSAmJiAhZWRnZS5pc0VuZFBvaW50TnVsbCgpLFxuICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsTzogZWRnZSAhPT0gbnVsbCAmJiAhZWRnZS5pc1N0YXJ0UG9pbnROdWxsKCkgJiYgIWVkZ2UuaXNFbmRQb2ludE51bGwoKSBGQUlMRUQnKTtcbiAgICB2YXIgbzEsIG8yO1xuXG4gICAgaWYgKHRoaXMuaXNob3Jpem9udGFsKSB7XG4gICAgICAgIGFzc2VydChlZGdlLnN0YXJ0cG9pbnQueSA9PT0gZWRnZS5lbmRwb2ludC55LFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fR2V0UmVhbE86IGVkZ2Uuc3RhcnRwb2ludC55ID09PSBlZGdlLmVuZHBvaW50LnkgRkFJTEVEJyk7XG4gICAgICAgIGlmIChlZGdlLnN0YXJ0cG9pbnQueCA8IGVkZ2UuZW5kcG9pbnQueCkge1xuXG4gICAgICAgICAgICBvMSA9IGVkZ2UuaXNTdGFydFBvaW50UHJldk51bGwoKSA/IDAgOiBlZGdlLnN0YXJ0cG9pbnRQcmV2LnkgLSBlZGdlLnN0YXJ0cG9pbnQueTtcbiAgICAgICAgICAgIG8yID0gZWRnZS5pc0VuZFBvaW50TmV4dE51bGwoKSA/IDAgOiBlZGdlLmVuZHBvaW50TmV4dC55IC0gZWRnZS5lbmRwb2ludC55O1xuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICBvMSA9IGVkZ2UuaXNFbmRQb2ludE5leHROdWxsKCkgPyAwIDogZWRnZS5lbmRwb2ludE5leHQueSAtIGVkZ2UuZW5kcG9pbnQueTtcbiAgICAgICAgICAgIG8yID0gZWRnZS5pc1N0YXJ0UG9pbnRQcmV2TnVsbCgpID8gMCA6IGVkZ2Uuc3RhcnRwb2ludFByZXYueSAtIGVkZ2Uuc3RhcnRwb2ludC55O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0KGVkZ2Uuc3RhcnRwb2ludC54ID09PSBlZGdlLmVuZHBvaW50LngsXG4gICAgICAgICAgICAnQVJFZGdlTGlzdC5wb3NpdGlvbl9HZXRSZWFsTzogZWRnZS5zdGFydHBvaW50LnggPT09IGVkZ2UuZW5kcG9pbnQueCBGQUlMRUQnKTtcbiAgICAgICAgaWYgKGVkZ2Uuc3RhcnRwb2ludC55IDwgZWRnZS5lbmRwb2ludC55KSB7XG5cbiAgICAgICAgICAgIG8xID0gZWRnZS5pc1N0YXJ0UG9pbnRQcmV2TnVsbCgpID8gMCA6IGVkZ2Uuc3RhcnRwb2ludFByZXYueCAtIGVkZ2Uuc3RhcnRwb2ludC54O1xuICAgICAgICAgICAgbzIgPSBlZGdlLmlzRW5kUG9pbnROZXh0TnVsbCgpID8gMCA6IGVkZ2UuZW5kcG9pbnROZXh0LnggLSBlZGdlLmVuZHBvaW50Lng7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIG8xID0gZWRnZS5pc0VuZFBvaW50TmV4dE51bGwoKSA/IDAgOiBlZGdlLmVuZHBvaW50TmV4dC54IC0gZWRnZS5lbmRwb2ludC54O1xuICAgICAgICAgICAgbzIgPSBlZGdlLmlzU3RhcnRQb2ludFByZXZOdWxsKCkgPyAwIDogZWRnZS5zdGFydHBvaW50UHJldi54IC0gZWRnZS5zdGFydHBvaW50Lng7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW28xLCBvMl07XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9wb3NpdGlvbkxvYWRZID0gZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCAmJiBlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fTG9hZFk6IGVkZ2UgIT09IG51bGwgJiYgZWRnZS5vcmRlck5leHQgPT09IG51bGwgJiYgZWRnZS5vcmRlclByZXYgPT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICBlZGdlLnBvc2l0aW9uWSA9IHRoaXMuX3Bvc2l0aW9uR2V0UmVhbFkoZWRnZSk7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9wb3NpdGlvbkxvYWRCID0gZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QucG9zaXRpb25fTG9hZEI6IGVkZ2UgIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICBlZGdlLmJyYWNrZXRPcGVuaW5nID0gIWVkZ2UuZWRnZUZpeGVkICYmIHRoaXMuX2JyYWNrZXRJc09wZW5pbmcoZWRnZSk7XG4gICAgZWRnZS5icmFja2V0Q2xvc2luZyA9ICFlZGdlLmVkZ2VGaXhlZCAmJiB0aGlzLl9icmFja2V0SXNDbG9zaW5nKGVkZ2UpO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5fcG9zaXRpb25BbGxTdG9yZVkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVkZ2UgPSB0aGlzLm9yZGVyRmlyc3Q7XG4gICAgd2hpbGUgKGVkZ2UpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb25TZXRSZWFsWShlZGdlLCBlZGdlLnBvc2l0aW9uWSk7XG4gICAgICAgIGVkZ2UgPSBlZGdlLm9yZGVyTmV4dDtcbiAgICB9XG5cbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuX3Bvc2l0aW9uQWxsTG9hZFggPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVkZ2UgPSB0aGlzLm9yZGVyRmlyc3QsXG4gICAgICAgIHB0cztcbiAgICB3aGlsZSAoZWRnZSkge1xuICAgICAgICBwdHMgPSB0aGlzLl9wb3NpdGlvbkdldFJlYWxYKGVkZ2UpO1xuICAgICAgICBlZGdlLnBvc2l0aW9uWDEgPSBwdHNbMF07XG4gICAgICAgIGVkZ2UucG9zaXRpb25YMiA9IHB0c1sxXTtcblxuICAgICAgICBlZGdlID0gZWRnZS5vcmRlck5leHQ7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5faW5pdE9yZGVyID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub3JkZXJGaXJzdCA9IG51bGw7XG4gICAgdGhpcy5vcmRlckxhc3QgPSBudWxsO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5fY2hlY2tPcmRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICBhc3NlcnQodGhpcy5vcmRlckZpcnN0ID09PSBudWxsICYmIHRoaXMub3JkZXJMYXN0ID09PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5jaGVja09yZGVyOiB0aGlzLm9yZGVyRmlyc3QgPT09IG51bGwgJiYgdGhpcy5vcmRlckxhc3QgPT09IG51bGwgRkFJTEVEJyk7XG59O1xuXG4vLy0tLU9yZGVyXG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24gKGVkZ2UsIGJlZm9yZSkge1xuICAgIGFzc2VydChlZGdlICE9PSBudWxsICYmIGJlZm9yZSAhPT0gbnVsbCAmJiBlZGdlICE9PSBiZWZvcmUsXG4gICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydEJlZm9yZTogZWRnZSAhPT0gbnVsbCAmJiBiZWZvcmUgIT09IG51bGwgJiYgZWRnZSAhPT0gYmVmb3JlIEZBSUxFRCcpO1xuICAgIGFzc2VydChlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0QmVmb3JlOiBlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIGVkZ2Uub3JkZXJQcmV2ID0gYmVmb3JlLm9yZGVyUHJldjtcbiAgICBlZGdlLm9yZGVyTmV4dCA9IGJlZm9yZTtcblxuICAgIGlmIChiZWZvcmUub3JkZXJQcmV2KSB7XG4gICAgICAgIGFzc2VydChiZWZvcmUub3JkZXJQcmV2Lm9yZGVyTmV4dCA9PT0gYmVmb3JlLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0QmVmb3JlOiBiZWZvcmUub3JkZXJQcmV2Lm9yZGVyTmV4dCA9PT0gYmVmb3JlIEZBSUxFRFxcbmJlZm9yZS5vcmRlclByZXYub3JkZXJOZXh0ICcgK1xuICAgICAgICAgICAgJ2lzICcgKyBiZWZvcmUub3JkZXJQcmV2Lm9yZGVyTmV4dCArICcgYW5kIGJlZm9yZSBpcyAnICsgYmVmb3JlKTtcblxuICAgICAgICBiZWZvcmUub3JkZXJQcmV2Lm9yZGVyTmV4dCA9IGVkZ2U7XG5cbiAgICAgICAgYXNzZXJ0KHRoaXMub3JkZXJGaXJzdCAhPT0gYmVmb3JlLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0QmVmb3JlOiB0aGlzLm9yZGVyRmlyc3QgIT09IGJlZm9yZSBGQUlMRUQnKTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAgIGFzc2VydCh0aGlzLm9yZGVyRmlyc3QgPT09IGJlZm9yZSxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydEJlZm9yZTogdGhpcy5vcmRlckZpcnN0ID09PSBiZWZvcmUgRkFJTEVEJyk7XG4gICAgICAgIHRoaXMub3JkZXJGaXJzdCA9IGVkZ2U7XG4gICAgfVxuXG4gICAgYmVmb3JlLm9yZGVyUHJldiA9IGVkZ2U7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLmluc2VydEFmdGVyID0gZnVuY3Rpb24gKGVkZ2UsIGFmdGVyKSB7XG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgYWZ0ZXIgIT09IG51bGwgJiYgIWVkZ2UuZXF1YWxzKGFmdGVyKSxcbiAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0QWZ0ZXI6ICBlZGdlICE9PSBudWxsICYmIGFmdGVyICE9PSBudWxsICYmICFlZGdlLmVxdWFscyhhZnRlcikgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KGVkZ2Uub3JkZXJOZXh0ID09PSBudWxsICYmIGVkZ2Uub3JkZXJQcmV2ID09PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5pbnNlcnRBZnRlcjogZWRnZS5vcmRlck5leHQgPT09IG51bGwgJiYgZWRnZS5vcmRlclByZXYgPT09IG51bGwgRkFJTEVEICcpO1xuXG4gICAgZWRnZS5vcmRlck5leHQgPSBhZnRlci5vcmRlck5leHQ7XG4gICAgZWRnZS5vcmRlclByZXYgPSBhZnRlcjtcblxuICAgIGlmIChhZnRlci5vcmRlck5leHQpIHtcbiAgICAgICAgYXNzZXJ0KGFmdGVyLm9yZGVyTmV4dC5vcmRlclByZXYuZXF1YWxzKGFmdGVyKSxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydEFmdGVyOiAgYWZ0ZXIub3JkZXJOZXh0Lm9yZGVyUHJldi5lcXVhbHMoYWZ0ZXIpIEZBSUxFRCcpO1xuICAgICAgICBhZnRlci5vcmRlck5leHQub3JkZXJQcmV2ID0gZWRnZTtcblxuICAgICAgICBhc3NlcnQoIXRoaXMub3JkZXJMYXN0LmVxdWFscyhhZnRlciksICdBUkVkZ2VMaXN0Lmluc2VydEFmdGVyOiAhb3JkZXJMYXN0LmVxdWFscyhhZnRlcikgRkFJTEVEJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0KHRoaXMub3JkZXJMYXN0LmVxdWFscyhhZnRlciksICdBUkVkZ2VMaXN0Lmluc2VydEFmdGVyOiB0aGlzLm9yZGVyTGFzdC5lcXVhbHMoYWZ0ZXIpIEZBSUxFRCcpO1xuICAgICAgICB0aGlzLm9yZGVyTGFzdCA9IGVkZ2U7XG4gICAgfVxuXG4gICAgYWZ0ZXIub3JkZXJOZXh0ID0gZWRnZTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuaW5zZXJ0TGFzdCA9IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwsXG4gICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydExhc3Q6IGVkZ2UgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KGVkZ2Uub3JkZXJQcmV2ID09PSBudWxsICYmIGVkZ2Uub3JkZXJOZXh0ID09PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5pbnNlcnRMYXN0OiBlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIGVkZ2Uub3JkZXJQcmV2ID0gdGhpcy5vcmRlckxhc3Q7XG5cbiAgICBpZiAodGhpcy5vcmRlckxhc3QpIHtcbiAgICAgICAgYXNzZXJ0KHRoaXMub3JkZXJMYXN0Lm9yZGVyTmV4dCA9PT0gbnVsbCxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydExhc3Q6IHRoaXMub3JkZXJMYXN0Lm9yZGVyTmV4dCA9PT0gbnVsbCBGQUlMRUQnKTtcbiAgICAgICAgYXNzZXJ0KHRoaXMub3JkZXJGaXJzdCAhPT0gbnVsbCxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydExhc3Q6IHRoaXMub3JkZXJGaXJzdCAhPSBudWxsIEZBSUxFRCcpO1xuXG4gICAgICAgIHRoaXMub3JkZXJMYXN0Lm9yZGVyTmV4dCA9IGVkZ2U7XG4gICAgICAgIHRoaXMub3JkZXJMYXN0ID0gZWRnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnQodGhpcy5vcmRlckZpcnN0ID09PSBudWxsLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0TGFzdDogIHRoaXMub3JkZXJGaXJzdCA9PT0gbnVsbCBGQUlMRUQnKTtcblxuICAgICAgICB0aGlzLm9yZGVyRmlyc3QgPSBlZGdlO1xuICAgICAgICB0aGlzLm9yZGVyTGFzdCA9IGVkZ2U7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZWRnZSkge1xuICAgIGFzc2VydChlZGdlICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5pbnNlcnQ6ICBlZGdlICE9PSBudWxsIEZBSUxFRCcpO1xuICAgIGFzc2VydChlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QuaW5zZXJ0OiBlZGdlLm9yZGVyUHJldiA9PT0gbnVsbCAmJiBlZGdlLm9yZGVyTmV4dCA9PT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHZhciB5ID0gZWRnZS5wb3NpdGlvblk7XG5cbiAgICBhc3NlcnQoQ09OU1RBTlRTLkVEX01JTkNPT1JEIDw9IHkgJiYgeSA8PSBDT05TVEFOVFMuRURfTUFYQ09PUkQsXG4gICAgICAgICdBUkVkZ2VMaXN0Lmluc2VydDogQ09OU1RBTlRTLkVEX01JTkNPT1JEIDw9IHkgJiYgeSA8PSBDT05TVEFOVFMuRURfTUFYQ09PUkQgRkFJTEVEICh5IGlzICcgKyB5ICsgJyknKTtcblxuICAgIHZhciBpbnNlcnQgPSB0aGlzLm9yZGVyRmlyc3Q7XG5cbiAgICB3aGlsZSAoaW5zZXJ0ICYmIGluc2VydC5wb3NpdGlvblkgPCB5KSB7XG4gICAgICAgIGluc2VydCA9IGluc2VydC5vcmRlck5leHQ7XG4gICAgfVxuXG4gICAgaWYgKGluc2VydCkge1xuICAgICAgICB0aGlzLmluc2VydEJlZm9yZShlZGdlLCBpbnNlcnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0TGFzdChlZGdlKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwsXG4gICAgICAgICdBUkVkZ2VMaXN0LnJlbW92ZTogIGVkZ2UgIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICBpZiAodGhpcy5vcmRlckZpcnN0ID09PSBlZGdlKSB7XG4gICAgICAgIHRoaXMub3JkZXJGaXJzdCA9IGVkZ2Uub3JkZXJOZXh0O1xuICAgIH1cblxuICAgIGlmIChlZGdlLm9yZGVyTmV4dCkge1xuICAgICAgICBlZGdlLm9yZGVyTmV4dC5vcmRlclByZXYgPSBlZGdlLm9yZGVyUHJldjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcmRlckxhc3QgPT09IGVkZ2UpIHtcbiAgICAgICAgdGhpcy5vcmRlckxhc3QgPSBlZGdlLm9yZGVyUHJldjtcbiAgICB9XG5cbiAgICBpZiAoZWRnZS5vcmRlclByZXYpIHtcbiAgICAgICAgZWRnZS5vcmRlclByZXYub3JkZXJOZXh0ID0gZWRnZS5vcmRlck5leHQ7XG4gICAgfVxuXG4gICAgZWRnZS5vcmRlck5leHQgPSBudWxsO1xuICAgIGVkZ2Uub3JkZXJQcmV2ID0gbnVsbDtcbn07XG5cbi8vLS0gUHJpdmF0ZVxuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9zbGlkZUJ1dE5vdFBhc3NFZGdlcyA9IGZ1bmN0aW9uIChlZGdlLCB5KSB7XG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwsICdBUkVkZ2VMaXN0LnNsaWRlQnV0Tm90UGFzc0VkZ2VzOiBlZGdlICE9IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KENPTlNUQU5UUy5FRF9NSU5DT09SRCA8IHkgJiYgeSA8IENPTlNUQU5UUy5FRF9NQVhDT09SRCxcbiAgICAgICAgJ0FSRWRnZUxpc3Quc2xpZGVCdXROb3RQYXNzRWRnZXM6IENPTlNUQU5UUy5FRF9NSU5DT09SRCA8IHkgJiYgeSA8IENPTlNUQU5UUy5FRF9NQVhDT09SRCBGQUlMRUQnKTtcblxuICAgIHZhciBvbGR5ID0gZWRnZS5wb3NpdGlvblk7XG4gICAgYXNzZXJ0KENPTlNUQU5UUy5FRF9NSU5DT09SRCA8IG9sZHkgJiYgb2xkeSA8IENPTlNUQU5UUy5FRF9NQVhDT09SRCxcbiAgICAgICAgJ0FSRWRnZUxpc3Quc2xpZGVCdXROb3RQYXNzRWRnZXM6IENPTlNUQU5UUy5FRF9NSU5DT09SRCA8IG9sZHkgJiYgb2xkeSA8IENPTlNUQU5UUy5FRF9NQVhDT09SRCBGQUlMRUQnKTtcblxuICAgIGlmIChvbGR5ID09PSB5KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciB4MSA9IGVkZ2UucG9zaXRpb25YMSxcbiAgICAgICAgeDIgPSBlZGdlLnBvc2l0aW9uWDIsXG4gICAgICAgIHJldCA9IG51bGwsXG4gICAgICAgIGluc2VydCA9IGVkZ2U7XG5cbiAgICAvL0lmIHdlIGFyZSB0cnlpbmcgdG8gc2xpZGUgZG93blxuXG4gICAgaWYgKG9sZHkgPCB5KSB7XG4gICAgICAgIHdoaWxlIChpbnNlcnQub3JkZXJOZXh0KSB7XG4gICAgICAgICAgICBpbnNlcnQgPSBpbnNlcnQub3JkZXJOZXh0O1xuXG4gICAgICAgICAgICBpZiAoeSA8IGluc2VydC5wb3NpdGlvblkpIHtcbiAgICAgICAgICAgICAgICAvL1RoZW4gd2Ugd29uJ3QgYmUgc2hpZnRpbmcgcGFzdCB0aGUgbmV3IGVkZ2UgKGluc2VydClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiB5b3UgY2FuJ3QgcGFzcyB0aGUgZWRnZSAoYnV0IHdhbnQgdG8pIGFuZCB0aGUgbGluZXMgd2lsbCBvdmVybGFwIHggdmFsdWVzLi4uXG4gICAgICAgICAgICBpZiAoIWluc2VydC5nZXRFZGdlQ2FucGFzc2VkKCkgJiYgVXRpbHMuaW50ZXJzZWN0KHgxLCB4MiwgaW5zZXJ0LnBvc2l0aW9uWDEsIGluc2VydC5wb3NpdGlvblgyKSkge1xuICAgICAgICAgICAgICAgIHJldCA9IGluc2VydDtcbiAgICAgICAgICAgICAgICB5ID0gaW5zZXJ0LnBvc2l0aW9uWTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlZGdlICE9PSBpbnNlcnQgJiYgaW5zZXJ0Lm9yZGVyUHJldiAhPT0gZWRnZSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUoZWRnZSk7XG4gICAgICAgICAgICB0aGlzLmluc2VydEJlZm9yZShlZGdlLCBpbnNlcnQpO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgeyAvLyBJZiB3ZSBhcmUgdHJ5aW5nIHRvIHNsaWRlIHVwXG4gICAgICAgIHdoaWxlIChpbnNlcnQub3JkZXJQcmV2KSB7XG4gICAgICAgICAgICBpbnNlcnQgPSBpbnNlcnQub3JkZXJQcmV2O1xuXG4gICAgICAgICAgICBpZiAoeSA+IGluc2VydC5wb3NpdGlvblkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9JZiBpbnNlcnQgY2Fubm90IGJlIHBhc3NlZCBhbmQgaXQgaXMgaW4gdGhlIHdheSBvZiB0aGUgZWRnZSAoaWYgdGhlIGVkZ2Ugd2VyZSB0byBzbGlkZSB1cCkuXG4gICAgICAgICAgICBpZiAoIWluc2VydC5nZXRFZGdlQ2FucGFzc2VkKCkgJiYgVXRpbHMuaW50ZXJzZWN0KHgxLCB4MiwgaW5zZXJ0LnBvc2l0aW9uWDEsIGluc2VydC5wb3NpdGlvblgyKSkge1xuICAgICAgICAgICAgICAgIHJldCA9IGluc2VydDtcbiAgICAgICAgICAgICAgICB5ID0gaW5zZXJ0LnBvc2l0aW9uWTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlZGdlICE9PSBpbnNlcnQgJiYgaW5zZXJ0Lm9yZGVyTmV4dCAhPT0gZWRnZSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUoZWRnZSk7Ly9UaGlzIGlzIHdoZXJlIEkgYmVsaWV2ZSB0aGUgZXJyb3IgY291bGQgbGllIVxuICAgICAgICAgICAgdGhpcy5pbnNlcnRBZnRlcihlZGdlLCBpbnNlcnQpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBlZGdlLnBvc2l0aW9uWSA9IHk7XG5cbiAgICByZXR1cm4gcmV0O1xufTtcblxuLy8tLS0tLS1TZWN0aW9uXG5cbi8vIHByaXZhdGVcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5faW5pdFNlY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zZWN0aW9uRmlyc3QgPSBudWxsO1xuICAgIHRoaXMuc2VjdGlvbkJsb2NrZXIgPSBudWxsO1xuICAgIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkID0gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuY2hlY2tTZWN0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghKHRoaXMuc2VjdGlvbkJsb2NrZXIgPT09IG51bGwgJiYgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgPT09IG51bGwpKSB7XG4gICAgICAgIC8vIFRoaXMgdXNlZCB0byBiZSBjb250YWluZWQgaW4gYW4gYXNzZXJ0LlxuICAgICAgICAvLyBHZW5lcmFsbHkgdGhpcyBmYWlscyB3aGVuIHRoZSByb3V0ZXIgZG9lcyBub3QgaGF2ZSBhIGNsZWFuIGV4aXQgdGhlbiBpcyBhc2tlZCB0byByZXJvdXRlLlxuICAgICAgICB0aGlzLl9sb2dnZXIud2Fybignc2VjdGlvbkJsb2NrZXIgYW5kIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkIGFyZSBub3QgbnVsbC4gJyArXG4gICAgICAgICdBc3N1bWluZyBsYXN0IHJ1biBkaWQgbm90IGV4aXQgY2xlYW5seS4gRml4aW5nLi4uJyk7XG4gICAgICAgIHRoaXMuc2VjdGlvbkJsb2NrZXIgPSBudWxsO1xuICAgICAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IG51bGw7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5zZWN0aW9uUmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jaGVja1NlY3Rpb24oKTtcblxuICAgIHRoaXMuc2VjdGlvbkZpcnN0ID0gbnVsbDtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgc2VjdGlvbiBkYXRhIHN0cnVjdHVyZS5cbiAqXG4gKiBAcGFyYW0gYmxvY2tlclxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9zZWN0aW9uQmVnaW5TY2FuID0gZnVuY3Rpb24gKGJsb2NrZXIpIHtcbiAgICB0aGlzLmNoZWNrU2VjdGlvbigpO1xuXG4gICAgdGhpcy5zZWN0aW9uQmxvY2tlciA9IGJsb2NrZXI7XG5cbiAgICB0aGlzLnNlY3Rpb25CbG9ja2VyLnNlY3Rpb25YMSA9IHRoaXMuc2VjdGlvbkJsb2NrZXIucG9zaXRpb25YMTtcbiAgICB0aGlzLnNlY3Rpb25CbG9ja2VyLnNlY3Rpb25YMiA9IHRoaXMuc2VjdGlvbkJsb2NrZXIucG9zaXRpb25YMjtcblxuICAgIHRoaXMuc2VjdGlvbkJsb2NrZXIuc2V0U2VjdGlvbk5leHQobnVsbCk7XG4gICAgdGhpcy5zZWN0aW9uQmxvY2tlci5zZXRTZWN0aW9uRG93bihudWxsKTtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuX3NlY3Rpb25Jc0ltbWVkaWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBhc3NlcnQodGhpcy5zZWN0aW9uQmxvY2tlciAhPT0gbnVsbCAmJiB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCAhPT0gbnVsbCAmJiB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCAhPT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25Jc0ltbWVkaWF0ZTogdGhpcy5zZWN0aW9uQmxvY2tlciAhPSBudWxsICYmIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkICE9IG51bGwgJyArXG4gICAgICAgICcmJiAqc2VjdGlvblB0cjJCbG9ja2VkICE9IG51bGwgRkFJTEVEJyk7XG5cbiAgICB2YXIgc2VjdGlvbkJsb2NrZWQgPSB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXSxcbiAgICAgICAgZSA9IHNlY3Rpb25CbG9ja2VkLmdldFNlY3Rpb25Eb3duKCksXG4gICAgICAgIGExID0gc2VjdGlvbkJsb2NrZWQuc2VjdGlvblgxLFxuICAgICAgICBhMiA9IHNlY3Rpb25CbG9ja2VkLnNlY3Rpb25YMixcbiAgICAgICAgcDEgPSBzZWN0aW9uQmxvY2tlZC5wb3NpdGlvblgxLFxuICAgICAgICBwMiA9IHNlY3Rpb25CbG9ja2VkLnBvc2l0aW9uWDIsXG4gICAgICAgIGIxID0gdGhpcy5zZWN0aW9uQmxvY2tlci5zZWN0aW9uWDEsXG4gICAgICAgIGIyID0gdGhpcy5zZWN0aW9uQmxvY2tlci5zZWN0aW9uWDI7XG5cbiAgICBpZiAoZSAhPT0gbnVsbCkge1xuICAgICAgICBlID0gKGUuc3RhcnRwb2ludCA9PT0gbnVsbCB8fCBlLnNlY3Rpb25YMSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGUpO1xuICAgIH1cblxuICAgIGFzc2VydChiMSA8PSBhMiAmJiBhMSA8PSBiMixcbiAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25Jc0ltbWVkaWF0ZTogYjEgPD0gYTIgJiYgYTEgPD0gYjIgRkFJTEVEJyk7ICAgICAgICAgICAgICAgICAgICAgLy8gbm90IGNhc2UgMSBvciA2XG5cbiAgICAvLyBOT1RFIFdFIENIQU5HRUQgVEhFIENPTkRJVElPTlMgKEExPD1CMSBBTkQgQjI8PUEyKVxuICAgIC8vIEJFQ0FVU0UgSEVSRSBXRSBORUVEIFRISVMhXG5cbiAgICBpZiAoYTEgPD0gYjEpIHtcbiAgICAgICAgd2hpbGUgKCEoZSA9PT0gbnVsbCB8fCBlLnN0YXJ0cG9pbnQgPT09IG51bGwpICYmIGUuc2VjdGlvblgyIDwgYjEpIHtcbiAgICAgICAgICAgIGUgPSBlLmdldFNlY3Rpb25OZXh0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYjIgPD0gYTIpIHtcbiAgICAgICAgICAgIHJldHVybiAoZSA9PT0gbnVsbCB8fCBlLnN0YXJ0cG9pbnQgPT09IG51bGwpIHx8IGIyIDwgZS5zZWN0aW9uWDE7ICAgICAgICAgICAgICAgLy8gY2FzZSAzXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKGUgPT09IG51bGwgfHwgZS5zdGFydHBvaW50ID09PSBudWxsKSAmJiBhMiA9PT0gcDI7ICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXNlIDJcbiAgICB9XG5cbiAgICBpZiAoYjIgPD0gYTIpIHtcbiAgICAgICAgcmV0dXJuIGExID09PSBwMSAmJiAoKGUgPT09IG51bGwgfHwgZS5zdGFydHBvaW50ID09PSBudWxsKSB8fCBiMiA8IGUuc2VjdGlvblgxKTsgICAgLy8gY2FzZSA1XG4gICAgfVxuXG4gICAgcmV0dXJuIChlID09PSBudWxsIHx8IGUuc3RhcnRwb2ludCA9PT0gbnVsbCkgJiYgYTEgPT09IHAxICYmIGEyID09PSBwMjsgICAgICAgICAgICAgICAgIC8vIGNhc2UgNFxufTtcblxuXG4vLyBUaGUgZm9sbG93aW5nIG1ldGhvZHMgYXJlIGNvbnZlbmllbmNlIG1ldGhvZHMgZm9yIGFkanVzdGluZyB0aGUgJ3NlY3Rpb24nIFxuLy8gb2YgYW4gZWRnZS5cbi8qKlxuICogR2V0IGVpdGhlciBtaW4rMSBvciBhIHZhbHVlIGJldHdlZW4gbWluIGFuZCBtYXguIFRlY2huaWNhbGx5LFxuICogd2UgYXJlIGxvb2tpbmcgZm9yIFttaW4sIG1heCkuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblxuICogQHBhcmFtIHtOdW1iZXJ9IG1heFxuICogQHJldHVybiB7TnVtYmVyfSByZXN1bHRcbiAqL1xudmFyIGdldExhcmdlckVuZHBvaW50ID0gZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhc3NlcnQobWluIDwgbWF4KTtcblxuICAgIHJlc3VsdCA9IE1hdGgubWluKG1pbiArIDEsIChtaW4gKyBtYXgpIC8gMik7XG4gICAgaWYgKHJlc3VsdCA9PT0gbWF4KSB7XG4gICAgICAgIHJlc3VsdCA9IG1pbjtcbiAgICB9XG4gICAgYXNzZXJ0KHJlc3VsdCA8IG1heCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogR2V0IGVpdGhlciBtYXgtMSBvciBhIHZhbHVlIGJldHdlZW4gbWluIGFuZCBtYXguIFRlY2huaWNhbGx5LFxuICogd2UgYXJlIGxvb2tpbmcgZm9yIChtaW4sIG1heF0uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pblxuICogQHBhcmFtIHtOdW1iZXJ9IG1heFxuICogQHJldHVybiB7TnVtYmVyfSByZXN1bHRcbiAqL1xudmFyIGdldFNtYWxsZXJFbmRwb2ludCA9IGZ1bmN0aW9uIChtaW4sIG1heCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYXNzZXJ0KG1pbiA8IG1heCk7XG5cbiAgICAvLyBJZiBtaW4gaXMgc28gc21hbGwgdGhhdCBcbiAgICAvLyBcbiAgICAvLyAgICAgIChtaW4rbWF4KS8yID09PSBtaW5cbiAgICAvL1xuICAgIC8vIHRoZW4gd2Ugd2lsbCBzaW1wbHkgdXNlIG1heCB2YWx1ZSBmb3IgdGhlIHJlc3VsdFxuICAgIHJlc3VsdCA9IE1hdGgubWF4KG1heCAtIDEsIChtaW4gKyBtYXgpIC8gMik7XG4gICAgaWYgKHJlc3VsdCA9PT0gbWluKSB7XG4gICAgICAgIHJlc3VsdCA9IG1heDtcbiAgICB9XG5cbiAgICBhc3NlcnQocmVzdWx0ID4gbWluKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlID0gZnVuY3Rpb24gKCkge1xuICAgIGFzc2VydCh0aGlzLnNlY3Rpb25CbG9ja2VyICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlOiB0aGlzLnNlY3Rpb25CbG9ja2VyICE9IG51bGwgRkFJTEVEJyk7XG5cbiAgICB2YXIgbmV3U2VjdGlvblgxLFxuICAgICAgICBuZXdTZWN0aW9uWDIsXG4gICAgICAgIGUsXG4gICAgICAgIGJsb2NrZXJYMSA9IHRoaXMuc2VjdGlvbkJsb2NrZXIuc2VjdGlvblgxLFxuICAgICAgICBibG9ja2VyWDIgPSB0aGlzLnNlY3Rpb25CbG9ja2VyLnNlY3Rpb25YMjtcblxuICAgIGFzc2VydChibG9ja2VyWDEgPD0gYmxvY2tlclgyLFxuICAgICAgICAnQVJFZGdlTGlzdC5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlOiBibG9ja2VyWDEgPD0gYmxvY2tlclgyIEZBSUxFRCcpO1xuXG4gICAgLy8gU2V0dGluZyB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFxuICAgIGlmICh0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9PT0gbnVsbCkgeyAgLy8gaW5pdGlhbGl6ZSBzZWN0aW9uUHRyMkJsb2NrZWRcblxuICAgICAgICB0aGlzLnNlY3Rpb25GaXJzdCA9IHRoaXMuc2VjdGlvbkZpcnN0ID09PSBudWxsID8gW25ldyBBdXRvUm91dGVyRWRnZSgpXSA6IHRoaXMuc2VjdGlvbkZpcnN0O1xuICAgICAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IHRoaXMuc2VjdGlvbkZpcnN0O1xuICAgIH0gZWxzZSB7ICAgLy8gZ2V0IG5leHQgc2VjdGlvblB0cjJCbG9ja2VkXG4gICAgICAgIHZhciBjdXJyZW50RWRnZSA9IHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkWzBdO1xuXG4gICAgICAgIGFzc2VydChjdXJyZW50RWRnZS5zdGFydHBvaW50ICE9PSBudWxsLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25IYXNCbG9ja2VkRWRnZTogY3VycmVudEVkZ2Uuc3RhcnRwb2ludCA9PT0gbnVsbCcpO1xuXG4gICAgICAgIHZhciBvID0gbnVsbDtcblxuICAgICAgICBlID0gY3VycmVudEVkZ2UuZ2V0U2VjdGlvbkRvd25QdHIoKVswXTtcbiAgICAgICAgbmV3U2VjdGlvblgxID0gY3VycmVudEVkZ2Uuc2VjdGlvblgxO1xuICAgICAgICBuZXdTZWN0aW9uWDIgPSBjdXJyZW50RWRnZS5zZWN0aW9uWDI7XG5cbiAgICAgICAgYXNzZXJ0KG5ld1NlY3Rpb25YMSA8PSBuZXdTZWN0aW9uWDIsXG4gICAgICAgICAgICAnQVJFZGdlTGlzdC5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlOiBuZXdTZWN0aW9uWDEgPD0gbmV3U2VjdGlvblgyIEZBSUxFRCAoJyArIG5ld1NlY3Rpb25YMSArXG4gICAgICAgICAgICAnIDw9ICcgKyBuZXdTZWN0aW9uWDIgKyAnKScgKyAnXFxuZWRnZSBpcyAnKTtcblxuICAgICAgICBhc3NlcnQoYmxvY2tlclgxIDw9IG5ld1NlY3Rpb25YMiAmJiBuZXdTZWN0aW9uWDEgPD0gYmxvY2tlclgyLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25IYXNCbG9ja2VkRWRnZTogYmxvY2tlclgxIDw9IG5ld1NlY3Rpb25YMiAmJiAgbmV3U2VjdGlvblgxIDw9IGJsb2NrZXJYMiBGQUlMRUQnKTtcbiAgICAgICAgLy8gbm90IGNhc2UgMSBvciA2XG4gICAgICAgIGlmIChuZXdTZWN0aW9uWDEgPCBibG9ja2VyWDEgJiYgYmxvY2tlclgyIDwgbmV3U2VjdGlvblgyKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FzZSAzXG4gICAgICAgICAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IGN1cnJlbnRFZGdlLmdldFNlY3Rpb25Eb3duUHRyKCk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChibG9ja2VyWDEgPD0gbmV3U2VjdGlvblgxICYmIG5ld1NlY3Rpb25YMiA8PSBibG9ja2VyWDIpIHsgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXNlIDRcblxuICAgICAgICAgICAgaWYgKGUgJiYgZS5zdGFydHBvaW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGUuZ2V0U2VjdGlvbk5leHQoKSAmJiBlLmdldFNlY3Rpb25OZXh0KCkuc3RhcnRwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBlID0gZS5nZXRTZWN0aW9uTmV4dCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGUuc2V0U2VjdGlvbk5leHQoY3VycmVudEVkZ2UuZ2V0U2VjdGlvbk5leHQoKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0gPSBjdXJyZW50RWRnZS5nZXRTZWN0aW9uRG93bigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkWzBdID0gKGN1cnJlbnRFZGdlLmdldFNlY3Rpb25OZXh0KCkpO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYmxvY2tlclgxIDw9IG5ld1NlY3Rpb25YMSAmJiBibG9ja2VyWDIgPCBuZXdTZWN0aW9uWDIpIHsgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FzZSA1XG5cbiAgICAgICAgICAgIGFzc2VydChuZXdTZWN0aW9uWDEgPD0gYmxvY2tlclgyLFxuICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9zZWN0aW9uSGFzQmxvY2tlZEVkZ2U6IG5ld1NlY3Rpb25YMSA8PSBibG9ja2VyWDIgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgbmV3U2VjdGlvblgxIHN1Y2ggdGhhdCBibG9ja2VyWDIgPCBuZXdTZWN0aW9uWDEgPCBuZXdTZWN0aW9uWDJcbiAgICAgICAgICAgIG5ld1NlY3Rpb25YMSA9IGdldExhcmdlckVuZHBvaW50KGJsb2NrZXJYMiwgbmV3U2VjdGlvblgyKTtcblxuICAgICAgICAgICAgd2hpbGUgKChlICYmIGUuc3RhcnRwb2ludCAhPT0gbnVsbCkgJiYgZS5zZWN0aW9uWDEgPD0gbmV3U2VjdGlvblgxKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0KGUuc2VjdGlvblgxIDw9IGUuc2VjdGlvblgyLFxuICAgICAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlOiBlLnNlY3Rpb25YMSA8PSBlLnNlY3Rpb25YMiBGQUlMRUQnKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXdTZWN0aW9uWDEgPD0gZS5zZWN0aW9uWDIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U2VjdGlvblgxID0gZ2V0TGFyZ2VyRW5kcG9pbnQoZS5zZWN0aW9uWDIsIG5ld1NlY3Rpb25YMik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbyA9IGU7XG4gICAgICAgICAgICAgICAgZSA9IGUuZ2V0U2VjdGlvbk5leHQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG8pIHtcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgY3VycmVudEVkZ2UgdG8gYmUgc2VjdGlvbk5leHQgb2YgdGhlIGdpdmVuIGVkZ2UgaW4gdGhlIGxpc3QgXG4gICAgICAgICAgICAgICAgLy8gb2Ygc2VjdGlvbkRvd24gKGJhc2ljYWxseSwgY29sbGFwc2luZyBjdXJyZW50RWRnZSBpbnRvIHRoZSBzZWN0aW9uRG93biBcbiAgICAgICAgICAgICAgICAvLyBsaXN0LiBUaGUgdmFsdWVzIGluIHRoZSBsaXN0IGZvbGxvd2luZyBjdXJyZW50RWRnZSB3aWxsIHRoZW4gYmUgc2V0IHRvIFxuICAgICAgICAgICAgICAgIC8vIGJlIHNlY3Rpb25Eb3duIG9mIHRoZSBjdXJyZW50RWRnZS4pXG4gICAgICAgICAgICAgICAgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0gPSBjdXJyZW50RWRnZS5nZXRTZWN0aW9uRG93blB0cigpWzBdO1xuICAgICAgICAgICAgICAgIG8uc2V0U2VjdGlvbk5leHQoY3VycmVudEVkZ2UpO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRFZGdlLnNldFNlY3Rpb25Eb3duKGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3NlcnQoYmxvY2tlclgyIDwgbmV3U2VjdGlvblgxLFxuICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9zZWN0aW9uSGFzQmxvY2tlZEVkZ2U6IGJsb2NrZXJYMiA8IG5ld1NlY3Rpb25YMSBGQUlMRUQgKCcgK1xuICAgICAgICAgICAgICAgIGJsb2NrZXJYMiArICcgPCAnICsgbmV3U2VjdGlvblgxICsgJykgJyArXG4gICAgICAgICAgICAgICAgY3VycmVudEVkZ2Uuc2VjdGlvblgyICsgJyBpcyAnICsgbmV3U2VjdGlvblgyICsgJyknKTtcbiAgICAgICAgICAgIC8vIFNoaWZ0aW5nIHRoZSBmcm9udCBvZiB0aGUgcDJiIHNvIGl0IG5vIGxvbmdlciBvdmVybGFwcyB0aGlzLnNlY3Rpb25CbG9ja2VyXG5cbiAgICAgICAgICAgIGN1cnJlbnRFZGdlLnNlY3Rpb25YMSA9IG5ld1NlY3Rpb25YMTtcblxuICAgICAgICAgICAgYXNzZXJ0KGN1cnJlbnRFZGdlLnNlY3Rpb25YMSA8IGN1cnJlbnRFZGdlLnNlY3Rpb25YMixcbiAgICAgICAgICAgICAgICAnY3VycmVudEVkZ2Uuc2VjdGlvblgxIDwgY3VycmVudEVkZ2Uuc2VjdGlvblgyICgnICtcbiAgICAgICAgICAgICAgICBjdXJyZW50RWRnZS5zZWN0aW9uWDEgKyAnIDwgJyArIGN1cnJlbnRFZGdlLnNlY3Rpb25YMiArICcpJyk7XG4gICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhc2UgMlxuICAgICAgICAgICAgYXNzZXJ0KG5ld1NlY3Rpb25YMSA8IGJsb2NrZXJYMSAmJiBibG9ja2VyWDEgPD0gbmV3U2VjdGlvblgyICYmIG5ld1NlY3Rpb25YMiA8PSBibG9ja2VyWDIsXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25IYXNCbG9ja2VkRWRnZTogIG5ld1NlY3Rpb25YMSA8IGJsb2NrZXJYMSAmJiBibG9ja2VyWDEgPD0gbmV3U2VjdGlvblgyICYmICcgK1xuICAgICAgICAgICAgICAgICduZXdTZWN0aW9uWDIgPD0gYmxvY2tlclgyIEZBSUxFRCcpO1xuXG4gICAgICAgICAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IGN1cnJlbnRFZGdlLmdldFNlY3Rpb25Eb3duUHRyKCk7XG5cbiAgICAgICAgICAgIHdoaWxlIChlICYmIGUuc3RhcnRwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG8gPSBlO1xuICAgICAgICAgICAgICAgIGUgPSBlLmdldFNlY3Rpb25OZXh0KCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoby5zZWN0aW9uWDIgKyAxIDwgYmxvY2tlclgxICYmIChlID09PSBudWxsIHx8IGUuc3RhcnRwb2ludCA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgICAgICBvLnNlY3Rpb25YMiArIDEgPCBlLnNlY3Rpb25YMSkpIHtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IG8uZ2V0U2VjdGlvbk5leHRQdHIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXS5zdGFydHBvaW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0KG8gIT09IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9zZWN0aW9uSGFzQmxvY2tlZEVkZ2U6IG8gIT0gbnVsbCBGQUlMRUQnKTtcbiAgICAgICAgICAgICAgICBvLnNldFNlY3Rpb25OZXh0KGN1cnJlbnRFZGdlLmdldFNlY3Rpb25OZXh0KCkpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGxhcmdlciA9IGJsb2NrZXJYMTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXS5zZWN0aW9uWDEgPCBibG9ja2VyWDEpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFyZ2VyID0gdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0uc2VjdGlvblgxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN1cnJlbnRFZGdlLnNlY3Rpb25YMiA9IGdldFNtYWxsZXJFbmRwb2ludChuZXdTZWN0aW9uWDEsIGxhcmdlcik7XG5cbiAgICAgICAgICAgICAgICBjdXJyZW50RWRnZS5zZXRTZWN0aW9uTmV4dCh0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0gPSBuZXcgQXV0b1JvdXRlckVkZ2UoKTsgLy9UaGlzIHNlZW1zIG9kZFxuICAgICAgICAgICAgICAgIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkID0gbnVsbDtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50RWRnZS5zZWN0aW9uWDIgPSBnZXRTbWFsbGVyRW5kcG9pbnQobmV3U2VjdGlvblgxLCBibG9ja2VyWDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3NlcnQoY3VycmVudEVkZ2Uuc2VjdGlvblgxIDwgY3VycmVudEVkZ2Uuc2VjdGlvblgyLFxuICAgICAgICAgICAgICAgICdFeHBlY3RlZCBzZWN0aW9uWDEgPCBzZWN0aW9uWDIgYnV0ICcgKyBjdXJyZW50RWRnZS5zZWN0aW9uWDEgK1xuICAgICAgICAgICAgICAgICcgaXMgbm90IDwgJyArIGN1cnJlbnRFZGdlLnNlY3Rpb25YMik7XG5cbiAgICAgICAgICAgIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkID0gY3VycmVudEVkZ2UuZ2V0U2VjdGlvbk5leHRQdHIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzc2VydCh0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCAhPT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25IYXNCbG9ja2VkRWRnZTogdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgIT0gbnVsbCBGQUlMRUQnKTtcbiAgICB3aGlsZSAodGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0gIT09IG51bGwgJiYgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0uc3RhcnRwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICBuZXdTZWN0aW9uWDEgPSB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXS5zZWN0aW9uWDE7XG4gICAgICAgIG5ld1NlY3Rpb25YMiA9IHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkWzBdLnNlY3Rpb25YMjtcblxuICAgICAgICBpZiAobmV3U2VjdGlvblgyIDwgYmxvY2tlclgxKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhc2UgMVxuICAgICAgICAgICAgLy9JZiB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCBpcyBjb21wbGV0ZWx5IHRvIHRoZSBsZWZ0IChvciBhYm92ZSkgdGhpcy5zZWN0aW9uQmxvY2tlclxuICAgICAgICAgICAgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgPSB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXS5nZXRTZWN0aW9uTmV4dFB0cigpO1xuXG4gICAgICAgICAgICBhc3NlcnQodGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgIT09IG51bGwsXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX3NlY3Rpb25IYXNCbG9ja2VkRWRnZTogdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgIT0gbnVsbCBGQUlMRUQnKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGJsb2NrZXJYMiA8IG5ld1NlY3Rpb25YMSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXNlIDZcbiAgICAgICAgICAgIC8vSWYgdGhpcy5zZWN0aW9uQmxvY2tlciBpcyBjb21wbGV0ZWx5IHRvIHRoZSByaWdodCAob3IgYmVsb3cpIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdTZWN0aW9uWDEgPCBibG9ja2VyWDEgJiYgYmxvY2tlclgyIDwgbmV3U2VjdGlvblgyKSB7ICAgICAgICAgICAgICAgICAgICAgLy8gY2FzZSAzXG4gICAgICAgICAgICAvL0lmIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkIHN0YXJ0cyBiZWZvcmUgYW5kIGVuZHMgYWZ0ZXIgdGhpcy5zZWN0aW9uQmxvY2tlclxuICAgICAgICAgICAgdmFyIHggPSBibG9ja2VyWDE7XG4gICAgICAgICAgICBlID0gdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0uZ2V0U2VjdGlvbkRvd24oKTtcblxuICAgICAgICAgICAgZm9yICg7IDspIHtcblxuICAgICAgICAgICAgICAgIGlmIChlID09PSBudWxsIHx8IGUuc3RhcnRwb2ludCA9PT0gbnVsbCB8fCB4IDwgZS5zZWN0aW9uWDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh4IDw9IGUuc2VjdGlvblgyKSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSBlLnNlY3Rpb25YMiArIDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9ja2VyWDIgPCB4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGUgPSBlLmdldFNlY3Rpb25OZXh0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkID0gdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0uZ2V0U2VjdGlvbkRvd25QdHIoKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoaXMgbGVhdmVzIHRoZSByZWd1bGFyIHBhcnRpYWwgb3ZlcmxhcCBwb3NzaWJpbGl0eS5cbiAgICAgICAgLy8gVGhleSBhbHNvIGluY2x1ZGUgdGhpcy5zZWN0aW9uQmxvY2tlciBzdGFydGluZyBiZWZvcmUgYW5kIGVuZGluZyBhZnRlciB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZC5cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBhc3NlcnQodGhpcy5zZWN0aW9uQmxvY2tlci5nZXRTZWN0aW9uTmV4dCgpID09PSBudWxsICYmXG4gICAgICAgICh0aGlzLnNlY3Rpb25CbG9ja2VyLmdldFNlY3Rpb25Eb3duKCkgPT09IG51bGwgfHxcbiAgICAgICAgdGhpcy5zZWN0aW9uQmxvY2tlci5nZXRTZWN0aW9uRG93bigpLnN0YXJ0cG9pbnQgPT09IG51bGwpLFxuICAgICAgICAnQVJFZGdlTGlzdC5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlOiB0aGlzLnNlY3Rpb25CbG9ja2VyLmdldFNlY3Rpb25OZXh0KCkgPT09IG51bGwgJiYnICtcbiAgICAgICAgJ3RoaXMuc2VjdGlvbkJsb2NrZXIuZ2V0U2VjdGlvbkRvd24oKSA9PT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHRoaXMuc2VjdGlvbkJsb2NrZXIuc2V0U2VjdGlvbk5leHQodGhpcy5zZWN0aW9uUHRyMkJsb2NrZWRbMF0pO1xuXG4gICAgLy8gU2V0IGFueXRoaW5nIHBvaW50aW5nIHRvIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkIHRvIHBvaW50IHRvIHRoaXMuc2VjdGlvbkJsb2NrZXIgKGVnLCBzZWN0aW9uRG93bilcbiAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZFswXSA9IHRoaXMuc2VjdGlvbkJsb2NrZXI7XG5cbiAgICB0aGlzLnNlY3Rpb25CbG9ja2VyID0gbnVsbDtcbiAgICB0aGlzLnNlY3Rpb25QdHIyQmxvY2tlZCA9IG51bGw7XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9zZWN0aW9uR2V0QmxvY2tlZEVkZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgYXNzZXJ0KHRoaXMuc2VjdGlvbkJsb2NrZXIgIT09IG51bGwgJiYgdGhpcy5zZWN0aW9uUHRyMkJsb2NrZWQgIT09IG51bGwsXG4gICAgICAgICdBUkVkZ2VMaXN0LnNlY3Rpb25HZXRCbG9ja2VkRWRnZTogdGhpcy5zZWN0aW9uQmxvY2tlciAhPT0gbnVsbCAmJiAnICtcbiAgICAgICAgJ3RoaXMuc2VjdGlvblB0cjJCbG9ja2VkICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2VjdGlvblB0cjJCbG9ja2VkWzBdO1xufTtcblxuLy8tLS0tQnJhY2tldFxuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9icmFja2V0SXNDbG9zaW5nID0gZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCwgJ0FSRWRnZUxpc3QuX2JyYWNrZXRJc0Nsb3Npbmc6IGVkZ2UgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KCFlZGdlLmlzU3RhcnRQb2ludE51bGwoKSAmJiAhZWRnZS5pc0VuZFBvaW50TnVsbCgpLFxuICAgICAgICAnQVJFZGdlTGlzdC5fYnJhY2tldElzQ2xvc2luZzogIWVkZ2UuaXNTdGFydFBvaW50TnVsbCgpICYmICFlZGdlLmlzRW5kUG9pbnROdWxsKCkgRkFJTEVEJyk7XG5cbiAgICB2YXIgc3RhcnQgPSBlZGdlLnN0YXJ0cG9pbnQsXG4gICAgICAgIGVuZCA9IGVkZ2UuZW5kcG9pbnQ7XG5cbiAgICBpZiAoZWRnZS5pc1N0YXJ0UG9pbnRQcmV2TnVsbCgpIHx8IGVkZ2UuaXNFbmRQb2ludE5leHROdWxsKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmlzaG9yaXpvbnRhbCA/XG4gICAgICAgIChlZGdlLnN0YXJ0cG9pbnRQcmV2LnkgPCBzdGFydC55ICYmIGVkZ2UuZW5kcG9pbnROZXh0LnkgPCBlbmQueSApIDpcbiAgICAgICAgKGVkZ2Uuc3RhcnRwb2ludFByZXYueCA8IHN0YXJ0LnggJiYgZWRnZS5lbmRwb2ludE5leHQueCA8IGVuZC54ICk7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9icmFja2V0SXNPcGVuaW5nID0gZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCwgJ0FSRWRnZUxpc3QuX2JyYWNrZXRJc09wZW5pbmc6IGVkZ2UgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KCFlZGdlLmlzU3RhcnRQb2ludE51bGwoKSAmJiAhZWRnZS5pc0VuZFBvaW50TnVsbCgpLFxuICAgICAgICAnQVJFZGdlTGlzdC5fYnJhY2tldElzT3BlbmluZzogIWVkZ2UuaXNTdGFydFBvaW50TnVsbCgpICYmICFlZGdlLmlzRW5kUG9pbnROdWxsKCkgRkFJTEVEJyk7XG5cbiAgICB2YXIgc3RhcnQgPSBlZGdlLnN0YXJ0cG9pbnQgfHwgZWRnZS5zdGFydHBvaW50LFxuICAgICAgICBlbmQgPSBlZGdlLmVuZHBvaW50IHx8IGVkZ2UuZW5kcG9pbnQsXG4gICAgICAgIHByZXYsXG4gICAgICAgIG5leHQ7XG5cbiAgICBpZiAoZWRnZS5pc1N0YXJ0UG9pbnRQcmV2TnVsbCgpIHx8IGVkZ2UuaXNFbmRQb2ludE5leHROdWxsKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIG5leHQgPSBlZGdlLmVuZHBvaW50TmV4dCB8fCBlZGdlLmVuZHBvaW50TmV4dDtcbiAgICBwcmV2ID0gZWRnZS5zdGFydHBvaW50UHJldiB8fCBlZGdlLnN0YXJ0cG9pbnRQcmV2O1xuXG4gICAgcmV0dXJuIHRoaXMuaXNob3Jpem9udGFsID9cbiAgICAgICAgKHByZXYueSA+IHN0YXJ0LnkgJiYgbmV4dC55ID4gZW5kLnkgKSA6XG4gICAgICAgIChwcmV2LnggPiBzdGFydC54ICYmIG5leHQueCA+IGVuZC54ICk7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9icmFja2V0U2hvdWxkQmVTd2l0Y2hlZCA9IGZ1bmN0aW9uIChlZGdlLCBuZXh0KSB7XG4gICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgbmV4dCAhPT0gbnVsbCxcbiAgICAgICAgJ0FSRWRnZUxpc3QuX2JyYWNrZXRTaG91bGRCZVN3aXRjaGVkOiBlZGdlICE9PSBudWxsICYmIG5leHQgIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICB2YXIgZXggPSB0aGlzLl9wb3NpdGlvbkdldFJlYWxYKGVkZ2UpLFxuICAgICAgICBleDEgPSBleFswXSxcbiAgICAgICAgZXgyID0gZXhbMV0sXG4gICAgICAgIGVvID0gdGhpcy5fcG9zaXRpb25HZXRSZWFsTyhlZGdlKSxcbiAgICAgICAgZW8xID0gZW9bMF0sXG4gICAgICAgIGVvMiA9IGVvWzFdLFxuICAgICAgICBueCA9IHRoaXMuX3Bvc2l0aW9uR2V0UmVhbFgobmV4dCksXG4gICAgICAgIG54MSA9IG54WzBdLFxuICAgICAgICBueDIgPSBueFsxXSxcbiAgICAgICAgbm8gPSB0aGlzLl9wb3NpdGlvbkdldFJlYWxPKG5leHQpLFxuICAgICAgICBubzEgPSBub1swXSxcbiAgICAgICAgbm8yID0gbm9bMV07XG5cbiAgICB2YXIgYzEsIGMyO1xuXG4gICAgaWYgKChueDEgPCBleDEgJiYgZXgxIDwgbngyICYmIGVvMSA+IDAgKSB8fCAoZXgxIDwgbngxICYmIG54MSA8IGV4MiAmJiBubzEgPCAwKSkge1xuICAgICAgICBjMSA9ICsxO1xuICAgIH0gZWxzZSBpZiAoZXgxID09PSBueDEgJiYgZW8xID09PSAwICYmIG5vMSA9PT0gMCkge1xuICAgICAgICBjMSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYzEgPSAtOTtcbiAgICB9XG5cbiAgICBpZiAoKG54MSA8IGV4MiAmJiBleDIgPCBueDIgJiYgZW8yID4gMCApIHx8IChleDEgPCBueDIgJiYgbngyIDwgZXgyICYmIG5vMiA8IDApKSB7XG4gICAgICAgIGMyID0gKzE7XG4gICAgfSBlbHNlIGlmIChleDIgPT09IG54MiAmJiBlbzIgPT09IDAgJiYgbm8yID09PSAwKSB7XG4gICAgICAgIGMyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjMiA9IC05O1xuICAgIH1cblxuICAgIHJldHVybiAoYzEgKyBjMikgPiAwO1xufTtcblxuLy8tLS1CbG9ja1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9ibG9ja0dldEYgPSBmdW5jdGlvbiAoZCwgYiwgcykge1xuICAgIHZhciBmID0gZCAvIChiICsgcyksIC8vZiBpcyB0aGUgdG90YWwgZGlzdGFuY2UgYmV0d2VlbiBlZGdlcyBkaXZpZGVkIGJ5IHRoZSB0b3RhbCBudW1iZXIgb2YgZWRnZXNcbiAgICAgICAgUyA9IENPTlNUQU5UUy5FRExTX1MsIC8vVGhpcyBpcyAnU01BTExHQVAnXG4gICAgICAgIFIgPSBDT05TVEFOVFMuRURMU19SLC8vVGhpcyBpcyAnU01BTExHQVAgKyAxJ1xuICAgICAgICBEID0gQ09OU1RBTlRTLkVETFNfRDsgLy9UaGlzIGlzIHRoZSB0b3RhbCBkaXN0YW5jZSBvZiB0aGUgZ3JhcGhcblxuICAgIC8vSWYgZiBpcyBncmVhdGVyIHRoYW4gdGhlIFNNQUxMR0FQLCB0aGVuIG1ha2Ugc29tZSBjaGVja3MvZWRpdHNcbiAgICBpZiAoYiA9PT0gMCAmJiBSIDw9IGYpIHtcbiAgICAgICAgLy8gSWYgZXZlcnkgY29tcGFyaXNvbiByZXN1bHRlZCBpbiBhbiBvdmVybGFwIEFORCBTTUFMTEdBUCArIDEgaXMgbGVzcyB0aGFuXG4gICAgICAgIC8vIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIGVhY2ggZWRnZSAoaW4gdGhlIGdpdmVuIHJhbmdlKS5cbiAgICAgICAgZiArPSAoRCAtIFIpO1xuICAgIH0gZWxzZSBpZiAoUyA8IGYgJiYgcyA+IDApIHtcbiAgICAgICAgZiA9ICgoRCAtIFMpICogZCAtIFMgKiAoRCAtIFIpICogcykgLyAoKEQgLSBTKSAqIGIgKyAoUiAtIFMpICogcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGY7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9ibG9ja0dldEcgPSBmdW5jdGlvbiAoZCwgYiwgcykge1xuICAgIHZhciBnID0gZCAvIChiICsgcyksXG4gICAgICAgIFMgPSBDT05TVEFOVFMuRURMU19TLFxuICAgICAgICBSID0gQ09OU1RBTlRTLkVETFNfUixcbiAgICAgICAgRCA9IENPTlNUQU5UUy5FRExTX0Q7XG5cbiAgICBpZiAoUyA8IGcgJiYgYiA+IDApIHtcbiAgICAgICAgZyA9ICgoUiAtIFMpICogZCArIFMgKiAoRCAtIFIpICogYikgLyAoKEQgLSBTKSAqIGIgKyAoUiAtIFMpICogcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGc7XG59O1xuXG5BdXRvUm91dGVyRWRnZUxpc3QucHJvdG90eXBlLl9ibG9ja1B1c2hCYWNrd2FyZCA9IGZ1bmN0aW9uIChibG9ja2VkLCBibG9ja2VyKSB7XG4gICAgdmFyIG1vZGlmaWVkID0gZmFsc2U7XG5cbiAgICBhc3NlcnQoYmxvY2tlZCAhPT0gbnVsbCAmJiBibG9ja2VyICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5fYmxvY2tQdXNoQmFja3dhcmQ6IGJsb2NrZWQgIT09IG51bGwgJiYgYmxvY2tlciAhPT0gbnVsbCBGQUlMRUQnKTtcbiAgICBhc3NlcnQoYmxvY2tlZC5wb3NpdGlvblkgPD0gYmxvY2tlci5wb3NpdGlvblksXG4gICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hCYWNrd2FyZDogYmxvY2tlZC5wb3NpdGlvblkgPD0gYmxvY2tlci5wb3NpdGlvblkgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KGJsb2NrZWQuZ2V0QmxvY2tQcmV2KCkgIT09IG51bGwsXG4gICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hCYWNrd2FyZDogYmxvY2tlZC5nZXRCbG9ja1ByZXYoKSAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHZhciBmID0gMCxcbiAgICAgICAgZyA9IDAsXG4gICAgICAgIGVkZ2UgPSBibG9ja2VkLFxuICAgICAgICB0cmFjZSA9IGJsb2NrZXIsXG4gICAgICAgIGQgPSB0cmFjZS5wb3NpdGlvblkgLSBlZGdlLnBvc2l0aW9uWTtcblxuICAgIGFzc2VydChkID49IDAsXG4gICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hCYWNrd2FyZDogZCA+PSAwIEZBSUxFRCcpO1xuXG4gICAgdmFyIHMgPSAoZWRnZS5icmFja2V0T3BlbmluZyB8fCB0cmFjZS5icmFja2V0Q2xvc2luZyksXG4gICAgICAgIGIgPSAxIC0gcyxcbiAgICAgICAgZDI7XG5cbiAgICBmb3IgKDsgOykge1xuICAgICAgICBlZGdlLnNldEJsb2NrVHJhY2UodHJhY2UpO1xuICAgICAgICB0cmFjZSA9IGVkZ2U7XG4gICAgICAgIGVkZ2UgPSBlZGdlLmdldEJsb2NrUHJldigpO1xuXG4gICAgICAgIGlmIChlZGdlID09PSBudWxsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGQyID0gdHJhY2UucG9zaXRpb25ZIC0gZWRnZS5wb3NpdGlvblk7XG4gICAgICAgIGFzc2VydChkMiA+PSAwLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEJhY2t3YXJkOiAgZDIgPj0gMCBGQUlMRUQnKTtcblxuICAgICAgICBpZiAoZWRnZS5icmFja2V0T3BlbmluZyB8fCB0cmFjZS5icmFja2V0Q2xvc2luZykge1xuICAgICAgICAgICAgZyA9IHRoaXMuX2Jsb2NrR2V0RyhkLCBiLCBzKTtcbiAgICAgICAgICAgIGlmIChkMiA8PSBnKSB7XG4gICAgICAgICAgICAgICAgZiA9IHRoaXMuX2Jsb2NrR2V0RihkLCBiLCBzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGYgPSB0aGlzLl9ibG9ja0dldEYoZCwgYiwgcyk7XG4gICAgICAgICAgICBpZiAoZDIgPD0gZikge1xuICAgICAgICAgICAgICAgIGcgPSB0aGlzLl9ibG9ja0dldEcoZCwgYiwgcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiKys7XG4gICAgICAgIH1cblxuICAgICAgICBkICs9IGQyO1xuICAgIH1cblxuICAgIGlmIChiICsgcyA+IDEpIHtcbiAgICAgICAgaWYgKGVkZ2UgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGYgPSB0aGlzLl9ibG9ja0dldEYoZCwgYiwgcyk7XG4gICAgICAgICAgICBnID0gdGhpcy5fYmxvY2tHZXRHKGQsIGIsIHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzZXJ0KFV0aWxzLmZsb2F0RXF1YWxzKGQsIGYgKiBiICsgZyAqIHMpLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEJhY2t3YXJkOiBmbG9hdEVxdWFscyhkLCBmKmIgKyBnKnMpIEZBSUxFRCcpO1xuXG4gICAgICAgIGVkZ2UgPSB0cmFjZTtcbiAgICAgICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgZWRnZSAhPT0gYmxvY2tlZCxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hCYWNrd2FyZDogZWRnZSAhPT0gbnVsbCAmJiBlZGdlICE9PSBibG9ja2VkIEZBSUxFRCcpO1xuXG4gICAgICAgIHZhciB5ID0gZWRnZS5wb3NpdGlvblk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgZWRnZS5nZXRCbG9ja1RyYWNlKCkgIT09IG51bGwsXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEJhY2t3YXJkOiBlZGdlICE9PSBudWxsICYmIGVkZ2UuZ2V0QmxvY2tUcmFjZSgpICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgICAgICAgICB0cmFjZSA9IGVkZ2UuZ2V0QmxvY2tUcmFjZSgpO1xuXG4gICAgICAgICAgICB5ICs9IChlZGdlLmJyYWNrZXRPcGVuaW5nIHx8IHRyYWNlLmJyYWNrZXRDbG9zaW5nKSA/IGcgOiBmO1xuICAgICAgICAgICAgeSA9IFV0aWxzLnJvdW5kVHJ1bmMoeSwgMTApOyAgLy8gRml4IGFueSBmbG9hdGluZyBwb2ludCBlcnJvcnNcblxuICAgICAgICAgICAgaWYgKHkgKyAwLjAwMSA8IHRyYWNlLnBvc2l0aW9uWSkge1xuICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fc2xpZGVCdXROb3RQYXNzRWRnZXModHJhY2UsIHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYWNlLnNldEJsb2NrUHJldihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVkZ2UgPSB0cmFjZTtcbiAgICAgICAgfSB3aGlsZSAoZWRnZSAhPT0gYmxvY2tlZCk7XG5cbiAgICAgICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICAgICAgLy95ICs9IChlZGdlLmJyYWNrZXRPcGVuaW5nIHx8IGJsb2NrZXIuYnJhY2tldENsb3NpbmcpID8gZyA6IGY7XG4gICAgICAgICAgICBhc3NlcnQoVXRpbHMuZmxvYXRFcXVhbHMoeSwgYmxvY2tlci5wb3NpdGlvblkpLFxuICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hCYWNrd2FyZDogZmxvYXRFcXVhbHMoeSwgYmxvY2tlci5wb3NpdGlvblkpIEZBSUxFRCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZGlmaWVkO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5fYmxvY2tQdXNoRm9yd2FyZCA9IGZ1bmN0aW9uIChibG9ja2VkLCBibG9ja2VyKSB7XG4gICAgdmFyIG1vZGlmaWVkID0gZmFsc2U7XG5cbiAgICBhc3NlcnQoYmxvY2tlZCAhPT0gbnVsbCAmJiBibG9ja2VyICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5fYmxvY2tQdXNoRm9yd2FyZDogYmxvY2tlZCAhPT0gbnVsbCAmJiBibG9ja2VyICE9PSBudWxsIEZBSUxFRCcpO1xuICAgIGFzc2VydChibG9ja2VkLnBvc2l0aW9uWSA+PSBibG9ja2VyLnBvc2l0aW9uWSxcbiAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEZvcndhcmQ6IGJsb2NrZWQucG9zaXRpb25ZID49IGJsb2NrZXIucG9zaXRpb25ZIEZBSUxFRCcpO1xuICAgIGFzc2VydChibG9ja2VkLmdldEJsb2NrTmV4dCgpICE9PSBudWxsLFxuICAgICAgICAnQVJFZGdlTGlzdC5fYmxvY2tQdXNoRm9yd2FyZDogYmxvY2tlZC5nZXRCbG9ja05leHQoKSAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHZhciBmID0gMCxcbiAgICAgICAgZyA9IDAsXG4gICAgICAgIGVkZ2UgPSBibG9ja2VkLFxuICAgICAgICB0cmFjZSA9IGJsb2NrZXIsXG4gICAgICAgIGQgPSBlZGdlLnBvc2l0aW9uWSAtIHRyYWNlLnBvc2l0aW9uWTtcblxuICAgIGFzc2VydChkID49IDAsXG4gICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hGb3J3YXJkOiAgZCA+PSAwIEZBSUxFRCcpO1xuXG4gICAgdmFyIHMgPSAodHJhY2UuYnJhY2tldE9wZW5pbmcgfHwgZWRnZS5icmFja2V0Q2xvc2luZyksXG4gICAgICAgIGIgPSAxIC0gcyxcbiAgICAgICAgZDI7XG5cbiAgICBmb3IgKDsgOykge1xuICAgICAgICBlZGdlLnNldEJsb2NrVHJhY2UodHJhY2UpO1xuICAgICAgICB0cmFjZSA9IGVkZ2U7XG4gICAgICAgIGVkZ2UgPSBlZGdlLmdldEJsb2NrTmV4dCgpO1xuXG4gICAgICAgIGlmIChlZGdlID09PSBudWxsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGQyID0gZWRnZS5wb3NpdGlvblkgLSB0cmFjZS5wb3NpdGlvblk7XG4gICAgICAgIGFzc2VydChkMiA+PSAwLFxuICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEZvcndhcmQ6IGQyID49IDAgRkFJTEVEJyk7XG5cbiAgICAgICAgaWYgKHRyYWNlLmJyYWNrZXRPcGVuaW5nIHx8IGVkZ2UuYnJhY2tldENsb3NpbmcpIHtcbiAgICAgICAgICAgIGcgPSB0aGlzLl9ibG9ja0dldEcoZCwgYiwgcyk7XG4gICAgICAgICAgICBpZiAoZDIgPD0gZykge1xuICAgICAgICAgICAgICAgIGYgPSB0aGlzLl9ibG9ja0dldEYoZCwgYiwgcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmID0gdGhpcy5fYmxvY2tHZXRGKGQsIGIsIHMpO1xuICAgICAgICAgICAgaWYgKGQyIDw9IGYpIHtcbiAgICAgICAgICAgICAgICBnID0gdGhpcy5fYmxvY2tHZXRHKGQsIGIsIHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYisrO1xuICAgICAgICB9XG5cbiAgICAgICAgZCArPSBkMjtcbiAgICB9XG5cbiAgICBpZiAoYiArIHMgPiAxKSB7IC8vTG9va2luZyBhdCBtb3JlIHRoYW4gb25lIGVkZ2UgKG9yIGVkZ2UvdHJhY2UgY29tcGFyaXNvbikge1xuICAgICAgICBpZiAoZWRnZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZiA9IHRoaXMuX2Jsb2NrR2V0RihkLCBiLCBzKTtcbiAgICAgICAgICAgIGcgPSB0aGlzLl9ibG9ja0dldEcoZCwgYiwgcyk7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NlcnQoVXRpbHMuZmxvYXRFcXVhbHMoZCwgZiAqIGIgKyBnICogcyksXG4gICAgICAgICAgICAnQVJFZGdlTGlzdC5fYmxvY2tQdXNoRm9yd2FyZDogZmxvYXRFcXVhbHMoZCwgZipiICsgZypzKSBGQUlMRUQnKTtcblxuICAgICAgICBlZGdlID0gdHJhY2U7XG4gICAgICAgIGFzc2VydChlZGdlICE9PSBudWxsICYmICFlZGdlLmVxdWFscyhibG9ja2VkKSxcbiAgICAgICAgICAgICdBUkVkZ2VMaXN0Ll9ibG9ja1B1c2hGb3J3YXJkOiBlZGdlICE9IG51bGwgJiYgIWVkZ2UuZXF1YWxzKGJsb2NrZWQpIEZBSUxFRCcpO1xuXG4gICAgICAgIHZhciB5ID0gZWRnZS5wb3NpdGlvblk7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgYXNzZXJ0KGVkZ2UgIT09IG51bGwgJiYgZWRnZS5nZXRCbG9ja1RyYWNlKCkgIT09IG51bGwsXG4gICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEZvcndhcmQ6IGVkZ2UgIT09IG51bGwgJiYgZWRnZS5nZXRCbG9ja1RyYWNlKCkgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgICAgICAgICB0cmFjZSA9IGVkZ2UuZ2V0QmxvY2tUcmFjZSgpO1xuXG4gICAgICAgICAgICB5IC09ICh0cmFjZS5icmFja2V0T3BlbmluZyB8fCBlZGdlLmJyYWNrZXRDbG9zaW5nKSA/IGcgOiBmO1xuXG4gICAgICAgICAgICBpZiAodHJhY2UucG9zaXRpb25ZIDwgeSAtIDAuMDAxKSB7XG4gICAgICAgICAgICAgICAgbW9kaWZpZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3NsaWRlQnV0Tm90UGFzc0VkZ2VzKHRyYWNlLCB5KSkge1xuICAgICAgICAgICAgICAgICAgICB0cmFjZS5zZXRCbG9ja05leHQobnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlZGdlID0gdHJhY2U7XG4gICAgICAgIH0gd2hpbGUgKGVkZ2UgIT09IGJsb2NrZWQpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIG1vZGlmaWVkO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5ibG9ja1NjYW5Gb3J3YXJkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3Bvc2l0aW9uQWxsTG9hZFgoKTtcblxuICAgIHZhciBtb2RpZmllZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5zZWN0aW9uUmVzZXQoKTtcblxuICAgIHZhciBibG9ja2VyID0gdGhpcy5vcmRlckZpcnN0LFxuICAgICAgICBibG9ja2VkLFxuICAgICAgICBibWluLFxuICAgICAgICBzbWluLFxuICAgICAgICBiTWluRixcbiAgICAgICAgc01pbkY7XG5cbiAgICB3aGlsZSAoYmxvY2tlcikge1xuICAgICAgICBibWluID0gbnVsbDsgLy9ibG9jayBtaW4/XG4gICAgICAgIHNtaW4gPSBudWxsOyAvL3NlY3Rpb24gbWluP1xuICAgICAgICBiTWluRiA9IENPTlNUQU5UUy5FRF9NSU5DT09SRCAtIDE7XG4gICAgICAgIHNNaW5GID0gQ09OU1RBTlRTLkVEX01JTkNPT1JEIC0gMTtcblxuICAgICAgICB0aGlzLl9zZWN0aW9uQmVnaW5TY2FuKGJsb2NrZXIpO1xuICAgICAgICB3aGlsZSAodGhpcy5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zZWN0aW9uSXNJbW1lZGlhdGUoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrZWQgPSB0aGlzLl9zZWN0aW9uR2V0QmxvY2tlZEVkZ2UoKTtcbiAgICAgICAgICAgICAgICBhc3NlcnQoYmxvY2tlZCAhPT0gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuX2Jsb2NrUHVzaEZvcndhcmQ6IGJsb2NrZWQgIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYmxvY2tlZC5nZXRCbG9ja1ByZXYoKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZmllZCA9IHRoaXMuX2Jsb2NrUHVzaEJhY2t3YXJkKGJsb2NrZWQsIGJsb2NrZXIpIHx8IG1vZGlmaWVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghYmxvY2tlci5lZGdlRml4ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrZWQuYnJhY2tldE9wZW5pbmcgfHwgYmxvY2tlci5icmFja2V0Q2xvc2luZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNNaW5GIDwgYmxvY2tlZC5wb3NpdGlvblkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzTWluRiA9IGJsb2NrZWQucG9zaXRpb25ZO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNtaW4gPSBibG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJNaW5GIDwgYmxvY2tlZC5wb3NpdGlvblkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiTWluRiA9IGJsb2NrZWQucG9zaXRpb25ZO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJtaW4gPSBibG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYm1pbikge1xuICAgICAgICAgICAgaWYgKHNtaW4pIHtcbiAgICAgICAgICAgICAgICBibG9ja2VyLnNldENsb3Nlc3RQcmV2KHNNaW5GID4gYk1pbkYgPyBzbWluIDogYm1pbik7XG5cbiAgICAgICAgICAgICAgICBiTWluRiA9IGJsb2NrZXIucG9zaXRpb25ZIC0gYk1pbkY7XG4gICAgICAgICAgICAgICAgc01pbkYgPSB0aGlzLl9ibG9ja0dldEYoYmxvY2tlci5wb3NpdGlvblkgLSBzTWluRiwgMCwgMSk7XG5cbiAgICAgICAgICAgICAgICBibG9ja2VyLnNldEJsb2NrUHJldihzTWluRiA8IGJNaW5GID8gc21pbiA6IGJtaW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBibG9ja2VyLnNldEJsb2NrUHJldihibWluKTtcbiAgICAgICAgICAgICAgICBibG9ja2VyLnNldENsb3Nlc3RQcmV2KGJtaW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmxvY2tlci5zZXRCbG9ja1ByZXYoc21pbik7XG4gICAgICAgICAgICBibG9ja2VyLnNldENsb3Nlc3RQcmV2KHNtaW4pO1xuICAgICAgICB9XG5cblxuICAgICAgICBibG9ja2VyID0gYmxvY2tlci5vcmRlck5leHQ7XG4gICAgfVxuXG4gICAgdGhpcy5fcG9zaXRpb25BbGxTdG9yZVkoKTtcblxuICAgIHJldHVybiBtb2RpZmllZDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuYmxvY2tTY2FuQmFja3dhcmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcG9zaXRpb25BbGxMb2FkWCgpO1xuXG4gICAgdmFyIG1vZGlmaWVkID0gZmFsc2U7XG5cbiAgICB0aGlzLnNlY3Rpb25SZXNldCgpO1xuICAgIHZhciBibG9ja2VyID0gdGhpcy5vcmRlckxhc3QsXG4gICAgICAgIGJsb2NrZWQsXG4gICAgICAgIGJtaW4sXG4gICAgICAgIHNtaW4sXG4gICAgICAgIGJNaW5GLFxuICAgICAgICBzTWluRjtcblxuICAgIHdoaWxlIChibG9ja2VyKSB7XG4gICAgICAgIGJtaW4gPSBudWxsO1xuICAgICAgICBzbWluID0gbnVsbDtcbiAgICAgICAgYk1pbkYgPSBDT05TVEFOVFMuRURfTUFYQ09PUkQgKyAxO1xuICAgICAgICBzTWluRiA9IENPTlNUQU5UUy5FRF9NQVhDT09SRCArIDE7XG5cbiAgICAgICAgdGhpcy5fc2VjdGlvbkJlZ2luU2NhbihibG9ja2VyKTtcblxuICAgICAgICB3aGlsZSAodGhpcy5fc2VjdGlvbkhhc0Jsb2NrZWRFZGdlKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zZWN0aW9uSXNJbW1lZGlhdGUoKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrZWQgPSB0aGlzLl9zZWN0aW9uR2V0QmxvY2tlZEVkZ2UoKTtcblxuICAgICAgICAgICAgICAgIGFzc2VydChibG9ja2VkICE9PSBudWxsLFxuICAgICAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5ibG9ja1NjYW5CYWNrd2FyZDogYmxvY2tlZCAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgICAgICAgICAgICAgIGlmIChibG9ja2VkLmdldEJsb2NrTmV4dCgpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdGhpcy5fYmxvY2tQdXNoRm9yd2FyZChibG9ja2VkLCBibG9ja2VyKSB8fCBtb2RpZmllZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWJsb2NrZXIuZWRnZUZpeGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9ja2VyLmJyYWNrZXRPcGVuaW5nIHx8IGJsb2NrZWQuYnJhY2tldENsb3NpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzTWluRiA+IGJsb2NrZWQucG9zaXRpb25ZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc01pbkYgPSBibG9ja2VkLnBvc2l0aW9uWTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzbWluID0gYmxvY2tlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiTWluRiA+IGJsb2NrZWQucG9zaXRpb25ZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYk1pbkYgPSBibG9ja2VkLnBvc2l0aW9uWTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibWluID0gYmxvY2tlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChibWluKSB7XG4gICAgICAgICAgICBpZiAoc21pbikge1xuICAgICAgICAgICAgICAgIGJsb2NrZXIuc2V0Q2xvc2VzdE5leHQoc01pbkYgPCBiTWluRiA/IHNtaW4gOiBibWluKTtcblxuICAgICAgICAgICAgICAgIGJNaW5GID0gYk1pbkYgLSBibG9ja2VyLnBvc2l0aW9uWTtcbiAgICAgICAgICAgICAgICBzTWluRiA9IHRoaXMuX2Jsb2NrR2V0RihzTWluRiAtIGJsb2NrZXIucG9zaXRpb25ZLCAwLCAxKTtcblxuICAgICAgICAgICAgICAgIGJsb2NrZXIuc2V0QmxvY2tOZXh0KHNNaW5GIDwgYk1pbkYgPyBzbWluIDogYm1pbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJsb2NrZXIuc2V0QmxvY2tOZXh0KGJtaW4pO1xuICAgICAgICAgICAgICAgIGJsb2NrZXIuc2V0Q2xvc2VzdE5leHQoYm1pbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBibG9ja2VyLnNldEJsb2NrTmV4dChzbWluKTtcbiAgICAgICAgICAgIGJsb2NrZXIuc2V0Q2xvc2VzdE5leHQoc21pbik7XG4gICAgICAgIH1cblxuICAgICAgICBibG9ja2VyID0gYmxvY2tlci5vcmRlclByZXY7XG4gICAgfVxuXG4gICAgdGhpcy5fcG9zaXRpb25BbGxTdG9yZVkoKTtcblxuICAgIHJldHVybiBtb2RpZmllZDtcbn07XG5cbkF1dG9Sb3V0ZXJFZGdlTGlzdC5wcm90b3R5cGUuYmxvY2tTd2l0Y2hXcm9uZ3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdhcyA9IGZhbHNlO1xuXG4gICAgdGhpcy5fcG9zaXRpb25BbGxMb2FkWCgpO1xuICAgIHZhciBzZWNvbmQgPSB0aGlzLm9yZGVyRmlyc3QsXG4gICAgICAgIGVkZ2UsXG4gICAgICAgIG5leHQsXG4gICAgICAgIGV5LFxuICAgICAgICBueSxcbiAgICAgICAgYTtcblxuICAgIHdoaWxlIChzZWNvbmQgIT09IG51bGwpIHtcbiAgICAgICAgLy9DaGVjayBpZiBpdCByZWZlcmVuY2VzIGl0c2VsZlxuICAgICAgICBpZiAoc2Vjb25kLmdldENsb3Nlc3RQcmV2KCkgIT09IG51bGwgJiYgc2Vjb25kLmdldENsb3Nlc3RQcmV2KCkuZ2V0Q2xvc2VzdE5leHQoKSAhPT0gKHNlY29uZCkgJiZcbiAgICAgICAgICAgIHNlY29uZC5nZXRDbG9zZXN0TmV4dCgpICE9PSBudWxsICYmIHNlY29uZC5nZXRDbG9zZXN0TmV4dCgpLmdldENsb3Nlc3RQcmV2KCkgPT09IChzZWNvbmQpKSB7XG5cbiAgICAgICAgICAgIGFzc2VydCghc2Vjb25kLmVkZ2VGaXhlZCxcbiAgICAgICAgICAgICAgICAnQVJFZGdlTGlzdC5ibG9ja1N3aXRjaFdyb25nczogIXNlY29uZC5lZGdlRml4ZWQgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgIGVkZ2UgPSBzZWNvbmQ7XG4gICAgICAgICAgICBuZXh0ID0gZWRnZS5nZXRDbG9zZXN0TmV4dCgpO1xuXG4gICAgICAgICAgICB3aGlsZSAobmV4dCAhPT0gbnVsbCAmJiBlZGdlID09PSBuZXh0LmdldENsb3Nlc3RQcmV2KCkpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQoZWRnZSAhPT0gbnVsbCAmJiAhZWRnZS5lZGdlRml4ZWQsXG4gICAgICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0LmJsb2NrU3dpdGNoV3JvbmdzOiBlZGdlICE9IG51bGwgJiYgIWVkZ2UuZWRnZUZpeGVkIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgIGFzc2VydChuZXh0ICE9PSBudWxsICYmICFuZXh0LmVkZ2VGaXhlZCxcbiAgICAgICAgICAgICAgICAgICAgJ0FSRWRnZUxpc3QuYmxvY2tTd2l0Y2hXcm9uZ3M6IG5leHQgIT0gbnVsbCAmJiAhbmV4dC5lZGdlRml4ZWQgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICBleSA9IGVkZ2UucG9zaXRpb25ZO1xuICAgICAgICAgICAgICAgIG55ID0gbmV4dC5wb3NpdGlvblk7XG5cbiAgICAgICAgICAgICAgICBhc3NlcnQoZXkgPD0gbnksXG4gICAgICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0LmJsb2NrU3dpdGNoV3JvbmdzOiBleSA8PSBueSBGQUlMRUQnKTtcblxuICAgICAgICAgICAgICAgIGlmIChleSArIDEgPD0gbnkgJiYgdGhpcy5fYnJhY2tldFNob3VsZEJlU3dpdGNoZWQoZWRnZSwgbmV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgd2FzID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoIWVkZ2UuZ2V0RWRnZUNhbnBhc3NlZCgpICYmICFuZXh0LmdldEVkZ2VDYW5wYXNzZWQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0LmJsb2NrU3dpdGNoV3JvbmdzOiAhZWRnZS5nZXRFZGdlQ2FucGFzc2VkKCkgJiYgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnIW5leHQuZ2V0RWRnZUNhbnBhc3NlZCgpIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgICAgICBlZGdlLnNldEVkZ2VDYW5wYXNzZWQodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIG5leHQuc2V0RWRnZUNhbnBhc3NlZCh0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICBhID0gdGhpcy5fc2xpZGVCdXROb3RQYXNzRWRnZXMoZWRnZSwgKG55ICsgZXkpIC8gMiArIDAuMDAxKSAhPT0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgYSA9IHRoaXMuX3NsaWRlQnV0Tm90UGFzc0VkZ2VzKG5leHQsIChueSArIGV5KSAvIDIgLSAwLjAwMSkgIT09IG51bGwgfHwgYTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZS5zZXRDbG9zZXN0UHJldihudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2Uuc2V0Q2xvc2VzdE5leHQobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0LnNldENsb3Nlc3RQcmV2KG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dC5zZXRDbG9zZXN0TmV4dChudWxsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZS5zZXRFZGdlQ2FucGFzc2VkKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQuc2V0RWRnZUNhbnBhc3NlZChmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlZGdlLmdldENsb3Nlc3RQcmV2KCkgIT09IG51bGwgJiYgZWRnZS5nZXRDbG9zZXN0UHJldigpLmdldENsb3Nlc3ROZXh0KCkgPT09IGVkZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2UuZ2V0Q2xvc2VzdFByZXYoKS5zZXRDbG9zZXN0TmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0LmdldENsb3Nlc3ROZXh0KCkgIT09IG51bGwgJiYgbmV4dC5nZXRDbG9zZXN0TmV4dCgpLmdldENsb3Nlc3RQcmV2KCkgPT09IG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQuZ2V0Q2xvc2VzdE5leHQoKS5zZXRDbG9zZXN0UHJldihlZGdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGVkZ2Uuc2V0Q2xvc2VzdE5leHQobmV4dC5nZXRDbG9zZXN0TmV4dCgpKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5zZXRDbG9zZXN0TmV4dChlZGdlKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5zZXRDbG9zZXN0UHJldihlZGdlLmdldENsb3Nlc3RQcmV2KCkpO1xuICAgICAgICAgICAgICAgICAgICBlZGdlLnNldENsb3Nlc3RQcmV2KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGVkZ2Uuc2V0RWRnZUNhbnBhc3NlZChmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG5leHQuc2V0RWRnZUNhbnBhc3NlZChmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KCF0aGlzLl9icmFja2V0U2hvdWxkQmVTd2l0Y2hlZChuZXh0LCBlZGdlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdBUkVkZ2VMaXN0LmJsb2NrU3dpdGNoV3JvbmdzOiAhYnJhY2tldFNob3VsZEJlU3dpdGNoZWQobmV4dCwgZWRnZSkgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQuZ2V0Q2xvc2VzdFByZXYoKSAhPT0gbnVsbCAmJiBuZXh0LmdldENsb3Nlc3RQcmV2KCkuZ2V0Q2xvc2VzdE5leHQoKSA9PT0gbmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZSA9IG5leHQuZ2V0Q2xvc2VzdFByZXYoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQgPSBlZGdlLmdldENsb3Nlc3ROZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlZGdlID0gbmV4dDtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCA9IG5leHQuZ2V0Q2xvc2VzdE5leHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzZWNvbmQgPSBzZWNvbmQub3JkZXJOZXh0O1xuICAgIH1cblxuICAgIGlmICh3YXMpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb25BbGxTdG9yZVkoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd2FzO1xufTtcblxuQXV0b1JvdXRlckVkZ2VMaXN0LnByb3RvdHlwZS5hc3NlcnRWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBDaGVjayB0aGF0IGFsbCBlZGdlcyBoYXZlIHN0YXJ0L2VuZCBwb2ludHNcbiAgICB2YXIgZWRnZSA9IHRoaXMub3JkZXJGaXJzdDtcbiAgICB3aGlsZSAoZWRnZSkge1xuICAgICAgICBhc3NlcnQoZWRnZS5zdGFydHBvaW50LnggIT09IHVuZGVmaW5lZCwgJ0VkZ2UgaGFzIHVucmVjb2duaXplZCBzdGFydHBvaW50OiAnICsgZWRnZS5zdGFydHBvaW50KTtcbiAgICAgICAgYXNzZXJ0KGVkZ2UuZW5kcG9pbnQueCAhPT0gdW5kZWZpbmVkLCAnRWRnZSBoYXMgdW5yZWNvZ25pemVkIGVuZHBvaW50OiAnICsgZWRnZS5lbmRwb2ludCk7XG4gICAgICAgIGVkZ2UgPSBlZGdlLm9yZGVyTmV4dDtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dG9Sb3V0ZXJFZGdlTGlzdDtcbiIsIi8qZ2xvYmFscyBkZWZpbmUsIFdlYkdNRUdsb2JhbCovXG4vKmpzaGludCBub2RlOiB0cnVlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Mb2dnZXInKSwgIC8vIEZJWE1FXG4gICAgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgQ09OU1RBTlRTID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkNvbnN0YW50cycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlV0aWxzJyksXG4gICAgQXJQb2ludCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb2ludCcpLFxuICAgIEFyUG9pbnRMaXN0UGF0aCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb2ludExpc3QnKSxcbiAgICBBclJlY3QgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUmVjdCcpLFxuICAgIEF1dG9Sb3V0ZXJQYXRoID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBhdGgnKSxcbiAgICBBdXRvUm91dGVyUG9ydCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb3J0JyksXG4gICAgQXV0b1JvdXRlckJveCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Cb3gnKSxcbiAgICBBdXRvUm91dGVyRWRnZSA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5FZGdlJyksXG4gICAgQXV0b1JvdXRlckVkZ2VMaXN0ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkVkZ2VMaXN0Jyk7XG5cbnZhciBfbG9nZ2VyID0gbmV3IExvZ2dlcignQXV0b1JvdXRlci5HcmFwaCcpLFxuICAgIENPVU5URVIgPSAxOyAgLy8gVXNlZCBmb3IgdW5pcXVlIGlkc1xuXG52YXIgQXV0b1JvdXRlckdyYXBoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY29tcGxldGVseUNvbm5lY3RlZCA9IHRydWU7ICAvLyB0cnVlIGlmIGFsbCBwYXRocyBhcmUgY29ubmVjdGVkXG4gICAgdGhpcy5ob3Jpem9udGFsID0gbmV3IEF1dG9Sb3V0ZXJFZGdlTGlzdCh0cnVlKTtcbiAgICB0aGlzLnZlcnRpY2FsID0gbmV3IEF1dG9Sb3V0ZXJFZGdlTGlzdChmYWxzZSk7XG4gICAgdGhpcy5ib3hlcyA9IHt9O1xuICAgIHRoaXMucGF0aHMgPSBbXTtcbiAgICB0aGlzLmJ1ZmZlckJveGVzID0gW107XG4gICAgdGhpcy5ib3gyYnVmZmVyQm94ID0ge307IC8vIG1hcHMgYm94SWQgdG8gY29ycmVzcG9uZGluZyBidWZmZXJib3ggb2JqZWN0XG5cbiAgICB0aGlzLmhvcml6b250YWwub3duZXIgPSB0aGlzO1xuICAgIHRoaXMudmVydGljYWwub3duZXIgPSB0aGlzO1xuXG4gICAgLy9Jbml0aWFsaXppbmcgc2VsZlBvaW50c1xuICAgIHRoaXMuc2VsZlBvaW50cyA9IFtcbiAgICAgICAgbmV3IEFyUG9pbnQoQ09OU1RBTlRTLkVEX01JTkNPT1JELCBDT05TVEFOVFMuRURfTUlOQ09PUkQpLFxuICAgICAgICBuZXcgQXJQb2ludChDT05TVEFOVFMuRURfTUFYQ09PUkQsIENPTlNUQU5UUy5FRF9NSU5DT09SRCksXG4gICAgICAgIG5ldyBBclBvaW50KENPTlNUQU5UUy5FRF9NQVhDT09SRCwgQ09OU1RBTlRTLkVEX01BWENPT1JEKSxcbiAgICAgICAgbmV3IEFyUG9pbnQoQ09OU1RBTlRTLkVEX01JTkNPT1JELCBDT05TVEFOVFMuRURfTUFYQ09PUkQpXG4gICAgXTtcblxuICAgIHRoaXMuX2FkZFNlbGZFZGdlcygpO1xufTtcblxuLy9GdW5jdGlvbnNcbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2RlbGV0ZUFsbEJveGVzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBPYmplY3Qua2V5cyh0aGlzLmJveGVzKTtcbiAgICBmb3IgKHZhciBpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLmJveGVzW2lkc1tpXV0uZGVzdHJveSgpO1xuICAgICAgICBkZWxldGUgdGhpcy5ib3hlc1tpZHNbaV1dO1xuICAgIH1cbiAgICAvLyBDbGVhbiB1cCB0aGUgYnVmZmVyQm94ZXNcbiAgICB0aGlzLmJ1ZmZlckJveGVzID0gW107XG4gICAgdGhpcy5ib3gyYnVmZmVyQm94ID0ge307XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9nZXRCb3hBdCA9IGZ1bmN0aW9uIChwb2ludCwgbmVhcm5lc3MpIHtcbiAgICB2YXIgaWRzID0gT2JqZWN0LmtleXModGhpcy5ib3hlcyk7XG4gICAgZm9yICh2YXIgaSA9IGlkcy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgaWYgKHRoaXMuYm94ZXNbaWRzW2ldXS5pc0JveEF0KHBvaW50LCBuZWFybmVzcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJveGVzW2lkc1tpXV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3NldFBvcnRBdHRyID0gZnVuY3Rpb24gKHBvcnQsIGF0dHIpIHtcbiAgICB0aGlzLl9kaXNjb25uZWN0UGF0aHNGcm9tKHBvcnQpO1xuICAgIHBvcnQuYXR0cmlidXRlcyA9IGF0dHI7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9pc1JlY3RDbGlwQm94ZXMgPSBmdW5jdGlvbiAocmVjdCkge1xuICAgIHZhciBib3hSZWN0O1xuICAgIHZhciBpZHMgPSBPYmplY3Qua2V5cyh0aGlzLmJveGVzKTtcbiAgICBmb3IgKHZhciBpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICBib3hSZWN0ID0gdGhpcy5ib3hlc1tpZHNbaV1dLnJlY3Q7XG4gICAgICAgIGlmIChVdGlscy5pc1JlY3RDbGlwKHJlY3QsIGJveFJlY3QpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9pc1JlY3RDbGlwQnVmZmVyQm94ZXMgPSBmdW5jdGlvbiAocmVjdCkge1xuICAgIHZhciBpID0gdGhpcy5idWZmZXJCb3hlcy5sZW5ndGgsXG4gICAgICAgIGM7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGMgPSB0aGlzLmJ1ZmZlckJveGVzW2ldLmNoaWxkcmVuLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoYy0tKSB7XG4gICAgICAgICAgICBpZiAoVXRpbHMuaXNSZWN0Q2xpcChyZWN0LCB0aGlzLmJ1ZmZlckJveGVzW2ldLmNoaWxkcmVuW2NdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5faXNMaW5lQ2xpcEJ1ZmZlckJveGVzID0gZnVuY3Rpb24gKHAxLCBwMikge1xuICAgIHZhciByZWN0ID0gbmV3IEFyUmVjdChwMSwgcDIpO1xuICAgIHJlY3Qubm9ybWFsaXplUmVjdCgpO1xuICAgIGFzc2VydChyZWN0LmxlZnQgPT09IHJlY3QucmlnaHQgfHwgcmVjdC5jZWlsID09PSByZWN0LmZsb29yLFxuICAgICAgICAnQVJHcmFwaC50aGlzLl9pc0xpbmVDbGlwQm94ZXM6IHJlY3QubGVmdCA9PT0gcmVjdC5yaWdodCB8fCByZWN0LmNlaWwgPT09IHJlY3QuZmxvb3IgRkFJTEVEJyk7XG5cbiAgICBpZiAocmVjdC5sZWZ0ID09PSByZWN0LnJpZ2h0KSB7XG4gICAgICAgIHJlY3QucmlnaHQrKztcbiAgICB9XG4gICAgaWYgKHJlY3QuY2VpbCA9PT0gcmVjdC5mbG9vcikge1xuICAgICAgICByZWN0LmZsb29yKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2lzUmVjdENsaXBCdWZmZXJCb3hlcyhyZWN0KTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2lzTGluZUNsaXBCb3hlcyA9IGZ1bmN0aW9uIChwMSwgcDIpIHtcbiAgICB2YXIgcmVjdCA9IG5ldyBBclJlY3QocDEsIHAyKTtcbiAgICByZWN0Lm5vcm1hbGl6ZVJlY3QoKTtcbiAgICBhc3NlcnQocmVjdC5sZWZ0ID09PSByZWN0LnJpZ2h0IHx8IHJlY3QuY2VpbCA9PT0gcmVjdC5mbG9vcixcbiAgICAgICAgJ0FSR3JhcGguaXNMaW5lQ2xpcEJveGVzOiByZWN0LmxlZnQgPT09IHJlY3QucmlnaHQgfHwgcmVjdC5jZWlsID09PSByZWN0LmZsb29yIEZBSUxFRCcpO1xuXG4gICAgaWYgKHJlY3QubGVmdCA9PT0gcmVjdC5yaWdodCkge1xuICAgICAgICByZWN0LnJpZ2h0Kys7XG4gICAgfVxuICAgIGlmIChyZWN0LmNlaWwgPT09IHJlY3QuZmxvb3IpIHtcbiAgICAgICAgcmVjdC5mbG9vcisrO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9pc1JlY3RDbGlwQm94ZXMocmVjdCk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9jYW5Cb3hBdCA9IGZ1bmN0aW9uIChyZWN0KSB7XG4gICAgcmV0dXJuICF0aGlzLl9pc1JlY3RDbGlwQm94ZXMuaW5mbGF0ZWRSZWN0KHJlY3QsIDEpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fYWRkID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBhc3NlcnQocGF0aCAhPT0gbnVsbCwgJ0FSR3JhcGguYWRkOiBwYXRoICE9PSBudWxsIEZBSUxFRCcpO1xuICAgIGFzc2VydCghcGF0aC5oYXNPd25lcigpLCAnQVJHcmFwaC5hZGQ6ICFwYXRoLmhhc093bmVyKCkgRkFJTEVEJyk7XG5cbiAgICBwYXRoLm93bmVyID0gdGhpcztcblxuICAgIHRoaXMucGF0aHMucHVzaChwYXRoKTtcblxuICAgIHRoaXMuaG9yaXpvbnRhbC5hZGRQYXRoRWRnZXMocGF0aCk7XG4gICAgdGhpcy52ZXJ0aWNhbC5hZGRQYXRoRWRnZXMocGF0aCk7XG5cbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHRoaXMuX2Fzc2VydFZhbGlkUGF0aChwYXRoKTtcbiAgICB9XG5cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2RlbGV0ZUFsbFBhdGhzID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLnBhdGhzW2ldLmRlc3Ryb3koKTsgIC8vIFJlbW92ZSBwb2ludCBmcm9tIHN0YXJ0L2VuZCBwb3J0XG4gICAgfVxuXG4gICAgdGhpcy5wYXRocyA9IFtdO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5faGFzTm9QYXRoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnBhdGhzLmxlbmd0aCA9PT0gMDtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2dldFBhdGhDb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5wYXRocy5sZW5ndGg7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9nZXRMaXN0RWRnZUF0ID0gZnVuY3Rpb24gKHBvaW50LCBuZWFybmVzcykge1xuXG4gICAgdmFyIGVkZ2UgPSB0aGlzLmhvcml6b250YWwuZ2V0RWRnZUF0KHBvaW50LCBuZWFybmVzcyk7XG4gICAgaWYgKGVkZ2UpIHtcbiAgICAgICAgcmV0dXJuIGVkZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudmVydGljYWwuZ2V0RWRnZUF0KHBvaW50LCBuZWFybmVzcyk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9nZXRTdXJyb3VuZFJlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlY3QgPSBuZXcgQXJSZWN0KDAsIDAsIDAsIDApLFxuICAgICAgICBpO1xuXG4gICAgdmFyIGlkcyA9IE9iamVjdC5rZXlzKHRoaXMuYm94ZXMpO1xuICAgIGZvciAoaSA9IGlkcy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgcmVjdC51bmlvbkFzc2lnbih0aGlzLmJveGVzW2lkc1tpXV0ucmVjdCk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gdGhpcy5wYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgcmVjdC51bmlvbkFzc2lnbih0aGlzLnBhdGhzW2ldLmdldFN1cnJvdW5kUmVjdCgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVjdDtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2dldE91dE9mQm94ID0gZnVuY3Rpb24gKGRldGFpbHMpIHtcbiAgICB2YXIgYnVmZmVyT2JqZWN0ID0gdGhpcy5ib3gyYnVmZmVyQm94W2RldGFpbHMuYm94LmlkXSxcbiAgICAgICAgY2hpbGRyZW4gPSBidWZmZXJPYmplY3QuY2hpbGRyZW4sXG4gICAgICAgIGkgPSBidWZmZXJPYmplY3QuY2hpbGRyZW4ubGVuZ3RoLFxuICAgICAgICBwb2ludCA9IGRldGFpbHMucG9pbnQsXG4gICAgICAgIGRpciA9IGRldGFpbHMuZGlyLFxuICAgICAgICBib3hSZWN0ID0gbmV3IEFyUmVjdChkZXRhaWxzLmJveC5yZWN0KTtcblxuICAgIGJveFJlY3QuaW5mbGF0ZVJlY3QoQ09OU1RBTlRTLkJVRkZFUik7IC8vQ3JlYXRlIGEgY29weSBvZiB0aGUgYnVmZmVyIGJveFxuXG4gICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIpLCAnQVJHcmFwaC5nZXRPdXRPZkJveDogVXRpbHMuaXNSaWdodEFuZ2xlIChkaXIpIEZBSUxFRCcpO1xuXG4gICAgd2hpbGUgKGJveFJlY3QucHRJblJlY3QocG9pbnQpKSB7XG4gICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyKSkge1xuICAgICAgICAgICAgcG9pbnQueCA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGJveFJlY3QsIGRpcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb2ludC55ID0gVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQoYm94UmVjdCwgZGlyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGlmIChjaGlsZHJlbltpXS5wdEluUmVjdChwb2ludCkpIHtcbiAgICAgICAgICAgICAgICBib3hSZWN0ID0gY2hpbGRyZW5baV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaSA9IGJ1ZmZlck9iamVjdC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgfVxuXG4gICAgYXNzZXJ0KCFib3hSZWN0LnB0SW5SZWN0KHBvaW50KSwgJ0FSR3JhcGguZ2V0T3V0T2ZCb3g6ICFib3hSZWN0LnB0SW5SZWN0KCBwb2ludCkgRkFJTEVEJyk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9nb1RvTmV4dEJ1ZmZlckJveCA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIHBvaW50ID0gYXJncy5wb2ludCxcbiAgICAgICAgZW5kID0gYXJncy5lbmQsXG4gICAgICAgIGRpciA9IGFyZ3MuZGlyLFxuICAgICAgICBkaXIyID0gYXJncy5kaXIyID09PSB1bmRlZmluZWQgfHwgIVV0aWxzLmlzUmlnaHRBbmdsZShhcmdzLmRpcjIpID8gKGVuZCBpbnN0YW5jZW9mIEFyUG9pbnQgP1xuICAgICAgICAgICAgVXRpbHMuZXhHZXRNYWpvckRpcihlbmQubWludXMocG9pbnQpKSA6IENPTlNUQU5UUy5EaXJOb25lKSA6IGFyZ3MuZGlyMixcbiAgICAgICAgc3RvcGhlcmUgPSBhcmdzLmVuZCAhPT0gdW5kZWZpbmVkID8gYXJncy5lbmQgOlxuICAgICAgICAgICAgKGRpciA9PT0gMSB8fCBkaXIgPT09IDIgPyBDT05TVEFOVFMuRURfTUFYQ09PUkQgOiBDT05TVEFOVFMuRURfTUlOQ09PUkQgKTtcblxuICAgIGlmIChkaXIyID09PSBkaXIpIHtcbiAgICAgICAgZGlyMiA9IFV0aWxzLmlzUmlnaHRBbmdsZShVdGlscy5leEdldE1pbm9yRGlyKGVuZC5taW51cyhwb2ludCkpKSA/XG4gICAgICAgICAgICBVdGlscy5leEdldE1pbm9yRGlyKGVuZC5taW51cyhwb2ludCkpIDogKGRpciArIDEpICUgNDtcbiAgICB9XG5cbiAgICBpZiAoZW5kIGluc3RhbmNlb2YgQXJQb2ludCkge1xuICAgICAgICBzdG9waGVyZSA9IFV0aWxzLmdldFBvaW50Q29vcmQoc3RvcGhlcmUsIGRpcik7XG4gICAgfVxuXG4gICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIpLCAnQXJHcmFwaC5nb1RvTmV4dEJ1ZmZlckJveDogVXRpbHMuaXNSaWdodEFuZ2xlIChkaXIpIEZBSUxFRCcpO1xuICAgIGFzc2VydChVdGlscy5nZXRQb2ludENvb3JkKHBvaW50LCBkaXIpICE9PSBzdG9waGVyZSxcbiAgICAgICAgJ0FyR3JhcGguZ29Ub05leHRCdWZmZXJCb3g6IFV0aWxzLmdldFBvaW50Q29vcmQgKHBvaW50LCBkaXIpICE9PSBzdG9waGVyZSBGQUlMRUQnKTtcblxuICAgIHZhciBib3hieSA9IG51bGwsXG4gICAgICAgIGkgPSAtMSxcbiAgICAgICAgYm94UmVjdDtcbiAgICAvL2pzY3M6ZGlzYWJsZSBtYXhpbXVtTGluZUxlbmd0aFxuICAgIHdoaWxlICgrK2kgPCB0aGlzLmJ1ZmZlckJveGVzLmxlbmd0aCkge1xuICAgICAgICBib3hSZWN0ID0gdGhpcy5idWZmZXJCb3hlc1tpXS5ib3g7XG5cbiAgICAgICAgaWYgKCFVdGlscy5pc1BvaW50SW5EaXJGcm9tKHBvaW50LCBib3hSZWN0LCBkaXIpICYmIC8vQWRkIHN1cHBvcnQgZm9yIGVudGVyaW5nIHRoZSBwYXJlbnQgYm94XG4gICAgICAgICAgICBVdGlscy5pc1BvaW50QmV0d2VlblNpZGVzKHBvaW50LCBib3hSZWN0LCBkaXIpICYmICAvLyBpZiBpdCB3aWxsIG5vdCBwdXQgdGhlIHBvaW50IGluIGEgY29ybmVyIChyZWxhdGl2ZSB0byBkaXIyKVxuICAgICAgICAgICAgVXRpbHMuaXNDb29yZEluRGlyRnJvbShzdG9waGVyZSxcbiAgICAgICAgICAgICAgICBVdGlscy5nZXRDaGlsZFJlY3RPdXRlckNvb3JkRnJvbSh0aGlzLmJ1ZmZlckJveGVzW2ldLCBkaXIsIHBvaW50KS5jb29yZCwgZGlyKSkge1xuICAgICAgICAgICAgLy9SZXR1cm4gZXh0cmVtZSAocGFyZW50IGJveCkgZm9yIHRoaXMgY29tcGFyaXNvblxuICAgICAgICAgICAgc3RvcGhlcmUgPSBVdGlscy5nZXRDaGlsZFJlY3RPdXRlckNvb3JkRnJvbSh0aGlzLmJ1ZmZlckJveGVzW2ldLCBkaXIsIHBvaW50KS5jb29yZDtcbiAgICAgICAgICAgIGJveGJ5ID0gdGhpcy5idWZmZXJCb3hlc1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL2pzY3M6ZW5hYmxlIG1heGltdW1MaW5lTGVuZ3RoXG5cbiAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKGRpcikpIHtcbiAgICAgICAgcG9pbnQueCA9IHN0b3BoZXJlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBvaW50LnkgPSBzdG9waGVyZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYm94Ynk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9odWdDaGlsZHJlbiA9IGZ1bmN0aW9uIChidWZmZXJPYmplY3QsIHBvaW50LCBkaXIxLCBkaXIyLCBleGl0Q29uZGl0aW9uKSB7XG4gICAgLy8gVGhpcyBtZXRob2QgY3JlYXRlcyBhIHBhdGggdGhhdCBlbnRlcnMgdGhlIHBhcmVudCBib3ggYW5kICdodWdzJyB0aGUgY2hpbGRyZW4gYm94ZXNcbiAgICAvLyAocmVtYWlucyB3aXRoaW4gb25lIHBpeGVsIG9mIHRoZW0pIGFuZCBmb2xsb3dzIHRoZW0gb3V0LlxuICAgIGFzc2VydCgoZGlyMSArIGRpcjIpICUgMiA9PT0gMSwgJ0FSR3JhcGguaHVnQ2hpbGRyZW46IE9uZSBhbmQgb25seSBvbmUgZGlyZWN0aW9uIG11c3QgYmUgaG9yaXpvbnRhbCcpO1xuICAgIHZhciBjaGlsZHJlbiA9IGJ1ZmZlck9iamVjdC5jaGlsZHJlbixcbiAgICAgICAgcGFyZW50Qm94ID0gYnVmZmVyT2JqZWN0LmJveCxcbiAgICAgICAgaW5pdFBvaW50ID0gbmV3IEFyUG9pbnQocG9pbnQpLFxuICAgICAgICBjaGlsZCA9IHRoaXMuX2dvVG9OZXh0Qm94KHBvaW50LCBkaXIxLCAoZGlyMSA9PT0gMSB8fCBkaXIxID09PSAyID9cbiAgICAgICAgICAgIENPTlNUQU5UUy5FRF9NQVhDT09SRCA6IENPTlNUQU5UUy5FRF9NSU5DT09SRCApLCBjaGlsZHJlbiksXG4gICAgICAgIGZpbmFsUG9pbnQsXG4gICAgICAgIGRpciA9IGRpcjIsXG4gICAgICAgIG5leHREaXIgPSBVdGlscy5uZXh0Q2xvY2t3aXNlRGlyKGRpcjEpID09PSBkaXIyID8gVXRpbHMubmV4dENsb2Nrd2lzZURpciA6IFV0aWxzLnByZXZDbG9ja3dpc2VEaXIsXG4gICAgICAgIHBvaW50cyA9IFtuZXcgQXJQb2ludChwb2ludCldLFxuICAgICAgICBoYXNFeGl0ID0gdHJ1ZSxcbiAgICAgICAgbmV4dENoaWxkLFxuICAgICAgICBvbGQ7XG5cbiAgICBhc3NlcnQoY2hpbGQgIT09IG51bGwsICdBUkdyYXBoLmh1Z0NoaWxkcmVuOiBjaGlsZCAhPT0gbnVsbCBGQUlMRUQnKTtcbiAgICBleGl0Q29uZGl0aW9uID0gZXhpdENvbmRpdGlvbiA9PT0gdW5kZWZpbmVkID8gZnVuY3Rpb24gKHB0KSB7XG4gICAgICAgIHJldHVybiAhcGFyZW50Qm94LnB0SW5SZWN0KHB0KTtcbiAgICB9IDogZXhpdENvbmRpdGlvbjtcblxuICAgIF9sb2dnZXIuaW5mbygnQWJvdXQgdG8gaHVnIGNoaWxkIGJveGVzIHRvIGZpbmQgYSBwYXRoJyk7XG4gICAgd2hpbGUgKGhhc0V4aXQgJiYgIWV4aXRDb25kaXRpb24ocG9pbnQsIGJ1ZmZlck9iamVjdCkpIHtcbiAgICAgICAgb2xkID0gbmV3IEFyUG9pbnQocG9pbnQpO1xuICAgICAgICBuZXh0Q2hpbGQgPSB0aGlzLl9nb1RvTmV4dEJveChwb2ludCwgZGlyLCBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChjaGlsZCwgZGlyKSwgY2hpbGRyZW4pO1xuXG4gICAgICAgIGlmICghcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXS5lcXVhbHMob2xkKSkge1xuICAgICAgICAgICAgcG9pbnRzLnB1c2gobmV3IEFyUG9pbnQob2xkKSk7IC8vVGhlIHBvaW50cyBhcnJheSBzaG91bGQgbm90IGNvbnRhaW4gdGhlIG1vc3QgcmVjZW50IHBvaW50LlxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5leHRDaGlsZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGlyID0gVXRpbHMucmV2ZXJzZURpcihuZXh0RGlyKGRpcikpO1xuICAgICAgICB9IGVsc2UgaWYgKFV0aWxzLmlzQ29vcmRJbkRpckZyb20oVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQobmV4dENoaWxkLCBVdGlscy5yZXZlcnNlRGlyKG5leHREaXIoZGlyKSkpLFxuICAgICAgICAgICAgICAgIFV0aWxzLmdldFBvaW50Q29vcmQocG9pbnQsIFV0aWxzLnJldmVyc2VEaXIobmV4dERpcihkaXIpKSksIFV0aWxzLnJldmVyc2VEaXIobmV4dERpcihkaXIpKSkpIHtcbiAgICAgICAgICAgIGRpciA9IG5leHREaXIoZGlyKTtcbiAgICAgICAgICAgIGNoaWxkID0gbmV4dENoaWxkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpbmFsUG9pbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZmluYWxQb2ludCA9IG5ldyBBclBvaW50KHBvaW50KTtcbiAgICAgICAgfSBlbHNlIGlmICghZmluYWxQb2ludC5lcXVhbHMob2xkKSkge1xuICAgICAgICAgICAgaGFzRXhpdCA9ICFwb2ludC5lcXVhbHMoZmluYWxQb2ludCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9pbnRzWzBdLmVxdWFscyhpbml0UG9pbnQpKSB7XG4gICAgICAgIHBvaW50cy5zcGxpY2UoMCwgMSk7XG4gICAgfVxuXG4gICAgaWYgKCFoYXNFeGl0KSB7XG4gICAgICAgIHBvaW50cyA9IG51bGw7XG4gICAgICAgIHBvaW50LmFzc2lnbihpbml0UG9pbnQpO1xuICAgIH1cblxuICAgIHJldHVybiBwb2ludHM7XG5cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2dvVG9OZXh0Qm94ID0gZnVuY3Rpb24gKHBvaW50LCBkaXIsIHN0b3AxLCBib3hMaXN0KSB7XG4gICAgdmFyIHN0b3BoZXJlID0gc3RvcDE7XG5cbiAgICAvKlxuICAgICBpZiAoc3RvcDIgIT09IHVuZGVmaW5lZCkge1xuICAgICBpZiAoc3RvcDIgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICBib3hMaXN0ID0gc3RvcDI7XG4gICAgIH0gZWxzZSB7XG4gICAgIHN0b3BoZXJlID0gc3RvcDEgaW5zdGFuY2VvZiBBclBvaW50ID9cbiAgICAgY2hvb3NlSW5EaXIuZ2V0UG9pbnRDb29yZCAoc3RvcDEsIGRpciksIFV0aWxzLmdldFBvaW50Q29vcmQgKHN0b3AyLCBkaXIpLCBVdGlscy5yZXZlcnNlRGlyIChkaXIpKSA6XG4gICAgIGNob29zZUluRGlyKHN0b3AxLCBzdG9wMiwgVXRpbHMucmV2ZXJzZURpciAoZGlyKSk7XG4gICAgIH1cblxuICAgICB9ZWxzZSAqL1xuICAgIGlmIChzdG9wMSBpbnN0YW5jZW9mIEFyUG9pbnQpIHtcbiAgICAgICAgc3RvcGhlcmUgPSBVdGlscy5nZXRQb2ludENvb3JkKHN0b3BoZXJlLCBkaXIpO1xuICAgIH1cblxuICAgIGFzc2VydChVdGlscy5pc1JpZ2h0QW5nbGUoZGlyKSwgJ0FyR3JhcGguZ29Ub05leHRCb3g6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyKSBGQUlMRUQnKTtcbiAgICBhc3NlcnQoVXRpbHMuZ2V0UG9pbnRDb29yZChwb2ludCwgZGlyKSAhPT0gc3RvcGhlcmUsXG4gICAgICAgICdBckdyYXBoLmdvVG9OZXh0Qm94OiBVdGlscy5nZXRQb2ludENvb3JkIChwb2ludCwgZGlyKSAhPT0gc3RvcGhlcmUgRkFJTEVEJyk7XG5cbiAgICB2YXIgYm94YnkgPSBudWxsLFxuICAgICAgICBpdGVyID0gYm94TGlzdC5sZW5ndGgsXG4gICAgICAgIGJveFJlY3Q7XG5cbiAgICB3aGlsZSAoaXRlci0tKSB7XG4gICAgICAgIGJveFJlY3QgPSBib3hMaXN0W2l0ZXJdO1xuXG4gICAgICAgIGlmIChVdGlscy5pc1BvaW50SW5EaXJGcm9tKHBvaW50LCBib3hSZWN0LCBVdGlscy5yZXZlcnNlRGlyKGRpcikpICYmXG4gICAgICAgICAgICBVdGlscy5pc1BvaW50QmV0d2VlblNpZGVzKHBvaW50LCBib3hSZWN0LCBkaXIpICYmXG4gICAgICAgICAgICBVdGlscy5pc0Nvb3JkSW5EaXJGcm9tKHN0b3BoZXJlLCBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChib3hSZWN0LCBVdGlscy5yZXZlcnNlRGlyKGRpcikpLCBkaXIpKSB7XG4gICAgICAgICAgICBzdG9waGVyZSA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGJveFJlY3QsIFV0aWxzLnJldmVyc2VEaXIoZGlyKSk7XG4gICAgICAgICAgICBib3hieSA9IGJveExpc3RbaXRlcl07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKGRpcikpIHtcbiAgICAgICAgcG9pbnQueCA9IHN0b3BoZXJlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBvaW50LnkgPSBzdG9waGVyZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYm94Ynk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9nZXRMaW1pdHNPZkVkZ2UgPSBmdW5jdGlvbiAoc3RhcnRQdCwgZW5kUHQsIG1pbiwgbWF4KSB7XG4gICAgdmFyIHQsXG4gICAgICAgIHN0YXJ0ID0gKG5ldyBBclBvaW50KHN0YXJ0UHQpKSxcbiAgICAgICAgZW5kID0gKG5ldyBBclBvaW50KGVuZFB0KSksXG4gICAgICAgIGlkcyA9IE9iamVjdC5rZXlzKHRoaXMuYm94ZXMpLFxuICAgICAgICBpLFxuICAgICAgICByZWN0O1xuXG4gICAgaWYgKHN0YXJ0LnkgPT09IGVuZC55KSB7XG4gICAgICAgIGlmIChzdGFydC54ID4gZW5kLngpIHtcbiAgICAgICAgICAgIHQgPSBzdGFydC54O1xuICAgICAgICAgICAgc3RhcnQueCA9IGVuZC54O1xuICAgICAgICAgICAgZW5kLnggPSB0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICAgICAgcmVjdCA9IHRoaXMuYm94ZXNbaWRzW2ldXS5yZWN0O1xuXG4gICAgICAgICAgICBpZiAoc3RhcnQueCA8IHJlY3QucmlnaHQgJiYgcmVjdC5sZWZ0IDw9IGVuZC54KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY3QuZmxvb3IgPD0gc3RhcnQueSAmJiByZWN0LmZsb29yID4gbWluKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IHJlY3QuZmxvb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZWN0LmNlaWwgPiBzdGFydC55ICYmIHJlY3QuY2VpbCA8IG1heCkge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSByZWN0LmNlaWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0KHN0YXJ0LnggPT09IGVuZC54LCAnQVJHcmFwaC50aGlzLmdldExpbWl0c09mRWRnZTogc3RhcnQueCA9PT0gZW5kLnggRkFJTEVEJyk7XG5cbiAgICAgICAgaWYgKHN0YXJ0LnkgPiBlbmQueSkge1xuICAgICAgICAgICAgdCA9IHN0YXJ0Lnk7XG4gICAgICAgICAgICBzdGFydC55ID0gZW5kLnk7XG4gICAgICAgICAgICBlbmQueSA9IHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSBpZHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgICByZWN0ID0gdGhpcy5ib3hlc1tpZHNbaV1dLnJlY3Q7XG5cbiAgICAgICAgICAgIGlmIChzdGFydC55IDwgcmVjdC5mbG9vciAmJiByZWN0LmNlaWwgPD0gZW5kLnkpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjdC5yaWdodCA8PSBzdGFydC54ICYmIHJlY3QucmlnaHQgPiBtaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgbWluID0gcmVjdC5yaWdodDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJlY3QubGVmdCA+IHN0YXJ0LnggJiYgcmVjdC5sZWZ0IDwgbWF4KSB7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IHJlY3QubGVmdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYXgtLTtcblxuICAgIHJldHVybiB7bWluOiBtaW4sIG1heDogbWF4fTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Nvbm5lY3QgPSBmdW5jdGlvbiAocGF0aCkge1xuICAgIHZhciBzdGFydHBvcnQgPSBwYXRoLmdldFN0YXJ0UG9ydCgpLFxuICAgICAgICBlbmRwb3J0ID0gcGF0aC5nZXRFbmRQb3J0KCksXG4gICAgICAgIHN0YXJ0cG9pbnQgPSBwYXRoLnN0YXJ0cG9pbnQsXG4gICAgICAgIGVuZHBvaW50ID0gcGF0aC5lbmRwb2ludDtcblxuICAgIGFzc2VydChzdGFydHBvcnQuaGFzUG9pbnQoc3RhcnRwb2ludCksICdBUkdyYXBoLmNvbm5lY3Q6IHN0YXJ0cG9ydC5oYXNQb2ludChzdGFydHBvaW50KSBGQUlMRUQnKTtcbiAgICBhc3NlcnQoZW5kcG9ydC5oYXNQb2ludChlbmRwb2ludCksICdBUkdyYXBoLmNvbm5lY3Q6IGVuZHBvcnQuaGFzUG9pbnQoZW5kcG9pbnQpIEZBSUxFRCcpO1xuXG4gICAgdmFyIHN0YXJ0Um9vdCA9IHN0YXJ0cG9ydC5vd25lci5nZXRSb290Qm94KCksXG4gICAgICAgIGVuZFJvb3QgPSBlbmRwb3J0Lm93bmVyLmdldFJvb3RCb3goKSxcbiAgICAgICAgc3RhcnRJZCA9IHN0YXJ0Um9vdC5pZCxcbiAgICAgICAgZW5kSWQgPSBlbmRSb290LmlkLFxuICAgICAgICBzdGFydGRpciA9IHN0YXJ0cG9ydC5wb3J0T25XaGljaEVkZ2Uoc3RhcnRwb2ludCksXG4gICAgICAgIGVuZGRpciA9IGVuZHBvcnQucG9ydE9uV2hpY2hFZGdlKGVuZHBvaW50KTtcblxuICAgIGlmIChzdGFydHBvaW50LmVxdWFscyhlbmRwb2ludCkpIHtcbiAgICAgICAgVXRpbHMuc3RlcE9uZUluRGlyKHN0YXJ0cG9pbnQsIFV0aWxzLm5leHRDbG9ja3dpc2VEaXIoc3RhcnRkaXIpKTtcbiAgICB9XG5cbiAgICBpZiAoIXBhdGguaXNBdXRvUm91dGVkKCkpIHtcbiAgICAgICAgcGF0aC5jcmVhdGVDdXN0b21QYXRoKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmhvcml6b250YWwuYWRkUGF0aEVkZ2VzKHBhdGgpICYmIHRoaXMudmVydGljYWwuYWRkUGF0aEVkZ2VzKHBhdGgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ib3gyYnVmZmVyQm94W3N0YXJ0SWRdID09PSB0aGlzLmJveDJidWZmZXJCb3hbZW5kSWRdICYmXG4gICAgICAgIHN0YXJ0ZGlyID09PSBVdGlscy5yZXZlcnNlRGlyKGVuZGRpcikgJiYgc3RhcnRSb290ICE9PSBlbmRSb290KSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3RQb2ludHNTaGFyaW5nUGFyZW50Qm94KHBhdGgsIHN0YXJ0cG9pbnQsIGVuZHBvaW50LCBzdGFydGRpcik7XG4gICAgfSBlbHNlIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5fY29ubmVjdFBhdGhXaXRoUG9pbnRzKHBhdGgsIHN0YXJ0cG9pbnQsIGVuZHBvaW50KTtcbiAgICB9XG5cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Nvbm5lY3RQYXRoV2l0aFBvaW50cyA9IGZ1bmN0aW9uIChwYXRoLCBzdGFydHBvaW50LCBlbmRwb2ludCkge1xuICAgIGFzc2VydChzdGFydHBvaW50IGluc3RhbmNlb2YgQXJQb2ludCwgJ0FSR3JhcGguY29ubmVjdDogc3RhcnRwb2ludCBpbnN0YW5jZW9mIEFyUG9pbnQgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KHBhdGggIT09IG51bGwgJiYgcGF0aC5vd25lciA9PT0gdGhpcywgJ0FSR3JhcGguY29ubmVjdDogcGF0aCAhPT0gbnVsbCAmJiBwYXRoLm93bmVyID09PSBzZWxmIEZBSUxFRCcpO1xuICAgIGFzc2VydCghcGF0aC5pc0Nvbm5lY3RlZCgpLCAnQVJHcmFwaC5jb25uZWN0OiAhcGF0aC5pc0Nvbm5lY3RlZCgpIEZBSUxFRCcpO1xuICAgIGFzc2VydCghc3RhcnRwb2ludC5lcXVhbHMoZW5kcG9pbnQpLCAnQVJHcmFwaC5jb25uZWN0OiAhc3RhcnRwb2ludC5lcXVhbHMoZW5kcG9pbnQpIEZBSUxFRCcpO1xuXG4gICAgdmFyIHN0YXJ0UG9ydCA9IHBhdGguZ2V0U3RhcnRQb3J0KCk7XG4gICAgYXNzZXJ0KHN0YXJ0UG9ydCAhPT0gbnVsbCwgJ0FSR3JhcGguY29ubmVjdDogc3RhcnRQb3J0ICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgdmFyIHN0YXJ0ZGlyID0gc3RhcnRQb3J0LnBvcnRPbldoaWNoRWRnZShzdGFydHBvaW50KSxcbiAgICAgICAgZW5kUG9ydCA9IHBhdGguZ2V0RW5kUG9ydCgpO1xuXG4gICAgYXNzZXJ0KGVuZFBvcnQgIT09IG51bGwsICdBUkdyYXBoLmNvbm5lY3Q6IGVuZFBvcnQgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgdmFyIGVuZGRpciA9IGVuZFBvcnQucG9ydE9uV2hpY2hFZGdlKGVuZHBvaW50KTtcbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKHN0YXJ0ZGlyKSAmJiBVdGlscy5pc1JpZ2h0QW5nbGUoZW5kZGlyKSxcbiAgICAgICAgJ0FSR3JhcGguY29ubmVjdDogVXRpbHMuaXNSaWdodEFuZ2xlIChzdGFydGRpcikgJiYgVXRpbHMuaXNSaWdodEFuZ2xlIChlbmRkaXIpIEZBSUxFRCcpO1xuXG4gICAgLy9GaW5kIHRoZSBidWZmZXJib3ggY29udGFpbmluZyBzdGFydHBvaW50LCBlbmRwb2ludFxuICAgIHZhciBzdGFydCA9IG5ldyBBclBvaW50KHN0YXJ0cG9pbnQpO1xuICAgIHRoaXMuX2dldE91dE9mQm94KHtcbiAgICAgICAgcG9pbnQ6IHN0YXJ0LFxuICAgICAgICBkaXI6IHN0YXJ0ZGlyLFxuICAgICAgICBlbmQ6IGVuZHBvaW50LFxuICAgICAgICBib3g6IHN0YXJ0UG9ydC5vd25lclxuICAgIH0pO1xuICAgIGFzc2VydCghc3RhcnQuZXF1YWxzKHN0YXJ0cG9pbnQpLCAnQVJHcmFwaC5jb25uZWN0OiAhc3RhcnQuZXF1YWxzKHN0YXJ0cG9pbnQpIEZBSUxFRCcpO1xuXG4gICAgdmFyIGVuZCA9IG5ldyBBclBvaW50KGVuZHBvaW50KTtcbiAgICB0aGlzLl9nZXRPdXRPZkJveCh7XG4gICAgICAgIHBvaW50OiBlbmQsXG4gICAgICAgIGRpcjogZW5kZGlyLFxuICAgICAgICBlbmQ6IHN0YXJ0LFxuICAgICAgICBib3g6IGVuZFBvcnQub3duZXJcbiAgICB9KTtcbiAgICBhc3NlcnQoIWVuZC5lcXVhbHMoZW5kcG9pbnQpLCAnQVJHcmFwaC5jb25uZWN0OiAhZW5kLmVxdWFscyhlbmRwb2ludCkgRkFJTEVEJyk7XG5cbiAgICB2YXIgcG9pbnRzLFxuICAgICAgICBpc0F1dG9Sb3V0ZWQgPSBwYXRoLmlzQXV0b1JvdXRlZCgpO1xuICAgIGlmIChpc0F1dG9Sb3V0ZWQpIHtcbiAgICAgICAgcG9pbnRzID0gdGhpcy5fY29ubmVjdFBvaW50cyhzdGFydCwgZW5kLCBzdGFydGRpciwgZW5kZGlyKTtcbiAgICB9XG5cbiAgICBwYXRoLnBvaW50cyA9IHBvaW50cztcbiAgICBwYXRoLnBvaW50cy51bnNoaWZ0KHN0YXJ0cG9pbnQpO1xuICAgIHBhdGgucG9pbnRzLnB1c2goZW5kcG9pbnQpO1xuXG4gICAgaWYgKGlzQXV0b1JvdXRlZCkge1xuICAgICAgICB0aGlzLl9zaW1wbGlmeVBhdGhDdXJ2ZXMocGF0aCk7XG4gICAgICAgIHBhdGguc2ltcGxpZnlUcml2aWFsbHkoKTtcbiAgICAgICAgdGhpcy5fc2ltcGxpZnlQYXRoUG9pbnRzKHBhdGgpO1xuICAgICAgICB0aGlzLl9jZW50ZXJTdGFpcnNJblBhdGhQb2ludHMocGF0aCwgc3RhcnRkaXIsIGVuZGRpcik7XG4gICAgfVxuICAgIHBhdGguc2V0U3RhdGUoQ09OU1RBTlRTLlBhdGhTdGF0ZUNvbm5lY3RlZCk7XG5cbiAgICByZXR1cm4gdGhpcy5ob3Jpem9udGFsLmFkZFBhdGhFZGdlcyhwYXRoKSAmJiB0aGlzLnZlcnRpY2FsLmFkZFBhdGhFZGdlcyhwYXRoKTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Nvbm5lY3RQb2ludHNTaGFyaW5nUGFyZW50Qm94ID0gZnVuY3Rpb24gKHBhdGgsIHN0YXJ0cG9pbnQsIGVuZHBvaW50LCBzdGFydGRpcikge1xuICAgIC8vIENvbm5lY3QgcG9pbnRzIHRoYXQgc2hhcmUgYSBwYXJlbnQgYm94IGFuZCBmYWNlIGVhY2ggb3RoZXJcbiAgICAvLyBUaGVzZSB3aWxsIG5vdCBuZWVkIHRoZSBzaW1wbGlmaWNhdGlvbiBhbmQgY29tcGxpY2F0ZWQgcGF0aCBmaW5kaW5nXG4gICAgdmFyIHN0YXJ0ID0gbmV3IEFyUG9pbnQoc3RhcnRwb2ludCksXG4gICAgICAgIGR4ID0gZW5kcG9pbnQueCAtIHN0YXJ0LngsXG4gICAgICAgIGR5ID0gZW5kcG9pbnQueSAtIHN0YXJ0Lnk7XG5cbiAgICBwYXRoLmRlbGV0ZUFsbCgpO1xuXG4gICAgcGF0aC5hZGRUYWlsKHN0YXJ0cG9pbnQpO1xuICAgIGlmIChkeCAhPT0gMCAmJiBkeSAhPT0gMCkge1xuICAgICAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKHN0YXJ0ZGlyKSkge1xuICAgICAgICAgICAgc3RhcnQueCArPSBkeCAvIDI7XG4gICAgICAgICAgICBwYXRoLmFkZFRhaWwobmV3IEFyUG9pbnQoc3RhcnQpKTtcbiAgICAgICAgICAgIHN0YXJ0LnkgKz0gZHk7XG4gICAgICAgICAgICBwYXRoLmFkZFRhaWwobmV3IEFyUG9pbnQoc3RhcnQpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXJ0LnkgKz0gZHkgLyAyO1xuICAgICAgICAgICAgcGF0aC5hZGRUYWlsKG5ldyBBclBvaW50KHN0YXJ0KSk7XG4gICAgICAgICAgICBzdGFydC54ICs9IGR4O1xuICAgICAgICAgICAgcGF0aC5hZGRUYWlsKG5ldyBBclBvaW50KHN0YXJ0KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcGF0aC5hZGRUYWlsKGVuZHBvaW50KTtcblxuICAgIHBhdGguc2V0U3RhdGUoQ09OU1RBTlRTLlBhdGhTdGF0ZUNvbm5lY3RlZCk7XG5cbiAgICByZXR1cm4gdGhpcy5ob3Jpem9udGFsLmFkZFBhdGhFZGdlcyhwYXRoKSAmJiB0aGlzLnZlcnRpY2FsLmFkZFBhdGhFZGdlcyhwYXRoKTtcblxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fY29ubmVjdFBvaW50cyA9IGZ1bmN0aW9uIChzdGFydCwgZW5kLCBoaW50c3RhcnRkaXIsIGhpbnRlbmRkaXIsIGZsaXBwZWQpIHtcbiAgICB2YXIgcmV0ID0gbmV3IEFyUG9pbnRMaXN0UGF0aCgpLFxuICAgICAgICB0aGVzdGFydCA9IG5ldyBBclBvaW50KHN0YXJ0KSxcbiAgICAgICAgYnVmZmVyT2JqZWN0LFxuICAgICAgICBib3gsXG4gICAgICAgIHJlY3QsXG4gICAgICAgIGRpcjEsXG4gICAgICAgIGRpcjIsXG4gICAgICAgIG9sZCxcbiAgICAgICAgb2xkRW5kLFxuICAgICAgICByZXQyLFxuICAgICAgICBwdHMsXG4gICAgICAgIHJldixcbiAgICAgICAgaSxcblxuICAgIC8vRXhpdCBjb25kaXRpb25zXG4gICAgLy9pZiB0aGVyZSBpcyBhIHN0cmFpZ2h0IGxpbmUgdG8gdGhlIGVuZCBwb2ludFxuICAgICAgICBmaW5kRXhpdFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAocHQsIGJvKSB7XG4gICAgICAgICAgICByZXR1cm4gKHB0LnggPT09IGVuZC54IHx8IHB0LnkgPT09IGVuZC55KSAmJiAhVXRpbHMuaXNMaW5lQ2xpcFJlY3RzKHB0LCBlbmQsIGJvLmNoaWxkcmVuKTtcbiAgICAgICAgfSwgIC8vSWYgeW91IHBhc3MgdGhlIGVuZHBvaW50LCB5b3UgbmVlZCB0byBoYXZlIGEgd2F5IG91dC5cblxuICAgIC8vZXhpdENvbmRpdGlvbiBpcyB3aGVuIHlvdSBnZXQgdG8gdGhlIGRpcjEgc2lkZSBvZiB0aGUgYm94IG9yIHdoZW4geW91IHBhc3MgZW5kXG4gICAgICAgIGdldFRvRGlyMVNpZGUgPSBmdW5jdGlvbiAocHQsIGJvKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbHMuZ2V0UG9pbnRDb29yZChwdCwgZGlyMSkgPT09IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGJvLmJveCwgZGlyMSkgfHxcbiAgICAgICAgICAgICAgICAoIFV0aWxzLmlzUG9pbnRJbkRpckZyb20ocHQsIGVuZCwgZGlyMSkpO1xuICAgICAgICB9O1xuXG5cbiAgICAvL1RoaXMgaXMgd2hlcmUgd2UgY3JlYXRlIHRoZSBvcmlnaW5hbCBwYXRoIHRoYXQgd2Ugd2lsbCBsYXRlciBhZGp1c3RcbiAgICB3aGlsZSAoIXN0YXJ0LmVxdWFscyhlbmQpKSB7XG5cbiAgICAgICAgZGlyMSA9IFV0aWxzLmV4R2V0TWFqb3JEaXIoZW5kLm1pbnVzKHN0YXJ0KSk7XG4gICAgICAgIGRpcjIgPSBVdGlscy5leEdldE1pbm9yRGlyKGVuZC5taW51cyhzdGFydCkpO1xuXG4gICAgICAgIGFzc2VydChkaXIxICE9PSBDT05TVEFOVFMuRGlyTm9uZSwgJ0FSR3JhcGguY29ubmVjdFBvaW50czogZGlyMSAhPT0gQ09OU1RBTlRTLkRpck5vbmUgRkFJTEVEJyk7XG4gICAgICAgIGFzc2VydChkaXIxID09PSBVdGlscy5nZXRNYWpvckRpcihlbmQubWludXMoc3RhcnQpKSxcbiAgICAgICAgICAgICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6IGRpcjEgPT09IFV0aWxzLmdldE1ham9yRGlyKGVuZC5taW51cyhzdGFydCkpIEZBSUxFRCcpO1xuICAgICAgICBhc3NlcnQoZGlyMiA9PT0gQ09OU1RBTlRTLkRpck5vbmUgfHwgZGlyMiA9PT0gVXRpbHMuZ2V0TWlub3JEaXIoZW5kLm1pbnVzKHN0YXJ0KSksXG4gICAgICAgICAgICAnQVJHcmFwaC5jb25uZWN0UG9pbnRzOiBkaXIyID09PSBDT05TVEFOVFMuRGlyTm9uZSB8fCAnICtcbiAgICAgICAgICAgICdkaXIyID09PSBVdGlscy5nZXRNaW5vckRpcihlbmQubWludXMoc3RhcnQpKSBGQUlMRUQnKTtcblxuICAgICAgICBpZiAoZGlyMiA9PT0gaGludHN0YXJ0ZGlyICYmIGRpcjIgIT09IENPTlNUQU5UUy5EaXJOb25lKSB7XG4gICAgICAgICAgICAvLyBpLmUuIHN0ZDo6c3dhcChkaXIxLCBkaXIyKTtcbiAgICAgICAgICAgIGRpcjIgPSBkaXIxO1xuICAgICAgICAgICAgZGlyMSA9IGhpbnRzdGFydGRpcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldC5wdXNoKG5ldyBBclBvaW50KHN0YXJ0KSk7XG5cbiAgICAgICAgb2xkID0gbmV3IEFyUG9pbnQoc3RhcnQpO1xuXG4gICAgICAgIGJ1ZmZlck9iamVjdCA9IHRoaXMuX2dvVG9OZXh0QnVmZmVyQm94KHtcbiAgICAgICAgICAgIHBvaW50OiBzdGFydCxcbiAgICAgICAgICAgIGRpcjogZGlyMSxcbiAgICAgICAgICAgIGRpcjI6IGRpcjIsXG4gICAgICAgICAgICBlbmQ6IGVuZFxuICAgICAgICB9KTsgIC8vIE1vZGlmaWVkIGdvVG9OZXh0Qm94ICh0aGF0IGFsbG93cyBlbnRlcmluZyBwYXJlbnQgYnVmZmVyIGJveGVzIGhlcmVcbiAgICAgICAgYm94ID0gYnVmZmVyT2JqZWN0ID09PSBudWxsID8gbnVsbCA6IGJ1ZmZlck9iamVjdC5ib3g7XG5cbiAgICAgICAgLy9JZiBnb1RvTmV4dEJveCBkb2VzIG5vdCBtb2RpZnkgc3RhcnRcbiAgICAgICAgaWYgKHN0YXJ0LmVxdWFscyhvbGQpKSB7XG5cbiAgICAgICAgICAgIGFzc2VydChib3ggIT09IG51bGwsICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6IGJveCAhPT0gbnVsbCBGQUlMRUQnKTtcbiAgICAgICAgICAgIHJlY3QgPSBib3ggaW5zdGFuY2VvZiBBclJlY3QgPyBib3ggOiBib3gucmVjdDtcblxuICAgICAgICAgICAgaWYgKGRpcjIgPT09IENPTlNUQU5UUy5EaXJOb25lKSB7XG4gICAgICAgICAgICAgICAgZGlyMiA9IFV0aWxzLm5leHRDbG9ja3dpc2VEaXIoZGlyMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzc2VydChkaXIxICE9PSBkaXIyICYmIGRpcjEgIT09IENPTlNUQU5UUy5EaXJOb25lICYmIGRpcjIgIT09IENPTlNUQU5UUy5EaXJOb25lLFxuICAgICAgICAgICAgICAgICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6IGRpcjEgIT09IGRpcjIgJiYgZGlyMSAhPT0gQ09OU1RBTlRTLkRpck5vbmUgJiYgZGlyMiAhPT0gJyArXG4gICAgICAgICAgICAgICAgJ0NPTlNUQU5UUy5EaXJOb25lIEZBSUxFRCcpO1xuICAgICAgICAgICAgaWYgKGJ1ZmZlck9iamVjdC5ib3gucHRJblJlY3QoZW5kKSAmJiAhYnVmZmVyT2JqZWN0LmJveC5wdEluUmVjdChzdGFydCkgJiYgZmxpcHBlZCkge1xuICAgICAgICAgICAgICAgIC8vVW5mb3J0dW5hdGVseSwgaWYgcGFyZW50Ym94ZXMgYXJlIGEgcGl4ZWwgYXBhcnQsIHN0YXJ0L2VuZCBjYW4gZ2V0IHN0dWNrIGFuZCBub3QgY3Jvc3MgdGhlIGJvcmRlclxuICAgICAgICAgICAgICAgIC8vc2VwYXJhdGluZyB0aGVtLi4uLiBUaGlzIGlzIGEgbnVkZ2UgdG8gZ2V0IHRoZW0gdG8gY3Jvc3MgaXQuXG4gICAgICAgICAgICAgICAgaWYgKFV0aWxzLmlzSG9yaXpvbnRhbChkaXIxKSkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydC54ID0gZW5kLng7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQueSA9IGVuZC55O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYnVmZmVyT2JqZWN0LmJveC5wdEluUmVjdChlbmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmbGlwcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIF9sb2dnZXIuaW5mbygnQ291bGQgbm90IGZpbmQgcGF0aCBmcm9tJyxzdGFydCwndG8nLCBlbmQsJy4gRmxpcHBpbmcgc3RhcnQgYW5kIGVuZCBwb2ludHMnKTtcbiAgICAgICAgICAgICAgICAgICAgb2xkRW5kID0gbmV3IEFyUG9pbnQoZW5kKTtcblxuICAgICAgICAgICAgICAgICAgICByZXQyID0gdGhpcy5fY29ubmVjdFBvaW50cyhlbmQsIHN0YXJ0LCBoaW50ZW5kZGlyLCBkaXIxLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgaSA9IHJldDIubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaS0tID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gocmV0MltpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoc3RhcnQuZXF1YWxzKGVuZCksICdBckdyYXBoLmNvbm5lY3RQb2ludHM6IHN0YXJ0LmVxdWFscyhlbmQpIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgICAgICBvbGQgPSBDT05TVEFOVFMuRU1QVFlfUE9JTlQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gZW5kID0gb2xkRW5kO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAvL0lmIHdlIGhhdmUgZmxpcHBlZCBhbmQgYm90aCBwb2ludHMgYXJlIGluIHRoZSBzYW1lIGJ1ZmZlcmJveFxuICAgICAgICAgICAgICAgICAgICAvLyBXZSB3aWxsIGh1Z2NoaWxkcmVuIHVudGlsIHdlIGNhbiBjb25uZWN0IGJvdGggcG9pbnRzLlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBjYW4ndCwgZm9yY2UgaXRcbiAgICAgICAgICAgICAgICAgICAgcHRzID0gdGhpcy5faHVnQ2hpbGRyZW4oYnVmZmVyT2JqZWN0LCBzdGFydCwgZGlyMSwgZGlyMiwgZmluZEV4aXRUb0VuZHBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHB0cyAhPT0gbnVsbCkgeyAgLy8gVGhlcmUgaXMgYSBwYXRoIGZyb20gc3RhcnQgLT4gZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHRzLmxlbmd0aCkgeyAgLy8gQWRkIG5ldyBwb2ludHMgdG8gdGhlIGN1cnJlbnQgbGlzdCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgPSByZXQuY29uY2F0KHB0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaChuZXcgQXJQb2ludChzdGFydCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQuYXNzaWduKGVuZCk7ICAvLyBUaGVzZSBzaG91bGQgbm90IGJlIHNrZXchIEZJWE1FXG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9Gb3JjZSB0byB0aGUgZW5kcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChVdGlscy5pc1JpZ2h0QW5nbGUoZGlyMSksICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyMSkgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydC54ID0gZW5kLng7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnkgPSBlbmQueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gobmV3IEFyUG9pbnQoc3RhcnQpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFVdGlscy5pc0hvcml6b250YWwoZGlyMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydC54ID0gZW5kLng7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnkgPSBlbmQueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gobmV3IEFyUG9pbnQoc3RhcnQpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHN0YXJ0LmVxdWFscyhlbmQpKTsgIC8vIFdlIGFyZSBmb3JjaW5nIG91dCBzbyB0aGVzZSBzaG91bGQgYmUgdGhlIHNhbWUgbm93XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoIXN0YXJ0LmVxdWFscyhvbGQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFV0aWxzLmlzUG9pbnRJbkRpckZyb20oZW5kLCByZWN0LCBkaXIyKSkge1xuXG4gICAgICAgICAgICAgICAgYXNzZXJ0KCFVdGlscy5pc1BvaW50SW5EaXJGcm9tKHN0YXJ0LCByZWN0LCBkaXIyKSxcbiAgICAgICAgICAgICAgICAgICAgJ0FSR3JhcGguY29ubmVjdFBvaW50czogIVV0aWxzLmlzUG9pbnRJbkRpckZyb20oc3RhcnQsIHJlY3QsIGRpcjIpIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgIGJveCA9IHRoaXMuX2dvVG9OZXh0QnVmZmVyQm94KHtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBkaXI6IGRpcjIsXG4gICAgICAgICAgICAgICAgICAgIGRpcjI6IGRpcjEsXG4gICAgICAgICAgICAgICAgICAgIGVuZDogZW5kXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyB0aGlzIGFzc2VydCBmYWlscyBpZiB0d28gYm94ZXMgYXJlIGFkamFjZW50LCBhbmQgYSBjb25uZWN0aW9uIHdhbnRzIHRvIGdvIGJldHdlZW5cbiAgICAgICAgICAgICAgICAvL2Fzc2VydChVdGlscy5pc1BvaW50SW5EaXJGcm9tKHN0YXJ0LCByZWN0LCBkaXIyKSxcbiAgICAgICAgICAgICAgICAvLyAnQVJHcmFwaC5jb25uZWN0UG9pbnRzOiBVdGlscy5pc1BvaW50SW5EaXJGcm9tKHN0YXJ0LCByZWN0LCBkaXIyKSBGQUlMRUQnKTtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIG5vdCB0aGUgYmVzdCBjaGVjayB3aXRoIHBhcmVudCBib3hlc1xuICAgICAgICAgICAgICAgIGlmIChzdGFydC5lcXVhbHMob2xkKSkgeyAvL1RoZW4gd2UgYXJlIGluIGEgY29ybmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChib3guY2hpbGRyZW4ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHRzID0gdGhpcy5faHVnQ2hpbGRyZW4oYm94LCBzdGFydCwgZGlyMiwgZGlyMSwgZ2V0VG9EaXIxU2lkZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdHMgPSB0aGlzLl9odWdDaGlsZHJlbihidWZmZXJPYmplY3QsIHN0YXJ0LCBkaXIxLCBkaXIyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocHRzICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBwb2ludHMgdG8gdGhlIGN1cnJlbnQgbGlzdCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IHJldC5jb25jYXQocHRzKTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL0dvIHRocm91Z2ggdGhlIGJsb2NraW5nIGJveFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIxKSwgJ0FSR3JhcGguZ2V0T3V0T2ZCb3g6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyMSkgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydC54ID0gVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQoYnVmZmVyT2JqZWN0LmJveCwgZGlyMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnkgPSBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChidWZmZXJPYmplY3QuYm94LCBkaXIxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUG9pbnRCZXR3ZWVuU2lkZXMoZW5kLCByZWN0LCBkaXIxKSxcbiAgICAgICAgICAgICAgICAgICAgJ0FSR3JhcGguY29ubmVjdFBvaW50czogVXRpbHMuaXNQb2ludEJldHdlZW5TaWRlcyhlbmQsIHJlY3QsIGRpcjEpIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgIGFzc2VydCghVXRpbHMuaXNQb2ludEluKGVuZCwgcmVjdCksICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6ICFVdGlscy5pc1BvaW50SW4oZW5kLCByZWN0KSBGQUlMRUQnKTtcblxuICAgICAgICAgICAgICAgIHJldiA9IDA7XG5cbiAgICAgICAgICAgICAgICBpZiAoVXRpbHMucmV2ZXJzZURpcihkaXIyKSA9PT0gaGludGVuZGRpciAmJlxuICAgICAgICAgICAgICAgICAgICBVdGlscy5nZXRDaGlsZFJlY3RPdXRlckNvb3JkRnJvbShidWZmZXJPYmplY3QsIFV0aWxzLnJldmVyc2VEaXIoZGlyMiksIHN0YXJ0KSA9PT1cbiAgICAgICAgICAgICAgICAgICAgVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQocmVjdCwgVXRpbHMucmV2ZXJzZURpcihkaXIyKSkpIHsgLy9BbmQgaWYgcG9pbnQgY2FuIGV4aXQgdGhhdCB3YXlcbiAgICAgICAgICAgICAgICAgICAgcmV2ID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRpcjIgIT09IGhpbnRlbmRkaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFV0aWxzLmlzUG9pbnRCZXR3ZWVuU2lkZXModGhlc3RhcnQsIHJlY3QsIGRpcjEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoVXRpbHMuaXNQb2ludEluRGlyRnJvbShyZWN0LmdldFRvcExlZnQoKS5wbHVzKHJlY3QuZ2V0Qm90dG9tUmlnaHQoKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnBsdXMoZW5kKSwgZGlyMikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXYgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFV0aWxzLmlzUG9pbnRJbkRpckZyb20oc3RhcnQsIHRoZXN0YXJ0LCBkaXIyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV2ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlyMiA9IFV0aWxzLnJldmVyc2VEaXIoZGlyMik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9JZiB0aGUgYm94IGluIHRoZSB3YXkgaGFzIG9uZSBjaGlsZFxuICAgICAgICAgICAgICAgIGlmIChidWZmZXJPYmplY3QuY2hpbGRyZW4ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyMikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnggPSBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChyZWN0LCBkaXIyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnkgPSBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChyZWN0LCBkaXIyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGFzc2VydCghc3RhcnQuZXF1YWxzKG9sZCksICdBUkdyYXBoLmNvbm5lY3RQb2ludHM6ICFzdGFydC5lcXVhbHMob2xkKSBGQUlMRUQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2gobmV3IEFyUG9pbnQoc3RhcnQpKTtcbiAgICAgICAgICAgICAgICAgICAgb2xkLmFzc2lnbihzdGFydCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKFV0aWxzLmlzSG9yaXpvbnRhbChkaXIxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQueCA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKHJlY3QsIGRpcjEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQueSA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKHJlY3QsIGRpcjEpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUG9pbnRJbkRpckZyb20oZW5kLCBzdGFydCwgZGlyMSksXG4gICAgICAgICAgICAgICAgICAgICAgICAnQVJHcmFwaC5jb25uZWN0UG9pbnRzOiBVdGlscy5pc1BvaW50SW5EaXJGcm9tKGVuZCwgc3RhcnQsIGRpcjEpIEZBSUxFRCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoVXRpbHMuZ2V0UG9pbnRDb29yZChzdGFydCwgZGlyMSkgIT09IFV0aWxzLmdldFBvaW50Q29vcmQoZW5kLCBkaXIxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ29Ub05leHRCdWZmZXJCb3goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXI6IGRpcjEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL0lmIHRoZSBib3ggaGFzIG11bHRpcGxlIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgICAgIHB0cyA9IHRoaXMuX2h1Z0NoaWxkcmVuKGJ1ZmZlck9iamVjdCwgc3RhcnQsIGRpcjEsIGRpcjIsIGdldFRvRGlyMVNpZGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHRzICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBwb2ludHMgdG8gdGhlIGN1cnJlbnQgbGlzdCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IHJldC5jb25jYXQocHRzKTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL0dvIHRocm91Z2ggdGhlIGJsb2NraW5nIGJveFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIxKSwgJ0FSR3JhcGguZ2V0T3V0T2ZCb3g6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyMSkgRkFJTEVEJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydC54ID0gVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQoYnVmZmVyT2JqZWN0LmJveCwgZGlyMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0LnkgPSBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChidWZmZXJPYmplY3QuYm94LCBkaXIxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXNzZXJ0KCFzdGFydC5lcXVhbHMob2xkKSwgJ0FSR3JhcGguY29ubmVjdFBvaW50czogIXN0YXJ0LmVxdWFscyhvbGQpIEZBSUxFRCcpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXQucHVzaChlbmQpO1xuXG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICByZXQuYXNzZXJ0VmFsaWQoKTsgIC8vIENoZWNrIHRoYXQgYWxsIGVkZ2VzIGFyZSBob3Jpem9udGFsIGFyZSB2ZXJ0aWNhbFxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9kaXNjb25uZWN0QWxsID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3QodGhpcy5wYXRoc1tpXSk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5kaXNjb25uZWN0ID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBpZiAocGF0aC5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlRWRnZXMocGF0aCk7XG4gICAgfVxuXG4gICAgcGF0aC5kZWxldGVBbGwoKTtcbiAgICB0aGlzLmNvbXBsZXRlbHlDb25uZWN0ZWQgPSBmYWxzZTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Rpc2Nvbm5lY3RQYXRoc0NsaXBwaW5nID0gZnVuY3Rpb24gKHJlY3QpIHtcbiAgICBmb3IgKHZhciBpID0gdGhpcy5wYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgaWYgKHRoaXMucGF0aHNbaV0uaXNQYXRoQ2xpcChyZWN0KSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KHRoaXMucGF0aHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fZGlzY29ubmVjdFBhdGhzRnJvbSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgaXRlciA9IHRoaXMucGF0aHMubGVuZ3RoLFxuICAgICAgICBwYXRoLFxuICAgICAgICBzdGFydHBvcnQsXG4gICAgICAgIGVuZHBvcnQ7XG5cbiAgICBpZiAob2JqIGluc3RhbmNlb2YgQXV0b1JvdXRlckJveCkge1xuICAgICAgICB2YXIgYm94ID0gb2JqLFxuICAgICAgICAgICAgc3RhcnRib3gsXG4gICAgICAgICAgICBlbmRib3g7XG4gICAgICAgIHdoaWxlIChpdGVyLS0pIHtcbiAgICAgICAgICAgIHBhdGggPSB0aGlzLnBhdGhzW2l0ZXJdO1xuXG4gICAgICAgICAgICBhc3NlcnQocGF0aC5zdGFydHBvcnRzICE9PSBudWxsLCAnQVJHcmFwaC5kaXNjb25uZWN0UGF0aHNGcm9tOiBzdGFydHBvcnQgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgICAgICAgICBhc3NlcnQocGF0aC5zdGFydHBvcnRzLmxlbmd0aCA+IDAsICdBUkdyYXBoLmRpc2Nvbm5lY3RQYXRoc0Zyb206IFBhdGggaGFzIG5vIHN0YXJ0cG9ydHMnKTtcbiAgICAgICAgICAgIGFzc2VydChwYXRoLmVuZHBvcnRzICE9PSBudWxsLCAnQVJHcmFwaC5kaXNjb25uZWN0UGF0aHNGcm9tOiBlbmRwb3J0ICE9PSBudWxsIEZBSUxFRCcpO1xuICAgICAgICAgICAgYXNzZXJ0KHBhdGguZW5kcG9ydHMubGVuZ3RoID4gMCwgJ0FSR3JhcGguZGlzY29ubmVjdFBhdGhzRnJvbTogUGF0aCBoYXMgbm8gZW5kcG9ydHMnKTtcblxuICAgICAgICAgICAgLy8gQ2FuIHNpbXBseSBzZWxlY3QgYW55IHN0YXJ0L2VuZCBwb3J0IHRvIGNoZWNrIHRoZSBvd25lclxuICAgICAgICAgICAgc3RhcnRib3ggPSBwYXRoLnN0YXJ0cG9ydHNbMF0ub3duZXI7XG4gICAgICAgICAgICBlbmRib3ggPSBwYXRoLmVuZHBvcnRzWzBdLm93bmVyO1xuXG4gICAgICAgICAgICBhc3NlcnQoc3RhcnRib3ggIT09IG51bGwsICdBUkdyYXBoLmRpc2Nvbm5lY3RQYXRoc0Zyb206IHN0YXJ0Ym94ICE9PSBudWxsIEZBSUxFRCcpO1xuICAgICAgICAgICAgYXNzZXJ0KGVuZGJveCAhPT0gbnVsbCwgJ0FSR3JhcGguZGlzY29ubmVjdFBhdGhzRnJvbTogZW5kYm94ICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgICAgICAgICBpZiAoKHN0YXJ0Ym94ID09PSBib3ggfHwgZW5kYm94ID09PSBib3gpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KHBhdGgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9IGVsc2UgeyAgLy8gQXNzdW1pbmcgJ2JveCcgaXMgYSBwb3J0XG5cbiAgICAgICAgdmFyIHBvcnQgPSBvYmo7XG4gICAgICAgIHdoaWxlIChpdGVyLS0pIHtcbiAgICAgICAgICAgIHBhdGggPSB0aGlzLnBhdGhzW2l0ZXJdO1xuICAgICAgICAgICAgc3RhcnRwb3J0ID0gcGF0aC5nZXRTdGFydFBvcnQoKTtcbiAgICAgICAgICAgIGVuZHBvcnQgPSBwYXRoLmdldEVuZFBvcnQoKTtcblxuICAgICAgICAgICAgaWYgKChzdGFydHBvcnQgPT09IHBvcnQgfHwgZW5kcG9ydCA9PT0gcG9ydCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QocGF0aCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2FkZFNlbGZFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmhvcml6b250YWwuYWRkRWRnZXModGhpcyk7XG4gICAgdGhpcy52ZXJ0aWNhbC5hZGRFZGdlcyh0aGlzKTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2FkZEVkZ2VzID0gZnVuY3Rpb24gKG9iaikge1xuICAgIGFzc2VydCghKG9iaiBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJQYXRoKSwgJ05vIFBhdGhzIHNob3VsZCBiZSBoZXJlIScpO1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBBdXRvUm91dGVyUG9ydCkge1xuICAgICAgICB0aGlzLmhvcml6b250YWwuYWRkUG9ydEVkZ2VzKG9iaik7XG4gICAgICAgIHRoaXMudmVydGljYWwuYWRkUG9ydEVkZ2VzKG9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsLmFkZEVkZ2VzKG9iaik7XG4gICAgICAgIHRoaXMudmVydGljYWwuYWRkRWRnZXMob2JqKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLmRlbGV0ZUVkZ2VzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHRoaXMuaG9yaXpvbnRhbC5kZWxldGVFZGdlcyhvYmplY3QpO1xuICAgIHRoaXMudmVydGljYWwuZGVsZXRlRWRnZXMob2JqZWN0KTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2FkZEFsbEVkZ2VzID0gZnVuY3Rpb24gKCkge1xuICAgIGFzc2VydCh0aGlzLmhvcml6b250YWwuaXNFbXB0eSgpICYmIHRoaXMudmVydGljYWwuaXNFbXB0eSgpLFxuICAgICAgICAnQVJHcmFwaC5hZGRBbGxFZGdlczogaG9yaXpvbnRhbC5pc0VtcHR5KCkgJiYgdmVydGljYWwuaXNFbXB0eSgpIEZBSUxFRCcpO1xuXG4gICAgdmFyIGlkcyA9IE9iamVjdC5rZXlzKHRoaXMuYm94ZXMpLFxuICAgICAgICBpO1xuXG4gICAgZm9yIChpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLl9hZGRCb3hBbmRQb3J0RWRnZXModGhpcy5ib3hlc1tpZHNbaV1dKTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSB0aGlzLnBhdGhzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLmhvcml6b250YWwuYWRkUGF0aEVkZ2VzKHRoaXMucGF0aHNbaV0pO1xuICAgICAgICB0aGlzLnZlcnRpY2FsLmFkZFBhdGhFZGdlcyh0aGlzLnBhdGhzW2ldKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9kZWxldGVBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmhvcml6b250YWwuZGVsZXRlQWxsRWRnZXMoKTtcbiAgICB0aGlzLnZlcnRpY2FsLmRlbGV0ZUFsbEVkZ2VzKCk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9hZGRCb3hBbmRQb3J0RWRnZXMgPSBmdW5jdGlvbiAoYm94KSB7XG4gICAgYXNzZXJ0KGJveCAhPT0gbnVsbCwgJ0FSR3JhcGguYWRkQm94QW5kUG9ydEVkZ2VzOiBib3ggIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICB0aGlzLl9hZGRFZGdlcyhib3gpO1xuXG4gICAgZm9yICh2YXIgaSA9IGJveC5wb3J0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdGhpcy5fYWRkRWRnZXMoYm94LnBvcnRzW2ldKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdG8gYnVmZmVyYm94ZXNcbiAgICB0aGlzLl9hZGRUb0J1ZmZlckJveGVzKGJveCk7XG4gICAgdGhpcy5fdXBkYXRlQm94UG9ydEF2YWlsYWJpbGl0eShib3gpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fZGVsZXRlQm94QW5kUG9ydEVkZ2VzID0gZnVuY3Rpb24gKGJveCkge1xuICAgIGFzc2VydChib3ggIT09IG51bGwsICdBUkdyYXBoLmRlbGV0ZUJveEFuZFBvcnRFZGdlczogYm94ICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgdGhpcy5kZWxldGVFZGdlcyhib3gpO1xuXG4gICAgZm9yICh2YXIgaSA9IGJveC5wb3J0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdGhpcy5kZWxldGVFZGdlcyhib3gucG9ydHNbaV0pO1xuICAgIH1cblxuICAgIHRoaXMuX3JlbW92ZUZyb21CdWZmZXJCb3hlcyhib3gpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fZ2V0RWRnZUxpc3QgPSBmdW5jdGlvbiAoaXNob3Jpem9udGFsKSB7XG4gICAgcmV0dXJuIGlzaG9yaXpvbnRhbCA/IHRoaXMuaG9yaXpvbnRhbCA6IHRoaXMudmVydGljYWw7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9jYW5kZWxldGVUd29FZGdlc0F0ID0gZnVuY3Rpb24gKHBhdGgsIHBvaW50cywgcG9zKSB7XG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICBhc3NlcnQocGF0aC5vd25lciA9PT0gdGhpcywgJ0FSR3JhcGguY2FuZGVsZXRlVHdvRWRnZXNBdDogcGF0aC5vd25lciA9PT0gdGhpcyBGQUlMRUQnKTtcbiAgICAgICAgcGF0aC5hc3NlcnRWYWxpZCgpO1xuICAgICAgICBhc3NlcnQocGF0aC5pc0Nvbm5lY3RlZCgpLCAnQVJHcmFwaC5jYW5kZWxldGVUd29FZGdlc0F0OiBwYXRoLmlzQ29ubmVjdGVkKCkgRkFJTEVEJyk7XG4gICAgICAgIHBvaW50cy5Bc3NlcnRWYWxpZFBvcyhwb3MpO1xuICAgIH1cblxuICAgIGlmIChwb3MgKyAyID49IHBvaW50cy5sZW5ndGggfHwgcG9zIDwgMSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHBvaW50cG9zID0gcG9zLFxuICAgICAgICBwb2ludCA9IHBvaW50c1twb3MrK10sXG4gICAgICAgIG5wb2ludHBvcyA9IHBvcyxcbiAgICAgICAgbnBvaW50ID0gcG9pbnRzW3BvcysrXSxcbiAgICAgICAgbm5wb2ludHBvcyA9IHBvcztcblxuICAgIHBvcyA9IHBvaW50cG9zO1xuICAgIHBvcy0tO1xuICAgIHZhciBwcG9pbnRwb3MgPSBwb3M7XG5cbiAgICB2YXIgcHBvaW50ID0gcG9pbnRzW3Bvcy0tXSxcbiAgICAgICAgcHBwb2ludHBvcyA9IHBvcztcblxuICAgIGlmIChucG9pbnQuZXF1YWxzKHBvaW50KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGRpcmVjdGlvbiBvZiB6ZXJvLWxlbmd0aCBlZGdlcyBjYW4ndCBiZSBkZXRlcm1pbmVkLCBzbyBkb24ndCBkZWxldGUgdGhlbVxuICAgIH1cblxuICAgIGFzc2VydChwcHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBwcG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmIHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJlxuICAgICAgICBucG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmIG5ucG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoLFxuICAgICAgICAnQVJHcmFwaC5jYW5kZWxldGVUd29FZGdlc0F0OiBwcHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBwcG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmJyArXG4gICAgICAgICdwb2ludHBvcyA8IHBvaW50cy5sZW5ndGggJiYgbnBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBubnBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCBGQUlMRUQnKTtcblxuICAgIHZhciBkaXIgPSBVdGlscy5nZXREaXIobnBvaW50Lm1pbnVzKHBvaW50KSk7XG5cbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGRpciksICdBUkdyYXBoLmNhbmRlbGV0ZVR3b0VkZ2VzQXQ6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZGlyKSBGQUlMRUQnKTtcbiAgICB2YXIgaXNob3Jpem9udGFsID0gVXRpbHMuaXNIb3Jpem9udGFsKGRpcik7XG5cbiAgICB2YXIgbmV3cG9pbnQgPSBuZXcgQXJQb2ludCgpO1xuXG4gICAgaWYgKGlzaG9yaXpvbnRhbCkge1xuICAgICAgICBuZXdwb2ludC54ID0gVXRpbHMuZ2V0UG9pbnRDb29yZChucG9pbnQsIGlzaG9yaXpvbnRhbCk7XG4gICAgICAgIG5ld3BvaW50LnkgPSBVdGlscy5nZXRQb2ludENvb3JkKHBwb2ludCwgIWlzaG9yaXpvbnRhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3cG9pbnQueSA9IFV0aWxzLmdldFBvaW50Q29vcmQobnBvaW50LCBpc2hvcml6b250YWwpO1xuICAgICAgICBuZXdwb2ludC54ID0gVXRpbHMuZ2V0UG9pbnRDb29yZChwcG9pbnQsICFpc2hvcml6b250YWwpO1xuICAgIH1cblxuICAgIGFzc2VydChVdGlscy5nZXREaXIobmV3cG9pbnQubWludXMocHBvaW50KSkgPT09IGRpcixcbiAgICAgICAgJ0FSR3JhcGguY2FuZGVsZXRlVHdvRWRnZXNBdDogVXRpbHMuZ2V0RGlyIChuZXdwb2ludC5taW51cyhwcG9pbnQpKSA9PT0gZGlyIEZBSUxFRCcpO1xuXG4gICAgaWYgKHRoaXMuX2lzTGluZUNsaXBCb3hlcyhuZXdwb2ludCwgbnBvaW50KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLl9pc0xpbmVDbGlwQm94ZXMobmV3cG9pbnQsIHBwb2ludCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fZGVsZXRlVHdvRWRnZXNBdCA9IGZ1bmN0aW9uIChwYXRoLCBwb2ludHMsIHBvcykge1xuICAgIGlmIChDT05TVEFOVFMuREVCVUcpIHtcbiAgICAgICAgYXNzZXJ0KHBhdGgub3duZXIgPT09IHRoaXMsICdBUkdyYXBoLmRlbGV0ZVR3b0VkZ2VzQXQ6IHBhdGgub3duZXIgPT09IHRoaXMgRkFJTEVEJyk7XG4gICAgICAgIHBhdGguYXNzZXJ0VmFsaWQoKTtcbiAgICAgICAgYXNzZXJ0KHBhdGguaXNDb25uZWN0ZWQoKSwgJ0FSR3JhcGguZGVsZXRlVHdvRWRnZXNBdDogcGF0aC5pc0Nvbm5lY3RlZCgpIEZBSUxFRCcpO1xuICAgICAgICBwb2ludHMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnRwb3MgPSBwb3MsIC8vR2V0dGluZyB0aGUgbmV4dCwgYW5kIG5leHQtbmV4dCwgcG9pbnRzXG4gICAgICAgIHBvaW50ID0gcG9pbnRzW3BvcysrXSxcbiAgICAgICAgbnBvaW50cG9zID0gcG9zLFxuICAgICAgICBucG9pbnQgPSBwb2ludHNbcG9zKytdLFxuICAgICAgICBubnBvaW50cG9zID0gcG9zLFxuICAgICAgICBubnBvaW50ID0gcG9pbnRzW3BvcysrXSxcbiAgICAgICAgbm5ucG9pbnRwb3MgPSBwb3M7XG5cbiAgICBwb3MgPSBwb2ludHBvcztcbiAgICBwb3MtLTtcblxuICAgIHZhciBwcG9pbnRwb3MgPSBwb3MsIC8vR2V0dGluZyB0aGUgcHJldiwgcHJldi1wcmV2IHBvaW50c1xuICAgICAgICBwcG9pbnQgPSBwb2ludHNbcG9zLS1dLFxuICAgICAgICBwcHBvaW50cG9zID0gcG9zLFxuICAgICAgICBwcHBvaW50ID0gcG9pbnRzW3Bvcy0tXTtcblxuICAgIGFzc2VydChwcHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBwcG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmIHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJlxuICAgIG5wb2ludHBvcyA8IHBvaW50cy5sZW5ndGggJiYgbm5wb2ludHBvcyA8IHBvaW50cy5sZW5ndGgsXG4gICAgICAgICdBUkdyYXBoLmRlbGV0ZVR3b0VkZ2VzQXQ6IHBwcG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmIHBwb2ludHBvcyA8IHBvaW50cy5sZW5ndGggJiYgcG9pbnRwb3MgPCAnICtcbiAgICAgICAgJ3BvaW50cy5sZW5ndGggJiYgbnBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBubnBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCBGQUlMRUQnKTtcbiAgICBhc3NlcnQocHBwb2ludCAhPT0gbnVsbCAmJiBwcG9pbnQgIT09IG51bGwgJiYgcG9pbnQgIT09IG51bGwgJiYgbnBvaW50ICE9PSBudWxsICYmIG5ucG9pbnQgIT09IG51bGwsXG4gICAgICAgICdBUkdyYXBoLmRlbGV0ZVR3b0VkZ2VzQXQ6IHBwcG9pbnQgIT09IG51bGwgJiYgcHBvaW50ICE9PSBudWxsICYmIHBvaW50ICE9PSBudWxsICYmIG5wb2ludCAhPT0gbnVsbCAmJicgK1xuICAgICAgICAnIG5ucG9pbnQgIT09IG51bGwgRkFJTEVEJyk7XG5cbiAgICB2YXIgZGlyID0gVXRpbHMuZ2V0RGlyKG5wb2ludC5taW51cyhwb2ludCkpO1xuXG4gICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIpLCAnQVJHcmFwaC5kZWxldGVUd29FZGdlc0F0OiBVdGlscy5pc1JpZ2h0QW5nbGUgKGRpcikgRkFJTEVEJyk7XG4gICAgdmFyIGlzaG9yaXpvbnRhbCA9IFV0aWxzLmlzSG9yaXpvbnRhbChkaXIpO1xuXG4gICAgdmFyIG5ld3BvaW50ID0gbmV3IEFyUG9pbnQoKTtcbiAgICBpZiAoaXNob3Jpem9udGFsKSB7XG4gICAgICAgIG5ld3BvaW50LnggPSBVdGlscy5nZXRQb2ludENvb3JkKG5wb2ludCwgaXNob3Jpem9udGFsKTtcbiAgICAgICAgbmV3cG9pbnQueSA9IFV0aWxzLmdldFBvaW50Q29vcmQocHBvaW50LCAhaXNob3Jpem9udGFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdwb2ludC54ID0gVXRpbHMuZ2V0UG9pbnRDb29yZChwcG9pbnQsICFpc2hvcml6b250YWwpO1xuICAgICAgICBuZXdwb2ludC55ID0gVXRpbHMuZ2V0UG9pbnRDb29yZChucG9pbnQsIGlzaG9yaXpvbnRhbCk7XG4gICAgfVxuXG4gICAgYXNzZXJ0KFV0aWxzLmdldERpcihuZXdwb2ludC5taW51cyhwcG9pbnQpKSA9PT0gZGlyLFxuICAgICAgICAnQVJHcmFwaC5kZWxldGVUd29FZGdlc0F0OiBVdGlscy5nZXREaXIgKG5ld3BvaW50Lm1pbnVzKHBwb2ludCkpID09PSBkaXIgRkFJTEVEJyk7XG5cbiAgICBhc3NlcnQoIXRoaXMuX2lzTGluZUNsaXBCb3hlcyhuZXdwb2ludCwgbnBvaW50KSxcbiAgICAgICAgJ0FSR3JhcGguZGVsZXRlVHdvRWRnZXNBdDogIWlzTGluZUNsaXBCb3hlcyhuZXdwb2ludCwgbnBvaW50KSBGQUlMRUQnKTtcbiAgICBhc3NlcnQoIXRoaXMuX2lzTGluZUNsaXBCb3hlcyhuZXdwb2ludCwgcHBvaW50KSxcbiAgICAgICAgJ0FSR3JhcGguZGVsZXRlVHdvRWRnZXNBdDogIWlzTGluZUNsaXBCb3hlcyhuZXdwb2ludCwgcHBvaW50KSBGQUlMRUQnKTtcblxuICAgIHZhciBobGlzdCA9IHRoaXMuX2dldEVkZ2VMaXN0KGlzaG9yaXpvbnRhbCksXG4gICAgICAgIHZsaXN0ID0gdGhpcy5fZ2V0RWRnZUxpc3QoIWlzaG9yaXpvbnRhbCk7XG5cbiAgICB2YXIgcHBlZGdlID0gaGxpc3QuZ2V0RWRnZUJ5UG9pbnRlcihwcHBvaW50KSxcbiAgICAgICAgcGVkZ2UgPSB2bGlzdC5nZXRFZGdlQnlQb2ludGVyKHBwb2ludCksXG4gICAgICAgIG5lZGdlID0gaGxpc3QuZ2V0RWRnZUJ5UG9pbnRlcihwb2ludCksXG4gICAgICAgIG5uZWRnZSA9IHZsaXN0LmdldEVkZ2VCeVBvaW50ZXIobnBvaW50KTtcblxuICAgIGFzc2VydChwcGVkZ2UgIT09IG51bGwgJiYgcGVkZ2UgIT09IG51bGwgJiYgbmVkZ2UgIT09IG51bGwgJiYgbm5lZGdlICE9PSBudWxsLFxuICAgICAgICAnQVJHcmFwaC5kZWxldGVUd29FZGdlc0F0OiAgcHBlZGdlICE9PSBudWxsICYmIHBlZGdlICE9PSBudWxsICYmIG5lZGdlICE9PSBudWxsICYmIG5uZWRnZSAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHZsaXN0LnJlbW92ZShwZWRnZSk7XG4gICAgaGxpc3QucmVtb3ZlKG5lZGdlKTtcblxuICAgIHBvaW50cy5zcGxpY2UocHBvaW50cG9zLCAzLCBuZXdwb2ludCk7XG4gICAgcHBlZGdlLmVuZHBvaW50TmV4dCA9IG5ucG9pbnQ7XG4gICAgcHBlZGdlLmVuZHBvaW50ID0gbmV3cG9pbnQ7XG5cbiAgICBubmVkZ2Uuc3RhcnRwb2ludCA9IG5ld3BvaW50O1xuICAgIG5uZWRnZS5zdGFydHBvaW50UHJldiA9IHBwcG9pbnQ7XG5cbiAgICBpZiAobm5ucG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBubm5lZGdlID0gaGxpc3QuZ2V0RWRnZUJ5UG9pbnRlcihubnBvaW50LCAobm5ucG9pbnRwb3MpKTtcbiAgICAgICAgYXNzZXJ0KG5ubmVkZ2UgIT09IG51bGwsXG4gICAgICAgICAgICAnQVJHcmFwaC5kZWxldGVUd29FZGdlc0F0OiBubm5lZGdlICE9PSBudWxsIEZBSUxFRCcpO1xuICAgICAgICBhc3NlcnQobm5uZWRnZS5zdGFydHBvaW50UHJldi5lcXVhbHMobnBvaW50KSAmJiBubm5lZGdlLnN0YXJ0cG9pbnQuZXF1YWxzKG5ucG9pbnQpLFxuICAgICAgICAgICAgJ0FSR3JhcGguZGVsZXRlVHdvRWRnZXNBdDogbm5uZWRnZS5zdGFydHBvaW50UHJldi5lcXVhbHMobnBvaW50KScgK1xuICAgICAgICAgICAgJyYmIG5ubmVkZ2Uuc3RhcnRwb2ludC5lcXVhbHMobm5wb2ludCkgRkFJTEVEJyk7XG4gICAgICAgIG5ubmVkZ2Uuc3RhcnRwb2ludFByZXYgPSBwcG9pbnQ7XG4gICAgfVxuXG4gICAgaWYgKG5ucG9pbnQuZXF1YWxzKG5ld3BvaW50KSkge1xuICAgICAgICB0aGlzLl9kZWxldGVTYW1lUG9pbnRzQXQocGF0aCwgcG9pbnRzLCBwcG9pbnRwb3MpO1xuICAgIH1cblxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fZGVsZXRlU2FtZVBvaW50c0F0ID0gZnVuY3Rpb24gKHBhdGgsIHBvaW50cywgcG9zKSB7XG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICBhc3NlcnQocGF0aC5vd25lciA9PT0gdGhpcywgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBwYXRoLm93bmVyID09PSB0aGlzIEZBSUxFRCcpO1xuICAgICAgICBwYXRoLmFzc2VydFZhbGlkKCk7XG4gICAgICAgIGFzc2VydChwYXRoLmlzQ29ubmVjdGVkKCksICdBUkdyYXBoLmRlbGV0ZVNhbWVQb2ludHNBdDogcGF0aC5pc0Nvbm5lY3RlZCgpIEZBSUxFRCcpO1xuICAgICAgICBwb2ludHMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICB2YXIgcG9pbnRwb3MgPSBwb3MsXG4gICAgICAgIHBvaW50ID0gcG9pbnRzW3BvcysrXSxcbiAgICAgICAgbnBvaW50cG9zID0gcG9zLFxuICAgICAgICBucG9pbnQgPSBwb2ludHNbcG9zKytdLFxuICAgICAgICBubnBvaW50cG9zID0gcG9zLFxuICAgICAgICBubnBvaW50ID0gcG9pbnRzW3BvcysrXSxcbiAgICAgICAgbm5ucG9pbnRwb3MgPSBwb3M7XG5cbiAgICBwb3MgPSBwb2ludHBvcztcbiAgICBwb3MtLTtcblxuICAgIHZhciBwcG9pbnRwb3MgPSBwb3MsXG4gICAgICAgIHBwb2ludCA9IHBvaW50c1twb3MtLV0sXG4gICAgICAgIHBwcG9pbnRwb3MgPSBwb3MsXG4gICAgICAgIHBwcG9pbnQgPSBwb3MgPT09IHBvaW50cy5sZW5ndGggPyBudWxsIDogcG9pbnRzW3Bvcy0tXTtcblxuICAgIGFzc2VydChwcG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmIHBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCAmJiBucG9pbnRwb3MgPCBwb2ludHMubGVuZ3RoICYmXG4gICAgbm5wb2ludHBvcyA8IHBvaW50cy5sZW5ndGgpO1xuICAgIGFzc2VydChwcG9pbnQgIT09IG51bGwgJiYgcG9pbnQgIT09IG51bGwgJiYgbnBvaW50ICE9PSBudWxsICYmIG5ucG9pbnQgIT09IG51bGwsXG4gICAgICAgICdBUkdyYXBoLmRlbGV0ZVNhbWVQb2ludHNBdDogcHBvaW50ICE9PSBudWxsICYmIHBvaW50ICE9PSBudWxsICYmIG5wb2ludCAhPT0gbnVsbCAmJiAnICtcbiAgICAgICAgJ25ucG9pbnQgIT09IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KHBvaW50LmVxdWFscyhucG9pbnQpICYmICFwb2ludC5lcXVhbHMocHBvaW50KSxcbiAgICAgICAgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBwb2ludC5lcXVhbHMobnBvaW50KSAmJiAhcG9pbnQuZXF1YWxzKHBwb2ludCkgRkFJTEVEJyk7XG5cbiAgICB2YXIgZGlyID0gVXRpbHMuZ2V0RGlyKHBvaW50Lm1pbnVzKHBwb2ludCkpO1xuICAgIGFzc2VydChVdGlscy5pc1JpZ2h0QW5nbGUoZGlyKSwgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBVdGlscy5pc1JpZ2h0QW5nbGUgKGRpcikgRkFJTEVEJyk7XG5cbiAgICB2YXIgaXNob3Jpem9udGFsID0gVXRpbHMuaXNIb3Jpem9udGFsKGRpciksXG4gICAgICAgIGhsaXN0ID0gdGhpcy5fZ2V0RWRnZUxpc3QoaXNob3Jpem9udGFsKSxcbiAgICAgICAgdmxpc3QgPSB0aGlzLl9nZXRFZGdlTGlzdCghaXNob3Jpem9udGFsKSxcblxuICAgICAgICBwZWRnZSA9IGhsaXN0LmdldEVkZ2VCeVBvaW50ZXIocHBvaW50LCBwb2ludCksXG4gICAgICAgIG5lZGdlID0gdmxpc3QuZ2V0RWRnZUJ5UG9pbnRlcihwb2ludCwgbnBvaW50KSxcbiAgICAgICAgbm5lZGdlID0gaGxpc3QuZ2V0RWRnZUJ5UG9pbnRlcihucG9pbnQsIG5ucG9pbnQpO1xuXG4gICAgYXNzZXJ0KHBlZGdlICE9PSBudWxsICYmIG5lZGdlICE9PSBudWxsICYmIG5uZWRnZSAhPT0gbnVsbCwgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBwZWRnZSAhPT0gbnVsbCAnICtcbiAgICAnJiYgbmVkZ2UgIT09IG51bGwgJiYgbm5lZGdlICE9PSBudWxsIEZBSUxFRCcpO1xuXG4gICAgdmxpc3QucmVtb3ZlKHBlZGdlKTtcbiAgICBobGlzdC5yZW1vdmUobmVkZ2UpO1xuXG4gICAgcG9pbnRzLnNwbGljZShwb2ludHBvcywgMik7XG5cbiAgICBpZiAocHBwb2ludHBvcyA8IHBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHBwZWRnZSA9IHZsaXN0LmdldEVkZ2VCeVBvaW50ZXIocHBwb2ludCwgcHBvaW50KTtcbiAgICAgICAgYXNzZXJ0KHBwZWRnZSAhPT0gbnVsbCAmJiBwcGVkZ2UuZW5kcG9pbnQuZXF1YWxzKHBwb2ludCkgJiYgcHBlZGdlLmVuZHBvaW50TmV4dC5lcXVhbHMocG9pbnQpLFxuICAgICAgICAgICAgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBwcGVkZ2UgIT09IG51bGwgJiYgcHBlZGdlLmVuZHBvaW50LmVxdWFscyhwcG9pbnQpICYmICcgK1xuICAgICAgICAgICAgJ3BwZWRnZS5lbmRwb2ludE5leHQuZXF1YWxzKHBvaW50KSBGQUlMRUQnKTtcbiAgICAgICAgcHBlZGdlLmVuZHBvaW50TmV4dCA9IG5ucG9pbnQ7XG4gICAgfVxuXG4gICAgYXNzZXJ0KG5uZWRnZS5zdGFydHBvaW50LmVxdWFscyhucG9pbnQpICYmIG5uZWRnZS5zdGFydHBvaW50UHJldi5lcXVhbHMocG9pbnQpLFxuICAgICAgICAnQVJHcmFwaC5kZWxldGVTYW1lUG9pbnRzQXQ6IG5uZWRnZS5zdGFydHBvaW50LmVxdWFscyhucG9pbnQpICYmIG5uZWRnZS5zdGFydHBvaW50UHJldi5lcXVhbHMocG9pbnQpJyArXG4gICAgICAgICcgRkFJTEVEJyk7XG4gICAgbm5lZGdlLnNldFN0YXJ0UG9pbnQocHBvaW50KTtcbiAgICBubmVkZ2Uuc3RhcnRwb2ludFByZXYgPSBwcHBvaW50O1xuXG4gICAgaWYgKG5ubnBvaW50cG9zIDwgcG9pbnRzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbm5uZWRnZSA9IHZsaXN0LmdldEVkZ2VCeVBvaW50ZXIobm5wb2ludCwgKG5ubnBvaW50cG9zKSk7IC8vJipcbiAgICAgICAgYXNzZXJ0KG5ubmVkZ2UgIT09IG51bGwgJiYgbm5uZWRnZS5zdGFydHBvaW50UHJldi5lcXVhbHMobnBvaW50KSAmJiBubm5lZGdlLnN0YXJ0cG9pbnQuZXF1YWxzKG5ucG9pbnQpLFxuICAgICAgICAgICAgJ0FSR3JhcGguZGVsZXRlU2FtZVBvaW50c0F0OiBubm5lZGdlICE9PSBudWxsICYmIG5ubmVkZ2Uuc3RhcnRwb2ludFByZXYuZXF1YWxzKG5wb2ludCkgJiYgJyArXG4gICAgICAgICAgICAnbm5uZWRnZS5zdGFydHBvaW50LmVxdWFscyhubnBvaW50KSBGQUlMRUQnKTtcbiAgICAgICAgbm5uZWRnZS5zdGFydHBvaW50UHJldiA9IHBwb2ludDtcbiAgICB9XG5cbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHX0RFRVApIHtcbiAgICAgICAgcGF0aC5hc3NlcnRWYWxpZCgpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3NpbXBsaWZ5UGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1vZGlmaWVkID0gZmFsc2UsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIHBvaW50TGlzdCxcbiAgICAgICAgcG9pbnRwb3M7XG5cbiAgICBmb3IgKHZhciBpID0gdGhpcy5wYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgcGF0aCA9IHRoaXMucGF0aHNbaV07XG5cbiAgICAgICAgaWYgKHBhdGguaXNBdXRvUm91dGVkKCkpIHtcbiAgICAgICAgICAgIHBvaW50TGlzdCA9IHBhdGguZ2V0UG9pbnRMaXN0KCk7XG4gICAgICAgICAgICBwb2ludHBvcyA9IDA7XG5cbiAgICAgICAgICAgIG1vZGlmaWVkID0gdGhpcy5fZml4U2hvcnRQYXRocyhwYXRoKSB8fCBtb2RpZmllZDtcblxuICAgICAgICAgICAgd2hpbGUgKHBvaW50cG9zIDwgcG9pbnRMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jYW5kZWxldGVUd29FZGdlc0F0KHBhdGgsIHBvaW50TGlzdCwgcG9pbnRwb3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2RlbGV0ZVR3b0VkZ2VzQXQocGF0aCwgcG9pbnRMaXN0LCBwb2ludHBvcyk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBvaW50cG9zKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbW9kaWZpZWQ7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9jZW50ZXJTdGFpcnNJblBhdGhQb2ludHMgPSBmdW5jdGlvbiAocGF0aCwgaGludHN0YXJ0ZGlyLCBoaW50ZW5kZGlyKSB7XG4gICAgYXNzZXJ0KHBhdGggIT09IG51bGwsICdBUkdyYXBoLmNlbnRlclN0YWlyc0luUGF0aFBvaW50czogcGF0aCAhPT0gbnVsbCBGQUlMRUQnKTtcbiAgICBhc3NlcnQoIXBhdGguaXNDb25uZWN0ZWQoKSwgJ0FSR3JhcGguY2VudGVyU3RhaXJzSW5QYXRoUG9pbnRzOiAhcGF0aC5pc0Nvbm5lY3RlZCgpIEZBSUxFRCcpO1xuXG4gICAgdmFyIHBvaW50TGlzdCA9IHBhdGguZ2V0UG9pbnRMaXN0KCk7XG4gICAgYXNzZXJ0KHBvaW50TGlzdC5sZW5ndGggPj0gMiwgJ0FSR3JhcGguY2VudGVyU3RhaXJzSW5QYXRoUG9pbnRzOiBwb2ludExpc3QubGVuZ3RoID49IDIgRkFJTEVEJyk7XG5cbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHBhdGguYXNzZXJ0VmFsaWRQb2ludHMoKTtcbiAgICB9XG5cbiAgICB2YXIgcDEsXG4gICAgICAgIHAyLFxuICAgICAgICBwMyxcbiAgICAgICAgcDQsXG5cbiAgICAgICAgcDFwID0gcG9pbnRMaXN0Lmxlbmd0aCxcbiAgICAgICAgcDJwID0gcG9pbnRMaXN0Lmxlbmd0aCxcbiAgICAgICAgcDNwID0gcG9pbnRMaXN0Lmxlbmd0aCxcbiAgICAgICAgcDRwID0gcG9pbnRMaXN0Lmxlbmd0aCxcblxuICAgICAgICBkMTIgPSBDT05TVEFOVFMuRGlyTm9uZSxcbiAgICAgICAgZDIzID0gQ09OU1RBTlRTLkRpck5vbmUsXG4gICAgICAgIGQzNCA9IENPTlNUQU5UUy5EaXJOb25lLFxuXG4gICAgICAgIG91dE9mQm94U3RhcnRQb2ludCA9IHBhdGguZ2V0T3V0T2ZCb3hTdGFydFBvaW50KGhpbnRzdGFydGRpciksXG4gICAgICAgIG91dE9mQm94RW5kUG9pbnQgPSBwYXRoLmdldE91dE9mQm94RW5kUG9pbnQoaGludGVuZGRpciksXG5cbiAgICAgICAgcG9zID0gMDtcbiAgICBhc3NlcnQocG9zIDwgcG9pbnRMaXN0Lmxlbmd0aCwgJ0FSR3JhcGguY2VudGVyU3RhaXJzSW5QYXRoUG9pbnRzIHBvcyA8IHBvaW50TGlzdC5sZW5ndGggRkFJTEVEJyk7XG5cbiAgICBwMXAgPSBwb3M7XG4gICAgcDEgPSAocG9pbnRMaXN0W3BvcysrXSk7XG5cbiAgICB2YXIgbnAyLFxuICAgICAgICBucDMsXG4gICAgICAgIGgsXG4gICAgICAgIHA0eCxcbiAgICAgICAgcDN4LFxuICAgICAgICBwMXgsXG4gICAgICAgIHRtcCxcbiAgICAgICAgdCxcbiAgICAgICAgbTtcblxuXG4gICAgd2hpbGUgKHBvcyA8IHBvaW50TGlzdC5sZW5ndGgpIHtcbiAgICAgICAgcDRwID0gcDNwO1xuICAgICAgICBwM3AgPSBwMnA7XG4gICAgICAgIHAycCA9IHAxcDtcbiAgICAgICAgcDFwID0gcG9zO1xuXG4gICAgICAgIHA0ID0gcDM7XG4gICAgICAgIHAzID0gcDI7XG4gICAgICAgIHAyID0gcDE7XG4gICAgICAgIHAxID0gKHBvaW50TGlzdFtwb3MrK10pO1xuXG4gICAgICAgIGQzNCA9IGQyMztcbiAgICAgICAgZDIzID0gZDEyO1xuXG4gICAgICAgIGlmIChwMnAgPCBwb2ludExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBkMTIgPSBVdGlscy5nZXREaXIocDIubWludXMocDEpKTtcbiAgICAgICAgICAgIGlmIChDT05TVEFOVFMuREVCVUcpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGQxMiksICdBUkdyYXBoLmNlbnRlclN0YWlyc0luUGF0aFBvaW50czogJyArXG4gICAgICAgICAgICAgICAgJ1V0aWxzLmlzUmlnaHRBbmdsZSAoZDEyKSBGQUlMRUQnKTtcbiAgICAgICAgICAgICAgICBpZiAocDNwICE9PSBwb2ludExpc3QuZW5kKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmFyZUluUmlnaHRBbmdsZShkMTIsIGQyMyksICdBUkdyYXBoLmNlbnRlclN0YWlyc0luUGF0aFBvaW50czogJyArXG4gICAgICAgICAgICAgICAgICAgICdVdGlscy5hcmVJblJpZ2h0QW5nbGUgKGQxMiwgZDIzKSBGQUlMRUQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocDRwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJiBkMTIgPT09IGQzNCkge1xuICAgICAgICAgICAgYXNzZXJ0KHAxcCA8IHBvaW50TGlzdC5sZW5ndGggJiYgcDJwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJiBwM3AgPCBwb2ludExpc3QubGVuZ3RoICYmXG4gICAgICAgICAgICBwNHAgPCBwb2ludExpc3QubGVuZ3RoLCAnQVJHcmFwaC5jZW50ZXJTdGFpcnNJblBhdGhQb2ludHM6IHAxcCA8IHBvaW50TGlzdC5sZW5ndGggJiYgJyArXG4gICAgICAgICAgICAncDJwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJiBwM3AgPCBwb2ludExpc3QubGVuZ3RoICYmIHA0cCA8IHBvaW50TGlzdC5sZW5ndGggRkFJTEVEJyk7XG5cbiAgICAgICAgICAgIG5wMiA9IG5ldyBBclBvaW50KHAyKTtcbiAgICAgICAgICAgIG5wMyA9IG5ldyBBclBvaW50KHAzKTtcbiAgICAgICAgICAgIGggPSBVdGlscy5pc0hvcml6b250YWwoZDEyKTtcblxuICAgICAgICAgICAgcDR4ID0gVXRpbHMuZ2V0UG9pbnRDb29yZChwNCwgaCk7XG4gICAgICAgICAgICBwM3ggPSBVdGlscy5nZXRQb2ludENvb3JkKHAzLCBoKTtcbiAgICAgICAgICAgIHAxeCA9IFV0aWxzLmdldFBvaW50Q29vcmQocDEsIGgpO1xuXG4gICAgICAgICAgICAvLyBwMXggd2lsbCByZXByZXNlbnQgdGhlIGxhcmdlciB4IHZhbHVlIGluIHRoaXMgJ3N0ZXAnIHNpdHVhdGlvblxuICAgICAgICAgICAgaWYgKHAxeCA8IHA0eCkge1xuICAgICAgICAgICAgICAgIHQgPSBwMXg7XG4gICAgICAgICAgICAgICAgcDF4ID0gcDR4O1xuICAgICAgICAgICAgICAgIHA0eCA9IHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwNHggPCBwM3ggJiYgcDN4IDwgcDF4KSB7XG4gICAgICAgICAgICAgICAgbSA9IE1hdGgucm91bmQoKHA0eCArIHAxeCkgLyAyKTtcbiAgICAgICAgICAgICAgICBpZiAoaCkge1xuICAgICAgICAgICAgICAgICAgICBucDIueCA9IG07XG4gICAgICAgICAgICAgICAgICAgIG5wMy54ID0gbTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBucDIueSA9IG07XG4gICAgICAgICAgICAgICAgICAgIG5wMy55ID0gbTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0bXAgPSB0aGlzLl9nZXRMaW1pdHNPZkVkZ2UobnAyLCBucDMsIHA0eCwgcDF4KTtcbiAgICAgICAgICAgICAgICBwNHggPSB0bXAubWluO1xuICAgICAgICAgICAgICAgIHAxeCA9IHRtcC5tYXg7XG5cbiAgICAgICAgICAgICAgICBtID0gTWF0aC5yb3VuZCgocDR4ICsgcDF4KSAvIDIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbnAyLnggPSBtO1xuICAgICAgICAgICAgICAgICAgICBucDMueCA9IG07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbnAyLnkgPSBtO1xuICAgICAgICAgICAgICAgICAgICBucDMueSA9IG07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0xpbmVDbGlwQm94ZXMobnAyLCBucDMpICYmICF0aGlzLl9pc0xpbmVDbGlwQm94ZXMocDFwID09PSBwb2ludExpc3QubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mQm94RW5kUG9pbnQgOiBwMSwgbnAyKSAmJiAhdGhpcy5faXNMaW5lQ2xpcEJveGVzKHA0cCA9PT0gMCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZkJveFN0YXJ0UG9pbnQgOiBwNCwgbnAzKSkge1xuICAgICAgICAgICAgICAgICAgICBwMiA9IG5wMjtcbiAgICAgICAgICAgICAgICAgICAgcDMgPSBucDM7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50TGlzdC5zcGxpY2UocDJwLCAxLCBwMik7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50TGlzdC5zcGxpY2UocDNwLCAxLCBwMyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICBwYXRoLmFzc2VydFZhbGlkUG9pbnRzKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIHN1cmUgaWYgYSBzdHJhaWdodCBsaW5lIGlzIHBvc3NpYmxlLCBjcmVhdGUgYSBzdHJhaWdodCBsaW5lIGZvclxuICogdGhlIHBhdGguXG4gKlxuICogQHBhcmFtIHtBdXRvUm91dGVyUGF0aH0gcGF0aFxuICovXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9maXhTaG9ydFBhdGhzID0gZnVuY3Rpb24gKHBhdGgpIHtcblxuICAgIHZhciBtb2RpZmllZCA9IGZhbHNlLFxuICAgICAgICBzdGFydHBvcnQgPSBwYXRoLmdldFN0YXJ0UG9ydCgpLFxuICAgICAgICBlbmRwb3J0ID0gcGF0aC5nZXRFbmRQb3J0KCksXG4gICAgICAgIGxlbiA9IHBhdGguZ2V0UG9pbnRMaXN0KCkubGVuZ3RoO1xuXG4gICAgaWYgKGxlbiA9PT0gNCkge1xuICAgICAgICB2YXIgcG9pbnRzID0gcGF0aC5nZXRQb2ludExpc3QoKSxcbiAgICAgICAgICAgIHN0YXJ0cG9pbnQgPSBwb2ludHNbMF0sXG4gICAgICAgICAgICBlbmRwb2ludCA9IHBvaW50c1tsZW4gLSAxXSxcbiAgICAgICAgICAgIHN0YXJ0RGlyID0gc3RhcnRwb3J0LnBvcnRPbldoaWNoRWRnZShzdGFydHBvaW50KSxcbiAgICAgICAgICAgIGVuZERpciA9IGVuZHBvcnQucG9ydE9uV2hpY2hFZGdlKGVuZHBvaW50KSxcbiAgICAgICAgICAgIHRzdFN0YXJ0LFxuICAgICAgICAgICAgdHN0RW5kO1xuXG4gICAgICAgIGlmIChzdGFydERpciA9PT0gVXRpbHMucmV2ZXJzZURpcihlbmREaXIpKSB7XG4gICAgICAgICAgICB2YXIgaXNIb3Jpem9udGFsID0gVXRpbHMuaXNIb3Jpem9udGFsKHN0YXJ0RGlyKSxcbiAgICAgICAgICAgICAgICBuZXdTdGFydCA9IG5ldyBBclBvaW50KHN0YXJ0cG9pbnQpLFxuICAgICAgICAgICAgICAgIG5ld0VuZCA9IG5ldyBBclBvaW50KGVuZHBvaW50KSxcbiAgICAgICAgICAgICAgICBzdGFydFJlY3QgPSBzdGFydHBvcnQucmVjdCxcbiAgICAgICAgICAgICAgICBlbmRSZWN0ID0gZW5kcG9ydC5yZWN0LFxuICAgICAgICAgICAgICAgIG1pbk92ZXJsYXAsXG4gICAgICAgICAgICAgICAgbWF4T3ZlcmxhcDtcblxuICAgICAgICAgICAgaWYgKGlzSG9yaXpvbnRhbCkge1xuICAgICAgICAgICAgICAgIG1pbk92ZXJsYXAgPSBNYXRoLm1pbihzdGFydFJlY3QuZmxvb3IsIGVuZFJlY3QuZmxvb3IpO1xuICAgICAgICAgICAgICAgIG1heE92ZXJsYXAgPSBNYXRoLm1heChzdGFydFJlY3QuY2VpbCwgZW5kUmVjdC5jZWlsKTtcblxuICAgICAgICAgICAgICAgIHZhciBuZXdZID0gKG1pbk92ZXJsYXAgKyBtYXhPdmVybGFwKSAvIDI7XG4gICAgICAgICAgICAgICAgbmV3U3RhcnQueSA9IG5ld1k7XG4gICAgICAgICAgICAgICAgbmV3RW5kLnkgPSBuZXdZO1xuXG4gICAgICAgICAgICAgICAgdHN0U3RhcnQgPSBuZXcgQXJQb2ludChVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChzdGFydHBvcnQub3duZXIucmVjdCwgc3RhcnREaXIpLCBuZXdTdGFydC55KTtcbiAgICAgICAgICAgICAgICB0c3RFbmQgPSBuZXcgQXJQb2ludChVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChlbmRwb3J0Lm93bmVyLnJlY3QsIGVuZERpciksIG5ld0VuZC55KTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaW5PdmVybGFwID0gTWF0aC5taW4oc3RhcnRSZWN0LnJpZ2h0LCBlbmRSZWN0LnJpZ2h0KTtcbiAgICAgICAgICAgICAgICBtYXhPdmVybGFwID0gTWF0aC5tYXgoc3RhcnRSZWN0LmxlZnQsIGVuZFJlY3QubGVmdCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbmV3WCA9IChtaW5PdmVybGFwICsgbWF4T3ZlcmxhcCkgLyAyO1xuICAgICAgICAgICAgICAgIG5ld1N0YXJ0LnggPSBuZXdYO1xuICAgICAgICAgICAgICAgIG5ld0VuZC54ID0gbmV3WDtcblxuICAgICAgICAgICAgICAgIHRzdFN0YXJ0ID0gbmV3IEFyUG9pbnQobmV3U3RhcnQueCwgVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQoc3RhcnRwb3J0Lm93bmVyLnJlY3QsIHN0YXJ0RGlyKSk7XG4gICAgICAgICAgICAgICAgdHN0RW5kID0gbmV3IEFyUG9pbnQobmV3RW5kLngsIFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGVuZHBvcnQub3duZXIucmVjdCwgZW5kRGlyKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB2YWxpZFBvaW50TG9jYXRpb24gPSBzdGFydFJlY3QucHRJblJlY3QobmV3U3RhcnQpICYmICFzdGFydFJlY3Qub25Db3JuZXIobmV3U3RhcnQpICYmXG4gICAgICAgICAgICAgICAgZW5kUmVjdC5wdEluUmVjdChuZXdFbmQpICYmICFlbmRSZWN0Lm9uQ29ybmVyKG5ld0VuZCk7XG5cbiAgICAgICAgICAgIGlmICh2YWxpZFBvaW50TG9jYXRpb24gJiYgIXRoaXMuX2lzTGluZUNsaXBCb3hlcyh0c3RTdGFydCwgdHN0RW5kKSkge1xuICAgICAgICAgICAgICAgIHZhciBobGlzdCA9IHRoaXMuX2dldEVkZ2VMaXN0KGlzSG9yaXpvbnRhbCksXG4gICAgICAgICAgICAgICAgICAgIHZsaXN0ID0gdGhpcy5fZ2V0RWRnZUxpc3QoIWlzSG9yaXpvbnRhbCksXG4gICAgICAgICAgICAgICAgICAgIGVkZ2UgPSBobGlzdC5nZXRFZGdlQnlQb2ludGVyKHN0YXJ0cG9pbnQpLFxuICAgICAgICAgICAgICAgICAgICBlZGdlMiA9IHZsaXN0LmdldEVkZ2VCeVBvaW50ZXIocG9pbnRzWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgZWRnZTMgPSBobGlzdC5nZXRFZGdlQnlQb2ludGVyKHBvaW50c1syXSk7XG5cbiAgICAgICAgICAgICAgICB2bGlzdC5yZW1vdmUoZWRnZTIpO1xuICAgICAgICAgICAgICAgIGhsaXN0LnJlbW92ZShlZGdlMyk7XG4gICAgICAgICAgICAgICAgaGxpc3QucmVtb3ZlKGVkZ2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlIHZhbHVlcyBvZiBzdGFydHBvaW50IGlzIGNoYW5nZWQgYnV0IHdlIGRvbid0IGNoYW5nZSB0aGUgc3RhcnRwb2ludCBvZiB0aGUgZWRnZVxuICAgICAgICAgICAgICAgIHN0YXJ0cG9pbnQuYXNzaWduKG5ld1N0YXJ0KTtcbiAgICAgICAgICAgICAgICAvLyB0byBtYWludGFpbiB0aGUgcmVmZXJlbmNlIHRoYXQgdGhlIHBvcnQgaGFzIHRvIHRoZSBzdGFydHBvaW50XG4gICAgICAgICAgICAgICAgZW5kcG9pbnQuYXNzaWduKG5ld0VuZCk7XG4gICAgICAgICAgICAgICAgZWRnZS5zZXRFbmRQb2ludChlbmRwb2ludCk7XG5cbiAgICAgICAgICAgICAgICBlZGdlLnN0YXJ0cG9pbnRQcmV2ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBlZGdlLmVuZHBvaW50TmV4dCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICBlZGdlLnBvc2l0aW9uWSA9IFV0aWxzLmdldFBvaW50Q29vcmQobmV3U3RhcnQsIFV0aWxzLm5leHRDbG9ja3dpc2VEaXIoc3RhcnREaXIpKTtcbiAgICAgICAgICAgICAgICBobGlzdC5pbnNlcnQoZWRnZSk7XG5cbiAgICAgICAgICAgICAgICBwb2ludHMuc3BsaWNlKDEsIDIpO1xuICAgICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtb2RpZmllZDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHVubmVjZXNzYXJ5IGN1cnZlcyBpbnNlcnRlZCBpbnRvIHRoZSBwYXRoIGZyb20gdGhlXG4gKiB0cmFjaW5nIHRoZSBlZGdlcyBvZiBvdmVybGFwcGluZyBib3hlcy4gKGh1ZyBjaGlsZHJlbilcbiAqXG4gKiBAcGFyYW0ge0F1dG9Sb3V0ZXJQYXRofSBwYXRoXG4gKi9cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3NpbXBsaWZ5UGF0aEN1cnZlcyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgLy8gSW5jaWRlbnRseSwgdGhpcyB3aWxsIGFsc28gY29udGFpbiB0aGUgZnVuY3Rpb25hbGl0eSBvZiBzaW1wbGlmeVRyaXZpYWxseVxuICAgIHZhciBwb2ludExpc3QgPSBwYXRoLmdldFBvaW50TGlzdCgpLFxuICAgICAgICBwMSxcbiAgICAgICAgcDIsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBqO1xuXG4gICAgLy8gSSB3aWxsIGJlIHRha2luZyB0aGUgZmlyc3QgcG9pbnQgYW5kIGNoZWNraW5nIHRvIHNlZSBpZiBpdCBjYW4gY3JlYXRlIGEgc3RyYWlnaHQgbGluZVxuICAgIC8vIHRoYXQgZG9lcyBub3QgVXRpbHMuaW50ZXJzZWN0ICBhbnkgb3RoZXIgYm94ZXMgb24gdGhlIGdyYXBoIGZyb20gdGhlIHRlc3QgcG9pbnQgdG8gdGhlIG90aGVyIHBvaW50LlxuICAgIC8vIFRoZSAnb3RoZXIgcG9pbnQnIHdpbGwgYmUgdGhlIGVuZCBvZiB0aGUgcGF0aCBpdGVyYXRpbmcgYmFjayB0aWwgdGhlIHR3byBwb2ludHMgYmVmb3JlIHRoZSBcbiAgICAvLyBjdXJyZW50LlxuICAgIHdoaWxlIChpIDwgcG9pbnRMaXN0Lmxlbmd0aCAtIDMpIHtcbiAgICAgICAgcDEgPSBwb2ludExpc3RbaV07XG4gICAgICAgIGogPSBwb2ludExpc3QubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlIChqLS0gPiAwKSB7XG4gICAgICAgICAgICBwMiA9IHBvaW50TGlzdFtqXTtcbiAgICAgICAgICAgIGlmIChVdGlscy5pc1JpZ2h0QW5nbGUoVXRpbHMuZ2V0RGlyKHAxLm1pbnVzKHAyKSkpICYmICF0aGlzLl9pc0xpbmVDbGlwQm94ZXMocDEsIHAyKSB8fFxuICAgICAgICAgICAgICAgIHAxLmVxdWFscyhwMikpIHtcbiAgICAgICAgICAgICAgICBwb2ludExpc3Quc3BsaWNlKGkgKyAxLCBqIC0gaSAtIDEpOyAvLyBSZW1vdmUgYWxsIHBvaW50cyBiZXR3ZWVuIGksIGpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICArK2k7XG4gICAgfVxufTtcblxuLyogVGhlIGZvbGxvd2luZyBzaGFwZSBpbiBhIHBhdGhcbiAqIF9fX19fX19cbiAqICAgICAgIHwgICAgICAgX19fXG4gKiAgICAgICB8ICAgICAgfFxuICogICAgICAgfF9fX19fX3xcbiAqXG4gKiB3aWxsIGJlIHJlcGxhY2VkIHdpdGggXG4gKiBfX19fX19fXG4gKiAgICAgICB8X19fX19fXG4gKlxuICogaWYgcG9zc2libGUuXG4gKi9cbi8qKlxuICogUmVwbGFjZSA1IHBvaW50cyBmb3IgMyB3aGVyZSBwb3NzaWJsZS4gVGhpcyB3aWxsIHJlcGxhY2UgJ3UnLWxpa2Ugc2hhcGVzXG4gKiB3aXRoICd6JyBsaWtlIHNoYXBlcy5cbiAqXG4gKiBAcGFyYW0gcGF0aFxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9zaW1wbGlmeVBhdGhQb2ludHMgPSBmdW5jdGlvbiAocGF0aCkge1xuICAgIGFzc2VydChwYXRoICE9PSBudWxsLCAnQVJHcmFwaC5zaW1wbGlmeVBhdGhQb2ludHM6IHBhdGggIT09IG51bGwgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KCFwYXRoLmlzQ29ubmVjdGVkKCksICdBUkdyYXBoLnNpbXBsaWZ5UGF0aFBvaW50czogIXBhdGguaXNDb25uZWN0ZWQoKSBGQUlMRUQnKTtcblxuICAgIHZhciBwb2ludExpc3QgPSBwYXRoLmdldFBvaW50TGlzdCgpO1xuICAgIGFzc2VydChwb2ludExpc3QubGVuZ3RoID49IDIsICdBUkdyYXBoLnNpbXBsaWZ5UGF0aFBvaW50czogcG9pbnRMaXN0Lmxlbmd0aCA+PSAyIEZBSUxFRCcpO1xuXG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICBwYXRoLmFzc2VydFZhbGlkUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdmFyIHAxLFxuICAgICAgICBwMixcbiAgICAgICAgcDMsXG4gICAgICAgIHA0LFxuICAgICAgICBwNSxcblxuICAgICAgICBwMXAgPSBwb2ludExpc3QubGVuZ3RoLFxuICAgICAgICBwMnAgPSBwb2ludExpc3QubGVuZ3RoLFxuICAgICAgICBwM3AgPSBwb2ludExpc3QubGVuZ3RoLFxuICAgICAgICBwNHAgPSBwb2ludExpc3QubGVuZ3RoLFxuICAgICAgICBwNXAgPSBwb2ludExpc3QubGVuZ3RoLFxuXG4gICAgICAgIHBvcyA9IDAsXG5cbiAgICAgICAgbnAzLFxuICAgICAgICBkLFxuICAgICAgICBoO1xuXG4gICAgYXNzZXJ0KHBvcyA8IHBvaW50TGlzdC5sZW5ndGgsICdBUkdyYXBoLnNpbXBsaWZ5UGF0aFBvaW50czogcG9zIDwgcG9pbnRMaXN0Lmxlbmd0aCBGQUlMRUQnKTtcblxuICAgIHAxcCA9IHBvcztcbiAgICBwMSA9IHBvaW50TGlzdFtwb3MrK107XG5cbiAgICB3aGlsZSAocG9zIDwgcG9pbnRMaXN0Lmxlbmd0aCkge1xuICAgICAgICBwNXAgPSBwNHA7XG4gICAgICAgIHA0cCA9IHAzcDtcbiAgICAgICAgcDNwID0gcDJwO1xuICAgICAgICBwMnAgPSBwMXA7XG4gICAgICAgIHAxcCA9IHBvcztcblxuICAgICAgICBwNSA9IHA0O1xuICAgICAgICBwNCA9IHAzO1xuICAgICAgICBwMyA9IHAyO1xuICAgICAgICBwMiA9IHAxO1xuICAgICAgICBwMSA9IHBvaW50TGlzdFtwb3MrK107XG5cbiAgICAgICAgaWYgKHA1cCA8IHBvaW50TGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFzc2VydChwMXAgPCBwb2ludExpc3QubGVuZ3RoICYmIHAycCA8IHBvaW50TGlzdC5sZW5ndGggJiYgcDNwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJlxuICAgICAgICAgICAgICAgIHA0cCA8IHBvaW50TGlzdC5sZW5ndGggJiYgcDVwIDwgcG9pbnRMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAnQVJHcmFwaC5zaW1wbGlmeVBhdGhQb2ludHM6IHAxcCA8IHBvaW50TGlzdC5sZW5ndGggJiYgcDJwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJiAnICtcbiAgICAgICAgICAgICAgICAncDNwIDwgcG9pbnRMaXN0Lmxlbmd0aCAmJiBwNHAgPCBwb2ludExpc3QubGVuZ3RoICYmIHA1cCA8IHBvaW50TGlzdC5sZW5ndGggRkFJTEVEJyk7XG5cbiAgICAgICAgICAgIGFzc2VydCghcDEuZXF1YWxzKHAyKSAmJiAhcDIuZXF1YWxzKHAzKSAmJiAhcDMuZXF1YWxzKHA0KSAmJiAhcDQuZXF1YWxzKHA1KSxcbiAgICAgICAgICAgICAgICAnQVJHcmFwaC5zaW1wbGlmeVBhdGhQb2ludHM6ICFwMS5lcXVhbHMocDIpICYmICFwMi5lcXVhbHMocDMpICYmICFwMy5lcXVhbHMocDQpICYmICcgK1xuICAgICAgICAgICAgICAgICchcDQuZXF1YWxzKHA1KSBGQUlMRUQnKTtcblxuICAgICAgICAgICAgZCA9IFV0aWxzLmdldERpcihwMi5taW51cyhwMSkpO1xuICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkKSwgJ0FSR3JhcGguc2ltcGxpZnlQYXRoUG9pbnRzOiBVdGlscy5pc1JpZ2h0QW5nbGUgKGQpIEZBSUxFRCcpO1xuICAgICAgICAgICAgaCA9IFV0aWxzLmlzSG9yaXpvbnRhbChkKTtcblxuICAgICAgICAgICAgbnAzID0gbmV3IEFyUG9pbnQoKTtcbiAgICAgICAgICAgIGlmIChoKSB7XG4gICAgICAgICAgICAgICAgbnAzLnggPSBVdGlscy5nZXRQb2ludENvb3JkKHA1LCBoKTtcbiAgICAgICAgICAgICAgICBucDMueSA9IFV0aWxzLmdldFBvaW50Q29vcmQocDEsICFoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbnAzLnggPSBVdGlscy5nZXRQb2ludENvb3JkKHAxLCAhaCk7XG4gICAgICAgICAgICAgICAgbnAzLnkgPSBVdGlscy5nZXRQb2ludENvb3JkKHA1LCBoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0xpbmVDbGlwQm94ZXMocDIsIG5wMykgJiYgIXRoaXMuX2lzTGluZUNsaXBCb3hlcyhucDMsIHA0KSkge1xuICAgICAgICAgICAgICAgIHBvaW50TGlzdC5zcGxpY2UocDJwLCAxKTtcbiAgICAgICAgICAgICAgICBwb2ludExpc3Quc3BsaWNlKHAzcCwgMSk7XG4gICAgICAgICAgICAgICAgcG9pbnRMaXN0LnNwbGljZShwNHAsIDEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFucDMuZXF1YWxzKHAxKSAmJiAhbnAzLmVxdWFscyhwNSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRMaXN0LnNwbGljZShwNHAsIDAsIG5wMyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcDFwID0gcG9pbnRMaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBwMnAgPSBwb2ludExpc3QubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHAzcCA9IHBvaW50TGlzdC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgcDRwID0gcG9pbnRMaXN0Lmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHBhdGguYXNzZXJ0VmFsaWRQb2ludHMoKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9jb25uZWN0QWxsRGlzY29ubmVjdGVkUGF0aHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGxlbiA9IHRoaXMucGF0aHMubGVuZ3RoLFxuICAgICAgICBzdWNjZXNzID0gZmFsc2UsXG4gICAgICAgIGdpdmV1cCA9IGZhbHNlLFxuICAgICAgICBwYXRoO1xuXG4gICAgd2hpbGUgKCFzdWNjZXNzICYmICFnaXZldXApIHtcbiAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgIGkgPSBsZW47XG4gICAgICAgIHdoaWxlIChpLS0gJiYgc3VjY2Vzcykge1xuICAgICAgICAgICAgcGF0aCA9IHRoaXMucGF0aHNbaV07XG5cbiAgICAgICAgICAgIGlmICghcGF0aC5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRoaXMuX2Nvbm5lY3QocGF0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU29tZXRoaW5nIGlzIG1lc3NlZCB1cCwgcHJvYmFibHkgYW4gZXhpc3RpbmcgZWRnZSBjdXN0b21pemF0aW9uIHJlc3VsdHMgaW4gYSB6ZXJvIGxlbmd0aCBlZGdlXG4gICAgICAgICAgICAgICAgICAgIC8vIEluIHRoYXQgY2FzZSB3ZSB0cnkgdG8gZGVsZXRlIGFueSBjdXN0b21pemF0aW9uIGZvciB0aGlzIHBhdGggdG8gcmVjb3ZlciBmcm9tIHRoZSBwcm9ibGVtXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmFyZVRoZXJlUGF0aEN1c3RvbWl6YXRpb25zKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGgucmVtb3ZlUGF0aEN1c3RvbWl6YXRpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnaXZldXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghc3VjY2VzcyAmJiAhZ2l2ZXVwKSB7XG4gICAgICAgICAgICB0aGlzLl9kaXNjb25uZWN0QWxsKCk7XHQvLyBUaGVyZSB3YXMgYW4gZXJyb3IsIGRlbGV0ZSBoYWxmd2F5IHJlc3VsdHMgdG8gYmUgYWJsZSB0byBzdGFydCBhIG5ldyBwYXNzXG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb21wbGV0ZWx5Q29ubmVjdGVkID0gdHJ1ZTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3VwZGF0ZUJveFBvcnRBdmFpbGFiaWxpdHkgPSBmdW5jdGlvbiAoaW5wdXRCb3gpIHtcbiAgICB2YXIgYnVmZmVyYm94LFxuICAgICAgICBzaWJsaW5ncyxcbiAgICAgICAgc2tpcEJveGVzID0ge30sXG4gICAgICAgIGJveCxcbiAgICAgICAgaWQ7XG5cbiAgICBidWZmZXJib3ggPSB0aGlzLmJveDJidWZmZXJCb3hbaW5wdXRCb3guaWRdO1xuICAgIGFzc2VydChidWZmZXJib3gsICdCdWZmZXJib3ggbm90IGZvdW5kIGZvciAnICsgaW5wdXRCb3guaWQpO1xuICAgIHNpYmxpbmdzID0gYnVmZmVyYm94LmNoaWxkcmVuO1xuICAgIC8vIElnbm9yZSBvdmVybGFwIGZyb20gYW5jZXN0b3IgYm94ZXMgaW4gdGhlIGJveCB0cmVlc1xuICAgIGJveCA9IGlucHV0Qm94O1xuICAgIGRvIHtcbiAgICAgICAgc2tpcEJveGVzW2JveC5pZF0gPSB0cnVlO1xuICAgICAgICBib3ggPSBib3gucGFyZW50O1xuICAgIH0gd2hpbGUgKGJveCk7XG5cbiAgICBmb3IgKHZhciBpID0gc2libGluZ3MubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIGlkID0gc2libGluZ3NbaV0uaWQ7XG4gICAgICAgIGlmIChza2lwQm94ZXNbaWRdKSB7ICAvLyBTa2lwIGJveGVzIG9uIHRoZSBib3ggdHJlZVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5wdXRCb3gucmVjdC50b3VjaGluZyhzaWJsaW5nc1tpXSkpIHtcbiAgICAgICAgICAgIGlucHV0Qm94LmFkanVzdFBvcnRBdmFpbGFiaWxpdHkodGhpcy5ib3hlc1tzaWJsaW5nc1tpXS5pZF0pO1xuICAgICAgICAgICAgdGhpcy5ib3hlc1tzaWJsaW5nc1tpXS5pZF0uYWRqdXN0UG9ydEF2YWlsYWJpbGl0eShpbnB1dEJveCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9hZGRUb0J1ZmZlckJveGVzID0gZnVuY3Rpb24gKGlucHV0Qm94KSB7XG4gICAgdmFyIGJveCA9IHtyZWN0OiBuZXcgQXJSZWN0KGlucHV0Qm94LnJlY3QpLCBpZDogaW5wdXRCb3guaWR9LFxuICAgICAgICBvdmVybGFwQm94ZXNJbmRpY2VzID0gW10sXG4gICAgICAgIGJ1ZmZlckJveCxcbiAgICAgICAgY2hpbGRyZW4gPSBbXSxcbiAgICAgICAgcGFyZW50Qm94LFxuICAgICAgICBpZHMgPSBbaW5wdXRCb3guaWRdLFxuICAgICAgICBjaGlsZCxcbiAgICAgICAgaSxcbiAgICAgICAgajtcblxuICAgIGJveC5yZWN0LmluZmxhdGVSZWN0KENPTlNUQU5UUy5CVUZGRVIpO1xuICAgIGFzc2VydCghdGhpcy5ib3gyYnVmZmVyQm94W2lucHV0Qm94LmlkXSxcbiAgICAgICAgJ0NhblxcJ3QgYWRkIGJveCB0byAyIGJ1ZmZlcmJveGVzJyk7XG5cbiAgICAvLyBGb3IgZXZlcnkgYnVmZmVyIGJveCB0b3VjaGluZyB0aGUgaW5wdXQgYm94XG4gICAgLy8gUmVjb3JkIHRoZSBidWZmZXIgYm94ZXMgd2l0aCBjaGlsZHJlbiB0b3VjaGluZyBcbiAgICAvLyB0aGUgaW5wdXQgYm94XG4gICAgZm9yIChpID0gdGhpcy5idWZmZXJCb3hlcy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgaWYgKCFib3gucmVjdC50b3VjaGluZyh0aGlzLmJ1ZmZlckJveGVzW2ldLmJveCkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaiA9IHRoaXMuYnVmZmVyQm94ZXNbaV0uY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICBjaGlsZCA9IHRoaXMuYnVmZmVyQm94ZXNbaV0uY2hpbGRyZW5bal07XG4gICAgICAgICAgICBpZiAoYm94LnJlY3QudG91Y2hpbmcoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgaW5wdXRCb3guYWRqdXN0UG9ydEF2YWlsYWJpbGl0eSh0aGlzLmJveGVzW2NoaWxkLmlkXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5ib3hlc1tjaGlsZC5pZF0uYWRqdXN0UG9ydEF2YWlsYWJpbGl0eShpbnB1dEJveCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3ZlcmxhcEJveGVzSW5kaWNlcy5pbmRleE9mKGkpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBvdmVybGFwQm94ZXNJbmRpY2VzLnB1c2goaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwYXJlbnRCb3ggPSBuZXcgQXJSZWN0KGJveC5yZWN0KTtcbiAgICAvLyBJZiBvdmVybGFwcGVkIG90aGVyIGJveGVzLCBjcmVhdGUgdGhlIG5ldyBidWZmZXJib3ggcGFyZW50IHJlY3RcbiAgICBpZiAob3ZlcmxhcEJveGVzSW5kaWNlcy5sZW5ndGggIT09IDApIHtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb3ZlcmxhcEJveGVzSW5kaWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXNzZXJ0KG92ZXJsYXBCb3hlc0luZGljZXNbaV0gPCB0aGlzLmJ1ZmZlckJveGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAnQXJHcmFwaC5hZGRUb0J1ZmZlckJveGVzOiBvdmVybGFwQm94ZXMgaW5kZXggb3V0IG9mIGJvdW5kcy4gKCcgK1xuICAgICAgICAgICAgICAgIG92ZXJsYXBCb3hlc0luZGljZXNbaV0gKyAnIDwgJyArIHRoaXMuYnVmZmVyQm94ZXMubGVuZ3RoICsgJyknKTtcblxuICAgICAgICAgICAgYnVmZmVyQm94ID0gdGhpcy5idWZmZXJCb3hlcy5zcGxpY2Uob3ZlcmxhcEJveGVzSW5kaWNlc1tpXSwgMSlbMF07XG5cbiAgICAgICAgICAgIGZvciAoaiA9IGJ1ZmZlckJveC5jaGlsZHJlbi5sZW5ndGg7IGotLTspIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGJ1ZmZlckJveC5jaGlsZHJlbltqXSk7XG4gICAgICAgICAgICAgICAgaWRzLnB1c2goYnVmZmVyQm94LmNoaWxkcmVuW2pdLmlkKTsgIC8vIFN0b3JlIHRoZSBpZHMgb2YgdGhlIGNoaWxkcmVuIHRoYXQgbmVlZCB0byBiZSBhZGp1c3RlZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwYXJlbnRCb3gudW5pb25Bc3NpZ24oYnVmZmVyQm94LmJveCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBib3gucmVjdC5pZCA9IGlucHV0Qm94LmlkO1xuICAgIGNoaWxkcmVuLnB1c2goYm94LnJlY3QpO1xuXG4gICAgdGhpcy5idWZmZXJCb3hlcy5wdXNoKHtib3g6IHBhcmVudEJveCwgY2hpbGRyZW46IGNoaWxkcmVufSk7XG5cbiAgICBmb3IgKGkgPSBpZHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHRoaXMuYm94MmJ1ZmZlckJveFtpZHNbaV1dID0gdGhpcy5idWZmZXJCb3hlc1t0aGlzLmJ1ZmZlckJveGVzLmxlbmd0aCAtIDFdO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3JlbW92ZUZyb21CdWZmZXJCb3hlcyA9IGZ1bmN0aW9uIChib3gpIHtcbiAgICAvLyBHZXQgdGhlIGNoaWxkcmVuIG9mIHRoZSBwYXJlbnRCb3ggKG5vdCBpbmNsdWRpbmcgdGhlIGJveCB0byByZW1vdmUpXG4gICAgLy8gQ3JlYXRlIGJ1ZmZlcmJveGVzIGZyb20gdGhlc2UgY2hpbGRyZW5cbiAgICB2YXIgYnVmZmVyQm94ID0gdGhpcy5ib3gyYnVmZmVyQm94W2JveC5pZF0sXG4gICAgICAgIGkgPSB0aGlzLmJ1ZmZlckJveGVzLmluZGV4T2YoYnVmZmVyQm94KSxcbiAgICAgICAgY2hpbGRyZW4gPSBidWZmZXJCb3guY2hpbGRyZW4sXG4gICAgICAgIGdyb3VwcyA9IFtdLFxuICAgICAgICBhZGQgPSBmYWxzZSxcbiAgICAgICAgcGFyZW50Qm94LFxuICAgICAgICBjaGlsZCxcbiAgICAgICAgZ3JvdXAsXG4gICAgICAgIGlkcyxcbiAgICAgICAgaWQsXG4gICAgICAgIGosXG4gICAgICAgIGc7XG5cbiAgICBhc3NlcnQoaSAhPT0gLTEsICdBUkdyYXBoLnJlbW92ZUZyb21CdWZmZXJCb3hlczogQ2FuXFwndCBmaW5kIHRoZSBjb3JyZWN0IGJ1ZmZlcmJveC4nKTtcblxuICAgIC8vIFJlbW92ZSByZWNvcmQgb2YgcmVtb3ZlZCBib3hcbiAgICB0aGlzLmJ1ZmZlckJveGVzLnNwbGljZShpLCAxKTtcbiAgICB0aGlzLmJveDJidWZmZXJCb3hbYm94LmlkXSA9IHVuZGVmaW5lZDtcblxuICAgIC8vQ3JlYXRlIGdyb3VwcyBvZiBvdmVybGFwIGZyb20gY2hpbGRyZW5cbiAgICBpID0gY2hpbGRyZW4ubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgZyA9IGdyb3Vwcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkID0gY2hpbGRyZW5baV07XG4gICAgICAgIGdyb3VwID0gW2NoaWxkXTtcbiAgICAgICAgYWRkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5ib3hlc1tjaGlsZC5pZF0ucmVzZXRQb3J0QXZhaWxhYmlsaXR5KCk7ICAvLyBSZXNldCBib3gncyBwb3J0cyBhdmFpbGFibGVBcmVhc1xuXG4gICAgICAgIGlmIChjaGlsZC5pZCA9PT0gYm94LmlkKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChnLS0pIHtcbiAgICAgICAgICAgIGogPSBncm91cHNbZ10ubGVuZ3RoO1xuXG4gICAgICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdyb3Vwc1tnXVtqXS50b3VjaGluZyhjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWQgPSBncm91cHNbZ11bal0uaWQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYm94ZXNbY2hpbGQuaWRdLmFkanVzdFBvcnRBdmFpbGFiaWxpdHkodGhpcy5ib3hlc1tpZF0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJveGVzW2lkXS5hZGp1c3RQb3J0QXZhaWxhYmlsaXR5KHRoaXMuYm94ZXNbY2hpbGQuaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICAvLyBncm91cCB3aWxsIGFjY3VtdWxhdGUgYWxsIHRoaW5ncyBvdmVybGFwcGluZyB0aGUgY2hpbGRcbiAgICAgICAgICAgICAgICBncm91cCA9IGdyb3VwLmNvbmNhdChncm91cHMuc3BsaWNlKGcsIDEpWzBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGdyb3Vwcy5wdXNoKGdyb3VwKTsgIC8vIEFkZCBncm91cCB0byBncm91cHNcbiAgICB9XG5cbiAgICBpID0gZ3JvdXBzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGogPSBncm91cHNbaV0ubGVuZ3RoO1xuICAgICAgICBwYXJlbnRCb3ggPSBuZXcgQXJSZWN0KGdyb3Vwc1tpXVswXSk7XG4gICAgICAgIGlkcyA9IFtdO1xuXG4gICAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgICAgIHBhcmVudEJveC51bmlvbkFzc2lnbihncm91cHNbaV1bal0pO1xuICAgICAgICAgICAgaWRzLnB1c2goZ3JvdXBzW2ldW2pdLmlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyQm94ZXMucHVzaCh7Ym94OiBwYXJlbnRCb3gsIGNoaWxkcmVuOiBncm91cHNbaV19KTtcblxuICAgICAgICBqID0gaWRzLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGotLSkge1xuICAgICAgICAgICAgdGhpcy5ib3gyYnVmZmVyQm94W2lkc1tqXV0gPSB0aGlzLmJ1ZmZlckJveGVzW3RoaXMuYnVmZmVyQm94ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbi8vUHVibGljIEZ1bmN0aW9uc1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIChuZXdCdWZmZXIpIHtcbiAgICBDT05TVEFOVFMuQlVGRkVSID0gbmV3QnVmZmVyO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5jYWxjdWxhdGVTZWxmUG9pbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VsZlBvaW50cyA9IFtdO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KENPTlNUQU5UUy5FRF9NSU5DT09SRCwgQ09OU1RBTlRTLkVEX01JTkNPT1JEKSk7XG4gICAgdGhpcy5zZWxmUG9pbnRzLnB1c2gobmV3IEFyUG9pbnQoQ09OU1RBTlRTLkVEX01BWENPT1JELCBDT05TVEFOVFMuRURfTUlOQ09PUkQpKTtcbiAgICB0aGlzLnNlbGZQb2ludHMucHVzaChuZXcgQXJQb2ludChDT05TVEFOVFMuRURfTUFYQ09PUkQsIENPTlNUQU5UUy5FRF9NQVhDT09SRCkpO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KENPTlNUQU5UUy5FRF9NSU5DT09SRCwgQ09OU1RBTlRTLkVEX01BWENPT1JEKSk7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLmNyZWF0ZUJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm94ID0gbmV3IEF1dG9Sb3V0ZXJCb3goKTtcbiAgICBhc3NlcnQoYm94ICE9PSBudWxsLCAnQVJHcmFwaC5jcmVhdGVCb3g6IGJveCAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHJldHVybiBib3g7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLmFkZEJveCA9IGZ1bmN0aW9uIChib3gpIHtcbiAgICBhc3NlcnQoYm94ICE9PSBudWxsLFxuICAgICAgICAnQVJHcmFwaC5hZGRCb3g6IGJveCAhPT0gbnVsbCBGQUlMRUQnKTtcbiAgICBhc3NlcnQoYm94IGluc3RhbmNlb2YgQXV0b1JvdXRlckJveCxcbiAgICAgICAgJ0FSR3JhcGguYWRkQm94OiBib3ggaW5zdGFuY2VvZiBBdXRvUm91dGVyQm94IEZBSUxFRCcpO1xuXG4gICAgdmFyIHJlY3QgPSBib3gucmVjdDtcblxuICAgIHRoaXMuX2Rpc2Nvbm5lY3RQYXRoc0NsaXBwaW5nKHJlY3QpO1xuXG4gICAgYm94Lm93bmVyID0gdGhpcztcbiAgICB2YXIgYm94SWQgPSAoQ09VTlRFUisrKS50b1N0cmluZygpO1xuICAgIHdoaWxlIChib3hJZC5sZW5ndGggPCA2KSB7XG4gICAgICAgIGJveElkID0gJzAnICsgYm94SWQ7XG4gICAgfVxuICAgIGJveElkID0gJ0JPWF8nICsgYm94SWQ7XG4gICAgYm94LmlkID0gYm94SWQ7XG5cbiAgICB0aGlzLmJveGVzW2JveElkXSA9IGJveDtcblxuICAgIHRoaXMuX2FkZEJveEFuZFBvcnRFZGdlcyhib3gpO1xuXG4gICAgLy8gYWRkIGNoaWxkcmVuIG9mIHRoZSBib3hcbiAgICB2YXIgY2hpbGRyZW4gPSBib3guY2hpbGRCb3hlcyxcbiAgICAgICAgaSA9IGNoaWxkcmVuLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHRoaXMuYWRkQm94KGNoaWxkcmVuW2ldKTtcbiAgICB9XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLmRlbGV0ZUJveCA9IGZ1bmN0aW9uIChib3gpIHtcbiAgICBhc3NlcnQoYm94ICE9PSBudWxsLCAnQVJHcmFwaC5kZWxldGVCb3g6IGJveCAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIGlmIChib3guaGFzT3duZXIoKSkge1xuICAgICAgICB2YXIgcGFyZW50ID0gYm94LnBhcmVudCxcbiAgICAgICAgICAgIGNoaWxkcmVuID0gYm94LmNoaWxkQm94ZXMsXG4gICAgICAgICAgICBpID0gY2hpbGRyZW4ubGVuZ3RoO1xuXG4gICAgICAgIC8vIG5vdGlmeSB0aGUgcGFyZW50IG9mIHRoZSBkZWxldGlvblxuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoYm94KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBjaGlsZHJlblxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZUJveChjaGlsZHJlbltpXSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9kZWxldGVCb3hBbmRQb3J0RWRnZXMoYm94KTtcbiAgICAgICAgYm94Lm93bmVyID0gbnVsbDtcbiAgICAgICAgYXNzZXJ0KHRoaXMuYm94ZXNbYm94LmlkXSAhPT0gdW5kZWZpbmVkLCAnQVJHcmFwaC5yZW1vdmU6IEJveCBkb2VzIG5vdCBleGlzdCcpO1xuXG4gICAgICAgIGRlbGV0ZSB0aGlzLmJveGVzW2JveC5pZF07XG4gICAgfVxuXG4gICAgYm94LmRlc3Ryb3koKTtcbiAgICBib3ggPSBudWxsO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5zaGlmdEJveEJ5ID0gZnVuY3Rpb24gKGJveCwgb2Zmc2V0KSB7XG4gICAgYXNzZXJ0KGJveCAhPT0gbnVsbCwgJ0FSR3JhcGguc2hpZnRCb3hCeTogYm94ICE9PSBudWxsIEZBSUxFRCcpO1xuICAgIGFzc2VydCghIXRoaXMuYm94ZXNbYm94LmlkXSwgJ0FSR3JhcGguc2hpZnRCb3hCeTogQm94IGRvZXMgbm90IGV4aXN0IScpO1xuXG4gICAgdmFyIHJlY3QgPSB0aGlzLmJveDJidWZmZXJCb3hbYm94LmlkXS5ib3gsXG4gICAgICAgIGNoaWxkcmVuID0gYm94LmNoaWxkQm94ZXM7XG5cbiAgICB0aGlzLl9kaXNjb25uZWN0UGF0aHNDbGlwcGluZyhyZWN0KTsgLy8gcmVkcmF3IGFsbCBwYXRocyBjbGlwcGluZyBwYXJlbnQgYm94LlxuICAgIHRoaXMuX2Rpc2Nvbm5lY3RQYXRoc0Zyb20oYm94KTtcblxuICAgIHRoaXMuX2RlbGV0ZUJveEFuZFBvcnRFZGdlcyhib3gpO1xuXG4gICAgYm94LnNoaWZ0Qnkob2Zmc2V0KTtcbiAgICB0aGlzLl9hZGRCb3hBbmRQb3J0RWRnZXMoYm94KTtcblxuICAgIHJlY3QgPSBib3gucmVjdDtcbiAgICB0aGlzLl9kaXNjb25uZWN0UGF0aHNDbGlwcGluZyhyZWN0KTtcblxuICAgIGZvciAodmFyIGkgPSBjaGlsZHJlbi5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdGhpcy5zaGlmdEJveEJ5KGNoaWxkcmVuW2ldLCBvZmZzZXQpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuc2V0Qm94UmVjdCA9IGZ1bmN0aW9uIChib3gsIHJlY3QpIHtcbiAgICBpZiAoYm94ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9kZWxldGVCb3hBbmRQb3J0RWRnZXMoYm94KTtcbiAgICBib3guc2V0UmVjdChyZWN0KTtcbiAgICB0aGlzLl9hZGRCb3hBbmRQb3J0RWRnZXMoYm94KTtcblxuICAgIHRoaXMuX2Rpc2Nvbm5lY3RQYXRoc0NsaXBwaW5nKHJlY3QpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5yb3V0ZVN5bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHN0YXRlID0ge2ZpbmlzaGVkOiBmYWxzZX07XG5cbiAgICB0aGlzLl9jb25uZWN0QWxsRGlzY29ubmVjdGVkUGF0aHMoKTtcblxuICAgIHdoaWxlICghc3RhdGUuZmluaXNoZWQpIHtcbiAgICAgICAgc3RhdGUgPSB0aGlzLl9vcHRpbWl6ZShzdGF0ZSk7XG4gICAgfVxuXG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLnJvdXRlQXN5bmMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgdXBkYXRlRm4gPSBvcHRpb25zLnVwZGF0ZSB8fCBVdGlscy5ub3AsXG4gICAgICAgIGZpcnN0Rm4gPSBvcHRpb25zLmZpcnN0IHx8IFV0aWxzLm5vcCxcbiAgICAgICAgY2FsbGJhY2tGbiA9IG9wdGlvbnMuY2FsbGJhY2sgfHwgVXRpbHMubm9wLFxuICAgICAgICB0aW1lID0gb3B0aW9ucy50aW1lIHx8IDUsXG4gICAgICAgIG9wdGltaXplRm4gPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgICAgIF9sb2dnZXIuaW5mbygnQXN5bmMgb3B0aW1pemF0aW9uIGN5Y2xlIHN0YXJ0ZWQnKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBwYXRoIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZCwgc3RhcnQgdGhlIHJvdXRpbmcgb3ZlclxuICAgICAgICAgICAgaWYgKCFzZWxmLmNvbXBsZXRlbHlDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBfbG9nZ2VyLmluZm8oJ0FzeW5jIG9wdGltaXphdGlvbiBpbnRlcnJ1cHRlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXRUaW1lb3V0KHN0YXJ0Um91dGluZywgdGltZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVwZGF0ZUZuKHNlbGYucGF0aHMpO1xuICAgICAgICAgICAgaWYgKHN0YXRlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgX2xvZ2dlci5pbmZvKCdBc3luYyByb3V0aW5nIGZpbmlzaGVkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrRm4oc2VsZi5wYXRocyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gc2VsZi5fb3B0aW1pemUoc3RhdGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzZXRUaW1lb3V0KG9wdGltaXplRm4sIHRpbWUsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc3RhcnRSb3V0aW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgX2xvZ2dlci5pbmZvKCdBc3luYyByb3V0aW5nIHN0YXJ0ZWQnKTtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHtmaW5pc2hlZDogZmFsc2V9O1xuICAgICAgICAgICAgc2VsZi5fY29ubmVjdEFsbERpc2Nvbm5lY3RlZFBhdGhzKCk7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHRoZSBvcHRpbWl6YXRpb25cbiAgICAgICAgICAgIHNldFRpbWVvdXQob3B0aW1pemVGbiwgdGltZSwgc3RhdGUpO1xuICAgICAgICB9O1xuXG4gICAgX2xvZ2dlci5pbmZvKCdBc3luYyByb3V0aW5nIHRyaWdnZXJlZCcpO1xuICAgIC8vIENvbm5lY3QgYWxsIGRpc2Nvbm5lY3RlZCBwYXRocyB3aXRoIGEgc3RyYWlnaHQgbGluZVxuICAgIHZhciBkaXNjb25uZWN0ZWQgPSB0aGlzLl9xdWlja0Nvbm5lY3REaXNjb25uZWN0ZWRQYXRocygpO1xuICAgIGZpcnN0Rm4oZGlzY29ubmVjdGVkKTtcblxuICAgIHRoaXMuX2Rpc2Nvbm5lY3RUZW1wUGF0aHMoZGlzY29ubmVjdGVkKTtcblxuICAgIHNldFRpbWVvdXQoc3RhcnRSb3V0aW5nLCB0aW1lKTtcbn07XG5cbi8qKlxuICogQ29ubmVjdCBhbGwgZGlzY29ubmVjdGVkIHBhdGhzIGluIGEgcXVpY2sgd2F5IHdoaWxlIGEgYmV0dGVyIGxheW91dCBpc1xuICogYmVpbmcgY2FsY3VsYXRlZC5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheTxQYXRoPn0gZGlzY29ubmVjdGVkIHBhdGhzXG4gKi9cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX3F1aWNrQ29ubmVjdERpc2Nvbm5lY3RlZFBhdGhzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXRoLFxuICAgICAgICBkaXNjb25uZWN0ZWQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gdGhpcy5wYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgcGF0aCA9IHRoaXMucGF0aHNbaV07XG4gICAgICAgIGlmICghcGF0aC5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgICAgICBwYXRoLmNhbGN1bGF0ZVN0YXJ0RW5kUG9ydHMoKTtcbiAgICAgICAgICAgIHBhdGgucG9pbnRzID0gbmV3IEFyUG9pbnRMaXN0UGF0aChwYXRoLnN0YXJ0cG9pbnQsIHBhdGguZW5kcG9pbnQpO1xuICAgICAgICAgICAgZGlzY29ubmVjdGVkLnB1c2gocGF0aCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRpc2Nvbm5lY3RlZDtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Rpc2Nvbm5lY3RUZW1wUGF0aHMgPSBmdW5jdGlvbiAocGF0aHMpIHtcbiAgICBmb3IgKHZhciBpID0gcGF0aHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHBhdGhzW2ldLnBvaW50cyA9IG5ldyBBclBvaW50TGlzdFBhdGgoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFBlcmZvcm1zIG9uZSBzZXQgb2Ygb3B0aW1pemF0aW9ucy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnQgVGhpcyBzdG9yZXMgdGhlIG1heCBudW1iZXIgb2Ygb3B0aW1pemF0aW9ucyBhbGxvd2VkXG4gKiBAcGFyYW0ge051bWJlcn0gbGFzdCBUaGlzIHN0b3JlcyB0aGUgbGFzdCBvcHRpbWl6YXRpb24gdHlwZSBtYWRlXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGNvdW50LCBsYXN0IHZhbHVlc1xuICovXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLl9vcHRpbWl6ZSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIG1heE9wZXJhdGlvbnMgPSBvcHRpb25zLm1heE9wZXJhdGlvbnMgfHwgMTAwLFxuICAgICAgICBsYXN0ID0gb3B0aW9ucy5sYXN0IHx8IDAsXG4gICAgICAgIGRtID0gb3B0aW9ucy5kbSB8fCAxMCxcdFx0Ly8gbWF4ICMgb2YgZGlzdHJpYnV0aW9uIG9wXG4gICAgICAgIGQgPSBvcHRpb25zLmQgfHwgMCxcbiAgICAgICAgZ2V0U3RhdGUgPSBmdW5jdGlvbiAoZmluaXNoZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZmluaXNoZWQ6IGZpbmlzaGVkIHx8ICFtYXhPcGVyYXRpb25zLFxuICAgICAgICAgICAgICAgIG1heE9wZXJhdGlvbnM6IG1heE9wZXJhdGlvbnMsXG4gICAgICAgICAgICAgICAgbGFzdDogbGFzdCxcbiAgICAgICAgICAgICAgICBkbTogZG0sXG4gICAgICAgICAgICAgICAgZDogZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgIGlmIChtYXhPcGVyYXRpb25zID4gMCkge1xuXG4gICAgICAgIGlmIChsYXN0ID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RhdGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXhPcGVyYXRpb25zLS07XG4gICAgICAgIGlmICh0aGlzLl9zaW1wbGlmeVBhdGhzKCkpIHtcbiAgICAgICAgICAgIGxhc3QgPSAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1heE9wZXJhdGlvbnMgPiAwKSB7XG4gICAgICAgIGlmIChsYXN0ID09PSAyKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RhdGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXhPcGVyYXRpb25zLS07XG4gICAgICAgIGlmICh0aGlzLmhvcml6b250YWwuYmxvY2tTY2FuQmFja3dhcmQoKSkge1xuXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgbWF4T3BlcmF0aW9ucy0tO1xuICAgICAgICAgICAgfSB3aGlsZSAobWF4T3BlcmF0aW9ucyA+IDAgJiYgdGhpcy5ob3Jpem9udGFsLmJsb2NrU2NhbkJhY2t3YXJkKCkpO1xuXG4gICAgICAgICAgICBpZiAobGFzdCA8IDIgfHwgbGFzdCA+IDUpIHtcbiAgICAgICAgICAgICAgICBkID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKytkID49IGRtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFN0YXRlKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsYXN0ID0gMjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhPcGVyYXRpb25zID4gMCkge1xuICAgICAgICBpZiAobGFzdCA9PT0gMykge1xuICAgICAgICAgICAgcmV0dXJuIGdldFN0YXRlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF4T3BlcmF0aW9ucy0tO1xuICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsLmJsb2NrU2NhbkZvcndhcmQoKSkge1xuXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgbWF4T3BlcmF0aW9ucy0tO1xuICAgICAgICAgICAgfSB3aGlsZSAobWF4T3BlcmF0aW9ucyA+IDAgJiYgdGhpcy5ob3Jpem9udGFsLmJsb2NrU2NhbkZvcndhcmQoKSk7XG5cbiAgICAgICAgICAgIGlmIChsYXN0IDwgMiB8fCBsYXN0ID4gNSkge1xuICAgICAgICAgICAgICAgIGQgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgrK2QgPj0gZG0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0U3RhdGUodHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxhc3QgPSAzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1heE9wZXJhdGlvbnMgPiAwKSB7XG4gICAgICAgIGlmIChsYXN0ID09PSA0KSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RhdGUodHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXhPcGVyYXRpb25zLS07XG4gICAgICAgIGlmICh0aGlzLnZlcnRpY2FsLmJsb2NrU2NhbkJhY2t3YXJkKCkpIHtcbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICBtYXhPcGVyYXRpb25zLS07XG4gICAgICAgICAgICB9IHdoaWxlIChtYXhPcGVyYXRpb25zID4gMCAmJiB0aGlzLnZlcnRpY2FsLmJsb2NrU2NhbkJhY2t3YXJkKCkpO1xuXG4gICAgICAgICAgICBpZiAobGFzdCA8IDIgfHwgbGFzdCA+IDUpIHtcbiAgICAgICAgICAgICAgICBkID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKytkID49IGRtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFN0YXRlKHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsYXN0ID0gNDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhPcGVyYXRpb25zID4gMCkge1xuICAgICAgICBpZiAobGFzdCA9PT0gNSkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFN0YXRlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF4T3BlcmF0aW9ucy0tO1xuICAgICAgICBpZiAodGhpcy52ZXJ0aWNhbC5ibG9ja1NjYW5Gb3J3YXJkKCkpIHtcblxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIG1heE9wZXJhdGlvbnMtLTtcbiAgICAgICAgICAgIH0gd2hpbGUgKG1heE9wZXJhdGlvbnMgPiAwICYmIHRoaXMudmVydGljYWwuYmxvY2tTY2FuRm9yd2FyZCgpKTtcblxuICAgICAgICAgICAgaWYgKGxhc3QgPCAyIHx8IGxhc3QgPiA1KSB7XG4gICAgICAgICAgICAgICAgZCA9IDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCsrZCA+PSBkbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRTdGF0ZSh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGFzdCA9IDU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWF4T3BlcmF0aW9ucyA+IDApIHtcbiAgICAgICAgaWYgKGxhc3QgPT09IDYpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTdGF0ZSh0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heE9wZXJhdGlvbnMtLTtcbiAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbC5ibG9ja1N3aXRjaFdyb25ncygpKSB7XG4gICAgICAgICAgICBsYXN0ID0gNjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXhPcGVyYXRpb25zID4gMCkge1xuICAgICAgICBpZiAobGFzdCA9PT0gNykge1xuICAgICAgICAgICAgcmV0dXJuIGdldFN0YXRlKHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF4T3BlcmF0aW9ucy0tO1xuICAgICAgICBpZiAodGhpcy52ZXJ0aWNhbC5ibG9ja1N3aXRjaFdyb25ncygpKSB7XG4gICAgICAgICAgICBsYXN0ID0gNztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsYXN0ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBnZXRTdGF0ZSh0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZ2V0U3RhdGUoZmFsc2UpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5kZWxldGVQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICBhc3NlcnQocGF0aCAhPT0gbnVsbCwgJ0FSR3JhcGguZGVsZXRlUGF0aDogcGF0aCAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIGlmIChwYXRoLmhhc093bmVyKCkpIHtcbiAgICAgICAgYXNzZXJ0KHBhdGgub3duZXIgPT09IHRoaXMsICdBUkdyYXBoLmRlbGV0ZVBhdGg6IHBhdGgub3duZXIgPT09IHRoaXMgRkFJTEVEJyk7XG5cbiAgICAgICAgdGhpcy5kZWxldGVFZGdlcyhwYXRoKTtcbiAgICAgICAgcGF0aC5vd25lciA9IG51bGw7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMucGF0aHMuaW5kZXhPZihwYXRoKTtcblxuICAgICAgICBhc3NlcnQoaW5kZXggPiAtMSwgJ0FSR3JhcGgucmVtb3ZlOiBQYXRoIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgIHRoaXMucGF0aHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG5cbiAgICBwYXRoLmRlc3Ryb3koKTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoYWRkQmFja1NlbGZFZGdlcykge1xuICAgIHRoaXMuX2RlbGV0ZUFsbFBhdGhzKCk7XG4gICAgdGhpcy5fZGVsZXRlQWxsQm94ZXMoKTtcbiAgICB0aGlzLl9kZWxldGVBbGxFZGdlcygpO1xuICAgIGlmIChhZGRCYWNrU2VsZkVkZ2VzKSB7XG4gICAgICAgIHRoaXMuX2FkZFNlbGZFZGdlcygpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuYWRkUGF0aCA9IGZ1bmN0aW9uIChpc0F1dG9Sb3V0ZWQsIHN0YXJ0cG9ydHMsIGVuZHBvcnRzKSB7XG4gICAgdmFyIHBhdGggPSBuZXcgQXV0b1JvdXRlclBhdGgoKTtcblxuICAgIHBhdGguc2V0QXV0b1JvdXRpbmcoaXNBdXRvUm91dGVkKTtcbiAgICBwYXRoLnNldFN0YXJ0UG9ydHMoc3RhcnRwb3J0cyk7XG4gICAgcGF0aC5zZXRFbmRQb3J0cyhlbmRwb3J0cyk7XG4gICAgdGhpcy5fYWRkKHBhdGgpO1xuXG4gICAgcmV0dXJuIHBhdGg7XG59O1xuXG5BdXRvUm91dGVyR3JhcGgucHJvdG90eXBlLmlzRWRnZUZpeGVkID0gZnVuY3Rpb24gKHBhdGgsIHN0YXJ0cG9pbnQsIGVuZHBvaW50KSB7XG4gICAgdmFyIGQgPSBVdGlscy5nZXREaXIoZW5kcG9pbnQubWludXMoc3RhcnRwb2ludCkpLFxuICAgICAgICBoID0gVXRpbHMuaXNIb3Jpem9udGFsKGQpLFxuXG4gICAgICAgIGVsaXN0ID0gdGhpcy5fZ2V0RWRnZUxpc3QoaCksXG5cbiAgICAgICAgZWRnZSA9IGVsaXN0LmdldEVkZ2UocGF0aCwgc3RhcnRwb2ludCwgZW5kcG9pbnQpO1xuICAgIGlmIChlZGdlICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBlZGdlLmdldEVkZ2VGaXhlZCgpICYmICFlZGdlLmdldEVkZ2VDdXN0b21GaXhlZCgpO1xuICAgIH1cblxuICAgIGFzc2VydChmYWxzZSwgJ0FSR3JhcGguaXNFZGdlRml4ZWQ6IEZBSUxFRCcpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZGVsZXRlQWxsKGZhbHNlKTtcblxuICAgIHRoaXMuaG9yaXpvbnRhbC5TZXRPd25lcihudWxsKTtcbiAgICB0aGlzLnZlcnRpY2FsLlNldE93bmVyKG51bGwpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5hc3NlcnRWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWRzID0gT2JqZWN0LmtleXModGhpcy5ib3hlcyksXG4gICAgICAgIGk7XG5cbiAgICBmb3IgKGkgPSB0aGlzLmJveGVzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLmFzc2VydFZhbGlkQm94KHRoaXMuYm94ZXNbaWRzW2ldXSk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gdGhpcy5wYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdGhpcy5fYXNzZXJ0VmFsaWRQYXRoKHRoaXMucGF0aHNbaV0pO1xuICAgIH1cblxuICAgIHRoaXMuaG9yaXpvbnRhbC5hc3NlcnRWYWxpZCgpO1xuICAgIHRoaXMudmVydGljYWwuYXNzZXJ0VmFsaWQoKTtcbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuYXNzZXJ0VmFsaWRCb3ggPSBmdW5jdGlvbiAoYm94KSB7XG4gICAgYm94LmFzc2VydFZhbGlkKCk7XG4gICAgYXNzZXJ0KGJveC5vd25lciA9PT0gdGhpcyxcbiAgICAgICAgJ0FSR3JhcGguYXNzZXJ0VmFsaWRCb3g6IGJveC5vd25lciA9PT0gdGhpcyBGQUlMRUQnKTtcbiAgICBhc3NlcnQodGhpcy5ib3hlc1tib3guaWRdICE9PSB1bmRlZmluZWQsXG4gICAgICAgICdBUkdyYXBoLmFzc2VydFZhbGlkQm94OiB0aGlzLmJveGVzW2JveC5pZF0gIT09IHVuZGVmaW5lZCBGQUlMRUQnKTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBib3ggKGFuZCBwb3J0KSBlZGdlcyBhcmUgb24gdGhlIGdyYXBoXG4gICAgYXNzZXJ0KHRoaXMuX2NvbnRhaW5zUmVjdEVkZ2VzKGJveC5yZWN0KSxcbiAgICAgICAgJ0dyYXBoIGRvZXMgbm90IGNvbnRhaW4gZWRnZXMgZm9yIGJveCAnICsgYm94LmlkKTtcblxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5fY29udGFpbnNSZWN0RWRnZXMgPSBmdW5jdGlvbiAocmVjdCkge1xuICAgIHZhciB0b3BMZWZ0ID0gcmVjdC5nZXRUb3BMZWZ0KCksXG4gICAgICAgIGJvdHRvbVJpZ2h0ID0gcmVjdC5nZXRCb3R0b21SaWdodCgpLFxuICAgICAgICBwb2ludHMgPSBbXSxcbiAgICAgICAgcmVzdWx0ID0gdHJ1ZSxcbiAgICAgICAgbGVuLFxuICAgICAgICBzdGFydCxcbiAgICAgICAgZW5kO1xuXG4gICAgcG9pbnRzLnB1c2godG9wTGVmdCk7XG4gICAgcG9pbnRzLnB1c2gobmV3IEFyUG9pbnQoYm90dG9tUmlnaHQueCwgdG9wTGVmdC55KSk7ICAvLyB0b3AgcmlnaHRcbiAgICBwb2ludHMucHVzaChib3R0b21SaWdodCk7XG4gICAgcG9pbnRzLnB1c2gobmV3IEFyUG9pbnQodG9wTGVmdC54LCBib3R0b21SaWdodC55KSk7ICAvLyBib3R0b20gbGVmdFxuXG4gICAgbGVuID0gcG9pbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHN0YXJ0ID0gcG9pbnRzW2ldO1xuICAgICAgICBlbmQgPSBwb2ludHNbKGkgKyAxKSAlIGxlbl07XG4gICAgICAgIHJlc3VsdCA9IHJlc3VsdCAmJiB0aGlzLl9jb250YWluc0VkZ2Uoc3RhcnQsIGVuZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVGhpcyBjaGVja3MgZm9yIGFuIGVkZ2Ugd2l0aCB0aGUgZ2l2ZW4gc3RhcnQvZW5kIHBvaW50cy4gVGhpcyB3aWxsIG9ubHlcbiAqIHdvcmsgZm9yIGZpeGVkIGVkZ2VzIHN1Y2ggYXMgYm94ZXMgb3IgcG9ydHMuXG4gKlxuICogQHBhcmFtIHN0YXJ0XG4gKiBAcGFyYW0gZW5kXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9XG4gKi9cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2NvbnRhaW5zRWRnZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgdmFyIGRpcjtcblxuICAgIGRpciA9IFV0aWxzLmdldERpcihzdGFydC5taW51cyhlbmQpKTtcbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGRpciksXG4gICAgICAgICdFZGdlIGlzIGludmFsaWQ6ICcgKyBVdGlscy5zdHJpbmdpZnkoc3RhcnQpICsgJyBhbmQgJyArIFV0aWxzLnN0cmluZ2lmeShlbmQpKTtcblxuICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZGlyKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5ob3Jpem9udGFsLmNvbnRhaW5zKHN0YXJ0LCBlbmQpIHx8IHRoaXMuaG9yaXpvbnRhbC5jb250YWlucyhlbmQsIHN0YXJ0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy52ZXJ0aWNhbC5jb250YWlucyhzdGFydCwgZW5kKSB8fCB0aGlzLnZlcnRpY2FsLmNvbnRhaW5zKGVuZCwgc3RhcnQpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJHcmFwaC5wcm90b3R5cGUuX2Fzc2VydFZhbGlkUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgYXNzZXJ0KHBhdGgub3duZXIgPT09IHRoaXMsXG4gICAgICAgICdBUkdyYXBoLmFzc2VydFZhbGlkQm94OiBib3gub3duZXIgPT09IHRoaXMgRkFJTEVEJyk7XG4gICAgcGF0aC5hc3NlcnRWYWxpZCgpO1xufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5kdW1wUGF0aHMgPSBmdW5jdGlvbiAocG9zLCBjKSB7XG4gICAgX2xvZ2dlci5kZWJ1ZygnUGF0aHMgZHVtcCBwb3MgJyArIHBvcyArICcsIGMgJyArIGMpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnBhdGhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIF9sb2dnZXIuZGVidWcoaSArICcuIFBhdGg6ICcpO1xuICAgICAgICB0aGlzLnBhdGhzW2ldLmdldFBvaW50TGlzdCgpLmR1bXBQb2ludHMoJ0R1bXBQYXRocycpO1xuICAgIH1cblxufTtcblxuQXV0b1JvdXRlckdyYXBoLnByb3RvdHlwZS5kdW1wRWRnZUxpc3RzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaG9yaXpvbnRhbC5kdW1wRWRnZXMoJ0hvcml6b250YWwgZWRnZXM6Jyk7XG4gICAgdGhpcy52ZXJ0aWNhbC5kdW1wRWRnZXMoJ1ZlcnRpY2FsIGVkZ2VzOicpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRvUm91dGVyR3JhcGg7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpLFxuICAgIExFVkVMUyA9IFsnd2FybicsICdkZWJ1ZycsICdpbmZvJ107XG5cbnZhciBMb2dnZXIgPSBmdW5jdGlvbihuYW1lKXtcbiAgICBmb3IgKHZhciBpID0gTEVWRUxTLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzW0xFVkVMU1tpXV0gPSBkZWJ1ZyhuYW1lICsgJzonICsgTEVWRUxTW2ldKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvZ2dlcjtcbiIsIi8qZ2xvYmFscyBkZWZpbmUqL1xuLypqc2hpbnQgYnJvd3NlcjogdHJ1ZSwgYml0d2lzZTogZmFsc2UqL1xuXG4vKipcbiAqIEBhdXRob3IgYnJvbGxiIC8gaHR0cHM6Ly9naXRodWIvYnJvbGxiXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgQ09OU1RBTlRTID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkNvbnN0YW50cycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlV0aWxzJyksXG4gICAgQXJQb2ludCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb2ludCcpLFxuICAgIEFyUmVjdCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5SZWN0JyksXG4gICAgQXJQb2ludExpc3RQYXRoID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBvaW50TGlzdCcpO1xuXG4vLyBBdXRvUm91dGVyUGF0aFxudmFyIEF1dG9Sb3V0ZXJQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaWQgPSAnTm9uZSc7XG4gICAgdGhpcy5vd25lciA9IG51bGw7XG4gICAgdGhpcy5zdGFydHBvaW50ID0gbnVsbDtcbiAgICB0aGlzLmVuZHBvaW50ID0gbnVsbDtcbiAgICB0aGlzLnN0YXJ0cG9ydHMgPSBudWxsO1xuICAgIHRoaXMuZW5kcG9ydHMgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRwb3J0ID0gbnVsbDtcbiAgICB0aGlzLmVuZHBvcnQgPSBudWxsO1xuICAgIHRoaXMuYXR0cmlidXRlcyA9IENPTlNUQU5UUy5QYXRoRGVmYXVsdDtcbiAgICB0aGlzLnN0YXRlID0gQ09OU1RBTlRTLlBhdGhTdGF0ZURlZmF1bHQ7XG4gICAgdGhpcy5pc0F1dG9Sb3V0aW5nT24gPSB0cnVlO1xuICAgIHRoaXMuY3VzdG9tUGF0aERhdGEgPSBbXTtcbiAgICB0aGlzLmN1c3RvbWl6YXRpb25UeXBlID0gJ1BvaW50cyc7XG4gICAgdGhpcy5wYXRoRGF0YVRvRGVsZXRlID0gW107XG4gICAgdGhpcy5wb2ludHMgPSBuZXcgQXJQb2ludExpc3RQYXRoKCk7XG59O1xuXG5cbi8vLS0tLVBvaW50c1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuaGFzT3duZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXIgIT09IG51bGw7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuc2V0U3RhcnRQb3J0cyA9IGZ1bmN0aW9uIChuZXdQb3J0cykge1xuICAgIHRoaXMuc3RhcnRwb3J0cyA9IG5ld1BvcnRzO1xuXG4gICAgaWYgKHRoaXMuc3RhcnRwb3J0KSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlU3RhcnRQb3J0cygpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5zZXRFbmRQb3J0cyA9IGZ1bmN0aW9uIChuZXdQb3J0cykge1xuICAgIHRoaXMuZW5kcG9ydHMgPSBuZXdQb3J0cztcblxuICAgIGlmICh0aGlzLmVuZHBvcnQpIHtcbiAgICAgICAgdGhpcy5jYWxjdWxhdGVFbmRQb3J0cygpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5jbGVhclBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHJlbW92ZSB0aGUgc3RhcnQvZW5kcG9pbnRzIGZyb20gdGhlIGdpdmVuIHBvcnRzXG4gICAgaWYgKHRoaXMuc3RhcnRwb2ludCkge1xuICAgICAgICB0aGlzLnN0YXJ0cG9ydC5yZW1vdmVQb2ludCh0aGlzLnN0YXJ0cG9pbnQpO1xuICAgICAgICB0aGlzLnN0YXJ0cG9pbnQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbmRwb2ludCkge1xuICAgICAgICB0aGlzLmVuZHBvcnQucmVtb3ZlUG9pbnQodGhpcy5lbmRwb2ludCk7XG4gICAgICAgIHRoaXMuZW5kcG9pbnQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLnN0YXJ0cG9ydCA9IG51bGw7XG4gICAgdGhpcy5lbmRwb3J0ID0gbnVsbDtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5nZXRTdGFydFBvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgYXNzZXJ0KHRoaXMuc3RhcnRwb3J0cy5sZW5ndGgsIFxuICAgICAgICAnQVJQb3J0LmdldFN0YXJ0UG9ydDogQ2FuXFwndCByZXRyaWV2ZSBzdGFydCBwb3J0LiBmcm9tICcrdGhpcy5pZCk7XG5cbiAgICBpZiAoIXRoaXMuc3RhcnRwb3J0KSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlU3RhcnRQb3J0cygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGFydHBvcnQ7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuZ2V0RW5kUG9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBhc3NlcnQodGhpcy5lbmRwb3J0cy5sZW5ndGgsIFxuICAgICAgICAnQVJQb3J0LmdldEVuZFBvcnQ6IENhblxcJ3QgcmV0cmlldmUgZW5kIHBvcnQgZnJvbSAnK3RoaXMuaWQpO1xuICAgIGlmICghdGhpcy5lbmRwb3J0KSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlRW5kUG9ydHMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW5kcG9ydDtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHBvcnQgZnJvbSBzdGFydC9lbmQgcG9ydCBsaXN0cy5cbiAqXG4gKiBAcGFyYW0gcG9ydFxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUucmVtb3ZlUG9ydCA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgdmFyIHJlbW92ZWQgPSBVdGlscy5yZW1vdmVGcm9tQXJyYXlzKHBvcnQsIHRoaXMuc3RhcnRwb3J0cywgdGhpcy5lbmRwb3J0cyk7XG4gICAgYXNzZXJ0KHJlbW92ZWQsICdQb3J0IHdhcyBub3QgcmVtb3ZlZCBmcm9tIHBhdGggc3RhcnQvZW5kIHBvcnRzJyk7XG5cbiAgICAvLyBJZiBubyBtb3JlIHN0YXJ0L2VuZCBwb3J0cywgcmVtb3ZlIHRoZSBwYXRoXG4gICAgLy8gYXNzZXJ0KHRoaXMuc3RhcnRwb3J0cy5sZW5ndGggJiYgdGhpcy5lbmRwb3J0cy5sZW5ndGgsICdSZW1vdmVkIGFsbCBzdGFydC9lbmRwb3J0cyBvZiBwYXRoICcgKyB0aGlzLmlkKTtcbiAgICB0aGlzLm93bmVyLmRpc2Nvbm5lY3QodGhpcyk7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuY2FsY3VsYXRlU3RhcnRFbmRQb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge3NyYzogdGhpcy5jYWxjdWxhdGVTdGFydFBvcnRzKCksIGRzdDogdGhpcy5jYWxjdWxhdGVFbmRQb3J0cygpfTtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5jYWxjdWxhdGVTdGFydFBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzcmNQb3J0cyA9IFtdLFxuICAgICAgICB0Z3QsXG4gICAgICAgIGk7XG5cbiAgICBhc3NlcnQodGhpcy5zdGFydHBvcnRzLmxlbmd0aCA+IDAsICdBclBhdGguY2FsY3VsYXRlU3RhcnRFbmRQb3J0czogdGhpcy5zdGFydHBvcnRzIGNhbm5vdCBiZSBlbXB0eSEnKTtcblxuICAgIC8vUmVtb3ZlIHRoaXMuc3RhcnRwb2ludFxuICAgIGlmICh0aGlzLnN0YXJ0cG9ydCAmJiB0aGlzLnN0YXJ0cG9ydC5oYXNQb2ludCh0aGlzLnN0YXJ0cG9pbnQpKSB7XG4gICAgICAgIHRoaXMuc3RhcnRwb3J0LnJlbW92ZVBvaW50KHRoaXMuc3RhcnRwb2ludCk7XG4gICAgfVxuXG4gICAgLy9HZXQgYXZhaWxhYmxlIHBvcnRzXG4gICAgZm9yIChpID0gdGhpcy5zdGFydHBvcnRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICBhc3NlcnQodGhpcy5zdGFydHBvcnRzW2ldLm93bmVyLFxuICAgICAgICAgICAgJ0FSUGF0aC5jYWxjdWxhdGVTdGFydEVuZFBvcnRzOiBwb3J0ICcgKyB0aGlzLnN0YXJ0cG9ydHNbaV0uaWQgKyAnIGhhcyBpbnZhbGlkIHRoaXMub3duZXIhJyk7XG4gICAgICAgIGlmICh0aGlzLnN0YXJ0cG9ydHNbaV0uaXNBdmFpbGFibGUoKSkge1xuICAgICAgICAgICAgc3JjUG9ydHMucHVzaCh0aGlzLnN0YXJ0cG9ydHNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNyY1BvcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzcmNQb3J0cyA9IHRoaXMuc3RhcnRwb3J0cztcbiAgICB9XG5cbiAgICAvL1ByZXZlbnRpbmcgc2FtZSBzdGFydC9lbmRwb3J0XG4gICAgaWYgKHRoaXMuZW5kcG9ydCAmJiBzcmNQb3J0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGkgPSBzcmNQb3J0cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGlmIChzcmNQb3J0c1tpXSA9PT0gdGhpcy5lbmRwb3J0KSB7XG4gICAgICAgICAgICAgICAgc3JjUG9ydHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBHZXR0aW5nIHRhcmdldFxuICAgIGlmICh0aGlzLmlzQXV0b1JvdXRlZCgpKSB7XG4gICAgICAgIHZhciBhY2N1bXVsYXRlUG9ydENlbnRlcnMgPSBmdW5jdGlvbiAocHJldiwgY3VycmVudCkge1xuICAgICAgICAgICAgdmFyIGNlbnRlciA9IGN1cnJlbnQucmVjdC5nZXRDZW50ZXIoKTtcbiAgICAgICAgICAgIHByZXYueCArPSBjZW50ZXIueDtcbiAgICAgICAgICAgIHByZXYueSArPSBjZW50ZXIueTtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9O1xuICAgICAgICB0Z3QgPSB0aGlzLmVuZHBvcnRzLnJlZHVjZShhY2N1bXVsYXRlUG9ydENlbnRlcnMsIG5ldyBBclBvaW50KDAsIDApKTtcblxuICAgICAgICB0Z3QueCAvPSB0aGlzLmVuZHBvcnRzLmxlbmd0aDtcbiAgICAgICAgdGd0LnkgLz0gdGhpcy5lbmRwb3J0cy5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGd0ID0gdGhpcy5jdXN0b21QYXRoRGF0YVswXTtcbiAgICB9XG4gICAgLy8gR2V0IHRoZSBvcHRpbWFsIHBvcnQgdG8gdGhlIHRhcmdldFxuICAgIHRoaXMuc3RhcnRwb3J0ID0gVXRpbHMuZ2V0T3B0aW1hbFBvcnRzKHNyY1BvcnRzLCB0Z3QpO1xuXG4gICAgLy8gQ3JlYXRlIGEgdGhpcy5zdGFydHBvaW50IGF0IHRoZSBwb3J0XG4gICAgdmFyIHN0YXJ0ZGlyID0gdGhpcy5nZXRTdGFydERpcigpLFxuICAgICAgICBzdGFydHBvcnRIYXNMaW1pdGVkID0gZmFsc2UsXG4gICAgICAgIHN0YXJ0cG9ydENhbkhhdmUgPSB0cnVlO1xuXG4gICAgaWYgKHN0YXJ0ZGlyICE9PSBDT05TVEFOVFMuRGlyTm9uZSkge1xuICAgICAgICBzdGFydHBvcnRIYXNMaW1pdGVkID0gdGhpcy5zdGFydHBvcnQuaGFzTGltaXRlZERpcnMoKTtcbiAgICAgICAgc3RhcnRwb3J0Q2FuSGF2ZSA9IHRoaXMuc3RhcnRwb3J0LmNhbkhhdmVTdGFydEVuZFBvaW50T24oc3RhcnRkaXIsIHRydWUpO1xuICAgIH1cbiAgICBpZiAoc3RhcnRkaXIgPT09IENPTlNUQU5UUy5EaXJOb25lIHx8XHRcdFx0XHRcdFx0XHQvLyByZWNhbGMgc3RhcnRkaXIgaWYgZW1wdHlcbiAgICAgICAgc3RhcnRwb3J0SGFzTGltaXRlZCAmJiAhc3RhcnRwb3J0Q2FuSGF2ZSkge1x0XHQvLyBvciBpcyBsaW1pdGVkIGFuZCB1c2VycHJlZiBpcyBpbnZhbGlkXG4gICAgICAgIHN0YXJ0ZGlyID0gdGhpcy5zdGFydHBvcnQuZ2V0U3RhcnRFbmREaXJUbyh0Z3QsIHRydWUpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRwb2ludCA9IHRoaXMuc3RhcnRwb3J0LmNyZWF0ZVN0YXJ0RW5kUG9pbnRUbyh0Z3QsIHN0YXJ0ZGlyKTtcbiAgICB0aGlzLnN0YXJ0cG9pbnQub3duZXIgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLnN0YXJ0cG9ydDtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5jYWxjdWxhdGVFbmRQb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZHN0UG9ydHMgPSBbXSxcbiAgICAgICAgdGd0LFxuICAgICAgICBpID0gdGhpcy5lbmRwb3J0cy5sZW5ndGg7XG5cbiAgICBhc3NlcnQodGhpcy5lbmRwb3J0cy5sZW5ndGggPiAwLCAnQXJQYXRoLmNhbGN1bGF0ZVN0YXJ0RW5kUG9ydHM6IHRoaXMuZW5kcG9ydHMgY2Fubm90IGJlIGVtcHR5IScpO1xuXG4gICAgLy9SZW1vdmUgb2xkIHRoaXMuZW5kcG9pbnRcbiAgICBpZiAodGhpcy5lbmRwb3J0ICYmIHRoaXMuZW5kcG9ydC5oYXNQb2ludCh0aGlzLmVuZHBvaW50KSkge1xuICAgICAgICB0aGlzLmVuZHBvcnQucmVtb3ZlUG9pbnQodGhpcy5lbmRwb2ludCk7XG4gICAgfVxuXG4gICAgLy9HZXQgYXZhaWxhYmxlIHBvcnRzXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBhc3NlcnQodGhpcy5lbmRwb3J0c1tpXS5vd25lciwgJ0FSUGF0aC5jYWxjdWxhdGVTdGFydEVuZFBvcnRzOiB0aGlzLmVuZHBvcnQgaGFzIGludmFsaWQgdGhpcy5vd25lciEnKTtcbiAgICAgICAgaWYgKHRoaXMuZW5kcG9ydHNbaV0uaXNBdmFpbGFibGUoKSkge1xuICAgICAgICAgICAgZHN0UG9ydHMucHVzaCh0aGlzLmVuZHBvcnRzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkc3RQb3J0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZHN0UG9ydHMgPSB0aGlzLmVuZHBvcnRzO1xuICAgIH1cblxuICAgIC8vUHJldmVudGluZyBzYW1lIHN0YXJ0L3RoaXMuZW5kcG9ydFxuICAgIGlmICh0aGlzLnN0YXJ0cG9ydCAmJiBkc3RQb3J0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGkgPSBkc3RQb3J0cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGlmIChkc3RQb3J0c1tpXSA9PT0gdGhpcy5zdGFydHBvcnQpIHtcbiAgICAgICAgICAgICAgICBkc3RQb3J0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL0dldHRpbmcgdGFyZ2V0XG4gICAgaWYgKHRoaXMuaXNBdXRvUm91dGVkKCkpIHtcblxuICAgICAgICB2YXIgYWNjdW11bGF0ZVBvcnRDZW50ZXJzID0gZnVuY3Rpb24gKHByZXYsIGN1cnJlbnQpIHtcbiAgICAgICAgICAgIHZhciBjZW50ZXIgPSBjdXJyZW50LnJlY3QuZ2V0Q2VudGVyKCk7XG4gICAgICAgICAgICBwcmV2LnggKz0gY2VudGVyLng7XG4gICAgICAgICAgICBwcmV2LnkgKz0gY2VudGVyLnk7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfTtcbiAgICAgICAgdGd0ID0gdGhpcy5zdGFydHBvcnRzLnJlZHVjZShhY2N1bXVsYXRlUG9ydENlbnRlcnMsIG5ldyBBclBvaW50KDAsIDApKTtcblxuICAgICAgICB0Z3QueCAvPSB0aGlzLnN0YXJ0cG9ydHMubGVuZ3RoO1xuICAgICAgICB0Z3QueSAvPSB0aGlzLnN0YXJ0cG9ydHMubGVuZ3RoO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGd0ID0gdGhpcy5jdXN0b21QYXRoRGF0YVt0aGlzLmN1c3RvbVBhdGhEYXRhLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIC8vR2V0IHRoZSBvcHRpbWFsIHBvcnQgdG8gdGhlIHRhcmdldFxuICAgIHRoaXMuZW5kcG9ydCA9IFV0aWxzLmdldE9wdGltYWxQb3J0cyhkc3RQb3J0cywgdGd0KTtcblxuICAgIC8vQ3JlYXRlIHRoaXMuZW5kcG9pbnQgYXQgdGhlIHBvcnRcbiAgICB2YXIgZW5kZGlyID0gdGhpcy5nZXRFbmREaXIoKSxcbiAgICAgICAgc3RhcnRkaXIgPSB0aGlzLmdldFN0YXJ0RGlyKCksXG4gICAgICAgIGVuZHBvcnRIYXNMaW1pdGVkID0gZmFsc2UsXG4gICAgICAgIGVuZHBvcnRDYW5IYXZlID0gdHJ1ZTtcblxuICAgIGlmIChlbmRkaXIgIT09IENPTlNUQU5UUy5EaXJOb25lKSB7XG4gICAgICAgIGVuZHBvcnRIYXNMaW1pdGVkID0gdGhpcy5lbmRwb3J0Lmhhc0xpbWl0ZWREaXJzKCk7XG4gICAgICAgIGVuZHBvcnRDYW5IYXZlID0gdGhpcy5lbmRwb3J0LmNhbkhhdmVTdGFydEVuZFBvaW50T24oZW5kZGlyLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmIChlbmRkaXIgPT09IENPTlNUQU5UUy5EaXJOb25lIHx8ICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxpa2UgYWJvdmVcbiAgICAgICAgZW5kcG9ydEhhc0xpbWl0ZWQgJiYgIWVuZHBvcnRDYW5IYXZlKSB7XG4gICAgICAgIGVuZGRpciA9IHRoaXMuZW5kcG9ydC5nZXRTdGFydEVuZERpclRvKHRndCwgZmFsc2UsIHRoaXMuc3RhcnRwb3J0ID09PSB0aGlzLmVuZHBvcnQgP1xuICAgICAgICAgICAgc3RhcnRkaXIgOiBDT05TVEFOVFMuRGlyTm9uZSk7XG4gICAgfVxuXG4gICAgdGhpcy5lbmRwb2ludCA9IHRoaXMuZW5kcG9ydC5jcmVhdGVTdGFydEVuZFBvaW50VG8odGd0LCBlbmRkaXIpO1xuICAgIHRoaXMuZW5kcG9pbnQub3duZXIgPSB0aGlzO1xuICAgIHJldHVybiB0aGlzLmVuZHBvcnQ7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuaXNDb25uZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLnN0YXRlICYgQ09OU1RBTlRTLlBhdGhTdGF0ZUNvbm5lY3RlZCkgIT09IDA7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuYWRkVGFpbCA9IGZ1bmN0aW9uIChwdCkge1xuICAgIGFzc2VydCghdGhpcy5pc0Nvbm5lY3RlZCgpLFxuICAgICAgICAnQVJQYXRoLmFkZFRhaWw6ICF0aGlzLmlzQ29ubmVjdGVkKCkgRkFJTEVEJyk7XG4gICAgdGhpcy5wb2ludHMucHVzaChwdCk7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuZGVsZXRlQWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucG9pbnRzID0gbmV3IEFyUG9pbnRMaXN0UGF0aCgpO1xuICAgIHRoaXMuc3RhdGUgPSBDT05TVEFOVFMuUGF0aFN0YXRlRGVmYXVsdDtcbiAgICB0aGlzLmNsZWFyUG9ydHMoKTtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5nZXRTdGFydEJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcG9ydCA9IHRoaXMuc3RhcnRwb3J0IHx8IHRoaXMuc3RhcnRwb3J0c1swXTtcbiAgICByZXR1cm4gcG9ydC5vd25lci5nZXRSb290Qm94KCk7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuZ2V0RW5kQm94ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3J0ID0gdGhpcy5lbmRwb3J0IHx8IHRoaXMuZW5kcG9ydHNbMF07XG4gICAgcmV0dXJuIHBvcnQub3duZXIuZ2V0Um9vdEJveCgpO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmdldE91dE9mQm94U3RhcnRQb2ludCA9IGZ1bmN0aW9uIChoaW50RGlyKSB7XG4gICAgdmFyIHN0YXJ0Qm94UmVjdCA9IHRoaXMuZ2V0U3RhcnRCb3goKTtcblxuICAgIGFzc2VydChoaW50RGlyICE9PSBDT05TVEFOVFMuRGlyU2tldywgJ0FSUGF0aC5nZXRPdXRPZkJveFN0YXJ0UG9pbnQ6IGhpbnREaXIgIT09IENPTlNUQU5UUy5EaXJTa2V3IEZBSUxFRCcpO1xuICAgIGFzc2VydCh0aGlzLnBvaW50cy5sZW5ndGggPj0gMiwgJ0FSUGF0aC5nZXRPdXRPZkJveFN0YXJ0UG9pbnQ6IHRoaXMucG9pbnRzLmxlbmd0aCA+PSAyIEZBSUxFRCcpO1xuXG4gICAgdmFyIHBvcyA9IDAsXG4gICAgICAgIHAgPSBuZXcgQXJQb2ludCh0aGlzLnBvaW50c1twb3MrK10pLFxuICAgICAgICBkID0gVXRpbHMuZ2V0RGlyKHRoaXMucG9pbnRzW3Bvc10ubWludXMocCkpO1xuXG4gICAgaWYgKGQgPT09IENPTlNUQU5UUy5EaXJTa2V3KSB7XG4gICAgICAgIGQgPSBoaW50RGlyO1xuICAgIH1cbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGQpLCAnQVJQYXRoLmdldE91dE9mQm94U3RhcnRQb2ludDogVXRpbHMuaXNSaWdodEFuZ2xlIChkKSBGQUlMRUQnKTtcblxuICAgIGlmIChVdGlscy5pc0hvcml6b250YWwoZCkpIHtcbiAgICAgICAgcC54ID0gVXRpbHMuZ2V0UmVjdE91dGVyQ29vcmQoc3RhcnRCb3hSZWN0LCBkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwLnkgPSBVdGlscy5nZXRSZWN0T3V0ZXJDb29yZChzdGFydEJveFJlY3QsIGQpO1xuICAgIH1cblxuICAgIC8vYXNzZXJ0KFV0aWxzLmdldERpciAodGhpcy5wb2ludHNbcG9zXS5taW51cyhwKSkgPT09IFV0aWxzLnJldmVyc2VEaXIgKCBkICkgfHxcbiAgICAvLyBVdGlscy5nZXREaXIgKHRoaXMucG9pbnRzW3Bvc10ubWludXMocCkpID09PSBkLCAnVXRpbHMuZ2V0RGlyICh0aGlzLnBvaW50c1twb3NdLm1pbnVzKHApKSA9PT1cbiAgICAvLyBVdGlscy5yZXZlcnNlRGlyICggZCApIHx8IFV0aWxzLmdldERpciAodGhpcy5wb2ludHNbcG9zXS5taW51cyhwKSkgPT09IGQgRkFJTEVEJyk7XG5cbiAgICByZXR1cm4gcDtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5nZXRPdXRPZkJveEVuZFBvaW50ID0gZnVuY3Rpb24gKGhpbnREaXIpIHtcbiAgICB2YXIgZW5kQm94UmVjdCA9IHRoaXMuZ2V0RW5kQm94KCk7XG5cbiAgICBhc3NlcnQoaGludERpciAhPT0gQ09OU1RBTlRTLkRpclNrZXcsICdBUlBhdGguZ2V0T3V0T2ZCb3hFbmRQb2ludDogaGludERpciAhPT0gQ09OU1RBTlRTLkRpclNrZXcgRkFJTEVEJyk7XG4gICAgYXNzZXJ0KHRoaXMucG9pbnRzLmxlbmd0aCA+PSAyLCAnQVJQYXRoLmdldE91dE9mQm94RW5kUG9pbnQ6IHRoaXMucG9pbnRzLmxlbmd0aCA+PSAyIEZBSUxFRCcpO1xuXG4gICAgdmFyIHBvcyA9IHRoaXMucG9pbnRzLmxlbmd0aCAtIDEsXG4gICAgICAgIHAgPSBuZXcgQXJQb2ludCh0aGlzLnBvaW50c1twb3MtLV0pLFxuICAgICAgICBkID0gVXRpbHMuZ2V0RGlyKHRoaXMucG9pbnRzW3Bvc10ubWludXMocCkpO1xuXG4gICAgaWYgKGQgPT09IENPTlNUQU5UUy5EaXJTa2V3KSB7XG4gICAgICAgIGQgPSBoaW50RGlyO1xuICAgIH1cbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKGQpLCAnQVJQYXRoLmdldE91dE9mQm94RW5kUG9pbnQ6IFV0aWxzLmlzUmlnaHRBbmdsZSAoZCkgRkFJTEVEJyk7XG5cbiAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKGQpKSB7XG4gICAgICAgIHAueCA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGVuZEJveFJlY3QsIGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHAueSA9IFV0aWxzLmdldFJlY3RPdXRlckNvb3JkKGVuZEJveFJlY3QsIGQpO1xuICAgIH1cblxuICAgIC8vYXNzZXJ0KFV0aWxzLmdldERpciAodGhpcy5wb2ludHNbcG9zXS5taW51cyhwKSkgPT09IFV0aWxzLnJldmVyc2VEaXIgKCBkICkgfHxcbiAgICAvLyBVdGlscy5nZXREaXIgKHRoaXMucG9pbnRzW3Bvc10ubWludXMocCkpID09PSBkLCAnQVJQYXRoLmdldE91dE9mQm94RW5kUG9pbnQ6IFV0aWxzLmdldERpclxuICAgIC8vICh0aGlzLnBvaW50c1twb3NdLm1pbnVzKHApKSA9PT0gZCB8fCBVdGlscy5nZXREaXIgKHRoaXMucG9pbnRzW3Bvc10ubWludXMocCkpID09PSBkIEZBSUxFRCcpO1xuXG4gICAgcmV0dXJuIHA7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuc2ltcGxpZnlUcml2aWFsbHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgYXNzZXJ0KCF0aGlzLmlzQ29ubmVjdGVkKCksICdBUlBhdGguc2ltcGxpZnlUcml2aWFsbHk6ICFpc0Nvbm5lY3RlZCgpIEZBSUxFRCcpO1xuXG4gICAgaWYgKHRoaXMucG9pbnRzLmxlbmd0aCA8PSAyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcG9zID0gMCxcbiAgICAgICAgcG9zMSA9IHBvcztcblxuICAgIGFzc2VydChwb3MxICE9PSB0aGlzLnBvaW50cy5sZW5ndGgsICdBUlBhdGguc2ltcGxpZnlUcml2aWFsbHk6IHBvczEgIT09IHRoaXMucG9pbnRzLmxlbmd0aCBGQUlMRUQnKTtcbiAgICB2YXIgcDEgPSB0aGlzLnBvaW50c1twb3MrK10sXG4gICAgICAgIHBvczIgPSBwb3M7XG5cbiAgICBhc3NlcnQocG9zMiAhPT0gdGhpcy5wb2ludHMubGVuZ3RoLCAnQVJQYXRoLnNpbXBsaWZ5VHJpdmlhbGx5OiBwb3MyICE9PSB0aGlzLnBvaW50cy5sZW5ndGggRkFJTEVEJyk7XG4gICAgdmFyIHAyID0gdGhpcy5wb2ludHNbcG9zKytdLFxuICAgICAgICBkaXIxMiA9IFV0aWxzLmdldERpcihwMi5taW51cyhwMSkpLFxuICAgICAgICBwb3MzID0gcG9zO1xuXG4gICAgYXNzZXJ0KHBvczMgIT09IHRoaXMucG9pbnRzLmxlbmd0aCwgJ0FSUGF0aC5zaW1wbGlmeVRyaXZpYWxseTogcG9zMyAhPT0gdGhpcy5wb2ludHMubGVuZ3RoIEZBSUxFRCcpO1xuICAgIHZhciBwMyA9IHRoaXMucG9pbnRzW3BvcysrXSxcbiAgICAgICAgZGlyMjMgPSBVdGlscy5nZXREaXIocDMubWludXMocDIpKTtcblxuICAgIGZvciAoOyA7KSB7XG4gICAgICAgIGlmIChkaXIxMiA9PT0gQ09OU1RBTlRTLkRpck5vbmUgfHwgZGlyMjMgPT09IENPTlNUQU5UUy5EaXJOb25lIHx8XG4gICAgICAgICAgICAoZGlyMTIgIT09IENPTlNUQU5UUy5EaXJTa2V3ICYmIGRpcjIzICE9PSBDT05TVEFOVFMuRGlyU2tldyAmJlxuICAgICAgICAgICAgKGRpcjEyID09PSBkaXIyMyB8fCBkaXIxMiA9PT0gVXRpbHMucmV2ZXJzZURpcihkaXIyMykpICkpIHtcbiAgICAgICAgICAgIHRoaXMucG9pbnRzLnNwbGljZShwb3MyLCAxKTtcbiAgICAgICAgICAgIHBvcy0tO1xuICAgICAgICAgICAgcG9zMy0tO1xuICAgICAgICAgICAgZGlyMTIgPSBVdGlscy5nZXREaXIocDMubWludXMocDEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBvczEgPSBwb3MyO1xuICAgICAgICAgICAgcDEgPSBwMjtcbiAgICAgICAgICAgIGRpcjEyID0gZGlyMjM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zID09PSB0aGlzLnBvaW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBvczIgPSBwb3MzO1xuICAgICAgICBwMiA9IHAzO1xuXG4gICAgICAgIHBvczMgPSBwb3M7XG4gICAgICAgIHAzID0gdGhpcy5wb2ludHNbcG9zKytdO1xuXG4gICAgICAgIGRpcjIzID0gVXRpbHMuZ2V0RGlyKHAzLm1pbnVzKHAyKSk7XG4gICAgfVxuXG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICB0aGlzLmFzc2VydFZhbGlkUG9pbnRzKCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmdldFBvaW50TGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5wb2ludHM7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuaXNQYXRoQ2xpcCA9IGZ1bmN0aW9uIChyLCBpc1N0YXJ0T3JFbmRSZWN0KSB7XG4gICAgdmFyIHRtcCA9IHRoaXMucG9pbnRzLmdldFRhaWxFZGdlKCksXG4gICAgICAgIGEgPSB0bXAuc3RhcnQsXG4gICAgICAgIGIgPSB0bXAuZW5kLFxuICAgICAgICBwb3MgPSB0bXAucG9zLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbnVtRWRnZXMgPSB0aGlzLnBvaW50cy5sZW5ndGggLSAxO1xuXG4gICAgd2hpbGUgKHBvcyA+PSAwKSB7XG4gICAgICAgIGlmIChpc1N0YXJ0T3JFbmRSZWN0ICYmICggaSA9PT0gMCB8fCBpID09PSBudW1FZGdlcyAtIDEgKSkge1xuICAgICAgICAgICAgaWYgKFV0aWxzLmlzUG9pbnRJbihhLCByLCAxKSAmJlxuICAgICAgICAgICAgICAgIFV0aWxzLmlzUG9pbnRJbihiLCByLCAxKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKFV0aWxzLmlzTGluZUNsaXBSZWN0KGEsIGIsIHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRtcCA9IHRoaXMucG9pbnRzLmdldFByZXZFZGdlKHBvcywgYSwgYik7XG4gICAgICAgIGEgPSB0bXAuc3RhcnQ7XG4gICAgICAgIGIgPSB0bXAuZW5kO1xuICAgICAgICBwb3MgPSB0bXAucG9zO1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmlzRml4ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICgodGhpcy5hdHRyaWJ1dGVzICYgQ09OU1RBTlRTLlBhdGhGaXhlZCkgIT09IDApO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmlzTW92ZWFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICgodGhpcy5hdHRyaWJ1dGVzICYgQ09OU1RBTlRTLlBhdGhGaXhlZCkgPT09IDApO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24gKHMpIHtcbiAgICBhc3NlcnQodGhpcy5vd25lciAhPT0gbnVsbCwgJ0FSUGF0aC5zZXRTdGF0ZTogdGhpcy5vd25lciAhPT0gbnVsbCBGQUlMRUQnKTtcblxuICAgIHRoaXMuc3RhdGUgPSBzO1xuICAgIGlmIChDT05TVEFOVFMuREVCVUcpIHtcbiAgICAgICAgdGhpcy5hc3NlcnRWYWxpZCgpO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5nZXRFbmREaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGEgPSB0aGlzLmF0dHJpYnV0ZXMgJiBDT05TVEFOVFMuUGF0aEVuZE1hc2s7XG4gICAgcmV0dXJuIGEgJiBDT05TVEFOVFMuUGF0aEVuZE9uVG9wID8gQ09OU1RBTlRTLkRpclRvcCA6XG4gICAgICAgIGEgJiBDT05TVEFOVFMuUGF0aEVuZE9uUmlnaHQgPyBDT05TVEFOVFMuRGlyUmlnaHQgOlxuICAgICAgICAgICAgYSAmIENPTlNUQU5UUy5QYXRoRW5kT25Cb3R0b20gPyBDT05TVEFOVFMuRGlyQm90dG9tIDpcbiAgICAgICAgICAgICAgICBhICYgQ09OU1RBTlRTLlBhdGhFbmRPbkxlZnQgPyBDT05TVEFOVFMuRGlyTGVmdCA6IENPTlNUQU5UUy5EaXJOb25lO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmdldFN0YXJ0RGlyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhID0gdGhpcy5hdHRyaWJ1dGVzICYgQ09OU1RBTlRTLlBhdGhTdGFydE1hc2s7XG4gICAgcmV0dXJuIGEgJiBDT05TVEFOVFMuUGF0aFN0YXJ0T25Ub3AgPyBDT05TVEFOVFMuRGlyVG9wIDpcbiAgICAgICAgYSAmIENPTlNUQU5UUy5QYXRoU3RhcnRPblJpZ2h0ID8gQ09OU1RBTlRTLkRpclJpZ2h0IDpcbiAgICAgICAgICAgIGEgJiBDT05TVEFOVFMuUGF0aFN0YXJ0T25Cb3R0b20gPyBDT05TVEFOVFMuRGlyQm90dG9tIDpcbiAgICAgICAgICAgICAgICBhICYgQ09OU1RBTlRTLlBhdGhTdGFydE9uTGVmdCA/IENPTlNUQU5UUy5EaXJMZWZ0IDogQ09OU1RBTlRTLkRpck5vbmU7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuc2V0RW5kRGlyID0gZnVuY3Rpb24gKHBhdGhFbmQpIHtcbiAgICB0aGlzLmF0dHJpYnV0ZXMgPSAodGhpcy5hdHRyaWJ1dGVzICYgfkNPTlNUQU5UUy5QYXRoRW5kTWFzaykgKyBwYXRoRW5kO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLnNldFN0YXJ0RGlyID0gZnVuY3Rpb24gKHBhdGhTdGFydCkge1xuICAgIHRoaXMuYXR0cmlidXRlcyA9ICh0aGlzLmF0dHJpYnV0ZXMgJiB+Q09OU1RBTlRTLlBhdGhTdGFydE1hc2spICsgcGF0aFN0YXJ0O1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1c3RvbSBwb2ludHMgb2YgdGhlIHBhdGggYW5kIGRldGVybWluZSBzdGFydC9lbmQgcG9pbnRzL3BvcnRzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXk8QXJQb2ludD59IHBvaW50c1xuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuc2V0Q3VzdG9tUGF0aFBvaW50cyA9IGZ1bmN0aW9uIChwb2ludHMpIHtcbiAgICB0aGlzLmN1c3RvbVBhdGhEYXRhID0gcG9pbnRzO1xuXG4gICAgLy8gRmluZCB0aGUgc3RhcnQvZW5kcG9ydHNcbiAgICB0aGlzLmNhbGN1bGF0ZVN0YXJ0RW5kUG9ydHMoKTtcblxuICAgIHRoaXMucG9pbnRzID0gbmV3IEFyUG9pbnRMaXN0UGF0aCgpLmNvbmNhdChwb2ludHMpO1xuXG4gICAgLy8gQWRkIHRoZSBzdGFydC9lbmQgcG9pbnRzIHRvIHRoZSBsaXN0XG4gICAgdGhpcy5wb2ludHMudW5zaGlmdCh0aGlzLnN0YXJ0cG9pbnQpO1xuICAgIHRoaXMucG9pbnRzLnB1c2godGhpcy5lbmRwb2ludCk7XG5cbiAgICAvLyBTZXQgYXMgY29ubmVjdGVkXG4gICAgdGhpcy5zZXRTdGF0ZShDT05TVEFOVFMuUGF0aFN0YXRlQ29ubmVjdGVkKTtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5jcmVhdGVDdXN0b21QYXRoID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMucG9pbnRzLnNoaWZ0KCk7XG4gICAgdGhpcy5wb2ludHMucG9wKCk7XG5cbiAgICB0aGlzLnBvaW50cy51bnNoaWZ0KHRoaXMuc3RhcnRwb2ludCk7XG4gICAgdGhpcy5wb2ludHMucHVzaCh0aGlzLmVuZHBvaW50KTtcblxuICAgIHRoaXMuc2V0U3RhdGUoQ09OU1RBTlRTLlBhdGhTdGF0ZUNvbm5lY3RlZCk7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUucmVtb3ZlUGF0aEN1c3RvbWl6YXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY3VzdG9tUGF0aERhdGEgPSBbXTtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5hcmVUaGVyZVBhdGhDdXN0b21pemF0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXN0b21QYXRoRGF0YS5sZW5ndGggIT09IDA7XG59O1xuXG5BdXRvUm91dGVyUGF0aC5wcm90b3R5cGUuaXNBdXRvUm91dGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmlzQXV0b1JvdXRpbmdPbjtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5zZXRBdXRvUm91dGluZyA9IGZ1bmN0aW9uIChhclN0YXRlKSB7XG4gICAgdGhpcy5pc0F1dG9Sb3V0aW5nT24gPSBhclN0YXRlO1xufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLnN0YXJ0cG9ydC5yZW1vdmVQb2ludCh0aGlzLnN0YXJ0cG9pbnQpO1xuICAgICAgICB0aGlzLmVuZHBvcnQucmVtb3ZlUG9pbnQodGhpcy5lbmRwb2ludCk7XG4gICAgfVxufTtcblxuQXV0b1JvdXRlclBhdGgucHJvdG90eXBlLmFzc2VydFZhbGlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBpO1xuXG4gICAgYXNzZXJ0KHRoaXMuc3RhcnRwb3J0cy5sZW5ndGggPiAwLCAnUGF0aCBoYXMgbm8gc3RhcnRwb3J0cyEnKTtcbiAgICBhc3NlcnQodGhpcy5lbmRwb3J0cy5sZW5ndGggPiAwLCAnUGF0aCBoYXMgbm8gZW5kcG9ydHMhJyk7XG5cbiAgICBmb3IgKGkgPSB0aGlzLnN0YXJ0cG9ydHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHRoaXMuc3RhcnRwb3J0c1tpXS5hc3NlcnRWYWxpZCgpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IHRoaXMuZW5kcG9ydHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHRoaXMuZW5kcG9ydHNbaV0uYXNzZXJ0VmFsaWQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0F1dG9Sb3V0ZWQoKSkge1xuICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgICAgICBhc3NlcnQodGhpcy5wb2ludHMubGVuZ3RoICE9PSAwLFxuICAgICAgICAgICAgICAgICdBUlBhdGguYXNzZXJ0VmFsaWQ6IHRoaXMucG9pbnRzLmxlbmd0aCAhPT0gMCBGQUlMRUQnKTtcbiAgICAgICAgICAgIHZhciBwb2ludHMgPSB0aGlzLmdldFBvaW50TGlzdCgpO1xuICAgICAgICAgICAgcG9pbnRzLmFzc2VydFZhbGlkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBpdCBoYXMgYSBzdGFydHBvaW50LCBtdXN0IGFsc28gaGF2ZSBhIHN0YXJ0cG9ydFxuICAgIGlmICh0aGlzLnN0YXJ0cG9pbnQpIHtcbiAgICAgICAgYXNzZXJ0KHRoaXMuc3RhcnRwb3J0LCAnUGF0aCBoYXMgYSBzdGFydHBvaW50IHdpdGhvdXQgYSBzdGFydHBvcnQnKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZW5kcG9pbnQpIHtcbiAgICAgICAgYXNzZXJ0KHRoaXMuZW5kcG9ydCwgJ1BhdGggaGFzIGEgZW5kcG9pbnQgd2l0aG91dCBhIGVuZHBvcnQnKTtcbiAgICB9XG5cbiAgICBhc3NlcnQodGhpcy5vd25lciwgJ1BhdGggZG9lcyBub3QgaGF2ZSBvd25lciEnKTtcbn07XG5cbkF1dG9Sb3V0ZXJQYXRoLnByb3RvdHlwZS5hc3NlcnRWYWxpZFBvaW50cyA9IGZ1bmN0aW9uICgpIHtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b1JvdXRlclBhdGg7XG4iLCIvKmdsb2JhbHMgZGVmaW5lKi9cbi8qanNoaW50IGJyb3dzZXI6IHRydWUsIGJpdHdpc2U6IGZhbHNlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEFyU2l6ZSA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5TaXplJyk7XG5cbnZhciBBclBvaW50ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAvLyBNdWx0aXBsZSBDb25zdHJ1Y3RvcnNcbiAgICBpZiAoeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHggPSAwO1xuICAgICAgICB5ID0gMDtcbiAgICB9IGVsc2UgaWYgKHkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB5ID0geC55O1xuICAgICAgICB4ID0geC54O1xuICAgIH1cblxuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIHBvaW50cyBoYXZlIHRoZSBzYW1lIGNvb3JkaW5hdGVzLlxuICpcbiAqIEBwYXJhbSB7QXJQb2ludH0gb3RoZXJQb2ludFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQXJQb2ludC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG90aGVyUG9pbnQpIHtcbiAgICByZXR1cm4gdGhpcy54ID09PSBvdGhlclBvaW50LnggJiYgdGhpcy55ID09PSBvdGhlclBvaW50Lnk7XG59O1xuXG5BclBvaW50LnByb3RvdHlwZS5zaGlmdCA9IGZ1bmN0aW9uIChvdGhlck9iamVjdCkgeyAvL2VxdWl2YWxlbnQgdG8gKz1cbiAgICB0aGlzLnggKz0gb3RoZXJPYmplY3QuZHg7XG4gICAgdGhpcy55ICs9IG90aGVyT2JqZWN0LmR5O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5BclBvaW50LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob3RoZXJPYmplY3QpIHsgLy9lcXVpdmFsZW50IHRvICs9XG4gICAgaWYgKG90aGVyT2JqZWN0IGluc3RhbmNlb2YgQXJTaXplKSB7XG4gICAgICAgIHRoaXMueCArPSBvdGhlck9iamVjdC5jeDtcbiAgICAgICAgdGhpcy55ICs9IG90aGVyT2JqZWN0LmN5O1xuICAgIH0gZWxzZSBpZiAob3RoZXJPYmplY3QgaW5zdGFuY2VvZiBBclBvaW50KSB7XG4gICAgICAgIHRoaXMueCArPSBvdGhlck9iamVjdC54O1xuICAgICAgICB0aGlzLnkgKz0gb3RoZXJPYmplY3QueTtcbiAgICB9XG59O1xuXG5BclBvaW50LnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIChvdGhlck9iamVjdCkgeyAvL2VxdWl2YWxlbnQgdG8gKz1cbiAgICBpZiAob3RoZXJPYmplY3QgaW5zdGFuY2VvZiBBclNpemUpIHtcbiAgICAgICAgdGhpcy54IC09IG90aGVyT2JqZWN0LmN4O1xuICAgICAgICB0aGlzLnkgLT0gb3RoZXJPYmplY3QuY3k7XG4gICAgfSBlbHNlIGlmIChvdGhlck9iamVjdCBpbnN0YW5jZW9mIEFyUG9pbnQpIHtcbiAgICAgICAgdGhpcy54IC09IG90aGVyT2JqZWN0Lng7XG4gICAgICAgIHRoaXMueSAtPSBvdGhlck9iamVjdC55O1xuICAgIH1cbn07XG5cbkFyUG9pbnQucHJvdG90eXBlLnBsdXMgPSBmdW5jdGlvbiAob3RoZXJPYmplY3QpIHsgLy9lcXVpdmFsZW50IHRvICtcbiAgICB2YXIgb2JqZWN0Q29weSA9IG51bGw7XG5cbiAgICBpZiAob3RoZXJPYmplY3QgaW5zdGFuY2VvZiBBclNpemUpIHtcbiAgICAgICAgb2JqZWN0Q29weSA9IG5ldyBBclBvaW50KHRoaXMpO1xuICAgICAgICBvYmplY3RDb3B5LmFkZChvdGhlck9iamVjdCk7XG5cbiAgICB9IGVsc2UgaWYgKG90aGVyT2JqZWN0IGluc3RhbmNlb2YgQXJQb2ludCkge1xuICAgICAgICBvYmplY3RDb3B5ID0gbmV3IEFyUG9pbnQob3RoZXJPYmplY3QpO1xuICAgICAgICBvYmplY3RDb3B5LnggKz0gdGhpcy54O1xuICAgICAgICBvYmplY3RDb3B5LnkgKz0gdGhpcy55O1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0Q29weSB8fCB1bmRlZmluZWQ7XG59O1xuXG5BclBvaW50LnByb3RvdHlwZS5taW51cyA9IGZ1bmN0aW9uIChvdGhlck9iamVjdCkge1xuICAgIHZhciBvYmplY3RDb3B5ID0gbmV3IEFyUG9pbnQob3RoZXJPYmplY3QpO1xuXG4gICAgaWYgKG90aGVyT2JqZWN0LmN4IHx8IG90aGVyT2JqZWN0LmN5KSB7XG4gICAgICAgIG9iamVjdENvcHkuc3VidHJhY3QodGhpcyk7XG5cbiAgICB9IGVsc2UgaWYgKG90aGVyT2JqZWN0LnggfHwgb3RoZXJPYmplY3QueSkge1xuICAgICAgICBvYmplY3RDb3B5ID0gbmV3IEFyU2l6ZSgpO1xuICAgICAgICBvYmplY3RDb3B5LmN4ID0gdGhpcy54IC0gb3RoZXJPYmplY3QueDtcbiAgICAgICAgb2JqZWN0Q29weS5jeSA9IHRoaXMueSAtIG90aGVyT2JqZWN0Lnk7XG5cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdENvcHk7XG59O1xuXG5BclBvaW50LnByb3RvdHlwZS5hc3NpZ24gPSBmdW5jdGlvbiAob3RoZXJQb2ludCkge1xuICAgIHRoaXMueCA9IG90aGVyUG9pbnQueDtcbiAgICB0aGlzLnkgPSBvdGhlclBvaW50Lnk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbkFyUG9pbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJyknO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBclBvaW50O1xuIiwiLypqc2hpbnQgbm9kZTogdHJ1ZSwgYml0d2lzZTogZmFsc2UqL1xuXG4vKipcbiAqIEBhdXRob3IgYnJvbGxiIC8gaHR0cHM6Ly9naXRodWIvYnJvbGxiXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkxvZ2dlcicpLCAgLy8gRklYTUVcbiAgICBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKSxcbiAgICBDT05TVEFOVFMgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuQ29uc3RhbnRzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuVXRpbHMnKSxcbiAgICBfbG9nZ2VyID0gbmV3IExvZ2dlcignQXV0b1JvdXRlci5Qb2ludExpc3QnKTtcblxudmFyIEFyUG9pbnRMaXN0UGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLnVuc2hpZnQoYXJndW1lbnRzW2ldKTtcbiAgICB9XG59O1xuXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlID0gW107XG5cbi8vIFdyYXBwZXIgRnVuY3Rpb25zXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0KSB7XG4gICAgdmFyIG5ld1BvaW50cyA9IG5ldyBBclBvaW50TGlzdFBhdGgoKSxcbiAgICAgICAgaTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ld1BvaW50cy5wdXNoKHRoaXNbaV0pO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ld1BvaW50cy5wdXNoKGxpc3RbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3UG9pbnRzO1xufTtcblxuLy8gRnVuY3Rpb25zXG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzW3RoaXMubGVuZ3RoIC0gMV07XG59O1xuXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlLmdldFRhaWxFZGdlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoO1xuICAgIH1cblxuICAgIHZhciBwb3MgPSB0aGlzLmxlbmd0aCAtIDEsXG4gICAgICAgIGVuZCA9IHRoaXNbcG9zLS1dLFxuICAgICAgICBzdGFydCA9IHRoaXNbcG9zXTtcblxuICAgIHJldHVybiB7J3Bvcyc6IHBvcywgJ3N0YXJ0Jzogc3RhcnQsICdlbmQnOiBlbmR9O1xufTtcblxuQXJQb2ludExpc3RQYXRoLnByb3RvdHlwZS5nZXRQcmV2RWRnZSA9IGZ1bmN0aW9uIChwb3MsIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHRoaXMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICBlbmQgPSB0aGlzW3Bvcy0tXTtcbiAgICBpZiAocG9zICE9PSB0aGlzLmxlbmd0aCkge1xuICAgICAgICBzdGFydCA9IHRoaXNbcG9zXTtcbiAgICB9XG5cbiAgICByZXR1cm4geydwb3MnOiBwb3MsICdzdGFydCc6IHN0YXJ0LCAnZW5kJzogZW5kfTtcbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuZ2V0RWRnZSA9IGZ1bmN0aW9uIChwb3MsIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHRoaXMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICBzdGFydCA9IHRoaXNbcG9zKytdO1xuICAgIGFzc2VydChwb3MgPCB0aGlzLmxlbmd0aCwgJ0FyUG9pbnRMaXN0UGF0aC5nZXRFZGdlOiBwb3MgPCB0aGlzLmxlbmd0aCBGQUlMRUQnKTtcblxuICAgIGVuZCA9IHRoaXNbcG9zXTtcbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuZ2V0VGFpbEVkZ2VQdHJzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3MgPSB0aGlzLmxlbmd0aCxcbiAgICAgICAgc3RhcnQsXG4gICAgICAgIGVuZDtcblxuICAgIGlmICh0aGlzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIHsncG9zJzogcG9zfTtcbiAgICB9XG5cbiAgICBhc3NlcnQoLS1wb3MgPCB0aGlzLmxlbmd0aCwgJ0FyUG9pbnRMaXN0UGF0aC5nZXRUYWlsRWRnZVB0cnM6IC0tcG9zIDwgdGhpcy5sZW5ndGggRkFJTEVEJyk7XG5cbiAgICBlbmQgPSB0aGlzW3Bvcy0tXTtcbiAgICBhc3NlcnQocG9zIDwgdGhpcy5sZW5ndGgsICdBclBvaW50TGlzdFBhdGguZ2V0VGFpbEVkZ2VQdHJzOiBwb3MgPCB0aGlzLmxlbmd0aCBGQUlMRUQnKTtcblxuICAgIHN0YXJ0ID0gdGhpc1twb3NdO1xuXG4gICAgcmV0dXJuIHsncG9zJzogcG9zLCAnc3RhcnQnOiBzdGFydCwgJ2VuZCc6IGVuZH07XG59O1xuXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlLmdldFByZXZFZGdlUHRycyA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICB2YXIgc3RhcnQsXG4gICAgICAgIGVuZDtcblxuICAgIGlmIChDT05TVEFOVFMuREVCVUcpIHtcbiAgICAgICAgdGhpcy5Bc3NlcnRWYWxpZFBvcyhwb3MpO1xuICAgIH1cblxuICAgIGVuZCA9IHRoaXNbcG9zXTtcblxuICAgIGlmIChwb3MtLSA+IDApIHtcbiAgICAgICAgc3RhcnQgPSB0aGlzW3Bvc107XG4gICAgfVxuXG4gICAgcmV0dXJuIHtwb3M6IHBvcywgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZH07XG59O1xuXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlLmdldFN0YXJ0UG9pbnQgPSBmdW5jdGlvbiAocG9zKSB7XG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICB0aGlzLkFzc2VydFZhbGlkUG9zKHBvcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbcG9zXTtcbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuZ2V0RW5kUG9pbnQgPSBmdW5jdGlvbiAocG9zKSB7XG4gICAgaWYgKENPTlNUQU5UUy5ERUJVRykge1xuICAgICAgICB0aGlzLkFzc2VydFZhbGlkUG9zKHBvcyk7XG4gICAgfVxuXG4gICAgcG9zKys7XG4gICAgYXNzZXJ0KHBvcyA8IHRoaXMubGVuZ3RoLFxuICAgICAgICAnQXJQb2ludExpc3RQYXRoLmdldEVuZFBvaW50OiBwb3MgPCB0aGlzLmxlbmd0aCBGQUlMRUQnKTtcblxuICAgIHJldHVybiB0aGlzW3Bvc107XG59O1xuXG5BclBvaW50TGlzdFBhdGgucHJvdG90eXBlLmdldFBvaW50QmVmb3JlRWRnZSA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHRoaXMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICBwb3MtLTtcbiAgICBpZiAocG9zID09PSB0aGlzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1twb3NdO1xufTtcblxuQXJQb2ludExpc3RQYXRoLnByb3RvdHlwZS5nZXRQb2ludEFmdGVyRWRnZSA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICBpZiAoQ09OU1RBTlRTLkRFQlVHKSB7XG4gICAgICAgIHRoaXMuQXNzZXJ0VmFsaWRQb3MocG9zKTtcbiAgICB9XG5cbiAgICBwb3MrKztcbiAgICBhc3NlcnQocG9zIDwgdGhpcy5sZW5ndGgsXG4gICAgICAgICdBclBvaW50TGlzdFBhdGguZ2V0UG9pbnRBZnRlckVkZ2U6IHBvcyA8IHRoaXMubGVuZ3RoIEZBSUxFRCcpO1xuXG4gICAgcG9zKys7XG4gICAgaWYgKHBvcyA9PT0gdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNbcG9zXTtcbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuYXNzZXJ0VmFsaWQgPSBmdW5jdGlvbiAobXNnKSB7XG4gICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIGVhY2ggcG9pbnQgbWFrZXMgYSBob3Jpem9udGFsL3ZlcnRpY2FsIGxpbmUgd2l0aCBpdCdzIG5laWdoYm9yc1xuICAgIG1zZyA9IG1zZyB8fCAnJztcbiAgICBmb3IgKHZhciBpID0gdGhpcy5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgIGFzc2VydCghIXRoaXNbaV0ubWludXMsICdCYWQgdmFsdWUgYXQgcG9zaXRpb24gJyArIGkgKyAnICgnICsgVXRpbHMuc3RyaW5naWZ5KHRoaXNbaV0pICsgJyknKTtcbiAgICAgICAgYXNzZXJ0KCEhdGhpc1tpIC0gMV0ubWludXMsICdCYWQgdmFsdWUgYXQgcG9zaXRpb24gJyArIChpIC0gMSkgKyAnICgnICsgVXRpbHMuc3RyaW5naWZ5KHRoaXNbaSAtIDFdKSArICcpJyk7XG5cbiAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShVdGlscy5nZXREaXIodGhpc1tpIC0gMV0ubWludXModGhpc1tpXSkpKSxcbiAgICAgICAgICAgIG1zZyArICdcXG5cXHRBclBvaW50TGlzdFBhdGggY29udGFpbnMgc2tldyBlZGdlOlxcbicgKyBVdGlscy5zdHJpbmdpZnkodGhpcykpO1xuICAgIH1cbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuYXNzZXJ0VmFsaWRQb3MgPSBmdW5jdGlvbiAocG9zKSB7XG4gICAgYXNzZXJ0KHBvcyA8IHRoaXMubGVuZ3RoLCAnQXJQb2ludExpc3RQYXRoLmFzc2VydFZhbGlkUG9zOiBwb3MgPCB0aGlzLmxlbmd0aCBGQUlMRUQnKTtcbn07XG5cbkFyUG9pbnRMaXN0UGF0aC5wcm90b3R5cGUuZHVtcFBvaW50cyA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBtc2cgKz0gJywgcG9pbnRzIGR1bXAgYmVnaW46XFxuJztcbiAgICB2YXIgcG9zID0gMCxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIHA7XG4gICAgd2hpbGUgKHBvcyA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgIHAgPSB0aGlzW3BvcysrXTtcbiAgICAgICAgbXNnICs9IGkgKyAnLjogKCcgKyBwLnggKyAnLCAnICsgcC55ICsgJylcXG4nO1xuICAgICAgICBpKys7XG4gICAgfVxuICAgIG1zZyArPSAncG9pbnRzIGR1bXAgZW5kLic7XG4gICAgX2xvZ2dlci5kZWJ1Zyhtc2cpO1xuICAgIHJldHVybiBtc2c7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFyUG9pbnRMaXN0UGF0aDtcblxuIiwiLypqc2hpbnQgbm9kZTogdHJ1ZSwgYml0d2lzZTogZmFsc2UqL1xuXG4vKipcbiAqIEBhdXRob3IgYnJvbGxiIC8gaHR0cHM6Ly9naXRodWIvYnJvbGxiXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgQ09OU1RBTlRTID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkNvbnN0YW50cycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlV0aWxzJyksXG4gICAgQXJQb2ludCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb2ludCcpLFxuICAgIEFyU2l6ZSA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5TaXplJyksXG4gICAgQXJSZWN0ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlJlY3QnKTtcblxudmFyIEF1dG9Sb3V0ZXJQb3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuaWQgPSBudWxsO1xuICAgIHRoaXMub3duZXIgPSBudWxsO1xuICAgIHRoaXMubGltaXRlZERpcmVjdGlvbnMgPSB0cnVlO1xuICAgIHRoaXMucmVjdCA9IG5ldyBBclJlY3QoKTtcbiAgICB0aGlzLmF0dHJpYnV0ZXMgPSBDT05TVEFOVFMuUG9ydERlZmF1bHQ7XG5cbiAgICAvLyBGb3IgdGhpcy5wb2ludHMgb24gQ09OU1RBTlRTLkRpclRvcCwgQ09OU1RBTlRTLkRpckxlZnQsIENPTlNUQU5UUy5EaXJSaWdodCwgZXRjXG4gICAgdGhpcy5wb2ludHMgPSBbW10sIFtdLCBbXSwgW11dO1xuICAgIHRoaXMuc2VsZlBvaW50cyA9IFtdO1xuICAgIHRoaXMuYXZhaWxhYmxlQXJlYSA9IFtdOyAgLy8gYXZhaWxhYmxlQXJlYXMga2VlcHMgdHJhY2sgb2YgdmlzaWJsZSAobm90IG92ZXJsYXBwZWQpIHBvcnRpb25zIG9mIHRoZSBwb3J0XG5cbiAgICB0aGlzLmNhbGN1bGF0ZVNlbGZQb2ludHMoKTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5jYWxjdWxhdGVTZWxmUG9pbnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2VsZlBvaW50cyA9IFtdO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5nZXRUb3BMZWZ0KCkpKTtcblxuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5yaWdodCwgdGhpcy5yZWN0LmNlaWwpKTtcbiAgICB0aGlzLnNlbGZQb2ludHMucHVzaChuZXcgQXJQb2ludCh0aGlzLnJlY3QucmlnaHQsIHRoaXMucmVjdC5mbG9vcikpO1xuICAgIHRoaXMuc2VsZlBvaW50cy5wdXNoKG5ldyBBclBvaW50KHRoaXMucmVjdC5sZWZ0LCB0aGlzLnJlY3QuZmxvb3IpKTtcbiAgICB0aGlzLnJlc2V0QXZhaWxhYmxlQXJlYSgpO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLmhhc093bmVyID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyICE9PSBudWxsO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLmlzUmVjdEVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnJlY3QuaXNSZWN0RW1wdHkoKTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5nZXRDZW50ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVjdC5nZXRDZW50ZXJQb2ludCgpO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLnNldFJlY3QgPSBmdW5jdGlvbiAocikge1xuICAgIGFzc2VydChyLmdldFdpZHRoKCkgPj0gMyAmJiByLmdldEhlaWdodCgpID49IDMsXG4gICAgICAgICdBUlBvcnQuc2V0UmVjdDogci5nZXRXaWR0aCgpID49IDMgJiYgci5nZXRIZWlnaHQoKSA+PSAzIEZBSUxFRCEnKTtcblxuICAgIHRoaXMucmVjdC5hc3NpZ24ocik7XG4gICAgdGhpcy5jYWxjdWxhdGVTZWxmUG9pbnRzKCk7XG4gICAgdGhpcy5yZXNldEF2YWlsYWJsZUFyZWEoKTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5zaGlmdEJ5ID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIGFzc2VydCghdGhpcy5yZWN0LmlzUmVjdEVtcHR5KCksICdBUlBvcnQuc2hpZnRCeTogIXRoaXMucmVjdC5pc1JlY3RFbXB0eSgpIEZBSUxFRCEnKTtcblxuICAgIHRoaXMucmVjdC5hZGQob2Zmc2V0KTtcblxuICAgIHRoaXMuY2FsY3VsYXRlU2VsZlBvaW50cygpO1xuICAgIC8vIFNoaWZ0IHBvaW50c1xuICAgIHRoaXMuc2hpZnRQb2ludHMob2Zmc2V0KTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5pc0Nvbm5lY3RUb0NlbnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuYXR0cmlidXRlcyAmIENPTlNUQU5UUy5Qb3J0Q29ubmVjdFRvQ2VudGVyKSAhPT0gMDtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5oYXNMaW1pdGVkRGlycyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5saW1pdGVkRGlyZWN0aW9ucztcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5zZXRMaW1pdGVkRGlycyA9IGZ1bmN0aW9uIChsdGQpIHtcbiAgICB0aGlzLmxpbWl0ZWREaXJlY3Rpb25zID0gbHRkO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLnBvcnRPbldoaWNoRWRnZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICAgIHJldHVybiBVdGlscy5vbldoaWNoRWRnZSh0aGlzLnJlY3QsIHBvaW50KTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5jYW5IYXZlU3RhcnRFbmRQb2ludE9uID0gZnVuY3Rpb24gKGRpciwgaXNTdGFydCkge1xuICAgIGFzc2VydCgwIDw9IGRpciAmJiBkaXIgPD0gMywgJ0FSUG9ydC5jYW5IYXZlU3RhcnRFbmRQb2ludE9uOiAwIDw9IGRpciAmJiBkaXIgPD0gMyBGQUlMRUQhJyk7XG5cbiAgICBpZiAoaXNTdGFydCkge1xuICAgICAgICBkaXIgKz0gNDtcbiAgICB9XG5cbiAgICByZXR1cm4gKCh0aGlzLmF0dHJpYnV0ZXMgJiAoMSA8PCBkaXIpKSAhPT0gMCk7XG59O1xuXG5BdXRvUm91dGVyUG9ydC5wcm90b3R5cGUuY2FuSGF2ZVN0YXJ0RW5kUG9pbnQgPSBmdW5jdGlvbiAoaXNTdGFydCkge1xuICAgIHJldHVybiAoKHRoaXMuYXR0cmlidXRlcyAmIChpc1N0YXJ0ID8gQ09OU1RBTlRTLlBvcnRTdGFydE9uQWxsIDogQ09OU1RBTlRTLlBvcnRFbmRPbkFsbCkpICE9PSAwKTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5jYW5IYXZlU3RhcnRFbmRQb2ludEhvcml6b250YWwgPSBmdW5jdGlvbiAoaXNIb3Jpem9udGFsKSB7XG4gICAgcmV0dXJuICgodGhpcy5hdHRyaWJ1dGVzICZcbiAgICAoaXNIb3Jpem9udGFsID8gQ09OU1RBTlRTLlBvcnRTdGFydEVuZEhvcml6b250YWwgOiBDT05TVEFOVFMuUG9ydFN0YXJ0RW5kVmVydGljYWwpKSAhPT0gMCk7XG59O1xuXG5BdXRvUm91dGVyUG9ydC5wcm90b3R5cGUuZ2V0U3RhcnRFbmREaXJUbyA9IGZ1bmN0aW9uIChwb2ludCwgaXNTdGFydCwgbm90dGhpcykge1xuICAgIGFzc2VydCghdGhpcy5yZWN0LmlzUmVjdEVtcHR5KCksICdBUlBvcnQuZ2V0U3RhcnRFbmREaXJUbzogIXRoaXMucmVjdC5pc1JlY3RFbXB0eSgpIEZBSUxFRCEnKTtcblxuICAgIG5vdHRoaXMgPSBub3R0aGlzID8gbm90dGhpcyA6IENPTlNUQU5UUy5EaXJOb25lOyAvLyBpZiBub3R0aGlzIGlzIHVuZGVmaW5lZCwgc2V0IGl0IHRvIENPTlNUQU5UUy5EaXJOb25lICgtMSlcblxuICAgIHZhciBvZmZzZXQgPSBwb2ludC5taW51cyh0aGlzLnJlY3QuZ2V0Q2VudGVyUG9pbnQoKSksXG4gICAgICAgIGRpcjEgPSBVdGlscy5nZXRNYWpvckRpcihvZmZzZXQpO1xuXG4gICAgaWYgKGRpcjEgIT09IG5vdHRoaXMgJiYgdGhpcy5jYW5IYXZlU3RhcnRFbmRQb2ludE9uKGRpcjEsIGlzU3RhcnQpKSB7XG4gICAgICAgIHJldHVybiBkaXIxO1xuICAgIH1cblxuICAgIHZhciBkaXIyID0gVXRpbHMuZ2V0TWlub3JEaXIob2Zmc2V0KTtcblxuICAgIGlmIChkaXIyICE9PSBub3R0aGlzICYmIHRoaXMuY2FuSGF2ZVN0YXJ0RW5kUG9pbnRPbihkaXIyLCBpc1N0YXJ0KSkge1xuICAgICAgICByZXR1cm4gZGlyMjtcbiAgICB9XG5cbiAgICB2YXIgZGlyMyA9IFV0aWxzLnJldmVyc2VEaXIoZGlyMik7XG5cbiAgICBpZiAoZGlyMyAhPT0gbm90dGhpcyAmJiB0aGlzLmNhbkhhdmVTdGFydEVuZFBvaW50T24oZGlyMywgaXNTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuIGRpcjM7XG4gICAgfVxuXG4gICAgdmFyIGRpcjQgPSBVdGlscy5yZXZlcnNlRGlyKGRpcjEpO1xuXG4gICAgaWYgKGRpcjQgIT09IG5vdHRoaXMgJiYgdGhpcy5jYW5IYXZlU3RhcnRFbmRQb2ludE9uKGRpcjQsIGlzU3RhcnQpKSB7XG4gICAgICAgIHJldHVybiBkaXI0O1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhbkhhdmVTdGFydEVuZFBvaW50T24oZGlyMSwgaXNTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuIGRpcjE7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FuSGF2ZVN0YXJ0RW5kUG9pbnRPbihkaXIyLCBpc1N0YXJ0KSkge1xuICAgICAgICByZXR1cm4gZGlyMjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYW5IYXZlU3RhcnRFbmRQb2ludE9uKGRpcjMsIGlzU3RhcnQpKSB7XG4gICAgICAgIHJldHVybiBkaXIzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNhbkhhdmVTdGFydEVuZFBvaW50T24oZGlyNCwgaXNTdGFydCkpIHtcbiAgICAgICAgcmV0dXJuIGRpcjQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIENPTlNUQU5UUy5EaXJUb3A7XG59O1xuXG5BdXRvUm91dGVyUG9ydC5wcm90b3R5cGUucm91bmRUb0hhbGZHcmlkID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7XG4gICAgdmFyIGJ0d24gPSAobGVmdCArIHJpZ2h0KSAvIDI7XG4gICAgYXNzZXJ0KGJ0d24gPCBNYXRoLm1heChsZWZ0LCByaWdodCkgJiYgYnR3biA+IE1hdGgubWluKGxlZnQsIHJpZ2h0KSxcbiAgICAgICAgJ3JvdW5kVG9IYWxmR3JpZDogYnR3biB2YXJpYWJsZSBub3QgYmV0d2VlbiBsZWZ0LCByaWdodCB2YWx1ZXMuIFBlcmhhcHMgYm94L2Nvbm5lY3Rpb25BcmVhIGlzIHRvbyBzbWFsbD8nKTtcbiAgICByZXR1cm4gYnR3bjtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5jcmVhdGVTdGFydEVuZFBvaW50VG8gPSBmdW5jdGlvbiAocG9pbnQsIGRpcikge1xuICAgIC8vIGNhbGN1bGF0ZSBwYXRoQW5nbGVcbiAgICB2YXIgZHggPSBwb2ludC54IC0gdGhpcy5nZXRDZW50ZXIoKS54LFxuICAgICAgICBkeSA9IHBvaW50LnkgLSB0aGlzLmdldENlbnRlcigpLnksXG4gICAgICAgIHBhdGhBbmdsZSA9IE1hdGguYXRhbjIoLWR5LCBkeCksXG4gICAgICAgIGsgPSAwLFxuICAgICAgICBtYXhYID0gdGhpcy5yZWN0LnJpZ2h0LFxuICAgICAgICBtYXhZID0gdGhpcy5yZWN0LmZsb29yLFxuICAgICAgICBtaW5YID0gdGhpcy5yZWN0LmxlZnQsXG4gICAgICAgIG1pblkgPSB0aGlzLnJlY3QuY2VpbCxcbiAgICAgICAgcmVzdWx0UG9pbnQsXG4gICAgICAgIHNtYWxsZXJQdCA9IG5ldyBBclBvaW50KG1pblgsIG1pblkpLCAgLy8gVGhlIHRoaXMucG9pbnRzIHRoYXQgdGhlIHJlc3VsdFBvaW50IGlzIGNlbnRlcmVkIGJldHdlZW5cbiAgICAgICAgbGFyZ2VyUHQgPSBuZXcgQXJQb2ludChtYXhYLCBtYXhZKTtcblxuICAgIC8vIEZpbmQgdGhlIHNtYWxsZXIgYW5kIGxhcmdlciBwb2ludHNcbiAgICAvLyBBcyB0aGUgcG9pbnRzIGNhbm5vdCBiZSBvbiB0aGUgY29ybmVyIG9mIGFuIGVkZ2UgKGFtYmlndW91cyBkaXJlY3Rpb24pLCBcbiAgICAvLyB3ZSB3aWxsIHNoaWZ0IHRoZSBtaW4sIG1heCBpbiBvbmUgcGl4ZWxcbiAgICBpZiAoVXRpbHMuaXNIb3Jpem9udGFsKGRpcikpIHsgIC8vIHNoaWZ0IHggY29vcmRpbmF0ZXNcbiAgICAgICAgbWluWCsrO1xuICAgICAgICBtYXhYLS07XG4gICAgfSBlbHNlIHsgLy8gc2hpZnQgeSBjb29yZGluYXRlc1xuICAgICAgICBtaW5ZKys7XG4gICAgICAgIG1heFktLTtcbiAgICB9XG5cbiAgICAvLyBBZGp1c3QgYW5nbGUgYmFzZWQgb24gcGFydCBvZiBwb3J0IHRvIHdoaWNoIGl0IGlzIGNvbm5lY3RpbmdcbiAgICBzd2l0Y2ggKGRpcikge1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpclRvcDpcbiAgICAgICAgICAgIHBhdGhBbmdsZSA9IDIgKiBNYXRoLlBJIC0gKHBhdGhBbmdsZSArIE1hdGguUEkgLyAyKTtcbiAgICAgICAgICAgIGxhcmdlclB0LnkgPSB0aGlzLnJlY3QuY2VpbDtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpclJpZ2h0OlxuICAgICAgICAgICAgcGF0aEFuZ2xlID0gMiAqIE1hdGguUEkgLSBwYXRoQW5nbGU7XG4gICAgICAgICAgICBzbWFsbGVyUHQueCA9IHRoaXMucmVjdC5yaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpckJvdHRvbTpcbiAgICAgICAgICAgIHBhdGhBbmdsZSAtPSBNYXRoLlBJIC8gMjtcbiAgICAgICAgICAgIHNtYWxsZXJQdC55ID0gdGhpcy5yZWN0LmZsb29yO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBDT05TVEFOVFMuRGlyTGVmdDpcbiAgICAgICAgICAgIGxhcmdlclB0LnggPSB0aGlzLnJlY3QubGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwYXRoQW5nbGUgPCAwKSB7XG4gICAgICAgIHBhdGhBbmdsZSArPSAyICogTWF0aC5QSTtcbiAgICB9XG5cbiAgICBwYXRoQW5nbGUgKj0gMTgwIC8gTWF0aC5QSTsgIC8vIFVzaW5nIGRlZ3JlZXMgZm9yIGVhc2llciBkZWJ1Z2dpbmdcblxuICAgIC8vIEZpbmRpbmcgdGhpcy5wb2ludHMgb3JkZXJpbmdcbiAgICB3aGlsZSAoayA8IHRoaXMucG9pbnRzW2Rpcl0ubGVuZ3RoICYmIHBhdGhBbmdsZSA+IHRoaXMucG9pbnRzW2Rpcl1ba10ucGF0aEFuZ2xlKSB7XG4gICAgICAgIGsrKztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wb2ludHNbZGlyXS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGsgPT09IDApIHtcbiAgICAgICAgICAgIGxhcmdlclB0ID0gbmV3IEFyUG9pbnQodGhpcy5wb2ludHNbZGlyXVtrXSk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChrICE9PSB0aGlzLnBvaW50c1tkaXJdLmxlbmd0aCkge1xuICAgICAgICAgICAgc21hbGxlclB0ID0gbmV3IEFyUG9pbnQodGhpcy5wb2ludHNbZGlyXVtrIC0gMV0pO1xuICAgICAgICAgICAgbGFyZ2VyUHQgPSBuZXcgQXJQb2ludCh0aGlzLnBvaW50c1tkaXJdW2tdKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc21hbGxlclB0ID0gbmV3IEFyUG9pbnQodGhpcy5wb2ludHNbZGlyXVtrIC0gMV0pO1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXN1bHRQb2ludCA9IG5ldyBBclBvaW50KChsYXJnZXJQdC54ICsgc21hbGxlclB0LngpIC8gMiwgKGxhcmdlclB0LnkgKyBzbWFsbGVyUHQueSkgLyAyKTtcbiAgICByZXN1bHRQb2ludC5wYXRoQW5nbGUgPSBwYXRoQW5nbGU7XG5cbiAgICAvLyBNb3ZlIHRoZSBwb2ludCBvdmVyIHRvIGFuICd0aGlzLmF2YWlsYWJsZUFyZWEnIGlmIGFwcHJvcHJpYXRlXG4gICAgdmFyIGkgPSB0aGlzLmF2YWlsYWJsZUFyZWEubGVuZ3RoLFxuICAgICAgICBjbG9zZXN0QXJlYSA9IDAsXG4gICAgICAgIGRpc3RhbmNlID0gSW5maW5pdHksXG4gICAgICAgIHN0YXJ0LFxuICAgICAgICBlbmQ7XG5cbiAgICAvLyBGaW5kIGRpc3RhbmNlIGZyb20gZWFjaCB0aGlzLmF2YWlsYWJsZUFyZWEgYW5kIHN0b3JlIGNsb3Nlc3QgaW5kZXhcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHN0YXJ0ID0gdGhpcy5hdmFpbGFibGVBcmVhW2ldWzBdO1xuICAgICAgICBlbmQgPSB0aGlzLmF2YWlsYWJsZUFyZWFbaV1bMV07XG5cbiAgICAgICAgaWYgKFV0aWxzLmlzT25FZGdlKHN0YXJ0LCBlbmQsIHJlc3VsdFBvaW50KSkge1xuICAgICAgICAgICAgY2xvc2VzdEFyZWEgPSAtMTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKFV0aWxzLmRpc3RhbmNlRnJvbUxpbmUocmVzdWx0UG9pbnQsIHN0YXJ0LCBlbmQpIDwgZGlzdGFuY2UpIHtcbiAgICAgICAgICAgIGNsb3Nlc3RBcmVhID0gaTtcbiAgICAgICAgICAgIGRpc3RhbmNlID0gVXRpbHMuZGlzdGFuY2VGcm9tTGluZShyZXN1bHRQb2ludCwgc3RhcnQsIGVuZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2xvc2VzdEFyZWEgIT09IC0xICYmIHRoaXMuaXNBdmFpbGFibGUoKSkgeyAvLyByZXN1bHRQb2ludCBuZWVkcyB0byBiZSBtb3ZlZCB0byB0aGUgY2xvc2VzdCBhdmFpbGFibGUgYXJlYVxuICAgICAgICB2YXIgZGlyMiA9IFV0aWxzLmdldERpcih0aGlzLmF2YWlsYWJsZUFyZWFbY2xvc2VzdEFyZWFdWzBdLm1pbnVzKHJlc3VsdFBvaW50KSk7XG5cbiAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZShkaXIyKSxcbiAgICAgICAgICAgICdBdXRvUm91dGVyUG9ydC5jcmVhdGVTdGFydEVuZFBvaW50VG86IFV0aWxzLmlzUmlnaHRBbmdsZShkaXIyKSBGQUlMRUQnKTtcblxuICAgICAgICBpZiAoZGlyMiA9PT0gQ09OU1RBTlRTLkRpckxlZnQgfHwgZGlyMiA9PT0gQ09OU1RBTlRTLkRpclRvcCkgeyAvLyBUaGVuIHJlc3VsdFBvaW50IG11c3QgYmUgbW92ZWQgdXBcbiAgICAgICAgICAgIGxhcmdlclB0ID0gdGhpcy5hdmFpbGFibGVBcmVhW2Nsb3Nlc3RBcmVhXVsxXTtcbiAgICAgICAgfSBlbHNlIHsgLy8gVGhlbiByZXN1bHRQb2ludCBtdXN0IGJlIG1vdmVkIGRvd25cbiAgICAgICAgICAgIHNtYWxsZXJQdCA9IHRoaXMuYXZhaWxhYmxlQXJlYVtjbG9zZXN0QXJlYV1bMF07XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHRQb2ludCA9IG5ldyBBclBvaW50KChsYXJnZXJQdC54ICsgc21hbGxlclB0LngpIC8gMiwgKGxhcmdlclB0LnkgKyBzbWFsbGVyUHQueSkgLyAyKTtcbiAgICB9XG5cbiAgICB0aGlzLnBvaW50c1tkaXJdLnNwbGljZShrLCAwLCByZXN1bHRQb2ludCk7XG5cbiAgICBhc3NlcnQoVXRpbHMuaXNSaWdodEFuZ2xlKHRoaXMucG9ydE9uV2hpY2hFZGdlKHJlc3VsdFBvaW50KSksXG4gICAgICAgICdBdXRvUm91dGVyUG9ydC5jcmVhdGVTdGFydEVuZFBvaW50VG86IFV0aWxzLmlzUmlnaHRBbmdsZSh0aGlzLnBvcnRPbldoaWNoRWRnZShyZXN1bHRQb2ludCkpIEZBSUxFRCcpO1xuXG4gICAgcmV0dXJuIHJlc3VsdFBvaW50O1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLnJlbW92ZVBvaW50ID0gZnVuY3Rpb24gKHB0KSB7XG4gICAgdmFyIHJlbW92ZWQ7XG5cbiAgICByZW1vdmVkID0gVXRpbHMucmVtb3ZlRnJvbUFycmF5cy5hcHBseShudWxsLCBbcHRdLmNvbmNhdCh0aGlzLnBvaW50cykpO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLmhhc1BvaW50ID0gZnVuY3Rpb24gKHB0KSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBrO1xuXG4gICAgd2hpbGUgKGkgPCA0KSB7IC8vQ2hlY2sgYWxsIHNpZGVzIGZvciB0aGUgcG9pbnRcbiAgICAgICAgayA9IHRoaXMucG9pbnRzW2ldLmluZGV4T2YocHQpO1xuXG4gICAgICAgIGlmIChrID4gLTEpIHsgLy9JZiB0aGUgcG9pbnQgaXMgb24gdGhpcyBzaWRlIG9mIHRoZSBwb3J0XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLnNoaWZ0UG9pbnRzID0gZnVuY3Rpb24gKHNoaWZ0KSB7XG4gICAgZm9yICh2YXIgcyA9IHRoaXMucG9pbnRzLmxlbmd0aDsgcy0tOykge1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5wb2ludHNbc10ubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgICAvLyBTaGlmdCB0aGlzIHBvaW50XG4gICAgICAgICAgICB0aGlzLnBvaW50c1tzXVtpXS5hZGQoc2hpZnQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLmdldFBvaW50Q291bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBjb3VudCA9IDA7XG5cbiAgICB3aGlsZSAoaSA8IDQpIHsgLy8gQ2hlY2sgYWxsIHNpZGVzIGZvciB0aGUgcG9pbnRcbiAgICAgICAgY291bnQgKz0gdGhpcy5wb2ludHNbaSsrXS5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvdW50O1xufTtcblxuQXV0b1JvdXRlclBvcnQucHJvdG90eXBlLnJlc2V0QXZhaWxhYmxlQXJlYSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmF2YWlsYWJsZUFyZWEgPSBbXTtcblxuICAgIGlmICh0aGlzLmNhbkhhdmVTdGFydEVuZFBvaW50T24oQ09OU1RBTlRTLkRpclRvcCkpIHtcbiAgICAgICAgdGhpcy5hdmFpbGFibGVBcmVhLnB1c2goW3RoaXMucmVjdC5nZXRUb3BMZWZ0KCksIG5ldyBBclBvaW50KHRoaXMucmVjdC5yaWdodCwgdGhpcy5yZWN0LmNlaWwpXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FuSGF2ZVN0YXJ0RW5kUG9pbnRPbihDT05TVEFOVFMuRGlyUmlnaHQpKSB7XG4gICAgICAgIHRoaXMuYXZhaWxhYmxlQXJlYS5wdXNoKFtuZXcgQXJQb2ludCh0aGlzLnJlY3QucmlnaHQsIHRoaXMucmVjdC5jZWlsKSwgdGhpcy5yZWN0LmdldEJvdHRvbVJpZ2h0KCldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYW5IYXZlU3RhcnRFbmRQb2ludE9uKENPTlNUQU5UUy5EaXJCb3R0b20pKSB7XG4gICAgICAgIHRoaXMuYXZhaWxhYmxlQXJlYS5wdXNoKFtuZXcgQXJQb2ludCh0aGlzLnJlY3QubGVmdCwgdGhpcy5yZWN0LmZsb29yKSwgdGhpcy5yZWN0LmdldEJvdHRvbVJpZ2h0KCldKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYW5IYXZlU3RhcnRFbmRQb2ludE9uKENPTlNUQU5UUy5EaXJMZWZ0KSkge1xuICAgICAgICB0aGlzLmF2YWlsYWJsZUFyZWEucHVzaChbdGhpcy5yZWN0LmdldFRvcExlZnQoKSwgbmV3IEFyUG9pbnQodGhpcy5yZWN0LmxlZnQsIHRoaXMucmVjdC5mbG9vcildKTtcbiAgICB9XG5cbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5hZGp1c3RBdmFpbGFibGVBcmVhID0gZnVuY3Rpb24gKHIpIHtcbiAgICAvL0ZvciBhbGwgbGluZXMgc3BlY2lmaWVkIGluIGF2YWlsYWJsZUFyZWFzLCBjaGVjayBpZiB0aGUgbGluZSBVdGlscy5pbnRlcnNlY3QgcyB0aGUgcmVjdGFuZ2xlXG4gICAgLy9JZiBpdCBkb2VzLCByZW1vdmUgdGhlIHBhcnQgb2YgdGhlIGxpbmUgdGhhdCBVdGlscy5pbnRlcnNlY3QgcyB0aGUgcmVjdGFuZ2xlXG4gICAgaWYgKCF0aGlzLnJlY3QudG91Y2hpbmcocikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gdGhpcy5hdmFpbGFibGVBcmVhLmxlbmd0aCxcbiAgICAgICAgaW50ZXJzZWN0aW9uLFxuICAgICAgICBsaW5lO1xuXG4gICAgd2hpbGUgKGktLSkge1xuXG4gICAgICAgIGlmIChVdGlscy5pc0xpbmVDbGlwUmVjdCh0aGlzLmF2YWlsYWJsZUFyZWFbaV1bMF0sIHRoaXMuYXZhaWxhYmxlQXJlYVtpXVsxXSwgcikpIHtcbiAgICAgICAgICAgIGxpbmUgPSB0aGlzLmF2YWlsYWJsZUFyZWEuc3BsaWNlKGksIDEpWzBdO1xuICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gVXRpbHMuZ2V0TGluZUNsaXBSZWN0SW50ZXJzZWN0KGxpbmVbMF0sIGxpbmVbMV0sIHIpO1xuXG4gICAgICAgICAgICBpZiAoIWludGVyc2VjdGlvblswXS5lcXVhbHMobGluZVswXSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF2YWlsYWJsZUFyZWEucHVzaChbbGluZVswXSwgaW50ZXJzZWN0aW9uWzBdXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaW50ZXJzZWN0aW9uWzFdLmVxdWFscyhsaW5lWzFdKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlQXJlYS5wdXNoKFtpbnRlcnNlY3Rpb25bMV0sIGxpbmVbMV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5nZXRUb3RhbEF2YWlsYWJsZUFyZWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGkgPSB0aGlzLmF2YWlsYWJsZUFyZWEubGVuZ3RoLFxuICAgICAgICBsZW5ndGggPSBuZXcgQXJTaXplKCk7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGxlbmd0aC5hZGQodGhpcy5hdmFpbGFibGVBcmVhW2ldWzFdLm1pbnVzKHRoaXMuYXZhaWxhYmxlQXJlYVtpXVswXSkpO1xuICAgIH1cblxuICAgIGFzc2VydChsZW5ndGguY3ggPT09IDAgfHwgbGVuZ3RoLmN5ID09PSAwLFxuICAgICAgICAnQVJQb3J0LmdldFRvdGFsQXZhaWxhYmxlQXJlYTogbGVuZ3RoWzBdID09PSAwIHx8IGxlbmd0aFsxXSA9PT0gMCBGQUlMRUQnKTtcbiAgICByZXR1cm4gbGVuZ3RoLmN4IHx8IGxlbmd0aC5jeTtcbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5pc0F2YWlsYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5hdmFpbGFibGVBcmVhLmxlbmd0aCA+IDA7XG59O1xuXG5BdXRvUm91dGVyUG9ydC5wcm90b3R5cGUuYXNzZXJ0VmFsaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gQ2hlY2sgdGhhdCBhbGwgcG9pbnRzIGFyZSBvbiBhIHNpZGUgb2YgdGhlIHBvcnRcbiAgICB2YXIgcG9pbnQ7XG5cbiAgICBhc3NlcnQodGhpcy5vd25lciwgJ1BvcnQgJyArIHRoaXMuaWQgKyAnIGRvZXMgbm90IGhhdmUgdmFsaWQgb3duZXIhJyk7XG4gICAgZm9yICh2YXIgcyA9IHRoaXMucG9pbnRzLmxlbmd0aDsgcy0tOykge1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5wb2ludHNbc10ubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgICBwb2ludCA9IHRoaXMucG9pbnRzW3NdW2ldO1xuICAgICAgICAgICAgYXNzZXJ0KFV0aWxzLmlzUmlnaHRBbmdsZSh0aGlzLnBvcnRPbldoaWNoRWRnZShwb2ludCkpLFxuICAgICAgICAgICAgICAgICdBdXRvUm91dGVyUG9ydC5jcmVhdGVTdGFydEVuZFBvaW50VG86IFV0aWxzLmlzUmlnaHRBbmdsZSh0aGlzLnBvcnRPbldoaWNoRWRnZShyZXN1bHRQb2ludCkpJyArXG4gICAgICAgICAgICAgICAgJyBGQUlMRUQnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXJQb3J0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFJlbW92ZSBhbGwgcG9pbnRzXG4gICAgdGhpcy5vd25lciA9IG51bGw7XG5cbiAgICAvLyBSZW1vdmUgYWxsIHBvaW50cyBhbmQgc2VsZiBmcm9tIGFsbCBwYXRoc1xuICAgIHZhciBwb2ludCxcbiAgICAgICAgcGF0aDtcblxuICAgIGZvciAodmFyIGkgPSB0aGlzLnBvaW50cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IHRoaXMucG9pbnRzW2ldLmxlbmd0aDsgai0tOykge1xuICAgICAgICAgICAgcG9pbnQgPSB0aGlzLnBvaW50c1tpXVtqXTtcbiAgICAgICAgICAgIHBhdGggPSBwb2ludC5vd25lcjtcbiAgICAgICAgICAgIGFzc2VydChwYXRoLCAnc3RhcnQvZW5kIHBvaW50IGRvZXMgbm90IGhhdmUgYW4gb3duZXIhJyk7XG4gICAgICAgICAgICBwYXRoLnJlbW92ZVBvcnQodGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnBvaW50cyA9IFtbXSwgW10sIFtdLCBbXV07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b1JvdXRlclBvcnQ7XG4iLCIvKmpzaGludCBub2RlOiB0cnVlKi9cblxuLyoqXG4gKiBAYXV0aG9yIGJyb2xsYiAvIGh0dHBzOi8vZ2l0aHViL2Jyb2xsYlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSxcbiAgICBBclBvaW50ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBvaW50JyksXG4gICAgQXJTaXplID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlNpemUnKSxcbiAgICBMb2dnZXIgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuTG9nZ2VyJyksXG4gICAgX2xvZ2dlciA9IG5ldyBMb2dnZXIoJ0F1dG9Sb3V0ZXIuUmVjdCcpO1xuXG52YXIgQXJSZWN0ID0gZnVuY3Rpb24gKExlZnQsIENlaWwsIFJpZ2h0LCBGbG9vcikge1xuICAgIGlmIChMZWZ0ID09PSB1bmRlZmluZWQpIHsgLy9ObyBhcmd1bWVudHNcbiAgICAgICAgTGVmdCA9IDA7XG4gICAgICAgIENlaWwgPSAwO1xuICAgICAgICBSaWdodCA9IDA7XG4gICAgICAgIEZsb29yID0gMDtcblxuICAgIH0gZWxzZSBpZiAoQ2VpbCA9PT0gdW5kZWZpbmVkICYmIExlZnQgaW5zdGFuY2VvZiBBclJlY3QpIHsgLy8gT25lIGFyZ3VtZW50XG4gICAgICAgIC8vIExlZnQgaXMgYW4gQXJSZWN0XG4gICAgICAgIENlaWwgPSBMZWZ0LmNlaWw7XG4gICAgICAgIFJpZ2h0ID0gTGVmdC5yaWdodDtcbiAgICAgICAgRmxvb3IgPSBMZWZ0LmZsb29yO1xuICAgICAgICBMZWZ0ID0gTGVmdC5sZWZ0O1xuXG4gICAgfSBlbHNlIGlmIChSaWdodCA9PT0gdW5kZWZpbmVkICYmIExlZnQgaW5zdGFuY2VvZiBBclBvaW50KSB7IC8vIFR3byBhcmd1bWVudHNcbiAgICAgICAgLy8gQ3JlYXRpbmcgQXJSZWN0IHdpdGggQXJQb2ludCBhbmQgZWl0aGVyIGFub3RoZXIgQXJQb2ludCBvciBBclNpemVcbiAgICAgICAgaWYgKENlaWwgaW5zdGFuY2VvZiBBclNpemUpIHtcbiAgICAgICAgICAgIFJpZ2h0ID0gTGVmdC54ICsgQ2VpbC5jeDtcbiAgICAgICAgICAgIEZsb29yID0gTGVmdC55ICsgQ2VpbC5jeTtcbiAgICAgICAgICAgIENlaWwgPSBMZWZ0Lnk7XG4gICAgICAgICAgICBMZWZ0ID0gTGVmdC54O1xuXG4gICAgICAgIH0gZWxzZSBpZiAoTGVmdCBpbnN0YW5jZW9mIEFyUG9pbnQgJiYgQ2VpbCBpbnN0YW5jZW9mIEFyUG9pbnQpIHtcbiAgICAgICAgICAgIFJpZ2h0ID0gTWF0aC5yb3VuZChDZWlsLngpO1xuICAgICAgICAgICAgRmxvb3IgPSBNYXRoLnJvdW5kKENlaWwueSk7XG4gICAgICAgICAgICBDZWlsID0gTWF0aC5yb3VuZChMZWZ0LnkpO1xuICAgICAgICAgICAgTGVmdCA9IE1hdGgucm91bmQoTGVmdC54KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBclJlY3QgQ29uc3RydWN0b3InKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChGbG9vciA9PT0gdW5kZWZpbmVkKSB7IC8vIEludmFsaWRcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEFyUmVjdCBDb25zdHJ1Y3RvcicpO1xuICAgIH1cblxuICAgIHRoaXMubGVmdCA9IE1hdGgucm91bmQoTGVmdCk7XG4gICAgdGhpcy5jZWlsID0gTWF0aC5yb3VuZChDZWlsKTtcbiAgICB0aGlzLmZsb29yID0gTWF0aC5yb3VuZChGbG9vcik7XG4gICAgdGhpcy5yaWdodCA9IE1hdGgucm91bmQoUmlnaHQpO1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5nZXRDZW50ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHsneCc6ICh0aGlzLmxlZnQgKyB0aGlzLnJpZ2h0KSAvIDIsICd5JzogKHRoaXMuY2VpbCArIHRoaXMuZmxvb3IpIC8gMn07XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmdldFdpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5yaWdodCAtIHRoaXMubGVmdCk7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuZmxvb3IgLSB0aGlzLmNlaWwpO1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgQXJTaXplKHRoaXMuZ2V0V2lkdGgoKSwgdGhpcy5nZXRIZWlnaHQoKSk7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmdldFRvcExlZnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBBclBvaW50KHRoaXMubGVmdCwgdGhpcy5jZWlsKTtcbn07XG5cbkFyUmVjdC5wcm90b3R5cGUuZ2V0Qm90dG9tUmlnaHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBBclBvaW50KHRoaXMucmlnaHQsIHRoaXMuZmxvb3IpO1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5nZXRDZW50ZXJQb2ludCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IEFyUG9pbnQodGhpcy5sZWZ0ICsgdGhpcy5nZXRXaWR0aCgpIC8gMiwgdGhpcy5jZWlsICsgdGhpcy5nZXRIZWlnaHQoKSAvIDIpO1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5pc1JlY3RFbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoKHRoaXMubGVmdCA+PSB0aGlzLnJpZ2h0KSAmJiAodGhpcy5jZWlsID49IHRoaXMuZmxvb3IpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cblxuQXJSZWN0LnByb3RvdHlwZS5pc1JlY3ROdWxsID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmxlZnQgPT09IDAgJiZcbiAgICAgICAgdGhpcy5yaWdodCA9PT0gMCAmJlxuICAgICAgICB0aGlzLmNlaWwgPT09IDAgJiZcbiAgICAgICAgdGhpcy5mbG9vciA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLnB0SW5SZWN0ID0gZnVuY3Rpb24gKHB0KSB7XG4gICAgaWYgKHB0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgcHQgPSBwdFswXTtcbiAgICB9XG5cbiAgICBpZiAocHQueCA+PSB0aGlzLmxlZnQgJiZcbiAgICAgICAgcHQueCA8PSB0aGlzLnJpZ2h0ICYmXG4gICAgICAgIHB0LnkgPj0gdGhpcy5jZWlsICYmXG4gICAgICAgIHB0LnkgPD0gdGhpcy5mbG9vcikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLnNldFJlY3QgPSBmdW5jdGlvbiAobkxlZnQsIG5DZWlsLCBuUmlnaHQsIG5GbG9vcikge1xuICAgIGlmIChuQ2VpbCA9PT0gdW5kZWZpbmVkICYmIG5MZWZ0IGluc3RhbmNlb2YgQXJSZWN0KSB7IC8vXG4gICAgICAgIHRoaXMuYXNzaWduKG5MZWZ0KTtcblxuICAgIH0gZWxzZSBpZiAoblJpZ2h0ID09PSB1bmRlZmluZWQgfHwgbkZsb29yID09PSB1bmRlZmluZWQpIHsgLy9pbnZhbGlkXG4gICAgICAgIF9sb2dnZXIuZGVidWcoJ0ludmFsaWQgYXJncyBmb3IgW0FyUmVjdF0uc2V0UmVjdCcpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sZWZ0ID0gbkxlZnQ7XG4gICAgICAgIHRoaXMuY2VpbCA9IG5DZWlsO1xuICAgICAgICB0aGlzLnJpZ2h0ID0gblJpZ2h0O1xuICAgICAgICB0aGlzLmZsb29yID0gbkZsb29yO1xuICAgIH1cblxufTtcblxuQXJSZWN0LnByb3RvdHlwZS5zZXRSZWN0RW1wdHkgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB0aGlzLmNlaWwgPSAwO1xuICAgIHRoaXMucmlnaHQgPSAwO1xuICAgIHRoaXMuZmxvb3IgPSAwO1xuICAgIHRoaXMubGVmdCA9IDA7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmluZmxhdGVSZWN0ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBpZiAoeCAhPT0gdW5kZWZpbmVkICYmIHguY3ggIT09IHVuZGVmaW5lZCAmJiB4LmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgeSA9IHguY3k7XG4gICAgICAgIHggPSB4LmN4O1xuICAgIH0gZWxzZSBpZiAoeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHkgPSB4O1xuICAgIH1cblxuICAgIHRoaXMubGVmdCAtPSB4O1xuICAgIHRoaXMucmlnaHQgKz0geDtcbiAgICB0aGlzLmNlaWwgLT0geTtcbiAgICB0aGlzLmZsb29yICs9IHk7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmRlZmxhdGVSZWN0ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICBpZiAoeCAhPT0gdW5kZWZpbmVkICYmIHguY3ggIT09IHVuZGVmaW5lZCAmJiB4LmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgeSA9IHguY3k7XG4gICAgICAgIHggPSB4LmN4O1xuICAgIH1cblxuICAgIHRoaXMubGVmdCArPSB4O1xuICAgIHRoaXMucmlnaHQgLT0geDtcbiAgICB0aGlzLmNlaWwgKz0geTtcbiAgICB0aGlzLmZsb29yIC09IHk7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLm5vcm1hbGl6ZVJlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRlbXA7XG5cbiAgICBpZiAodGhpcy5sZWZ0ID4gdGhpcy5yaWdodCkge1xuICAgICAgICB0ZW1wID0gdGhpcy5sZWZ0O1xuICAgICAgICB0aGlzLmxlZnQgPSB0aGlzLnJpZ2h0O1xuICAgICAgICB0aGlzLnJpZ2h0ID0gdGVtcDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jZWlsID4gdGhpcy5mbG9vcikge1xuICAgICAgICB0ZW1wID0gdGhpcy5jZWlsO1xuICAgICAgICB0aGlzLmNlaWwgPSB0aGlzLmZsb29yO1xuICAgICAgICB0aGlzLmZsb29yID0gdGVtcDtcbiAgICB9XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmFzc2lnbiA9IGZ1bmN0aW9uIChyZWN0KSB7XG5cbiAgICB0aGlzLmNlaWwgPSByZWN0LmNlaWw7XG4gICAgdGhpcy5yaWdodCA9IHJlY3QucmlnaHQ7XG4gICAgdGhpcy5mbG9vciA9IHJlY3QuZmxvb3I7XG4gICAgdGhpcy5sZWZ0ID0gcmVjdC5sZWZ0O1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAocmVjdCkge1xuICAgIGlmICh0aGlzLmxlZnQgPT09IHJlY3QubGVmdCAmJlxuICAgICAgICB0aGlzLnJpZ2h0ID09PSByZWN0LnJpZ2h0ICYmXG4gICAgICAgIHRoaXMuY2VpbCA9PT0gcmVjdC5jZWlsICYmXG4gICAgICAgIHRoaXMuZmxvb3IgPT09IHJlY3QuZmxvb3IpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuXG59O1xuXG5BclJlY3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChBck9iamVjdCkge1xuICAgIHZhciBkeCxcbiAgICAgICAgZHk7XG4gICAgaWYgKEFyT2JqZWN0IGluc3RhbmNlb2YgQXJQb2ludCkge1xuICAgICAgICBkeCA9IEFyT2JqZWN0Lng7XG4gICAgICAgIGR5ID0gQXJPYmplY3QueTtcblxuICAgIH0gZWxzZSBpZiAoQXJPYmplY3QuY3ggIT09IHVuZGVmaW5lZCAmJiBBck9iamVjdC5jeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGR4ID0gQXJPYmplY3QuY3g7XG4gICAgICAgIGR5ID0gQXJPYmplY3QuY3k7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICBfbG9nZ2VyLmRlYnVnKCdJbnZhbGlkIGFyZyBmb3IgW0FyUmVjdF0uYWRkIG1ldGhvZCcpO1xuICAgIH1cblxuICAgIHRoaXMubGVmdCArPSBkeDtcbiAgICB0aGlzLnJpZ2h0ICs9IGR4O1xuICAgIHRoaXMuY2VpbCArPSBkeTtcbiAgICB0aGlzLmZsb29yICs9IGR5O1xufTtcblxuQXJSZWN0LnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIChBck9iamVjdCkge1xuICAgIGlmIChBck9iamVjdCBpbnN0YW5jZW9mIEFyUG9pbnQpIHtcbiAgICAgICAgdGhpcy5kZWZsYXRlUmVjdChBck9iamVjdC54LCBBck9iamVjdC55KTtcblxuICAgIH0gZWxzZSBpZiAoQXJPYmplY3QgaW5zdGFuY2VvZiBBclNpemUpIHtcbiAgICAgICAgdGhpcy5kZWZsYXRlUmVjdChBck9iamVjdCk7XG5cbiAgICB9IGVsc2UgaWYgKEFyT2JqZWN0IGluc3RhbmNlb2YgQXJSZWN0KSB7XG4gICAgICAgIHRoaXMubGVmdCArPSBBck9iamVjdC5sZWZ0O1xuICAgICAgICB0aGlzLnJpZ2h0IC09IEFyT2JqZWN0LnJpZ2h0O1xuICAgICAgICB0aGlzLmNlaWwgKz0gQXJPYmplY3QuY2VpbDtcbiAgICAgICAgdGhpcy5mbG9vciAtPSBBck9iamVjdC5mbG9vcjtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIF9sb2dnZXIuZGVidWcoJ0ludmFsaWQgYXJnIGZvciBbQXJSZWN0XS5zdWJ0cmFjdCBtZXRob2QnKTtcbiAgICB9XG59O1xuXG5BclJlY3QucHJvdG90eXBlLnBsdXMgPSBmdW5jdGlvbiAoQXJPYmplY3QpIHtcbiAgICB2YXIgcmVzT2JqZWN0ID0gbmV3IEFyUmVjdCh0aGlzKTtcbiAgICByZXNPYmplY3QuYWRkKEFyT2JqZWN0KTtcblxuICAgIHJldHVybiByZXNPYmplY3Q7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLm1pbnVzID0gZnVuY3Rpb24gKEFyT2JqZWN0KSB7XG4gICAgdmFyIHJlc09iamVjdCA9IG5ldyBBclJlY3QodGhpcyk7XG4gICAgcmVzT2JqZWN0LnN1YnRyYWN0KEFyT2JqZWN0KTtcblxuICAgIHJldHVybiByZXNPYmplY3Q7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLnVuaW9uQXNzaWduID0gZnVuY3Rpb24gKHJlY3QpIHtcbiAgICBpZiAocmVjdC5pc1JlY3RFbXB0eSgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNSZWN0RW1wdHkoKSkge1xuICAgICAgICB0aGlzLmFzc2lnbihyZWN0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vVGFrZSB0aGUgb3V0ZXJtb3N0IGRpbWVuc2lvblxuICAgIHRoaXMubGVmdCA9IE1hdGgubWluKHRoaXMubGVmdCwgcmVjdC5sZWZ0KTtcbiAgICB0aGlzLnJpZ2h0ID0gTWF0aC5tYXgodGhpcy5yaWdodCwgcmVjdC5yaWdodCk7XG4gICAgdGhpcy5jZWlsID0gTWF0aC5taW4odGhpcy5jZWlsLCByZWN0LmNlaWwpO1xuICAgIHRoaXMuZmxvb3IgPSBNYXRoLm1heCh0aGlzLmZsb29yLCByZWN0LmZsb29yKTtcblxufTtcblxuQXJSZWN0LnByb3RvdHlwZS51bmlvbiA9IGZ1bmN0aW9uIChyZWN0KSB7XG4gICAgdmFyIHJlc1JlY3QgPSBuZXcgQXJSZWN0KHRoaXMpO1xuICAgIHJlc1JlY3QudW5pb25Bc3NpZ24ocmVjdCk7XG5cbiAgICByZXR1cm4gcmVzUmVjdDtcbn07XG5cbkFyUmVjdC5wcm90b3R5cGUuaW50ZXJzZWN0QXNzaWduID0gZnVuY3Rpb24gKHJlY3QxLCByZWN0Mikge1xuICAgIHJlY3QyID0gcmVjdDIgPyByZWN0MiA6IHRoaXM7XG4gICAgLy9TZXRzIHRoaXMgcmVjdCB0byB0aGUgaW50ZXJzZWN0aW9uIHJlY3RcbiAgICB0aGlzLmxlZnQgPSBNYXRoLm1heChyZWN0MS5sZWZ0LCByZWN0Mi5sZWZ0KTtcbiAgICB0aGlzLnJpZ2h0ID0gTWF0aC5taW4ocmVjdDEucmlnaHQsIHJlY3QyLnJpZ2h0KTtcbiAgICB0aGlzLmNlaWwgPSBNYXRoLm1heChyZWN0MS5jZWlsLCByZWN0Mi5jZWlsKTtcbiAgICB0aGlzLmZsb29yID0gTWF0aC5taW4ocmVjdDEuZmxvb3IsIHJlY3QyLmZsb29yKTtcblxuICAgIGlmICh0aGlzLmxlZnQgPj0gdGhpcy5yaWdodCB8fCB0aGlzLmNlaWwgPj0gdGhpcy5mbG9vcikge1xuICAgICAgICB0aGlzLnNldFJlY3RFbXB0eSgpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLmludGVyc2VjdCA9IGZ1bmN0aW9uIChyZWN0KSB7XG4gICAgdmFyIHJlc1JlY3QgPSBuZXcgQXJSZWN0KHRoaXMpO1xuXG4gICAgcmVzUmVjdC5pbnRlcnNlY3RBc3NpZ24ocmVjdCk7XG4gICAgcmV0dXJuIHJlc1JlY3Q7XG59O1xuXG5BclJlY3QucHJvdG90eXBlLnRvdWNoaW5nID0gZnVuY3Rpb24gKHJlY3QpIHtcbiAgICAvL09uZSBwaXhlbCBpcyBhZGRlZCB0byB0aGUgbWluaW11bXMgc28sIGlmIHRoZXkgYXJlIG5vdCBkZWVtZWQgdG8gYmUgdG91Y2hpbmdcbiAgICAvL3RoZXJlIGlzIGd1YXJhbnRlZWQgdG8gYmUgYXQgbGVhc2UgYSBvbmUgcGl4ZWwgcGF0aCBiZXR3ZWVuIHRoZW1cbiAgICByZXR1cm4gTWF0aC5tYXgocmVjdC5sZWZ0LCB0aGlzLmxlZnQpIDw9IE1hdGgubWluKHJlY3QucmlnaHQsIHRoaXMucmlnaHQpICsgMSAmJlxuICAgICAgICBNYXRoLm1heChyZWN0LmNlaWwsIHRoaXMuY2VpbCkgPD0gTWF0aC5taW4ocmVjdC5mbG9vciwgdGhpcy5mbG9vcikgKyAxO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHBvaW50IGlzIG9uIG9uZSBvZiB0aGUgY29ybmVycyBvZiB0aGUgcmVjdGFuZ2xlLlxuICpcbiAqIEBwYXJhbSBwb2ludFxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BclJlY3QucHJvdG90eXBlLm9uQ29ybmVyID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgdmFyIG9uSG9yaXpvbnRhbFNpZGUsXG4gICAgICAgIG9uVmVydGljYWxTaWRlO1xuXG4gICAgb25Ib3Jpem9udGFsU2lkZSA9IHBvaW50LnggPT09IHRoaXMubGVmdCB8fCBwb2ludC54ID09PSB0aGlzLnJpZ2h0O1xuICAgIG9uVmVydGljYWxTaWRlID0gcG9pbnQueSA9PT0gdGhpcy5jZWlsIHx8IHBvaW50LnkgPT09IHRoaXMuZmxvb3I7XG5cbiAgICByZXR1cm4gb25Ib3Jpem9udGFsU2lkZSAmJiBvblZlcnRpY2FsU2lkZTtcbn07XG5cbkFyUmVjdC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VG9wTGVmdCgpLnRvU3RyaW5nKCkgKyAnICcgKyB0aGlzLmdldEJvdHRvbVJpZ2h0KCkudG9TdHJpbmcoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXJSZWN0O1xuIiwiLypqc2hpbnQgbm9kZTogdHJ1ZSovXG5cbi8qKlxuICogQGF1dGhvciBicm9sbGIgLyBodHRwczovL2dpdGh1Yi9icm9sbGJcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBBclNpemUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIC8vTXVsdGlwbGUgQ29uc3RydWN0b3JzXG4gICAgaWYgKHggPT09IHVuZGVmaW5lZCkgeyAvL05vIGFyZ3VtZW50cyB3ZXJlIHBhc3NlZCB0byBjb25zdHJ1Y3RvclxuICAgICAgICB4ID0gMDtcbiAgICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIGlmICh5ID09PSB1bmRlZmluZWQpIHsgLy9PbmUgYXJndW1lbnQgcGFzc2VkIHRvIGNvbnN0cnVjdG9yXG4gICAgICAgIHkgPSB4LmN5O1xuICAgICAgICB4ID0geC5jeDtcbiAgICB9XG5cbiAgICB0aGlzLmN4ID0geDtcbiAgICB0aGlzLmN5ID0geTtcbn07XG5cbkFyU2l6ZS5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG90aGVyU2l6ZSkge1xuICAgIGlmICh0aGlzLmN4ID09PSBvdGhlclNpemUuY3ggJiYgdGhpcy5jeSA9PT0gb3RoZXJTaXplLmN5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbkFyU2l6ZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKG90aGVyU2l6ZSkgeyAvL2VxdWl2YWxlbnQgdG8gKz1cbiAgICBpZiAob3RoZXJTaXplLmN4IHx8IG90aGVyU2l6ZS5jeSkge1xuICAgICAgICB0aGlzLmN4ICs9IG90aGVyU2l6ZS5jeDtcbiAgICAgICAgdGhpcy5jeSArPSBvdGhlclNpemUuY3k7XG4gICAgfVxuICAgIGlmIChvdGhlclNpemUueCB8fCBvdGhlclNpemUueSkge1xuICAgICAgICB0aGlzLmN4ICs9IG90aGVyU2l6ZS54O1xuICAgICAgICB0aGlzLmN5ICs9IG90aGVyU2l6ZS55O1xuICAgIH1cbn07XG5cbkFyU2l6ZS5wcm90b3R5cGUuZ2V0QXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHJlcy5wdXNoKHRoaXMuY3gpO1xuICAgIHJlcy5wdXNoKHRoaXMuY3kpO1xuICAgIHJldHVybiByZXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFyU2l6ZTtcbiIsIi8qanNoaW50IG5vZGU6IHRydWUqL1xuXG4vKipcbiAqIEBhdXRob3IgYnJvbGxiIC8gaHR0cHM6Ly9naXRodWIvYnJvbGxiXG4gKi9cblxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDT05TVEFOVFMgPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuQ29uc3RhbnRzJyksXG4gICAgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgQXJSZWN0ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlJlY3QnKSxcbiAgICBBclBvaW50ID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlBvaW50Jyk7XG5cbnZhciBfZ2V0T3B0aW1hbFBvcnRzID0gZnVuY3Rpb24gKHBvcnRzLCB0Z3QpIHtcbiAgICAvL0kgd2lsbCBnZXQgdGhlIGR4LCBkeSB0aGF0IHRvIHRoZSBzcmMvZHN0IHRhcmdldCBhbmQgdGhlbiBJIHdpbGwgY2FsY3VsYXRlXG4gICAgLy8gYSBwcmlvcml0eSB2YWx1ZSB0aGF0IHdpbGwgcmF0ZSB0aGUgcG9ydHMgYXMgY2FuZGlkYXRlcyBmb3IgdGhlIFxuICAgIC8vZ2l2ZW4gcGF0aFxuICAgIHZhciBzcmNDID0gbmV3IEFyUG9pbnQoKSwgLy9zcmMgY2VudGVyXG4gICAgICAgIHZlY3RvcixcbiAgICAgICAgcG9ydCwgLy9yZXN1bHRcbiAgICAgICAgbWF4UCA9IC1JbmZpbml0eSxcbiAgICAgICAgbWF4QXJlYSA9IDAsXG4gICAgICAgIHNQb2ludCxcbiAgICAgICAgaTtcblxuICAgIC8vR2V0IHRoZSBjZW50ZXIgcG9pbnRzIG9mIHRoZSBzcmMsZHN0IHBvcnRzXG4gICAgZm9yIChpID0gMDsgaSA8IHBvcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNQb2ludCA9IHBvcnRzW2ldLnJlY3QuZ2V0Q2VudGVyKCk7XG4gICAgICAgIHNyY0MueCArPSBzUG9pbnQueDtcbiAgICAgICAgc3JjQy55ICs9IHNQb2ludC55O1xuXG4gICAgICAgIC8vYWRqdXN0IG1heEFyZWFcbiAgICAgICAgaWYgKG1heEFyZWEgPCBwb3J0c1tpXS5nZXRUb3RhbEF2YWlsYWJsZUFyZWEoKSkge1xuICAgICAgICAgICAgbWF4QXJlYSA9IHBvcnRzW2ldLmdldFRvdGFsQXZhaWxhYmxlQXJlYSgpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICAvL0dldCB0aGUgYXZlcmFnZSBjZW50ZXIgcG9pbnQgb2Ygc3JjXG4gICAgc3JjQy54ID0gc3JjQy54IC8gcG9ydHMubGVuZ3RoO1xuICAgIHNyY0MueSA9IHNyY0MueSAvIHBvcnRzLmxlbmd0aDtcblxuICAgIC8vR2V0IHRoZSBkaXJlY3Rpb25zXG4gICAgdmVjdG9yID0gKHRndC5taW51cyhzcmNDKS5nZXRBcnJheSgpKTtcblxuICAgIC8vQ3JlYXRlIHByaW9yaXR5IGZ1bmN0aW9uXG4gICAgZnVuY3Rpb24gY3JlYXRlUHJpb3JpdHkocG9ydCwgY2VudGVyKSB7XG4gICAgICAgIHZhciBwcmlvcml0eSA9IDAsXG4gICAgICAgIC8vcG9pbnQgPSBbICBjZW50ZXIueCAtIHBvcnQucmVjdC5nZXRDZW50ZXIoKS54LCBjZW50ZXIueSAtIHBvcnQucmVjdC5nZXRDZW50ZXIoKS55XSxcbiAgICAgICAgICAgIHBvaW50ID0gW3BvcnQucmVjdC5nZXRDZW50ZXIoKS54IC0gY2VudGVyLngsIHBvcnQucmVjdC5nZXRDZW50ZXIoKS55IC0gY2VudGVyLnldLFxuICAgICAgICAgICAgbGluZUNvdW50ID0gKHBvcnQuZ2V0UG9pbnRDb3VudCgpIHx8IDEpLFxuICAgICAgICAgICAgLy9JZiB0aGVyZSBpcyBhIHByb2JsZW0gd2l0aCBtYXhBcmVhLCBqdXN0IGlnbm9yZSBkZW5zaXR5XG4gICAgICAgICAgICBkZW5zaXR5ID0gKHBvcnQuZ2V0VG90YWxBdmFpbGFibGVBcmVhKCkgLyBsaW5lQ291bnQpIC8gbWF4QXJlYSB8fCAxLFxuICAgICAgICAgICAgbWFqb3IgPSBNYXRoLmFicyh2ZWN0b3JbMF0pID4gTWF0aC5hYnModmVjdG9yWzFdKSA/IDAgOiAxLFxuICAgICAgICAgICAgbWlub3IgPSAobWFqb3IgKyAxKSAlIDI7XG5cbiAgICAgICAgaWYgKHBvaW50W21ham9yXSA+IDAgPT09IHZlY3RvclttYWpvcl0gPiAwICYmIChwb2ludFttYWpvcl0gPT09IDApID09PSAodmVjdG9yW21ham9yXSA9PT0gMCkpIHtcbiAgICAgICAgICAgIC8vaGFuZGxpbmcgdGhlID09PSAwIGVycm9yXG4gICAgICAgICAgICAvL0lmIHRoZXkgaGF2ZSB0aGUgc2FtZSBwYXJpdHksIGFzc2lnbiB0aGUgcHJpb3JpdHkgdG8gbWF4aW1pemUgdGhhdCBpcyA+IDFcbiAgICAgICAgICAgIHByaW9yaXR5ID0gKE1hdGguYWJzKHZlY3RvclttYWpvcl0pIC8gTWF0aC5hYnModmVjdG9yW21ham9yXSAtIHBvaW50W21ham9yXSkpICogMjU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9pbnRbbWlub3JdID4gMCA9PT0gdmVjdG9yW21pbm9yXSA+IDAgJiYgKHBvaW50W21pbm9yXSA9PT0gMCkgPT09ICh2ZWN0b3JbbWlub3JdID09PSAwKSkge1xuICAgICAgICAgICAgLy9oYW5kbGluZyB0aGUgPT09IDAgZXJyb3JcbiAgICAgICAgICAgIC8vSWYgdGhleSBoYXZlIHRoZSBzYW1lIHBhcml0eSwgYXNzaWduIHRoZSBwcmlvcml0eSB0byBtYXhpbWl6ZSB0aGF0IGlzIDwgMVxuICAgICAgICAgICAgcHJpb3JpdHkgKz0gdmVjdG9yW21pbm9yXSAhPT0gcG9pbnRbbWlub3JdID9cbiAgICAgICAgICAgIChNYXRoLmFicyh2ZWN0b3JbbWlub3JdKSAvIE1hdGguYWJzKHZlY3RvclttaW5vcl0gLSBwb2ludFttaW5vcl0pKSAqIDEgOiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9BZGp1c3QgcHJpb3JpdHkgYmFzZWQgb24gdGhlIGRlbnNpdHkgb2YgdGhlIGxpbmVzLi4uXG4gICAgICAgIHByaW9yaXR5ICo9IGRlbnNpdHk7XG5cbiAgICAgICAgcmV0dXJuIHByaW9yaXR5O1xuICAgIH1cblxuICAgIC8vQ3JlYXRlIHByaW9yaXR5IHZhbHVlcyBmb3IgZWFjaCBwb3J0LlxuICAgIHZhciBwcmlvcml0eTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgcG9ydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcHJpb3JpdHkgPSBjcmVhdGVQcmlvcml0eShwb3J0c1tpXSwgc3JjQykgfHwgMDtcbiAgICAgICAgaWYgKHByaW9yaXR5ID49IG1heFApIHtcbiAgICAgICAgICAgIHBvcnQgPSBwb3J0c1tpXTtcbiAgICAgICAgICAgIG1heFAgPSBwcmlvcml0eTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzc2VydChwb3J0Lm93bmVyLCAnQVJHcmFwaC5nZXRPcHRpbWFsUG9ydHM6IHBvcnQgaGFzIGludmFsaWQgb3duZXInKTtcblxuICAgIHJldHVybiBwb3J0O1xufTtcblxudmFyIF9nZXRQb2ludENvb3JkID0gZnVuY3Rpb24gKHBvaW50LCBob3JEaXIpIHtcbiAgICBpZiAoaG9yRGlyID09PSB0cnVlIHx8IF9pc0hvcml6b250YWwoaG9yRGlyKSkge1xuICAgICAgICByZXR1cm4gcG9pbnQueDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcG9pbnQueTtcbiAgICB9XG59O1xuXG52YXIgX2luZmxhdGVkUmVjdCA9IGZ1bmN0aW9uIChyZWN0LCBhKSB7XG4gICAgdmFyIHIgPSByZWN0O1xuICAgIHIuaW5mbGF0ZVJlY3QoYSwgYSk7XG4gICAgcmV0dXJuIHI7XG59O1xuXG52YXIgX2lzUG9pbnROZWFyID0gZnVuY3Rpb24gKHAxLCBwMiwgbmVhcm5lc3MpIHtcbiAgICByZXR1cm4gcDIueCAtIG5lYXJuZXNzIDw9IHAxLnggJiYgcDEueCA8PSBwMi54ICsgbmVhcm5lc3MgJiZcbiAgICAgICAgcDIueSAtIG5lYXJuZXNzIDw9IHAxLnkgJiYgcDEueSA8PSBwMi55ICsgbmVhcm5lc3M7XG59O1xuXG52YXIgX2lzUG9pbnRJbiA9IGZ1bmN0aW9uIChwb2ludCwgcmVjdCwgbmVhcm5lc3MpIHtcbiAgICB2YXIgdG1wUiA9IG5ldyBBclJlY3QocmVjdCk7XG4gICAgdG1wUi5pbmZsYXRlUmVjdChuZWFybmVzcywgbmVhcm5lc3MpO1xuICAgIHJldHVybiB0bXBSLnB0SW5SZWN0KHBvaW50KSA9PT0gdHJ1ZTtcbn07XG5cbnZhciBfaXNSZWN0SW4gPSBmdW5jdGlvbiAocjEsIHIyKSB7XG4gICAgcmV0dXJuIHIyLmxlZnQgPD0gcjEubGVmdCAmJiByMS5yaWdodCA8PSByMi5yaWdodCAmJlxuICAgICAgICByMi5jZWlsIDw9IHIxLmNlaWwgJiYgcjEuZmxvb3IgPD0gcjIuZmxvb3I7XG59O1xuXG52YXIgX2lzUmVjdENsaXAgPSBmdW5jdGlvbiAocjEsIHIyKSB7XG4gICAgdmFyIHJlY3QgPSBuZXcgQXJSZWN0KCk7XG4gICAgcmV0dXJuIHJlY3QuaW50ZXJzZWN0QXNzaWduKHIxLCByMikgPT09IHRydWU7XG59O1xuXG52YXIgX2Rpc3RhbmNlRnJvbUhMaW5lID0gZnVuY3Rpb24gKHAsIHgxLCB4MiwgeSkge1xuICAgIGFzc2VydCh4MSA8PSB4MiwgJ0FySGVscGVyLmRpc3RhbmNlRnJvbUhMaW5lOiB4MSA8PSB4MiBGQUlMRUQnKTtcblxuICAgIHJldHVybiBNYXRoLm1heChNYXRoLmFicyhwLnkgLSB5KSwgTWF0aC5tYXgoeDEgLSBwLngsIHAueCAtIHgyKSk7XG59O1xuXG52YXIgX2Rpc3RhbmNlRnJvbVZMaW5lID0gZnVuY3Rpb24gKHAsIHkxLCB5MiwgeCkge1xuICAgIGFzc2VydCh5MSA8PSB5MiwgJ0FySGVscGVyLmRpc3RhbmNlRnJvbVZMaW5lOiB5MSA8PSB5MiBGQUlMRUQnKTtcblxuICAgIHJldHVybiBNYXRoLm1heChNYXRoLmFicyhwLnggLSB4KSwgTWF0aC5tYXgoeTEgLSBwLnksIHAueSAtIHkyKSk7XG59O1xuXG52YXIgX2Rpc3RhbmNlRnJvbUxpbmUgPSBmdW5jdGlvbiAocHQsIHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgZGlyID0gX2dldERpcihlbmQubWludXMoc3RhcnQpKTtcblxuICAgIGlmIChfaXNIb3Jpem9udGFsKGRpcikpIHtcbiAgICAgICAgcmV0dXJuIF9kaXN0YW5jZUZyb21WTGluZShwdCwgc3RhcnQueSwgZW5kLnksIHN0YXJ0LngpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBfZGlzdGFuY2VGcm9tSExpbmUocHQsIHN0YXJ0LngsIGVuZC54LCBzdGFydC55KTtcbiAgICB9XG59O1xuXG52YXIgX2lzT25FZGdlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQsIHB0KSB7XG4gICAgaWYgKHN0YXJ0LnggPT09IGVuZC54KSB7XHRcdFx0Ly8gdmVydGljYWwgZWRnZSwgaG9yaXpvbnRhbCBtb3ZlXG4gICAgICAgIGlmIChlbmQueCA9PT0gcHQueCAmJiBwdC55IDw9IE1hdGgubWF4KGVuZC55LCBzdGFydC55KSAmJiBwdC55ID49IE1hdGgubWluKGVuZC55LCBzdGFydC55KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0YXJ0LnkgPT09IGVuZC55KSB7XHQvLyBob3Jpem9udGFsIGxpbmUsIHZlcnRpY2FsIG1vdmVcbiAgICAgICAgaWYgKHN0YXJ0LnkgPT09IHB0LnkgJiYgcHQueCA8PSBNYXRoLm1heChlbmQueCwgc3RhcnQueCkgJiYgcHQueCA+PSBNYXRoLm1pbihlbmQueCwgc3RhcnQueCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIF9pc1BvaW50TmVhckxpbmUgPSBmdW5jdGlvbiAocG9pbnQsIHN0YXJ0LCBlbmQsIG5lYXJuZXNzKSB7XG4gICAgYXNzZXJ0KDAgPD0gbmVhcm5lc3MsICdBckhlbHBlci5pc1BvaW50TmVhckxpbmU6IDAgPD0gbmVhcm5lc3MgRkFJTEVEJyk7XG5cbiAgICAvLyBiZWdpbiBab2xtb2xcbiAgICAvLyB0aGUgcm91dGluZyBtYXkgY3JlYXRlIGVkZ2VzIHRoYXQgaGF2ZSBzdGFydD09ZW5kXG4gICAgLy8gdGh1cyBjb25mdXNpbmcgdGhpcyBhbGdvcml0aG1cbiAgICBpZiAoZW5kLnggPT09IHN0YXJ0LnggJiYgZW5kLnkgPT09IHN0YXJ0LnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBlbmQgWm9sbW9sXG5cbiAgICB2YXIgcG9pbnQyID0gcG9pbnQ7XG5cbiAgICBwb2ludDIuc3VidHJhY3Qoc3RhcnQpO1xuXG4gICAgdmFyIGVuZDIgPSBlbmQ7XG4gICAgZW5kMi5zdWJ0cmFjdChzdGFydCk7XG5cbiAgICB2YXIgeCA9IGVuZDIueCxcbiAgICAgICAgeSA9IGVuZDIueSxcbiAgICAgICAgdSA9IHBvaW50Mi54LFxuICAgICAgICB2ID0gcG9pbnQyLnksXG4gICAgICAgIHh1eXYgPSB4ICogdSArIHkgKiB2LFxuICAgICAgICB4MnkyID0geCAqIHggKyB5ICogeTtcblxuICAgIGlmICh4dXl2IDwgMCB8fCB4dXl2ID4geDJ5Mikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGV4cHIxID0gKHggKiB2IC0geSAqIHUpO1xuICAgIGV4cHIxICo9IGV4cHIxO1xuICAgIHZhciBleHByMiA9IG5lYXJuZXNzICogbmVhcm5lc3MgKiB4MnkyO1xuXG4gICAgcmV0dXJuIGV4cHIxIDw9IGV4cHIyO1xufTtcblxudmFyIF9pc0xpbmVNZWV0SExpbmUgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCwgeDEsIHgyLCB5KSB7XG4gICAgYXNzZXJ0KHgxIDw9IHgyLCAnQXJIZWxwZXIuaXNMaW5lTWVldEhMaW5lOiB4MSA8PSB4MiBGQUlMRUQnKTtcbiAgICBpZiAoc3RhcnQgaW5zdGFuY2VvZiBBcnJheSkgey8vQ29udmVydGluZyBmcm9tICdwb2ludGVyJ1xuICAgICAgICBzdGFydCA9IHN0YXJ0WzBdO1xuICAgIH1cbiAgICBpZiAoZW5kIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZW5kID0gZW5kWzBdO1xuICAgIH1cblxuICAgIGlmICghKChzdGFydC55IDw9IHkgJiYgeSA8PSBlbmQueSkgfHwgKGVuZC55IDw9IHkgJiYgeSA8PSBzdGFydC55ICkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZW5kMiA9IG5ldyBBclBvaW50KGVuZCk7XG4gICAgZW5kMi5zdWJ0cmFjdChzdGFydCk7XG4gICAgeDEgLT0gc3RhcnQueDtcbiAgICB4MiAtPSBzdGFydC54O1xuICAgIHkgLT0gc3RhcnQueTtcblxuICAgIGlmIChlbmQyLnkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHkgPT09IDAgJiYgKCggeDEgPD0gMCAmJiAwIDw9IHgyICkgfHwgKHgxIDw9IGVuZDIueCAmJiBlbmQyLnggPD0geDIpKTtcbiAgICB9XG5cbiAgICB2YXIgeCA9ICgoZW5kMi54KSAvIGVuZDIueSkgKiB5O1xuICAgIHJldHVybiB4MSA8PSB4ICYmIHggPD0geDI7XG59O1xuXG52YXIgX2lzTGluZU1lZXRWTGluZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kLCB5MSwgeTIsIHgpIHtcbiAgICBhc3NlcnQoeTEgPD0geTIsICdBckhlbHBlci5pc0xpbmVNZWV0VkxpbmU6IHkxIDw9IHkyICBGQUlMRUQnKTtcbiAgICBpZiAoc3RhcnQgaW5zdGFuY2VvZiBBcnJheSkgey8vQ29udmVydGluZyBmcm9tICdwb2ludGVyJ1xuICAgICAgICBzdGFydCA9IHN0YXJ0WzBdO1xuICAgIH1cbiAgICBpZiAoZW5kIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZW5kID0gZW5kWzBdO1xuICAgIH1cblxuICAgIGlmICghKChzdGFydC54IDw9IHggJiYgeCA8PSBlbmQueCkgfHwgKGVuZC54IDw9IHggJiYgeCA8PSBzdGFydC54ICkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZW5kMiA9IG5ldyBBclBvaW50KGVuZCk7XG4gICAgZW5kMi5zdWJ0cmFjdChzdGFydCk7XG4gICAgeTEgLT0gc3RhcnQueTtcbiAgICB5MiAtPSBzdGFydC55O1xuICAgIHggLT0gc3RhcnQueDtcblxuICAgIGlmIChlbmQyLnggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHggPT09IDAgJiYgKCggeTEgPD0gMCAmJiAwIDw9IHkyICkgfHwgKHkxIDw9IGVuZDIueSAmJiBlbmQyLnkgPD0geTIpKTtcbiAgICB9XG5cbiAgICB2YXIgeSA9ICgoZW5kMi55KSAvIGVuZDIueCkgKiB4O1xuICAgIHJldHVybiB5MSA8PSB5ICYmIHkgPD0geTI7XG59O1xuXG52YXIgX2lzTGluZUNsaXBSZWN0cyA9IGZ1bmN0aW9uIChzdGFydCwgZW5kLCByZWN0cykge1xuICAgIHZhciBpID0gcmVjdHMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgaWYgKF9pc0xpbmVDbGlwUmVjdChzdGFydCwgZW5kLCByZWN0c1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBfaXNMaW5lQ2xpcFJlY3QgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCwgcmVjdCkge1xuICAgIGlmIChyZWN0LnB0SW5SZWN0KHN0YXJ0KSB8fCByZWN0LnB0SW5SZWN0KGVuZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9pc0xpbmVNZWV0SExpbmUoc3RhcnQsIGVuZCwgcmVjdC5sZWZ0LCByZWN0LnJpZ2h0LCByZWN0LmNlaWwpIHx8XG4gICAgICAgIF9pc0xpbmVNZWV0SExpbmUoc3RhcnQsIGVuZCwgcmVjdC5sZWZ0LCByZWN0LnJpZ2h0LCByZWN0LmZsb29yKSB8fFxuICAgICAgICBfaXNMaW5lTWVldFZMaW5lKHN0YXJ0LCBlbmQsIHJlY3QuY2VpbCwgcmVjdC5mbG9vciwgcmVjdC5sZWZ0KSB8fFxuICAgICAgICBfaXNMaW5lTWVldFZMaW5lKHN0YXJ0LCBlbmQsIHJlY3QuY2VpbCwgcmVjdC5mbG9vciwgcmVjdC5yaWdodCk7XG59O1xuXG52YXIgX2dldExpbmVDbGlwUmVjdEludGVyc2VjdCA9IGZ1bmN0aW9uIChzdGFydCwgZW5kLCByZWN0KSB7XG4gICAgLy9yZXR1cm4gdGhlIGVuZHBvaW50cyBvZiB0aGUgaW50ZXJzZWN0aW9uIGxpbmVcbiAgICB2YXIgZGlyID0gX2dldERpcihlbmQubWludXMoc3RhcnQpKSxcbiAgICAgICAgZW5kcG9pbnRzID0gW25ldyBBclBvaW50KHN0YXJ0KSwgbmV3IEFyUG9pbnQoZW5kKV07XG5cbiAgICBpZiAoIV9pc0xpbmVDbGlwUmVjdChzdGFydCwgZW5kLCByZWN0KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBhc3NlcnQoX2lzUmlnaHRBbmdsZShkaXIpLCAnQXJIZWxwZXIuZ2V0TGluZUNsaXBSZWN0SW50ZXJzZWN0OiBfaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG5cbiAgICAvL01ha2Ugc3VyZSB3ZSBhcmUgd29ya2luZyBsZWZ0IHRvIHJpZ2h0IG9yIHRvcCBkb3duXG4gICAgaWYgKGRpciA9PT0gQ09OU1RBTlRTLkRpckxlZnQgfHwgZGlyID09PSBDT05TVEFOVFMuRGlyVG9wKSB7XG4gICAgICAgIGRpciA9IF9yZXZlcnNlRGlyKGRpcik7XG4gICAgICAgIGVuZHBvaW50cy5wdXNoKGVuZHBvaW50cy5zcGxpY2UoMCwgMSlbMF0pOyAvL1N3YXAgcG9pbnQgMCBhbmQgcG9pbnQgMVxuICAgIH1cblxuICAgIGlmIChfaXNQb2ludEluRGlyRnJvbShlbmRwb2ludHNbMF0sIHJlY3QuZ2V0VG9wTGVmdCgpLCBfcmV2ZXJzZURpcihkaXIpKSkge1xuICAgICAgICBlbmRwb2ludHNbMF0uYXNzaWduKHJlY3QuZ2V0VG9wTGVmdCgpKTtcbiAgICB9XG5cbiAgICBpZiAoX2lzUG9pbnRJbkRpckZyb20oZW5kcG9pbnRzWzFdLCByZWN0LmdldEJvdHRvbVJpZ2h0KCksIGRpcikpIHtcbiAgICAgICAgZW5kcG9pbnRzWzFdLmFzc2lnbihyZWN0LmdldEJvdHRvbVJpZ2h0KCkpO1xuICAgIH1cblxuICAgIGlmIChfaXNIb3Jpem9udGFsKGRpcikpIHtcbiAgICAgICAgZW5kcG9pbnRzWzBdLnkgPSBzdGFydC55O1xuICAgICAgICBlbmRwb2ludHNbMV0ueSA9IGVuZC55O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVuZHBvaW50c1swXS54ID0gc3RhcnQueDtcbiAgICAgICAgZW5kcG9pbnRzWzFdLnggPSBlbmQueDtcbiAgICB9XG5cbiAgICByZXR1cm4gZW5kcG9pbnRzO1xuXG59O1xuXG52YXIgX2ludGVyc2VjdCA9IGZ1bmN0aW9uIChhMSwgYTIsIGIxLCBiMikge1xuICAgIHJldHVybiBNYXRoLm1pbihhMSwgYTIpIDw9IE1hdGgubWF4KGIxLCBiMikgJiYgTWF0aC5taW4oYjEsIGIyKSA8PSBNYXRoLm1heChhMSwgYTIpO1xufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFJvdXRpbmdEaXJlY3Rpb25cblxudmFyIF9pc0hvcml6b250YWwgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgcmV0dXJuIGRpciA9PT0gQ09OU1RBTlRTLkRpclJpZ2h0IHx8IGRpciA9PT0gQ09OU1RBTlRTLkRpckxlZnQ7XG59O1xuXG52YXIgX2lzVmVydGljYWwgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgcmV0dXJuIGRpciA9PT0gQ09OU1RBTlRTLkRpclRvcCB8fCBkaXIgPT09IENPTlNUQU5UUy5EaXJCb3R0b207XG59O1xuXG52YXIgX2lzUmlnaHRBbmdsZSA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICByZXR1cm4gQ09OU1RBTlRTLkRpclRvcCA8PSBkaXIgJiYgZGlyIDw9IENPTlNUQU5UUy5EaXJMZWZ0O1xufTtcblxudmFyIF9hcmVJblJpZ2h0QW5nbGUgPSBmdW5jdGlvbiAoZGlyMSwgZGlyMikge1xuICAgIGFzc2VydChfaXNSaWdodEFuZ2xlKGRpcjEpICYmIF9pc1JpZ2h0QW5nbGUoZGlyMiksXG4gICAgICAgICdBckhlbHBlci5hcmVJblJpZ2h0QW5nbGU6IF9pc1JpZ2h0QW5nbGUoZGlyMSkgJiYgX2lzUmlnaHRBbmdsZShkaXIyKSBGQUlMRUQnKTtcbiAgICByZXR1cm4gX2lzSG9yaXpvbnRhbChkaXIxKSA9PT0gX2lzVmVydGljYWwoZGlyMik7XG59O1xuXG52YXIgX25leHRDbG9ja3dpc2VEaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgaWYgKF9pc1JpZ2h0QW5nbGUoZGlyKSkge1xuICAgICAgICByZXR1cm4gKChkaXIgKyAxKSAlIDQpO1xuICAgIH1cblxuICAgIHJldHVybiBkaXI7XG59O1xuXG52YXIgX3ByZXZDbG9ja3dpc2VEaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgaWYgKF9pc1JpZ2h0QW5nbGUoZGlyKSkge1xuICAgICAgICByZXR1cm4gKChkaXIgKyAzKSAlIDQpO1xuICAgIH1cblxuICAgIHJldHVybiBkaXI7XG59O1xuXG52YXIgX3JldmVyc2VEaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgaWYgKF9pc1JpZ2h0QW5nbGUoZGlyKSkge1xuICAgICAgICByZXR1cm4gKChkaXIgKyAyKSAlIDQpO1xuICAgIH1cblxuICAgIHJldHVybiBkaXI7XG59O1xuXG52YXIgX3N0ZXBPbmVJbkRpciA9IGZ1bmN0aW9uIChwb2ludCwgZGlyKSB7XG4gICAgYXNzZXJ0KF9pc1JpZ2h0QW5nbGUoZGlyKSwgJ0FySGVscGVyLnN0ZXBPbkluRGlyOiBfaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG5cbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJUb3A6XG4gICAgICAgICAgICBwb2ludC55LS07XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJSaWdodDpcbiAgICAgICAgICAgIHBvaW50LngrKztcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpckJvdHRvbTpcbiAgICAgICAgICAgIHBvaW50LnkrKztcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpckxlZnQ6XG4gICAgICAgICAgICBwb2ludC54LS07XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbn07XG5cbnZhciBfZ2V0Q2hpbGRSZWN0T3V0ZXJDb29yZEZyb20gPSBmdW5jdGlvbiAoYnVmZmVyT2JqZWN0LCBpbkRpciwgcG9pbnQpIHsgLy9Qb2ludCB0cmF2ZWxzIGluRGlyIHVudGlsIGhpdHMgY2hpbGQgYm94XG4gICAgdmFyIGNoaWxkcmVuID0gYnVmZmVyT2JqZWN0LmNoaWxkcmVuLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIGJveCA9IG51bGwsXG4gICAgICAgIHJlcyA9IF9nZXRSZWN0T3V0ZXJDb29yZChidWZmZXJPYmplY3QuYm94LCBpbkRpcik7XG5cbiAgICBhc3NlcnQoX2lzUmlnaHRBbmdsZShpbkRpciksICdnZXRDaGlsZFJlY3RPdXRlckNvb3JkRnJvbTogX2lzUmlnaHRBbmdsZShpbkRpcikgRkFJTEVEJyk7XG4gICAgLy9UaGUgbmV4dCBhc3NlcnQgZmFpbHMgaWYgdGhlIHBvaW50IGlzIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24gb2YgdGhlIHJlY3RhbmdsZSB0aGF0IGl0IGlzIGNoZWNraW5nLlxuICAgIC8vIGUuZy4gVGhlIHBvaW50IGlzIGNoZWNraW5nIHdoZW4gaXQgd2lsbCBoaXQgdGhlIGJveCBmcm9tIHRoZSByaWdodCBidXQgdGhlIHBvaW50IGlzIG9uIHRoZSBsZWZ0XG4gICAgYXNzZXJ0KCFfaXNQb2ludEluRGlyRnJvbShwb2ludCwgYnVmZmVyT2JqZWN0LmJveCwgaW5EaXIpLFxuICAgICAgICAnZ2V0Q2hpbGRSZWN0T3V0ZXJDb29yZEZyb206ICFpc1BvaW50SW5EaXJGcm9tKHBvaW50LCBidWZmZXJPYmplY3QuYm94LnJlY3QsIChpbkRpcikpIEZBSUxFRCcpO1xuXG4gICAgd2hpbGUgKCsraSA8IGNoaWxkcmVuLmxlbmd0aCkge1xuXG4gICAgICAgIGlmIChfaXNQb2ludEluRGlyRnJvbShwb2ludCwgY2hpbGRyZW5baV0sIF9yZXZlcnNlRGlyKGluRGlyKSkgJiZcbiAgICAgICAgICAgIF9pc1BvaW50QmV0d2VlblNpZGVzKHBvaW50LCBjaGlsZHJlbltpXSwgaW5EaXIpICYmXG4gICAgICAgICAgICBfaXNDb29yZEluRGlyRnJvbShyZXMsIF9nZXRSZWN0T3V0ZXJDb29yZChjaGlsZHJlbltpXSwgX3JldmVyc2VEaXIoaW5EaXIpKSwgKGluRGlyKSkpIHtcblxuICAgICAgICAgICAgcmVzID0gX2dldFJlY3RPdXRlckNvb3JkKGNoaWxkcmVuW2ldLCBfcmV2ZXJzZURpcihpbkRpcikpO1xuICAgICAgICAgICAgYm94ID0gY2hpbGRyZW5baV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geydib3gnOiBib3gsICdjb29yZCc6IHJlc307XG59O1xuXG52YXIgX2dldFJlY3RPdXRlckNvb3JkID0gZnVuY3Rpb24gKHJlY3QsIGRpcikge1xuICAgIGFzc2VydChfaXNSaWdodEFuZ2xlKGRpciksICdVdGlscy5nZXRSZWN0T3V0ZXJDb29yZDogaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG4gICAgdmFyIHQgPSByZWN0LmNlaWwgLSAxLFxuICAgICAgICByID0gcmVjdC5yaWdodCArIDEsXG4gICAgICAgIGIgPSByZWN0LmZsb29yICsgMSxcbiAgICAgICAgbCA9IHJlY3QubGVmdCAtIDE7XG5cbiAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJUb3A6XG4gICAgICAgICAgICByZXR1cm4gdDtcblxuICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJSaWdodDpcbiAgICAgICAgICAgIHJldHVybiByO1xuXG4gICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpckJvdHRvbTpcbiAgICAgICAgICAgIHJldHVybiBiO1xuICAgIH1cblxuICAgIHJldHVybiBsO1xufTtcblxuLy9cdEluZGV4ZXM6XG4vL1x0XHRcdFx0IDA0XG4vL1x0XHRcdFx0MSAgNVxuLy9cdFx0XHRcdDMgIDdcbi8vXHRcdFx0XHQgMjZcblxudmFyIGdldERpclRhYmxlSW5kZXggPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgcmV0dXJuIChvZmZzZXQuY3ggPj0gMCkgKiA0ICsgKG9mZnNldC5jeSA+PSAwKSAqIDIgKyAoTWF0aC5hYnMob2Zmc2V0LmN4KSA+PSBNYXRoLmFicyhvZmZzZXQuY3kpKTtcbn07XG5cbnZhciBtYWpvckRpclRhYmxlID1cbiAgICBbXG4gICAgICAgIENPTlNUQU5UUy5EaXJUb3AsXG4gICAgICAgIENPTlNUQU5UUy5EaXJMZWZ0LFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyTGVmdCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclJpZ2h0LFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyUmlnaHRcbiAgICBdO1xuXG52YXIgX2dldE1ham9yRGlyID0gZnVuY3Rpb24gKG9mZnNldCkge1xuICAgIHJldHVybiBtYWpvckRpclRhYmxlW2dldERpclRhYmxlSW5kZXgob2Zmc2V0KV07XG59O1xuXG52YXIgbWlub3JEaXJUYWJsZSA9XG4gICAgW1xuICAgICAgICBDT05TVEFOVFMuRGlyTGVmdCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpckxlZnQsXG4gICAgICAgIENPTlNUQU5UUy5EaXJCb3R0b20sXG4gICAgICAgIENPTlNUQU5UUy5EaXJSaWdodCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclJpZ2h0LFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tXG4gICAgXTtcblxudmFyIF9nZXRNaW5vckRpciA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICByZXR1cm4gbWlub3JEaXJUYWJsZVtnZXREaXJUYWJsZUluZGV4KG9mZnNldCldO1xufTtcblxuLy9cdEZHMTIzXG4vL1x0RSAgIDRcbi8vXHREIDAgNVxuLy9cdEMgICA2XG4vLyAgQkE5ODdcblxuXG52YXIgX2V4R2V0RGlyVGFibGVJbmRleCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICAvL1RoaXMgcmVxdWlyZWQgYSB2YXJpYWJsZSBhc3NpZ25tZW50OyBvdGhlcndpc2UgdGhpcyBmdW5jdGlvblxuICAgIC8vcmV0dXJuZWQgdW5kZWZpbmVkLi4uXG4gICAgdmFyIHJlcyA9XG4gICAgICAgIG9mZnNldC5jeCA+IDAgP1xuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIG9mZnNldC5jeSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQuY3ggPiBvZmZzZXQuY3kgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgNlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChvZmZzZXQuY3ggPCBvZmZzZXQuY3kgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpXG4gICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAob2Zmc2V0LmN5IDwgMCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0LmN4ID4gLW9mZnNldC5jeSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChvZmZzZXQuY3ggPCAtb2Zmc2V0LmN5ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApKVxuICAgICAgICAgICAgICAgICAgICAgICAgKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgNVxuICAgICAgICAgICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgKG9mZnNldC5jeCA8IDAgP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0LmN5ID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLW9mZnNldC5jeCA+IG9mZnNldC5jeSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoLW9mZnNldC5jeCA8IG9mZnNldC5jeSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDExXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApKVxuICAgICAgICAgICAgICAgICAgICAgICAgKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAob2Zmc2V0LmN5IDwgMCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQuY3ggPCBvZmZzZXQuY3kgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDE0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChvZmZzZXQuY3ggPiBvZmZzZXQuY3kgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMTZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDE1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSlcbiAgICAgICAgICAgICAgICApIDpcbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldC5jeSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDlcbiAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgKG9mZnNldC5jeSA8IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpXG4gICAgICAgICAgICAgICAgKSk7XG5cbiAgICByZXR1cm4gcmVzO1xufTtcbnZhciBleE1ham9yRGlyVGFibGUgPVxuICAgIFtcbiAgICAgICAgQ09OU1RBTlRTLkRpck5vbmUsXG4gICAgICAgIENPTlNUQU5UUy5EaXJUb3AsXG4gICAgICAgIENPTlNUQU5UUy5EaXJUb3AsXG4gICAgICAgIENPTlNUQU5UUy5EaXJSaWdodCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclJpZ2h0LFxuICAgICAgICBDT05TVEFOVFMuRGlyUmlnaHQsXG4gICAgICAgIENPTlNUQU5UUy5EaXJSaWdodCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclJpZ2h0LFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyTGVmdCxcbiAgICAgICAgQ09OU1RBTlRTLkRpckxlZnQsXG4gICAgICAgIENPTlNUQU5UUy5EaXJMZWZ0LFxuICAgICAgICBDT05TVEFOVFMuRGlyTGVmdCxcbiAgICAgICAgQ09OU1RBTlRTLkRpckxlZnQsXG4gICAgICAgIENPTlNUQU5UUy5EaXJUb3BcbiAgICBdO1xuXG52YXIgX2V4R2V0TWFqb3JEaXIgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgcmV0dXJuIGV4TWFqb3JEaXJUYWJsZVtfZXhHZXREaXJUYWJsZUluZGV4KG9mZnNldCldO1xufTtcblxudmFyIGV4TWlub3JEaXJUYWJsZSA9XG4gICAgW1xuICAgICAgICBDT05TVEFOVFMuRGlyTm9uZSxcbiAgICAgICAgQ09OU1RBTlRTLkRpck5vbmUsXG4gICAgICAgIENPTlNUQU5UUy5EaXJSaWdodCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpck5vbmUsXG4gICAgICAgIENPTlNUQU5UUy5EaXJCb3R0b20sXG4gICAgICAgIENPTlNUQU5UUy5EaXJCb3R0b20sXG4gICAgICAgIENPTlNUQU5UUy5EaXJSaWdodCxcbiAgICAgICAgQ09OU1RBTlRTLkRpck5vbmUsXG4gICAgICAgIENPTlNUQU5UUy5EaXJMZWZ0LFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyQm90dG9tLFxuICAgICAgICBDT05TVEFOVFMuRGlyTm9uZSxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpclRvcCxcbiAgICAgICAgQ09OU1RBTlRTLkRpckxlZnRcbiAgICBdO1xuXG52YXIgX2V4R2V0TWlub3JEaXIgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgcmV0dXJuIGV4TWlub3JEaXJUYWJsZVtfZXhHZXREaXJUYWJsZUluZGV4KG9mZnNldCldO1xufTtcblxudmFyIF9nZXREaXIgPSBmdW5jdGlvbiAob2Zmc2V0LCBub2Rpcikge1xuICAgIGlmIChvZmZzZXQuY3ggPT09IDApIHtcbiAgICAgICAgaWYgKG9mZnNldC5jeSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGlyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9mZnNldC5jeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBDT05TVEFOVFMuRGlyVG9wO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIENPTlNUQU5UUy5EaXJCb3R0b207XG4gICAgfVxuXG4gICAgaWYgKG9mZnNldC5jeSA9PT0gMCkge1xuICAgICAgICBpZiAob2Zmc2V0LmN4ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIENPTlNUQU5UUy5EaXJSaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBDT05TVEFOVFMuRGlyTGVmdDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ09OU1RBTlRTLkRpclNrZXc7XG59O1xuXG52YXIgX2lzUG9pbnRJbkRpckZyb21DaGlsZHJlbiA9IGZ1bmN0aW9uIChwb2ludCwgZnJvbVBhcmVudCwgZGlyKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gZnJvbVBhcmVudC5jaGlsZHJlbixcbiAgICAgICAgaSA9IDA7XG5cbiAgICBhc3NlcnQoX2lzUmlnaHRBbmdsZShkaXIpLCAnaXNQb2ludEluRGlyRnJvbUNoaWxkcmVuOiBfaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG5cbiAgICB3aGlsZSAoaSA8IGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBpZiAoX2lzUG9pbnRJbkRpckZyb20ocG9pbnQsIGNoaWxkcmVuW2ldLnJlY3QsIGRpcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgICsraTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgX2lzUG9pbnRJbkRpckZyb20gPSBmdW5jdGlvbiAocG9pbnQsIGZyb20sIGRpcikge1xuICAgIGlmIChmcm9tIGluc3RhbmNlb2YgQXJSZWN0KSB7XG4gICAgICAgIHZhciByZWN0ID0gZnJvbTtcbiAgICAgICAgYXNzZXJ0KF9pc1JpZ2h0QW5nbGUoZGlyKSwgJ0FySGVscGVyLmlzUG9pbnRJbkRpckZyb206IF9pc1JpZ2h0QW5nbGUoZGlyKSBGQUlMRUQnKTtcblxuICAgICAgICBzd2l0Y2ggKGRpcikge1xuICAgICAgICAgICAgY2FzZSBDT05TVEFOVFMuRGlyVG9wOlxuICAgICAgICAgICAgICAgIHJldHVybiBwb2ludC55IDwgcmVjdC5jZWlsO1xuXG4gICAgICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJSaWdodDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnQueCA+PSByZWN0LnJpZ2h0O1xuXG4gICAgICAgICAgICBjYXNlIENPTlNUQU5UUy5EaXJCb3R0b206XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvaW50LnkgPj0gcmVjdC5mbG9vcjtcblxuICAgICAgICAgICAgY2FzZSBDT05TVEFOVFMuRGlyTGVmdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnQueCA8IHJlY3QubGVmdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIGFzc2VydChfaXNSaWdodEFuZ2xlKGRpciksICdBckhlbHBlci5pc1BvaW50SW5EaXJGcm9tOiBfaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG5cbiAgICAgICAgc3dpdGNoIChkaXIpIHtcbiAgICAgICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpclRvcDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnQueSA8PSBmcm9tLnk7XG5cbiAgICAgICAgICAgIGNhc2UgQ09OU1RBTlRTLkRpclJpZ2h0OlxuICAgICAgICAgICAgICAgIHJldHVybiBwb2ludC54ID49IGZyb20ueDtcblxuICAgICAgICAgICAgY2FzZSBDT05TVEFOVFMuRGlyQm90dG9tOlxuICAgICAgICAgICAgICAgIHJldHVybiBwb2ludC55ID49IGZyb20ueTtcblxuICAgICAgICAgICAgY2FzZSBDT05TVEFOVFMuRGlyTGVmdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnQueCA8PSBmcm9tLng7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICB9XG59O1xuXG52YXIgX2lzUG9pbnRCZXR3ZWVuU2lkZXMgPSBmdW5jdGlvbiAocG9pbnQsIHJlY3QsIGlzaG9yaXpvbnRhbCkge1xuICAgIGlmIChpc2hvcml6b250YWwgPT09IHRydWUgfHwgX2lzSG9yaXpvbnRhbChpc2hvcml6b250YWwpKSB7XG4gICAgICAgIHJldHVybiByZWN0LmNlaWwgPD0gcG9pbnQueSAmJiBwb2ludC55IDwgcmVjdC5mbG9vcjtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVjdC5sZWZ0IDw9IHBvaW50LnggJiYgcG9pbnQueCA8IHJlY3QucmlnaHQ7XG59O1xuXG52YXIgX2lzQ29vcmRJbkRpckZyb20gPSBmdW5jdGlvbiAoY29vcmQsIGZyb20sIGRpcikge1xuICAgIGFzc2VydChfaXNSaWdodEFuZ2xlKGRpciksICdBckhlbHBlci5pc0Nvb3JkSW5EaXJGcm9tOiBfaXNSaWdodEFuZ2xlKGRpcikgRkFJTEVEJyk7XG4gICAgaWYgKGZyb20gaW5zdGFuY2VvZiBBclBvaW50KSB7XG4gICAgICAgIGZyb20gPSBfZ2V0UG9pbnRDb29yZChmcm9tLCBkaXIpO1xuICAgIH1cblxuICAgIGlmIChkaXIgPT09IENPTlNUQU5UUy5EaXJUb3AgfHwgZGlyID09PSBDT05TVEFOVFMuRGlyTGVmdCkge1xuICAgICAgICByZXR1cm4gY29vcmQgPD0gZnJvbTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29vcmQgPj0gZnJvbTtcbn07XG5cbi8vIFRoaXMgbmV4dCBtZXRob2Qgb25seSBzdXBwb3J0cyB1bmFtYmlndW91cyBvcmllbnRhdGlvbnMuIFRoYXQgaXMsIHRoZSBwb2ludFxuLy8gY2Fubm90IGJlIGluIGEgY29ybmVyIG9mIHRoZSByZWN0YW5nbGUuXG4vLyBOT1RFOiB0aGUgcmlnaHQgYW5kIGZsb29yIHVzZWQgdG8gYmUgLSAxLiBcbnZhciBfb25XaGljaEVkZ2UgPSBmdW5jdGlvbiAocmVjdCwgcG9pbnQpIHtcbiAgICBpZiAocG9pbnQueSA9PT0gcmVjdC5jZWlsICYmIHJlY3QubGVmdCA8IHBvaW50LnggJiYgcG9pbnQueCA8IHJlY3QucmlnaHQpIHtcbiAgICAgICAgcmV0dXJuIENPTlNUQU5UUy5EaXJUb3A7XG4gICAgfVxuXG4gICAgaWYgKHBvaW50LnkgPT09IHJlY3QuZmxvb3IgJiYgcmVjdC5sZWZ0IDwgcG9pbnQueCAmJiBwb2ludC54IDwgcmVjdC5yaWdodCkge1xuICAgICAgICByZXR1cm4gQ09OU1RBTlRTLkRpckJvdHRvbTtcbiAgICB9XG5cbiAgICBpZiAocG9pbnQueCA9PT0gcmVjdC5sZWZ0ICYmIHJlY3QuY2VpbCA8IHBvaW50LnkgJiYgcG9pbnQueSA8IHJlY3QuZmxvb3IpIHtcbiAgICAgICAgcmV0dXJuIENPTlNUQU5UUy5EaXJMZWZ0O1xuICAgIH1cblxuICAgIGlmIChwb2ludC54ID09PSByZWN0LnJpZ2h0ICYmIHJlY3QuY2VpbCA8IHBvaW50LnkgJiYgcG9pbnQueSA8IHJlY3QuZmxvb3IpIHtcbiAgICAgICAgcmV0dXJuIENPTlNUQU5UUy5EaXJSaWdodDtcbiAgICB9XG5cbiAgICByZXR1cm4gQ09OU1RBTlRTLkRpck5vbmU7XG59O1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIENBckZpbmROZWFyZXN0TGluZVxuXG52YXIgQXJGaW5kTmVhcmVzdExpbmUgPSBmdW5jdGlvbiAocHQpIHtcbiAgICB0aGlzLnBvaW50ID0gcHQ7XG4gICAgdGhpcy5kaXN0MSA9IEluZmluaXR5O1xuICAgIHRoaXMuZGlzdDIgPSBJbmZpbml0eTtcbn07XG5cbkFyRmluZE5lYXJlc3RMaW5lLnByb3RvdHlwZS5oTGluZSA9IGZ1bmN0aW9uICh4MSwgeDIsIHkpIHtcbiAgICBhc3NlcnQoeDEgPD0geDIsICdBckZpbmROZWFyZXN0TGluZS5oTGluZTogeDEgPD0geDIgIEZBSUxFRCcpO1xuXG4gICAgdmFyIGQxID0gX2Rpc3RhbmNlRnJvbUhMaW5lKHRoaXMucG9pbnQsIHgxLCB4MiwgeSksXG4gICAgICAgIGQyID0gTWF0aC5hYnModGhpcy5wb2ludC55IC0geSk7XG5cbiAgICBpZiAoZDEgPCB0aGlzLmRpc3QxIHx8IChkMSA9PT0gdGhpcy5kaXN0MSAmJiBkMiA8IHRoaXMuZGlzdDIpKSB7XG4gICAgICAgIHRoaXMuZGlzdDEgPSBkMTtcbiAgICAgICAgdGhpcy5kaXN0MiA9IGQyO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BckZpbmROZWFyZXN0TGluZS5wcm90b3R5cGUudkxpbmUgPSBmdW5jdGlvbiAoeTEsIHkyLCB4KSB7XG4gICAgYXNzZXJ0KHkxIDw9IHkyLCAnQXJGaW5kTmVhcmVzdExpbmUuaExpbmU6IHkxIDw9IHkyIEZBSUxFRCcpO1xuXG4gICAgdmFyIGQxID0gX2Rpc3RhbmNlRnJvbVZMaW5lKHRoaXMucG9pbnQsIHkxLCB5MiwgeCksXG4gICAgICAgIGQyID0gTWF0aC5hYnModGhpcy5wb2ludC54IC0geCk7XG5cbiAgICBpZiAoZDEgPCB0aGlzLmRpc3QxIHx8IChkMSA9PT0gdGhpcy5kaXN0MSAmJiBkMiA8IHRoaXMuZGlzdDIpKSB7XG4gICAgICAgIHRoaXMuZGlzdDEgPSBkMTtcbiAgICAgICAgdGhpcy5kaXN0MiA9IGQyO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5BckZpbmROZWFyZXN0TGluZS5wcm90b3R5cGUud2FzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmRpc3QxIDwgSW5maW5pdHkgJiYgdGhpcy5kaXN0MiA8IEluZmluaXR5O1xufTtcblxuLy8gQ29udmVuaWVuY2UgRnVuY3Rpb25zXG52YXIgcmVtb3ZlRnJvbUFycmF5cyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBpbmRleCxcbiAgICAgICAgcmVtb3ZlZCA9IGZhbHNlLFxuICAgICAgICBhcnJheTtcblxuICAgIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICBhcnJheSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaW5kZXggPSBhcnJheS5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJlbW92ZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbW92ZWQ7XG59O1xuXG52YXIgc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlLCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICBpZiAoa2V5ID09PSAnb3duZXInICYmIHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuaWQgfHwgdHlwZW9mIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUm91bmQgdGhlIG51bWJlciB0byB0aGUgZ2l2ZW4gZGVjaW1hbCBwbGFjZXMuIFRydW5jYXRlIGZvbGxvd2luZyBkaWdpdHMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlXG4gKiBAcGFyYW0ge051bWJlcn0gcGxhY2VzXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHJlc3VsdFxuICovXG52YXIgcm91bmRUcnVuYyA9IGZ1bmN0aW9uICh2YWx1ZSwgcGxhY2VzKSB7XG4gICAgdmFsdWUgPSArdmFsdWU7XG4gICAgdmFyIHNjYWxlID0gTWF0aC5wb3coMTAsICtwbGFjZXMpLFxuICAgICAgICBmbiA9ICdmbG9vcic7XG5cbiAgICBpZiAodmFsdWUgPCAwKSB7XG4gICAgICAgIGZuID0gJ2NlaWwnO1xuICAgIH1cblxuICAgIHJldHVybiBNYXRoW2ZuXSh2YWx1ZSAqIHNjYWxlKSAvIHNjYWxlO1xufTtcblxuLy9GbG9hdCBlcXVhbHNcbnZhciBmbG9hdEVxdWFscyA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuICgoYSAtIDAuMSkgPCBiKSAmJiAoYiA8IChhICsgMC4xKSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgYW4gb2JqZWN0IHdpdGggaW5jcmVhc2luZyBpbnRlZ2VyIGtleXMgdG8gYW4gYXJyYXkuXG4gKiBVc2luZyBtZXRob2QgZnJvbSBodHRwOi8vanNwZXJmLmNvbS9hcmd1bWVudHMtcGVyZm9ybWFuY2UvNlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG52YXIgdG9BcnJheSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG9iai5sZW5ndGh8fDApLFxuICAgICAgICBpID0gMDtcbiAgICB3aGlsZSAob2JqW2ldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2ldID0gb2JqW2krK107XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG52YXIgcGljayA9IGZ1bmN0aW9uKGtleXMsIG9iaikge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBmb3IgKHZhciBpID0ga2V5cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgcmVzW2tleXNbaV1dID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIG5vcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIG5vcFxufTtcblxudmFyIGFzc2VydCA9IGZ1bmN0aW9uKGNvbmQsIG1zZykge1xuICAgIGlmICghY29uZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICdBc3NlcnQgZmFpbGVkJyk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgb25XaGljaEVkZ2U6IF9vbldoaWNoRWRnZSxcbiAgICBpc0Nvb3JkSW5EaXJGcm9tOiBfaXNDb29yZEluRGlyRnJvbSxcbiAgICBpc1BvaW50QmV0d2VlblNpZGVzOiBfaXNQb2ludEJldHdlZW5TaWRlcyxcbiAgICBpc1BvaW50SW5EaXJGcm9tOiBfaXNQb2ludEluRGlyRnJvbSxcbiAgICBpc1BvaW50SW5EaXJGcm9tQ2hpbGRyZW46IF9pc1BvaW50SW5EaXJGcm9tQ2hpbGRyZW4sXG4gICAgaXNQb2ludEluOiBfaXNQb2ludEluLFxuICAgIGlzUG9pbnROZWFyOiBfaXNQb2ludE5lYXIsXG4gICAgZ2V0RGlyOiBfZ2V0RGlyLFxuICAgIGV4R2V0TWlub3JEaXI6IF9leEdldE1pbm9yRGlyLFxuICAgIGV4R2V0TWFqb3JEaXI6IF9leEdldE1ham9yRGlyLFxuICAgIGV4R2V0RGlyVGFibGVJbmRleDogX2V4R2V0RGlyVGFibGVJbmRleCxcbiAgICBnZXRNaW5vckRpcjogX2dldE1pbm9yRGlyLFxuICAgIGdldE1ham9yRGlyOiBfZ2V0TWFqb3JEaXIsXG4gICAgZ2V0UmVjdE91dGVyQ29vcmQ6IF9nZXRSZWN0T3V0ZXJDb29yZCxcbiAgICBnZXRDaGlsZFJlY3RPdXRlckNvb3JkRnJvbTogX2dldENoaWxkUmVjdE91dGVyQ29vcmRGcm9tLFxuICAgIHN0ZXBPbmVJbkRpcjogX3N0ZXBPbmVJbkRpcixcbiAgICByZXZlcnNlRGlyOiBfcmV2ZXJzZURpcixcbiAgICBwcmV2Q2xvY2t3aXNlRGlyOiBfcHJldkNsb2Nrd2lzZURpcixcbiAgICBuZXh0Q2xvY2t3aXNlRGlyOiBfbmV4dENsb2Nrd2lzZURpcixcbiAgICBhcmVJblJpZ2h0QW5nbGU6IF9hcmVJblJpZ2h0QW5nbGUsXG4gICAgaXNSaWdodEFuZ2xlOiBfaXNSaWdodEFuZ2xlLFxuICAgIGlzSG9yaXpvbnRhbDogX2lzSG9yaXpvbnRhbCxcbiAgICBpbnRlcnNlY3Q6IF9pbnRlcnNlY3QsXG4gICAgZ2V0TGluZUNsaXBSZWN0SW50ZXJzZWN0OiBfZ2V0TGluZUNsaXBSZWN0SW50ZXJzZWN0LFxuICAgIGlzTGluZUNsaXBSZWN0OiBfaXNMaW5lQ2xpcFJlY3QsXG4gICAgaXNMaW5lQ2xpcFJlY3RzOiBfaXNMaW5lQ2xpcFJlY3RzLFxuICAgIGlzUG9pbnROZWFyTGluZTogX2lzUG9pbnROZWFyTGluZSxcbiAgICBpc09uRWRnZTogX2lzT25FZGdlLFxuICAgIGRpc3RhbmNlRnJvbUxpbmU6IF9kaXN0YW5jZUZyb21MaW5lLFxuICAgIGlzUmVjdENsaXA6IF9pc1JlY3RDbGlwLFxuICAgIGlzUmVjdEluOiBfaXNSZWN0SW4sXG4gICAgaW5mbGF0ZWRSZWN0OiBfaW5mbGF0ZWRSZWN0LFxuICAgIGdldFBvaW50Q29vcmQ6IF9nZXRQb2ludENvb3JkLFxuICAgIGdldE9wdGltYWxQb3J0czogX2dldE9wdGltYWxQb3J0cyxcbiAgICBBckZpbmROZWFyZXN0TGluZTogQXJGaW5kTmVhcmVzdExpbmUsXG5cbiAgICByZW1vdmVGcm9tQXJyYXlzOiByZW1vdmVGcm9tQXJyYXlzLFxuICAgIHN0cmluZ2lmeTogc3RyaW5naWZ5LFxuICAgIGZsb2F0RXF1YWxzOiBmbG9hdEVxdWFscyxcbiAgICByb3VuZFRydW5jOiByb3VuZFRydW5jLFxuICAgIHRvQXJyYXk6IHRvQXJyYXksXG4gICAgbm9wOiBub3AsXG4gICAgYXNzZXJ0OiBhc3NlcnQsXG4gICAgcGljazogcGljayBcbn07XG4iLCIvKmdsb2JhbHMgZGVmaW5lKi9cbi8qanNoaW50IGJyb3dzZXI6IHRydWUqL1xuXG4vKipcbiAqIEBhdXRob3IgYnJvbGxiIC8gaHR0cHM6Ly9naXRodWIvYnJvbGxiXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JyksXG4gICAgQ09OU1RBTlRTID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkNvbnN0YW50cycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLlV0aWxzJyksXG4gICAgQXJQb2ludCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb2ludCcpLFxuICAgIEFyUmVjdCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5SZWN0JyksXG4gICAgQXV0b1JvdXRlckdyYXBoID0gcmVxdWlyZSgnLi9BdXRvUm91dGVyLkdyYXBoJyksXG4gICAgQXV0b1JvdXRlckJveCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Cb3gnKSxcbiAgICBBdXRvUm91dGVyUG9ydCA9IHJlcXVpcmUoJy4vQXV0b1JvdXRlci5Qb3J0JyksXG4gICAgQXV0b1JvdXRlclBhdGggPSByZXF1aXJlKCcuL0F1dG9Sb3V0ZXIuUGF0aCcpO1xuXG52YXIgQXV0b1JvdXRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnBhdGhzID0ge307XG4gICAgdGhpcy5wb3J0cyA9IHt9O1xuICAgIHRoaXMucENvdW50ID0gMDsgIC8vIEEgbm90IGRlY3JlbWVudGluZyBjb3VudCBvZiBwYXRocyBmb3IgdW5pcXVlIHBhdGggaWQnc1xuICAgIHRoaXMucG9ydElkMlBhdGggPSB7fTtcbiAgICB0aGlzLnBvcnRJZDJCb3ggPSB7fTtcblxuICAgIHRoaXMuZ3JhcGggPSBuZXcgQXV0b1JvdXRlckdyYXBoKCk7XG59O1xuXG52YXIgQXJCb3hPYmplY3QgPSBmdW5jdGlvbiAoYiwgcCkge1xuICAgIC8vIFN0b3JlcyBhIGJveCB3aXRoIHBvcnRzIHVzZWQgdG8gY29ubmVjdCB0byB0aGUgYm94XG4gICAgdGhpcy5ib3ggPSBiO1xuICAgIHRoaXMucG9ydHMgPSBwIHx8IHt9O1xufTtcblxuQXV0b1JvdXRlci5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ncmFwaC5jbGVhcih0cnVlKTtcbiAgICB0aGlzLnBhdGhzID0ge307XG4gICAgdGhpcy5wb3J0SWQyUGF0aCA9IHt9O1xuICAgIHRoaXMucG9ydHMgPSB7fTtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ncmFwaC5kZXN0cm95KCk7XG4gICAgdGhpcy5ncmFwaCA9IG51bGw7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5fY3JlYXRlQm94ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICB2YXIgeDEgPSBzaXplLngxICE9PSB1bmRlZmluZWQgPyBzaXplLngxIDogKHNpemUueDIgLSBzaXplLndpZHRoKSxcbiAgICAgICAgeDIgPSBzaXplLngyICE9PSB1bmRlZmluZWQgPyBzaXplLngyIDogKHNpemUueDEgKyBzaXplLndpZHRoKSxcbiAgICAgICAgeTEgPSBzaXplLnkxICE9PSB1bmRlZmluZWQgPyBzaXplLnkxIDogKHNpemUueTIgLSBzaXplLmhlaWdodCksXG4gICAgICAgIHkyID0gc2l6ZS55MiAhPT0gdW5kZWZpbmVkID8gc2l6ZS55MiA6IChzaXplLnkxICsgc2l6ZS5oZWlnaHQpLFxuICAgICAgICBib3ggPSB0aGlzLmdyYXBoLmNyZWF0ZUJveCgpLFxuICAgICAgICByZWN0ID0gbmV3IEFyUmVjdCh4MSwgeTEsIHgyLCB5Mik7XG5cbiAgICBhc3NlcnQoeDEgIT09IHVuZGVmaW5lZCAmJiB4MiAhPT0gdW5kZWZpbmVkICYmIHkxICE9PSB1bmRlZmluZWQgJiYgeTIgIT09IHVuZGVmaW5lZCxcbiAgICAgICAgJ01pc3Npbmcgc2l6ZSBpbmZvIGZvciBib3gnKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgcmVjdCBpcyBhdCBsZWFzdCAzeDNcbiAgICB2YXIgaGVpZ2h0ID0gcmVjdC5nZXRIZWlnaHQoKSxcbiAgICAgICAgd2lkdGggPSByZWN0LmdldFdpZHRoKCksXG4gICAgICAgIGR4ID0gTWF0aC5tYXgoKDMgLSB3aWR0aCkgLyAyLCAwKSxcbiAgICAgICAgZHkgPSBNYXRoLm1heCgoMyAtIGhlaWdodCkgLyAyLCAwKTtcblxuICAgIHJlY3QuaW5mbGF0ZVJlY3QoZHgsIGR5KTtcblxuICAgIGJveC5zZXRSZWN0KHJlY3QpO1xuICAgIHJldHVybiBib3g7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5hZGRCb3ggPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgIHZhciBib3ggPSB0aGlzLl9jcmVhdGVCb3goc2l6ZSksXG4gICAgICAgIHBvcnRzSW5mbyA9IHNpemUucG9ydHMgfHwge30sXG4gICAgICAgIGJveE9iamVjdDtcblxuICAgIGJveE9iamVjdCA9IG5ldyBBckJveE9iamVjdChib3gpO1xuICAgIHRoaXMuZ3JhcGguYWRkQm94KGJveCk7XG5cbiAgICAvLyBBZGRpbmcgZWFjaCBwb3J0XG4gICAgdmFyIHBvcnRJZHMgPSBPYmplY3Qua2V5cyhwb3J0c0luZm8pO1xuICAgIGZvciAodmFyIGkgPSBwb3J0SWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICB0aGlzLmFkZFBvcnQoYm94T2JqZWN0LCBwb3J0c0luZm9bcG9ydElkc1tpXV0pO1xuICAgIH1cblxuICAgIHRoaXMucG9ydElkMlBhdGhbYm94LmlkXSA9IHtpbjogW10sIG91dDogW119O1xuXG4gICAgcmV0dXJuIGJveE9iamVjdDtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLmFkZFBvcnQgPSBmdW5jdGlvbiAoYm94T2JqZWN0LCBwb3J0SW5mbykge1xuICAgIC8vIEFkZGluZyBhIHBvcnQgdG8gYW4gYWxyZWFkeSBleGlzdGluZyBib3ggKGFsc28gY2FsbGVkIGluIGFkZEJveCBtZXRob2QpXG4gICAgLy8gRGVmYXVsdCBpcyBubyBjb25uZWN0aW9uIHBvcnRzIChtb3JlIHJlbGV2YW50IHdoZW4gY3JlYXRpbmcgYSBib3gpXG4gICAgdmFyIGJveCA9IGJveE9iamVjdC5ib3gsXG4gICAgICAgIHBvcnQsXG4gICAgICAgIGNvbnRhaW5lcixcbiAgICAgICAgcmVjdDtcblxuICAgIC8vIEEgY29ubmVjdGlvbiBhcmVhIGlzIHNwZWNpZmllZFxuICAgIC8qXG4gICAgICogIE11bHRpcGxlIGNvbm5lY3Rpb25zIHNwZWNpZmllZFxuICAgICAqICAgIFsgWyBbeDEsIHkxXSwgW3gyLCB5Ml0gXSwgLi4uIF1cbiAgICAgKlxuICAgICAqIEkgd2lsbCBtYWtlIHRoZW0gYWxsICdtdWx0aXBsZScgY29ubmVjdGlvbnNcbiAgICAgKiAgdGhlbiBoYW5kbGUgdGhlbSB0aGUgc2FtZVxuICAgICAqXG4gICAgICovXG5cbiAgICBwb3J0ID0gdGhpcy5fY3JlYXRlUG9ydChwb3J0SW5mbywgYm94KTtcblxuICAgIC8vIEFkZCBwb3J0IGVudHJ5IHRvIHBvcnRJZDJQYXRoIGRpY3Rpb25hcnlcbiAgICB2YXIgaWQgPSB0aGlzLmdldFBvcnRJZChwb3J0SW5mby5pZCwgYm94T2JqZWN0KTtcbiAgICBwb3J0LmlkID0gaWQ7XG4gICAgdGhpcy5wb3J0SWQyUGF0aFtpZF0gPSB7aW46IFtdLCBvdXQ6IFtdfTtcbiAgICB0aGlzLnBvcnRzW2lkXSA9IHBvcnQ7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgYm94XG4gICAgcmVjdCA9IG5ldyBBclJlY3QocG9ydC5yZWN0KTtcbiAgICByZWN0LmluZmxhdGVSZWN0KDMpO1xuICAgIGNvbnRhaW5lciA9IHRoaXMuX2NyZWF0ZUJveCh7XG4gICAgICAgIHgxOiByZWN0LmxlZnQsXG4gICAgICAgIHgyOiByZWN0LnJpZ2h0LFxuICAgICAgICB5MTogcmVjdC5jZWlsLFxuICAgICAgICB5MjogcmVjdC5mbG9vclxuICAgIH0pO1xuICAgIGJveC5hZGRDaGlsZChjb250YWluZXIpO1xuXG4gICAgLy8gYWRkIHBvcnQgdG8gY2hpbGQgYm94XG4gICAgY29udGFpbmVyLmFkZFBvcnQocG9ydCk7XG5cbiAgICBib3hPYmplY3QucG9ydHNbcG9ydC5pZF0gPSBwb3J0O1xuXG4gICAgLy8gUmVjb3JkIHRoZSBwb3J0MmJveCBtYXBwaW5nXG4gICAgdGhpcy5wb3J0SWQyQm94W3BvcnQuaWRdID0gYm94T2JqZWN0O1xuICAgIHRoaXMuZ3JhcGguYWRkQm94KGNvbnRhaW5lcik7XG5cbiAgICByZXR1cm4gcG9ydDtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLmdldFBvcnRJZCA9IGZ1bmN0aW9uIChpZCwgYm94KSB7XG4gICAgdmFyIFNQTElUVEVSID0gJ19fJyxcbiAgICAgICAgYm94T2JqZWN0ID0gdGhpcy5wb3J0SWQyQm94W2lkXSB8fCBib3gsXG4gICAgICAgIGJveE9iamVjdElkID0gYm94T2JqZWN0LmJveC5pZCxcbiAgICAgICAgdW5pcXVlSWQgPSBib3hPYmplY3RJZCArIFNQTElUVEVSICsgaWQ7XG5cbiAgICBhc3NlcnQoaWQudG9TdHJpbmcsICdJbnZhbGlkIFBvcnQgSWQhICgnICsgaWQgKyAnKScpO1xuICAgIGlkID0gaWQudG9TdHJpbmcoKTtcbiAgICBpZiAoaWQuaW5kZXhPZihib3hPYmplY3RJZCArIFNQTElUVEVSKSAhPT0gLTEpIHsgIC8vIEFzc3VtZSBpZCBpcyBhbHJlYWR5IGFic29sdXRlIGlkXG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5pcXVlSWQ7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5fY3JlYXRlUG9ydCA9IGZ1bmN0aW9uIChjb25uRGF0YSwgYm94KSB7XG4gICAgdmFyIGFuZ2xlcyA9IGNvbm5EYXRhLmFuZ2xlcyB8fCBbXSwgLy8gSW5jb21pbmcgYW5nbGVzLiBJZiBkZWZpbmVkLCBpdCB3aWxsIHNldCBhdHRyIGF0IHRoZSBlbmRcbiAgICAgICAgYXR0ciA9IDAsIC8vIFNldCBieSBhbmdsZXMuIERlZmF1bHRzIHRvIGd1ZXNzaW5nIGJ5IGxvY2F0aW9uIGlmIGFuZ2xlcyB1bmRlZmluZWRcbiAgICAgICAgdHlwZSA9ICdhbnknLCAvLyBTcGVjaWZ5IHN0YXJ0LCBlbmQsIG9yIGFueVxuICAgICAgICBwb3J0ID0gYm94LmNyZWF0ZVBvcnQoKSxcbiAgICAgICAgcmVjdCA9IGJveC5yZWN0LFxuICAgICAgICBjb25uQXJlYSA9IGNvbm5EYXRhLmFyZWE7XG5cbiAgICB2YXIgaXNTdGFydCA9IDE3LFxuICAgICAgICBhcngxLFxuICAgICAgICBhcngyLFxuICAgICAgICBhcnkxLFxuICAgICAgICBhcnkyO1xuXG4gICAgdmFyIF94MSxcbiAgICAgICAgX3gyLFxuICAgICAgICBfeTEsXG4gICAgICAgIF95MixcbiAgICAgICAgaG9yaXpvbnRhbDtcblxuICAgIHZhciByO1xuXG4gICAgdmFyIGExLCAvLyBtaW4gYW5nbGVcbiAgICAgICAgYTIsIC8vIG1heCBhbmdsZVxuICAgICAgICByaWdodEFuZ2xlID0gMCxcbiAgICAgICAgYm90dG9tQW5nbGUgPSA5MCxcbiAgICAgICAgbGVmdEFuZ2xlID0gMTgwLFxuICAgICAgICB0b3BBbmdsZSA9IDI3MDtcblxuICAgIGlmIChjb25uQXJlYSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGlzU3RhcnQgPSAxNztcblxuICAgICAgICAvLyBUaGlzIGdpdmVzIHVzIGEgY29lZmZpY2llbnQgdG8gbXVsdGlwbHkgb3VyIGF0dHJpYnV0ZXMgYnkgdG8gZ292ZXJuIGluY29taW5nXG4gICAgICAgIC8vIG9yIG91dGdvaW5nIGNvbm5lY3Rpb24uIE5vdywgdGhlIHBvcnQgbmVlZHMgb25seSB0byBkZXRlcm1pbmUgdGhlIGRpcmVjdGlvblxuICAgICAgICBpZiAodHlwZSAhPT0gJ2FueScpIHtcbiAgICAgICAgICAgIGlzU3RhcnQgLT0gKHR5cGUgPT09ICdzdGFydCcgPyAxIDogMTYpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXNpbmcgcG9pbnRzIHRvIGRlc2lnbmF0ZSB0aGUgY29ubmVjdGlvbiBhcmVhOiBbIFt4MSwgeTFdLCBbeDIsIHkyXSBdXG4gICAgICAgIF94MSA9IE1hdGgubWluKGNvbm5BcmVhWzBdWzBdLCBjb25uQXJlYVsxXVswXSk7XG4gICAgICAgIF94MiA9IE1hdGgubWF4KGNvbm5BcmVhWzBdWzBdLCBjb25uQXJlYVsxXVswXSk7XG4gICAgICAgIF95MSA9IE1hdGgubWluKGNvbm5BcmVhWzBdWzFdLCBjb25uQXJlYVsxXVsxXSk7XG4gICAgICAgIF95MiA9IE1hdGgubWF4KGNvbm5BcmVhWzBdWzFdLCBjb25uQXJlYVsxXVsxXSk7XG4gICAgICAgIGhvcml6b250YWwgPSBfeTEgPT09IF95MjtcblxuICAgICAgICAvLyBJZiBpdCBpcyBhIHNpbmdsZSBwb2ludCBvZiBjb25uZWN0aW9uLCB3ZSB3aWxsIGV4cGFuZCBpdCB0byBhIHJlY3RcbiAgICAgICAgLy8gV2Ugd2lsbCBkZXRlcm1pbmUgdGhhdCBpdCBpcyBob3Jpem9udGFsIGJ5IGlmIGl0IGlzIGNsb3NlciB0byBhIGhvcml6b250YWwgZWRnZXNcbiAgICAgICAgLy8gb3IgdGhlIHZlcnRpY2FsIGVkZ2VzXG4gICAgICAgIGlmIChfeTEgPT09IF95MiAmJiBfeDEgPT09IF94Mikge1xuICAgICAgICAgICAgaG9yaXpvbnRhbCA9IE1hdGgubWluKE1hdGguYWJzKHJlY3QuY2VpbCAtIF95MSksIE1hdGguYWJzKHJlY3QuZmxvb3IgLSBfeTIpKSA8XG4gICAgICAgICAgICBNYXRoLm1pbihNYXRoLmFicyhyZWN0LmxlZnQgLSBfeDEpLCBNYXRoLmFicyhyZWN0LnJpZ2h0IC0gX3gyKSk7XG4gICAgICAgICAgICBpZiAoaG9yaXpvbnRhbCkge1xuICAgICAgICAgICAgICAgIF94MSAtPSAxO1xuICAgICAgICAgICAgICAgIF94MiArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfeTEgLT0gMTtcbiAgICAgICAgICAgICAgICBfeTIgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2VydChob3Jpem9udGFsIHx8IF94MSA9PT0gX3gyLFxuICAgICAgICAgICAgJ0F1dG9Sb3V0ZXI6YWRkQm94IENvbm5lY3Rpb24gQXJlYSBmb3IgYm94IG11c3QgYmUgZWl0aGVyIGhvcml6b250YWwgb3IgdmVydGljYWwnKTtcblxuICAgICAgICBhcngxID0gX3gxO1xuICAgICAgICBhcngyID0gX3gyO1xuICAgICAgICBhcnkxID0gX3kxO1xuICAgICAgICBhcnkyID0gX3kyO1xuXG4gICAgICAgIGlmIChob3Jpem9udGFsKSB7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoX3kxIC0gcmVjdC5jZWlsKSA8IE1hdGguYWJzKF95MSAtIHJlY3QuZmxvb3IpKSB7IC8vIENsb3NlciB0byB0aGUgdG9wIChob3Jpem9udGFsKVxuICAgICAgICAgICAgICAgIGFyeTEgPSBfeTEgKyAxO1xuICAgICAgICAgICAgICAgIGFyeTIgPSBfeTEgKyA1O1xuICAgICAgICAgICAgICAgIGF0dHIgPSBDT05TVEFOVFMuUG9ydFN0YXJ0T25Ub3AgKyBDT05TVEFOVFMuUG9ydEVuZE9uVG9wO1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gQ2xvc2VyIHRvIHRoZSB0b3AgKGhvcml6b250YWwpXG4gICAgICAgICAgICAgICAgYXJ5MSA9IF95MSAtIDU7XG4gICAgICAgICAgICAgICAgYXJ5MiA9IF95MSAtIDE7XG4gICAgICAgICAgICAgICAgYXR0ciA9IENPTlNUQU5UUy5Qb3J0U3RhcnRPbkJvdHRvbSArIENPTlNUQU5UUy5Qb3J0RW5kT25Cb3R0b207XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhfeDEgLSByZWN0LmxlZnQpIDwgTWF0aC5hYnMoX3gxIC0gcmVjdC5yaWdodCkpIHsvLyBDbG9zZXIgdG8gdGhlIGxlZnQgKHZlcnRpY2FsKVxuICAgICAgICAgICAgICAgIGFyeDEgKz0gMTtcbiAgICAgICAgICAgICAgICBhcngyICs9IDU7XG4gICAgICAgICAgICAgICAgYXR0ciA9IENPTlNUQU5UUy5Qb3J0U3RhcnRPbkxlZnQgKyBDT05TVEFOVFMuUG9ydEVuZE9uTGVmdDtcbiAgICAgICAgICAgIH0gZWxzZSB7Ly8gQ2xvc2VyIHRvIHRoZSByaWdodCAodmVydGljYWwpXG4gICAgICAgICAgICAgICAgYXJ4MSAtPSA1O1xuICAgICAgICAgICAgICAgIGFyeDIgLT0gMTtcbiAgICAgICAgICAgICAgICBhdHRyID0gQ09OU1RBTlRTLlBvcnRTdGFydE9uUmlnaHQgKyBDT05TVEFOVFMuUG9ydEVuZE9uUmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbiAgICAvLyBDaGVjayB0byBtYWtlIHN1cmUgdGhlIHdpZHRoL2hlaWdodCBpcyBhdCBsZWFzdCAzIC0+IG90aGVyd2lzZSBhc3NlcnQgd2lsbCBmYWlsIGluIEFSUG9ydC5zZXRSZWN0XG4gICAgaWYgKGFyeDIgLSBhcngxIDwgMykge1xuICAgICAgICBhcngxIC09IDI7XG4gICAgICAgIGFyeDIgKz0gMjtcbiAgICB9XG4gICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoZSB3aWR0aC9oZWlnaHQgaXMgYXQgbGVhc3QgMyAtPiBvdGhlcndpc2UgYXNzZXJ0IHdpbGwgZmFpbCBpbiBBUlBvcnQuc2V0UmVjdFxuICAgIGlmIChhcnkyIC0gYXJ5MSA8IDMpIHtcbiAgICAgICAgYXJ5MSAtPSAyO1xuICAgICAgICBhcnkyICs9IDI7XG4gICAgfVxuXG4gICAgciA9IG5ldyBBclJlY3QoYXJ4MSwgYXJ5MSwgYXJ4MiwgYXJ5Mik7XG5cbiAgICAvLyBJZiAnYW5nbGVzJyBpcyBkZWZpbmVkLCBJIHdpbGwgdXNlIGl0IHRvIHNldCBhdHRyXG4gICAgaWYgKGFuZ2xlc1swXSAhPT0gdW5kZWZpbmVkICYmIGFuZ2xlc1sxXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGExID0gYW5nbGVzWzBdOyAvLyBtaW4gYW5nbGVcbiAgICAgICAgYTIgPSBhbmdsZXNbMV07IC8vIG1heCBhbmdsZVxuXG4gICAgICAgIGF0dHIgPSAwOyAvLyBUaHJvdyBhd2F5IG91ciBndWVzcyBvZiBhdHRyXG5cbiAgICAgICAgaWYgKHJpZ2h0QW5nbGUgPj0gYTEgJiYgcmlnaHRBbmdsZSA8PSBhMikge1xuICAgICAgICAgICAgYXR0ciArPSBDT05TVEFOVFMuUG9ydFN0YXJ0T25SaWdodCArIENPTlNUQU5UUy5Qb3J0RW5kT25SaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b3BBbmdsZSA+PSBhMSAmJiB0b3BBbmdsZSA8PSBhMikge1xuICAgICAgICAgICAgYXR0ciArPSBDT05TVEFOVFMuUG9ydFN0YXJ0T25Ub3AgKyBDT05TVEFOVFMuUG9ydEVuZE9uVG9wO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxlZnRBbmdsZSA+PSBhMSAmJiBsZWZ0QW5nbGUgPD0gYTIpIHtcbiAgICAgICAgICAgIGF0dHIgKz0gQ09OU1RBTlRTLlBvcnRTdGFydE9uTGVmdCArIENPTlNUQU5UUy5Qb3J0RW5kT25MZWZ0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJvdHRvbUFuZ2xlID49IGExICYmIGJvdHRvbUFuZ2xlIDw9IGEyKSB7XG4gICAgICAgICAgICBhdHRyICs9IENPTlNUQU5UUy5Qb3J0U3RhcnRPbkJvdHRvbSArIENPTlNUQU5UUy5Qb3J0RW5kT25Cb3R0b207XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwb3J0LnNldExpbWl0ZWREaXJzKGZhbHNlKTtcbiAgICBwb3J0LmF0dHJpYnV0ZXMgPSBhdHRyO1xuICAgIHBvcnQuc2V0UmVjdChyKTtcblxuICAgIHJldHVybiBwb3J0O1xufTtcblxuLyoqXG4gKiBDb252ZW5pZW5jZSBtZXRob2QgdG8gbW9kaWZ5IHBvcnQgaW4gcGF0aHMgKGFzIGJvdGggc3RhcnQgYW5kIGVuZCBwb3J0KVxuICpcbiAqIEBwYXJhbSBwb3J0XG4gKiBAcGFyYW0gYWN0aW9uXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9XG4gKi9cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLl9yZW1vdmVQb3J0c01hdGNoaW5nID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICB2YXIgaWQgPSBwb3J0LmlkLFxuICAgICAgICBzdGFydFBhdGhzID0gdGhpcy5wb3J0SWQyUGF0aFtpZF0ub3V0LFxuICAgICAgICBlbmRQYXRocyA9IHRoaXMucG9ydElkMlBhdGhbaWRdLmluLFxuICAgICAgICBpO1xuXG4gICAgdmFyIHBhdGhzID0gJyc7XG4gICAgZm9yIChpID0gc3RhcnRQYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgYXNzZXJ0KFV0aWxzLnJlbW92ZUZyb21BcnJheXMocG9ydCwgc3RhcnRQYXRoc1tpXS5zdGFydHBvcnRzKSxcbiAgICAgICAgICAgICdQb3J0ICcgKyBwb3J0LmlkICsgJyBub3QgcmVtb3ZlZCBmcm9tIHN0YXJ0cG9ydHMnKTtcbiAgICAgICAgcGF0aHMgKz0gc3RhcnRQYXRoc1tpXS5pZCArICcsICc7XG4gICAgfVxuXG4gICAgcGF0aHMgPSAnJztcbiAgICBmb3IgKGkgPSBlbmRQYXRocy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgYXNzZXJ0KFV0aWxzLnJlbW92ZUZyb21BcnJheXMocG9ydCwgZW5kUGF0aHNbaV0uZW5kcG9ydHMpLFxuICAgICAgICAgICAgJ1BvcnQgJyArIHBvcnQuaWQgKyAnIG5vdCByZW1vdmVkIGZyb20gZW5kcG9ydHMnKTtcbiAgICAgICAgcGF0aHMgKz0gZW5kUGF0aHNbaV0uaWQgKyAnLCAnO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGV2ZXJ5IHBhdGggdG8gc2VlIHRoYXQgaXQgaGFzIG5vIHBvcnQgd2l0aCB0bXBJZFxuICAgIGZvciAoaSA9IHRoaXMuZ3JhcGgucGF0aHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIGFzc2VydCh0aGlzLmdyYXBoLnBhdGhzW2ldLnN0YXJ0cG9ydHMuaW5kZXhPZihwb3J0KSA9PT0gLTEsXG4gICAgICAgICAgICAncG9ydCBub3QgcmVtb3ZlZCBmcm9tIHBhdGggc3RhcnRwb3J0cyEgKCcgKyB0aGlzLmdyYXBoLnBhdGhzW2ldLmlkICsgJyknKTtcbiAgICAgICAgYXNzZXJ0KHRoaXMuZ3JhcGgucGF0aHNbaV0uZW5kcG9ydHMuaW5kZXhPZihwb3J0KSA9PT0gLTEsXG4gICAgICAgICAgICAncG9ydCBub3QgcmVtb3ZlZCBmcm9tIHBhdGggZW5kcG9ydHMhJyk7XG4gICAgfVxuXG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5yZW1vdmVQb3J0ID0gZnVuY3Rpb24gKHBvcnQpIHtcbiAgICAvLyBSZW1vdmUgcG9ydCBhbmQgcGFyZW50IGJveCFcbiAgICB2YXIgY29udGFpbmVyID0gcG9ydC5vd25lcixcbiAgICAgICAgaWQgPSBwb3J0LmlkO1xuXG4gICAgYXNzZXJ0KGNvbnRhaW5lci5wYXJlbnQsICdQb3J0IGNvbnRhaW5lciBzaG91bGQgaGF2ZSBhIHBhcmVudCBib3ghJyk7XG4gICAgdGhpcy5ncmFwaC5kZWxldGVCb3goY29udGFpbmVyKTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgcGF0aHNcbiAgICB0aGlzLl9yZW1vdmVQb3J0c01hdGNoaW5nKHBvcnQpO1xuXG4gICAgLy8gcmVtb3ZlIHBvcnQgZnJvbSBBckJveE9iamVjdFxuICAgIHZhciBib3hPYmplY3QgPSB0aGlzLnBvcnRJZDJCb3hbaWRdO1xuXG4gICAgYXNzZXJ0KGJveE9iamVjdCAhPT0gdW5kZWZpbmVkLCAnQm94IE9iamVjdCBub3QgZm91bmQgZm9yIHBvcnQgKCcgKyBpZCArICcpIScpO1xuICAgIGRlbGV0ZSBib3hPYmplY3QucG9ydHNbaWRdO1xuXG4gICAgLy8gQ2xlYW4gdXAgdGhlIHBvcnQgcmVjb3Jkc1xuICAgIHRoaXMucG9ydHNbaWRdID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucG9ydElkMlBhdGhbaWRdID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucG9ydElkMkJveFtpZF0gPSB1bmRlZmluZWQ7XG5cbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLmFkZFBhdGggPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgLy8gQXNzaWduIGEgcGF0aElkIHRvIHRoZSBwYXRoIChyZXR1cm4gdGhpcyBpZCkuXG4gICAgLy8gSWYgdGhlcmUgaXMgb25seSBvbmUgcG9zc2libGUgcGF0aCBjb25uZWN0aW9uLCBjcmVhdGUgdGhlIHBhdGguXG4gICAgLy8gaWYgbm90LCBzdG9yZSB0aGUgcGF0aCBpbmZvIGluIHRoZSBwYXRoc1RvUmVzb2x2ZSBhcnJheVxuICAgIHZhciBwYXRoSWQgPSAodGhpcy5wQ291bnQrKykudG9TdHJpbmcoKTtcblxuICAgIC8vIEdlbmVyYXRlIHBhdGhJZFxuICAgIHdoaWxlIChwYXRoSWQubGVuZ3RoIDwgNikge1xuICAgICAgICBwYXRoSWQgPSAnMCcgKyBwYXRoSWQ7XG4gICAgfVxuICAgIHBhdGhJZCA9ICdQQVRIXycgKyBwYXRoSWQ7XG5cbiAgICBwYXJhbXMuaWQgPSBwYXRoSWQ7XG4gICAgdGhpcy5fY3JlYXRlUGF0aChwYXJhbXMpO1xuXG4gICAgcmV0dXJuIHBhdGhJZDtcbn07XG5cbi8qKlxuICogQ29udmVydCBlaXRoZXIgYSBwb3J0IG9yIEhhc2htYXAgb2YgcG9ydHMgdG8gYW5cbiAqIGFycmF5IG9mIEF1dG9Sb3V0ZXJQb3J0c1xuICpcbiAqIEBwYXJhbSBwb3J0XG4gKiBAcmV0dXJuIHtBcnJheX0gQXJyYXkgb2YgQXV0b1JvdXRlclBvcnRzXG4gKi9cbnZhciB1bnBhY2tQb3J0SW5mbyA9IGZ1bmN0aW9uIChwb3J0KSB7XG4gICAgdmFyIHBvcnRzID0gW107XG5cbiAgICBpZiAocG9ydCBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJQb3J0KSB7XG4gICAgICAgIHBvcnRzLnB1c2gocG9ydCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGlkcyA9IE9iamVjdC5rZXlzKHBvcnQpO1xuICAgICAgICBmb3IgKHZhciBpID0gaWRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICAgICAgYXNzZXJ0KHBvcnRbaWRzW2ldXSBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJQb3J0LCAnSW52YWxpZCBwb3J0IG9wdGlvbjogJyArIHBvcnRbaV0pO1xuICAgICAgICAgICAgcG9ydHMucHVzaChwb3J0W2lkc1tpXV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXNzZXJ0KHBvcnRzLmxlbmd0aCA+IDAsICdEaWQgbm90IHJlY2VpdmUgdmFsaWQgc3RhcnQgb3IgZW5kIHBvcnRzJyk7XG4gICAgcmV0dXJuIHBvcnRzO1xufTtcblxuQXV0b1JvdXRlci5wcm90b3R5cGUuX2NyZWF0ZVBhdGggPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgaWYgKCFwYXJhbXMuc3JjIHx8ICFwYXJhbXMuZHN0KSB7XG4gICAgICAgIHRocm93ICdBdXRvUm91dGVyOl9jcmVhdGVQYXRoIG1pc3Npbmcgc291cmNlIG9yIGRlc3RpbmF0aW9uIHBvcnRzJztcbiAgICB9XG5cbiAgICB2YXIgaWQgPSBwYXJhbXMuaWQsXG4gICAgICAgIGF1dG9yb3V0ZSA9IHBhcmFtcy5hdXRvcm91dGUgfHwgdHJ1ZSxcbiAgICAgICAgc3RhcnREaXIgPSBwYXJhbXMuc3RhcnREaXJlY3Rpb24gfHwgcGFyYW1zLnN0YXJ0LFxuICAgICAgICBlbmREaXIgPSBwYXJhbXMuZW5kRGlyZWN0aW9uIHx8IHBhcmFtcy5lbmQsXG4gICAgICAgIHNyY1BvcnRzLFxuICAgICAgICBkc3RQb3J0cyxcbiAgICAgICAgcGF0aCxcbiAgICAgICAgaTtcblxuICAgIHNyY1BvcnRzID0gdW5wYWNrUG9ydEluZm8ocGFyYW1zLnNyYyk7XG4gICAgZHN0UG9ydHMgPSB1bnBhY2tQb3J0SW5mbyhwYXJhbXMuZHN0KTtcblxuICAgIHBhdGggPSB0aGlzLmdyYXBoLmFkZFBhdGgoYXV0b3JvdXRlLCBzcmNQb3J0cywgZHN0UG9ydHMpO1xuXG4gICAgaWYgKHN0YXJ0RGlyIHx8IGVuZERpcikge1xuICAgICAgICB2YXIgc3RhcnQgPSBzdGFydERpciAhPT0gdW5kZWZpbmVkID8gKHN0YXJ0RGlyLmluZGV4T2YoJ3RvcCcpICE9PSAtMSA/IENPTlNUQU5UUy5QYXRoU3RhcnRPblRvcCA6IDApICtcbiAgICAgICAgKHN0YXJ0RGlyLmluZGV4T2YoJ2JvdHRvbScpICE9PSAtMSA/IENPTlNUQU5UUy5QYXRoU3RhcnRPbkJvdHRvbSA6IDApICtcbiAgICAgICAgKHN0YXJ0RGlyLmluZGV4T2YoJ2xlZnQnKSAhPT0gLTEgPyBDT05TVEFOVFMuUGF0aFN0YXJ0T25MZWZ0IDogMCkgK1xuICAgICAgICAoc3RhcnREaXIuaW5kZXhPZigncmlnaHQnKSAhPT0gLTEgPyBDT05TVEFOVFMuUGF0aFN0YXJ0T25SaWdodCA6IDApIHx8XG4gICAgICAgIChzdGFydERpci5pbmRleE9mKCdhbGwnKSAhPT0gLTEgPyBDT05TVEFOVFMuUGF0aERlZmF1bHQgOiAwKSA6IENPTlNUQU5UUy5QYXRoRGVmYXVsdDtcbiAgICAgICAgdmFyIGVuZCA9IGVuZERpciAhPT0gdW5kZWZpbmVkID8gKGVuZERpci5pbmRleE9mKCd0b3AnKSAhPT0gLTEgPyBDT05TVEFOVFMuUGF0aEVuZE9uVG9wIDogMCkgK1xuICAgICAgICAoZW5kRGlyLmluZGV4T2YoJ2JvdHRvbScpICE9PSAtMSA/IENPTlNUQU5UUy5QYXRoRW5kT25Cb3R0b20gOiAwKSArXG4gICAgICAgIChlbmREaXIuaW5kZXhPZignbGVmdCcpICE9PSAtMSA/IENPTlNUQU5UUy5QYXRoRW5kT25MZWZ0IDogMCkgK1xuICAgICAgICAoZW5kRGlyLmluZGV4T2YoJ3JpZ2h0JykgIT09IC0xID8gQ09OU1RBTlRTLlBhdGhFbmRPblJpZ2h0IDogMCkgfHxcbiAgICAgICAgKGVuZERpci5pbmRleE9mKCdhbGwnKSAhPT0gLTEgPyBDT05TVEFOVFMuUGF0aERlZmF1bHQgOiAwKSA6IENPTlNUQU5UUy5QYXRoRGVmYXVsdDtcblxuICAgICAgICBwYXRoLnNldFN0YXJ0RGlyKHN0YXJ0KTtcbiAgICAgICAgcGF0aC5zZXRFbmREaXIoZW5kKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXRoLnNldFN0YXJ0RGlyKENPTlNUQU5UUy5QYXRoRGVmYXVsdCk7XG4gICAgICAgIHBhdGguc2V0RW5kRGlyKENPTlNUQU5UUy5QYXRoRGVmYXVsdCk7XG4gICAgfVxuXG4gICAgcGF0aC5pZCA9IGlkO1xuICAgIHRoaXMucGF0aHNbaWRdID0gcGF0aDtcblxuICAgIC8vIFJlZ2lzdGVyIHRoZSBwYXRoIHVuZGVyIGJveCBpZFxuICAgIC8vIElkIHRoZSBwb3J0cyBhbmQgcmVnaXN0ZXIgdGhlIHBhdGhzIHdpdGggZWFjaCBwb3J0Li4uXG4gICAgZm9yIChpID0gc3JjUG9ydHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHRoaXMucG9ydElkMlBhdGhbc3JjUG9ydHNbaV0uaWRdLm91dC5wdXNoKHBhdGgpO1xuICAgIH1cbiAgICBmb3IgKGkgPSBkc3RQb3J0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgdGhpcy5wb3J0SWQyUGF0aFtkc3RQb3J0c1tpXS5pZF0uaW4ucHVzaChwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5yb3V0ZVN5bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5ncmFwaC5yb3V0ZVN5bmMoKTtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLnJvdXRlQXN5bmMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuZ3JhcGgucm91dGVBc3luYyhvcHRpb25zKTtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLmdldFBhdGhQb2ludHMgPSBmdW5jdGlvbiAocGF0aElkKSB7XG4gICAgYXNzZXJ0KHRoaXMucGF0aHNbcGF0aElkXSAhPT0gdW5kZWZpbmVkLFxuICAgICAgICAnQXV0b1JvdXRlcjpnZXRQYXRoIHJlcXVlc3RlZCBwYXRoIGRvZXMgbm90IG1hdGNoIGFueSBjdXJyZW50IHBhdGhzJyk7XG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGhzW3BhdGhJZF07XG5cbiAgICByZXR1cm4gcGF0aC5wb2ludHMubWFwKGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICByZXR1cm4ge3g6IHBvaW50LngsIHk6IHBvaW50Lnl9O1xuICAgIH0pO1xufTtcblxuQXV0b1JvdXRlci5wcm90b3R5cGUuZ2V0Qm94UmVjdCA9IGZ1bmN0aW9uIChib3hJZCkge1xuICAgIGFzc2VydCh0aGlzLmdyYXBoLmJveGVzW2JveElkXSAhPT0gdW5kZWZpbmVkLFxuICAgICAgICAnQXV0b1JvdXRlcjpnZXRCb3hSZWN0IHJlcXVlc3RlZCBib3ggZG9lcyBub3QgbWF0Y2ggYW55IGN1cnJlbnQgYm94ZXMnKTtcbiAgICB2YXIgcmVjdCA9IHRoaXMuZ3JhcGguYm94ZXNbYm94SWRdLnJlY3Q7XG5cbiAgICByZXR1cm4gVXRpbHMucGljayhbJ2xlZnQnLCAncmlnaHQnLCAnY2VpbCcsICdmbG9vciddLCByZWN0KTtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLnNldEJveFJlY3QgPSBmdW5jdGlvbiAoYm94T2JqZWN0LCBzaXplKSB7XG4gICAgdmFyIGJveCA9IGJveE9iamVjdC5ib3gsXG4gICAgICAgIHgxID0gc2l6ZS54MSAhPT0gdW5kZWZpbmVkID8gc2l6ZS54MSA6IChzaXplLngyIC0gc2l6ZS53aWR0aCksXG4gICAgICAgIHgyID0gc2l6ZS54MiAhPT0gdW5kZWZpbmVkID8gc2l6ZS54MiA6IChzaXplLngxICsgc2l6ZS53aWR0aCksXG4gICAgICAgIHkxID0gc2l6ZS55MSAhPT0gdW5kZWZpbmVkID8gc2l6ZS55MSA6IChzaXplLnkyIC0gc2l6ZS5oZWlnaHQpLFxuICAgICAgICB5MiA9IHNpemUueTIgIT09IHVuZGVmaW5lZCA/IHNpemUueTIgOiAoc2l6ZS55MSArIHNpemUuaGVpZ2h0KSxcbiAgICAgICAgcmVjdCA9IG5ldyBBclJlY3QoeDEsIHkxLCB4MiwgeTIpO1xuXG4gICAgdGhpcy5ncmFwaC5zZXRCb3hSZWN0KGJveCwgcmVjdCk7XG5cbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLl9jaGFuZ2VQb3J0SWQgPSBmdW5jdGlvbiAob2xkSWQsIG5ld0lkKSB7XG4gICAgdGhpcy5wb3J0c1tuZXdJZF0gPSB0aGlzLnBvcnRzW29sZElkXTtcbiAgICB0aGlzLnBvcnRJZDJQYXRoW25ld0lkXSA9IHRoaXMucG9ydElkMlBhdGhbb2xkSWRdO1xuICAgIHRoaXMucG9ydElkMkJveFtuZXdJZF0gPSB0aGlzLnBvcnRJZDJCb3hbb2xkSWRdO1xuICAgIHRoaXMucG9ydHNbbmV3SWRdLmlkID0gbmV3SWQ7XG5cbiAgICB0aGlzLnBvcnRzW29sZElkXSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnBvcnRJZDJQYXRoW29sZElkXSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnBvcnRJZDJCb3hbb2xkSWRdID0gdW5kZWZpbmVkO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBwb3J0IHdpdGggdGhlIGdpdmVuIGlkIHRvXG4gKiBtYXRjaCB0aGUgcGFyYW1ldGVycyBpbiBwb3J0SW5mb1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwb3J0SW5mb1xuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5BdXRvUm91dGVyLnByb3RvdHlwZS51cGRhdGVQb3J0ID0gZnVuY3Rpb24gKGJveE9iamVjdCwgcG9ydEluZm8pIHtcbiAgICAvLyBSZW1vdmUgb3duZXIgYm94IGZyb20gZ3JhcGhcbiAgICB2YXIgcG9ydElkID0gdGhpcy5nZXRQb3J0SWQocG9ydEluZm8uaWQsIGJveE9iamVjdCksXG4gICAgICAgIG9sZFBvcnQgPSB0aGlzLnBvcnRzW3BvcnRJZF0sXG4gICAgICAgIHRtcElkID0gJyMjVEVNUF9JRCMjJyxcbiAgICAgICAgaW5jb21pbmdQYXRocyA9IHRoaXMucG9ydElkMlBhdGhbcG9ydElkXS5pbixcbiAgICAgICAgb3V0Z29pbmdQYXRocyA9IHRoaXMucG9ydElkMlBhdGhbcG9ydElkXS5vdXQsXG4gICAgICAgIG5ld1BvcnQ7XG5cbiAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgYmUgZG9uZSBiZXR0ZXJcbiAgICB0aGlzLl9jaGFuZ2VQb3J0SWQocG9ydElkLCB0bXBJZCk7XG4gICAgbmV3UG9ydCA9IHRoaXMuYWRkUG9ydChib3hPYmplY3QsIHBvcnRJbmZvKTtcblxuICAgIC8vIEZvciBhbGwgcGF0aHMgdXNpbmcgdGhpcyBwb3J0LCBhZGQgdGhlIG5ldyBwb3J0XG4gICAgdmFyIHBhdGgsXG4gICAgICAgIGk7XG5cbiAgICBmb3IgKGkgPSBvdXRnb2luZ1BhdGhzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICBwYXRoID0gb3V0Z29pbmdQYXRoc1tpXTtcbiAgICAgICAgcGF0aC5zdGFydHBvcnRzLnB1c2gobmV3UG9ydCk7XG4gICAgICAgIHRoaXMuZ3JhcGguZGlzY29ubmVjdChwYXRoKTtcbiAgICAgICAgdGhpcy5wb3J0SWQyUGF0aFtwb3J0SWRdLm91dC5wdXNoKHBhdGgpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IGluY29taW5nUGF0aHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHBhdGggPSBpbmNvbWluZ1BhdGhzW2ldO1xuICAgICAgICBwYXRoLmVuZHBvcnRzLnB1c2gobmV3UG9ydCk7XG4gICAgICAgIHRoaXMuZ3JhcGguZGlzY29ubmVjdChwYXRoKTtcbiAgICAgICAgdGhpcy5wb3J0SWQyUGF0aFtwb3J0SWRdLmluLnB1c2gocGF0aCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW1vdmVQb3J0KG9sZFBvcnQpO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBib3hPYmplY3RcbiAgICBib3hPYmplY3QucG9ydHNbcG9ydElkXSA9IG5ld1BvcnQ7XG5cbiAgICByZXR1cm4gbmV3UG9ydDtcbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgYXNzZXJ0KGl0ZW0gIT09IHVuZGVmaW5lZCwgJ0F1dG9Sb3V0ZXI6cmVtb3ZlIENhbm5vdCByZW1vdmUgdW5kZWZpbmVkIG9iamVjdCcpO1xuICAgIHZhciBpO1xuXG4gICAgaWYgKGl0ZW0uYm94IGluc3RhbmNlb2YgQXV0b1JvdXRlckJveCkge1xuICAgICAgICB2YXIgcG9ydHMgPSBPYmplY3Qua2V5cyhpdGVtLnBvcnRzKTtcbiAgICAgICAgZm9yIChpID0gcG9ydHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgICAgICB0aGlzLnBvcnRJZDJQYXRoW3BvcnRzW2ldXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ3JhcGguZGVsZXRlQm94KGl0ZW0uYm94KTtcblxuICAgIH0gZWxzZSBpZiAodGhpcy5wYXRoc1tpdGVtXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0aGlzLnBhdGhzW2l0ZW1dIGluc3RhbmNlb2YgQXV0b1JvdXRlclBhdGgpIHtcbiAgICAgICAgICAgIHZhciBwYXRoLFxuICAgICAgICAgICAgICAgIHNyY0lkLFxuICAgICAgICAgICAgICAgIGRzdElkLFxuICAgICAgICAgICAgICAgIGluZGV4O1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgcGF0aCBmcm9tIGFsbCBwb3J0SWQyUGF0aCBlbnRyaWVzXG4gICAgICAgICAgICBwYXRoID0gdGhpcy5wYXRoc1tpdGVtXTtcbiAgICAgICAgICAgIGZvciAoaSA9IHBhdGguc3RhcnRwb3J0cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgICAgICAgICBzcmNJZCA9IHBhdGguc3RhcnRwb3J0c1tpXS5pZDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMucG9ydElkMlBhdGhbc3JjSWRdLm91dC5pbmRleE9mKHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMucG9ydElkMlBhdGhbc3JjSWRdLm91dC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGkgPSBwYXRoLmVuZHBvcnRzLmxlbmd0aDsgaS0tOykge1xuICAgICAgICAgICAgICAgIGRzdElkID0gcGF0aC5lbmRwb3J0c1tpXS5pZDtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMucG9ydElkMlBhdGhbZHN0SWRdLmluLmluZGV4T2YocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3J0SWQyUGF0aFtkc3RJZF0uaW4uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5ncmFwaC5kZWxldGVQYXRoKHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnBhdGhzW2l0ZW1dOyAgLy8gUmVtb3ZlIGRpY3Rpb25hcnkgZW50cnlcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93ICdBdXRvUm91dGVyOnJlbW92ZSBVbnJlY29nbml6ZWQgaXRlbSB0eXBlLiBNdXN0IGJlIGFuIEF1dG9Sb3V0ZXJCb3ggb3IgYW4gQXV0b1JvdXRlclBhdGggSUQnO1xuICAgIH1cbn07XG5cbkF1dG9Sb3V0ZXIucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoYm94LCBkZXRhaWxzKSB7XG4gICAgLy8gTWFrZSBzdXJlIGRldGFpbHMgYXJlIGluIHRlcm1zIG9mIGR4LCBkeVxuICAgIGJveCA9IGJveCBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJCb3ggPyBib3ggOiBib3guYm94O1xuICAgIHZhciBkeCA9IGRldGFpbHMuZHggIT09IHVuZGVmaW5lZCA/IGRldGFpbHMuZHggOiBNYXRoLnJvdW5kKGRldGFpbHMueCAtIGJveC5yZWN0LmxlZnQpLFxuICAgICAgICBkeSA9IGRldGFpbHMuZHkgIT09IHVuZGVmaW5lZCA/IGRldGFpbHMuZHkgOiBNYXRoLnJvdW5kKGRldGFpbHMueSAtIGJveC5yZWN0LmNlaWwpO1xuXG4gICAgYXNzZXJ0KGJveCBpbnN0YW5jZW9mIEF1dG9Sb3V0ZXJCb3gsICdBdXRvUm91dGVyOm1vdmUgRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhbiBBdXRvUm91dGVyQm94IG9yIEFyQm94T2JqZWN0Jyk7XG5cbiAgICB0aGlzLmdyYXBoLnNoaWZ0Qm94QnkoYm94LCB7J2N4JzogZHgsICdjeSc6IGR5fSk7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5zZXRNaW5pbXVtR2FwID0gZnVuY3Rpb24gKG1pbikge1xuICAgIHRoaXMuZ3JhcGguc2V0QnVmZmVyKE1hdGguZmxvb3IobWluIC8gMikpO1xufTtcblxuQXV0b1JvdXRlci5wcm90b3R5cGUuc2V0Q29tcG9uZW50ID0gZnVuY3Rpb24gKHBCb3hPYmosIGNoQm94T2JqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBCb3hPYmouYm94LFxuICAgICAgICBjaGlsZCA9IGNoQm94T2JqLmJveDtcblxuICAgIHBhcmVudC5hZGRDaGlsZChjaGlsZCk7XG59O1xuXG5BdXRvUm91dGVyLnByb3RvdHlwZS5zZXRQYXRoQ3VzdG9tUG9pbnRzID0gZnVuY3Rpb24gKGFyZ3MpIHsgLy8gYXJncy5wb2ludHMgPSBbIFt4LCB5XSwgW3gyLCB5Ml0sIC4uLiBdXG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGhzW2FyZ3MucGF0aF0sXG4gICAgICAgIHBvaW50cztcbiAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93ICdBdXRvUm91dGVyOiBOZWVkIHRvIGhhdmUgYW4gQXV0b1JvdXRlclBhdGggdHlwZSB0byBzZXQgY3VzdG9tIHBhdGggcG9pbnRzJztcbiAgICB9XG5cbiAgICBpZiAoYXJncy5wb2ludHMubGVuZ3RoID4gMCkge1xuICAgICAgICBwYXRoLnNldEF1dG9Sb3V0aW5nKGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXRoLnNldEF1dG9Sb3V0aW5nKHRydWUpO1xuICAgIH1cblxuICAgIC8vIENvbnZlcnQgYXJncy5wb2ludHMgdG8gYXJyYXkgb2YgW0FyUG9pbnRdICdzXG4gICAgcG9pbnRzID0gYXJncy5wb2ludHMubWFwKGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICByZXR1cm4gbmV3IEFyUG9pbnQocG9pbnRbMF0sIHBvaW50WzFdKTtcbiAgICB9KTtcblxuICAgIHBhdGguc2V0Q3VzdG9tUGF0aFBvaW50cyhwb2ludHMpO1xufTtcblxuLyoqXG4gKiBDaGVjayB0aGF0IGVhY2ggcGF0aCBpcyByZWdpc3RlcmVkIHVuZGVyIHBvcnRJZDJQYXRoIGZvciBlYWNoIHN0YXJ0L2VuZCBwb3J0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH1cbiAqL1xuQXV0b1JvdXRlci5wcm90b3R5cGUuX2Fzc2VydFBvcnRJZDJQYXRoSXNWYWxpZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaWQsXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGo7XG4gICAgZm9yICh2YXIgaSA9IHRoaXMuZ3JhcGgucGF0aHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIHBhdGggPSB0aGlzLmdyYXBoLnBhdGhzW2ldO1xuICAgICAgICBmb3IgKGogPSBwYXRoLnN0YXJ0cG9ydHMubGVuZ3RoOyBqLS07KSB7XG4gICAgICAgICAgICBpZCA9IHBhdGguc3RhcnRwb3J0c1tqXS5pZDtcbiAgICAgICAgICAgIGFzc2VydCh0aGlzLnBvcnRJZDJQYXRoW2lkXS5vdXQuaW5kZXhPZihwYXRoKSAhPT0gLTEsXG4gICAgICAgICAgICAgICAgJ1BvcnQgJyArIGlkICsgJyBpcyBtaXNzaW5nIHJlZ2lzdGVyZWQgc3RhcnRwb3J0IGZvciAnICsgcGF0aC5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGogPSBwYXRoLmVuZHBvcnRzLmxlbmd0aDsgai0tOykge1xuICAgICAgICAgICAgaWQgPSBwYXRoLmVuZHBvcnRzW2pdLmlkO1xuICAgICAgICAgICAgYXNzZXJ0KHRoaXMucG9ydElkMlBhdGhbaWRdLmluLmluZGV4T2YocGF0aCkgIT09IC0xLFxuICAgICAgICAgICAgICAgICdQb3J0ICcgKyBpZCArICcgaXMgbWlzc2luZyByZWdpc3RlcmVkIGVuZHBvcnQgZm9yICcgKyBwYXRoLmlkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXV0b1JvdXRlcjtcbiJdfQ==
