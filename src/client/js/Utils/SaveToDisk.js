/*globals define*/
/*jshint node: true, browser: true, bitwise: false*/

/**
 * @author kecso / https://github.com/kecso
 */
define(['blob/BlobClient'], function (BlobClient) {
    'use strict';

    function saveUrlToDisk(fileURL, fileName) {
        // for non-IE
        if (!window.ActiveXObject) {
            var save = document.createElement('a'),
                event = document.createEvent('Event');

            save.href = fileURL;
            save.target = '_self';

            if (fileName) {
                save.download = fileName;
            }

            // event.initEvent('click', true, true);
            // save.dispatchEvent(event);
            // (window.URL || window.webkitURL).revokeObjectURL(save.href);
            save.click();
        }

        // for IE
        else if (!!window.ActiveXObject && document.execCommand) {
            var _window = window.open(fileURL, '_self');
            _window.document.close();
            _window.document.execCommand('SaveAs', true, fileName || fileURL);
            _window.close();
        }
    }

    function downloadTextAsFile(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    function saveJsonToBlobStorage(fileName, data, logger, callback) {
        var bc = new BlobClient({logger: logger}),
            artifact = bc.createArtifact('uploaded');

        artifact.addFile(fileName, JSON.stringify(data, null, 4), function (err, fileHash) {
            callback(err, bc.getDownloadURL(fileHash));
        });
    }

    function saveJsonToDisk(fileName, data, logger, callback) {
        saveJsonToBlobStorage(fileName, data, logger, function (err, downloadUrl) {
            if (err) {
                return callback(err);
            }

            saveUrlToDisk(downloadUrl, fileName);
            callback(null, downloadUrl);
        });
    }

    return {
        saveToBlobStorage: saveJsonToBlobStorage,
        saveUrlToDisk: saveUrlToDisk,
        saveJsonToDisk: saveJsonToDisk,
        downloadTextAsFile: downloadTextAsFile
    };
});