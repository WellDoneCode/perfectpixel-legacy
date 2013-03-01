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

/**
 * PPStogare - place where images are stored permanently. Static object
 * @constructor
 */
var PPStorage_localStorage = function () {

    /**
     * Get all PPOverlays from storage
     * @param callback
     * @constructor
     */
    this.GetOverlays = function (callback) {
        var overlaysCount = this.GetOverlaysCount();
        var overlays = [];
        for (var i = 0; i < overlaysCount; i++) {
            overlays[i] = this.GetOverlay(i);
        }
        callback(overlays);
    }

    /**
     * Get PPOverlay object from storage
     * @param id
     * @param callback
     * @return {*}
     * @constructor
     */
    this.GetOverlay = function (id, callback) {
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
        overlay.Url = overlayData.Url ? overlayData.Url : '';
        overlay.X = overlayPosition.X;
        overlay.Y = overlayPosition.Y;
        overlay.Opacity = overlayPosition.Opacity;
        overlay.Scale = overlayPosition.Scale;
        if (! overlay.Scale) overlay.Scale = 1.0; //for old images

        if (callback)
            callback(overlay);
        else
            return overlay;
    };

    /**
     * Save overlay position into storage
     * @param overlayId
     * @param newPosition
     * @constructor
     */
    this.UpdateOverlayPosition = function (overlayId, newPosition) {
        var oldPosition = JSON.parse(localStorage["overlay" + overlayId + "_position"]);
        newPosition = $.extend({},oldPosition,newPosition);
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
        callback();
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

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                var overlay = new PPOverlay();
                overlay.Url = e.target.result;

                // Render invisible thumbnail to obtain image width and height.
                var span = $('<span id="chromeperfectpixel-imgtools"></span>').css('position', 'absolute').css('opacity', 0);
                var img = $('<img />').attr({
                    src: e.target.result,
                    title: theFile.name
                });
                span.append(img);
                $(document.body).append(span);

                img.load(function () {
                    overlay.Width = img[0].offsetWidth;
                    overlay.Height = img[0].offsetHeight;

                    overlay = PPStorage._SaveOverlay(overlay);

                    span.remove();
                    callback(overlay);
                });
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
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

        var overlayData = { Url: overlay.Url, Height: overlay.Height, Width: overlay.Width };
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
};
