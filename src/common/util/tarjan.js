/*globals define*/
/**
 * Module for finding strongly connected components in a directed graph, that is circular references.
 *
 * Based on https://gist.github.com/chadhutchins/1440602 but with constant time stack lookup.
 * https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
 *
 * The example below returns the SCC v2,v3,v4
 *     v1 -*  v2
 *            / *
 *           *   \
 *          v3 -* v4
 * @example
 *
 * var t = new Tarjan();
 *
 * t.addVertex(1);
 * t.addVertex(2);
 * t.addVertex(3);
 * t.addVertex(4);
 *
 * t.connectVertices(1, 2); // Order matters
 * t.connectVertices(2, 3);
 * t.connectVertices(3, 4);
 * t.connectVertices(4, 2);
 *
 * t.calculateSCCs();   -> [[1], [2, 3, 4]]
 * t.hasLoops(); -> true
 *
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    function Vertex(id) {
        this.id = id;
        this.connectedVertices = [];
        this.index = -1;
        this.lowlink = -1;
    }

    Vertex.prototype.connectTo = function (vertex) {
        this.connectedVertices.push(vertex);
    };

    function Graph() {
        // Assumption: ids are unique.
        this.vertices = {};
    }

    Graph.prototype.addVertex = function (id) {
        if (this.vertices.hasOwnProperty(id)) {
            return false;
        } else {
            this.vertices[id] = new Vertex(id);
            return true;
        }
    };

    Graph.prototype.connectVertices = function (id1, id2) {
        if (this.vertices.hasOwnProperty(id1) === false) {
            throw new Error('Vertex [' + id1 + '] was never added to graph!');
        }

        if (this.vertices.hasOwnProperty(id2) === false) {
            throw new Error('Vertex [' + id2 + '] was never added to graph!');
        }

        this.vertices[id1].connectTo(this.vertices[id2]);
    };

    function Tarjan() {
        this.index = 0;
        this.stackLookup = {};
        this.stack = [];
        this.graph = new Graph();
        this.SCCs = [];
        this.didRun = false;
    }

    /**
     * Adds a vertex with given id.
     * @param {string|number} id
     * @returns {boolean} false if it was already added.
     */
    Tarjan.prototype.addVertex = function (id) {
        if (this.didRun) {
            throw new Error('Cannot modify graph after algorithm ran!');
        }

        return this.graph.addVertex(id);
    };

    /**
     * Creates a connection from vertex at id1 to vertex at id2
     * @param {string|number} id1
     * @param {string|number} id2
     */
    Tarjan.prototype.connectVertices = function (id1, id2) {
        if (this.didRun) {
            throw new Error('Cannot modify graph after algorithm ran!');
        }

        this.graph.connectVertices(id1, id2);
    };

    /**
     * Checks if there are any loops in the graph.
     * @returns {boolean}
     */
    Tarjan.prototype.hasLoops = function () {
        var i;

        this.calculateSCCs();

        for (i = 0; i < this.SCCs.length; i += 1) {
            if (this.SCCs[i].length > 1) {
                return true;
            }
        }

        return false;
    };

    /**
     * Returns the strongly connected components (by ids)
     * @returns {Array<Array<String|Number>>} An array with all SCCs.
     */
    Tarjan.prototype.calculateSCCs = function () {
        var id;

        if (this.didRun === false) {
            for (id in this.graph.vertices) {
                if (this.graph.vertices[id].index < 0) {
                    this._strongConnect(this.graph.vertices[id]);
                }
            }

            this.didRun = true;
        }

        return this.SCCs;
    };

    Tarjan.prototype._strongConnect = function (vertex) {
        var i,
            connectedVertex,
            sccVertices = [],
            topVertex;
        // Set the depth index for v to the smallest unused index
        vertex.index = this.index;
        vertex.lowlink = this.index;
        this.index = this.index + 1;

        this.stack.push(vertex);
        this.stackLookup[vertex.id] = true;
        // Consider successors of vertex
        // aka... consider each vertex in vertex.connections
        for (i = 0; i < vertex.connectedVertices.length; i += 1) {
            connectedVertex = vertex.connectedVertices[i];
            if (connectedVertex.index < 0) {
                // Successor connectedVertex has not yet been visited; recurse on it
                this._strongConnect(connectedVertex);
                vertex.lowlink = Math.min(vertex.lowlink, connectedVertex.lowlink);
            } else if (this.stackLookup[connectedVertex.id]) {
                // Successor connectedVertex is in stack S and hence in the current SCC
                vertex.lowlink = Math.min(vertex.lowlink, connectedVertex.index);
            }
        }

        // If vertex is a root node, pop the stack and generate an SCC.
        if (vertex.lowlink === vertex.index) {
            // start a new strongly connected component
            if (this.stack.length > 0) {
                do {
                    topVertex = this.stack.pop();
                    this.stackLookup[topVertex.id] = false;
                    // add topVertex to current strongly connected component
                    sccVertices.push(topVertex.id);
                } while (vertex.id !== topVertex.id);
            }
            // output the current strongly connected component
            // ... i'm going to push the results to a member scc array variable
            if (sccVertices.length > 0) {
                this.SCCs.push(sccVertices);
            }
        }
    };

    return Tarjan;
});