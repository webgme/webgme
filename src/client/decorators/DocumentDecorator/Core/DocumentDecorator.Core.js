/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/RegistryKeys',
    'js/Constants',
], function (REGISTRY_KEYS, CONSTANTS) {

    'use strict';

    function DocumentDecoratorCore() {

    }

    DocumentDecoratorCore.prototype._updateColors = function (skipBorder) {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.textColor) {
            this.$el.css({color: this.textColor});
        } else {
            this.$el.css({color: ''});
        }

        if (skipBorder) {
            return;
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
    };

    DocumentDecoratorCore.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];
        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, true);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, true);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, true);
    };

    return DocumentDecoratorCore;
});