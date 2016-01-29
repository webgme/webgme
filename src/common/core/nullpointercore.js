/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
    'use strict';

    function NullPointerCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            core = {},
            key;

        for (key in innerCore) {
            core[key] = innerCore[key];
        }

        logger.debug('initialized NullPointerCore');

        //<editor-fold=Modified Methods>
        core.setPointer = function (node, name, target) {
            if (target === null) {
                var nullChild = innerCore.getChild(node, CONSTANTS.NULLPTR_RELID);
                innerCore.setAttribute(nullChild, 'name', CONSTANTS.NULLPTR_NAME);
                innerCore.setPointer(node, name, nullChild);
            } else {
                innerCore.setPointer(node, name, target);
            }
        };

        core.getPointerPath = function (node, name) {
            var path = innerCore.getPointerPath(node, name);
            if (path && path.indexOf(CONSTANTS.NULLPTR_RELID) !== -1) {
                return null;
            } else {
                return path;
            }
        };

        core.loadPointer = function (node, name) {
            var path = core.getPointerPath(node, name);
            if (path === null) {
                return null;
            } else {
                return innerCore.loadPointer(node, name);
            }
        };
        //</editor-fold>

        return core;
    }

    return NullPointerCore;
});


