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
                        datastores[context.db].client.selectProjectAsync(context.projectId,
                            function (err) {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }

                                datastores[context.db].projectId =
                                    context.projectId;

                                deferred.resolve();
                            });
                    } else {
                        deferred.reject(new Error('Project does not exist. ' +
                                context.projectId
                        ));
                    }
                });

                return deferred.promise;
            };


            this.selectBranch = function (context) {
                var deferred = $q.defer();

                this.selectProject(context).then(function () {
                    // FIXME: if branch does not exist the callback is not called, then after (probably a timeout) it is called with no error???
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
                nodes;

            Node = function (context) {

                this.context = context;
            };
            
            Node.prototype.getAttribute = function (name) {

            };

            Node.prototype.setAttribute = function (name, value) {

            };


            Node.prototype.getRegistry = function (name) {

            };

            Node.prototype.setRegistry = function (name, value) {

            };

            Node.prototype.getPointer = function (name) {

            };

            Node.prototype.setPointer = function (name, nodeOrId) {

            };

            // TODO: add sets

            Node.prototype.getParentNode = function () {

            };

            Node.prototype.getId = function () {

            };

            Node.prototype.getGuid = function () {

            };


            Node.prototype.getChildren = function () {

            };

            Node.prototype.createChild = function (baseNodeOrId, name) {

            };

            Node.prototype.destroy = function () {

            };

            Node.prototype.getMetaType = function () {

            };

            Node.prototype.isMetaTypeOf = function (nodeOrId) {

            };


            this.createChild = function (context, id) {
                // NS.createChild({parent: parentNode/id, base: baseNode/id}) – current one on client takes {parentId and baseId}
            };


            this.destroyNode = function (context, nodeOrId) {
                // NS.destroyNode(node/Id);
            };


            this.loadNode = function (context, path) {

            };
        }
    );
});