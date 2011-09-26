/// <reference path="vs/chrome_extensions.js" />

// temporary hardcoded
var opacity = 0.5;
var top_px = 50;
var left_px = 50;
var width_px = 300;
var height_px = 300;
var zIndex = 1000;
var overlayUniqueId = 'overlay_3985123731465987';

var createPanel = function () {
    if ($('#chromeperfectpixel-panel').length == 0) {
        var panelHtml =
            '<div id="chromeperfectpixel-panel">' +
                '<h1>ChromePerfectPixel</h1>' +
                'Opacity: <a href="" id="opless" class="ppbutton">&lt;</a>' +
                '<input type="text" id="opacity" size="1" maxlength="3" value="0.5" readonly/>' +
                '<a href="" id="opmore" class="ppbutton">&gt;</a><br/>' +
                'X: <a href="" id="xless" class="ppbutton">&lt;</a>' +
                '<input type="text" class="coords" id="coordX" value="50" size="2" maxlength="4"/>' +
                '<a href="" id="xmore" class="ppbutton">&gt;</a><br/>' +
                'Y:  <a href="" id="yless" class="ppbutton">&lt;</a>' +
                '<input type="text" class="coords" id="coordY" value="50" size="2" maxlength="4"/>' +
                '<a href="" id="ymore" class="ppbutton">&gt;</a>' +

                '<div>Layers:</div>' +
                '<div id="layers"></div>' +

                'Add new layer:' +
                '<div>' +
                    '<input type="file" onchange="upload(this.files, this)" accept="image/*" />' +
                '</div>' +
                '<div>' +
                    '<input type="button" value="Show/Hide" onclick="sendToggleOverlay();" />' +
                    '<input type="button" value="Render" onclick="renderLayers();setCurrentLayer(GlobalStorage.get_CurrentOverlayId());" />' +
                '</div>' +
            '</div>';

        $('body').append(panelHtml);

        $('#chromeperfectpixel-panel').draggable({ handle: "h1" });
    }
}

var removePanel = function () {
    removeOverlay();
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

