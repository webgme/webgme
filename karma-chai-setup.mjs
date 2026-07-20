/**
 * Chai 5+ is ESM-only and no longer ships a browser UMD build (chai.js).
 * Load chai as a module and expose the globals karma-chai previously provided.
 */
import * as chai from './node_modules/chai/index.js';

window.chai = chai;
window.expect = chai.expect;
window.assert = chai.assert;
window.should = chai.should();
