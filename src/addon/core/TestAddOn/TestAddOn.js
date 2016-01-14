/*globals define*/
/*jshint node:true*/

/**
 * Add-on that alters the name of newly created nodes and persists back to model.
 * @author pmeijer / https://github.com/pmeijer
 * @module CoreAddOns:TestAddOn
 */

define(['addon/AddOnBase'], function (AddOnBase) {

    'use strict';

    /**
     *
     * @param logger
     * @param gmeConfig
     * @constructor
     */
    var TestAddOn = function (logger, gmeConfig) {
        AddOnBase.call(this, logger, gmeConfig);
        this.nodePaths = {
            //nodePath: {boolean}
        };
        this.commitCnt = 0;
    };

    TestAddOn.prototype = Object.create(AddOnBase.prototype);
    TestAddOn.prototype.constructor = TestAddOn;

    TestAddOn.prototype.getName = function () {
        return 'TestAddOn';
    };

    TestAddOn.prototype.getVersion = function () {
        return '1.0.0';
    };

    TestAddOn.prototype.update = function (rootNode, commitObj, callback) {
        var self = this;

        self.core.loadSubTree(rootNode, function (err, nodes) {
            var i,
                newName,
                nodePath;
            if (err) {
                callback(new Error(err));
                return;
            }

            for (i = 0; i < nodes.length; i += 1) {
                nodePath = self.core.getPath(nodes[i]);
                if (self.nodePaths[nodePath] === self.commitCnt) {
                    self.nodePaths[nodePath] += 1;
                } else {
                    newName = self.core.getAttribute(nodes[i], 'name') + '_mod';
                    self.core.setAttribute(nodes[i], 'name', newName);
                    self.nodePaths[nodePath] = self.commitCnt + 1;
                    self.addCommitMessage('Changed name of "' + nodePath + '" to "' + newName + '". ');
                }
            }

            self.commitCnt += 1;
            callback(null, self.updateResult);
        });
    };

    TestAddOn.prototype.initialize = function (rootNode, commitObj, callback) {
        var self = this;

        self.logger.debug('initialized called, building up nodePath map');
        self.core.loadSubTree(rootNode, function (err, nodes) {
            var i;
            if (err) {
                callback(new Error(err));
                return;
            }
            for (i = 0; i < nodes.length; i += 1) {
                self.nodePaths[self.core.getPath(nodes[i])] = self.commitCnt;
            }

            callback(null, self.updateResult);
        });
    };

    return TestAddOn;
});