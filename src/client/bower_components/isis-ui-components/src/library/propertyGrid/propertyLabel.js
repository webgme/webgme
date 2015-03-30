/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyLabel.html',
    'css!./styles/propertyLabel.css'

], function (ng, template) {

    'use strict';

    angular.module(
        'isis.ui.propertyLabel', []

    )
        .directive(
            'propertyLabel',
            function () {

                return {
                    scope: {},
                    restrict: 'E',
                    replace: true,
                    template: template,
                    transclude: true

                };
            });


});