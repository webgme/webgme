(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*globals angular*/

require('./services/isisUIServices.js');

require('./hierarchicalMenu/hierarchicalMenu.js');
require('./contextmenu/contextmenu.js');
require('./dropdownNavigator/dropdownNavigator.js');
require('./treeNavigator/treeNavigator.js');
require('./itemList/itemList.js');
require('./taxonomyTerms/taxonomyTerms.js');

angular.module('isis.ui.components', [
    'isis.ui.components.templates',
    'isis.ui.services',

    'isis.ui.hierarchicalMenu',
    'isis.ui.contextmenu',
    'isis.ui.dropdownNavigator',
    'isis.ui.treeNavigator',
    'isis.ui.itemList'

]);
},{"./contextmenu/contextmenu.js":3,"./dropdownNavigator/dropdownNavigator.js":4,"./hierarchicalMenu/hierarchicalMenu.js":6,"./itemList/itemList.js":9,"./services/isisUIServices.js":16,"./taxonomyTerms/taxonomyTerms.js":18,"./treeNavigator/treeNavigator.js":20}],2:[function(require,module,exports){
!function(a,b,c){"use strict";b.module("ui.sortable",[]).value("uiSortableConfig",{}).directive("uiSortable",["uiSortableConfig","$timeout","$log",function(a,d,e){return{require:"?ngModel",scope:{ngModel:"=",uiSortable:"="},link:function(f,g,h,i){function j(a,b){return b&&"function"==typeof b?function(c,d){a(c,d),b(c,d)}:a}function k(a){var b=a.data("ui-sortable");return b&&"object"==typeof b&&"ui-sortable"===b.widgetFullName?b:null}function l(a,b){var c=a.sortable("option","helper");return"clone"===c||"function"==typeof c&&b.item.sortable.isCustomHelperUsed()}function m(a){return/left|right/.test(a.css("float"))||/inline|table-cell/.test(a.css("display"))}function n(a,b){for(var c=null,d=0;d<a.length;d++){var e=a[d];if(e.element[0]===b[0]){c=e.scope;break}}return c}function o(a,b){b.item.sortable._destroy()}var p,q={},r={"ui-floating":c},s={receive:null,remove:null,start:null,stop:null,update:null},t={helper:null};return b.extend(q,r,a,f.uiSortable),b.element.fn&&b.element.fn.jquery?(i?(f.$watch("ngModel.length",function(){d(function(){k(g)&&g.sortable("refresh")},0,!1)}),s.start=function(a,d){if("auto"===q["ui-floating"]){var e=d.item.siblings(),f=k(b.element(a.target));f.floating=m(e)}d.item.sortable={model:i.$modelValue[d.item.index()],index:d.item.index(),source:d.item.parent(),sourceModel:i.$modelValue,cancel:function(){d.item.sortable._isCanceled=!0},isCanceled:function(){return d.item.sortable._isCanceled},isCustomHelperUsed:function(){return!!d.item.sortable._isCustomHelperUsed},_isCanceled:!1,_isCustomHelperUsed:d.item.sortable._isCustomHelperUsed,_destroy:function(){b.forEach(d.item.sortable,function(a,b){d.item.sortable[b]=c})}}},s.activate=function(a,c){p=g.contents();var d=g.sortable("option","placeholder");if(d&&d.element&&"function"==typeof d.element){var e=d.element();e=b.element(e);var h=g.find('[class="'+e.attr("class")+'"]:not([ng-repeat], [data-ng-repeat])');p=p.not(h)}var i=c.item.sortable._connectedSortables||[];i.push({element:g,scope:f}),c.item.sortable._connectedSortables=i},s.update=function(a,b){if(!b.item.sortable.received){b.item.sortable.dropindex=b.item.index();var c=b.item.parent();b.item.sortable.droptarget=c;var d=n(b.item.sortable._connectedSortables,c);b.item.sortable.droptargetModel=d.ngModel,g.sortable("cancel")}l(g,b)&&!b.item.sortable.received&&"parent"===g.sortable("option","appendTo")&&(p=p.not(p.last())),p.appendTo(g),b.item.sortable.received&&(p=null),b.item.sortable.received&&!b.item.sortable.isCanceled()&&f.$apply(function(){i.$modelValue.splice(b.item.sortable.dropindex,0,b.item.sortable.moved)})},s.stop=function(a,b){!b.item.sortable.received&&"dropindex"in b.item.sortable&&!b.item.sortable.isCanceled()?f.$apply(function(){i.$modelValue.splice(b.item.sortable.dropindex,0,i.$modelValue.splice(b.item.sortable.index,1)[0])}):"dropindex"in b.item.sortable&&!b.item.sortable.isCanceled()||l(g,b)||p.appendTo(g),p=null},s.receive=function(a,b){b.item.sortable.received=!0},s.remove=function(a,b){"dropindex"in b.item.sortable||(g.sortable("cancel"),b.item.sortable.cancel()),b.item.sortable.isCanceled()||f.$apply(function(){b.item.sortable.moved=i.$modelValue.splice(b.item.sortable.index,1)[0]})},t.helper=function(a){return a&&"function"==typeof a?function(b,c){var d=a(b,c);return c.sortable._isCustomHelperUsed=c!==d,d}:a},f.$watch("uiSortable",function(a){var c=k(g);c&&b.forEach(a,function(a,b){return b in r?("ui-floating"!==b||a!==!1&&a!==!0||(c.floating=a),void(q[b]=a)):(s[b]?("stop"===b&&(a=j(a,function(){f.$apply()}),a=j(a,o)),a=j(s[b],a)):t[b]&&(a=t[b](a)),q[b]=a,void g.sortable("option",b,a))})},!0),b.forEach(s,function(a,b){q[b]=j(a,q[b]),"stop"===b&&(q[b]=j(q[b],o))})):e.info("ui.sortable: ngModel not provided!",g),void g.sortable(q)):void e.error("ui.sortable: jQuery should be included before AngularJS!")}}}])}(window,window.angular);
},{}],3:[function(require,module,exports){
/*globals angular, $*/
'use strict';

angular.module(
    'isis.ui.contextmenu', ['isis.ui.hierarchicalMenu']
)
    .factory(
        'contextmenuService', ['$document', '$compile', '$window', '$templateCache',
            function ($document, $compile, $window, $templateCache) {

                var
                service = {},
                    setPosition,
                    body = $document.find('body')
                        .eq(0),
                    widthWatcher, heightWatcher,
                    menuScope,
                    opened = false,
                    handleKeyUpEvent,
                    handleMouseDownEvent,
                    handleClickEvent,
                    handleScrollEvent,
                    handleResizeEvent,
                    handleBlurEvent,
                    bindEvents,

                    autoCloseOnClick = true,

                    window = angular.element(
                        $window
                    );

                handleKeyUpEvent = function (event) {
                    if (opened && event.keyCode === 27) {
                        service.close();
                    }
                };

                handleMouseDownEvent = function (event) {

                    if (opened &&
                        service.menuElement && !$.contains(service.menuElement[0], event.target) &&
                        event.target !== service.triggerElement) {
                        service.close();
                    }
                };

                handleClickEvent = function (event) {

                    if (opened &&
                        (autoCloseOnClick || (service.menuElement && !$.contains(service.menuElement[
                                0],
                            event.target))) &&
                        (event.target !== service.triggerElement)) {

                        service.close();
                        return false;
                    }

                };

                handleScrollEvent = function () {
                    if (opened) {
                        service.close();
                    }
                };

                handleResizeEvent = function () {
                    if (opened) {
                        service.close();
                    }
                };

                handleBlurEvent = function () {
                    if (opened) {
                        service.close();
                    }
                };

                bindEvents = function () {
                    $document.bind(
                        'keyup', handleKeyUpEvent
                    );
                    // Firefox treats a right-click as a click and a contextmenu event while other browsers
                    // just treat it as a contextmenu event

                    $document.bind(
                        'scroll', handleScrollEvent
                    );

                    window.bind(
                        'resize', handleResizeEvent
                    );
                    window.bind(
                        'blur', handleBlurEvent
                    );

                    $document.bind(
                        'click', handleClickEvent
                    );
                    $document.bind(
                        'mousedown', handleMouseDownEvent
                    );
                    $document.bind(
                        'contextmenu', handleClickEvent
                    );

                };

                setPosition = function (position, menuElement) {

                    var menuBounds = menuElement[0].getBoundingClientRect(),
                        menuWidth = menuBounds.right - menuBounds.left,
                        menuHeight = menuBounds.bottom - menuBounds.top,

                        windowHeight = window[0].innerHeight,
                        windowWidth = window[0].innerWidth,

                        windowLeftEdge = window[0].pageXOffset,
                        windowTopEdge = window[0].pageYOffset,

                        windowRightEdge = windowWidth + windowLeftEdge,
                        windowBottomEdge = windowHeight + windowTopEdge,

                        top = Math.max(
                            position.pageY, windowTopEdge
                        ),

                        left = Math.max(
                            position.pageX, windowLeftEdge
                        ),

                        totalHeightNeeded = menuHeight + top,
                        totalWidthNeeded = menuWidth + left,

                        overLeftEdge = totalWidthNeeded - windowRightEdge,
                        overBottomEdge = totalHeightNeeded - windowBottomEdge;


                    //console.log(top, menuHeight, windowTopEdge, windowHeight);


                    if (overBottomEdge > 0) {
                        top = top - overBottomEdge;
                    }

                    if (overLeftEdge > 0) {
                        left = left - overLeftEdge;
                    }

                    menuElement.css(
                        'top', top + 'px'
                    );
                    menuElement.css(
                        'left', left + 'px'
                    );


                    // Setting property of menu to drop on left side if no room on right for sub menus

                };

                service.open = function (triggerElement, contentTemplateUrl, aScope, position,
                    doNotAutocloseOnClick, menuCssClass) {

                    var shellAngularElement = angular.element($templateCache.get(
                        '/isis-ui-components/templates/contextmenu.html')),
                        menuDOMElement,
                        sameTriggerElement = (service.triggerElement === triggerElement);

                    autoCloseOnClick = doNotAutocloseOnClick !== true;

                    if (opened) {
                        service.close();
                    }

                    if (!sameTriggerElement) {

                        // do not re-open if the same triggerelement was clicked

                        menuScope = aScope.$new();

                        menuScope.contentTemplateUrl = contentTemplateUrl;
                        menuScope.menuCssClass = menuCssClass;


                        body.append(shellAngularElement);
                        menuDOMElement = $compile(shellAngularElement)(menuScope);

                        service.menuElement = menuDOMElement;
                        service.triggerElement = triggerElement;

                        setPosition(position, menuDOMElement);

                        widthWatcher = menuScope.$watch(
                            function () {
                                return menuDOMElement[0].scrollWidth;
                            },

                            function () {
                                setPosition(position, menuDOMElement);
                            }
                        );

                        heightWatcher = menuScope.$watch(
                            function () {
                                return menuDOMElement[0].scrollHeight;
                            },

                            function () {
                                setPosition(position, menuDOMElement);
                            }
                        );

                        bindEvents();
                        opened = true;
                    }

                };

                service.close = function () {

                    if (angular.isObject(menuScope) && angular.isFunction(menuScope.$destroy)) {

                        service.menuElement.remove();
                        menuScope.$destroy();
                        menuScope = undefined;

                        service.menuElement = null;
                        service.triggerElement = null;

                        opened = false;
                    }
                };

                service.triggerElement = null;

                return service;

            }
        ])
    .directive(
        'isisContextmenu',

        ['$document', 'contextmenuService', '$window', '$rootScope',
            function ($document, contextmenuService) {

                return {
                    restrict: 'A',
                    scope: {
                        contextmenuConfig: '=',
                        contextmenuData: '=',
                        callback: '&contextmenu',
                        disabled: '&contextmenuDisabled'
                    },

                    link: function (scope, element) {

                        var open,
                            handleContextmenuEvent,
                            options = {
                                triggerEvent: 'contextmenu',
                                contentTemplateUrl: '/isis-ui-components/templates/contextmenu.DefaultContents.html'
                            };

                        if (!angular.isFunction(scope.disabled)) {
                            scope.disabled = function () {
                                return false;
                            };
                        }

                        if (angular.isObject(scope.contextmenuConfig)) {
                            angular.extend(options, scope.contextmenuConfig);
                        }

                        element.addClass('context-menu-trigger');

                        open = function (event) {

                            var position,
                                bounds,
                                menuParentScope;

                            position = {
                                pageX: event.pageX,
                                pageY: event.pageY
                            };

                            if (scope.contextmenuConfig && scope.contextmenuConfig.position) {

                                bounds = element[0].getBoundingClientRect();

                                if (scope.contextmenuConfig.position === 'left bottom') {

                                    position.pageX = bounds.left + window.pageXOffset;
                                    position.pageY = bounds.bottom + window.pageYOffset;

                                } else if (scope.contextmenuConfig.position === 'right bottom') {

                                    position.pageX = bounds.right + window.pageXOffset;
                                    position.pageY = bounds.bottom + window.pageYOffset;

                                }
                            }

                            if (!scope.disabled()) {

                                menuParentScope = options.menuParentScope || scope;

                                contextmenuService.open(
                                    event.target, options.contentTemplateUrl, menuParentScope,
                                    position, options.doNotAutoClose,
                                    options.menuCssClass
                                );

                            }
                        };

                        handleContextmenuEvent = function (event) {
                            if (!scope.disabled()) {

                                if (event.target !== contextmenuService.triggerElement) {

                                    event.preventDefault();
                                    event.stopPropagation();

                                    scope.$apply(
                                        function () {
                                            scope.callback({
                                                $event: event
                                            });
                                            open(event);
                                        }
                                    );

                                } else {

                                    event.preventDefault();
                                    event.stopPropagation();

                                    contextmenuService.close();
                                }
                            }
                        };

                        element.bind(
                            options.triggerEvent, handleContextmenuEvent
                        );

                        scope.$on(
                            '$destroy', function () {
                                element.unbind(
                                    options.triggerEvent, handleContextmenuEvent
                                );
                            }
                        );
                    }

                };
            }
        ]);
},{}],4:[function(require,module,exports){
/*globals angular*/
'use strict';

angular.module(
    'isis.ui.dropdownNavigator', ['isis.ui.hierarchicalMenu']
)
    .directive(
        'dropdownNavigator',
        function () {

            return {
                scope: {
                    navigator: '='
                },
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/dropdownNavigator.html'
            };
        });
},{}],5:[function(require,module,exports){
/*globals angular*/
'use strict';

/*
 * An Angular service which helps with creating recursive directives.
 * @author Mark Lagendijk
 * @license MIT
 */
angular.module('isis.ui.RecursionHelper', [])
    .factory('ISISRecursionHelper', ['$compile',
        function ($compile) {
            return {
                /**
                 * Manually compiles the element, fixing the recursion loop.
                 * @param element
                 * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
                 * @returns An object containing the linking functions.
                 */
                compile: function (element, link) {
                    // Normalize the link parameter
                    if (angular.isFunction(link)) {
                        link = {
                            post: link
                        };
                    }

                    // Break the recursion loop by removing the contents
                    var contents = element.contents()
                        .remove();
                    var compiledContents;
                    return {
                        pre: (link && link.pre) ? link.pre : null,
                        /**
                         * Compiles and re-adds the contents
                         */
                        post: function (scope, element) {
                            // Compile the contents
                            if (!compiledContents) {
                                compiledContents = $compile(contents);
                            }
                            // Re-add the compiled contents to the element
                            compiledContents(scope, function (clone) {
                                element.append(clone);
                            });

                            // Call the post-linking function, if any
                            if (link && link.post) {
                                link.post.apply(null, arguments);
                            }
                        }
                    };
                }
            };
        }
    ]);
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
                // link: function(scope, element) {

                //     var onDragStart,
                //         onDragEnd,
                //         itemId = scope.item.id;

                //     onDragStart = function(e) {

                //         e.dataTransfer.effectAllowed = 'move';
                //         e.dataTransfer.setData('text', itemId);

                //         element.addClass('dragged');

                //         if (typeof scope.config.onItemDragStart === 'function') {
                //             scope.config.onItemDragStart(e, scope.item);
                //         } 

                //     };

                //     onDragEnd = function(e) {

                //         element.removeClass('dragged');                        

                //         if (typeof scope.config.onItemDragEnd === 'function') {
                //             scope.config.onItemDragEnd(e, scope.item);
                //         }                         

                //     };

                //     if (scope.config.itemDraggable) {

                //         console.log(element[0]);

                //         element[0].addEventListener('dragstart', onDragStart);
                //         element[0].addEventListener('dragend', onDragEnd);

                //     }

                //     scope.$on('$destroy', function() {

                //         if (scope.config.itemDraggable) {

                //             element[0].removeEventListener('dragstart', onDragStart);
                //             element[0].removeEventListener('dragend', onDragEnd);

                //         }

                //     });

                // }
            };


        });
},{}],9:[function(require,module,exports){
/*globals angular*/
'use strict';

require('./listItemGroup.js');
require('./itemListFilter.js');
require('./itemListNewItem.js');
require('../contextmenu/contextmenu.js');

angular.module(
    'isis.ui.itemList', [
        'isis.ui.itemList.newItem',
        'isis.ui.itemList.filter',
        'isis.ui.itemList.itemGroup',
        'isis.ui.contextmenu',
        'isis.ui.taxonomyTerms'
    ]
)
    .controller(
        'ItemListController', function ($scope) {

            // Event handlers

            $scope.sortableOptions = {
                update: function (e, ui) {

                    if (angular.isFunction($scope.config.itemSort)) {
                        $scope.config.itemSort(event, ui);
                    }

                },
                axis: 'y'
            };

            $scope.itemClick = function ($event, item) {

                if (angular.isFunction($scope.config.itemClick)) {
                    $scope.config.itemClick($event, item);
                }
            };

            $scope.itemContextmenu = function ($event, node) {

                if (angular.isFunction($scope.config.itemContextmenuRenderer)) {
                    $scope.itemContextMenuData = $scope.config.itemContextmenuRenderer($event,
                        node);
                }

            };

            $scope.itemMenuConfig = {
                triggerEvent: 'click',
                position: 'left bottom'
            };

            $scope.config = $scope.config || {};
            $scope.config.noItemsMessage = $scope.config.noItemsMessage || 'No items to show.';

        })

.directive(
    'itemList',
    function () {

        return {
            scope: {
                listData: '=',
                config: '='
            },
            restrict: 'E',
            replace: true,
            templateUrl: '/isis-ui-components/templates/itemList.html',
            controller: 'ItemListController'
        };
    }
);
},{"../contextmenu/contextmenu.js":3,"./itemListFilter.js":10,"./itemListNewItem.js":12,"./listItemGroup.js":15}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
                templateUrl: '/isis-ui-components/templates/itemListItem.html',
                link: function(scope, element) {

                    var onDragStart,
                        onDragEnd,
                        itemId = scope.item.id;

                    onDragStart = function(e) {

                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text', itemId);

                        element.addClass('dragged');

                        if (typeof scope.config.onItemDragStart === 'function') {
                            scope.config.onItemDragStart(e, scope.item);
                        } 

                    };

                    onDragEnd = function(e) {

                        element.removeClass('dragged');                        

                        if (typeof scope.config.onItemDragEnd === 'function') {
                            scope.config.onItemDragEnd(e, scope.item);
                        }                         

                    };

                    if (typeof scope.config.onItemDragEnd === 'function' && typeof scope.config.onItemDragStart === 'function') {

                        element[0].classList.add('draggable');
                        element[0].setAttribute('draggable', 'true');

                        element[0].addEventListener('dragstart', onDragStart);
                        element[0].addEventListener('dragend', onDragEnd);

                    }

                    scope.$on('$destroy', function() {

                        if (scope.config.itemDraggable) {

                            element[0].removeEventListener('dragstart', onDragStart);
                            element[0].removeEventListener('dragend', onDragEnd);

                        }

                    });

                }
            };
        }
);
},{"./itemDetails.js":7,"./itemHeader.js":8,"./itemMenu.js":13,"./itemStats.js":14}],12:[function(require,module,exports){
/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.newItem', []
)
    .directive(
        'itemListNewItem',
        function () {

            return {
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemListNewItem.html',
                require: '^itemList',
                compile: function () {

                    return {

                        pre: function (scope, el, attr, itemListCtl) {

                            if (angular.isObject(scope.config) && angular.isObject(scope.config
                                .newItemForm)) {

                                scope.config.newItemForm.controller = scope.config.newItemForm.controller ||
                                    function () {
                                        return itemListCtl;
                                };

                                scope.formConfig = scope.config.newItemForm;

                                scope.toggleNewItemFormCollapsed = function () {

                                    scope.formConfig.expanded = !scope.formConfig.expanded;

                                };

                            }
                        }

                    };
                }
            };
        });
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
/*globals angular*/
'use strict';

require('./itemListItem.js');
require('angular-ui-sortable');

angular.module(
    'isis.ui.itemList.itemGroup', [
        'isis.ui.itemList.item',
        'ui.sortable'
    ]
)
    .directive(
        'listItemGroup',
        function ($compile) {

            return {
                require: '^itemList',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/listItemGroup.html',
                link: function (scope, element) {

                    var listElement = element.find('>ul');

                    if (scope.listData && scope.config && scope.config.sortable === true) {
                        listElement.attr('ui-sortable', 'sortableOptions');
                        element.attr('ng-model', 'listData.items');
                        $compile(element)(scope);
                    }
                }
            };
        });
},{"./itemListItem.js":11,"angular-ui-sortable":2}],16:[function(require,module,exports){
/*globals angular*/

'use strict';

angular.module(
    'isis.ui.services', []
)

.service('isisTemplateService', ['$http', '$templateCache', '$q',
    function ($http, $templateCache, $q) {

        this.getTemplate = function (template, templateUrl) {

            var deferred,
                cachedTemplate;

            deferred = $q.defer();

            if (template) {

                deferred.resolve(template);

            } else if (templateUrl) {

                cachedTemplate = $templateCache.get(templateUrl);

                if (cachedTemplate) {
                    deferred.resolve(cachedTemplate);
                } else {

                    $http({
                        method: 'GET',
                        url: templateUrl,
                        cache: true
                    })
                        .then(function (result) {

                            $templateCache.put(templateUrl, result.data);
                            deferred.resolve(result.data);

                        })
                        .
                    catch (function (error) {
                        deferred.reject(error);
                    });

                }
            } else {
                deferred.reject('No template or templateUrl has been specified.');
            }

            return deferred.promise;
        };


    }
]);
},{}],17:[function(require,module,exports){
/*globals angular*/
'use strict';

angular.module(
    'isis.ui.taxonomyTerm', []

)
    .controller('TaxonomyTermController', function ($scope) {

        $scope.getTermUrl = function () {
            return ($scope.term && $scope.term.url) || '#';
        };

    })
    .directive(
        'taxonomyTerm',
        function () {

            return {
                scope: {
                    term: '='
                },
                controller: 'TaxonomyTermController',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/taxonomyTerm.html'

            };
        });
},{}],18:[function(require,module,exports){
/*globals angular*/
'use strict';

require('./taxonomyTerm.js');

angular.module(
    'isis.ui.taxonomyTerms', [
        'isis.ui.taxonomyTerm'
    ]

)
    .controller('TaxonomyTermsController', function () {

    })
    .directive(
        'taxonomyTerms',
        function () {

            return {
                scope: {
                    terms: '='
                },
                controller: 'TaxonomyTermsController',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/taxonomyTerms.html'

            };
        });
},{"./taxonomyTerm.js":17}],19:[function(require,module,exports){
/*globals angular*/

'use strict';

require('../contextmenu/contextmenu.js');

angular.module(
    'isis.ui.treeNavigator.header', [
        'isis.ui.contextmenu'
    ]

)
    .directive(
        'treeNavigatorHeader', function () {
            return {
                scope: false,
                require: '^treeNavigator',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.header.html'

            };
        }
);
},{"../contextmenu/contextmenu.js":3}],20:[function(require,module,exports){
/*globals angular*/

'use strict';

require('./treeNavigator.nodeList.js');
require('./treeNavigator.header.js');
require('./treeNavigator.node.label.js');

angular.module(
    'isis.ui.treeNavigator', [
        'isis.ui.treeNavigator.nodeList',
        'isis.ui.treeNavigator.header',
        'isis.ui.treeNavigator.node.label'
    ])

.directive(
    'treeNavigator', function () {

        var defaultTreeState;

        defaultTreeState = {

            activeNode: null,
            selectedNodes: [],
            expandedNodes: [],
            loadingNodes: [],

            activeScope: null

        };


        function removeNodeFromList(list, node) {
            var index;

            if (angular.isArray(list) && angular.isObject(node)) {

                index = list.indexOf(node.id);

                if (index > -1) {
                    list.splice(index, 1);
                }

            }
        }

        function TreeNavigatorController($log) {

            var self;

            self = this;

            self.$log = $log;

            self.scopeMenuConfig = {
                triggerEvent: 'click',
                position: 'left bottom'
            };

            self.preferencesMenuConfig = {
                triggerEvent: 'click',
                position: 'right bottom'
            };

            self.config = self.config || {};

            self.config.state = angular.extend(defaultTreeState, self.config.state || {});


            self.config.collapsedIconClass = self.config.collapsedIconClass || 'icon-arrow-right';
            self.config.expandedIconClass = self.config.expandedIconClass || 'icon-arrow-down';

            self.config.extraInfoTemplateUrl = self.config.extraInfoTemplateUrl ||
                '/isis-ui-components/templates/treeNavigator.node.extraInfo.html';

        }

        TreeNavigatorController.prototype.isExpanded = function (node) {

            var self = this;

            return (self.config.state.expandedNodes.indexOf(node.id) > -1);
        };

        TreeNavigatorController.prototype.isSelected = function (node) {

            var self = this;

            return (self.config.state.selectedNodes.indexOf(node.id) > -1);
        };

        TreeNavigatorController.prototype.updateSelection = function ($event, node) {
            var index,
                self;


            self = this;

            if (node) {

                if ($event) {
                    if ($event.shiftKey) {
                        // TODO: properly update selected nodes
                        // start node is active node
                        // end node is theNode
                        // select all opened tree elements between the two nodes
                        self.config.state.selectedNodes = [node.id];
                        self.$log.warn('Range selection is not implemented properly yet.');


                    } else if ($event.ctrlKey || $event.metaKey) {
                        index = self.config.state.selectedNodes.indexOf(node.id);

                        if (index > -1) {
                            // already selected, remove this node
                            self.config.state.selectedNodes.splice(index, 1);
                        } else {
                            // select it
                            self.config.state.selectedNodes.push(node.id);
                        }

                    } else {
                        self.config.state.selectedNodes = [node.id];

                    }

                } else {
                    // event is not given
                    self.config.state.selectedNodes = [node.id];
                }

                // active node is the clicked node
                self.config.state.activeNode = node.id;

            } else {
                self.config.state.selectedNodes = [];
                self.config.state.activeNode = null;
            }
        };


        TreeNavigatorController.prototype.markNodeExpanded = function ($event, node) {

            var self = this;

            if (self.config.state.expandedNodes.indexOf(node.id) === -1) {

                self.config.state.expandedNodes.push(node.id);

                if (angular.isFunction(self.config.nodeExpanderClick)) {
                    self.config.nodeExpanderClick($event, node, true);
                }

            }

        };

        TreeNavigatorController.prototype.markNodeCollapsed = function ($event, node) {

            removeNodeFromList(this.config.state.expandedNodes, node);

        };

        TreeNavigatorController.prototype.loadSomeChildrenForNode = function ($event, node,
            isBackPaging) {

            var self = this,
                count;

            if (!node.loading && angular.isFunction(self.config.loadChildren)) {

                if (self.config.pagination && self.config.pagination.itemsPerPage) {
                    count = self.config.pagination.itemsPerPage;
                }

                node.loading = true;

                self.config.loadChildren($event, node, count, isBackPaging)
                    .then(function (children) {

                        var wasEmptyBefore,
                            index,
                            i;

                        if (Array.isArray(children) && children.length) {

                            for (i = 0; i < children.length; i++) {

                                self.markNodeCollapsed($event, children[i]);

                                index = self.config.state.selectedNodes.indexOf(children[i].id);

                                if (index > -1) {
                                    self.config.state.selectedNodes.splice(index, 1);
                                }


                            }

                            wasEmptyBefore = node.children.length === 0;

                            node.children = children;

                            if (isBackPaging === true && !wasEmptyBefore) {

                                node.lastLoadedChildPosition = node.firstLoadedChildPosition - 1;
                                node.firstLoadedChildPosition = node.lastLoadedChildPosition -
                                    node.children.length + 1;

                            } else {

                                if (wasEmptyBefore) {

                                    node.firstLoadedChildPosition = 0;
                                    node.lastLoadedChildPosition = node.children.length - 1;

                                } else {

                                    node.firstLoadedChildPosition = node.lastLoadedChildPosition + 1;
                                    node.lastLoadedChildPosition = node.firstLoadedChildPosition +
                                        node.children.length - 1;

                                }

                            }

                        } else {
                            node.children = [];
                        }

                        //console.log(node.firstLoadedChildPosition, node.lastLoadedChildPosition);

                        node.loading = false;

                        self.markNodeExpanded($event, node);
                    })
                    .
                catch (function (e) {

                    node.loading = false;
                    node.children = [];

                    self.$log.error('Error while loading children for ', node, e);

                });
            }

        };


        return {
            scope: {
                treeData: '=',
                config: '='
            },

            restrict: 'E',
            replace: true,
            templateUrl: '/isis-ui-components/templates/treeNavigator.html',
            controller: TreeNavigatorController,
            controllerAs: 'ctrl',
            bindToController: true

        };
    }
)
// Based on: http://stackoverflow.com/questions/20444409/handling-ng-click-and-ng-dblclick-on-the-same-element-with-angularjs

.
directive('isisSglclick', ['$parse', '$timeout',
    function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var fn = $parse(attr.isisSglclick);
                var delay = 300,
                    clicks = 0,
                    timer = null;
                element.on('click', function (event) {
                    clicks++; //count clicks
                    if (clicks === 1) {
                        timer = $timeout(function () {
                            fn(scope, {
                                $event: event
                            });
                            clicks = 0; //after action performed, reset counter
                        }, delay);
                    } else {
                        $timeout.cancel(timer); //prevent single-click action
                        clicks = 0; //after action performed, reset counter
                    }
                });
            }
        };
    }
])
    .directive('isisStopEvent', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                element.bind('click', function (e) {
                    e.stopPropagation();
                });
            }
        };
    });
},{"./treeNavigator.header.js":19,"./treeNavigator.node.label.js":22,"./treeNavigator.nodeList.js":23}],21:[function(require,module,exports){
/*globals angular*/

'use strict';

require('./treeNavigator.node.label.js');

angular.module(
        'isis.ui.treeNavigator.node', [
            'isis.ui.treeNavigator.node.label'
        ]
    )
    .directive(
        'treeNavigatorNode',
        function() {

            function NodeController() {

                var self;

                self = this;


                self.isExpanded = function() {
                    return (self.treeCtrl.config.state.expandedNodes.indexOf(self.node.id) > -1);
                };

                self.isSelected = function() {
                    return (self.treeCtrl.config.state.selectedNodes.indexOf(self.node.id) > -1);
                };


                this.getClass = function() {
                    var cssClassStr = '';

                    if (self.isExpanded()) {
                        cssClassStr += 'expanded';
                    }

                    if (self.treeCtrl.config.state.activeNode === self.node.id) {
                        cssClassStr += ' active-node';
                    }

                    if (self.isSelected()) {
                        cssClassStr += ' selected-node';
                    }

                    if (self.node.loading) {
                        cssClassStr += ' loading';
                    }

                    if (angular.isFunction(self.treeCtrl.config.nodeClassGetter)) {
                        cssClassStr += ' ' + self.treeCtrl.config.nodeClassGetter(self.node);
                    }

                    return cssClassStr;
                };

            }

            return {
                scope: {
                    node: '='
                },
                controller: NodeController,
                controllerAs: 'ctrl',
                bindToController: true,
                require: ['^treeNavigatorNodeList', '^treeNavigator', 'treeNavigatorNode'],
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.node.html',
                link: function(scope, element, attributes, controllers) {

                    var nodeCtrl,
                        nodeListCtrl,
                        treeCtrl;


                    treeCtrl = controllers[1];
                    nodeListCtrl = controllers[0];
                    nodeCtrl = controllers[2];

                    nodeCtrl.parentListCtrl = nodeListCtrl;
                    nodeCtrl.treeCtrl = treeCtrl;

                }
            };
        }
    );

},{"./treeNavigator.node.label.js":22}],22:[function(require,module,exports){
/*globals angular*/

'use strict';

require('../contextmenu/contextmenu.js');

angular.module(
    'isis.ui.treeNavigator.node.label', [
        'isis.ui.contextmenu'
    ]
)
    .directive(
        'treeNavigatorNodeLabel', function () {

            function NodeLabelController() {

                this.loading = false;
                this._labelElement = null;

            }

            NodeLabelController.prototype.isExpanded = function () {

                var self = this;

                return (self.treeCtrl.isExpanded(this.node));
            };

            NodeLabelController.prototype.isSelected = function () {

                var self = this;

                return (self.treeCtrl.isSelected(this.node));
            };


            // Node event handlers

            NodeLabelController.prototype.nodeClick = function ($event) {

                var self = this;

                if (angular.isFunction(self.treeCtrl.config.nodeClick)) {
                    self.treeCtrl.config.nodeClick($event, self.node);
                }

                if (!self.treeCtrl.config.disableManualSelection) {
                    self.treeCtrl.updateSelection($event, self.node);
                }

            };

            NodeLabelController.prototype.nodeContextmenu = function ($event) {

                var self = this;

                if (angular.isFunction(self.treeCtrl.config.nodeContextmenuRenderer)) {
                    self.nodeContextMenuData = self.treeCtrl.config.nodeContextmenuRenderer($event,
                        self.node);
                }

            };

            NodeLabelController.prototype.nodeDblclick = function ($event) {

                var self = this;

                if (angular.isFunction(self.treeCtrl.config.nodeDblclick)) {
                    self.treeCtrl.config.nodeDblclick($event, self.node);
                }

                self.nodeExpanderClick($event);

            };

            NodeLabelController.prototype.nodeExpanderClick = function ($event) {

                var self = this;

                if (!self.loading) {
                    if (self.isExpanded()) {
                        if (self.canCollapse()) {

                            self.treeCtrl.markNodeCollapsed($event, self.node);

                            if (angular.isFunction(self.treeCtrl.config.nodeExpanderClick)) {
                                self.treeCtrl.config.nodeExpanderClick($event, self.node, false);
                            }
                        }
                    } else {
                        if (self.canExpand()) {
                            if (self.node.children.length === 0) {

                                // Need to load children

                                self.treeCtrl.loadSomeChildrenForNode($event, self.node);

                            } else {
                                // No need to load just mark it expanded
                                self.treeCtrl.markNodeExpanded($event, self.node);

                            }
                        }
                    }
                }
            };

            NodeLabelController.prototype.canExpand = function () {

                var self = this;

                return self.node.childrenCount > 0;
            };

            NodeLabelController.prototype.canCollapse = function () {

                var self = this;

                return self.node.unCollapsible !== true;
            };

            NodeLabelController.prototype.nodeDrop = function () {

                //console.log($data, 'Dropped on ', self.node);
            };

            NodeLabelController.prototype.getCollapsedIconClass = function () {

                var self = this;

                return (self.node.collapsedIconClass || self.treeCtrl.config.collapsedIconClass);
            };

            NodeLabelController.prototype.getExpandedIconClass = function () {

                var self = this;

                return (self.node.expandedIconClass || self.treeCtrl.config.expandedIconClass);
            };

            NodeLabelController.prototype._onDragStart = function(e) {

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text', this.node.id);

                if (this.labelEl) {
                    this.labelEl.classList.add('dragged');
                }

                if (angular.isFunction(this.treeCtrl.config.nodeDragStart)) {
                    this.treeCtrl.config.nodeDragStart(e, this.node);
                }

            };

            NodeLabelController.prototype._onDragEnd = function(e) {

                if (this.labelEl) {
                    this.labelEl.classList.remove('dragged');
                }

                if (angular.isFunction(this.treeCtrl.config.nodeDragEnd)) {
                    this.treeCtrl.config.nodeDragEnd(e, this.node);
                }

            };

            return {
                scope: {
                    node: '='
                },
                controller: NodeLabelController,
                controllerAs: 'ctrl',
                bindToController: true,
                require: ['^treeNavigator', 'treeNavigatorNodeLabel'],
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.node.label.html',
                link: function (scope, element, attribures, controllers) {

                    var treeCtrl = controllers[0],
                        labelCtrl = controllers[1],
                        labelEl;


                    labelCtrl.treeCtrl = treeCtrl;

                    labelEl = element[0].getElementsByClassName('label-and-extra-info')[0];
                    labelCtrl._labelElement = labelEl;

                    if (labelCtrl.node.draggable) {

                        labelEl.addEventListener('dragstart', labelCtrl._onDragStart.bind(labelCtrl));
                        labelEl.addEventListener('dragend', labelCtrl._onDragEnd.bind(labelCtrl));

                    }

                    scope.$on('$destroy', function() {

                        if (labelCtrl.node.draggable) {
        
                            labelEl.removeEventListener('dragstart', labelCtrl._onDragStart.bind(labelCtrl));
                            labelEl.removeEventListener('dragend', labelCtrl._onDragEnd.bind(labelCtrl));

                        }

                    });

                }
            };
        }
);
},{"../contextmenu/contextmenu.js":3}],23:[function(require,module,exports){
/*globals angular*/
/*jshint -W018 */

'use strict';

require('./treeNavigator.node.js');
require('../helpers/angular-recursion.js');

angular.module(
    'isis.ui.treeNavigator.nodeList', [
        'isis.ui.treeNavigator.node',
        'isis.ui.RecursionHelper'
    ]
)
    .directive(
        'treeNavigatorNodeList', function (ISISRecursionHelper) {

            function NodeListController() {

                var self = this;

                self.isPageable = function () {

                    var result;

                    result = !! (Array.isArray(self.nodes) &&
                        (self.parentNode.childrenCount > self.nodes.length) &&
                        (self.treeCtrl.config.pagination && !isNaN(self.treeCtrl.config.pagination
                            .itemsPerPage)));


                    //console.log('Pageable ' + self.parentNode.label, result);

                    return result;
                };


                self.showPageUp = function () {
                    //console.log('First loaded child ' + self.parentNode.label, self.parentNode.firstLoadedChildPosition);
                    //console.log('showPageUp', !(self.parentNode.firstLoadedChildPosition > 0));
                    return ( !! self.parentNode.firstLoadedChildPosition > 0);
                };


                self.showPageDown = function () {

                    var result = !! (self.parentNode.childrenCount > self.parentNode.lastLoadedChildPosition + 1);

                    //console.log('Last loaded child ' + self.parentNode.label, self.parentNode.lastLoadedChildPosition);
                    //console.log('showPageDown', result);

                    return result;
                };

                self.pageUp = function ($event) {
                    self.treeCtrl.loadSomeChildrenForNode($event, self.parentNode, true);
                };

                self.pageDown = function ($event) {
                    self.treeCtrl.loadSomeChildrenForNode($event, self.parentNode);
                };

                self.getLoadMoreText = function () {
                    return (this.config && this.config.loadMoreText) || '';
                };


                self.init = function() {

                    if (self.nodes && self.nodes.length === 0) {
                        self.treeCtrl.loadSomeChildrenForNode(null, self.parentNode);
                    }
                    
                };
                
            }

            function link(scope, element, attr, controllers) {

                var nodeListCtrl = controllers[1];

                nodeListCtrl.treeCtrl = controllers[0];

                nodeListCtrl.init();

            }

            return {
                scope: {
                    nodes: '=',
                    parentNode: '='
                },
                controller: NodeListController,
                controllerAs: 'ctrl',
                bindToController: true,
                require: ['^treeNavigator', '^treeNavigatorNodeList'],
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.nodeList.html',
                compile: function (element) {
                    return ISISRecursionHelper.compile(element, link);
                }

            };
        }
);
},{"../helpers/angular-recursion.js":5,"./treeNavigator.node.js":21}]},{},[1]);
