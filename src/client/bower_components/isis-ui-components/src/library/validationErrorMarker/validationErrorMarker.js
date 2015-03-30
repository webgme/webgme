/*globals angular*/
'use strict';

require('../contextmenu/contextmenu.js');

angular.module(
    'isis.ui.validationErrorMarker', ['isis.ui.contextmenu']
)
    .controller(
        'ValidationMarkerController',
        function ($scope) {

            $scope.errorMenuConfig = {
                triggerEvent: 'click',
                position: 'right bottom',
                contentTemplateUrl: '/isis-ui-components/templates/validationErrorMarkerMessages.html',
                doNotAutoClose: true,
                menuParentScope: $scope
            };

            $scope.getValidationErrorMessages = function () {

                var messages = [];

                angular.forEach($scope.validationErrors, function (v, key) {
                    messages.push($scope.errorMessages[key]);
                });

                return messages;
            };

        }
)
// .controller(
//  'ValidationErrorMarkerMessagesController',
//  function () {
//  }
//)
.directive(
    'validationErrorMarker',
    function () {

        return {
            scope: {
                errorMessages: '=',
                embedded: '='
            },
            restrict: 'E',
            replace: true,
            controller: 'ValidationMarkerController',
            templateUrl: '/isis-ui-components/templates/validationErrorMarker.html',
            require: '^ngModel',
            link: function (scope, element, attributes, ngModel) {

                scope.validationErrors = [];
                scope.invalid = false;

                scope.$watch(
                    function () {
                        return ngModel.$invalid;
                    },
                    function (newVal) {

                        scope.invalid = newVal;

                        if (scope.invalid) {

                        }

                        scope.validationErrors = ngModel.$error;

                    }
                );

            }
        };
    });