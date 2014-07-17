/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/GMENavigator.html',
    'css!./styles/GMENavigator.css'
], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'gme.ui.gmeNavigator', []
    ).directive(
        'gmeNavigator',
         function () {

             return {
                 scope: { navigator: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});