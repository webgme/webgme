/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyGrid.html',
    'css!./styles/propertyGrid.css',

    './propertyGridBody'

], function (ng, defaultTemplate) {

    'use strict';

    angular.module(
        'isis.ui.propertyGrid', [
            'isis.ui.propertyGridBody'
        ]

    )
        .directive(
            'propertyGrid', ['$log', '$compile',
                function ($log, $compile) {

                    return {
                        scope: {
                            gridData: '=',
                            unresponsive: '='
                        },
                        restrict: 'E',
                        replace: true,

                        controller: function ($scope, $element, $attrs) {
                            this.isUnresponsive = function () {
                                return $scope.unresponsive;
                            };
                        },

                        compile: function ($elm, $attrs) {
                            return {
                                pre: function ($scope, $elm, $attrs, controllers) {

                                    var template = angular.element(defaultTemplate);
                                    $elm.append($compile(template)($scope));


                                },
                                post: function ($scope, $elm, $attrs) {


                                }
                            };
                        }

                    };
                }
            ]
    );


});