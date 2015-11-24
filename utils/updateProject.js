/**
 * @author kecso / https://github.com/kecso
 */
var FS = require('fs'),
    requirejs = require('requirejs'),
    Random = requirejs('../src/common/util/random'),
    random = new Random(),
    relidTable = {},
    inputProject = JSON.parse(FS.readFileSync(process.argv[2], 'utf8')),
    i,
    newRelids = [],
    newRelid,
    relids = inputProject.relids || {},
    guids = Object.keys(relids);

//console.log(guids.length);
//for (i = 0; i < guids.length; i += 1) {
//    console.log(guids[i], relids[guids[i]]);
//    if (relidTable[relids[guids[i]]]) {
//        relids[guids[i]] = relidTable[relids[guids[i]]];
//    } else {
//        //do {
//        newRelid = random.generateRelid();
//        //} while (!newRelid);
//        relids[guids[i]] = newRelid;
//        relidTable[relids[guids[i]]] = newRelid;
//        newRelid = null;
//    }
//    console.log(guids[i], relidTable[relids[guids[i]]]);
//}
function convertByContainment(containmentObject) {
    var keys = Object.keys(containmentObject || {}),
        i,
        relid,
        dataObject = {};

    //precheck if some already has a new/valid relid
    for (i = keys.length - 1; i >= 0; i -= 1) {
        if (relids[keys[i]] + '' === '1') {
            dataObject['1'] = {};
            keys.splice(i, 1);
        }
        else if (relidTable[relids[keys[i]]]) {
            dataObject[relidTable[relids[keys[i]]]] = {};
            relids[keys[i]] = relidTable[relids[keys[i]]];
            keys.splice(i, 1);
        }
    }

    //and the generation
    for (i = 0; i < keys.length; i += 1) {
        relid = random.generateRelid(dataObject);
        relidTable[relids[keys[i]]] = relid;
        relids[keys[i]] = relid;
        dataObject[relid] = {};

    }

    //and now the recursion
    keys = Object.keys(containmentObject);
    for (i = 0; i < keys.length; i += 1) {
        convertByContainment(containmentObject[keys[i]]);
    }
}

//console.log(inputProject.relids);
convertByContainment(inputProject.containment);
FS.writeFileSync('converted.json', JSON.stringify(inputProject, null, 2));