/**
 * @author kecso / https://github.com/kecso
 */

/**
 * @description The Client class represents the Client API which is the way to communicate
 * with your project from your user-defined UI pieces. It allows project selection, project tracking,
 * model interpretation and model manipulation.
 * !!! Documentation of the class is incomplete !!!
 * For a better understanding of what functionality it can provide, you can check the [Core]{@link Core}
 * documentation as much of the functions of this class are aligned with those functions.
 *
 * @class Client
 *
 * @param {GmeConfig} gmeConfig - the main configuration of the WebGME that holds information
 * about the server and other options.
 */

/**
 * @description Returns the [GMENode]{@link GMENode} of the given node if it has been loaded.
 * @function getNode
 * @memberOf Client
 * @instance
 *
 * @param {string} path - the path of the node in question.
 *
 * @return {(GMENode|null)} If the node is loaded it will be returned, otherwise null.
 */