/*
 * Copyright 2011-2013 Alex Belozerov, Ilya Stepanov
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

/**
 * Created with JetBrains PhpStorm.
 * User: alexeybelozerov
 * Date: 2/23/13
 * Time: 1:20 AM
 * To change this template use File | Settings | File Templates.
 */

// Depend on 3rd Party/canvas-to-blob.js

var PPImageTools = new function() {

    this.createBlobUrl = function (blob) {
        var url;
        if (window.createObjectURL) {
            url = window.createObjectURL(blob)
        } else if (window.createBlobURL) {
            url = window.createBlobURL(blob)
        } else if (window.URL && window.URL.createObjectURL) {
            url = window.URL.createObjectURL(blob)
        } else if (window.webkitURL && window.webkitURL.createObjectURL) {
            url = window.webkitURL.createObjectURL(blob)
        }
        return url;
    }

    this.revokeBlobUrl = function (blobUrl) {
        if (window.revokeObjectURL) {
            window.revokeObjectURL(blobUrl);
        } else if (window.revokeBlobURL) {
            window.revokeBlobURL(blobUrl);
        } else if (window.URL && window.URL.revokeObjectURL) {
            window.URL.revokeObjectURL(blobUrl);
        } else if (window.webkitURL && window.webkitURL.revokeObjectURL) {
            window.webkitURL.revokeObjectURL(blobUrl);
        }
    }

    /**
     * Resize blob with same aspect ratio fit in maxWidth x maxHeight rectangle.
     * Resized blob, Image file constructed from original blob are passed to callback function parameters
     * @param blob
     * @param minWidth
     * @param minHeight
     * @param callback
     * @constructor
     */
    this.ResizeBlob = function (blob, minWidth, minHeight, callback) {
        //return blob;
        var file = blob,
            fileType = blob.type,
            reader = new FileReader();

        reader.onloadend = function() {
            var image = new Image();
            image.src = reader.result;

            image.onload = function() {
                var imageWidth = image.width,
                    imageHeight = image.height;

                var coeff = minHeight / minWidth;
                if(imageWidth * coeff > imageHeight) {
                    imageWidth *= minHeight / imageHeight;
                    imageHeight = minHeight;
                } else {
                    imageHeight *= minWidth / imageWidth;
                    imageWidth = minWidth;
                }

                var canvas = document.createElement('canvas');
                canvas.width = imageWidth;
                canvas.height = imageHeight;

                var ctx = canvas.getContext("2d");
                ctx.drawImage(this, 0, 0, imageWidth, imageHeight);

                // The resized file ready for upload
                canvas.toBlob(
                    function (resizedBlob) {
                        callback(resizedBlob, image);
                    },
                    fileType
                );
            }
        }

        reader.readAsDataURL(file);
    }

    /**
     * Get ArrayBuffer from Blob object and pass it to callback function
     * @param blob
     * @param callback
     */
    this.getArrayBufferFromBlob = function (blob, callback) {
        var fileReader = new FileReader();
        fileReader.onloadend = function(evt) {
            var buffer = evt.target.result;
            callback(buffer);
        };
        fileReader.readAsArrayBuffer(blob);
    }
}