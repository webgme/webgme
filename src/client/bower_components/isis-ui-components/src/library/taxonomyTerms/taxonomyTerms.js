/*globals angular*/
'use strict';

require('./taxonomyTerm.js');

angular.module(
    'isis.ui.taxonomyTerms', [
        'isis.ui.taxonomyTerm'
    ]

)
    .controller('TaxonomyTermsController', function () {

    })
    .directive(
        'taxonomyTerms',
        function () {

            return {
                scope: {
                    terms: '='
                },
                controller: 'TaxonomyTermsController',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/taxonomyTerms.html'

            };
        });