/*globals angular*/
'use strict';

angular.module(
    'isis.ui.taxonomyTerm', []

)
    .controller('TaxonomyTermController', function ($scope) {

        $scope.getTermUrl = function () {
            return ($scope.term && $scope.term.url) || '#';
        };

    })
    .directive(
        'taxonomyTerm',
        function () {

            return {
                scope: {
                    term: '='
                },
                controller: 'TaxonomyTermController',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/taxonomyTerm.html'

            };
        });