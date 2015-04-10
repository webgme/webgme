/*globals angular*/
'use strict';

angular.module(
    'isis.ui.hierarchicalMenu', [
        'isis.ui.components'
    ]
)
    .directive(
        'hierarchicalMenu', ['$window', '$document',
            function ($window, $document) {

                var window = angular.element(
                    $window
                );

                return {
                    scope: {
                        menu: '=',
                        config: '='
                    },
                    restrict: 'E',

                    replace: true,
                    templateUrl: '/isis-ui-components/templates/hierarchicalMenu.html',

                    link: function ($scope, element) {

                        var whichSideToDropSubs;

                        whichSideToDropSubs = function () {

                            var elementBounds = element[0].getBoundingClientRect(),
                                windowLeftEdge = window[0].pageXOffset,
                                width = elementBounds.right - elementBounds.left,
                                rightBorderX = elementBounds.right,
                                leftBorderX = elementBounds.left,
                                windowWidth = window[0].innerWidth,
                                windowRightEdge = windowWidth + windowLeftEdge,
                                wouldBeRightBorderOfSub = width + rightBorderX;

                            if (windowRightEdge < wouldBeRightBorderOfSub && leftBorderX > width) {
                                element.addClass('drop-left');
                            } else {
                                element.removeClass('drop-left');
                            }

                        };

                        $scope.$watch(
                            function () {
                                return element[0].scrollWidth;
                            },

                            function () {
                                whichSideToDropSubs();
                            }
                        );

                        $document.bind(
                            'scroll', whichSideToDropSubs
                        );

                        window.bind(
                            'resize', whichSideToDropSubs
                        );

                        $scope.$on('$destroy', function () {
                            $document.unbind(
                                'scroll', whichSideToDropSubs
                            );

                            window.unbind(
                                'resize', whichSideToDropSubs
                            );
                        });
                    }
                };
            }
        ]);