/*globals angular*/


'use strict';

angular.module(
    'isis.ui.searchBox', []

)
    .directive(
        'searchBox',
        function () {

            return {
                scope: {
                    handlers: '=',
                    config: '='
                },
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/searchBox.html'

            };
        });