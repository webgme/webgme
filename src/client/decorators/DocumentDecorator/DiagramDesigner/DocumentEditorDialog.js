/*globals define, $, EpicEditor*/
/*jshint browser:true*/
/**
 * @author Qishen Zhang / https://github.com/VictorCoder123
 */

define(['js/util',
    'epiceditor',
    'text!./DocumentEditorDialog.html'
], function (Util,
             marked,
             DocumentEditorDialogTemplate) {
    'use strict';

    var DocumentEditorDialog;

    /**
     * DocumentEditorDialog Constructor
     * Insert dialog modal into body and initialize editor with
     * customized options
     */
    DocumentEditorDialog = function () {
        // Get Modal Template node for Editor Dialog and append it to body
        this._dialog = $(DocumentEditorDialogTemplate);
        this._dialog.appendTo($(document.body));

        // Get element nodes
        this._el = this._dialog.find('.modal-body').first();
        this._btnSave = this._dialog.find('.btn-save').first();
        this._pMeta = this._el.find('#pMeta').first();
        this._content = this._pMeta.find('div.controls').first();

        /* Create Markdown Editor with options, but load() function should be
         * invoked in callback function when container is rendered on DOM */
        var editorOptions = {
            container: this._content.get(0), // Get raw DOM element
            basePath: 'bower_components/EpicEditor/epiceditor',
            autogrow: {
                minHeight: 300,
            },
            button: {
                fullscreen: true,
            },
            parser: marked,
        };
        this.editor = new EpicEditor(editorOptions);
        this.text = ''; // Keep track modified text in editor
    };

    /**
     * Initialize DocumentEditorDialog by creating EpicEditor in Bootstrap modal
     * window and set event listeners on its subcomponents like save button. Notice
     * EpicEditor is created but not loaded yet. The creation and loading of editor
     * are seperated due to the reason decorator component is not appended to DOM within
     * its own domain.
     * @param  {String}     text           Text to be rendered in editor initially
     * @param  {Function}   saveCallback   Callback function after click save button
     * @return {void}
     */
    DocumentEditorDialog.prototype.initialize = function (text, saveCallback) {
        var self = this;
        this.text = text; // Initial text from Attribute documentation

        // Initialize Modal and append it to main DOM
        this._dialog.modal({show: false});

        // Event listener on click for SAVE button
        this._btnSave.on('click', function (event) {
            // Invoke callback to deal with modified text, like save it in client.
            if (saveCallback) {
                saveCallback.call(null, self.editor.exportFile());
            }

            // Close dialog
            self._dialog.modal('hide');
            event.stopPropagation();
            event.preventDefault();
        });

        // Listener on event when dialog is shown
        // Use callback to show editor after Modal window is shown.
        this._dialog.on('shown.bs.modal', function () {
            if (!self.editor.is('loaded')) { // Load editor only once
                self.editor.load();
            }
            // Render text from params into Editor and store it in local storage
            self.editor.importFile('epiceditor', self.text);
        });

        // Listener on event when dialog is hidden
        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.empty();
            self._dialog.remove();
            self.editor.remove(); // clear the localstorage of the editor
        });
    };

    /**
     * Update text in editor area
     * @param  {String} newtext [new text to replace old one]
     */
    DocumentEditorDialog.prototype.updateText = function (newtext) {
        this.text = newtext;
    };

    /**
     * Show actual text editor in its container by loading EpicEditor, this method
     * must be put into listener's callback function because its container is not appended
     * into DOM at this point and load() cannot access other DOM elements.
     * @return {void}
     */
    DocumentEditorDialog.prototype.show = function () {
        var self = this;
        self._dialog.modal('show');
    };

    return DocumentEditorDialog;
});