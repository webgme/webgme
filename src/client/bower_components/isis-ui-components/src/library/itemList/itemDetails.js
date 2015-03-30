/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.item.details', []
)
    .controller('ItemListItemDetailsController', function ($scope) {

        var expanded = false;

        $scope.config.showDetailsLabel = $scope.config.showDetailsLabel || 'Details';
        $scope.config.hideDetailsLabel = $scope.config.hideDetailsLabel || 'Details';

        expanded = false;

        $scope.getExpanderClass = function () {
            if (expanded) {
                return 'glyphicon glyphicon-chevron-up';
            } else {
                return 'glyphicon glyphicon-chevron-right';
            }
        };

        $scope.getExpanderLabel = function () {
            if (expanded) {
                return $scope.config.hideDetailsLabel;
            } else {
                return $scope.config.showDetailsLabel;
            }
        };

        $scope.detailsCollapserClick = function () {
            expanded = !expanded;
        };

        $scope.shouldBeExpanded = function () {
            return expanded || !$scope.config.detailsCollapsible;
        };

    })
    .directive(

        'ilItemDetails',

        function () {

            return {
                restrict: 'E',
                replace: true,
                require: '^itemList',
                controller: 'ItemListItemDetailsController',
                templateUrl: '/isis-ui-components/templates/itemDetails.html'
            };


        });