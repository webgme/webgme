/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyGridBody.html',
    'css!./styles/propertyGridBody.css',

    './propertyGroup'

], function (ng, template) {

    'use strict';

    angular.module(
        'isis.ui.propertyGridBody', [
            'isis.ui.propertyGroup'
        ]

    )
        .directive(
            'propertyGridBody',
            function () {

                return {
                    scope: {
                        propertyGroups: '=',
                        config: '='
                    },
                    restrict: 'E',
                    replace: true,
                    template: template

                };
            });


});