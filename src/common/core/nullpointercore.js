/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/CoreAssert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
    'use strict';

    function NullPointerCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized NullPointerCore');

        //<editor-fold=Modified Methods>
        this.setPointer = function (node, name, target) {
            if (target === null) {
                var nullChild = innerCore.getChild(node, CONSTANTS.NULLPTR_RELID);
                innerCore.setAttribute(nullChild, 'name', CONSTANTS.NULLPTR_NAME);
                innerCore.setPointer(node, name, nullChild);
            } else {
                innerCore.setPointer(node, name, target);
            }
        };

        this.getPointerPath = function (node, name) {
            var path = innerCore.getPointerPath(node, name);
            if (path && path.indexOf(CONSTANTS.NULLPTR_RELID) !== -1) {
                return null;
            } else {
                return path;
            }
        };

        this.loadPointer = function (node, name) {
            var path = self.getPointerPath(node, name);
            if (path === null) {
                return null;
            } else {
                return innerCore.loadPointer(node, name);
            }
        };

        this.renamePointer = function (node, oldName, newName) {
            var oldPath = self.getPointerPath(node, oldName);
            if (oldPath === null) {
                self.deletePointer(node, oldName);
                self.setPointer(node, newName, null);
            } else {
                innerCore.renamePointer(node, oldName, newName);
            }
        };

        //</editor-fold>

        return self;
    }

    return NullPointerCore;
});