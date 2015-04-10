/*globals angular*/
'use strict';

angular.module(
    'isis.ui.dropdownNavigator', ['isis.ui.hierarchicalMenu']
)
    .directive(
        'dropdownNavigator',
        function () {

            return {
                scope: {
                    navigator: '='
                },
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/dropdownNavigator.html'
            };
        });