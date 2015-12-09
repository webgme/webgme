/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
	'js/Constants',
	'js/NodePropertyNames',
	'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
	'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
	'text!../DiagramDesigner/DocumentDecorator.DiagramDesignerWidget.html',
	'css!../DiagramDesigner/DocumentDecorator.DiagramDesignerWidget.css',
	'css!./DocumentDecorator.PartBrowserWidget.css'
], function (CONSTANTS,
			 nodePropertyNames,
			 PartBrowserWidgetDecoratorBase,
			 DiagramDesignerWidgetConstants,
			 DocumentDecoratorDiagramDesignerWidgetTemplate) {

	'use strict';

	var DocumentDecoratorPartBrowserWidget,
		__parent__ = PartBrowserWidgetDecoratorBase,
		DECORATOR_ID = 'DocumentDecoratorPartBrowserWidget';

	DocumentDecoratorPartBrowserWidget = function (options) {
		var opts = _.extend({}, options);

		__parent__.apply(this, [opts]);

		this.logger.debug('DocumentDecoratorPartBrowserWidget ctor');
	};

	_.extend(DocumentDecoratorPartBrowserWidget.prototype, __parent__.prototype);
	DocumentDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

	/*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

	DocumentDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
		var el = $(DocumentDecoratorDiagramDesignerWidgetTemplate);
		//use the same HTML template as the DocumentDecorator.DiagramDesignerWidget
		//but remove the connector DOM elements since they are not needed in the PartBrowser
		el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
		return el;
	})();

	DocumentDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
		this.$el = this.$DOMBase.clone();

		//find name placeholder
		this.skinParts.$name = this.$el.find('.name');

		this._renderContent();
	};

	DocumentDecoratorPartBrowserWidget.prototype.afterAppend = function () {
	};

	DocumentDecoratorPartBrowserWidget.prototype._renderContent = function () {
		var client = this._control._client,
			nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

		//render GME-ID in the DOM, for debugging
		if (DEBUG) {
			this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});
		}

		if (nodeObj) {
			this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '');
		}
	};

	DocumentDecoratorPartBrowserWidget.prototype.update = function () {
		this._renderContent();
	};

	return DocumentDecoratorPartBrowserWidget;
});