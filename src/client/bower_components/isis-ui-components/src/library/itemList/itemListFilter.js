/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.filter', []
)
    .directive(
        'itemListFilter',
        function () {

            return {
                scope: false,
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemListFilter.html',
                require: '^itemList'
            };
        });