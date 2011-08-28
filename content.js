// temporary hardcoded
var opacity = 0.5;
var top_px = 50;
var left_px = 50;
var width_px = 300;
var height_px = 300;
var zIndex = 1000;

var overlayUniqueId = 'overlay_3985123731465987';
if ($('#' + overlayUniqueId).length > 0) {
    //$('#' + overlayUniqueId).remove();
}
else {    
    var overlay = $('<div></div>');
    overlay.attr({
        'id': overlayUniqueId
    }).css({
        'z-index': zIndex,
        'width': width_px + 'px',
        'height': height_px + 'px',
        'position': 'absolute',
        'top': top_px + 'px',
        'left': left_px + 'px',
        'background-color': 'red',
        'opacity': opacity,
        'cursor': 'all-scroll'
    });
    $('body').append(overlay);
    
    overlay.draggable();
}
