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

// Depend on pp-shared.js (PPOverlay class)
// Depend on imagetools.js

/**
 * PPStogare - place where images are stored permanently. Static object
 * @constructor
 */
var PPStorage_filesystem = function () {

    this._cacheOverlaysBlobUrls = [];

    /**
     * Get all PPOverlays from storage
     * for available options see this.GetOverlay
     * @param callback
     * @param options
     * @constructor
     */
    this.GetOverlays = function (callback, options) {
        var overlaysCount = this.GetOverlaysCount();
        var overlays = [];

        if (overlaysCount == 0)
            callback(overlays);
        var self = this;
        this._GetOverlaysRecursion(0, self, overlays, overlaysCount, callback, options);
    }

    this._GetOverlaysRecursion = function (index, self, overlaysArray, overlaysCount, finalCallback, options) {
        this.GetOverlay(index, function (overlay) {
            overlaysArray[index] = overlay;
            if ((index + 1) == overlaysCount)
                finalCallback(overlaysArray);
            else
                self._GetOverlaysRecursion(index + 1, self, overlaysArray, overlaysCount, finalCallback, options);
        }, options);
    }

    /**
     * Get PPOverlay object from storage
     * options available:
     * {
     *  getThumbnailUrl: false
     * }
     * @param id
     * @param callback
     * @param options
     * @return {*}
     * @constructor
     */
    this.GetOverlay = function (id, callback, options) {
        options = options || {};

        var overlayDataAsStr = localStorage["overlay" + id + "_data"];
        var overlayPositionAsStr = localStorage["overlay" + id + "_position"];
        if (overlayDataAsStr == null || overlayPositionAsStr == null)
            return null;
        var overlayData = JSON.parse(overlayDataAsStr);
        var overlayPosition = JSON.parse(overlayPositionAsStr);

        var overlay = new PPOverlay();
        overlay.Id = id;
        overlay.Width = overlayData.Width;
        overlay.Height = overlayData.Height;
        overlay.FileName = overlayData.FileName;
        overlay.ThumbnailFileName = overlayData.ThumbnailFileName;
        overlay.X = overlayPosition.X;
        overlay.Y = overlayPosition.Y;
        overlay.Opacity = overlayPosition.Opacity;
        overlay.Scale = overlayPosition.Scale;
        if (! overlay.Scale) overlay.Scale = 1.0; // for old images

        var targetFileName = !options.getThumbnailUrl ? overlay.FileName : overlay.ThumbnailFileName;
        if(!targetFileName || targetFileName === undefined) // for old images without thumbnails
            targetFileName = overlay.FileName;

        // Lookup in cache for blob Url
        if (this._cacheOverlaysBlobUrls[targetFileName]) {

            if(!options.getThumbnailUrl)
                overlay.Url = this._cacheOverlaysBlobUrls[targetFileName];
            else
                overlay.ThumbnailUrl = this._cacheOverlaysBlobUrls[targetFileName];
            callback(overlay);
        }
        else {
            console.log("PP Get file operation");
            var self = this;
            chrome.extension.sendRequest(
            {
                type: PP_RequestType.GETFILE,
                fileName: targetFileName
            },
            function (response) {
                self._handleResponse(response);
                if (response.status == "OK") {
                    var dataView = new DataView(stringToBuffer(response.arrayBuffer));
                    var blob = new Blob([dataView],{type:response.fileType});
                    var url = PPImageTools.createBlobUrl(blob);

                    if(!options.getThumbnailUrl)
                        overlay.Url = url;
                    else
                        overlay.ThumbnailUrl = url;
                    self._cacheOverlaysBlobUrls[targetFileName] = url;
                }

                callback(overlay);
            });
        }
    };

    /**
     * Save overlay position into storage
     * @param overlayId
     * @param newPosition
     * @constructor
     */
    this.UpdateOverlayPosition = function (overlayId, newPosition) {
        localStorage["overlay" + overlayId + "_position"] = JSON.stringify(newPosition);
    }

    /**
     * Delete overlay from storage
     * @param overlayId
     * @param callback
     * @constructor
     */
    this.DeleteOverlay = function (overlayId, callback) {
        var overlaysCount = this.GetOverlaysCount();
        var overlayDataAsStr = localStorage["overlay" + overlayId + "_data"];
        var overlayData = JSON.parse(overlayDataAsStr);

        // Delete physical files
        console.log("PP Delete files operation");
        var self = this;
        var filesToDelete = [overlayData.FileName];
        if(overlayData.ThumbnailFileName && overlayData.ThumbnailFileName !== undefined)
            filesToDelete.push(overlayData.ThumbnailFileName);

        chrome.extension.sendRequest(
        {
            type: PP_RequestType.DELETEFILE,
            fileName: filesToDelete
        },
        function (response) {
            self._handleResponse(response);

            if (response.status == "OK") {
                for (var i = overlayId; i < overlaysCount - 1; i++) {
                    // use temp variables to prevent QUOTA_EXCEEDED_ERR during copy
                    var dataToCopy = localStorage["overlay" + (i + 1) + "_data"];
                    var positionToCopy = localStorage["overlay" + (i + 1) + "_position"];

                    localStorage.removeItem("overlay" + (i + 1) + "_data");
                    localStorage.removeItem("overlay" + (i + 1) + "_position");

                    localStorage["overlay" + i + "_data"] = dataToCopy;
                    localStorage["overlay" + i + "_position"] = positionToCopy;
                }

                localStorage.removeItem("overlay" + (overlaysCount - 1) + "_data");
                localStorage.removeItem("overlay" + (overlaysCount - 1) + "_position");

                var blobUrl = self._cacheOverlaysBlobUrls[overlayData.FileName];
                var thumbBlobUrl = self._cacheOverlaysBlobUrls[overlayData.ThumbnailFileName];
                PPImageTools.revokeBlobUrl(blobUrl);
                PPImageTools.revokeBlobUrl(thumbBlobUrl);
                self._cacheOverlaysBlobUrls[overlayData.FileName] = null;
                self._cacheOverlaysBlobUrls[overlayData.ThumbnailFileName] = null;
            }

            callback();
        });
    }

    /**
     * Create PPOverlay from file and save it into storage
     * @param file
     * @param callback
     * @constructor
     */
    this.SaveOverlayFromFile = function (file, callback) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            callback();
            return;
        }

        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {

            // 1. Add full size image to storage
            console.log("PP Add file operation");
            chrome.extension.sendRequest(
            {
                type: PP_RequestType.ADDFILE,
                fileData: bufferToString(e.target.result),
                fileName: file.name,
                fileType: file.type
            },
            function (response) {
                self._handleResponse(response);

                if (response.status == "OK") {

                    var dataView = new DataView(stringToBuffer(response.arrayBuffer));
                    var blob = new Blob([dataView],{type:response.fileType});

                    var overlay = new PPOverlay();
                    overlay.Url = PPImageTools.createBlobUrl(blob);
                    overlay.FileName = response.fileName;

                    // 2. Generate thumbnail image
                    PPImageTools.ResizeBlob(blob, GlobalStorage.get_ThumbnailMinWidth(), GlobalStorage.get_ThumbnailMinHeight(),
                        function(resizedBlob, img) {
                            overlay.Width = img.width;
                            overlay.Height = img.height;

                            PPImageTools.getArrayBufferFromBlob(resizedBlob, function(resizedBlobBuffer) {

                                // 3. Add thumbnail image to storage
                                console.log("PP Add file operation - thumbnail");
                                chrome.extension.sendRequest(
                                {
                                    type: PP_RequestType.ADDFILE,
                                    fileData: bufferToString(resizedBlobBuffer),
                                    fileName: file.name,
                                    fileType: resizedBlob.type
                                },
                                function (responseThumb) {
                                    self._handleResponse(responseThumb);

                                    if (responseThumb.status == "OK") {
                                        var dataViewThumb = new DataView(stringToBuffer(responseThumb.arrayBuffer));
                                        var blobThumb = new Blob([dataViewThumb],{type:responseThumb.fileType});

                                        overlay.ThumbnailUrl = PPImageTools.createBlobUrl(blobThumb);
                                        overlay.ThumbnailFileName = responseThumb.fileName;

                                        overlay = PPStorage._SaveOverlay(overlay);
                                        self._cacheOverlaysBlobUrls[overlay.FileName] = overlay.Url;
                                        self._cacheOverlaysBlobUrls[overlay.ThumbnailFileName] = overlay.ThumbnailUrl;

                                        callback(overlay);
                                    }
                                });
                            });
                        }
                    );

                    // Render invisible thumbnail to obtain image width and height.
                    /*var span = $('<span id="chromeperfectpixel-imgtools"></span>').css('position', 'absolute').css('opacity', 0);
                    var img = $('<img />').attr({
                        src: overlay.Url,
                        title: file.name
                    });
                    span.append(img);
                    $(document.body).append(span);

                    img.load(function () {
                        overlay.Width = img[0].offsetWidth;
                        overlay.Height = img[0].offsetHeight;

                        overlay = PPStorage._SaveOverlay(overlay);
                        self._cacheOverlaysBlobUrls[overlay.FileName] = overlay.Url;

                        span.remove();
                        callback(overlay);
                    });*/
                }
                else
                    callback();
            });
        }
        reader.onerror = function (stuff) {
            console.log("PP error", stuff);

            if (stuff.getMessage) {
                console.log(stuff.getMessage());
            }
            else {
                // it might be the local file secutiry error.
                // See http://stackoverflow.com/questions/6665457/updateusing-filereader-in-chrome
                if (stuff.type == 'error' && document.location.protocol == 'file:')
                    alert('It looks like you are trying to use the extension on a local html page. Unfortunately, due to security reasons, Chrome doesn\'t allow scripts to access the local files from the local pages unless you start the browser with --allow-file-access-from-files flag.');
            }  
            
            callback();
        }
        reader.readAsArrayBuffer(file);
    };

    /**
     * Get count of overlays stored
     * @return {Number}
     * @constructor
     */
    this.GetOverlaysCount = function () {
        var count = 0;
        while (localStorage["overlay" + count + "_data"]) {
            count++;
        }
        return count;
    }

    /**
     * Save PPOverlay object into storage
     * @param overlay
     * @return {*}
     * @private
     */
    this._SaveOverlay = function (overlay) {
        if (!(overlay instanceof PPOverlay))
            alert("Object of type PPOverlay should be provided");

        if (!overlay.Id) {
            // New overlay
            overlay.Id = this.GetOverlaysCount();
        }

        // Url: overlay.Url
        var overlayData = { FileName: overlay.FileName, ThumbnailFileName: overlay.ThumbnailFileName, Height: overlay.Height, Width: overlay.Width };
        var overlayPosition = { X: overlay.X, Y: overlay.Y, Opacity: overlay.Opacity, Scale: overlay.Scale };

        try {
            localStorage["overlay" + overlay.Id + "_data"] = JSON.stringify(overlayData);
            localStorage["overlay" + overlay.Id + "_position"] = JSON.stringify(overlayPosition);
        } catch (e) {
            if (e.name == "QUOTA_EXCEEDED_ERR") { //data wasn't successfully saved due to quota exceed
                alert('Image cannot be uploaded because there are no free space. Please remove other layers or try to upload image with less size');
                return null;
            }
            throw e;
        }
        return overlay;
    };

    /**
     * Handle response came from background page file manager
     * @param response
     * @private
     */
    this._handleResponse = function (response) {
        console.log("PP " + response.status);
        if (response.message && response.showToUser)
            alert(response.message);
    };
};