/*globals define*/
/*jshint browser: true*/

/**
 * These are constants for events that are dispatched using the client and
 * listened too by various UI pieces.
 * The client itself is not necessarily aware of these events, but rather acts as the hub for the
 * event communication.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {

    'use strict';

    return {
        LOCATE_NODE: 'LOCATE_NODE' // {nodeId: <id of node>}
    };
});