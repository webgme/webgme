/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author Qishen Zhang / https://github.com/VictorCoder123
 */

define([
    '../Libs/EpicEditor/js/epiceditor.min.js',
    'js/RegistryKeys',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    './DocumentEditorDialog',
    'text!./DocumentDecorator.DiagramDesignerWidget.html',
    'css!./DocumentDecorator.DiagramDesignerWidget.css'
], function (marked,
             REGISTRY_KEYS,
             CONSTANTS,
             nodePropertyNames,
             DiagramDesignerWidgetDecoratorBase,
             DocumentEditorDialog,
             DocumentDecoratorTemplate) {

    'use strict';

    var DocumentDecorator,
        __parent__ = DiagramDesignerWidgetDecoratorBase,
        __parent_proto__ = DiagramDesignerWidgetDecoratorBase.prototype,
        DECORATOR_ID = 'DocumentDecorator',
        TEXT_META_EDIT_BTN_BASE = $('<i class="glyphicon glyphicon-cog text-meta" title="Edit documentation" />');

    DocumentDecorator = function (options) {
        var opts = _.extend({}, options);

        __parent__.apply(this, [opts]);

        this.name = '';

        this.editorDialog = new DocumentEditorDialog();

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

    DocumentDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    DocumentDecorator.prototype.$DOMBase = $(DocumentDecoratorTemplate);

    DocumentDecorator.prototype.on_addTo = function () {
        var self = this;
        var client = this._control._client;
        var nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);
        // Initialize dialog with EpicEditor.
        this._initDialog();
        this._renderName();

        //render text-editor based META editing UI piece
        this._skinParts.$EditorBtn = TEXT_META_EDIT_BTN_BASE.clone();
        this.$el.append(this._skinParts.$EditorBtn);

        // Show error message if documentation attribute is not defined
        if (nodeObj.getAttribute('documentation') === undefined) {
            this.$doc.append('Editor is disabled because attribute "documentation" is not found in Meta-Model');
        }

        // Load EpicEditor on click
        this._skinParts.$EditorBtn.on('click', function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true &&
                nodeObj.getAttribute('documentation') !== undefined) {
                self.editorDialog.show();
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

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
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
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = '',
            newDoc = '';

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '';
            newDoc = nodeObj.getAttribute('documentation') || '';
            // Update docs on node when attribute "documentation" changes
            this.$doc.empty();
            this.$doc.append($(marked(newDoc)));
            this.editorDialog.updateText(newDoc);

            if (this.name !== newName) {
                this.name = newName;
                this.skinParts.$name.text(this.name);
            }
        }

        this._updateColors();
    };

    DocumentDecorator.prototype._updateColors = function () {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.borderColor) {
            this.$el.css({
                'border-color': this.borderColor,
                'box-shadow': '0px 0px 7px 0px ' + this.borderColor + ' inset'
            });
            this.skinParts.$name.css({'border-color': this.borderColor});
        } else {
            this.$el.css({
                'border-color': '',
                'box-shadow': ''
            });
            this.skinParts.$name.css({'border-color': ''});
        }

        if (this.textColor) {
            this.$el.css({color: this.textColor});
        } else {
            this.$el.css({color: ''});
        }
    };

    DocumentDecorator.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];
        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, true);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, true);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, true);
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
    DocumentDecorator.prototype._initDialog = function () {
        var self = this;
        var client = this._control._client;
        var nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);
        var documentation = nodeObj.getAttribute('documentation') || 'Click to enter documentation.';
        if (nodeObj.getAttribute('documentation') !== undefined) {
            this.$doc.append($(marked(documentation)));
        }

        // Initialize with documentation attribute and save callback function
        this.editorDialog.initialize(documentation,
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
    };

    return DocumentDecorator;
});