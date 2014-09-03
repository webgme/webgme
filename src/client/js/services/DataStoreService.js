/*globals define, console, angular*/


define(['js/client'], function (Client) {

    console.log('loaded');
    console.log(angular);

    angular.module('gme.services', [])

        .service('DataStoreService', function ($timeout, $q) {
            this.connectToDatabase = function () {
                var deferred = $q.defer();

                $timeout(function () {
                    deferred.resolve({
                        openProject: function (projectId) {
                            var d = $q.defer();

                            console.log('open project ' + projectId);

                            $timeout(function () {
                                d.resolve({id: projectId, branches: ['master', 'develop']});
                            }, 100);

                            return d.promise;
                        }
                    });
                }, 1000);


                return deferred.promise;
            };

        });
});