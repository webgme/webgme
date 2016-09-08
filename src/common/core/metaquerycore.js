/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/assert'
], function (ASSERT) {
    'use strict';

    var MetaQueryCore = function (innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized MetaQueryCore');

        //<editor-fold=Helper Functions>
        function sensitiveFilter(validNodes) {
            var i;

            i = validNodes.length;
            while (i--) {
                if (self.isConnection(validNodes[i]) || self.isAbstract(validNodes[i])) {
                    validNodes.splice(i, 1);
                }
            }
        }

        //</editor-fold>

        //<editor-fold=Modified Methods>
        //</editor-fold>

        //<editor-fold=Added Methods>
        this.isAbstract = function (node) {
            return self.getRegistry(node, 'isAbstract') === true;
        };

        this.isConnection = function (node) {
            var validPtrNames = innerCore.getValidPointerNames(node);

            return validPtrNames.indexOf('dst') !== -1 && validPtrNames.indexOf('src') !== -1;
        };

        this.getValidChildrenMetaNodes = function (parameters) {
            var validNodes = [],
                node = parameters.node,
                metaNodes = self.getAllMetaNodes(node),
                keys = Object.keys(metaNodes || {}),
                i, j,
                typeCounters = {},
                children = parameters.children || [],
                rules,
                inAspect;

            rules = innerCore.getChildrenMeta(node) || {};

            for (i = 0; i < keys.length; i += 1) {
                if (self.isValidChildOf(metaNodes[keys[i]], node)) {
                    validNodes.push(metaNodes[keys[i]]);
                }
            }

            //before every next step we check if we still have potential nodes
            if (validNodes.length === 0) {
                return validNodes;
            }

            if (parameters.sensitive === true) {
                sensitiveFilter(validNodes);
            }

            //before every next step we check if we still have potential nodes
            if (validNodes.length === 0) {
                return validNodes;
            }

            if (parameters.multiplicity === true) {
                if (rules.max && rules.max > -1 && innerCore.getChildrenRelids(node).length >= rules.max) {
                    validNodes = [];
                    return validNodes;
                }
                if (children.length === 0) {
                    return validNodes; //we cannot check type-multiplicity without children
                }

                delete rules.max;
                delete rules.min;

                //we need to clear nodes that are not on the meta sheet
                // and we have to initialize the counters
                keys = Object.keys(rules);
                for (i = 0; i < keys.length; i += 1) {
                    if (metaNodes[keys[i]]) {
                        typeCounters[keys[i]] = 0;
                    } else {
                        delete rules[keys[i]];
                    }
                }

                keys = Object.keys(rules);
                for (i = 0; i < children.length; i += 1) {
                    for (j = 0; j < keys.length; j += 1) {
                        if (innerCore.isTypeOf(children[i], metaNodes[keys[j]])) {
                            typeCounters[keys[j]] += 1;
                        }
                    }
                }

                i = validNodes.length;
                keys = Object.keys(typeCounters);
                while (i--) {
                    for (j = 0; j < keys.length; j += 1) {
                        if (rules[keys[j]].max &&
                            rules[keys[j]].max > -1 &&
                            rules[keys[j]].max <= typeCounters[keys[j]] &&
                            innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                            validNodes.splice(i, 1); //FIXME slow, use only push instead
                            break;
                        }
                    }
                }
            }

            //before every next step we check if we still have potential nodes
            if (validNodes.length === 0) {
                return validNodes;
            }

            if (parameters.aspect) {
                keys = innerCore.getAspectMeta(node, parameters.aspect);
                i = validNodes.length;

                while (i--) {
                    inAspect = false;
                    for (j = 0; j < keys.length; j += 1) {
                        if (innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                            inAspect = true;
                            break;
                        }
                    }
                    if (!inAspect) {
                        validNodes.splice(i, 1);
                    }
                }
            }
            return validNodes;
        };

        this.getValidSetElementsMetaNodes = function (parameters) {
            var validNodes = [],
                node = parameters.node,
                name = parameters.name,
                metaNodes = self.getAllMetaNodes(node),
                keys = Object.keys(metaNodes || {}),
                i, j,
                typeCounters = {},
                members = parameters.members || [],
                rules = self.getPointerMeta(node, name) || {};

            for (i = 0; i < keys.length; i += 1) {
                if (metaNodes[keys[i]] && self.isValidTargetOf(metaNodes[keys[i]], node, name)) {
                    validNodes.push(metaNodes[keys[i]]);
                }
            }

            //before every next step we check if we still have potential nodes
            if (validNodes.length === 0) {
                return validNodes;
            }

            if (parameters.sensitive === true) {
                sensitiveFilter(validNodes);
            }

            //before every next step we check if we still have potential nodes
            if (validNodes.length === 0) {
                return validNodes;
            }

            if (parameters.multiplicity === true) {
                if (rules.max && rules.max > -1 && innerCore.getMemberPaths(node).length >= rules.max) {
                    validNodes = [];
                    return validNodes;
                }

                if (members.length === 0) {
                    return validNodes; //we cannot check type-multiplicity without children
                }

                delete rules.max;
                delete rules.min;

                //we need to clear nodes that are not on the meta sheet
                // and we have to initialize the counters
                keys = Object.keys(rules);
                for (i = 0; i < keys.length; i += 1) {
                    if (!metaNodes[keys[i]]) {
                        delete rules[keys[i]];
                    } else {
                        typeCounters[keys[i]] = 0;
                    }
                }

                keys = Object.keys(rules);
                for (i = 0; i < members.length; i += 1) {
                    for (j = 0; j < keys.length; j += 1) {
                        if (innerCore.isTypeOf(members[i], metaNodes[keys[j]])) {
                            typeCounters[keys[j]] += 1;
                        }
                    }
                }

                i = validNodes.length;
                keys = Object.keys(typeCounters);
                while (i--) {
                    for (j = 0; j < keys.length; j += 1) {
                        if (rules[keys[j]].max &&
                            rules[keys[j]].max > -1 &&
                            rules[keys[j]].max <= typeCounters[keys[j]] &&
                            innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                            validNodes.splice(i, 1); //FIXME slow, use only push instead
                            break;
                        }
                    }
                }
            }

            return validNodes;
        };
        //</editor-fold>
    };

    return MetaQueryCore;
});