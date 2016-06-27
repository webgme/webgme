/*globals define*/
/*jshint node:true, browser: true*/
/**
 * Helper functions used by plugins and plugin-managers.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
    'use strict';

    /**
     *
     * @param {object} project
     * @param {object} core
     * @param {string} commitHash
     * @param {GmeLogger} logger
     * @param {object} options
     * @param {string} [options.activeNode=''] - path to active node
     * @param {string[]} [options.activeSelection=[]] - paths to selected nodes.
     * @param {string} [options.namespace=''] - used namespace during execution ('' represents all namespaces).
     * @param callback
     * @returns {*}
     */
    function loadNodesAtCommitHash(project, core, commitHash, logger, options, callback) {
        var result = {
            commitHash: commitHash,
            rootHash: null,
            rootNode: null,
            activeNode: null,
            activeSelection: null,
            META: {}
        };

        return Q.ninvoke(project, 'loadObject', commitHash)
            .then(function (commitObject) {
                result.rootHash = commitObject.root;
                logger.debug('commitObject loaded');

                // Load root node.
                return core.loadRoot(result.rootHash);
            })
            .then(function (rootNode) {
                result.rootNode = rootNode;
                logger.debug('rootNode loaded');

                // Load active node.
                return core.loadByPath(result.rootNode, options.activeNode || '');
            })
            .then(function (activeNode) {
                result.activeNode = activeNode;
                logger.debug('activeNode loaded');

                // Load active selection.
                options.activeSelection = options.activeSelection || [];

                return Q.all(options.activeSelection.map(function (nodePath) {
                    return core.loadByPath(result.rootNode, nodePath);
                }));
            })
            .then(function (activeSelection) {
                var paths2MetaNodes = core.getAllMetaNodes(result.rootNode),
                    libraryNames = core.getLibraryNames(result.rootNode),
                    metaNodeName,
                    nodeNamespace,
                    fullName,
                    path;

                result.activeSelection = activeSelection;
                logger.debug('activeSelection loaded');

                // Gather the META nodes and "sort" based on given namespace.
                function startsWith(str, pattern) {
                    return str.indexOf(pattern) === 0;
                }

                if (options.namespace) {
                    if (libraryNames.indexOf(options.namespace) === -1) {
                        throw new Error('Given namespace does not exist among the available: "' +
                            libraryNames + '".');
                    }

                    for (path in paths2MetaNodes) {
                        nodeNamespace = core.getNamespace(paths2MetaNodes[path]);
                        metaNodeName = core.getAttribute(paths2MetaNodes[path], 'name');

                        if (startsWith(nodeNamespace, options.namespace)) {
                            // Trim the based on the chosen namespace (+1 is to remove any dot).
                            nodeNamespace = nodeNamespace.substring(options.namespace.length + 1);
                            if (nodeNamespace) {
                                result.META[nodeNamespace + '.' + metaNodeName] = paths2MetaNodes[path];
                            } else {
                                result.META[metaNodeName] = paths2MetaNodes[path];
                            }
                        } else {
                            // Meta node is not within the given namespace and will not be added to META.
                        }
                    }
                } else {
                    for (path in paths2MetaNodes) {
                        fullName = core.getFullyQualifiedName(paths2MetaNodes[path]);
                        if (result.META[fullName]) {
                            logger.error('Meta-nodes share the same full name. Will still proceed..', fullName);
                        }

                        result.META[fullName] = paths2MetaNodes[path];
                    }
                }

                return result;
            })
            .nodeify(callback);
    }

    return {
        loadNodesAtCommitHash: loadNodesAtCommitHash
    };
});