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
        filename: '',
        thumbnailFilename: ''
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

    initialize: function() {
        this.image = new OverlayImage();
        this.image.set('parent', this);
    },

    uploadFile: function(file, callback) {
        this.image.uploadFile(file, callback);
    },

    destroy: function(options) {
        this.image.destroy({
            success: $.proxy(function() {
                Backbone.GSModel.prototype.destroy.call(this, options);
            }, this)
        });
    }
});

var OverlayCollection = Backbone.Collection.extend({
    model: Overlay,
    localStorage: new Backbone.LocalStorage('perfectpixel-overlays')
});

var OverlayImage = Backbone.GSModel.extend({

    // TODO for both /2, for now Canvas in Chrome scales images very bad without antialiasing, so using workaround CSS scaling
    thumbnailMinWidth: 188,
    thumbnailMinHeight: 120,

    getters: {
        filename: function() {
            return this.get('parent').get('filename');
        },
        thumbnailFilename: function() {
            return this.get('parent').get('thumbnailFilename');
        },
        width: function() {
            return this.get('parent').get('width');
        },
        height: function() {
            return this.get('parent').get('height');
        }
    },

    setters: {
        filename: function(value) {
            return this.get('parent').set('filename', value);
        },
        thumbnailFilename: function(value) {
            return this.get('parent').set('thumbnailFilename', value);
        },
        width: function(value) {
            return this.get('parent').set('width', value);
        },
        height: function(value) {
            return this.get('parent').set('height', value);
        }
    },

    getImageUrlAsync: function(callback) {
        if(this.imageUrl)
            callback(this.imageUrl);
        else
        {
            this._getImageUrlByFilename(this.get('filename'), $.proxy(function(imageUrl, response) {
                this.imageUrl = imageUrl;
                callback(this.imageUrl);
            }, this));
        }
    },

    getThumbnailUrlAsync: function(callback) {
        if(this.thumbnailImageUrl)
            callback(this.thumbnailImageUrl);
        else
        {
            this._getImageUrlByFilename(this.get('thumbnailFilename'), $.proxy(function(thumbImageUrl, response) {
                this.thumbnailImageUrl = thumbImageUrl;
                callback(this.thumbnailImageUrl);
            }, this));
        }
    },

    // Overriding getting model
    /*sync: function(method, model, options) {
        model._getImageUrlByFilename(this.filename, function(imageUrl, response) {
            this.imageUrl = imageUrl;
            var success = options.success;
            if (success) success(model, response, options);
            model.trigger('sync', model, response, options);
        })
    },*/

    uploadFile: function(file, callback) {
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

                        self.imageUrl = PPImageTools.createBlobUrl(blob);
                        self.set('filename', response.fileName);

                        // 2. Generate thumbnail image
                        PPImageTools.ResizeBlob(blob, self.thumbnailMinWidth, self.thumbnailMinHeight,
                            function(resizedBlob, img) {
                                self.set('width', img.width);
                                self.set('height', img.height);

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

                                                self.thumbnailUrl = PPImageTools.createBlobUrl(blobThumb);
                                                self.set('thumbnailFilename', responseThumb.fileName);

                                                callback();
                                            }
                                        });
                                });
                            }
                        );
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
    },

    /**
     * Load image from underlying data source by filename
     * @param filename
     * @param [callback]
     * @private
     */
    _getImageUrlByFilename: function(filename, callback) {
        if (filename) {
            console.time("PP Profiling _getImageUrlByFilename " + filename);
            var self = this;
            chrome.extension.sendRequest({
                    type: PP_RequestType.GETFILE,
                    fileName: filename
                },
                function (response) {
                    self._handleResponse(response);
                    if (response.status == "OK") {
                        var dataView = new DataView(stringToBuffer(response.arrayBuffer));
                        var blob = new Blob([dataView],{type:response.fileType});
                        var imageUrl = PPImageTools.createBlobUrl(blob);
                    }
                    console.timeEnd("PP Profiling _getImageUrlByFilename " + filename);

                    callback && callback(imageUrl, response);
                });
        } else {
            console.error("Attempt to get image url for empty filename");
            callback && callback(null);
        }
    },

    /**
     * Handle response came from background page file manager
     * @param response
     * @private
     */
    _handleResponse: function(response) {
        console.log("PP " + response.status);
        if (response.message && response.showToUser) {
            alert(response.message);
        }
    },

    /**
     * Desctructor. Delete image from underlying data source.
     */
    destroy: function(options) {
        // Delete physical files
        var filesToDelete = [this.get('filename')];
        if(this.get('thumbnailFilename'))
            filesToDelete.push(this.get('thumbnailFilename'));

        console.log("PP Delete files operation " + filesToDelete.toString());

        chrome.extension.sendRequest(
        {
            type: PP_RequestType.DELETEFILE,
            fileName: filesToDelete
        },
        $.proxy(function (response) {
            this._handleResponse(response);

            if (response.status == "OK") {
                PPImageTools.revokeBlobUrl(this.imageUrl);
                PPImageTools.revokeBlobUrl(this.thumbnailImageUrl);

                options.success && options.success(response);
            }

            options.error && options.error(response);

        }, this));
    }
});

