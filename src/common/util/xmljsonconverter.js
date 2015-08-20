/*globals define*/
/*jshint node:true, browser: true*/

/**
 * Converter from XML to Json using sax parser. See the doc of constructor for info on how to use.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/util/sax'], function (sax) {
    'use strict';

    /**
     * XML2JSON converter, when instantiated invoke convert(xmlString) to get the corresponding JavaScript object.
     * @param {object} options - optional options.
     * @param {object} options.arrayElements - Dictionary where keys evaluated to true are treated as arrays in the
     *  generated javascript object. If not provided these will be inferred by number of occurrences of the elements.
     * @param {string} options.attrTag - will be prepended to attributes keys, default "@".
     * @param {string} options.textTag - the key values for text items, default "#text".
     * @param {boolean} options.skipWSText - if true then text made up of only white-space (including \n, \r, etc.)
     *  will not be generated as text-items in the javascript object, default false.
     * @constructor
     */
    var XML2JSON = function (options) {
        var self = this,
            opts = options || {},
            attrTag = opts.attrTag,
            textTag = opts.textTag || '#text',
            skipWS = opts.skipWSText;
        if (attrTag === undefined) {
            attrTag = '@';
        }
        self.rootNode = {};
        self.stack = [];
        self.nsStack = [];
        self.parser = sax.parser(true);
        // TODO make this configurable
        self.nsMap = {
            'http://www.w3.org/2001/XMLSchema-instance': 'xsi',
            'http://www.w3.org/2001/XMLSchema': 'xsd'
        };

        self.parser.ontext = function (text) {
            if (self.stack.length > 0) {
                if (skipWS) {
                    if (text.replace(/\s+?/g, '')) {
                        self.stack[self.stack.length - 1][textTag] = text;
                    }
                } else {
                    self.stack[self.stack.length - 1][textTag] = text;
                }
            }
        };

        function mapNamespace(ns, value) {
            var colon = value.indexOf(':');
            if (colon === -1) {
                return value;
            }
            var namespace = value.substr(0, colon);
            if (namespace in ns) {
                return (self.nsMap[ns[namespace]] || ns[namespace]) + ':' + value.substr(colon + 1);
            }
            return value;
        }
        self.parser.onopentag = function (node) {
            var key,
                i,
                parentNode,
                nodeName,
                jsonNode = {};

            var ns = {};
            for (key in node.attributes) {
                if (node.attributes.hasOwnProperty(key)) {
                    if (key.substr(0, 6) === 'xmlns:') {
                        ns[key.substr('xmlns:'.length)] = node.attributes[key];
                    }
                    if (key === 'xmlns') {
                        ns[''] = node.attributes.xmlns;
                    }
                }
            }
            if (Object.getOwnPropertyNames(ns).length === 0) {
                if (self.nsStack.length > 0) {
                    ns = self.nsStack[self.nsStack.length - 1];
                }
                self.nsStack.push(ns);
            } else {
                for (i = self.nsStack.length - 1; i >= 0; i--) {
                    for (key in self.nsStack[i]) {
                        if (!ns.hasOwnProperty(key) && self.nsStack[i].hasOwnProperty(key)) {
                            ns[key] = self.nsStack[i][key];
                        }
                    }
                }
                self.nsStack.push(ns);
            }
            nodeName = mapNamespace(ns, node.name);
            if (self.stack.length === 0) {
                self.rootNode[nodeName] = jsonNode;
            } else {
                parentNode = self.stack[self.stack.length - 1];
                if (opts.arrayElements) {
                    self.arrayElements = opts.arrayElements;
                    if (self.arrayElements[nodeName]) {
                        if (parentNode.hasOwnProperty(nodeName)) {
                            parentNode[nodeName].push(jsonNode);
                        } else {
                            parentNode[nodeName] = [jsonNode];
                        }
                    } else {
                        parentNode[nodeName] = jsonNode;
                    }
                } else {
                    if (parentNode.hasOwnProperty(nodeName)) {
                        if (parentNode[nodeName] instanceof Array) {
                            parentNode[nodeName].push(jsonNode);
                        } else {
                            parentNode[nodeName] = [parentNode[nodeName], jsonNode];
                        }
                    } else {
                        parentNode[nodeName] = jsonNode;
                    }
                }
            }
            self.stack.push(jsonNode);
            for (key in node.attributes) {
                if (node.attributes.hasOwnProperty(key)) {
                    var namespaceKey = mapNamespace(ns, key);
                    if (namespaceKey === 'xsi:type') {
                        // the attribute value should be mapped too
                        jsonNode[attrTag + namespaceKey] = mapNamespace(ns, node.attributes[key]);
                    } else {
                        jsonNode[attrTag + namespaceKey] = node.attributes[key];
                    }
                }
            }
        };

        self.parser.onclosetag = function (/*node*/) {
            self.stack.pop();
            self.nsStack.pop();
        };

        self.parser.onerror = function (error) {
            self.rootNode = error;
            self.parser.error = null;
        };
    };

    /**
     * Converts the xml in the given string to a javascript object. For bigger xmls use convertFromBuffer instead.
     * @param {string} xmlString - xml string representation to convert.
     * @returns {object|Error} - Javascript object inferred from the xml, Error object if failed.
     */
    XML2JSON.prototype.convertFromString = function (xmlString) {
        this.rootNode = {};
        this.stack = [];
        this.parser.write(xmlString).close();
        return this.rootNode;
    };

    /**
     * Converts the xml to a javascript object (JSON).
     * @param xmlBuffer {ArrayBuffer} - xml to convert.
     * @param options {object} - optional options.
     * @param options.segmentSize {int} - length of string segments, default 10000.
     * @param options.encoding {function(new:TypedArray)} - encoding of the ArrayBuffer, default Uint8Array.
     * @returns {object|Error} - Javascript object inferred from the xml, Error object if failed.
     */
    XML2JSON.prototype.convertFromBuffer = function (xmlBuffer, options) {
        var opts = options || {},
            segmentSize = opts.segmentSize || 10000,
            Encode = opts.encoding || Uint8Array,
            data = new Encode(xmlBuffer),
            dataSegment,
            nbrOfIterations = Math.ceil(data.length / segmentSize),
            startIndex = 0,
            i;
        this.rootNode = {};
        this.stack = [];
        for (i = 0; i < nbrOfIterations; i += 1) {
            dataSegment = data.subarray(startIndex, startIndex + segmentSize);
            startIndex += segmentSize;
            if (i < nbrOfIterations - 1) {
                this.parser.write(String.fromCharCode.apply(null, dataSegment));
            } else {
                this.parser.write(String.fromCharCode.apply(null, dataSegment)).close();
            }
        }
        return this.rootNode;
    };

    /**
     * XML2JSON converter, when instantiated invoke convert(xmlString) to get the corresponding JavaScript object.
     * @param {object} options - optional options.
     * @param {string} options.attrTag - keys with this will be treated as attributes, default "@".
     * @param {string} options.textTag - the key values for text items, default "#text".
     * @param {string} options.xmlDeclaration - the xmlDeclaration, default "<?xml version="1.0"?>".
     * @constructor
     */
    var JSON2XML = function (options) {
        var opts = options || {},
            attrTag = opts.attrTag,
            textTag = opts.textTag || '#text',
            xmlDeclaration = opts.xmlDeclaration || '<?xml version="1.0"?>';
        if (attrTag === undefined) {
            attrTag = '@';
        }
        this.attrTag = attrTag;
        this.attrTagIndex = this.attrTag.length;
        this.textTag = textTag;
        this.xmlDeclaration = xmlDeclaration;
    };

    JSON2XML.prototype._convertToStringRec = function (key, value) {
        var subKeys,
            elemTag = '',
            i,
            content = '';
        if (value instanceof Array) {
            for (i = 0; i < value.length; i += 1) {
                content += this._convertToStringRec(key, value[i]);
            }
            return content;
        }
        if (value instanceof Object) {
            subKeys = Object.keys(value);
            for (i = 0; i < subKeys.length; i += 1) {
                if (value[subKeys[i]] instanceof Object) {
                    content += this._convertToStringRec(subKeys[i], value[subKeys[i]]);
                } else {
                    if (subKeys[i].slice(0, this.attrTag.length) === this.attrTag) {
                        if (value[subKeys[i]] === null) {
                            elemTag += ' ' + subKeys[i].substr(this.attrTagIndex) + '=""';
                        } else {
                            elemTag += ' ' + subKeys[i].substr(this.attrTagIndex) + '="' +
                                value[subKeys[i]].toString() + '"';
                        }
                    } else if (subKeys[i] === this.textTag) {
                        content += value[subKeys[i]].toString();
                    } else {
                        content += this._convertToStringRec(subKeys[i], value[subKeys[i]]);
                    }
                }
            }
        } else if (value) {
            content += '<' + value.toString() + '></' + value.toString() + '>';
        }

        if (content) {
            return '<' + key + elemTag + '>' + content + '</' + key + '>';
        }

        return '<' + key + elemTag + '/>';
    };

    JSON2XML.prototype.convertToString = function (jsonObj) {
        var keys = Object.keys(jsonObj),
            i;
        this.xml = this.xmlDeclaration;
        for (i = 0; i < keys.length; i += 1) {
            this.xml += this._convertToStringRec(keys[i], jsonObj[keys[i]]);
        }
        return this.xml;
    };

    return {
        Xml2json: XML2JSON,
        Json2xml: JSON2XML,

        JsonToXml: JSON2XML,
        XmlToJson: XML2JSON
    };
});