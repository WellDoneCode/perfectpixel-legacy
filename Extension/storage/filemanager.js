/*
 * Copyright 2011-2012 Alex Belozerov, Ilya Stepanov
 * 
 * This file is part of PerfectPixel.
 *
 * PerfectPixel is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * PerfectPixel is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.
 */

/// <reference path="../vs/chrome_extensions.js" />
/// <reference path="../vs/webkit_console.js" />

var PPFile = function () {
    this.ArrayBuffer = null;
    this.Name = null;
    this.MimeType = null;
    this.Date = null;

    this.ToBlob = function () {
        var dataView = new DataView(this.ArrayBuffer);
        return new Blob([dataView],{type: this.MimeType});
    }
};

/**
 * PPFileManager - local filesystem management
 * Must be used only in context of Extension (no content script!)
 */
var PPFileManager = new function () {

    this.fs = null;

    /**
     * Initialize PPFileManager
     * @param callback
     * @constructor
     */
    this.Init = function (callback) {
        if (this.fs) {
            callback();
        }
        else {
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            window.requestFileSystem(window.PERSISTENT, 500 * 1024 * 1024 /*500MB*/, function (filesystem) {
                console.log('PP Opened file system: ' + filesystem.name);
                PPFileManager.fs = filesystem;
                callback();
            }, function (e) {
                PPFileManager._errorHandler(e);
                callback(PPFileManager._generateFileSystemErrorMsg());
            });
        }
    }

    // TODO delete
    /*this.GetFiles = function(fileNames, callback) {
        var files = [];

        for(var i=0; i<fileNames.length; i++) {
            var index = i;
            this.GetFile(fileNames[index], function(file) {
                files[index] = file;
                if(files.length == fileNames.length) {
                    // all async events done
                    callback(files);
                }
            })
        }
    }*/

    /**
     * Read file from filesystem. Returns PPFile object to callback function
     * @param fileName
     * @param callback
     * @constructor
     */
    this.GetFile = function (fileName, callback) {
        if (!this.fs) {
            console.log('PP Filesystem is not initialized');
            callback(PPFileManager._generateFileSystemErrorMsg());
            return;
        }

        this.fs.root.getFile(fileName, {}, function (fileEntry) {

            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function (file) {

                var reader = new FileReader();
                reader.onerror = function (e) { PPFileManager._errorHandler(e); callback(); };
                reader.onloadend = function (e) {

                    var ppFile = new PPFile();
                    ppFile.ArrayBuffer = this.result;
                    ppFile.Name = file.name;
                    ppFile.MimeType = file.type;
                    ppFile.Date = file.lastModifiedDate;

                    callback(ppFile);
                };

                reader.readAsArrayBuffer(file);

            }, function (e) { PPFileManager._errorHandler(e); callback(); });

        }, function (e) { PPFileManager._errorHandler(e); callback(); });
    }

    /**
     * Save file to filesystem. Accepts PPFile object
     * @param ppFile
     * @param callback
     * @constructor
     */
    this.SaveFile = function (ppFile, callback) {
        if (!this.fs) {
            console.log('PP Filesystem is not initialized');
            callback(PPFileManager._generateFileSystemErrorMsg());
            return;
        }

        var newFileName = Math.floor(Math.random() * 100000000000000) + '_' + ppFile.Name;
        var file = ppFile.ToBlob();

        this.fs.root.getFile(newFileName, { create: true }, function (fileEntry) {
            console.log('PP file created');

            fileEntry.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function () {
                    console.log('PP data written');
                    ppFile.Name = newFileName;
                    ppFile.Date = fileEntry.lastModifiedDate;
                    callback(ppFile);
                }

                fileWriter.write(file); // Note: write() can take a File or Blob object.

            }, function (e) { PPFileManager._errorHandler(e); callback(); });
        }, function (e) { PPFileManager._errorHandler(e); callback(); });
    }

    /**
     * Delete file from filesystem
     * @param fileName
     * @param callback
     * @constructor
     */
    this.DeleteFile = function (fileName, callback) {
        if (!this.fs) {
            console.log('PP Filesystem is not initialized');
            callback(PPFileManager._generateFileSystemErrorMsg());
            return;
        }

        this.fs.root.getFile(fileName, { create: false }, function (fileEntry) {

            fileEntry.remove(function () {
                console.log('PP File removed');
                callback();
            }, function (e) { PPFileManager._errorHandler(e); callback(); });

        }, function (e) { PPFileManager._errorHandler(e); callback(); });
    }

    /**
     * Delete multiple files from filesystem
     * @param fileNames
     * @param callback
     * @constructor
     */
    this.DeleteFiles = function(fileNames, callback) {
        var files = [];
        var magicNumber = 100500;
        if(!$.isArray(fileNames))
            fileNames = [fileNames];

        for(var i=0; i<fileNames.length; i++) {
            var index = i;
            this.DeleteFile(fileNames[index], function() {
                files.push(magicNumber);
                if(files.length == fileNames.length) {
                    // all async events done
                    callback();
                }
            })
        }
    }


    // Alpha version. For test purposes only
    // TODO return array of PPFile objects
    this._GetAllFiles = function (callback) {
        var dirReader = this.fs.root.createReader();
        dirReader.readEntries(function (entries) {
            callback(entries);
        }, function (e) { PPFileManager._errorHandler(e); callback(); });
    }

    // Alpha version. For test purposes only
    // TODO add callback
    this._DeleteAllFiles = function () {
        var dirReader = this.fs.root.createReader();
        dirReader.readEntries(function (entries) {
            if (entries.length == 0)
                console.log('PP No files to remove');

            for (var i = 0, entry; entry = entries[i]; ++i) {
                entry.remove(function () {
                    console.log('PP File removed');
                }, PPFileManager._errorHandler);
            }
        }, PPFileManager._errorHandler);
    };

    // Errors handling
    this._errorHandler = function (e) {
        var msg = PPFileManager._getFileErrorMsg(e);
        console.log('PPFileManager error: ' + msg);
    };

    this._getFileErrorMsg = function (e) {
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
        }
        return msg;
    };

    this._generateFileSystemErrorMsg = function () {
        return { showToUser: true, message: 'ERROR: Cannot open filesystem.\r\nPlease use Storage compatibility mode in options.\r\n\r\nPossible reason: user\'s profile directory path contains non-latin characters (http://code.google.com/p/chromium/issues/detail?id=94314)' };
    }
};