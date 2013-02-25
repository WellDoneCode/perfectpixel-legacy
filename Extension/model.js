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

var Overlay = Backbone.Model.extend({
    defaults: {
        x: 300,
        y: 300,
        width: 0,
        height: 0,
        opacity: 0.5,
        scale: 1,
        url: '',
        filename: '',
        current: false
    },

    uploadFile: function(file, callback) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            throw new Error('File must contain image');
        }

        var self = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            chrome.extension.sendRequest(
                {
                    type: PP_RequestType.ADDFILE,
                    fileData: bufferToString(e.target.result),
                    fileName: file.name,
                    fileType: file.type
                },
                function (response) {
                    if (response.message && response.showToUser) {
                        alert(response.message);
                    }

                    if (response.status == "OK") {
                        var dataView = new DataView(stringToBuffer(response.arrayBuffer));
                        var blob = new Blob([dataView], {type: response.fileType});

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

                        self.set('url', url);
                        self.set('filename', response.fileName);
                        self._updateImageSize(callback);
                    } else {
                        callback();
                    }
                });
        };
        reader.onerror = function (stuff) {
            console.log("PP error", stuff);

            if (stuff.getMessage) {
                console.log(stuff.getMessage());
            }
            else {
                // it might be the local file secutiry error.
                // See http://stackoverflow.com/questions/6665457/updateusing-filereader-in-chrome
                if (stuff.type == 'error' && document.location.protocol == 'file:') {
                    alert('It looks like you are trying to use the extension on a local html page. Unfortunately, due to security reasons, Chrome doesn\'t allow scripts to access the local files from the local pages unless you start the browser with --allow-file-access-from-files flag.');
                }
            }

            callback();
        };
        reader.readAsArrayBuffer(file);
    },

    _updateImageSize: function(callback) {
        // Render invisible thumbnail to obtain image width and height.
        var span = $('<span id="chromeperfectpixel-imgtools"></span>')
            .css('position', 'absolute').css('opacity', 0);
        var img = $('<img />').attr({
            src: this.get('url'),
            title: this.get('filename')
        });
        span.append(img);
        $(document.body).append(span);

        img.load($.proxy(function () {
            this.set('width', img[0].offsetWidth);
            this.set('height', img[0].offsetHeight);
            span.remove();
            callback();
        }, this));
    }
});

var OverlayCollection = Backbone.Collection.extend({
    model: Overlay
});

var PerfectPixelModel = Backbone.Model.extend({
    defaults: {
        currentOverlayIndex: 0,
        overlayShown: false,
        overlayLocked: false
    },

    initialize: function() {
        this.overlays = new OverlayCollection();
    },

    getCurrentOverlay: function() {
        return this.overlays.first();
    },

    toggleOverlayShown: function() {
        this.set('overlayShown', !this.get('overlayShown'));
    },

    toggleOverlayLocked: function() {
        this.set('overlayLocked', !this.get('overlayLocked'));
    }
});
var PerfectPixel = new PerfectPixelModel();
