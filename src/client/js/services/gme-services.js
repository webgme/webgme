/*globals angular, console */

angular.module('gme.services', [])

    .service('DataStoreServiceTest', function ($timeout, $q) {

        this.connectToDatabase = function (context) {
            console.log('connecting to database...');

            var client = new WebGMEGlobal.classes.Client({
                host: window.location.origin
            });

            client.connectToDatabaseAsync({}, function (err) {
                if (err) {
                    console.error(err);
                    return;
                }

                client.getAvailableProjectsAsync(function (err, list) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    console.log(list);
                });
            });
        };
    })
    .service('DataStoreService', function ($timeout, $q) {
        var datastores = {};

        this.connectToDatabase = function (context) {
            var deferred = $q.defer(), client;

            if (datastores.hasOwnProperty(context.db)) {
                // FIXME: this may or may not ready yet...
                deferred.resolve();
            } else {
                // TODO: replace CONFIG with context
                client = new WebGMEGlobal.classes.Client({
                    host: window.location.origin
                });

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
            this.connectToDatabase(context)
                .then(function () {
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
            NodeObj,
            getIdFromNodeOrString;

        /**
         * Loads the meta nodes from the context (will create a node-service on the dbConn with regions if not present when invoked).
         * @param {object} context - From where to load the nodes.
         * @param {string} context.db - Database where the nodes will be loaded from.
         * @param {string} context.projectId - Project where the nodes will be loaded from.
         * @param {string} context.branchId - Branch where the nodes will be loaded from.
         * @param {string} context.regionId - Region where the NodeObjs will be stored.
         * @returns {Promise} - Returns an array of NodeObjs when resolved.
         */
        this.getMetaNodes = function (context) {
            var deferred = $q.defer();
            self.loadNode(context, '').then(function (rootNode) {
                var metaNodeIds = rootNode.getMemberIds('MetaAspectSet'),
                    queueList = [],
                    i;
                //console.log(metaNodeIds);
                for (i = 0; i < metaNodeIds.length; i += 1) {
                    queueList.push(self.loadNode(context, metaNodeIds[i]));
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
        };

        /**
         * Loads a node from context (will create a node-service on the dbConn with regions if not present when invoked).
         * @param {object} context - From where to look for the node.
         * @param {string} context.db - Database where the node will be looked for.
         * @param {string} context.projectId - Project where the node will be looked for.
         * @param {string} context.branchId - Branch where the node will be looked for.
         * @param {string} context.regionId - Region where the NodeObj will be stored.
         * @param {string} id - Path to the node.
         * @returns {Promise} - Returns a NodeObj when resolved.
         */
        this.loadNode = function (context, id) {
            var deferred = $q.defer(),
                dbConn = DataStoreService.getDatabaseConnection(context),
                territoryId,
                territoryPattern = {},
                nodes;

            console.assert(typeof context.regionId === 'string');

            territoryId = context.regionId + '_' + id;
            dbConn.nodeService = dbConn.nodeService || {};
            dbConn.nodeService.regions = dbConn.nodeService.regions || {};
            dbConn.nodeService.regions[context.regionId] = dbConn.nodeService.regions[context.regionId] || {
                regionId: context.regionId,
                nodes: {}
            };

            nodes = dbConn.nodeService.regions[context.regionId].nodes;
            //console.log('territoryId', territoryId);
            if (nodes.hasOwnProperty(id)) {
                console.log('Node already loaded..', id);
                deferred.resolve(nodes[id]);
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
                            nodes[id] = new NodeObj(context, id);
                            nodes[id].territories.push(territoryId);
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

                territoryPattern[id] = {children: 0};
                dbConn.client.updateTerritory(territoryId, territoryPattern);
            }

            return deferred.promise;
        };

        /**
         * Creates a new node in the database and returns with the NodeObj.
         * @param {object} context - Where to create the node.
         * @param {string} context.db - Database where the node will be created.
         * @param {string} context.projectId - Project where the node will be created.
         * @param {string} context.branchId - Branch where the node will be created.
         * @param {string} context.regionId - Region where the NodeObj will be stored.
         * @param {NodeObj|string} parent - model where the node should be created.
         * @param {NodeObj|string} base - base, e.g. meta-type, of the new node.
         * @param {string} [msg] - optional commit message.
         * @returns {Promise} - Evaluates to the newly created node (inside context).
         */
        this.createNode = function (context, parent, base, msg) {
            var deferred = $q.defer(),
                dbConn = DataStoreService.getDatabaseConnection(context),
                parentId = getIdFromNodeOrString(parent),
                baseId = getIdFromNodeOrString(base),
                id;

            id = dbConn.client.createChild({parentId: parentId, baseId: baseId}, msg);

            self.loadNode(context, id, function (node) {
                deferred.resolve(node);
            });

            return deferred.promise;
        };

        /**
         * Creates a new node in the database and returns with its assigned id (path).
         * @param {object} context - Where to create the node.
         * @param {string} context.db - Database where the node will be created.
         * @param {string} context.projectId - Project where the node will be created.
         * @param {string} context.branchId - Branch where the node will be created.
         * @param {object} parameters - as in client.createChild (see this.createNode for example).
         * @param {string} [msg] - optional commit message.
         * @returns {string} - id (path) of new node.
         */
        this.createChild = function (context, parameters, msg) {
            var dbConn = DataStoreService.getDatabaseConnection(context);
            return dbConn.client.createChild(parameters, msg);
        };

        /**
         * Removes the node from the context.
         * @param {object} context - From where to delete the node.
         * @param {string} context.db - Database from where the node will be deleted.
         * @param {string} context.projectId - Project from where the node will be deleted.
         * @param {string} context.branchId - Branch from where the node will be deleted.
         * @param {NodeObj|string} nodeOrId - node that should be deleted (the NodeObj(s) will be removed from all regions through __OnUnload()).
         * @param {string} [msg] - optional commit message.
         */
        this.destroyNode = function (context, nodeOrId, msg) {
            var dbConn = DataStoreService.getDatabaseConnection(context),
                id = getIdFromNodeOrString(nodeOrId),
                nodeToDelete = dbConn.client.getNode(id);
            if (nodeToDelete) {
                dbConn.client.delMoreNodes([id], msg);
            } else {
                console.warn('Requested deletion of node that does not exist in context! (id, context) ', id, context);
            }
        };

        /**
         * Removes all references and listeners attached to any NodeObj in the region.
         * N.B. This function must be invoked for all regions that a "user" created.
         * This is typically done in the "$scope.on($destroy)"-function of a controller.
         * @param {object} context - context region is part of.
         * @param {string} context.regionId - Region to clean-up.
         */
        this.cleanUpRegion = function (context) {
            var key,
                dbConn = DataStoreService.getDatabaseConnection(context),
                nodes = dbConn.nodeService.regions[context.regionId].nodes;
            // Go through all nodes and remove the territories associated with each node.
            for (key in nodes) {
                if (nodes.hasOwnProperty(key)) {
                    nodes[key].cleanUpNode();
                }
            }
            // Remove the reference to the region (includes) nodes.
            delete dbConn.nodeService.regions[context.regionId];
        };

        /**
         * Logs the data-base connection with its node-services and regions therein.
         * @param context - The context to log.
         */
        this.logContext = function (context) {
            var dbConn = DataStoreService.getDatabaseConnection(context);
            console.log('logContext: ', context.regionId, dbConn);
        };

        NodeObj = function (context, id) {
            var thisNode = this;
            this.id = id;
            this.territories = [ ];
            this.context = context;
            this.databaseConnection = DataStoreService.getDatabaseConnection(context);
            // TODO: Should these be arrays of functions? The controller may want to add more methods.
            this._onUpdate = function (id) {
            };
            this._onUnload = function (id) {
            };
            // This will always be called on unload.
            this.__onUnload = function () {
                thisNode.cleanUpNode();
                delete thisNode.databaseConnection.nodeService.regions[context.regionId].nodes[thisNode.id];
            };
        };

        NodeObj.prototype.cleanUpNode = function () {
            var i;
            // This ought to remove all references to event handlers in the client.
            for (i = 0; i < this.territories.length; i += 1) {
                this.databaseConnection.client.removeUI(this.territories[i]);
            }
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
         * @param {string} name - name of pointer, e.g. 'src', 'dst'.
         * @returns {object} pointers - object with ids.
         * @returns {string} pointers.to - node id the pointer of this NodeObj points to.
         * @returns {[string]} pointers.from - node ids of nodes that points to this NodeObj through the pointer.
         */
        NodeObj.prototype.getPointer = function (name) {
            return this.databaseConnection.client.getNode(this.id).getPointer(name);
        };

        NodeObj.prototype.setPointer = function (name, nodeOrId, msg) {

        };

        // TODO: add sets

        NodeObj.prototype.getBaseNode = function () {
            // TODO: add proper error handling
            return self.loadNode(this.context, this.getBaseId());
        };

        NodeObj.prototype.getParentId = function () {
            return this.databaseConnection.client.getNode(this.id).getParentId();
        };

        NodeObj.prototype.getParentNode = function () {
            // TODO: add proper error handling
            return self.loadNode(this.context, this.getParentId());
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

        NodeObj.prototype.loadChildren = function () {
            var childrenIds = this.getChildrenIds(),
                queueList = [],
                i;

            for (i = 0; i < childrenIds.length; i += 1) {
                queueList.push(self.loadNode(this.context, childrenIds[i]));
            }

            return $q.all(queueList);
        };

        NodeObj.prototype.createChild = function (baseNodeOrId, name) {

        };

        /**
         * Removes the node from the data-base. (All regions within the same context should get onUnload events).
         * @param [msg] - Optional commit message.
         */
        NodeObj.prototype.destroy = function (msg) {
            // TODO: Perhaps remove the node from its context/region at this point? Now it waits for the unload event
            self.destroyNode(this.context, this.id, msg);
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

        NodeObj.prototype.onUpdate = function (fn) {
            console.assert(typeof fn === 'function');
            this._onUpdate = fn;
        };

        NodeObj.prototype.onUnload = function (fn) {
            console.assert(typeof fn === 'function');
            this._onUnload = fn;
        };

        NodeObj.prototype.onNewChildLoaded = function (fn) {
            var dbConn = this.databaseConnection,
                context = this.context,
                territoryPattern = {},
                id = this.id,
                terrId = context.regionId + '_' + id + '_new_children_watch';
            //console.log(dbConn);
            if (this.territories.indexOf(terrId) > -1) {
                console.warn('Children are already being watched for ', terrId);
            } else {
                this.territories.push(terrId);
                dbConn.client.addUI({}, function (events) {
                    var i,
                        event;
                    for (i = 0; i < events.length; i += 1) {
                        event = events[i];
                        if (event.etype === 'load') {
                            if (dbConn.nodeService.regions[context.regionId].nodes.hasOwnProperty(event.eid) === false) {
                                self.loadNode(context, event.eid).then(function (newNode) {
                                    fn(newNode);
                                    //console.log('Added new territory through onNewChildLoaded ', event.eid);
                                });
                            } else {
                                //console.info('Node ' + event.eid + ' was loaded in ' + terrId + ' but it already' +
                                //    ' existed in the nodes of the region: ' + context.regionId);
                            }
                        } else {
                            // These node are just watched for loading..
                        }
                    }
                }, terrId);

                territoryPattern[id] = {children: 1};
                dbConn.client.updateTerritory(terrId, territoryPattern);
            }
        };

        getIdFromNodeOrString = function (nodeOrId) {
            if (typeof nodeOrId === 'string') {
                return nodeOrId;
            }

            if (typeof nodeOrId === 'object') {
                if (typeof nodeOrId['getId'] === 'function') {
                    return nodeOrId.getId();
                } else {
                    console.error(nodeOrId, ' does not have a getId function');
                }
            } else {
                console.error(nodeOrId, ' is not a string nor an object.');
            }
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
                    dbConn.nodeService.isInitialized = true;
                    fn(context);
                }
            } else {
                if (eventName === 'destroy') {
                    fn(context);
                }
            }

            // TODO: register for branch change event OR BranchService onInitialize
        };
    });