/// <reference path="vs/chrome_extensions.js" />

// temporary hardcoded
var opacity = 0.5;
var top_px = 50;
var left_px = 50;
var width_px = 300;
var height_px = 300;
var zIndex = 1000;
var overlayUniqueId = 'overlay_3985123731465987';

var createOverlay = function () {
    if ($('#' + overlayUniqueId).length > 0) {
    }
    else {
        var overlay = $('<img />');
        overlay.attr({
            'id': overlayUniqueId
        }).css({
            'z-index': zIndex,
            'width': width_px + 'px',
            'height': height_px + 'px',
            'margin': 0,
            'padding': 0,
            'position': 'absolute',
            'top': top_px + 'px',
            'left': left_px + 'px',
            'background-color': 'transparent',
            'opacity': opacity,
            'display': 'block',
            'cursor': 'all-scroll'
        });
        $('body').append(overlay);

        overlay.draggable({
            drag: onOverlayUpdate,
            stop: onOverlayUpdate
        });
    }
}

var removeOverlay = function () {
    if ($('#' + overlayUniqueId).length > 0) {
        $('#' + overlayUniqueId).attr('src', '');
        $('#' + overlayUniqueId).remove();
    }
}

var toggleOverlay = function () {
    if ($('#' + overlayUniqueId).length > 0) {
        removeOverlay();
    }
    else {
        createOverlay();
    }
}

var onOverlayUpdate = function () {
    var overlay = $('#' + overlayUniqueId);
    var X = overlay[0].offsetLeft;
    var Y = overlay[0].offsetTop;
    var Opacity = overlay.css('opacity');

    chrome.extension.sendRequest({ Type: 'OverlayChanged', X: X, Y: Y, Opacity: Opacity });
}

