/*globals define, _, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    './AspectDetailsDialog',
    './Aspect'
], function (CONSTANTS, GMEConcepts, nodePropertyNames, AspectDetailsDialog, Aspect) {

    'use strict';

    var MetaDecoratorDiagramDesignerWidgetAspects;

    MetaDecoratorDiagramDesignerWidgetAspects = function () {
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._renderContentAspects = function () {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            self = this;

        this._aspectNames = [];
        this._aspects = {};

        this._skinParts.$aspectsContainer = this.$el.find('.aspects');
        this._skinParts.$addAspectContainer = this.$el.find('.add-new-aspect');

        this._skinParts.$aspectsContainer.on('dblclick', 'li', function (e) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                var aspectName = $(this).find('.n').text().replace(':', ''),
                    node = client.getNode(objId),
                    aspectNames = node.getSetNames(),
                    dialog = new AspectDetailsDialog(),
                    aspectDesc = client.getMetaAspect(objId, aspectName);

                aspectDesc.name = aspectName;
                aspectDesc.validChildrenTypes = self._getAspectDescriptorValidChildrenTypes();

                //pass all the other attribute names to the dialog
                if (aspectNames.indexOf(aspectName) !== -1) {
                    aspectNames.splice(aspectNames.indexOf(aspectName), 1);
                }

                dialog.show(aspectDesc, aspectNames, function (aspectDesc) {
                        self.saveAspectDescriptor(aspectName, aspectDesc);
                    },
                    function () {
                        self.deleteAspectDescriptor(aspectName);
                    }
                );
            }

            e.stopPropagation();
            e.preventDefault();
        });

        //set the 'Add new...' clickhandler
        this._skinParts.$addAspectContainer.on('click', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                self._onNewAspectClick();
            }
            event.stopPropagation();
            event.preventDefault();
        });
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._onNewAspectClick = function () {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            node = client.getNode(objId),
            existingNames = [CONSTANTS.ASPECT_ALL].concat(node.getSetNames());

        this._onNewClick(existingNames, this._skinParts.$aspectsContainer, this._skinParts.$addAspectContainer,
            this._skinParts.$aspectsTitle, this._onNewAspectCreate);
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._updateAspects = function () {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            newAspects = client.getOwnMetaAspectNames(objId) || [],
            len,
            displayedAspects = this._aspectNames.slice(0),
            diff,
            cLIBase = $('<li/>'),
            i;

        //first get the ones that are not there anymore
        diff = _.difference(displayedAspects, newAspects);
        len = diff.length;
        while (len--) {
            this._removeAspect(diff[len]);
        }

        //second get the ones that are new
        diff = _.difference(newAspects, displayedAspects);
        len = diff.length;
        while (len--) {
            this._addAspect(diff[len]);
        }

        //finally update the ones that are not new and not deleted
        diff = _.intersection(newAspects, displayedAspects);
        len = diff.length;
        while (len--) {
            this._updateAspect(diff[len]);
        }

        //finally update UI
        this._aspectNames.sort();
        this._skinParts.$aspectsContainer.empty();
        len = this._aspectNames.length;
        for (i = 0; i < len; i += 1) {
            this._skinParts.$aspectsContainer.append(cLIBase.clone().append(this._aspects[this._aspectNames[i]].$el));
        }
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._addAspect = function (cName) {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            aspect = client.getMetaAspect(objId, cName);

        if (aspect) {
            aspect.name = cName;
            this._aspects[cName] = new Aspect(aspect);
            this._aspectNames.push(cName);
        }
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._updateAspect = function (cName) {
        var client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            aspect = client.getMetaAspect(objId, cName);

        if (aspect) {
            aspect.name = cName;
            this._aspects[cName].update(aspect);
        }
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._removeAspect = function (cName) {
        var idx = this._aspectNames.indexOf(cName);

        if (idx !== -1) {
            this._aspects[cName].destroy();
            delete this._aspects[cName];
            this._aspectNames.splice(idx, 1);
        }
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._onNewAspectCreate = function (cName) {
        var desc,
            self = this,
            client = this._control._client,
            objId = this._metaInfo[CONSTANTS.GME_ID],
            node = client.getNode(objId),
            aspectNames = node.getSetNames(), //all existing aspect is a set as well
            dialog = new AspectDetailsDialog();

        this.logger.debug('_onNewAspectCreate: ' + cName);

        //pass all the other attribute names to the dialog
        if (aspectNames.indexOf(cName) !== -1) {
            aspectNames.splice(aspectNames.indexOf(cName), 1);
        }

        desc = {
            'name': cName,
            'items': [],
            'validChildrenTypes': this._getAspectDescriptorValidChildrenTypes()
        };

        dialog.show(desc, aspectNames, function (cDesc) {
            self.saveAspectDescriptor(cName, cDesc);
        });
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype._getAspectDescriptorValidChildrenTypes = function () {
        var objId = this._metaInfo[CONSTANTS.GME_ID],
            i,
            validChildrenTypeIDs,
            nodeObj,
            typeInfo,
            validChildrenTypes = [],
            client = this._control._client;

        validChildrenTypeIDs = GMEConcepts.getMETAAspectMergedValidChildrenTypes(objId);
        i = validChildrenTypeIDs.length;
        while (i--) {
            typeInfo = {
                'id': validChildrenTypeIDs[i],
                'name': validChildrenTypeIDs[i]
            };

            nodeObj = client.getNode(validChildrenTypeIDs[i]);
            if (nodeObj) {
                typeInfo.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            }

            validChildrenTypes.push(typeInfo);
        }

        //sort types by name
        validChildrenTypes.sort(function (a, b) {
            var aName = a.name.toLowerCase(),
                bName = b.name.toLowerCase(),
                aId = a.id,
                bId = b.id;

            if (aName < bName) {
                return -1;
            } else if (aName > bName) {
                return 1;
            } else {
                if (aId < bId) {
                    return -1;
                } else {
                    return 1;
                }
            }
        });

        return validChildrenTypes;
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype.saveAspectDescriptor = function (cName, cDesc) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        if (cName !== cDesc.name) {
            //name has changed --> delete the descriptor with the old name
            client.deleteMetaAspect(objID, cName);
            client.deleteSet(objID, cName);
        }

        //set meta aspect first
        client.setMetaAspect(objID, cDesc.name, cDesc.items || []);
        client.createSet(objID, cDesc.name);

        client.completeTransaction();
    };

    MetaDecoratorDiagramDesignerWidgetAspects.prototype.deleteAspectDescriptor = function (cName) {
        var client = this._control._client,
            objID = this._metaInfo[CONSTANTS.GME_ID];

        client.startTransaction();

        client.deleteMetaAspect(objID, cName);
        client.deleteSet(objID, cName);

        client.completeTransaction();
    };

    return MetaDecoratorDiagramDesignerWidgetAspects;
});