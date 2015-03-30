/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyValue.html',
    'css!./styles/propertyValue.css',

    './valueWidgets'

], function (ng, defaultTemplate) {

    'use strict';

    angular.module(
        'isis.ui.propertyValue', [
            'isis.ui.valueWidgets'
        ]

    )
        .directive(
            'propertyValue', ['$log', '$compile', '$valueWidgets',
                function ($log, $compile) {

                    return {
                        restrict: 'E',
                        replace: true,
                        template: defaultTemplate,
                        scope: false
                    };
                }
            ]);


});