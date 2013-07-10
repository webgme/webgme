"use strict";

define(['js/Widgets/DiagramDesigner/Connection',
        'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (Connection,
                                                   DiagramDesignerWidgetConstants) {

    var DiagramDesignerWidget;

    DiagramDesignerWidget = function () {

    };

    DiagramDesignerWidget.prototype.createConnection = function (objD) {
        var connectionId = this._getGuid("C_"),
            objDescriptor = _.extend({}, objD),
            sourceId = objDescriptor.srcObjId,
            sourceSubcomponentId = objDescriptor.srcSubCompId,
            targetId = objDescriptor.dstObjId,
            targetSubcomponentId = objDescriptor.dstSubCompId,
            newComponent;

        this.logger.debug("Creating connection component with parameters: " + JSON.stringify(objDescriptor));

        objDescriptor.designerCanvas = this;

        this.connectionIds.push(connectionId);

        //add to accounting queues for performance optimization
        this._insertedConnectionIDs.push(connectionId);

        //accounting connection info
        this.connectionEndIDs[connectionId] = {"srcObjId": sourceId,
                                              "srcSubCompId": sourceSubcomponentId,
                                              "dstObjId": targetId,
                                              "dstSubCompId": targetSubcomponentId};


        var ssubId = sourceSubcomponentId || DiagramDesignerWidgetConstants.SELF;
        this.connectionIDbyEndID[sourceId] = this.connectionIDbyEndID[sourceId] || {};
        this.connectionIDbyEndID[sourceId][ssubId] = this.connectionIDbyEndID[sourceId][ssubId] || [];
        this.connectionIDbyEndID[sourceId][ssubId].push(connectionId);

        ssubId = targetSubcomponentId || DiagramDesignerWidgetConstants.SELF;
        this.connectionIDbyEndID[targetId] = this.connectionIDbyEndID[targetId] || {};
        this.connectionIDbyEndID[targetId][ssubId] = this.connectionIDbyEndID[targetId][ssubId] || [];
        this.connectionIDbyEndID[targetId][ssubId].push(connectionId);

        newComponent = this.items[connectionId] = new Connection(connectionId);
        newComponent._initialize(objDescriptor);
        return newComponent;
    };

    DiagramDesignerWidget.prototype.updateConnection = function (id, objDescriptor) {
        var connectionId = id,
            srcObjId = objDescriptor.srcObjId,
            srcSubCompId = objDescriptor.srcSubCompId,
            dstObjId = objDescriptor.dstObjId,
            dstSubCompId = objDescriptor.dstSubCompId,
            idx,
            objId,
            subComponentId;

        this.logger.debug("Updating connection component with ID: '" + id + "'");

        //add to accounting queues for performance optimization
        this._updatedConnectionIDs.push(connectionId);

        /* check if any endpoint of the connection has been changed */
        //check SOURCE
        if (srcObjId !== this.connectionEndIDs[id].srcObjId &&
            srcSubCompId !== this.connectionEndIDs[id].srcSubCompId) {

            objId = this.connectionEndIDs[srcObjId].srcObjId;
            subComponentId = this.connectionEndIDs[id].srcSubCompId || DiagramDesignerWidgetConstants.SELF;
            idx = this.connectionIDbyEndID[objId][subComponentId].indexOf(id);
            if (idx !== -1) {
                this.connectionIDbyEndID[objId][subComponentId].splice(idx, 1);
            }

            //account the new
            var ssubId = srcSubCompId || DiagramDesignerWidgetConstants.SELF;
            this.connectionIDbyEndID[srcObjId] = this.connectionIDbyEndID[srcObjId] || {};
            this.connectionIDbyEndID[srcObjId][ssubId] = this.connectionIDbyEndID[srcObjId][ssubId] || [];
            this.connectionIDbyEndID[srcObjId][ssubId].push(connectionId);
        }

        //check TARGET
        if (dstObjId !== this.connectionEndIDs[id].dstObjId &&
            dstSubCompId !== this.connectionEndIDs[id].dstSubCompId) {

            objId = this.connectionEndIDs[dstObjId].dstObjId;
            subComponentId = this.connectionEndIDs[id].dstSubCompId || DiagramDesignerWidgetConstants.SELF;
            idx = this.connectionIDbyEndID[objId][subComponentId].indexOf(id);
            if (idx !== -1) {
                this.connectionIDbyEndID[objId][subComponentId].splice(idx, 1);
            }

            //account the new
            var ssubId = dstSubCompId || DiagramDesignerWidgetConstants.SELF;
            this.connectionIDbyEndID[dstObjId] = this.connectionIDbyEndID[dstObjId] || {};
            this.connectionIDbyEndID[dstObjId][ssubId] = this.connectionIDbyEndID[dstObjId][ssubId] || [];
            this.connectionIDbyEndID[dstObjId][ssubId].push(connectionId);
        }

        //accounting connection info
        this.connectionEndIDs[connectionId] = {"srcObjId": srcObjId,
            "srcSubCompId": srcSubCompId,
            "dstObjId": dstObjId,
            "dstSubCompId": dstSubCompId};

        this.items[connectionId].update(objDescriptor);
    };

    DiagramDesignerWidget.prototype.deleteConnection = function (id) {
        var idx,
            objId,
            subComponentId;

        this.logger.debug("Deleting connection component with ID: '" + id + "'");

        //keep up accounting
        this._deletedConnectionIDs.push(id);

        //remove connection from source list
        objId = this.connectionEndIDs[id].srcObjId;
        subComponentId = this.connectionEndIDs[id].srcSubCompId || DiagramDesignerWidgetConstants.SELF;
        idx = this.connectionIDbyEndID[objId][subComponentId].indexOf(id);
        if (idx !== -1) {
            this.connectionIDbyEndID[objId][subComponentId].splice(idx, 1);
        }

        //remove connection from target list
        objId = this.connectionEndIDs[id].dstObjId;
        subComponentId = this.connectionEndIDs[id].dstSubCompId || DiagramDesignerWidgetConstants.SELF;
        idx = this.connectionIDbyEndID[objId][subComponentId].indexOf(id);
        if (idx !== -1) {
            this.connectionIDbyEndID[objId][subComponentId].splice(idx, 1);
        }

        //remove connection from connection endpoint list
        delete this.connectionEndIDs[id];

        //remove ID from connection ID list
        idx = this.connectionIds.indexOf(id);
        this.connectionIds.splice(idx, 1);

        //get rid of the connection itself
        this.items[id].destroy();
        delete this.items[id];
    };

    /*
     * Called when a new connection is being created in the widget by the user
     */
    DiagramDesignerWidget.prototype.onCreateNewConnection = function (params) {
        this.logger.warning("onCreateNewConnection with parameters: '" + JSON.stringify(params) + "'");
    };

    DiagramDesignerWidget.prototype._onModifyConnectionEnd = function (params) {
        var oConnectionDesc = _.extend({}, this.connectionEndIDs[params.id]),
            nConnectionDesc = _.extend({}, this.connectionEndIDs[params.id]);

        this.logger.debug("Modifying connection with parameters: '" + JSON.stringify(params) + "'");

        if (params.endPoint === DiagramDesignerWidgetConstants.CONNECTION_END_SRC) {
            nConnectionDesc.srcObjId = params.endId;
            nConnectionDesc.srcSubCompId = params.endSubCompId;
        } else {
            nConnectionDesc.dstObjId = params.endId;
            nConnectionDesc.dstSubCompId = params.endSubCompId;
        }

        if (_.isEqual(oConnectionDesc, nConnectionDesc) === false ) {
            this.onModifyConnectionEnd({ "id": params.id,
                                         "old": oConnectionDesc,
                                         "new": nConnectionDesc });
        }
    };

    /*
     * Called when a new connection is being created in the widget by the user
     */
    DiagramDesignerWidget.prototype.onModifyConnectionEnd = function (params) {
        this.logger.warning("onModifyConnectionEnd with parameters: '" + JSON.stringify(params) + "'");
    };


    /**************** ON_END_CONNECTION_DRAW EVENT HANDLER *******************/
    DiagramDesignerWidget.prototype._onEndConnectionDraw = function () {
        var i = this.itemIds.length;

        while (i--) {
            this.items[this.itemIds[i]].hideEndConnectors();
        }
    };

    /**************** ON _TART_CONNECTION_CREATE EVENT HANDLER *******************/
    DiagramDesignerWidget.prototype._onStartConnectionCreate = function (params) {
        var srcItemID = params.srcId,
            srcSubCompID = params.srcSubCompId,
            availableEndPoints = [],
            srcItemMetaInfo = this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo(),
            srcSubCompMetaInfo = srcSubCompID ? this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo(srcSubCompID) : undefined,
            i,
            objID,
            filteredDroppableEnds;

        //clear out selection
        this.selectionManager.clear();

        //hide all the source connectors on the 'src' item
        this.items[srcItemID].hideSourceConnectors();

        //iterate through all the known items to build the available connection end list
        i = this.itemIds.length;
        while (i--) {
            availableEndPoints.push({'dstItemID': this.itemIds[i],
                'dstSubCompID': undefined});
        }

        //iterate through all the known items' subcomponents to build the available connection end list
        for (objID in this._itemSubcomponentsMap) {
            if (this._itemSubcomponentsMap.hasOwnProperty(objID)) {
                i = this._itemSubcomponentsMap[objID].length;
                while (i--) {
                    availableEndPoints.push({'dstItemID': objID,
                        'dstSubCompID': this._itemSubcomponentsMap[objID][i]});
                }
            }
        }

        //all available items and their subcomponent is a valid connection-destination by default
        params.availableConnectionEnds = availableEndPoints;

        //call optional filtering
        filteredDroppableEnds = this.onFilterNewConnectionDroppableEnds(params) || [];
        this.logger.debug('_onStartConnectionCreate filteredDroppableEnds: ' + JSON.stringify(filteredDroppableEnds));

        //iterate through all the filteredDroppableEnds and
        //ask the decorators to display the connectors for the given item/subcomponent
        var processedIndices = [];
        var decoratorPackages = [];
        while (filteredDroppableEnds.length > 0) {
            i = filteredDroppableEnds.length;
            objID = filteredDroppableEnds[0].dstItemID;
            var decoratorUpdatePackage = [];
            processedIndices = [];
            while (i--) {
                if (objID === filteredDroppableEnds[i].dstItemID) {
                    processedIndices.push(i);
                    decoratorUpdatePackage.push(filteredDroppableEnds[i].dstSubCompID);
                }
            }
            decoratorPackages.push([objID, srcItemMetaInfo, srcSubCompMetaInfo, decoratorUpdatePackage]);
            processedIndices.sort(function(a,b){return a-b});
            i = processedIndices.length;
            while(i--) {
                filteredDroppableEnds.splice(processedIndices[i], 1);
            }
        }

        this.logger.debug('_onStartConnectionCreate decorator update package: ' + JSON.stringify(decoratorPackages));
        i = decoratorPackages.length;
        while (i--) {
            objID = decoratorPackages[i][0];
            this.items[objID].showEndConnectors({'srcItemMetaInfo': decoratorPackages[i][1],
                'srcSubCompMetaInfo': decoratorPackages[i][2],
                'connectors': decoratorPackages[i][3]} );
        }
    };

    DiagramDesignerWidget.prototype.onFilterNewConnectionDroppableEnds = function (params) {
        this.logger.warning("DiagramDesignerWidget.prototype.onFilterNewConnectionDroppableEnds not overridden in controller. params: " + JSON.stringify(params));

        return params.availableConnectionEnds;
    };

    /**************** ON_START_CONNECTION_RECONNECT EVENT HANDLER *******************/
    DiagramDesignerWidget.prototype._onStartConnectionReconnect = function (params) {
        var connID = params.connId,
            srcDragged = params.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC,
            srcItemID,
            srcSubCompID,
            dstItemID,
            dstSubCompID,
            availableEndPoints = [],
            availableSourcePoints = [],
            srcItemMetaInfo,
            srcSubCompMetaInfo,
            dstItemMetaInfo,
            dstSubCompMetaInfo,
            i,
            objID,
            filteredResult;

        //don't clear the selection but remove the highlight
        this.selectionManager.hideSelectionOutline();

        //based on 'src' or 'dst' end of the connection is being dragged,
        //set src/dst values and meta descriptors
        if (srcDragged === true ) {
            //source end of the connection is dragged
            //destination is fix
            if (this.connectionEndIDs[connID]) {
                dstItemID = this.connectionEndIDs[connID].dstObjId;
                dstSubCompID = this.connectionEndIDs[connID].dstSubCompId;
                dstItemMetaInfo = this.items[dstItemID]._decoratorInstance.getConnectorMetaInfo();
                dstSubCompMetaInfo = dstSubCompID ? this.items[dstItemID]._decoratorInstance.getConnectorMetaInfo(dstSubCompID) : undefined;
            }
        } else {
            //destination end of the connection is dragged
            //source is fix
            if (this.connectionEndIDs[connID]) {
                srcItemID = this.connectionEndIDs[connID].srcObjId;
                srcSubCompID = this.connectionEndIDs[connID].srcSubCompId;
                srcItemMetaInfo = this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo();
                srcSubCompMetaInfo = srcSubCompID ? this.items[srcItemID]._decoratorInstance.getConnectorMetaInfo(srcSubCompID) : undefined;
            }
        }

        //iterate through all the known items to build the available connection src/dst list
        i = this.itemIds.length;
        while (i--) {
            if (srcDragged === true ) {
                availableSourcePoints.push({'srcItemID': this.itemIds[i],
                    'srcSubCompID': undefined});
            } else {
                availableEndPoints.push({'dstItemID': this.itemIds[i],
                    'dstSubCompID': undefined});
            }
        }

        //iterate through all the known items' subcomponents to build the available connection src/dst list
        for (objID in this._itemSubcomponentsMap) {
            if (this._itemSubcomponentsMap.hasOwnProperty(objID)) {
                i = this._itemSubcomponentsMap[objID].length;
                while (i--) {
                    if (srcDragged === true ) {
                        availableSourcePoints.push({'srcItemID': objID,
                            'srcSubCompID': this._itemSubcomponentsMap[objID][i]});
                    } else {
                        availableEndPoints.push({'dstItemID': objID,
                            'dstSubCompID': this._itemSubcomponentsMap[objID][i]});
                    }
                }
            }
        }

        //all available items and their subcomponent is a valid connection destination by default
        params.availableConnectionEnds = availableEndPoints;
        params.availableConnectionSources = availableSourcePoints;
        params.srcItemID = srcItemID;
        params.srcSubCompID = srcSubCompID;
        params.dstItemID = dstItemID;
        params.dstSubCompID = dstSubCompID;

        filteredResult = this.onFilterReconnectionDroppableEnds(params) || [];
        this.logger.debug('_onStartConnectionReconnect filteredResult:' + JSON.stringify(filteredResult));

        //iterate through all the filteredResult and ask the decorators to highlight the given connection endpoint's connector
        var processedIndices = [];
        var decoratorPackages = [];
        var prefix = srcDragged ? 'src' : 'dst';
        while (filteredResult.length > 0) {
            i = filteredResult.length;
            objID = filteredResult[0][prefix + 'ItemID'];
            var decoratorUpdatePackage = [];
            processedIndices = [];
            while (i--) {
                if (objID === filteredResult[i][prefix + 'ItemID']) {
                    processedIndices.push(i);
                    decoratorUpdatePackage.push(filteredResult[i][prefix + 'SubCompID']);
                }
            }
            decoratorPackages.push([objID, srcDragged ? srcItemMetaInfo : dstItemMetaInfo, srcDragged ? srcSubCompMetaInfo : dstSubCompMetaInfo, decoratorUpdatePackage]);
            processedIndices.sort(function(a,b){return a-b});
            i = processedIndices.length;
            while(i--) {
                filteredResult.splice(processedIndices[i], 1);
            }
        }

        this.logger.debug('_onStartConnectionReconnect decorator update package: ' + JSON.stringify(decoratorPackages));
        i = decoratorPackages.length;
        while (i--) {
            objID = decoratorPackages[i][0];
            if (srcDragged) {
                this.items[objID].showSourceConnectors({'dstItemMetaInfo': decoratorPackages[i][1],
                    'dstSubCompMetaInfo': decoratorPackages[i][2],
                    'connectors': decoratorPackages[i][3]} );
            } else {
                this.items[objID].showEndConnectors({'srcItemMetaInfo': decoratorPackages[i][1],
                    'srcSubCompMetaInfo': decoratorPackages[i][2],
                    'connectors': decoratorPackages[i][3]} );
            }
        }
    };

    DiagramDesignerWidget.prototype.onFilterReconnectionDroppableEnds = function (params) {
        var srcDragged = params.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC;

        this.logger.warning("DiagramDesignerWidget.prototype.onFilterReconnectionDroppableEnds not overridden in controller. params: " + JSON.stringify(params));

        if (srcDragged === true) {
            return params.availableConnectionSources;
        } else {
            return params.availableConnectionEnds;
        }
    };

    return DiagramDesignerWidget;
});
