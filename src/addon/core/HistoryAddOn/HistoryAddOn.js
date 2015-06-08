/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

//TODO: No one uses this? It's not updated.. - It's deprecated..
define(['addon/AddOnBase'], function (AddOnBase) {

    'use strict';
    var HistoryAddOn = function (Core, storage, gmeConfig) {
        AddOnBase.call(this, Core, storage, gmeConfig);
    };

    HistoryAddOn.prototype = Object.create(AddOnBase.prototype);
    HistoryAddOn.prototype.constructor = HistoryAddOn;


    HistoryAddOn.prototype.getName = function () {
        return 'HistoryAddOn';
    };

    HistoryAddOn.prototype.update = function (root, callback) {
        console.log('HistoryAddOn', new Date().getTime(), 'update', this.core.getGuid(root), this.core.getHash(root));
        callback(null);
    };

    HistoryAddOn.prototype.query = function (parameters, callback) {
        callback(null, this.tree);
    };

    HistoryAddOn.prototype.start = function (parameters, callback) {
        var self = this;
        AddOnBase.prototype.start.call(this, parameters, function (err) {
            if (err) {
                return callback(err);
            }

            self.buildInitial(callback);
        });
    };

    HistoryAddOn.prototype.stop = function (callback) {
        //there is no need for special stop sequence
        //TODO maybe we could close the project and the database, but right now it seems unnecessary
        AddOnBase.prototype.stop.call(this, callback);
    };

    //special HistoryAddOn elements
    HistoryAddOn.prototype.tree = {};

    HistoryAddOn.prototype.buildInitial = function (callback) {
        var self = this,
            handleChildren = function (node, treeObject, cb) {
                var relIds = self.core.getChildrenRelids(node),
                    waiting = relIds.length,
                    relId,
                    insideCallback = function () {
                        if (--waiting === 0) {
                            cb();
                        }
                    },
                    i;
                if (waiting > 0) {
                    self.core.loadChildren(node, function (err, children) {
                        if (err) {
                            return cb();
                        }
                        for (i = 0; i < children.length; i++) {
                            relId = self.core.getRelid(children[i]);
                            treeObject.children[relId] = {
                                'hash': self.core.getHash(children[i]),
                                'lastChanged': self.commit,
                                'path': self.core.getPath(children[i]),
                                'children': {},
                                'latest': false
                            };
                            handleChildren(children[i], treeObject.children[relId], insideCallback);
                        }
                    });
                } else {
                    cb();
                }
            };

        self.tree = {};
        self.project.getBranchHash(self.branchName, '#hack', function (err, commitHash) {
            if (err) {
                return callback(err);
            }

            self.commit = commitHash;
            self.project.loadObject(commitHash, function (err, commit) {
                if (err || !commit) {
                    return callback(err || new Error('the latest commit of the branch cannot be found'));
                }

                self.tree = {
                    'hash': commit.root,
                    'lastChanged': commitHash,
                    'path': '',
                    'children': {},
                    'latest': true
                };

                self.core.loadRoot(commit.root, function (err, root) {
                    if (err || !root) {
                        return callback(err || new Error('the root of the branch cannot be found'));
                    }

                    handleChildren(root, self.tree, function () {
                        callback(null);
                    });
                });
            });
        });
    };
    HistoryAddOn.prototype.update = function (root) {
        var self = this,
            checkNode = function (node, treeObject, callback) {
                var newRelIds = self.core.getChildrenRelids(node),
                    oldRelIds = Object.keys(treeObject.children),
                    waiting = newRelIds.length,
                    innerCallback = function () {
                        if (--waiting === 0) {
                            callback();
                        }
                    },
                    i;
                if (self.core.getHash(node) !== treeObject.hash) {
                    treeObject.hash = self.core.getHash(node);
                    treeObject.lastChanged = self.commit;
                    treeObject.path = self.core.getPath(node);
                    treeObject.latest = true;

                    if (waiting > 0) {
                        //we have children we update the structure of the tree according
                        for (i = 0; i < newRelIds.length; i++) {
                            if (!treeObject.children[newRelIds[i]]) {
                                //new node
                                treeObject.children[newRelIds[i]] = {
                                    'hash': null,
                                    'path': null,
                                    'lastChanged': null,
                                    'children': {},
                                    'latest': false
                                };
                            }
                        }

                        for (i = 0; i < oldRelIds.length; i++) {
                            if (newRelIds.indexOf(oldRelIds[i]) === -1) {
                                //removed child
                                delete treeObject.children[oldRelIds[i]];
                            }
                        }

                        //now we load the children and call ourselves recursively
                        self.core.loadChildren(node, function (err, children) {
                            if (err) {
                                return callback();
                            }

                            for (i = 0; i < children.length; i++) {
                                checkNode(children[i],
                                    treeObject.children[self.core.getRelid(children[i])],
                                    innerCallback);
                            }
                        });
                    } else {
                        treeObject.children = {}; //we clear just for sure
                        callback();
                    }
                } else {
                    callback();
                }
            };
        checkNode(root, self.tree, function () {
        });
    };
    return HistoryAddOn;
});