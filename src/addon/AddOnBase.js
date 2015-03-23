/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([],
    function () {
        'use strict';
        var AddOnBase = function (Core, storage, gmeConfig) {
            this._Core = Core;
            this._storage = storage;
            this.gmeConfig = gmeConfig;
            this.core = null;
            this.logger = null;
            this.project = null;
            this.branchName = '';
            this.projectName = '';
            this.commit = null;

        };
        AddOnBase.prototype.getName = function () {
            throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
            'when the js scripts are minified names are useless.');
        };

        AddOnBase.prototype._eventer = function () {
            var lastGuid = '',
                self = this,
                nextServerEvent = function (err, guid, parameters) {
                    lastGuid = guid || lastGuid;
                    if (!err && parameters) {
                        switch (parameters.type) {
                            case 'PROJECT_CREATED':
                            case 'PROJECT_DELETED':
                            case 'BRANCH_CREATED':
                            case 'BRANCH_DELETED':
                                //TODO can be handled later
                                return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                            case 'BRANCH_UPDATED':
                                if (self.projectName === parameters.project && self.branchName === parameters.branch) {
                                    self.project.loadObject(parameters.commit, function (err, commit) {
                                        if (err || !commit) {
                                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                        }

                                        self.commit = parameters.commit;
                                        self.core.loadRoot(commit.root, function (err, root) {
                                            if (err) {
                                                return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                            }
                                            self.update(root); // FIXME: This is most likely an asynchronous function..
                                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                        });
                                    });
                                } else {
                                    return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                }
                        }
                    } else {
                        setTimeout(function () {
                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                        }, 1000);
                    }
                };
            self._storage.getNextServerEvent(lastGuid, nextServerEvent);
        };

        AddOnBase.prototype.init = function (parameters) {
            // This is the part of the start process which should always be done,
            // so this function should be always called from the start.
            if (!(parameters.projectName && parameters.branchName && parameters.project)) {
                return false;
            }
            this.project = parameters.project;
            this.core = new this._Core(this.project, {globConf: this.gmeConfig});
            this.projectName = parameters.projectName;
            this.branchName = parameters.branchName;

            //start the eventing
            this._eventer();
            return true;
        };

        AddOnBase.prototype.start = function (parameters, callback) {
            //this is the initialization function it could be overwritten or use as it is
            if (this.init(parameters)) {
                callback(null);
            } else {
                callback(new Error('basic initialization failed, check parameters!'));
            }
        };

        AddOnBase.prototype.update = function (root) {
            throw new Error('The update function is a main point of an addOn\'s functionality so it must be' +
                'overwritten.');
        };

        AddOnBase.prototype.query = function (parameters, callback) {
            callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
        };

        AddOnBase.prototype.stop = function (callback) {
            callback(new Error('This function must be overwritten to make sure that the addOn stops properly.'));
        };


        return AddOnBase;
    });