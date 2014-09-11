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

                    // FIXME: deferred should not be used from closure
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

                // FIXME: deferred should not be used from closure
                this.connectToDatabase(context).then(function () {
                    datastores[context.db].client.getAvailableProjectsAsync(function (err, projectIds) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve(projectIds);
                    });
                })
                    .catch(function (reason) {
                        deferred.reject(reason);
                    });

                return deferred.promise;
            };

            this.selectProject = function (context) {
                var deferred = $q.defer();

                // FIXME: deferred, context should not be used from closure
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
                })
                    .catch(function (reason) {
                        deferred.reject(reason);
                    });

                return deferred.promise;
            };


            this.selectBranch = function (context) {
                var deferred = $q.defer();

                // FIXME: deferred, context should not be used from closure
                this.selectProject(context)
                    .then(function () {
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
                    })
                    .catch(function (reason) {
                        deferred.reject(reason);
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

        .service('BranchService', function ($timeout, $q, ProjectService, DataStoreService) {

            this.selectBranch = function (context) {
                return ProjectService.selectBranch(context);
            };

            this.on = function (context, eventName, fn) {
                var dbConn;

                console.assert(typeof context === 'object');
                console.assert(typeof eventName === 'string');
                console.assert(typeof fn === 'function');

                dbConn = DataStoreService.getDatabaseConnection(context);
                dbConn.branchService = dbConn.branchService || {};

                dbConn.branchService.isInitialized = dbConn.branchService.isInitialized || false;

                if (typeof dbConn.branchService.events === 'undefined') {
                    // TODO: register for project events

                    // this should not be an inline function
                    (function (dbConnEvent, c) {
                        var i;

                        dbConnEvent.client.addEventListener(dbConnEvent.client.events.BRANCH_CHANGED, function (projectId /* FIXME */, branchId) {

                            dbConnEvent.branchId = branchId;
                            console.log('There was a BRANCH_CHANGED event');
                            if (branchId) {
                                // initialize
                                if (dbConnEvent.branchService &&
                                    dbConnEvent.branchService.events &&
                                    dbConnEvent.branchService.events.initialize) {

                                    dbConnEvent.branchService.isInitialized = true;

                                    for (i = 0; i < dbConnEvent.branchService.events.initialize.length; i += 1) {
                                        dbConnEvent.branchService.events.initialize[i](c);
                                    }
                                }
                            } else {
                                // branchId is falsy, empty or null or undefined
                                // destroy
                                if (dbConnEvent.branchService &&
                                    dbConnEvent.branchService.events &&
                                    dbConnEvent.branchService.events.destroy) {

                                    dbConnEvent.branchService.isInitialized = false;

                                    for (i = 0; i < dbConnEvent.branchService.events.destroy.length; i += 1) {
                                        dbConnEvent.branchService.events.destroy[i](c);
                                    }
                                }
                            }
                        });
                    })(dbConn, context);

                }

                dbConn.branchService.events = dbConn.branchService.events || {};
                dbConn.branchService.events[eventName] = dbConn.branchService.events[eventName] || [];
                dbConn.branchService.events[eventName].push(fn);

                if (dbConn.branchService.isInitialized) {
                    if (eventName === 'initialize') {
                        fn(context);
                    }
                } else {
                    if (eventName === 'destroy') {
                        fn(context);
                    }
                }

                // TODO: register for branch change event OR BranchService onInitialize
            };
        })

        .service('NodeService', function ($timeout, $q, DataStoreService, BranchService) {
            var self = this,
                Node,
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
                this._onUpdate = function (id) { };
                this._onUnload = function (id) { };
                // This will always be called on unload.
                this.__onUnload = function () {
                    if (databaseConnection.nodeService.territories.hasOwnProperty(id)) {
                        delete databaseConnection.nodeService.territories[id];
                        databaseConnection.client.removeUI(id);
                    }
                };
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

            /** Gets nodeIds of nodes this node points 'to' and is pointed to 'from'.
             * @param name - name of pointer.
             * @returns {object} - with keys 'to' {string} and 'from' {[string]}
             */
            NodeObj.prototype.getPointer = function (name) {
                return this.databaseConnection.client.getNode(this.id).getPointer(name);
            };

            NodeObj.prototype.setPointer = function (name, nodeOrId) {

            };

            // TODO: add sets

            NodeObj.prototype.getBaseNode = function () {

            };

            NodeObj.prototype.getParentId = function () {

            };

            NodeObj.prototype.getParentNode = function () {

            };

            NodeObj.prototype.getId = function () {
                return this.id;
            };

            NodeObj.prototype.getBaseId = function () {
                return this.databaseConnection.client.getNode(this.id).getBaseId();
            };

            NodeObj.prototype.getGuid = function () {
                return this.databaseConnection.client.getNode(this.id).getGuid();
            };

            NodeObj.prototype.getChildrenIds = function () {
                return this.databaseConnection.client.getNode(this.id).getChildrenIds();
            };

            // FIXME : Can context be resolved from the node?
            NodeObj.prototype.loadChildren = function (context) {
                var childrenIds = this.getChildrenIds(),
                    queueList = [],
                    all,
                    i;

                for (i = 0; i < childrenIds.length; i += 1) {
                    queueList.push(self.loadNode2(context, childrenIds[i]));
                }
                return $q.all(queueList);
            };

            NodeObj.prototype.createChild = function (baseNodeOrId, name) {

            };

            NodeObj.prototype.destroy = function () {

            };

            NodeObj.prototype.getMemberIds = function (name) {
                return this.databaseConnection.client.getNode(this.id).getMemberIds(name);
            };

            NodeObj.prototype.getMetaType = function () {

            };

            NodeObj.prototype.isMetaTypeOf = function (metaNode) {
                var idWasGiven = false,
                    node = this.databaseConnection.client.getNode(this.id);

                while (node) {
                    if (node.getId() === metaNode.getId()) {
                        return true;
                    }
                    node = this.databaseConnection.client.getNode(node.getBaseId());
                }
                return false;
            };

            this.createChild = function (context, parameters) {
                // NS.createChild({parent: parentNode/id, base: baseNode/id}) – current one on client takes {parentId and baseId}
            };

            this.destroyNode = function (context, nodeOrId) {
                // NS.destroyNode(node/Id);
            };

            NodeObj.prototype.onUpdate = function(fn) {
                console.assert(typeof fn === 'function');
                this._onUpdate = fn;
            };

            NodeObj.prototype.onUnload = function(fn) {
                console.assert(typeof fn === 'function');
                this._onUnload = fn;
            };

            // FIXME : Can context be resolved from the node?
            NodeObj.prototype.onNewChildLoaded = function (context, fn) {
                var dbConn = DataStoreService.getDatabaseConnection(context),
                    territory,
                    nodes,
                    id = this.id,
                    terrId = context.territoryId + '_' + id + '_new_children_watch'; //FIXME: This probably needs some elaboration
                console.log(dbConn);
                if (dbConn.nodeService.territories.hasOwnProperty(terrId)) {
                    console.warn('Children are already being watched for ', terrId);
                } else {
                    dbConn.client.addUI({}, function (events) {
                        var i,
                            event;
                        for (i = 0; i < events.length; i += 1) {
                            event = events[i];
                            if (event.etype === 'load') {
                                if (dbConn.nodeService.territories.hasOwnProperty(context.territoryId + '_' + event.eid) === false) {
                                    self.loadNode2(context, event.eid).then(function (newNode) {
                                        fn(newNode);
                                        console.log('Added new territory through onNewChildLoaded ', event.eid);
                                    });
                                } else {
                                    console.info('Node ' + event.eid + ' was loaded in ' + terrId + ' but it already has ' +
                                        'a territory.');
                                }
                            } else {
                                // These node are just watched for loading..
                            }
                        }
                    }, terrId);

                    territory = {};
                    dbConn.nodeService.territories[terrId] = territory;
                    territory.id = terrId;
                    territory.patterns = {};
                    territory.patterns[id] = {children: 1};
                    dbConn.client.updateTerritory(terrId, territory.patterns);
                }
            };

            this.getMetaNodes = function (context) {
                var deferred = $q.defer(),
                    dbConn = DataStoreService.getDatabaseConnection(context),
                    metaNodes;
                self.loadNode2(context, '').then(function (rootNode) {
                    var metaNodeIds = rootNode.getMemberIds('MetaAspectSet'),
                        queueList = [],
                        i;
                    console.log(metaNodeIds);
                    for (i = 0; i < metaNodeIds.length; i += 1) {
                        queueList.push(self.loadNode2(context, metaNodeIds[i]));
                    }
                    $q.all(queueList).then(function (metaNodes) {
                        var key,
                            metaNode,
                            meta = {};
                        for (key in metaNodes) {
                            if (metaNodes.hasOwnProperty(key)) {
                                metaNode = metaNodes[key];
                                meta[metaNode.getAttribute('name')] = metaNode;
                            }
                        }
                        deferred.resolve(meta);
                    });
                });

                return deferred.promise;
            }

            this.loadNode2 = function (context, id) {
                var deferred = $q.defer(),
                    dbConn = DataStoreService.getDatabaseConnection(context),
                    territoryId = context.territoryId + '_' + id,
                    nodes;

                dbConn.nodeService = dbConn.nodeService || {};
                dbConn.nodeService.nodes =  dbConn.nodeService.nodes || {};
                dbConn.nodeService.territories = dbConn.nodeService.territories || {};

                nodes = dbConn.nodeService.nodes;
                console.log('territoryId', territoryId);
                if (nodes.hasOwnProperty(id)) {
                    deferred.resolve(nodes[id]);
                    console.log('Node already loaded..');
                } else {
                    if (dbConn.nodeService.territories.hasOwnProperty(territoryId)) {
//                        territory = dbConn.nodeService.territories[id];
                        deferred.reject('Territory exists, but node does not!');
                    } else {
                        dbConn.client.addUI({}, function (events) {
                            var i,
                                event;

                            for (i = 0; i < events.length; i += 1) {
                                event = events[i];
                                if (id !== event.eid) {
                                    continue;
                                }
                                if (event.etype === 'load') {
                                    nodes[id] =  new NodeObj(dbConn, id);
                                    deferred.resolve(nodes[id]);
                                } else if (event.etype === 'update') {
                                    nodes[id]._onUpdate(event.eid);
                                } else if (event.etype === 'unload') {
                                    nodes[id]._onUnload(event.eid);
                                    nodes[id].__onUnload();
                                } else {
                                    throw 'Unexpected event type' + events[i].etype;
                                }
                            }
                        }, territoryId);


                        territory = {};
                        dbConn.nodeService.territories[territoryId] = territory;
                        territory.id = territoryId;
                        territory.patterns = territory.patterns || {};
                        territory.patterns[id] = {children: 0};
                        dbConn.client.updateTerritory(territoryId, territory.patterns);
                    }
                }

                return deferred.promise;
            };

            this.loadNode = function (context, id) {
                var deferred = $q.defer(),
                    dbConn = DataStoreService.getDatabaseConnection(context),
                    territory,
                    nodes;

                dbConn.nodeService = dbConn.nodeService || {};
                dbConn.nodeService.nodes =  dbConn.nodeService.nodes || {};
                dbConn.nodeService.territories = dbConn.nodeService.territories || {};

                nodes = dbConn.nodeService.nodes;

                if (nodes.hasOwnProperty(id)) {
                    deferred.resolve(nodes[id]);
                } else {
                    // TODO: create territory if does not exist
                    if (dbConn.nodeService.territories.hasOwnProperty(context.territoryId)) {
                        territory = dbConn.nodeService.territories[context.territoryId];
                    } else {
                        dbConn.client.addUI({}, function (events) {
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

                        dbConn.nodeService.territories[context.territoryId] = territory;

                        dbConn.client.updateTerritory(context.territoryId, territory.patterns);
                    }
                }

                return deferred.promise;
            };

            this.on = function (context, eventName, fn) {
                var dbConn;

                console.assert(typeof context === 'object');
                console.assert(typeof eventName === 'string');
                console.assert(typeof fn === 'function');

                dbConn = DataStoreService.getDatabaseConnection(context);
                dbConn.nodeService = dbConn.nodeService || {};

                dbConn.nodeService.isInitialized = dbConn.nodeService.isInitialized || false;

                if (typeof dbConn.nodeService.events === 'undefined') {
                    BranchService.on(context, 'initialize', function (c) {
                        var dbConnEvent = DataStoreService.getDatabaseConnection(c),
                            i;

                        if (dbConnEvent.nodeService &&
                            dbConnEvent.nodeService.events &&
                            dbConnEvent.nodeService.events.initialize) {

                            dbConnEvent.nodeService.isInitialized = true;

                            for (i = 0; i < dbConnEvent.nodeService.events.initialize.length; i += 1) {
                                dbConnEvent.nodeService.events.initialize[i](c);
                            }
                        }
                    });

                    BranchService.on(context, 'destroy', function (c) {
                        var dbConnEvent = DataStoreService.getDatabaseConnection(c),
                            i;

                        if (dbConnEvent.nodeService &&
                            dbConnEvent.nodeService.events &&
                            dbConnEvent.nodeService.events.destroy) {

                            dbConnEvent.nodeService.isInitialized = false;

                            for (i = 0; i < dbConnEvent.nodeService.events.destroy.length; i += 1) {
                                dbConnEvent.nodeService.events.destroy[i](c);
                            }
                        }
                    });
                }

                dbConn.nodeService.events = dbConn.nodeService.events || {};
                dbConn.nodeService.events[eventName] = dbConn.nodeService.events[eventName] || [];
                dbConn.nodeService.events[eventName].push(fn);
                // This might be hacky, but if an initialize event is registered before the database
                // is opened the NodeService initialize event registered after the database has been 
                // opened will also be called.
                if (dbConn.nodeService.isInitialized || dbConn.branchService.isInitialized) {
                    if (eventName === 'initialize') {
                        fn(context);
                    }
                } else {
                    if (eventName === 'destroy') {
                        fn(context);
                    }
                }

                // TODO: register for branch change event OR BranchService onInitialize
            };

        }
    );
});