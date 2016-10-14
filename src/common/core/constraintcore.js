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
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized ConstraintCore');

        //<editor-fold=Helper Functions>
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

        function getContraintNames(node, onlyOwn) {
            ASSERT(self.isValidNode(node));
            var constraintsNode = self.getChild(node, CONSTANTS.CONSTRAINTS_RELID),
                relIds = onlyOwn ? self.getOwnChildrenRelids(constraintsNode) : self.getChildrenRelids(constraintsNode),
                names = [];

            for (var i = 0; i < relIds.length; i += 1) {
                names.push(self.getAttribute(self.getChild(constraintsNode, relIds[i]), 'name'));
            }
            return names;
        }

        //</editor-fold>

        //<editor-fold=Added Methods>
        this.getConstraint = function (node, name) {
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

        this.setConstraint = function (node, name, constraintObj) {
            ASSERT(innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof name === 'string');
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID),
                constRelId = getConstraintRelId(constraintsNode, name),
                constraintNode;

            if (constRelId) {
                constraintNode = innerCore.getChild(constraintsNode, constRelId);
            } else {
                constraintNode = innerCore.createChild(constraintsNode);
            }

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

        this.delConstraint = function (node, name) {
            ASSERT(innerCore.isValidNode(node));
            var constraintsNode = innerCore.getChild(node, CONSTANTS.CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (constRelId) {
                var constraintNode = innerCore.getChild(constraintsNode, constRelId);
                innerCore.deleteNode(constraintNode, true);
            }

            innerCore.delRegistry(node, getRegConstName(name));
        };

        this.getConstraintNames = function (node) {
            return getContraintNames(node, false);
        };

        //TODO this means we always have to have this layer above type/inheritance layer
        this.getOwnConstraintNames = function (node) {
            return getContraintNames(node, true);
        };
        //</editor-fold>
    }

    return ConstraintCore;
});
