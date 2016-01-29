/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 *
 * example constraint structure for the outside world:
 * {
 *  script:string,
 *  priority:integer,
 *  name:string,
 *  message:string
 * }
 * provided API:
 * getConstraint(node,name) -> constraintObj
 * setConstraint(node,constraintObj)
 * getConstraintNames(node)
 * delConstraint(node,name)
 */

define(['common/util/assert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
    'use strict';

    function ConstraintCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            core = {},
            key;

        for (key in innerCore) {
            core[key] = innerCore[key];
        }

        logger.debug('initialized ConstraintCore');

        //<editor-fold=Helper Functions>
        function createNewConstraintRelId(constraintsNode) {
            var max = Math.pow(2, 31);
            var existingRelIds = innerCore.getChildrenRelids(constraintsNode);
            var relId;
            do {
                relId = Math.floor(Math.random() * max);
            } while (existingRelIds.indexOf(relId) !== -1);
            return '' + relId;
        }

        function getConstraintRelId(constraintsNode, name) {
            var relIds = innerCore.getChildrenRelids(constraintsNode);
            var relId;
            for (var i = 0; i < relIds.length; i++) {
                if (name === innerCore.getAttribute(innerCore.getChild(constraintsNode, relIds[i]), 'name')) {
                    relId = relIds[i];
                    break;
                }
            }
            return relId;
        }

        function getRegConstName(name) {
            return CONSTANTS.CONSTRAINT_REGISTRY_PREFIX + name;
        }
        //</editor-fold>

        //<editor-fold=Added Methods>
        core.getConstraint = function (node, name) {
            ASSERT(innerCore.isValidNode(node));
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (constRelId) {
                var constraintNode = innerCore.getChild(constraintsNode, constRelId);
                return {
                    script: innerCore.getAttribute(constraintNode, 'script'),
                    priority: innerCore.getAttribute(constraintNode, 'priority'),
                    info: innerCore.getAttribute(constraintNode, 'info')
                };
            } else {
                return null;
            }
        };

        core.setConstraint = function (node, name, constraintObj) {
            ASSERT(innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof name === 'string');
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (!constRelId) {
                //we should create a new one
                constRelId = createNewConstraintRelId(constraintsNode);
            }

            var constraintNode = innerCore.getChild(constraintsNode, constRelId);
            constraintObj.priority = constraintObj.priority || CONSTANTS.C_DEF_PRIORITY;
            constraintObj.script = constraintObj.script || 'console.log("empty constraint");';
            constraintObj.info = constraintObj.info || '';
            innerCore.setAttribute(constraintNode, 'name', name);
            innerCore.setAttribute(constraintNode, 'script', constraintObj.script);
            innerCore.setAttribute(constraintNode, 'priority', constraintObj.priority);
            innerCore.setAttribute(constraintNode, 'info', constraintObj.info);
            innerCore.setRegistry(node, getRegConstName(name),
                (innerCore.getRegistry(node, getRegConstName(name)) || 0) + 1);
        };

        core.delConstraint = function (node, name) {
            ASSERT(innerCore.isValidNode(node));
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (constRelId) {
                var constraintNode = innerCore.getChild(constraintsNode, constRelId);
                innerCore.deleteNode(constraintNode, true);
            }
            innerCore.delRegistry(node, getRegConstName(name));
        };

        core.getConstraintNames = function (node) {
            ASSERT(innerCore.isValidNode(node));
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID);
            var relIds = innerCore.getChildrenRelids(constraintsNode);
            var names = [];
            for (var i = 0; i < relIds.length; i++) {
                names.push(innerCore.getAttribute(innerCore.getChild(constraintsNode, relIds[i]), 'name'));
            }
            return names;
        };

        //TODO this means we always have to have this layer above type/inheritance layer
        core.getOwnConstraintNames = function (node) {
            ASSERT(innerCore.isValidNode(node));
            var names = core.getConstraintNames(node),
                base = core.getBase(node),
                baseNames = [],
                i, index;

            if (base) {
                baseNames = core.getConstraintNames(base);
            }

            for (i = 0; i < baseNames.length; i++) {
                index = names.indexOf(baseNames[i]);
                if (index !== -1) {
                    names.splice(index, 1);
                }
            }

            return names;
        };
        //</editor-fold>

        return core;
    }

    return ConstraintCore;
});
