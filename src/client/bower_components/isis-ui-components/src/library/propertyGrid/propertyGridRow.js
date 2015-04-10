/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyGridRow.html',
    'css!./styles/propertyGridRow.css',

    './propertyLabel',
    './propertyValue'

], function (ng, template) {

    'use strict';

    angular.module(
        'isis.ui.propertyGridRow', [
            'isis.ui.propertyLabel',
            'isis.ui.propertyValue'
        ]

    )
        .directive(
            'propertyGridRow',
            function () {

                return {
                    scope: {
                        label: '=',
                        values: '=',
                        config: '='
                    },
                    restrict: 'E',
                    replace: true,
                    template: template,
                    require: '?^propertyGrid',
                    link: function ($scope, element, attrs, gridCtl) {
                        if (gridCtl) {
                            $scope.unresponsive = gridCtl.isUnresponsive();
                        }
                    }
                };
            });


});