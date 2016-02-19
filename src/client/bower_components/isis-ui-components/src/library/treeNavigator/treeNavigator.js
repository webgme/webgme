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