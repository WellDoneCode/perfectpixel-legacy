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

// Global variables
var ExtOptions;
var PPStorage;

$(document).ready(function () {
    chrome.extension.sendRequest({ type: PP_RequestType.GetExtensionOptions }, function (theOptions) {
        ExtOptions = theOptions;
        PPStorage = ExtOptions.storageCompatibilityMode == true ? new PPStorage_localStorage() : new PPStorage_filesystem();

        if (!ExtOptions.debugMode) {
            // disable console messages
            if (!window.console) window.console = {};
            var methods = ["log", "debug", "warn", "info"];
            for (var i = 0; i < methods.length; i++) {
                console[methods[i]] = function () { };
            }
        }

    });
});

var trackEvent = function(senderId, eventType, integerValue, stringValue) {
    if(ExtOptions.enableStatistics == false)
        return;

    console.log("PP track event", "senderId: " + senderId + "; eventType: " + eventType);
    chrome.extension.sendRequest(
        {
            type: PP_RequestType.TrackEvent,
            senderId: senderId,
            eventType: eventType,
            integerValue: integerValue,
            stringValue: stringValue
        },
        function (response) {
            if(!response)
                console.log("PP error", "Tracking error: " + senderId + ", " + eventType);
        });
};

/**
 *
 * @type {Object}
 */
var Controller = {

    togglePanel: function() {
        if (this.panelView) {
            this.panelView.destroy();
            delete this.panelView;
        }
        else {
            this.panelView = new PanelView();
        }
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////
var ChromePerfectPixel = new function () {
    // temporary hardcoded
    var default_opacity = 0.5;
    var default_scale = 1.0;
    var default_top_px = 50;
    var default_left_px = 50;
    var default_width_px = 300;
    var default_height_px = 300;
    var default_zIndex = 2147483646;
    var overlayUniqueId = 'chromeperfectpixel-overlay_3985123731465987';

    this.setCurrentLayer = function (overlayId) {
        if (PPStorage.GetOverlaysCount() == 0)
            return;

        if (!overlayId || overlayId == null)
            overlayId = 0;

        $('.chromeperfectpixel-layer').removeClass('current');
        var selectedLayerCheckboxes = $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]');
        selectedLayerCheckboxes.removeAttr('checked');
        selectedLayerCheckboxes.filter(function () {
            return $(this).parents('.chromeperfectpixel-layer').data("Id") == overlayId
        }).attr('checked', 'checked').closest('.chromeperfectpixel-layer').addClass('current');

        GlobalStorage.set_CurrentOverlayId(overlayId);
        PPStorage.GetOverlay(GlobalStorage.get_CurrentOverlayId(), function (overlay) {
            ChromePerfectPixel.updateCoordsUI(overlay.X, overlay.Y, overlay.Opacity, overlay.Scale);

            var options = GlobalStorage.getOptions();

            if (options['visible']) {
                ChromePerfectPixel.createOverlay(options);
            }

            // Update the lock button text if necessary
            if (options['locked']) {
                $('.chromeperfectpixel-lockBtn').text('Unlock');
            }
        });
    };
};