var PerfectPixelModel = Backbone.Model.extend({
    defaults: {
        currentOverlayId: null,
        overlayShown: false,
        overlayLocked: false,
        version: 0 // Version is always set by Converter class
    },

    localStorage: new Backbone.LocalStorage('perfectpixel'),

    initialize: function() {
        this.overlays = new OverlayCollection();
        this.overlays.bind('remove', this.overlayRemoved, this);
        this.notificationModel = new NotificationModel();
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

    moveCurrentOverlay: function(props) {
        var overlay = this.getCurrentOverlay();
        if (overlay) {
          if (this.get('overlayShown') && !this.get('overlayLocked')) {
            overlay.save(props);
          }
          return {x: overlay.get('x'), y: overlay.get('y')};
        }
        return {x: null, y: null};
    },

    scaleCurrentOverlay: function(props) {
        var overlay = this.getCurrentOverlay();
        if (overlay) {
          if (this.get('overlayShown') && !this.get('overlayLocked')) {
              overlay.save(props);
          }
          return {scale: overlay.get('scale')};
        }
        return {scale: null};
    },

    changeCurrentOverlayOpacity: function(props) {
        var overlay = this.getCurrentOverlay();
        if (overlay) {
          if (this.get('overlayShown') && !this.get('overlayLocked')) {
              overlay.save(props);
          }
          return {opacity: overlay.get('opacity')};
        }
        return {opacity: null};
    },

    toggleOverlayShown: function() {
        this.save({overlayShown: !this.get('overlayShown')});
    },

    showOverlay: function() {
        this.save({overlayShown: true});
    },

    toggleOverlayLocked: function() {
        this.save({overlayLocked: !this.get('overlayLocked')});
    },

    unlockOverlay: function() {
        this.save({overlayLocked: false});
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
    },

    getDefaultLocale: function() {
        return ExtOptions.defaultLocale;
    },

    getCurrentLocale: function() {
        // Return only global locale: "en" instead of "en-US"
        var regex = /(.*)-.*/i
        var matchArray = regex.exec(window.navigator.language);
        if (matchArray != null)
            return matchArray[1];
        else
            return window.navigator.language;
    }
 });

/**
 * Notification Model
 * @type {*}
 */
var Notification = Backbone.GSModel.extend({

    defaults: {
        id: 0,
        show: 0,
        text:  'default text',
        minVersion: 0,
        maxVersion: 0,
        expireDate: '10.10.2010'
    },

    initialize: function() {

    },

    getText: function() {
        var locale = PerfectPixel.getCurrentLocale();
        var val = this.get('text_' + locale);
        if(!val)
            val = this.get('text_' + PerfectPixel.getDefaultLocale());
        return val;
    },

    checkParam: function(version, maxid) {
        var result = true;
        var now = new Date(),
            expireDate = new Date(this.get("expireDate")),
            defaultDate = this.defaults.expireDate;

        if (this.get('show') != 1)
            return false;

        if (this.get("minVersion") > version && this.get("minVersion") != 0){
            result = false;
        }

        if (this.get("maxVersion") < version && this.get("maxVersion") !=0 ){
            result = false;
        }

        if (expireDate < now && defaultDate != this.get("expireDate")) {
            result = false;
        }
        if ((parseInt(this.get("id")) < parseInt(maxid)) || (parseInt(this.get("id")) == parseInt(maxid))) {
            result = false;
        }
        return result;
    },

    destroy: function(options) {

    }
});

/**
 * Notifications collection
 * @type {*}
 */
var NotificationCollection = Backbone.Collection.extend({
    defaults: {
        model: Notification
    },
    model: Notification,
    url: function() {
        return "http://www.welldonecode.com/perfectpixel/data/notifications.json?random=" + Math.random();
    }
});

/**
 * Model for working with NotificationCollection
 * @type {*}
 */
var NotificationModel = Backbone.Model.extend({

    defaults: {
        collectionNotifications: new NotificationCollection(),
        currentNotification: new Notification(),
        maxId:0
    },

    initialize: function() {
        var that = this;
        var allNotificationsFromRemote = new NotificationCollection();
        allNotificationsFromRemote.fetch({
            success: $.proxy(function(result) {
                chrome.extension.sendRequest(
                    {
                        type: PP_RequestType.GetNotifications,
                        keyName:'perfectpixel-notification'
                    },
                    $.proxy(function(response)
                    {
                        var maxid = 0;
                        if (response){
                            maxid = response;
                        }
                        that.setMaxId(maxid);
                        that.setCollection(allNotificationsFromRemote);
                    }, this)
                );
            }
            , this)});
    },

    setCollection: function(collection){
        var collectionResult = new NotificationCollection,
            version = Converter._getCurrentDataVersion(),
            maxid = this.get("maxId");

        collection.each( function( notify){
            var check = notify.checkParam(version, maxid);
            if (check){
                collectionResult.add(notify);
            }
        });
        this.collectionNotifications = collectionResult;
        this.setCurrentNotification();
    },

    getCurrentNotification: function(){
        return this.currentNotification;
    },

    setCurrentNotification: function() {
        if (this.collectionNotifications.length > 0) {
            this.currentNotification = this.collectionNotifications.shift();
        } else {
            this.currentNotification = null;
        }
        this.trigger("change:currentNotification");
    },

    closeCurrentNotification: function() {
        var notify = this.getCurrentNotification();
        chrome.extension.sendRequest(
            {
                type: PP_RequestType.SetNotifications,
                notifyId: notify.get("id"),
                keyName:'perfectpixel-notification'
            });
        this.set("maxId", notify.get("id"));
        // Don't need to care about changing current notification
        // New notification is changed with PP_Background_RequestType.NotificationsUpdated request from backround page
    },

    setMaxId: function(maxid) {
        this.set("maxId", maxid);
    }
});
