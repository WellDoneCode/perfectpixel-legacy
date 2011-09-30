/// <reference path="vs/chrome_extensions.js" />

var createPanel = function () {
    if ($('#chromeperfectpixel-panel').length == 0) {
        var panelHtml =
            '<div id="chromeperfectpixel-panel">' +
                '<div id="chromeperfectpixel-panel-header">' +
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
                    '<div id="chromeperfectpixel-layers"></div>' +

                    '<div id="chromeperfectpixel-buttons">' +
                        '<button id="chromeperfectpixel-showHideBtn" style="margin-right: 5px; float:left;">Show/Hide</button>' +

                        '<div id="chromeperfectpixel-upload-area">' +
                            '<button id="chromeperfectpixel-fakefile">Add new layer</button>' +
                            '<span><input id="chromeperfectpixel-fileUploader" type="file" accept="image/*" /></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        $('body').append(panelHtml);

        // Set event handlers
        $('#chromeperfectpixel-showHideBtn').bind('click', function () {
            ChromePerfectPixel.toggleOverlay();
        });

        $('#chromeperfectpixel-fakefile').bind('click', function () {
            $(this).parent().find('input[type=file]').click();
        });
        $('#chromeperfectpixel-fileUploader').bind('change', function () {
            ChromePerfectPixel.upload(this.files, this);
        });

        $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]').live('click', function () {
            // Live handler called.
            var overlayId = $(this).parents('.chromeperfectpixel-layer').data('Id');
            ChromePerfectPixel.setCurrentLayer(overlayId);
        });

        $('#chromeperfectpixel-opacity').change(function () {
            ChromePerfectPixel.opacity($(this));
        });

        $('#chromeperfectpixel-origin-controls button').live("click", function (event) {
            event.preventDefault();
            if ($(this).attr('id') == "chromeperfectpixel-xless" || $(this).attr('id') == "chromeperfectpixel-xmore") {
                ChromePerfectPixel.xleft($(this));
            }
            if ($(this).attr('id') == "chromeperfectpixel-yless" || $(this).attr('id') == "chromeperfectpixel-ymore") {
                ChromePerfectPixel.xtop($(this));
            }
        });

        $('.chromeperfectpixel-coords').live("keypress", function (event) {
            if (event.which == 13) {
                if ($(this).attr("id") == "chromeperfectpixel-coordX")
                    ChromePerfectPixel.change(false, $(this).val(), false);
                if ($(this).attr("id") == "chromeperfectpixel-coordY")
                    ChromePerfectPixel.change(false, false, $(this).val());
            }
        });

        // On load
        $('#chromeperfectpixel-panel').draggable({ handle: "#chromeperfectpixel-panel-header" });
        $('#chromeperfectpixel-panel-header').dblclick(function () {
            $('#chromeperfectpixel-panel-body').toggle();
        });

        $('#chromeperfectpixel-panel button').button();
        ChromePerfectPixel.renderLayers();
    }
}

