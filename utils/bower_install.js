/*globals console*/
/*jshint node:true*/
/**
 * bower.commands.install is not blocking nor does it seem to take a callback or return a promise..
 * TODO: Figure out how to determine when it's ready, for now keep it in a separate script.
 *
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var bower = require('bower');

console.log('Installing bower components...');

bower.commands.install();

console.log('Bower install complete');