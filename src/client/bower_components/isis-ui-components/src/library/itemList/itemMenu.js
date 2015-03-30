/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.item.menu', []
)
    .directive(

        'ilItemMenu',

        function () {

            return {
                restrict: 'E',
                replace: true,
                require: '^itemList',
                templateUrl: '/isis-ui-components/templates/itemMenu.html'
            };


        });