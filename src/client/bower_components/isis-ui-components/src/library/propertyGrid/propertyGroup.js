/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyGroup.html',
    'css!./styles/propertyGroup.css',

    './propertyGridRow'

], function (ng, template) {

    'use strict';

    angular.module(
        'isis.ui.propertyGroup', [
            'isis.ui.propertyGridRow'
        ]

    )
        .directive(
            'propertyGroup',
            function () {

                return {
                    scope: {
                        label: '=',
                        items: '=',
                        config: '='
                    },
                    restrict: 'E',
                    replace: true,
                    template: template

                };
            });


});