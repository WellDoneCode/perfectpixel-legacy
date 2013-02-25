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
            this.overlays = new OverlayCollection();
            this.panelView = new PanelView({ overlays: this.overlays });
        }
    },

    /**
     *
     * @param files
     * @param uploadElem
     */
    upload: function (files, uploadElem) {
        var overlay = new Overlay();
        this.overlays.add(overlay);
    },

    /**
     *
     * @param overlayId
     */
    setCurrentLayer: function(overlayId) {
        ChromePerfectPixel.setCurrentLayer(overlayId);
    },

    /**
     *
     * @param value
     */
    scaleChanged: function(value) {
        ChromePerfectPixel.change({scale: value});
    },

    /**
     *
     * @param axis
     * @param offset
     */
    originButtonClicked: function(axis, offset) {
        if (axis == "x") {
            var input = $('input#chromeperfectpixel-coordX');
            var x = input.val() - offset;
            input.val(x);
            ChromePerfectPixel.change({left: x});
        } else if (axis == "y") {
            var input = $('input#chromeperfectpixel-coordY');
            var y = input.val() - offset;
            input.val(y);
            ChromePerfectPixel.change({top: y});
        }
    },

    /**
     *
     * @param inputId
     * @param value
     */
    coordsKeyPressed: function(inputId, value) {
        if (inputId == "chromeperfectpixel-coordX") {
            ChromePerfectPixel.change({left: value});
        } else if (inputId == "chromeperfectpixel-coordY") {
            ChromePerfectPixel.change({top: value});
        }
    },

    /**
     *
     * @param value
     */
    changeOpacity: function(value) {
        ChromePerfectPixel.change({opacity: value});
    },

    /**
     *
     */
    toggleOverlay: function() {
        ChromePerfectPixel.toggleOverlay();
    },

    /**
     *
     */
    toggleLock: function() {
        ChromePerfectPixel.toggleLock();
    },

    onKeyDown: function(event) {
        ChromePerfectPixel.onKeyDown(event);
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
    var deleteLayerConfirmationMessage = 'Are you sure want to delete layer?';

    // Overlay
    this.createOverlay = function (options) {
        var options = options || GlobalStorage.getOptions();
        if ($('#' + overlayUniqueId).length > 0) {
        }
        else {
            var overlay = $('<img />');
            overlay.attr({
                'id': overlayUniqueId
            }).addClass('chromeperfectpixel-overlay')
                .css({
                    'z-index': default_zIndex,
                    'width': default_width_px + 'px',
                    'height': default_height_px + 'px',
                    'margin': 0,
                    'padding': 0,
                    'position': 'absolute',
                    'top': default_top_px + 'px',
                    'left': default_left_px + 'px',
                    'background-color': 'transparent',
                    'opacity': default_opacity,
                    'display': 'block',
                    'cursor': 'all-scroll',
                    'pointer-events' : (options['locked']) ? 'none' : 'auto'
                });
            $('body').append(overlay);

            overlay.bind('mousewheel', function (event) {
                if (event.wheelDelta < 0) {
                    overlay.css('opacity', Number(overlay.css('opacity')) - 0.05);
                } else {
                    overlay.css('opacity', Number(overlay.css('opacity')) + 0.05);
                }
                event.stopPropagation();
                event.preventDefault();
                ChromePerfectPixel.onOverlayUpdate(true);
            });

            overlay.draggable({
                drag: ChromePerfectPixel.onOverlayUpdate,
                stop: function () {
                    ChromePerfectPixel.onOverlayUpdate(true);
                }
            });
        }

        $('.chromeperfectpixel-showHideBtn').removeClass("chromeperfectpixel-showHideBtn-disabled").addClass("chromeperfectpixel-showHideBtn-enabled");
        $('.chromeperfectpixel-lockBtn').removeClass("chromeperfectpixel-lockBtn-disabled").addClass("chromeperfectpixel-lockBtn-enabled");

        // Set overlay data
        PPStorage.GetOverlay(GlobalStorage.get_CurrentOverlayId(), function (overlayObj) {
            if (overlayObj != null) {
                $('#' + overlayUniqueId).attr('src', '');
                $('#' + overlayUniqueId).attr('src', overlayObj.Url)
                    .css('width', (overlayObj.Width * overlayObj.Scale) + 'px').css('height', 'auto')
                    .data('originalWidth',overlayObj.Width)
                    .data('scale',overlayObj.Scale)
                    .css('left', overlayObj.X + 'px').css('top', overlayObj.Y + 'px')
                    .css('opacity', overlayObj.Opacity);
            }
        });

        GlobalStorage.setOptions({
            'visible' : true
        });

        $('.chromeperfectpixel-showHideBtn').text('Hide');
    };

    this.removeOverlay = function () {
        if ($('#' + overlayUniqueId).length > 0) {
            $('#' + overlayUniqueId).attr('src', '');
            $('#' + overlayUniqueId).unbind();
            $('#' + overlayUniqueId).remove();
        }

        $('.chromeperfectpixel-showHideBtn').removeClass("chromeperfectpixel-showHideBtn-enabled").addClass("chromeperfectpixel-showHideBtn-disabled");
        $('.chromeperfectpixel-lockBtn').removeClass("chromeperfectpixel-lockBtn-enabled").addClass("chromeperfectpixel-lockBtn-disabled");

        $('.chromeperfectpixel-showHideBtn').text('Show');

        GlobalStorage.setOptions({
            'visible' : false
        });
    };

    this.toggleOverlay = function () {
        if ($('#' + overlayUniqueId).length > 0) {
            trackEvent("overlay", "show");
            ChromePerfectPixel.removeOverlay();
        }
        else {
            trackEvent("overlay", "hide");
            ChromePerfectPixel.createOverlay();
        }
    };

    this.lockOverlay = function () {
        trackEvent("overlay", "lock");
        $('#' + overlayUniqueId).css('pointer-events', 'none');
        GlobalStorage.setOptions({
            'locked' : true
        });
        $('.chromeperfectpixel-lockBtn').text('Unlock');
    };

    this.unlockOverlay = function () {
        trackEvent("overlay", "unlock");
        $('#' + overlayUniqueId).css('pointer-events', 'auto');
        GlobalStorage.setOptions({
            'locked' : false
        });
        $('.chromeperfectpixel-lockBtn').text('Lock');
    };

    this.toggleLock = function () {
        var options = GlobalStorage.getOptions();
        if (options['locked'] === true) {
            ChromePerfectPixel.unlockOverlay();
        }
        else {
            ChromePerfectPixel.lockOverlay();
        }
    };

    this.onOverlayUpdate = function (isStop) {
        var overlay = $('#' + overlayUniqueId);
        if(overlay && overlay.length > 0)
        {
            var x = overlay[0].offsetLeft;
            var y = overlay[0].offsetTop;
            var opacity = overlay.css('opacity');
            var scale = overlay.data('scale');

            ChromePerfectPixel.updateCoordsUI(x, y, opacity, scale);

            if (isStop) {
                // update storage
                PPStorage.UpdateOverlayPosition(GlobalStorage.get_CurrentOverlayId(), { X: x, Y: y, Opacity: opacity, Scale: scale });
            }
        }
    };

    this.onKeyDown = function (event) {
        var overlay = $('#' + overlayUniqueId);
        if (event.which == 37) { // left
            overlay.css('left', parseFloat(overlay.css('left')) - 1 + 'px');
        }
        else if (event.which == 38) { // up
            overlay.css('top', parseFloat(overlay.css('top')) - 1 + 'px');
        }
        else if (event.which == 39) { // right
            overlay.css('left', parseFloat(overlay.css('left')) + 1 + 'px');
        }
        else if (event.which == 40) { // down
            overlay.css('top', parseFloat(overlay.css('top')) + 1 + 'px');
        }
        else if (event.altKey && event.which == 83) { // Alt + s
            if (PPStorage.GetOverlaysCount() > 0)
                ChromePerfectPixel.toggleOverlay();
        }
        else if (event.altKey && event.which == 67) { // Alt + c
            if (PPStorage.GetOverlaysCount() > 0)
                ChromePerfectPixel.toggleLock();
        }
        else
            return;

        event.stopPropagation();
        event.preventDefault();

        if($('#' + overlayUniqueId).length > 0)
            ChromePerfectPixel.onOverlayUpdate(true);
    };

    // Layers
    this.renderLayers = function () {
        // disable controls
        ChromePerfectPixel.updateCoordsUI(default_left_px, default_top_px, default_opacity, default_scale);
        $('.chromeperfectpixel-coords').attr('disabled', true);
        $('#chromeperfectpixel-opacity').attr('disabled', true);
        $('#chromeperfectpixel-scale').attr('disabled', true);
        $('.chromeperfectpixel-showHideBtn').button("option", "disabled", true);
        $('.chromeperfectpixel-lockBtn').button("option", "disabled", true);
        $('#chromeperfectpixel-fakefile').button("option", "disabled", true);
        $('#chromeperfectpixel-origin-controls button').button("option", "disabled", true);

        var container = $('#chromeperfectpixel-layers');
        container.empty();

        if (PPStorage.GetOverlaysCount() > 0) {
            $('#chromeperfectpixel-progressbar-area').show();
        }

        PPStorage.GetOverlays(function (overlays) {
            container.empty();

            for (var i = 0; i < overlays.length; i++) {
                ChromePerfectPixel.renderLayer(overlays[i]);
            }

            // enable controls
            if (overlays.length > 0) {
                ChromePerfectPixel.enableLayerControls();
            }
            else
                $('#chromeperfectpixel-fakefile').button("option", "disabled", false);

            ChromePerfectPixel.setCurrentLayer(GlobalStorage.get_CurrentOverlayId());
        });
    };

    this.renderLayer = function (overlay) {
        var container = $('#chromeperfectpixel-layers');
        var layer = $('<label></label>', {
            class: 'chromeperfectpixel-layer',
            data: {
                Id: overlay.Id
            }
        });
        var thumbHeight = 50;
        var coeff = overlay.Height / thumbHeight;
        var thumbWidth = Math.ceil(overlay.Width / coeff);

        var checkbox = ($('<input type=radio name="chromeperfectpixel-selectedLayer" />'));
        layer.append(checkbox);

        if (!ExtOptions.classicLayersSection){
            layer.css({'background-image':  'url(' +overlay.Url + ')'});
        }
        else{
            var thumb = $('<img />', {
                class: 'chromeperfectpixel-thumb',
                src: overlay.Url,
                css: {
                    width: thumbWidth + 'px',
                    height: thumbHeight + 'px'
                }
            });
            layer.append($('<div class="chromeperfectpixel-thumbwrapper"></div>').append(thumb));
        }

        var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>')); //($('<input type=button class="chromeperfectpixel-delete" value="X" />'));
        deleteBtn.bind('click', function (e) {
            trackEvent("layer", "delete", undefined, "attempt");
            ChromePerfectPixel.deleteLayer($(this).parents('.chromeperfectpixel-layer'));
        });
        deleteBtn.button(); // apply css

        layer.append(deleteBtn);
        container.append(layer);
    };

    this.enableLayerControls = function () {
        $('.chromeperfectpixel-coords').attr('disabled', false);
        $('#chromeperfectpixel-opacity').attr('disabled', false);
        $('#chromeperfectpixel-scale').attr('disabled', false);
        $('.chromeperfectpixel-showHideBtn').button("option", "disabled", false);
        $('.chromeperfectpixel-lockBtn').button("option", "disabled", false);
        $('#chromeperfectpixel-fakefile').button("option", "disabled", false);
        $('#chromeperfectpixel-origin-controls button').button("option", "disabled", false);
        $('#chromeperfectpixel-progressbar-area').hide();
    };

    this.deleteLayer = function (layer) {
        if (!ExtOptions.enableDeleteLayerConfirmationMessage || confirm(deleteLayerConfirmationMessage)) {
            trackEvent("layer", "delete", undefined, "confirmed");
            var overlayId = $(layer).data('Id');
            PPStorage.DeleteOverlay(overlayId, function () {
                var overlaysCount = PPStorage.GetOverlaysCount();
                if ((overlaysCount > 0 && overlaysCount <= GlobalStorage.get_CurrentOverlayId())
                    || overlayId < GlobalStorage.get_CurrentOverlayId()) {
                    ChromePerfectPixel.setCurrentLayer(GlobalStorage.get_CurrentOverlayId() - 1);
                }
                else if (overlaysCount == 0) {
                    ChromePerfectPixel.removeOverlay();
                    GlobalStorage.set_CurrentOverlayId(null);
                }

                ChromePerfectPixel.renderLayers();
            });
        }
        else
            trackEvent("layer", "delete", undefined, "canceled");
    };

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

    // end Layers

    this.upload = function (files, uploadElem) {
        var file = files[0];

        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            return;
        }

        $('#chromeperfectpixel-progressbar-area').show();

        PPStorage.SaveOverlayFromFile(file,
            function (overlay) {
                $('#chromeperfectpixel-progressbar-area').hide();

                // Hack Clear file upload
                $('#chromeperfectpixel-fileUploader').unbind('change');
                $($(uploadElem).parent()).html($(uploadElem).parent().html());
                $('#chromeperfectpixel-fileUploader').bind('change', function () {
                    ChromePerfectPixel.upload(this.files, this);
                });

                if (overlay == null)
                    return;
                ChromePerfectPixel.renderLayer(overlay);
                ChromePerfectPixel.enableLayerControls();

                if (!GlobalStorage.get_CurrentOverlayId() || PPStorage.GetOverlaysCount() == 1)
                    ChromePerfectPixel.setCurrentLayer(overlay.Id);
            });
    };

    // UI

    this.updateCoordsUI = function (x, y, opacity, scale) {
        $('#chromeperfectpixel-coordX').val(x);
        $('#chromeperfectpixel-coordY').val(y);
        $('#chromeperfectpixel-opacity').val(Number(opacity).toFixed(1));
        $('#chromeperfectpixel-scale').val(Number(scale).toFixed(1));
    };

    /**
     *
     * @param {Object} values
     * @param [values.opacity]
     * @param [values.left]
     * @param [values.top]
     * @param [values.scale]
     */
    this.change = function(values) {
        var overlay = $('#' + overlayUniqueId);
        if (values.opacity !== undefined) {
            overlay.css('opacity', values.opacity);
        }
        if (values.left !== undefined) {
            overlay.css('left', values.left + "px");
        }
        if (values.top !== undefined) {
            overlay.css('top', values.top + "px");
        }
        if (values.scale !== undefined) {
            overlay.data('scale', values.scale);
            overlay.css('height', 'auto');
            overlay.css('width', Number(overlay.data('originalWidth')) * values.scale);
        }
        ChromePerfectPixel.onOverlayUpdate(true);
    };
};
