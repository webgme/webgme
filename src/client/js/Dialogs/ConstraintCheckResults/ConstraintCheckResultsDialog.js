/*globals define, Raphael, window, WebGMEGlobal*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author kecso / https://github.com/kecso
 */


define(['js/util',
    'text!./templates/ConstraintCheckResultsDialog.html',
    'css!./styles/ConstraintCheckResultsDialog.css'], function (clientUtil, pluginResultsDialogTemplate) {

    "use strict";

    var ContraintCheckResultsDialog = function(){},
        PLUGIN_RESULT_ENTRY_BASE = $('<div/>', { 'class': 'constraint-check-result' }),
        PLUGIN_RESULT_HEADER_BASE = $('<div class="alert"></div>'),
        RESULT_SUCCESS_CLASS = 'alert-success',
        RESULT_ERROR_CLASS  = 'alert-danger',
        ICON_SUCCESS = $('<i class="glyphicon glyphicon-ok glyphicon glyphicon-ok"/>'),
        ICON_ERROR = $('<i class="glyphicon glyphicon-warning-sign glyphicon glyphicon-warning-sign"/>'),
        RESULT_NAME_BASE = $('<span/>', { 'class': 'title' }),
        RESULT_TIME_BASE = $('<span/>', { 'class': 'time' }),
        RESULT_DETAILS_BTN_BASE = $('<span class="btn btn-micro btn-details pull-right"><i class="glyphicon glyphicon-plus glyphicon glyphicon-plus"/></span>'),
        RESULT_DETAILS_BASE = $('<div/>', {'class': 'messages collapse'}),
        NODE_ENTRY_BASE = $('<div/>', { 'class': 'constraint-check-result' }),
        NODE_BTN_BASE = $('<span class="btn btn-micro btn-node pull-left"><i class="glyphicon glyphicon-eye-open glyphicon glyphicon-eye-open"/></span>'),
        MESSAGE_ENTRY_BASE = $('<div class="msg"><div class="msg-title"></div><div class="msg-body"></div></div>'),
        GUID_REGEXP = new RegExp("[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}", 'i');

    ContraintCheckResultsDialog.prototype.show = function (client,pluginResults) {
        var self = this;

        this._dialog = $(pluginResultsDialogTemplate);
        this._client = client;
        this._initDialog(pluginResults);

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };


    ContraintCheckResultsDialog.prototype._initDialog = function (pluginResults) {
        var dialog = this._dialog,
            client = this._client,
            resultEntry,
            body = dialog.find('.modal-body'),
            UNREAD_CSS = 'unread',
            result,
            resultHeader,
            spanResultTitle,
            spanResultTime,
            messageContainer,
            nodeContainer,
            nodeGuids,
            resultDetailsBtn,
            nodeEntry,
            contraintContainer,
            contraintNames,
            contraintEntry,
            messageEntry,
            messageEntryBtn,
            messages,
            i,j, k,
            artifactsContainer,
            artifacts,
            artifactsUL,
            artifactEntry,
            artifactEntryA;

        for (i = 0; i < pluginResults.length; i += 1) {
            result = pluginResults[i];


            resultEntry = PLUGIN_RESULT_ENTRY_BASE.clone();

            if (result.__unread === true) {
                resultEntry.addClass(UNREAD_CSS);
                delete result.__unread;
            }

            resultHeader = PLUGIN_RESULT_HEADER_BASE.clone();
            if (result.hasViolation === true) {
                resultHeader.addClass(RESULT_ERROR_CLASS);
                resultHeader.append(ICON_ERROR.clone());
            } else {
                resultHeader.append(ICON_SUCCESS.clone());
                resultHeader.addClass(RESULT_SUCCESS_CLASS);
            }

            var checkName = result.info || 'unspecified checking';
            spanResultTitle = RESULT_NAME_BASE.clone();
            spanResultTitle.text(checkName);
            resultHeader.append(spanResultTitle);

            var checkTime = result.__time ? clientUtil.formattedDate(new Date(result.__time), 'elapsed') : 'Time: N/A';
            spanResultTime = RESULT_TIME_BASE.clone();
            spanResultTime.text(checkTime);
            resultHeader.append(spanResultTime);

            resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
            resultHeader.append(resultDetailsBtn);

            //collecting the nodes which has violation
            nodeGuids = Object.keys(result);
            j=nodeGuids.length;
            while(--j>=0){
                if(!(GUID_REGEXP.test(nodeGuids[j]) && result[nodeGuids[j]].hasViolation === true )){
                    nodeGuids.splice(j,1);
                }
            }

            nodeContainer = RESULT_DETAILS_BASE.clone();
            for(j=0;j<nodeGuids.length;j++){
                nodeEntry = NODE_ENTRY_BASE.clone();

                nodeEntry.attr("GMEpath",result[nodeGuids[j]]._path);
                nodeEntry.append(NODE_BTN_BASE.clone());

                spanResultTitle = RESULT_NAME_BASE.clone();
                spanResultTitle.text(result[nodeGuids[j]]._name /*+"["+nodeGuids[j]+"]"*/); //TODO GUID removed, come up some real identification text

                nodeEntry.append(spanResultTitle);

                resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
                nodeEntry.append(resultDetailsBtn);

                //now the contraint results
                contraintNames = Object.keys(result[nodeGuids[j]]);
                k=contraintNames.length;
                while(--k>=0){
                    if(!result[nodeGuids[j]][contraintNames[k]].hasViolation === true ){
                        contraintNames.splice(k,1);
                    }
                }

                contraintContainer = RESULT_DETAILS_BASE.clone();
                for(k=0;k<contraintNames.length;k++){
                    contraintEntry = MESSAGE_ENTRY_BASE.clone();
                    contraintEntry.find('.msg-title').text(contraintNames[k]);
                    contraintEntry.find('.msg-body').html(result[nodeGuids[j]][contraintNames[k]].message);

                    contraintContainer.append(contraintEntry);
                }
                nodeEntry.append(contraintContainer);




                nodeContainer.append(nodeEntry);

            }
            resultHeader.append(nodeContainer);

            resultEntry.append(resultHeader);

            body.append(resultEntry);
        }

        dialog.find('.btn-clear').on('click', function () {
            body.empty();
            pluginResults.splice(0, pluginResults.length);
        });

        dialog.on('click', '.btn-details', function (event) {
            $(this).siblings(".messages").toggleClass('in');

            if($(this).children('.glyphicon-plus').length > 0){
                $(this).html('<i class="glyphicon glyphicon-minus glyphicon glyphicon-minus"/>');
            } else {
                $(this).html('<i class="glyphicon glyphicon-plus glyphicon glyphicon-plus"/>');
            }
            event.stopPropagation();
            event.preventDefault();
        });

        dialog.on('click','.btn-node', function(event){
            var node = client.getNode($(this).parent().attr("GMEpath")),
                parentId;

            if(node){
                parentId = node.getParentId();
                //TODO maybe this could be done in a more nicer way
                if(typeof parentId === 'string'){
                    WebGMEGlobal.State.registerActiveObject(parentId);
                    WebGMEGlobal.State.registerActiveSelection([node.getId()]);
                } else {
                    WebGMEGlobal.State.registerActiveObject(node.getId());
                }
                dialog.modal('hide');
            }



        });

    };


    return ContraintCheckResultsDialog;
});