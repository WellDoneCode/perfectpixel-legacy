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

/// <reference path="vs/chrome_extensions.js" />
/// <reference path="vs/webkit_console.js" />

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
}

var createPanel = function () {
    if ($('#chromeperfectpixel-panel').length == 0) {
        var panelHtml =
            '<div id="chromeperfectpixel-panel" class="chromeperfectpixel-panel" style="background:url(' + chrome.extension.getURL("images/noise.jpg") + ');">' +
                '<div id="chromeperfectpixel-panel-header">' +
                    '<div id="chromeperfectpixel-header-logo" style="background:url(' + chrome.extension.getURL("icons/16.png") + ');"></div>' +
                    '<h1>PerfectPixel</h1>' +
                '</div>' +
                '<div id="chromeperfectpixel-panel-body">' +
                    '<div id="chromeperfectpixel-section-opacity">' +
                        '<span>Opacity:</span>' +
                        '<input type="range" id="chromeperfectpixel-opacity" min="0" max="1" step="0.01" value="0.5" />' +
                    '</div>' +
                    '<div id="chromeperfectpixel-section-origin">' +
                        '<span>Origin:</span>' +
                        '<div id="chromeperfectpixel-origin-controls">' +
                            '<button id="chromeperfectpixel-ymore">&darr;</button>' +
                            '<button id="chromeperfectpixel-yless">&uarr;</button>' +
                            '<button id="chromeperfectpixel-xless">&larr;</button>' +
                            '<button id="chromeperfectpixel-xmore">&rarr;</button>' +
                            '<div>' +
                                '<div>' +
                                    '<div class="chromeperfectpixel-coords-label">X:</div>' +
                                    '<input type="text" class="chromeperfectpixel-coords" id="chromeperfectpixel-coordX" value="50" size="2" maxlength="4"/>' +
                                '</div>' +
                                '<div>' +
                                    '<div class="chromeperfectpixel-coords-label">Y:</div>' +
                                    '<input type="text" class="chromeperfectpixel-coords" id="chromeperfectpixel-coordY" value="50" size="2" maxlength="4"/>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                    '<div>Layers:</div>' +
                '<div id="chromeperfectpixel-section-scale">' +
                '<div id="chromeperfectpixel-section-scale-label">Scale:</div>' +
                '<input type="number" id="chromeperfectpixel-scale" value="1.0" size="3" min="0.1" max="10" step="0.1"/>' +
                '</div>' +
                    '<div id="chromeperfectpixel-layers"></div>' +

                    '<div id="chromeperfectpixel-progressbar-area" style="display: none">Loading...</div>' +

                    '<div id="chromeperfectpixel-buttons">' +
                        '<button class="chromeperfectpixel-showHideBtn" title="Hotkey: Alt + S" style="margin-right: 5px; float:left;">Show</button>' +
                        '<button class="chromeperfectpixel-lockBtn" title="Hotkey: Alt + C" style="margin-right: 5px; float:left;">Lock</button>' +
                        '<div id="chromeperfectpixel-upload-area">' +
                            '<button id="chromeperfectpixel-fakefile">Add new layer</button>' +
                            '<span><input id="chromeperfectpixel-fileUploader" type="file" accept="image/*" /></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        $('body').append(panelHtml);

        // Set event handlers
        $('.chromeperfectpixel-showHideBtn').bind('click', function (e) {
            ChromePerfectPixel.toggleOverlay();
        });

        $('.chromeperfectpixel-lockBtn').bind('click', function (e) {
            ChromePerfectPixel.toggleLock();
        });

        $('#chromeperfectpixel-fakefile').bind('click', function (e) {
            trackEvent("layer", "add", PPStorage.GetOverlaysCount() + 1);
            $(this).parent().find('input[type=file]').click();
        });
        $('#chromeperfectpixel-fileUploader').bind('change', function () {
            ChromePerfectPixel.upload(this.files, this);
        });

        $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]').live('click', function (e) {
            // Live handler called.
            //trackEvent("layer", "select");
            var overlayId = $(this).parents('.chromeperfectpixel-layer').data('Id');
            ChromePerfectPixel.setCurrentLayer(overlayId);
        });

        $('#chromeperfectpixel-opacity').change(function (e) {
            ChromePerfectPixel.opacity($(this));
        });

        $('#chromeperfectpixel-scale').change(function (e) {
            trackEvent("scale", e.type, $(this).val() * 10); // GA tracks only integers not floats
            ChromePerfectPixel.change(false, false, false, $(this).val());
        });

        $('#chromeperfectpixel-origin-controls button').live("click", function (e) {
            e.preventDefault();
            trackEvent("coords", $(this).attr('id').replace("chromeperfectpixel-", ""));

            if ($(this).attr('id') == "chromeperfectpixel-xless" || $(this).attr('id') == "chromeperfectpixel-xmore") {
                ChromePerfectPixel.xleft($(this));
            }
            if ($(this).attr('id') == "chromeperfectpixel-yless" || $(this).attr('id') == "chromeperfectpixel-ymore") {
                ChromePerfectPixel.xtop($(this));
            }
        });

        $('.chromeperfectpixel-coords').live("keypress", function (e) {
            if (e.which == 13) {
                trackEvent("coords", $(this).attr('id').replace("chromeperfectpixel-", ""));

                if ($(this).attr("id") == "chromeperfectpixel-coordX")
                    ChromePerfectPixel.change(false, $(this).val(), false);
                if ($(this).attr("id") == "chromeperfectpixel-coordY")
                    ChromePerfectPixel.change(false, false, $(this).val());
            }
        });

        // On load
        $('#chromeperfectpixel-panel').draggable({
            handle: "#chromeperfectpixel-panel-header",
            stop: function (event, ui) {
                // change left to right
                if ($(this).css('left')) {
                    $(this).css('right', ($(document.body).innerWidth() - $(this).offset().left - $(this).outerWidth()).toString() + 'px');
                    $(this).css('left', '');
                }
            }
            //,cancel: "#chromeperfectpixel-header-logo"
        });

        $('#chromeperfectpixel-panel-header').dblclick(function (event) {
            //if (event.target.id == "chromeperfectpixel-header-logo")
            //    return;
            trackEvent($(this).attr('id').replace("chromeperfectpixel-", ""), event.type);

            var panel = $('#chromeperfectpixel-panel');
            var body = $('#chromeperfectpixel-panel-body');
            var panelWidth = panel.width();

            if (body.hasClass('collapsed')) {
                body.removeClass('collapsed');
                var state = body.data('state');
                panel.animate({ right: state.right }, 'fast', function () {
                    body.animate(
                        { 'height': state.height, 'padding-bottom': state.paddingBottom },
                        'fast',
                        function () {
                            $(this).removeAttr('style');
                            panel.draggable('option', 'axis', '');
                        }
                    );
                });
            }
            else {
                body.addClass('collapsed');
                body.data('state', { height: body.innerHeight(), paddingBottom: body.css('padding-bottom'), right: panel.css('right') });
                $('#chromeperfectpixel-panel-body').animate(
                    { 'height': 0, 'padding-bottom': 0 },
                    'fast',
                    function () {
                        panel.animate({ right: (-panelWidth + 30).toString() + "px" }, function () {
                            panel.draggable('option', 'axis', 'y');
                        });
                    }
                );
            }
        });

        $('#chromeperfectpixel-panel button').button();

        // Workaround to catch single value of opacity during opacity HTML element change
        (function(el, timeout) {
            var timer, trig=function() { el.trigger("changed"); };
            el.bind("change", function() {
                if(timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(trig, timeout);
            });
        })($("#chromeperfectpixel-opacity"), 500);

        $('#chromeperfectpixel-opacity').bind('changed', function (e) {
            trackEvent("opacity", e.type, e.target.value * 100); // GA tracks only integers not floats
        });

        // Global hotkeys on
        if (ChromePerfectPixel.get_KeyboardEnabled()) {
            $(document.body).attr('data-chromeperfectpixel-oldonkeydown', document.body.onkeydown);
            document.body.onkeydown = ChromePerfectPixel.onKeyDown;
        }

        ChromePerfectPixel.renderLayers();
    }
}

