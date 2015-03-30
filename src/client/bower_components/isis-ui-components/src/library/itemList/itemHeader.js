/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.item.header', []
)
    .directive(

        'ilItemHeader',

        function () {

            return {
                restrict: 'E',
                replace: true,
                require: '^itemList',
                templateUrl: '/isis-ui-components/templates/itemHeader.html'
            };


        });