var removePanel = function () {
    ChromePerfectPixel.removeOverlay();
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
    var default_top_px = 50;
    var default_left_px = 50;
    var default_width_px = 300;
    var default_height_px = 300;
    var default_zIndex = 1000;
    var overlayUniqueId = 'chromeperfectpixel-overlay_3985123731465987';

    this.get_KeyboardEnabled = function () {
        return true;
    }

    // Overlay
    this.createOverlay = function () {
        if ($('#' + overlayUniqueId).length > 0) {
        }
        else {
            var overlay = $('<img />');
            overlay.attr({
                'id': overlayUniqueId
            }).css({
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
                'cursor': 'all-scroll'
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

            if (ChromePerfectPixel.get_KeyboardEnabled()) {
                $(document.body).attr('data-chromeperfectpixel-oldonkeydown', document.body.onkeydown);
                document.body.onkeydown = ChromePerfectPixel.onKeyDown;
            }

            overlay.draggable({
                drag: ChromePerfectPixel.onOverlayUpdate,
                stop: function () {
                    ChromePerfectPixel.onOverlayUpdate(true);
                }
            });
        }

        // Set overlay data
        var overlayObj = PPStorage.GetOverlay(GlobalStorage.get_CurrentOverlayId());

        if (overlayObj != null) {
            $('#' + overlayUniqueId).attr('src', '');
            $('#' + overlayUniqueId).attr('src', overlayObj.Url)
                .css('width', overlayObj.Width + 'px').css('height', overlayObj.Height + 'px')
                .css('left', overlayObj.X + 'px').css('top', overlayObj.Y + 'px')
                .css('opacity', overlayObj.Opacity);
        }
    }

    this.removeOverlay = function () {
        if (ChromePerfectPixel.get_KeyboardEnabled()) {
            var oldonkeydown = $(document.body).attr('data-chromeperfectpixel-oldonkeydown');
            if (!oldonkeydown)
                oldonkeydown = null;
            document.body.onkeydown = oldonkeydown;
            $(document.body).removeAttr('data-chromeperfectpixel-oldonkeydown');
        }

        if ($('#' + overlayUniqueId).length > 0) {
            $('#' + overlayUniqueId).attr('src', '');
            $('#' + overlayUniqueId).unbind();
            $('#' + overlayUniqueId).remove();
        }
    }

    this.toggleOverlay = function () {
        if ($('#' + overlayUniqueId).length > 0) {
            ChromePerfectPixel.removeOverlay();
        }
        else {
            ChromePerfectPixel.createOverlay();
        }
    }

    this.onOverlayUpdate = function (isStop) {
        var overlay = $('#' + overlayUniqueId);
        var x = overlay[0].offsetLeft;
        var y = overlay[0].offsetTop;
        var opacity = overlay.css('opacity');

        ChromePerfectPixel.updateCoordsUI(x, y, opacity);

        if (isStop) {
            // update storage
            PPStorage.UpdateOverlayPosition(GlobalStorage.get_CurrentOverlayId(), { X: x, Y: y, Opacity: opacity });
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
        else
            return;

        event.stopPropagation();
        event.preventDefault();
        ChromePerfectPixel.onOverlayUpdate(true);
    }

    // Layers
    this.renderLayers = function () {
        // disable controls
        ChromePerfectPixel.updateCoordsUI(default_left_px, default_top_px, default_opacity);
        $('.chromeperfectpixel-coords').attr('disabled', true);
        $('#chromeperfectpixel-opacity').attr('disabled', true);
        $('#chromeperfectpixel-showHideBtn').button("option", "disabled", true);
        $('#chromeperfectpixel-origin-controls button').button("option", "disabled", true);

        var container = $('#chromeperfectpixel-layers');
        container.empty();
        var overlays = PPStorage.GetOverlays();
        for (var i = 0; i < overlays.length; i++) {
            ChromePerfectPixel.renderLayer(overlays[i]);
        }

        // enable controls
        if (overlays.length > 0) {
            ChromePerfectPixel.enableLayerControls();
        }
        ChromePerfectPixel.setCurrentLayer(GlobalStorage.get_CurrentOverlayId());
    }

    this.renderLayer = function (overlay) {
        var container = $('#chromeperfectpixel-layers');
        var layer = $('<div></div>', {
            class: 'chromeperfectpixel-layer',
            data: {
                Id: overlay.Id
            }
        });
        var thumbHeight = 50;
        var coeff = overlay.Height / thumbHeight;
        var thumbWidth = Math.ceil(overlay.Width / coeff);
        var thumb = $('<img />', {
            class: 'chromeperfectpixel-thumb',
            src: overlay.Url,
            css: {
                width: thumbWidth + 'px',
                height: thumbHeight + 'px'
            }
        });

        var checkbox = ($('<input type=radio name="chromeperfectpixel-selectedLayer" />'));
        layer.append(checkbox);
        layer.append($('<div class="chromeperfectpixel-thumbwrapper"></div>').append(thumb));
        var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>')); //($('<input type=button class="chromeperfectpixel-delete" value="X" />'));
        deleteBtn.bind('click', function () {
            ChromePerfectPixel.deleteLayer($(this).parents('.chromeperfectpixel-layer'));
        });
        deleteBtn.button(); // apply css

        layer.append(deleteBtn);
        container.append(layer);
    }

    this.enableLayerControls = function () {
        $('.chromeperfectpixel-coords').attr('disabled', false);
        $('#chromeperfectpixel-opacity').attr('disabled', false);
        $('#chromeperfectpixel-showHideBtn').button("option", "disabled", false);
        $('#chromeperfectpixel-origin-controls button').button("option", "disabled", false);
    }

    this.deleteLayer = function (layer) {
        if (confirm('Are you sure want to delete layer?')) {
            var overlayId = $(layer).data('Id');
            PPStorage.DeleteOverlay(overlayId);

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
        }
    }

    this.setCurrentLayer = function (overlayId) {
        if (PPStorage.GetOverlaysCount() == 0)
            return;

        if (!overlayId || overlayId == null)
            overlayId = 0;

        $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]').removeAttr('checked');
        $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]').filter(function () {
            return $(this).parents('.chromeperfectpixel-layer').data("Id") == overlayId
        }).attr('checked', 'checked');

        GlobalStorage.set_CurrentOverlayId(overlayId);
        var overlay = PPStorage.GetOverlay(GlobalStorage.get_CurrentOverlayId());
        ChromePerfectPixel.updateCoordsUI(overlay.X, overlay.Y, overlay.Opacity);
        ChromePerfectPixel.createOverlay();
    }

    // end Layers

    this.upload = function (files, uploadElem) {
        file = files[0];

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

        PPStorage.SaveOverlayFromFile(file,
        function (overlay) {
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
    }

    // UI

    this.updateCoordsUI = function (x, y, opacity) {
        $('#chromeperfectpixel-coordX').val(x);
        $('#chromeperfectpixel-coordY').val(y);
        $('#chromeperfectpixel-opacity').val(Number(opacity).toFixed(1));
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

    this.change = function (opacity, left, top) {
        var overlay = $('#' + overlayUniqueId);
        if (opacity != false)
            overlay.css('opacity', opacity);
        if (left != false || Number(left) == 0) {
            overlay.css('left', left + "px");
        }
        if (top != false || Number(top) == 0) {
            overlay.css('top', top + "px");
        }
        ChromePerfectPixel.onOverlayUpdate(true);
    }
}

