/*globals define, WebGMEGlobal, alert, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
        'js/Utils/DisplayFormat',
        'js/Constants',
        'css!./styles/PointerWidget.css'],

    function (WidgetBase,
              displayFormat,
              CONSTANTS) {

        "use strict";

        var PointerWidget;

        PointerWidget = function (propertyDesc) {
            WidgetBase.call(this, propertyDesc);

            var self = this;

            this._client = propertyDesc.client;

            this._div = $('<div/>', {'class': 'ptr-widget'});
            this.el.append(this._div);

            this.__label = $('<span/>', {'class': 'user-select-on'});
            this._div.append(this.__label);


            this.__iconFollowPointer = $('<i/>', {class: 'glyphicon glyphicon-share'});
            this.__iconFollowPointer.attr('title', 'Follow pointer');
            this._div.append(this.__iconFollowPointer);

            this.__iconFollowPointer.on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();

                self._followPointer();
            });

            this.updateDisplay();
        };

        _.extend(PointerWidget.prototype, WidgetBase.prototype);

        PointerWidget.prototype.setReadOnly = function (isReadOnly) {
            WidgetBase.prototype.setReadOnly.call(this, isReadOnly);
        };

        PointerWidget.prototype.updateDisplay = function () {
            var ptrTo = this.propertyValue,
                self = this,
                patterns;

            this._updatePointerName();

            this.__iconFollowPointer.detach();
            if (ptrTo) {
                this._div.append(this.__iconFollowPointer);

                this._removeTerritory();

                this._territoryId = this._client.addUI(this, function (/*events*/) {
                    self._updatePointerName();
                });

                patterns = {};
                patterns[ptrTo] = { "children": 0 };
                this._client.updateTerritory(this._territoryId, patterns);
            }

            return WidgetBase.prototype.updateDisplay.call(this);
        };

        PointerWidget.prototype.destroy = function () {
            this._removeTerritory();
        };

        PointerWidget.prototype._removeTerritory = function () {
            if (this._territoryId) {
                this._client.removeUI(this._territoryId);
            }
        };

        PointerWidget.prototype._updatePointerName = function () {
            var ptrTo = this.propertyValue,
                ptrToObj;

            if (ptrTo) {
                ptrToObj = this._client.getNode(ptrTo);
                if (ptrToObj) {
                    ptrTo = displayFormat.resolve(ptrToObj) + ' (' + ptrTo + ')';
                }
            }

            this.__label.text(ptrTo);
            this.__label.attr('title', ptrTo);
        };

        PointerWidget.prototype._followPointer = function () {
            var ptrTo = this.propertyValue,
                _client = this._client,
                targetNodeObj;

            if (ptrTo) {
                targetNodeObj = _client.getNode(ptrTo);
                if (targetNodeObj) {
                    if (targetNodeObj.getParentId() || targetNodeObj.getParentId() === CONSTANTS.PROJECT_ROOT_ID) {
                        WebGMEGlobal.State.registerActiveObject(targetNodeObj.getParentId());
                        WebGMEGlobal.State.registerActiveSelection([ptrTo]);
                    } else {
                        WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
                        WebGMEGlobal.State.registerActiveSelection([ptrTo]);
                    }
                }
            }
        };

        return PointerWidget;

    });
