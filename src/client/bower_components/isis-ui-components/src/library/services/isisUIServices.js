/*globals angular*/

'use strict';

angular.module(
    'isis.ui.services', []
)

.service('isisTemplateService', ['$http', '$templateCache', '$q',
    function ($http, $templateCache, $q) {

        this.getTemplate = function (template, templateUrl) {

            var deferred,
                cachedTemplate;

            deferred = $q.defer();

            if (template) {

                deferred.resolve(template);

            } else if (templateUrl) {

                cachedTemplate = $templateCache.get(templateUrl);

                if (cachedTemplate) {
                    deferred.resolve(cachedTemplate);
                } else {

                    $http({
                        method: 'GET',
                        url: templateUrl,
                        cache: true
                    })
                        .then(function (result) {

                            $templateCache.put(templateUrl, result.data);
                            deferred.resolve(result.data);

                        })
                        .
                    catch (function (error) {
                        deferred.reject(error);
                    });

                }
            } else {
                deferred.reject('No template or templateUrl has been specified.');
            }

            return deferred.promise;
        };


    }
]);