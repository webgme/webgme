/**
 * @author Qishen Zhang
 */

define (['js/Constants',
    	 'js/Utils/DisplayFormat',
    	 '../Libs/EpicEditor/js/epiceditor'], 
    function(CONSTANTS, displayFormat, marked){
    	'use strict';
    	var DocumentDecoratorCore;

    	/**
    	 * Default constructor for DocumentDecoratorCore
    	 */
    	DocumentDecoratorCore = function(){};

    	/**
    	 * Load EpicEditor for Decorator to use
    	 * @param  {[type]} options [description]
    	 * @return {[type]}         [description]
    	 */
    	DocumentDecoratorCore.prototype.createEditor = function(editorOptions){
    		console.log(editorOptions.container);
    		this.editor = new EpicEditor(editorOptions);
    	};

    	/**
    	 * Load EpicEditor after it is created, two steps need to be seperated, 
    	 * because editor cannot be load before container element is not rendered
    	 * on DOM element
    	 * @return {[type]} [description]
    	 */
    	DocumentDecoratorCore.prototype.loadEditor = function(){
    		this.editor.load()
    	}

    	return DocumentDecoratorCore;
});