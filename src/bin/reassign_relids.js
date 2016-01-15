/* jshint node:true */
/**
 * This tool can re-assign relids of an exported project. It keeps every other information intact.
 * This tool is advised to be used if someone has an old large project, as the reassigned relids
 * will be as short as possible, making the objects in the project smaller (especially the root object).
 *
 * @module Bin:ReassignRelids
 * @author kecso / https://github.com/kecso
 */

'use strict';

var webgme = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    random = webgme.requirejs('common/util/random'),
    REGEXP = webgme.requirejs('common/regexp'),
    Q = require('q'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    logger = webgme.Logger.create('gme:bin:reassign', gmeConfig.bin.log),
    main;

/**
 * Entrypoint for CLI usage
 *
 * @param {Array<String>} argv
 * @return {undefined}
 */
main = function (argv) {
    var mainDeferred = Q.defer(),
        Command = require('commander').Command,
        program = new Command(),
        outputPath,
        params,
        finishUp = function (error) {
            var ended = function () {
                if (error) {
                    mainDeferred.reject(error);
                    return;
                }
                mainDeferred.resolve();
            };

            if (gmeAuth) {
                gmeAuth.unload();
            }
            if (cliStorage) {
                cliStorage.closeDatabase()
                    .then(ended)
                    .catch(function (err) {
                        logger.error(err);
                        ended();
                    });
            } else {
                ended();
            }
        };

    program
        .version('0.1.0')
        .usage('<project-file> [options]')
        .option('-o, --output [string]', 'the output file [by default, the input is overwritten]')
        .parse(argv);

    outputPath = program.output || program.args[0];

    Q.nfcall(function () {
            logger.info('loading input');
            var jsonProject = JSON.parse(FS.readFileSync(program.args[0], 'utf-8')),
                deferred = Q.defer(),
                oldToNewRelid = {'1': '1'},
                i,
                keys,
                containmentBasedRelidGeneration = function (containmentObject) {
                    var relidObject = {},
                        keys = Object.keys(containmentObject),
                        needNew = [],
                        relid,
                        i;

                    //first assign those that have already a new value
                    for (i = 0; i < keys.length; i += 1) {
                        if (jsonProject.relids[keys[i]] && oldToNewRelid[jsonProject.relids[keys[i]]]) {
                            relidObject[jsonProject.relids[keys[i]]] = true;
                        } else {
                            needNew.push(keys[i]);
                        }
                    }

                    //now generate relids for those that do not already have and register them
                    for (i = 0; i < needNew.length; i += 1) {
                        relid = random.generateRelid(relidObject);
                        relidObject[relid] = true;
                        oldToNewRelid[jsonProject.relids[needNew[i]]] = relid;
                    }

                    //and we should recursively visit all children
                    for (i = 0; i < keys.length; i += 1) {
                        containmentBasedRelidGeneration(containmentObject[keys[i]]);
                    }
                },
                getConvertedStringField = function (stringField) {
                    var fieldArray = stringField.split('@'),
                        resultField = stringField,
                        i;

                    if (fieldArray.length === 2 && REGEXP.GUID.test(fieldArray[0]) === true) {
                        resultField = fieldArray[0] + '@';
                        fieldArray = fieldArray[1].split('/');

                        fieldArray.shift();
                        for (i = 0; i < fieldArray.length; i += 1) {
                            resultField += '/' + oldToNewRelid[fieldArray[i]];
                        }
                    }

                    return resultField;
                },
                nodeCompositeIdUpdate = function (jsonNode) {
                    var keys = Object.keys(jsonNode || {}),
                        i;

                    for (i = 0; i < keys.length; i += 1) {
                        if (typeof jsonNode[keys[i]] === 'string') {
                            jsonNode[keys[i]] = getConvertedStringField(jsonNode[keys[i]]);
                        } else if (typeof jsonNode[keys[i]] === 'object' && jsonNode[keys[i]] !== null) {
                            nodeCompositeIdUpdate(jsonNode[keys[i]]);
                        }
                    }
                };

            logger.info('converting input');
            containmentBasedRelidGeneration(jsonProject.containment);

            //now we filled up the conversion lookup table, we just have to make the conversion
            //first we convert the relids
            keys = Object.keys(jsonProject.relids);
            for (i = 0; i < keys.length; i += 1) {
                jsonProject.relids[keys[i]] = oldToNewRelid[jsonProject.relids[keys[i]]];
            }

            //then we look for compositeIds and convert the relative path portion
            keys = Object.keys(jsonProject.nodes);
            for (i = 0; i < keys.length; i += 1) {
                nodeCompositeIdUpdate(jsonProject.nodes[keys[i]]);
            }

            logger.info('saving output');
            //save the result
            FS.writeFileSync(outputPath, JSON.stringify(jsonProject, null, 2));

            logger.debug('relid conversion table', oldToNewRelid);

            finishUp(null);
        })
        .catch(finishUp);

    return mainDeferred.promise;
};

module.exports = {
    main: main
};

if (require.main === module) {
    main(process.argv)
        .then(function () {
            console.log('Done');
            process.exit(0);
        })
        .catch(function (err) {
            console.error(err);
            process.exit(1);
        });
}
