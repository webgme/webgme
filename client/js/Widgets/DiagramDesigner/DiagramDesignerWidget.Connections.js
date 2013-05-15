"use strict";

define(['js/Widgets/DiagramDesigner/Connection',
        'js/Widgets/DiagramDesigner/Constants'], function (Connection,
                                                   DiagramDesignerWidgetConstants) {

    var DiagramDesignerWidget;

    DiagramDesignerWidget = function () {

    };

    DiagramDesignerWidget.prototype.createConnection = function (objD) {
        var connectionId = this.getGuid("C_"),
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
        /*var connectionId = id,
            sourceId = objDescriptor.source,
            targetId = objDescriptor.target,
            idx,
            endId;*/

        //this.logger.debug("Updating connection component with ID: '" + id + "'");
        this.logger.error("updateConnection NOT YET IMPLEMENTED!!!!");

        //add to accounting queues for performance optimization
        /*this._updatedConnectionIDs.push(connectionId);

        /* check if any endpoint of the connection has been changed */
        //check SOURCE
        /*if (sourceId !== this.connectionEndIDs[id].source) {
            endId = this.connectionEndIDs[id].source;
            idx = this.connectionIDbyEndID[endId].indexOf(id);
            if (idx !== -1) {
                this.connectionIDbyEndID[endId].splice(idx, 1);
            }

            //account the new
            this.connectionIDbyEndID[sourceId] = this.connectionIDbyEndID[sourceId] || [];
            this.connectionIDbyEndID[sourceId].push(id);
        }

        //check TARGET
        if (targetId !== this.connectionEndIDs[id].target) {
            endId = this.connectionEndIDs[id].target;
            idx = this.connectionIDbyEndID[endId].indexOf(id);
            if (idx !== -1) {
                this.connectionIDbyEndID[endId].splice(idx, 1);
            }

            //account the new
            this.connectionIDbyEndID[targetId] = this.connectionIDbyEndID[targetId] || [];
            this.connectionIDbyEndID[targetId].push(id);
        }

        //accounting connection info
        this.connectionEndIDs[connectionId] = {"source": sourceId,
            "target": targetId };*/
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

    DiagramDesignerWidget.prototype.createNewConnection = function (params) {
        this.logger.debug("Creating new connection with parameters: '" + JSON.stringify(params) + "'");

        this.onCreateNewConnection(params);
    };

    DiagramDesignerWidget.prototype.modifyConnectionEnd = function (params) {
        var oConnectionDesc = _.extend({}, this.connectionEndIDs[params.id]),
            nConnectionDesc = _.extend({}, this.connectionEndIDs[params.id]);

        this.logger.debug("Modifying connection with parameters: '" + JSON.stringify(params) + "'");

        if (params.endPoint === "SOURCE") {
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

    return DiagramDesignerWidget;
});
