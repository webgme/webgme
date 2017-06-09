/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

// You need to add require-uncached as node-module if you wanna use the same approach.
var requireUncached = require('require-uncached'),
    components = requireUncached('./components.json');

module.exports = components;