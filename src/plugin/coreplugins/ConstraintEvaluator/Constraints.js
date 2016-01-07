/*globals define*/
/*jshint node:true, browser:true, camelcase: false*/
/*jscs:disable validateIndentation*/
/**
 * Overwrite this file with a generated one or add your own constraints manually.
 *
 * Rules/Conventions:
 * - The name of the functions must start with Constraint_.
 * - When generating constraints the names will be Constraint_<metatype>_<constraintName> (special chars replaces by _).
 * - Keep the indentation of the fn as below in order to get a pretty formatting when writing back to model.
 * - The editor on the generic UI uses an indentation of 2.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function Constraints() {


        this.Constraint_FCO_NoViolation = function () {

            var fn =
function (core, node, callback) {
  callback(null, {hasViolation: false, message: 'Will always succeed.'});
};

            return {
                name: 'NoViolation',
                info: 'No Violation',
                metaType: 'FCO',
                fn: fn
            };
        };

        this.Constraint_FCO_HasViolation = function () {

            var fn =
function (core, node, callback) {
  callback(null, {hasViolation: true, message: 'Will always fail.'});
};

            return {
                name: 'HasViolation',
                info: 'Has Violation',
                metaType: 'FCO',
                fn: fn
            };
        };

        this.Constraint_FCO_ThrowsException = function () {

            var fn =
function (core, node, callback) {
  throw new Error('An exception');
  callback(null, {hasViolation: false, message: 'Will throw an exception.'});
};

            return {
                name: 'ThrowsException',
                info: 'Throws an exception',
                metaType: 'FCO',
                fn: fn
            };
        };


        this.Constraint_FCO_ReturnsError = function () {

            var fn =
function (core, node, callback) {
  callback(new Error('An error'), {hasViolation: false, message: 'Will return an error.'});
};

            return {
                name: 'ReturnsError',
                info: 'Returns an error',
                metaType: 'FCO',
                fn: fn
            };
        };
    }

    return Constraints;
});