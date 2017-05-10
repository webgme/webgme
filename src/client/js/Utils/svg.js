/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/ejs'], function (ejs) {
    'use strict';

    var def = '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><!-- Created with Method Draw - http://github.com/duopixel/Method-Draw/ --><g><title>background</title><rect fill="#fff" id="canvas_background" height="22" width="22" y="-1" x="-1"/><g display="none" overflow="visible" y="0" x="0" height="100%" width="100%" id="canvasGrid"><rect fill="url(#gridpattern)" stroke-width="0" y="0" x="0" height="100%" width="100%"/></g></g><g><title>Layer 1</title><ellipse ry="49" rx="43.5" id="svg_1" cy="104" cx="119" stroke-width="1.5" stroke="#000" fill="#fff"/><text xml:space="preserve" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="24" id="svg_2" y="260" x="309.5" stroke-width="0" stroke="#000" fill="#000000">Hello World</text> <text font-weight="bold" xml:space="preserve" text-anchor="start" font-family="\'Courier New\', Courier, monospace" font-size="12" id="svg_3" y="13" x="4" stroke-width="0" stroke="#000" fill="#000000"><%=getAttribute("name")%></text></g></svg>';

    function uri(clientNodeObj, registryId) {
        var raw = clientNodeObj.getEditableRegistry(registryId) || '',
            rendered = ejs.render(def, clientNodeObj),
            xml = /*(new XMLSerializer()).serializeToString(rendered)*/ rendered,
            encoded = "data:image/svg+xml;base64," + window.btoa(xml);

            console.log(rendered);
        return encoded;
    }

    function content(clientNodeObj, registryId) {
        return null;
    }

    return {
        getSvgUri: uri,
        getSvgContent: content
    };
});
