// temporary hardcoded
var opacity = 0.5;
var top_px = 50;
var left_px = 50;
var width_px = 300;
var height_px = 300;
var zIndex = 1000;
var overlayUniqueId = 'overlay_3985123731465987';

var createOverlay = function()
{
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
            'position': 'absolute',
            'top': top_px + 'px',
            'left': left_px + 'px',
            'background-color': 'transparent',
            'opacity': opacity,
            'display': 'block',
            'cursor': 'all-scroll'
        });
        $('body').append(overlay);

        overlay.draggable();
    }
}

var toggleOverlay = function () {
    if ($('#' + overlayUniqueId).length > 0) {
        $('#' + overlayUniqueId).attr('src', '');
        $('#' + overlayUniqueId).remove();
    }
    else {
        createOverlay();
    }
}

