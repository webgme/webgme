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

                var self;

                self = this;

                self.loading = false;

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

                    var treeCtrl,
                        labelCtrl;

                    treeCtrl = controllers[0];
                    labelCtrl = controllers[1];

                    labelCtrl.treeCtrl = treeCtrl;
                }
            };
        }
);