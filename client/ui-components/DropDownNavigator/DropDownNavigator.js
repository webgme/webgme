/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/DropDownNavigator.html',
    'css!./styles/dropDownNavigator.css'
], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.dropDownNavigator', []
    ).directive(
        'dropDownNavigator',
         function () {

             return {
                 scope: { navigator: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});