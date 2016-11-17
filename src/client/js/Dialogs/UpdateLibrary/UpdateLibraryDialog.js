/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Loader/LoaderCircles',
    'common/core/constants',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/util',
    'common/regexp',
    'js/Dialogs/MultiTab/MultiTabDialog'
], function (LoaderCircles,
             CORE_CONSTANTS,
             AssetWidget,
             UTILS,
             REGEXP,
             MultiTabDialog) {

    'use strict';

    function UpdateLibraryDialog(client) {
        this._client = client;
    }

    UpdateLibraryDialog.prototype.show = function (libraryId) {
        var dialog = new MultiTabDialog(),
            parameters = {
                title: 'Update Library',
                iconClass: 'glgl',
                tabs: []
            };


    };

    UpdateLibraryDialog.prototype._getBlobTab = function () {
        var description = {
            title: 'File',
            infoTitle: 'From webgmex file',
            infoDetails: 'Use project package as the source of the library',
            formControl: null,
            onOK: function () {

            }
        };

        
    };

    UpdateLibraryDialog.prototype._getUrlTab = function () {

    };

    return UpdateLibraryDialog;
});