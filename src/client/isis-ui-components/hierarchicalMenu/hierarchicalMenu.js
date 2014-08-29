/*globals define, angular, alert*/

define([
    'angular',
    'text!./templates/hierarchicalMenu.html',
    'css!./styles/hierarchicalMenu.css'
], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.hierarchicalMenu', []
    ).directive(
        'hierarchicalMenu',
         function () {

             return {
                 scope: { menu: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});
