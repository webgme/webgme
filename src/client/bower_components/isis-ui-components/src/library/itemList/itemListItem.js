/*globals angular*/
'use strict';

require('./itemStats.js');
require('./itemMenu.js');
require('./itemDetails.js');
require('./itemHeader.js');

angular.module(
    'isis.ui.itemList.item', [
        'isis.ui.itemList.item.stats',
        'isis.ui.itemList.item.menu',
        'isis.ui.itemList.item.details',
        'isis.ui.itemList.item.header'
    ]
)
    .directive(
        'itemListItem',
        function () {

            return {
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemListItem.html'
            };
        }
);