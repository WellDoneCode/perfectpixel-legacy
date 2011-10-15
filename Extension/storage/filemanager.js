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
var PPFileManagerClass = function () {

    this.fs = null;

    // ------------------------
    // Initialize PPFileManager
    // ------------------------
    this.Init = function (callback) {
        if (this.fs) {
            callback();
        }
        else {
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            window.requestFileSystem(window.PERSISTENT, 50 * 1024 * 1024 /*50MB*/, function (filesystem) {
                console.log('Opened file system: ' + filesystem.name);
                PPFileManager.fs = filesystem;
                callback();
            }, PPFileManager.errorHandler);
        }
    }

    // ------------------------------------------
    // Read file from filesystem. Returns PPFile object to callback function
    // ------------------------------------------
    this.GetFile = function (fileName, callback) {
        this.fs.root.getFile(fileName, {}, function (fileEntry) {

            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function (file) {

                var reader = new FileReader();
                reader.onerror = PPFileManager.errorHandler;
                reader.onloadend = function (e) {

                    var ppFile = new PPFile();
                    ppFile.ArrayBuffer = this.result;
                    ppFile.Name = file.name;
                    ppFile.MimeType = file.type;
                    ppFile.Date = file.lastModifiedDate;

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
        var newFileName = Math.floor(Math.random() * 100000000000000) + '_' + ppFile.Name;
        var file = ppFile.ToBlob();

        this.fs.root.getFile(newFileName, { create: true }, function (fileEntry) {
            console.log('SaveFile file created');

            fileEntry.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function () {
                    console.log('SaveFile data written');
                    ppFile.Name = newFileName;
                    ppFile.Date = fileEntry.lastModifiedDate;
                    callback(ppFile);
                }

                fileWriter.write(file); // Note: write() can take a File or Blob object.

            }, PPFileManager.errorHandler);
        }, PPFileManager.errorHandler);
    }

    // ------------------------------------------
    // Delete file from filesystem
    // ------------------------------------------
    this.DeleteFile = function (fileName, callback) {
        this.fs.root.getFile(fileName, { create: false }, function (fileEntry) {

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
            if (entries.length == 0)
                console.log('No files to remove.');

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

var PPFileManager = new PPFileManagerClass();