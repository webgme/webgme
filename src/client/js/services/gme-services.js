/*globals angular, console */

angular.module('gme.services', [])

    .service('DataStoreService', function ($timeout, $q) {
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
    });