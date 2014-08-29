/*globals define, angular, alert*/

define([
    'angular',
    'text!./templates/dropdownNavigator.html',
    'css!./styles/dropdownNavigator.css',

    './../hierarchicalMenu/hierarchicalMenu'

], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.dropdownNavigator',
        [ 'isis.ui.hierarchicalMenu' ]
    ).directive(
        'dropdownNavigator',
         function () {

             return {
                 scope: { navigator: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});
