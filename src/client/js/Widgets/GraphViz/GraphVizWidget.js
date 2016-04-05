/*globals define, WebGMEGlobal, d3, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Widgets/GraphViz/GraphVizWidget.Zoom',
    'js/Utils/ComponentSettings',
    'd3',
    'css!./styles/GraphVizWidget.css'
], function (Logger, GraphVizWidgetZoom, ComponentSettings) {
    'use strict';

    var GraphVizWidget,
        GRAPH_VIZ_CLASS = 'graph-viz',
        DURATION = 750,
        MARGIN = 20,
        i = 0,
        CLOSED = 'closed',
        OPEN = 'open',
        LEAF = 'LEAF',
        OPENING = 'opening',
        CLOSING = 'CLOSING',
        NODE_SIZE = 15,
        TREE_LEVEL_DISTANCE = 180;

    GraphVizWidget = function (container /*, params*/) {
        var config = GraphVizWidget.getDefaultConfig();
        this._logger = Logger.create('gme:Widgets:GraphViz:GraphVizWidget', WebGMEGlobal.gmeConfig.client.log);

        ComponentSettings.resolveWithWebGMEGlobal(config, GraphVizWidget.getComponentId());
        //merge dfault values with the given parameters
        this._el = container;

        this._initialize();

        //init zoom related UI and handlers
        this._initZoom(config);

        this._logger.debug('GraphVizWidget ctor finished');
    };

    GraphVizWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height(),
            self = this;

        //set Widget title
        this._el.addClass(GRAPH_VIZ_CLASS);

        this._root = undefined;

        this._tree = d3.layout.tree().sort(function (a, b) {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        this.__svg = d3.select(this._el[0]).append('svg');
        this._resizeD3Tree(width, height);

        this._svg = this.__svg.append('g').attr('transform', 'translate(' + MARGIN + ',' + MARGIN + ')');

        this._el.on('dblclick', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.onBackgroundDblClick();
        });
    };

    GraphVizWidget.prototype.onWidgetContainerResize = function (width, height) {
        //call our own resize handler
        this._resizeD3Tree(width, height);
        if (this._root) {
            this._update(undefined);
        }
    };

    GraphVizWidget.prototype._resizeD3Tree = function (width, height) {
        var ew = this._el.width(),
            eh = this._el.height();

        width = Math.max(ew, width);
        height = Math.max(eh, height);

        this._tree.size([height - 2 * MARGIN, width - 2 * MARGIN]);
        this.__svg.attr('width', width).attr('height', height);
    };

    GraphVizWidget.prototype._update = function (source) {
        var self = this;

        // Compute the new tree layout.
        var nodes = this._tree.nodes(this._root).reverse(),
            links = this._tree.links(nodes);

        var diagonal = d3.svg.diagonal()
            .projection(function (d) {
                return [d.y, d.x];
            });

        var getOpenStatus = function (d) {
            var status = LEAF;

            if (d.childrenNum > 0) {
                status = CLOSED;

                if (d.children && d.children.length === d.childrenNum) {
                    status = OPEN;
                }
            }

            return status;
        };

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            d.y = d.depth * TREE_LEVEL_DISTANCE;
            d.status = d.status || getOpenStatus(d);
        });

        // Update the nodes ...
        var node = this._svg.selectAll('g.node')
            .data(nodes, function (d) {
                return d.id || (d.id = ++i);
            });

        var getDisplayName = function (d) {
            var n = d.name;

            if (d.childrenNum > 0) {
                n += ' [' + d.childrenNum + ']';
            }

            return n;
        };

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', function (d) {
                return d.parent ?
                'translate(' + d.parent.y0 + ',' + d.parent.x0 + ')' : 'translate(' + d.y + ',' + d.x + ')';
            })
            .on('click', function (d) {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                self._onNodeClick(d);
            })
            .on('dblclick', function (d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                self._onNodeDblClick(d);
            });

        nodeEnter.append('circle')
            .attr('r', 1e-6);

        nodeEnter.append('text')
            .attr('dy', '.35em')
            .style('fill-opacity', 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(DURATION)
            .attr('transform', function (d) {
                return 'translate(' + d.y + ',' + d.x + ')';
            });

        nodeUpdate.select('circle')
            .attr('r', 4.5);

        nodeUpdate.select('circle')
            .style('fill', function (d) {
                var status = d.status,
                    color = '#FFFFFF';
                if (status === CLOSED) {
                    color = 'lightsteelblue';
                } else if (status === OPENING) {
                    color = '#ff0000';
                } else if (status === OPEN) {
                    color = '#ffFFFF';
                } else if (status === LEAF) {
                    color = '#ffFFFF';
                } else if (status === CLOSING) {
                    color = '#00FF00';
                }

                return color;
            });

        nodeUpdate.select('text')
            .attr('x', function (d) {
                return (d.children && d.children.length > 0) ? -10 : 10;
            })
            .attr('text-anchor', function (d) {
                return (d.children && d.children.length > 0) ? 'end' : 'start';
            })
            .text(function (d) {
                return getDisplayName(d);
            })
            .style('fill-opacity', 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(DURATION)
            .attr('transform', function (d) {
                return source ? 'translate(' + source.y + ',' + source.x + ')' :
                    d.parent ?
                    'translate(' + d.parent.y + ',' + d.parent.x + ')' : 'translate(' + d.y + ',' + d.x + ')';
            })
            .remove();

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        // Update the links ...
        var link = this._svg.selectAll('path.link')
            .data(links, function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert('path', 'g')
            .attr('class', 'link')
            .attr('d', function (d) {
                var o = {x: d.source.x0 || d.source.y, y: d.source.y0 || d.source.y};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(DURATION)
            .attr('d', diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(DURATION)
            .attr('d', function (d) {
                var o = {x: d.source.x, y: d.source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        //node vertical positions by depth
        var nodesYByDepth = [];


        nodes.forEach(function (d) {
            // Stash the old positions for transition.
            d.x0 = d.x;
            d.y0 = d.y;

            // and query vertical coordinates of the nodes at the same depth to detect collision
            nodesYByDepth[d.depth] = nodesYByDepth[d.depth] || [];
            nodesYByDepth[d.depth].push(d.x);
        });

        //if already resizing, don't try to optimize again
        if (this.__resizing !== true) {
            var l = nodesYByDepth.length;
            var collideAtDepth = [];
            for (i = 1; i < l; i += 1) {
                //sort the coordinates for easy check of collision
                nodesYByDepth[i].sort(function (a, b) {
                    return a - b;
                });

                //see if any of the nodes overlap
                var j;
                var depthLength = nodesYByDepth[i].length;
                for (j = 0; j < depthLength - 1; j += 1) {
                    if (nodesYByDepth[i][j + 1] - NODE_SIZE <= nodesYByDepth[i][j]) {
                        collideAtDepth.push([i, depthLength]);
                        break;
                    }
                }
            }

            this._logger.debug('Collide:' + collideAtDepth);

            var sum = 0;
            var len = collideAtDepth.length;
            //start resize mode
            this.__resizing = true;

            if (len > 0) {
                while (len--) {
                    sum += collideAtDepth[len][1];
                }
            } else {
                //only the width changes
                sum = this._el.height() / NODE_SIZE;
            }


            this._resizeD3Tree(nodesYByDepth.length * TREE_LEVEL_DISTANCE, sum * NODE_SIZE);

            //redraw the tree
            this._update();

            //finish resize mode
            this.__resizing = false;
        }
    };

    GraphVizWidget.prototype._onNodeClick = function (d) {
        switch (d.status) {
            case CLOSED:
                d.status = OPENING;
                this._update(undefined);
                this.onNodeOpen(d.id);
                break;
            case OPEN:
                d.status = CLOSING;
                d.children = undefined;
                this._update(d);
                this.onNodeClose(d.id);
                break;
            case OPENING:
                break;
            case CLOSING:
                break;
            case LEAF:
                break;
        }
    };

    GraphVizWidget.prototype._onNodeDblClick = function (d) {
        this.onNodeDblClick(d.id);
    };

    GraphVizWidget.prototype.setData = function (data) {
        this.__root = this._root;

        this._root = $.extend(true, {}, data);

        var copyOver = function (srcNode, dstNode) {
            var i, j;
            if (srcNode && dstNode) {
                if (srcNode.id === dstNode.id) {
                    dstNode.x0 = srcNode.x0;
                    dstNode.y0 = srcNode.y0;
                    i = srcNode.children ? srcNode.children.length : 0;
                    if (i > 0) {
                        while (i--) {
                            j = dstNode.children ? dstNode.children.length : 0;
                            if (j > 0) {
                                while (j--) {
                                    copyOver(srcNode.children[i], dstNode.children[j]);
                                }
                            }
                        }
                    }
                }
            }
        };

        copyOver(this.__root, this._root);
        delete this.__root;

        var width = this._el.width(),
            height = this._el.height();
        this._resizeD3Tree(width, height);

        this._update(undefined);

        //approximate width of the root name
        if (this._root && this._root.name) {
            var rootNameWidth = this._root.name.length * 6;
            if (this._root.children) {
                rootNameWidth = (this._root.name + ' [' + this._root.children.length + ']').length * 6;
            }
            this._el.find('svg > g').attr('transform', 'translate(' + (rootNameWidth + MARGIN) + ',' + MARGIN + ')');
        }
    };

    GraphVizWidget.prototype.onNodeOpen = function (/*id*/) {
    };

    GraphVizWidget.prototype.onNodeClose = function (/*id*/) {
    };

    GraphVizWidget.prototype.onNodeDblClick = function (/*id*/) {
    };

    GraphVizWidget.prototype.onBackgroundDblClick = function () {
    };

    GraphVizWidget.prototype.destroy = function () {
    };

    GraphVizWidget.prototype.onActivate = function () {
    };

    GraphVizWidget.prototype.onDeactivate = function () {
    };

    _.extend(GraphVizWidget.prototype, GraphVizWidgetZoom.prototype);

    GraphVizWidget.getDefaultConfig = function () {
        return {
            zoomValues: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0]
        };
    };

    GraphVizWidget.getComponentId = function () {
        return 'GenericUIGraphVizWidget';
    };

    return GraphVizWidget;
});