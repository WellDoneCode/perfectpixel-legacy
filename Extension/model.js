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
 * https://github.com/berzniz/backbone.getters.setters
 */
Backbone.GSModel = Backbone.Model.extend({

    get: function(attr) {
        // Call the getter if available
        if (_.isFunction(this.getters[attr])) {
            return this.getters[attr].call(this);
        }

        return Backbone.Model.prototype.get.call(this, attr);
    },

    set: function(key, value, options) {
        var attrs, attr;

        // Normalize the key-value into an object
        if (_.isObject(key) || key == null) {
            attrs = key;
            options = value;
        } else {
            attrs = {};
            attrs[key] = value;
        }

        // Go over all the set attributes and call the setter if available
        for (attr in attrs) {
            if (_.isFunction(this.setters[attr])) {
                attrs[attr] = this.setters[attr].call(this, attrs[attr]);
            }
        }

        return Backbone.Model.prototype.set.call(this, attrs, options);
    },

    getters: {},

    setters: {}

});

var Overlay = Backbone.GSModel.extend({
    defaults: {
        x: 50,
        y: 50,
        width: 300,
        height: 300,
        opacity: 0.5,
        scale: 1,
        url: '',
        filename: ''
    },

    setters: {
        opacity: function(value) {
            value = Number(value);
            if (value < 0) {
                value = 0;
            } else if (value > 1.0) {
                value = 1.0;
            }
            return value;
        }
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
                            url = window.createObjectURL(blob);
                        } else if (window.createBlobURL) {
                            url = window.createBlobURL(blob);
                        } else if (window.URL && window.URL.createObjectURL) {
                            url = window.URL.createObjectURL(blob);
                        } else if (window.webkitURL && window.webkitURL.createObjectURL) {
                            url = window.webkitURL.createObjectURL(blob);
                        }

                        // save() will be called in callback
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
    model: Overlay,
    localStorage: new Backbone.LocalStorage('perfectpixel-overlays')
});

var PerfectPixelModel = Backbone.Model.extend({
    defaults: {
        currentOverlayId: null,
        overlayShown: true,
        overlayLocked: false
    },

    localStorage: new Backbone.LocalStorage('perfectpixel'),

    initialize: function() {
        this.overlays = new OverlayCollection();
        this.overlays.bind('add', this.overlayAdded, this);
        this.overlays.bind('remove', this.overlayRemoved, this);
    },

    getCurrentOverlay: function() {
        if (this.has('currentOverlayId')) {
            return this.overlays.get(this.get('currentOverlayId'));
        } else {
            return null;
        }
    },

    setCurrentOverlay: function(overlay) {
        this.save({currentOverlayId: overlay.id});
    },

    isOverlayCurrent: function(overlay) {
        return this.get('currentOverlayId') === overlay.id
    },

    toggleOverlayShown: function() {
        this.save({overlayShown: !this.get('overlayShown')});
    },

    toggleOverlayLocked: function() {
        this.save({overlayLocked: !this.get('overlayLocked')});
    },

    overlayAdded: function(overlay) {
        if (!this.has('currentOverlayId')) {
            // if overlay is not yet saved, its id is undefined, so we use cid (that will be copied to id after save)
            this.save({currentOverlayId: overlay.id || overlay.cid});
        }
    },

    overlayRemoved: function(overlay) {
        if (overlay.id === this.get('currentOverlayId')) {
            var firstOverlay = this.overlays.first();
            if (firstOverlay) {
                this.save({currentOverlayId: firstOverlay.id});
            } else {
                this.save({currentOverlayId: null});
            }
        }
    }
 });
var PerfectPixel = new PerfectPixelModel({ id: 1 });
