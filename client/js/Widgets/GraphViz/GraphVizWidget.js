/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

define(['logManager',
        'd3',
        'css!/css/Widgets/GraphViz/GraphVizWidget'], function (logManager) {

    var GraphVizWidget,
        GRAPH_VIZ_CLASS = "graph-viz",
        DURATION = 750,
        MARGIN = 20,
        i = 0,
        CLOSED = 'closed',
        OPEN = 'open',
        LEAF = 'LEAF',
        OPENING = 'opening',
        CLOSING = 'CLOSING';

    GraphVizWidget = function (container, params) {
        this._logger = logManager.create("GraphVizWidget");

        this._el = container;
        this.toolBar = params.toolBar;

        this._initialize();

        this._logger.debug("GraphVizWidget ctor finished");
    };

    GraphVizWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height();

        //set Widget title
        this._el.addClass(GRAPH_VIZ_CLASS);

        this._root = undefined;

        this._tree = d3.layout.tree().sort(function (a, b) {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
        this.__svg = d3.select(this._el[0]).append("svg");
        this._resizeD3Tree(width, height);

        this._svg = this.__svg.append("g").attr("transform", "translate(" + MARGIN + "," + MARGIN + ")");
    };

    GraphVizWidget.prototype.onWidgetContainerResize = function (width, height) {
        //call our own resize handler
        this._resizeD3Tree(width, height);
    };

    GraphVizWidget.prototype._resizeD3Tree = function (width, height) {
        this._tree.size([height - 2 * MARGIN, width - 2 * MARGIN]);
        this.__svg.attr("width", width).attr("height", height);
        if (this._root) {
            this._update(undefined);
        }
    };

    GraphVizWidget.prototype._update = function(source) {
        var self = this;

        // Compute the new tree layout.
        var nodes = this._tree.nodes(this._root).reverse(),
            links = this._tree.links(nodes);

        var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

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
        nodes.forEach(function(d) {
            d.y = d.depth * 180;
            d.status = d.status || getOpenStatus(d);
        });

        // Update the nodes…
        var node = this._svg.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        var getDisplayName = function (d) {
            var n = d.name;

            if (d.childrenNum > 0) {
                n += " [" + d.childrenNum + "]";
            }

            return n;
        };

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return d.parent ? "translate(" + d.parent.y0 + "," + d.parent.x0 + ")" : "translate(" + d.y + "," + d.x + ")";
            })
            .on("click", function (d) {
                self._onNodeClick(d);
            })
            .on("dblclick", function (d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                self._onNodeDblClick(d);
            });

        nodeEnter.append("circle")
            .attr("r", 1e-6);

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(DURATION)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 4.5);

        nodeUpdate.select("circle")
            .style("fill", function(d) {
                var status = d.status,
                    color = "#FFFFFF";
                if (status === CLOSED) {
                    color = "lightsteelblue";
                } else if (status === OPENING) {
                    color =  "#ff0000";
                } else if (status === OPEN) {
                    color =  "#ffFFFF";
                } else if (status === LEAF) {
                    color =  "#ffFFFF";
                } else if (status === CLOSING) {
                    color = "#00FF00";
                }

                return color;
            });

        nodeUpdate.select("text")
            .attr("x", function(d) { return (d.children && d.children.length > 0) ? -10 : 10; })
            .attr("text-anchor", function(d) { return (d.children && d.children.length > 0) ? "end" : "start"; })
            .text(function(d) { return getDisplayName(d); })
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(DURATION)
            .attr("transform", function(d) {
                return source ? "translate(" + source.y + "," + source.x + ")" : d.parent ? "translate(" + d.parent.y + "," + d.parent.x + ")" : "translate(" + d.y + "," + d.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = this._svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: d.source.x0, y: d.source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(DURATION)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(DURATION)
            .attr("d", function(d) {
                var o = {x: d.source.x, y: d.source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    };

    GraphVizWidget.prototype._onNodeClick = function(d) {
        switch(d.status) {
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

    GraphVizWidget.prototype._onNodeDblClick = function(d) {
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

        this._update(undefined);
    };

    GraphVizWidget.prototype.onNodeOpen = function (id) {
    };

    GraphVizWidget.prototype.onNodeClose = function (id) {
    };

    GraphVizWidget.prototype.onNodeDblClick = function (id) {
    };

    return GraphVizWidget;
});