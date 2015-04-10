/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.item.stats', []
)
    .directive(
        'ilItemStats',
        function () {

            return {
                scope: false,
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemStats.html',
                require: '^itemList'
            };
        });