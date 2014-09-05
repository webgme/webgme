/*globals define, console, angular*/


define(['js/client'], function (Client) {

    console.log('loaded');
    console.log(angular);

    angular.module('gme.services', [])

        .service('DataStoreService', function ($timeout, $q) {
            var datastores = {};

            this.connectToDatabase = function (context) {
                var deferred = $q.defer(), client;

                if (datastores.hasOwnProperty(context.db)) {
                    // FIXME: this may or may not ready yet...
                    deferred.resolve();
                } else {
                    // TODO: replace CONFIG with context
                    client = new Client(/*CONFIG*/);

                    // hold a reference to the client instance
                    datastores[context.db] = {client: client};


                    // TODO: add event listeners to client

                    client.connectToDatabaseAsync({}, function (err) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve();
                    });

                }

                return deferred.promise;
            };

            this.getDatabaseConnection = function (context) {
                if (datastores.hasOwnProperty(context.db) && typeof datastores[context.db] === 'object') {
                    return datastores[context.db];
                }

                console.error(context + ' does not have an active database connection.');
            };

            this.getProjects = function (context) {
                var deferred = $q.defer();

                this.connectToDatabase(context).then(function () {
                    datastores[context.db].client.getAvailableProjectsAsync(function (err, projectIds) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve(projectIds);
                    });
                });

                return deferred.promise;
            };

            this.selectProject = function (context) {
                var deferred = $q.defer();

                this.getProjects(context).then(function (projectIds) {

                    if (projectIds.indexOf(context.projectId) > -1) {
                        datastores[context.db].client.selectProjectAsync(context.projectId, function (err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }

                            datastores[context.db].projectId =
                                context.projectId;

                            deferred.resolve();
                        });
                    } else {
                        deferred.reject(new Error('Project does not exist. ' + context.projectId));
                    }
                });

                return deferred.promise;
            };


            this.selectBranch = function (context) {
                var deferred = $q.defer();

                this.selectProject(context).then(function () {
                    // FIXME: if branch does not exist the callback is not called,
                    //        then after (probably a timeout) it is called with no error???
                    datastores[context.db].client.selectBranchAsync(context.branchId,
                        function (err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }

                            datastores[context.db].branchId =
                                context.branchId;

                            deferred.resolve();
                        });
                });

                return deferred.promise;
            };
        })

        .service('ProjectService', function ($timeout, $q, DataStoreService) {

            this.openProject = function (context) {
                return DataStoreService.selectProject(context);
            };

            this.selectBranch = function (context) {
                return DataStoreService.selectBranch(context);
            };
        })

        .service('BranchService', function ($timeout, $q, ProjectService) {

            this.selectBranch = function (context) {
                return ProjectService.selectBranch(context);
            };
        })

        .service('NodeService', function ($timeout, $q, BranchService) {
            var Node,
                nodes,
                getIdFromNodeOrString;

            getIdFromNodeOrString = function (nodeOrId) {
                if (typeof nodeOrId === 'string') {
                    return nodeOrId;
                }

                if (typeof nodeOrId === 'object') {
                    if (nodeOrId.hasOwnProperty('getId')) {
                        return nodeOrId.getId();
                    } else {
                        console.error(nodeOrId, ' does not have a getId function');
                    }
                } else {
                    console.error(nodeOrId, ' is not a string nor an object.');
                }
            };

            NodeObj = function (databaseConnection, id) {
                this.databaseConnection = databaseConnection;
                this.id = id;
            };

            NodeObj.prototype.getAttribute = function (name) {
                return this.databaseConnection.client.getNode(this.id).getAttribute(name);
            };

            NodeObj.prototype.setAttribute = function (name, value, msg) {
                this.databaseConnection.client.setAttributes(this.id, name, value, msg);
            };


            NodeObj.prototype.getRegistry = function (name) {

            };

            NodeObj.prototype.setRegistry = function (name, value) {

            };

            NodeObj.prototype.getPointer = function (name) {

            };

            NodeObj.prototype.setPointer = function (name, nodeOrId) {

            };

            // TODO: add sets

            NodeObj.prototype.getBaseNode = function () {

            };


            NodeObj.prototype.getParentNode = function () {

            };

            NodeObj.prototype.getId = function () {

            };

            NodeObj.prototype.getGuid = function () {

            };


            NodeObj.prototype.getChildren = function () {

            };

            NodeObj.prototype.createChild = function (baseNodeOrId, name) {

            };

            NodeObj.prototype.destroy = function () {

            };

            NodeObj.prototype.getMetaType = function () {

            };

            NodeObj.prototype.isMetaTypeOf = function (nodeOrId) {

            };


            this.createChild = function (context, parameters) {
                // NS.createChild({parent: parentNode/id, base: baseNode/id}) – current one on client takes {parentId and baseId}
            };


            this.destroyNode = function (context, nodeOrId) {
                // NS.destroyNode(node/Id);
            };


            this.loadNode = function (context, id) {
                var deferred = $q.defer(),
                    dbConn = getDatabaseConnection(context),
                    territory,
                    nodes;

                dbConn.nodeService = dbConn.nodeService || {};
                dbConn.nodeService.nodes =  dbConn.nodeService.nodes || {};
                dbConn.nodeService.territoies = dbConn.nodeService.territoies || {};

                nodes = dbConn.nodeService.nodes;

                if (nodes.hasOwnProperty(id)) {
                    deferred.resolve(nodes[id]);
                } else {
                    // TODO: create territory if does not exist
                    if (dbConn.nodeService.territoies.hasOwnProperty(context.territoryId)) {
                        territory = dbConn.nodeService.territoies[context.territoryId];
                    } else {
                        dbConn.client.addUI(null, function (events) {
                            var i,
                                event;

                            // TODO: fill in this
                            for (i = 0; i < events.length; i += 1) {
                                event = events[i];
                                if (event.eid === id && event.etype === 'load') {
                                    // TODO: when node is loaded resolve promise
                                    nodes[id] =  new NodeObj(dbConn, id);
                                    deferred.resolve(nodes[id]);
                                }
                            }

                        }, context.territoryId);

                        // TODO: add territory rule
                        territory = {};
                        territory.id = context.territoryId;
                        territory.patterns = territory.patterns || {};
                        territory.patterns[id] = {children: 0}; // FIXME: how to update this correctly ???

                        dbConn.nodeService.territoies[context.territoryId] = territory;

                        dbConn.client.updateTerritory(context.territoryId, territory.patterns);
                    }
                }

                return deferred.promise;
            };
        }
    );
});