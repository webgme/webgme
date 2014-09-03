/*globals define, console, angular*/


define(['js/client'], function (Client) {

    console.log('loaded');
    console.log(angular);

    angular.module('gme.services', [])

        .service('DataStoreService', function ($timeout, $q) {
            var datastores = {};

            this.connectToDatabase = function (context) {
                var deferred = $q.defer();

                if (datastores.hasOwnProperty(context.db)) {
                    deferred.resolve();
                } else {
                    $timeout(function () {
                        console.log('connecting to database ', context);
                        datastores[context.db] = {a: 'some database object from the client', projectList: ['aa', 'test1']};
                        deferred.resolve();
                    }, 100);
                }

                return deferred.promise;
            };

            this.getProjects = function (context) {
                var deferred = $q.defer();

                this.connectToDatabase(context)
                    .then(function () {
                        deferred.resolve(datastores[context.db].projectList);
                    });

                return deferred.promise;
            };

        })

        .service('ProjectService', function ($timeout, $q, DataStoreService) {

            this.openProject = function (context) {
                var deferred = $q.defer();

                DataStoreService.connectToDatabase(context)
                    .then(function () {
                        $timeout(function () {
                            console.log('open project ', context);
                            deferred.resolve();
                        }, 100);
                    });

                return deferred.promise;
            };
        })

        .service('BranchService', function ($timeout, $q, ProjectService) {


            this.selectBranch = function (context) {
                var deferred = $q.defer();

                ProjectService.openProject(context)
                    .then(function () {
                        $timeout(function () {
                            console.log('select branch ', context);
                            deferred.resolve();
                        }, 100);
                    });

                return deferred.promise;
            };
        })

        .service('NodeService', function ($timeout, $q, BranchService) {


            this.getNode = function (context, path) {
                var deferred = $q.defer();

                BranchService.selectBranch(context)
                    .then(function () {

                        $timeout(function () {
                            console.log('getting node ', context, path);
                            deferred.resolve({id: path, name: 'Node name 1'});
                        }, Math.floor(Math.random() * 100));
                    });

                return deferred.promise;
            };
        })

    ;
});