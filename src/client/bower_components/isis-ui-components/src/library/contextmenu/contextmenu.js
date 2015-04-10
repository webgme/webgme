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