var removePanel = function () {
    ChromePerfectPixel.removeOverlay();

    // Global hotkeys off
    if (ChromePerfectPixel.get_KeyboardEnabled()) {
        var oldonkeydown = $(document.body).attr('data-chromeperfectpixel-oldonkeydown');
        if (!oldonkeydown)
            oldonkeydown = null;
        document.body.onkeydown = oldonkeydown;
        $(document.body).removeAttr('data-chromeperfectpixel-oldonkeydown');
    }

    if ($('#chromeperfectpixel-panel').length > 0) {
        $('#chromeperfectpixel-panel').remove();
    }
}

var togglePanel = function () {
    if ($('#chromeperfectpixel-panel').length > 0) {
        removePanel();
    }
    else {
        createPanel();
    }
}

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

    this.get_KeyboardEnabled = function () {
        return ExtOptions.enableHotkeys;
    }

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
    }

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
    }

    this.toggleOverlay = function () {
        if ($('#' + overlayUniqueId).length > 0) {
            trackEvent("overlay", "show");
            ChromePerfectPixel.removeOverlay();
        }
        else {
            trackEvent("overlay", "hide");
            ChromePerfectPixel.createOverlay();
        }
    }

    this.lockOverlay = function () {
        trackEvent("overlay", "lock");
        $('#' + overlayUniqueId).css('pointer-events', 'none');
        GlobalStorage.setOptions({
            'locked' : true
        });
        $('.chromeperfectpixel-lockBtn').text('Unlock');
    }

    this.unlockOverlay = function () {
        trackEvent("overlay", "unlock");
        $('#' + overlayUniqueId).css('pointer-events', 'auto');
        GlobalStorage.setOptions({
            'locked' : false
        });
        $('.chromeperfectpixel-lockBtn').text('Lock');
    }

    this.toggleLock = function () {
        var options = GlobalStorage.getOptions();
        if (options['locked'] === true) {
            ChromePerfectPixel.unlockOverlay();
        }
        else {
            ChromePerfectPixel.lockOverlay();
        }
    }

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
    }

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
    }

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
    }

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
    }

    this.enableLayerControls = function () {
        $('.chromeperfectpixel-coords').attr('disabled', false);
        $('#chromeperfectpixel-opacity').attr('disabled', false);
        $('#chromeperfectpixel-scale').attr('disabled', false);
        $('.chromeperfectpixel-showHideBtn').button("option", "disabled", false);
        $('.chromeperfectpixel-lockBtn').button("option", "disabled", false);
        $('#chromeperfectpixel-fakefile').button("option", "disabled", false);
        $('#chromeperfectpixel-origin-controls button').button("option", "disabled", false);
        $('#chromeperfectpixel-progressbar-area').hide();
    }

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
    }

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
    }

    // end Layers

    this.upload = function (files, uploadElem) {
        file = files[0];

        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            return;
        }

        //                for (var i = 0; i < files.length; i++) {
        //                    file = files[i];
        //                    if (window.createObjectURL) {
        //                        url = window.createObjectURL(file)
        //                    } else if (window.createBlobURL) {
        //                        url = window.createBlobURL(file)
        //                    } else if (window.URL && window.URL.createObjectURL) {
        //                        url = window.URL.createObjectURL(file)
        //                    } else if (window.webkitURL && window.webkitURL.createObjectURL) {
        //                        url = window.webkitURL.createObjectURL(file)
        //                    }
        //                }

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

            if (ExtOptions.placeNewLayerToCurrentScrollPosition){
                var thisY = $(window).scrollTop();
                // layer is not in DOM -> ChromePerfectPixel.change() is useless -> use UpdateOverlayPosition()
                PPStorage.UpdateOverlayPosition(overlay.Id,{Y: thisY});
            }

            if (!GlobalStorage.get_CurrentOverlayId() || PPStorage.GetOverlaysCount() == 1 || ExtOptions.makeNewLayerCurrentAndShowIt){
                ChromePerfectPixel.setCurrentLayer(overlay.Id);
                if (ExtOptions.makeNewLayerCurrentAndShowIt){
                    ChromePerfectPixel.createOverlay();
                }
            }
        });
    }

    // UI

    this.updateCoordsUI = function (x, y, opacity, scale) {
        $('#chromeperfectpixel-coordX').val(x);
        $('#chromeperfectpixel-coordY').val(y);
        $('#chromeperfectpixel-opacity').val(Number(opacity).toFixed(1));
        $('#chromeperfectpixel-scale').val(Number(scale).toFixed(1));
    }

    this.opacity = function (input) {
        /*var offset = 0;
        if (button.attr('id') == "chromeperfectpixel-opless") {
        if ($('input#chromeperfectpixel-opacity').val() >= 0.11)
        offset = 0.1;
        else offset = 0;
        }
        else {
        if ($('input#chromeperfectpixel-opacity').val() <= 0.99)
        offset = -0.1;
        else offset = 0;
        }
        var thisOpacity = Number($('input#chromeperfectpixel-opacity').val() - offset).toFixed(1);
        $('input#chromeperfectpixel-opacity').val(thisOpacity);*/
        if (input.is(":disabled")) // chrome bug if version < 15.0; opacity input isn't actually disabled
            return;
        ChromePerfectPixel.change(input.val(), false, false);
    }

    this.xleft = function (button) {
        var offset = 0;
        if (button.attr('id') == "chromeperfectpixel-xless") {
            //if ($('input#chromeperfectpixel-coordX').val() >= 0)
            offset = 1;
            //else offset = 0;
        }
        else {
            offset = -1;
        }
        var thisX = $('input#chromeperfectpixel-coordX').val() - offset;
        $('input#chromeperfectpixel-coordX').val(thisX);
        ChromePerfectPixel.change(false, thisX, false);
    }

    this.xtop = function (button) {
        var offset = 0;
        if (button.attr('id') == "chromeperfectpixel-yless") {
            //if ($('input#chromeperfectpixel-coordY').val() >= 0)
            offset = 1;
            //else offset = 0;
        }
        else {
            offset = -1;
        }
        var thisY = $('input#chromeperfectpixel-coordY').val() - offset;
        $('input#chromeperfectpixel-coordY').val(thisY);
        ChromePerfectPixel.change(false, false, thisY);
    }

    this.change = function (opacity, left, top, scale) {
        var overlay = $('#' + overlayUniqueId);
        if (opacity != false)
            overlay.css('opacity', opacity);
        if (left != false || Number(left) == 0) {
            overlay.css('left', left + "px");
        }
        if (top != false || Number(top) == 0) {
            overlay.css('top', top + "px");
        }
        if (scale) {
            overlay.data('scale', scale);
            overlay.css('height', 'auto');
            overlay.css('width', Number(overlay.data('originalWidth')) * scale);
        }
        ChromePerfectPixel.onOverlayUpdate(true);
    }
}
