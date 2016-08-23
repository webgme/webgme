/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author Qishen Zhang / https://github.com/VictorCoder123
 */

define([
    'epiceditor',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    '../Core/DocumentDecorator.Core',
    './DocumentEditorDialog',
    'text!./DocumentDecorator.DiagramDesignerWidget.html',
    'css!./DocumentDecorator.DiagramDesignerWidget.css'
], function (marked,
             CONSTANTS,
             nodePropertyNames,
             DiagramDesignerWidgetDecoratorBase,
             DocumentDecoratorCore,
             DocumentEditorDialog,
             DocumentDecoratorTemplate) {

    'use strict';

    var DocumentDecorator,
        DECORATOR_ID = 'DocumentDecorator',
        TEXT_META_EDIT_BTN_BASE = $('<i class="glyphicon glyphicon-cog text-meta" title="Edit documentation" />');

    DocumentDecorator = function (options) {
        var opts = _.extend({}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);
        DocumentDecoratorCore.apply(this, [opts]);

        this.name = '';

        this._skinParts = {};

        this.$doc = this.$el.find('.doc').first();

        // Use default marked options
        marked.setOptions({
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: true,
            smartLists: true,
            smartypants: false
        });

        this.logger.debug('DocumentDecorator ctor');
    };

    _.extend(DocumentDecorator.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(DocumentDecorator.prototype, DocumentDecoratorCore.prototype);

    DocumentDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    DocumentDecorator.prototype.$DOMBase = $(DocumentDecoratorTemplate);

    DocumentDecorator.prototype.on_addTo = function () {
        var self = this;
        var client = this._control._client;
        var nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);
        this._renderName();

        //render text-editor based META editing UI piece
        this._skinParts.$EditorBtn = TEXT_META_EDIT_BTN_BASE.clone();
        this.$el.append(this._skinParts.$EditorBtn);

        // Load EpicEditor on click
        this._skinParts.$EditorBtn.on('click', function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true &&
                nodeObj.getAttribute('documentation') !== undefined) {
                self._showEditorDialog();
            }

            event.stopPropagation();
            event.preventDefault();
        });

        // Set title editable on double-click 
        this.skinParts.$name.on('dblclick.editOnDblClick', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({
                    class: '',
                    onChange: function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }
                });
            }
            event.stopPropagation();
            event.preventDefault();
        });

        // Show Popover when click on name
        this.skinParts.$name.on('click', function (event) {
            self.skinParts.$name.popover({});
            self.skinParts.$name.popover('show');
            self.logger.debug(self.skinParts.$name.popover);
            event.stopPropagation();
            event.preventDefault();
        });

        // Let the parent decorator class do its job.
        DiagramDesignerWidgetDecoratorBase.prototype.on_addTo.apply(this, arguments);

        // Finally invoke the update too.
        self.update();
    };

    DocumentDecorator.prototype._renderName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);
        //render GME-ID in the DOM, for debugging
        this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});
        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '';
        }
        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');
        this.skinParts.$name.text(this.name);
    };

    DocumentDecorator.prototype.update = function () {
        var client = this._control._client,
            self = this,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = '',
            newDoc = '';

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '';
            newDoc = nodeObj.getAttribute('documentation');
            // Update docs on node when attribute "documentation" changes
            this.$doc.empty();
            // Show error message if documentation attribute is not defined
            if (newDoc === undefined) {
                this.$doc.append('Editor is disabled because attribute "documentation" is not found in Meta-Model');
                this._skinParts.$EditorBtn.addClass('not-activated');
            } else {
                if (self.hostDesignerItem.canvas.getIsReadOnlyMode() === false) {
                    self._skinParts.$EditorBtn.removeClass('not-activated');
                } else {
                    self._skinParts.$EditorBtn.addClass('not-activated');
                }
                this.$doc.append($(marked(newDoc)));
            }

            if (this.name !== newName) {
                this.name = newName;
                this.skinParts.$name.text(this.name);
            }
        }

        this._updateColors();
    };

    DocumentDecorator.prototype.getConnectionAreas = function (id /*, isEnd, connectionMetaInfo*/) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //NORTH
            result.push({
                id: '0',
                x1: edge,
                y1: 0,
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: 0,
                angle1: 270,
                angle2: 270,
                len: LEN
            });

            //EAST
            result.push({
                id: '1',
                x1: this.hostDesignerItem.getWidth(),
                y1: edge,
                x2: this.hostDesignerItem.getWidth(),
                y2: this.hostDesignerItem.getHeight() - edge,
                angle1: 0,
                angle2: 0,
                len: LEN
            });

            //SOUTH
            result.push({
                id: '2',
                x1: edge,
                y1: this.hostDesignerItem.getHeight(),
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: this.hostDesignerItem.getHeight(),
                angle1: 90,
                angle2: 90,
                len: LEN
            });

            //WEST
            result.push({
                id: '3',
                x1: 0,
                y1: edge,
                x2: 0,
                y2: this.hostDesignerItem.getHeight() - edge,
                angle1: 180,
                angle2: 180,
                len: LEN
            });
        }

        return result;
    };

    /**************** EDIT NODE TITLE ************************/

    DocumentDecorator.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    DocumentDecorator.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString();
        if (this.name && this.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
            return true;
        }

        return false;
    };

    /**
     * Initialize Dialog and Editor creation
     * @return {void}
     */
    DocumentDecorator.prototype._showEditorDialog = function () {
        var self = this;
        var client = this._control._client;
        var nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);
        var documentation = nodeObj.getAttribute('documentation') || 'Click to enter documentation.';
        var editorDialog = new DocumentEditorDialog();

        // Initialize with documentation attribute and save callback function
        editorDialog.initialize(documentation,
            function (text) {
                try {
                    client.setAttributes(self._metaInfo[CONSTANTS.GME_ID], 'documentation', text);
                    self.$doc.empty();
                    self.$doc.append($(marked(text)));
                } catch (e) {
                    self.logger.error('Saving META failed... Either not JSON object or something else went wrong...');
                }
            }
        );

        editorDialog.show();
    };

    return DocumentDecorator;
});