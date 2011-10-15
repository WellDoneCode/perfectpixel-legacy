/// <reference path="vs/chrome_extensions.js" />

var PPFile = function () {
//    if (!(fileEntry instanceof File))
//            alert("Object of type File should be provided to PPFile constructor");

    this.ArrayBuffer = null;
    this.Name = null;
    this.MimeType = null;
    this.Date = null;

    this.ToBlob = function () {
        var bb = new window.WebKitBlobBuilder();
        bb.append(this.ArrayBuffer);
        var blob = bb.getBlob(this.MimeType);
        return blob;
    }
};

// Must be used only in context of Extension (no content script!)
var PPFileManager = new function () {

    this.fs = null;

    // ------------------------
    // Initialize PPFileManager
    // ------------------------
    this.Init = function()
    {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.PERSISTENT, 50 * 1024 * 1024 /*50MB*/, function (filesystem) {
            console.log('Opened file system: ' + fs.name);
            PPFileManager.fs = filesystem;
        }, PPFileManager.errorHandler);
    }

    // ------------------------------------------
    // Read file from filesystem. Returns PPFile object to callback function
    // ------------------------------------------
    this.GetFile = function (fileName, callback) {
        fs.root.getFile(fileName, {}, function (fileEntry) {

            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function (file) {

                var reader = new FileReader();
                reader.onerror = PPFileManager.errorHandler;
                reader.onloadend = function (e) {

                    var ppFile = new PPFile();
                    ppFile.ArrayBuffer = e.result;
                    PPFile.Name = file.name;
                    PPFile.MimeType = file.type;
                    PPFile.Date = file.lastModifiedDate;

                    callback(ppFile);
                };

                reader.readAsArrayBuffer(file);

            }, PPFileManager.errorHandler);

        }, PPFileManager.errorHandler);
    }

    // ------------------------------------------
    // Save file to filesystem. Accepts PPFile object
    // ------------------------------------------
    this.SaveFile = function (ppFile, callback) {
        //var newFileName = Math.floor(Math.random() * 100000000000000) + '_' + ppFile.Name;
        var file = ppFile.ToBlob();

        (function (f) {
            filesystem.root.getFile(ppFile.Name, { create: true, exclusive: true }, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function () {
                        ppFile.Date = fileEntry.lastModifiedDate;
                        callback(ppFile);
                    }

                    fileWriter.write(f); // Note: write() can take a File or Blob object.

                }, errorHandler);
            }, errorHandler);
        })(file);
    }

    // ------------------------------------------
    // Delete file from filesystem
    // ------------------------------------------
    this.DeleteFile = function (fileName, callback) {
        fs.root.getFile(fileName, { create: false }, function (fileEntry) {

            fileEntry.remove(function () {
                console.log('File removed.');
                callback();
            }, PPFileManager.errorHandler);

        }, PPFileManager.errorHandler);
    }


    // Alpha version. For test purposes only
    // TODO return array of PPFile objects
    this.GetAllFiles = function (callback) {
        var dirReader = this.fs.root.createReader();
        dirReader.readEntries(function (entries) {
            callback(entries);
        }, PPFileManager.errorHandler);
    }

    // Alpha version. For test purposes only
    // TODO add callback
    this.DeleteAllFiles = function () {
        var dirReader = this.fs.root.createReader();
        dirReader.readEntries(function (entries) {
            for (var i = 0, entry; entry = entries[i]; ++i) {
                entry.remove(function () {
                    console.log('File removed.');
                }, PPFileManager.errorHandler);
            }
        }, PPFileManager.errorHandler);
    };


    this.errorHandler = function (e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

        console.log('PPFileManager error: ' + msg);
        alert('PPFileManager error: ' + msg);
    }
};