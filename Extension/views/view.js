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
 * PerfectPixel panel view
 */
var PanelView = Backbone.View.extend({
    tagName: 'div',
    className: "chromeperfectpixel-panel",
    id: "chromeperfectpixel-panel",
    fastMoveDistance: 10,

    events: {
        'click .chromeperfectpixel-showHideBtn': 'toggleOverlayShown',
        'click .chromeperfectpixel-min-showHideBtn': 'toggleOverlayShown',
        'click .chromeperfectpixel-lockBtn': 'toggleOverlayLocked',
        'click .chromeperfectpixel-min-lockBtn': 'toggleOverlayLocked',
        'click #chromeperfectpixel-origin-controls button': 'originButtonClick',
        'change .chromeperfectpixel-coords': 'changeOrigin',
        'change #chromeperfectpixel-opacity': 'changeOpacity',
        'changed #chromeperfectpixel-opacity': 'onOpacityChanged',
        'change #chromeperfectpixel-scale': 'changeScale',
        'dblclick #chromeperfectpixel-panel-header': 'panelHeaderDoubleClick'
    },

    initialize: function(options) {
        _.bindAll(this);
        PerfectPixel.bind('change', this.update);
        PerfectPixel.overlays.bind('add', this.appendOverlay);
        PerfectPixel.overlays.bind('remove', this.update);
        PerfectPixel.overlays.bind('change', this.update);
        PerfectPixel.overlays.bind('reset', this.reloadOverlays);
        this.render();

        PerfectPixel.fetch();
        PerfectPixel.overlays.fetch();
    },

    appendOverlay: function(overlay) {
        var itemView = new OverlayItemView({
            model: overlay
        });
        this.$('#chromeperfectpixel-layers').append(itemView.render().el);
        this.update();
    },

    reloadOverlays: function() {
        this.$('#chromeperfectpixel-layers').html('');
        PerfectPixel.overlays.each($.proxy(function(overlay) {
            this.appendOverlay(overlay);
        }, this));
        this.update();
    },

    upload: function(file) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            return;
        }

        this.$('#chromeperfectpixel-progressbar-area').show();

        var overlay = new Overlay();
        overlay.uploadFile(file, $.proxy(function() {
            this.$('#chromeperfectpixel-progressbar-area').hide();
            var uploader = this.$('#chromeperfectpixel-fileUploader');

            // Hack Clear file upload
            uploader.unbind('change');
            uploader.parent().html(uploader.parent().html());
            this._bindFileUploader();

            PerfectPixel.overlays.add(overlay);
            if (ExtOptions.NewLayerMoveToScrollPosition) overlay.set('y',$(window).scrollTop());
            overlay.save();

            if (!PerfectPixel.getCurrentOverlay() || ExtOptions.NewLayerMakeActive) {
                PerfectPixel.setCurrentOverlay(overlay);
            }
            if (ExtOptions.NewLayerShow) PerfectPixel.showOverlay();
            if (ExtOptions.NewLayerUnlock) PerfectPixel.unlockOverlay();
        }, this));
    },

    toggleOverlayShown: function(ev) {
        if ($(ev.currentTarget).is('[disabled]')) return false;
        trackEvent('overlay', PerfectPixel.get('overlayShown') ? 'hide' : 'show');
        PerfectPixel.toggleOverlayShown();
    },

    toggleOverlayLocked: function(ev) {
        if ($(ev.currentTarget).is('[disabled]')) return false;
        trackEvent('overlay', PerfectPixel.get('overlayLocked') ? 'unlock' : 'lock');
        PerfectPixel.toggleOverlayLocked();
    },

    originButtonClick: function(e) {
        var button = this.$(e.currentTarget);
        trackEvent("coords", button.attr('id').replace("chromeperfectpixel-", ""));
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var axis = button.data('axis');
            var offset = button.data('offset');
            if (e.shiftKey) offset *= this.fastMoveDistance;
            if (axis == "x") {
                overlay.save({x: overlay.get('x') - offset});
            } else if (axis == "y") {
                overlay.save({y: overlay.get('y') - offset});
            }
        }
    },

    changeOrigin: function(e) {
        var input = $(e.currentTarget);
        trackEvent("coords", input.attr('id').replace("chromeperfectpixel-", ""));
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var axis = input.data('axis');
            var value = parseInt(input.val());
            isNaN(value) && (value = 0);
            switch (axis) {
                case 'x':
                    overlay.save({x: value});
                    break;
                case 'y':
                    overlay.save({y: value});
                    break;
                default:
                    break;
            }
        }
    },

    changeOpacity: function(e) {
        if (this.$(e.currentTarget).is(":disabled")) { // chrome bug if version < 15.0; opacity input isn't actually disabled
            return;
        }
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var value = this.$(e.currentTarget).val();
            overlay.save({opacity: Number(value).toFixed(1)});
        }
    },

    onOpacityChanged: function(e) {
        trackEvent("opacity", e.type, e.currentTarget.value * 100); // GA tracks only integers not floats
    },

    changeScale: function(e) {
        var value = this.$(e.currentTarget).val();
        trackEvent("scale", e.type, value * 10);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            overlay.save({scale: Number(value).toFixed(1)});
        }
    },

    panelHeaderDoubleClick: function(e) {
        trackEvent(this.$(e.currentTarget).attr('id').replace("chromeperfectpixel-", ""), e.type);

        var panel = this.$el;
        var body = this.$('#chromeperfectpixel-panel-body');
        var panelWidth = panel.width();

        if (body.hasClass('collapsed')) {
            chrome.extension.sendMessage({type: PP_RequestType.PanelStateChange, state: 'open'});
            body.removeClass('collapsed');
            var state = body.data('state');
            if (! state) state = {right: 20 + 'px'};
            $('#chromeperfectpixel-min-buttons').slideUp('fast', function(){
                panel.animate({ right: state.right }, 'fast', function () {
                    body.slideDown( 'fast', function () {
                            $(this).removeAttr('style');
                            panel.draggable('option', 'axis', '');
                        }
                    );
                });
            });
        } else {
            chrome.extension.sendMessage({type: PP_RequestType.PanelStateChange, state: 'collapsed'});
            body.addClass('collapsed');
            body.data('state', { right: panel.css('right') });
            body.slideUp(
                'fast',
                function () {
                    panel.animate({ right: (-panelWidth + 30).toString() + "px" }, function () {
                        panel.draggable('option', 'axis', 'y');
                        $('#chromeperfectpixel-min-buttons').slideDown('fast');
                    });
                }
            );
        }
    },

    keyDown: function(e) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var distance = e.shiftKey ? this.fastMoveDistance : 1;
            if (e.which == 37) { // left
                overlay.save({x: overlay.get('x') - distance});
            }
            else if (e.which == 38) { // up
                overlay.save({y: overlay.get('y') - distance});
            }
            else if (e.which == 39) { // right
                overlay.save({x: overlay.get('x') + distance});
            }
            else if (e.which == 40) { // down
                overlay.save({y: overlay.get('y') + distance});
            }
            else if (e.altKey && e.which == 83) { // Alt + s
                PerfectPixel.toggleOverlayShown();
            }
            else if (e.altKey && e.which == 67) { // Alt + c
                PerfectPixel.toggleOverlayLocked();
            }
            else {
                return;
            }

            e.stopPropagation();
            e.preventDefault();
        }
    },

    update: function() {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay && PerfectPixel.get('overlayShown')) {
            if (!this.overlayView) {
                this.overlayView = new OverlayView();
                $('body').append(this.overlayView.render().el);
            }
            this.$('.chromeperfectpixel-showHideBtn span').text('Hide');
            this.$('.chromeperfectpixel-min-showHideBtn').text('v');
        } else {
            if (this.overlayView) {
                this.overlayView.unrender();
                delete this.overlayView;
            }
            this.$('.chromeperfectpixel-showHideBtn span').text('Show');
            this.$('.chromeperfectpixel-min-showHideBtn').text('i');
        }

        if (this.overlayView) {
            this.overlayView.setLocked(PerfectPixel.get('overlayLocked'));
        }

        var isNoOverlays = (PerfectPixel.overlays.size() == 0);
        var min_btns = this.$('.chromeperfectpixel-min-showHideBtn,.chromeperfectpixel-min-lockBtn');
        isNoOverlays ? min_btns.attr('disabled','') : min_btns.removeAttr('disabled');
        this.$('.chromeperfectpixel-showHideBtn').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn span').text(PerfectPixel.get('overlayLocked') ? 'Unlock' : 'Lock');
        this.$('.chromeperfectpixel-min-lockBtn').text(PerfectPixel.get('overlayLocked') ? 'l' : 'u');
        this.$('#chromeperfectpixel-origin-controls button').button({ disabled: isNoOverlays });
        this.$('input').not('input[type=file]').attr('disabled', function() {
            return isNoOverlays;
        });

        if (overlay) {
            this.$('#chromeperfectpixel-coordX').val(overlay.get('x'));
            this.$('#chromeperfectpixel-coordY').val(overlay.get('y'));
            this.$('#chromeperfectpixel-opacity').val(overlay.get('opacity'));
            this.$('#chromeperfectpixel-scale').val(overlay.get('scale'));
        } else {
            this.$('#chromeperfectpixel-coordX').val('');
            this.$('#chromeperfectpixel-coordY').val('');
            this.$('#chromeperfectpixel-opacity').val(0.5);
            this.$('#chromeperfectpixel-scale').val(1.0);
        }
    },

    render: function() {
        $('body').append(this.$el);
        this.$el.css('background', 'url(' + chrome.extension.getURL('images/noise.jpg') + ')');

        var panelHtml =
            '<div id="chromeperfectpixel-panel-header">' +
            '<div id="chromeperfectpixel-header-logo" style="background:url(' + chrome.extension.getURL("images/icons/16.png") + ');"></div>' +
            '<h1>PerfectPixel</h1>' +
            '</div>' +
            '<div id="chromeperfectpixel-min-buttons">' +
            '<div class="chromeperfectpixel-min-showHideBtn"></div>' +
            '<div class="chromeperfectpixel-min-lockBtn"></div>' +
            '</div>' +

            '<div id="chromeperfectpixel-panel-body">' +
            '<div id="chromeperfectpixel-section-opacity">' +
            '<span>Opacity:</span>' +
            '<input type="range" id="chromeperfectpixel-opacity" min="0" max="1" step="0.01" value="0.5" />' +
            '</div>' +
            '<div id="chromeperfectpixel-section-origin">' +
            '<span>Origin:</span>' +
            '<div id="chromeperfectpixel-origin-controls">' +
            '<button id="chromeperfectpixel-ymore" data-axis="y" data-offset="-1">&darr;</button>' +
            '<button id="chromeperfectpixel-yless" data-axis="y" data-offset="1">&uarr;</button>' +
            '<button id="chromeperfectpixel-xless" data-axis="x" data-offset="1">&larr;</button>' +
            '<button id="chromeperfectpixel-xmore" data-axis="x" data-offset="-1">&rarr;</button>' +
            '<div>' +
            '<div>' +
            '<div class="chromeperfectpixel-coords-label">X:</div>' +
            '<input type="text" class="chromeperfectpixel-coords" data-axis="x" id="chromeperfectpixel-coordX" value="50" size="2" maxlength="4"/>' +
            '</div>' +
            '<div>' +
            '<div class="chromeperfectpixel-coords-label">Y:</div>' +
            '<input type="text" class="chromeperfectpixel-coords" data-axis="y" id="chromeperfectpixel-coordY" value="50" size="2" maxlength="4"/>' +
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
            '</div>';

        this.$el.append(panelHtml);

        var $panel = $('#chromeperfectpixel-panel'),
            $panel_body = $('#chromeperfectpixel-panel-body');

        if (this.options.state == 'collapsed'){
            $panel_body.hide().addClass('collapsed');
            $panel.css('right',(30 - $panel.width()) + 'px');
            $('#chromeperfectpixel-min-buttons').show();
        }

        this.$('#chromeperfectpixel-fakefile').bind('click', function (e) {
            trackEvent("layer", "add", PerfectPixel.overlays.size() + 1);
            $(this).parent().find('input[type=file]').click();
        });
        this._bindFileUploader();

        // Workaround to catch single value of opacity during opacity HTML element change
        (function(el, timeout) {
            var prevVal = el.val();
            var timer, trig=function() { el.trigger("changed"); };
            setInterval(function() {
                var currentVal = el.val();
                if(currentVal != prevVal)
                {
                    if(timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(trig, timeout);
                    prevVal = currentVal;
                }
            }, timeout);
        })(this.$("#chromeperfectpixel-opacity"), 500);

        // make panel draggable
        this.$el.draggable({
            handle: "#chromeperfectpixel-panel-header",
            stop: function (event, ui) {
                // change left to right
                if ($(this).css('left')) {
                    $(this).css('right', ($(document.body).innerWidth() - $(this).offset().left - $(this).outerWidth()).toString() + 'px');
                    $(this).css('left', '');
                }
            }
        });
        if (this.options.state == 'collapsed') $panel.draggable('option', 'axis', 'y');

        // Global hotkeys on
        if (ExtOptions.enableHotkeys) {
            $('body').on('keydown', this.keyDown);
        }

        this.$('button').button();
        this.update();
    },

    destroy: function() {
        //Global hotkeys off
        if (ExtOptions.enableHotkeys) {
            $('body').off('keydown', this.keyDown);
        }

        if (this.overlayView) {
            this.overlayView.unrender();
            delete this.overlayView;
        }

        this.$el.remove();
    },

    /**
     *
     * @private
     */
    _bindFileUploader: function() {
        var self = this;
        var uploader = this.$('#chromeperfectpixel-fileUploader');
        uploader.bind('change', function () {
            self.upload(this.files[0]);
        });
    }
});

/**
 * PerfectPixel panel overlay item view
 */
var OverlayItemView = Backbone.View.extend({
    tagName: 'label',
    className: 'chromeperfectpixel-layer',

    events: {
        'click .chromeperfectpixel-delete':  'remove',
        'click input[name="chromeperfectpixel-selectedLayer"]': 'setCurrentOverlay'
    },

    initialize: function() {
        _.bindAll(this);

        this.model.bind('change', this.render);
        this.model.bind('remove', this.unrender);
        PerfectPixel.bind('change:currentOverlayId', this.update);

        this.update();
    },

    setCurrentOverlay: function() {
        PerfectPixel.setCurrentOverlay(this.model);
    },

    update: function() {
        this.$el.toggleClass('current', PerfectPixel.isOverlayCurrent(this.model));
    },

    render: function() {
        var thumbHeight = 50;
        var coeff = this.model.get('height') / thumbHeight;
        var thumbWidth = Math.ceil(this.model.get('width') / coeff);

        var checkbox = $('<input type=radio name="chromeperfectpixel-selectedLayer" />');
        this.$el.append(checkbox);

        this.model.image.getThumbnailUrlAsync($.proxy(function(thumbUrl) {
            thumbUrl && this.$el.css({'background-image':  'url(' + thumbUrl  + ')'});
        }, this));

        var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>'));
        deleteBtn.button(); // apply css
        this.$el.append(deleteBtn);

        return this;
    },

    unrender: function() {
        this.$el.remove();
    },

    remove: function() {
        var deleteLayerConfirmationMessage = 'Are you sure want to delete layer?';
        trackEvent("layer", "delete", undefined, "attempt");
        if (!ExtOptions.enableDeleteLayerConfirmationMessage || confirm(deleteLayerConfirmationMessage)) {
            trackEvent("layer", "delete", undefined, "confirmed");
            this.model.destroy();
        } else {
            trackEvent("layer", "delete", undefined, "canceled");
        }
    }
});

/**
 * Overlay view
 */
var OverlayView = Backbone.View.extend({
    tagName: 'img',
    className: 'chromeperfectpixel-overlay',
    id: 'chromeperfectpixel-overlay_3985123731465987',
    zIndex: 2147483646,
    smartMovementStickBorder: 1,

    events: {
        'mousewheel': 'mousewheel'
    },

    initialize: function(){
        _.bindAll(this);
        PerfectPixel.bind('change:currentOverlayId', this.updateModel);
        this.updateModel(false);
    },

    /**
     *
     * @param [updateOverlay]
     */
    updateModel: function(updateOverlay) {
        (updateOverlay === undefined) && (updateOverlay = true);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            this.model = overlay;
            this.model.bind('change', this.updateOverlay);

            updateOverlay && this.updateOverlay();
        }
    },

    updateOverlay: function() {
        var width = this.model.get('width') * this.model.get('scale');
        this.$el.css('width', width + 'px')
            .css('left', this.model.get('x') + 'px')
            .css('top', this.model.get('y') + 'px')
            .css('opacity', this.model.get('opacity'));
        this.model.image.getImageUrlAsync($.proxy(function(imageUrl) {
            imageUrl && this.$el.attr('src', imageUrl);
        }, this));
    },

    setLocked: function(value) {
        this.$el.css('pointer-events', value ? 'none' : 'auto');
    },

    mousewheel: function(e) {
        if (e.originalEvent.wheelDelta < 0) {
            this.model.save({opacity: Number(this.model.get('opacity')) - 0.05});
        } else {
            this.model.save({opacity: Number(this.model.get('opacity')) + 0.05});
        }
        e.stopPropagation();
        e.preventDefault();
    },

    startDrag: function(e, ui) {
        // For Smart movement
        ui.helper.data('PPSmart.originalPosition', ui.position || {top: 0, left: 0});
        ui.helper.data('PPSmart.stickBorder', null);
    },

    drag: function(e, ui) {
        var overlay = PerfectPixel.getCurrentOverlay();
        var newPosition = ui.position;

        if (overlay) {
            if(e.shiftKey === true)
            {
                // Smart movement
                var originalPosition = ui.helper.data('PPSmart.originalPosition');
                var deltaX = Math.abs(originalPosition.left - ui.position.left);
                var deltaY = Math.abs(originalPosition.top - ui.position.top);

                var stickBorder = ui.helper.data('PPSmart.stickBorder');
                if(stickBorder == null)
                {
                    // Initialize stick border
                    if(Math.abs(deltaX) >= Math.abs(deltaY)) {
                        stickBorder = { x: this.smartMovementStickBorder, y : 0 };
                    }
                    else {
                        stickBorder = { x: 0, y : this.smartMovementStickBorder };
                    }
                    ui.helper.data('PPSmart.stickBorder', stickBorder);
                }

                //console.log("X: " + deltaX + "; stickBorderX: " + stickBorder.x + " Y: " + deltaY + "; stickBorderY: " + stickBorder.y);

                if(Math.abs(deltaX * stickBorder.x) >  Math.abs(deltaY * stickBorder.y) ||
                  (Math.abs(deltaX * stickBorder.x) == Math.abs(deltaY * stickBorder.y) && stickBorder.x > stickBorder.y)) {
                    newPosition.top = originalPosition.top;
                    overlay.set({x: ui.position.left, y: originalPosition.top});
                }
                else {
                    newPosition.left = originalPosition.left;
                    overlay.set({x: originalPosition.left, y: ui.position.top});
                }
            }
            else
            {
                overlay.set({x: ui.position.left, y: ui.position.top});
                ui.helper.data('PPSmart.stickBorder', null);
            }
        }
        ui.helper.data('PPSmart.originalPosition', newPosition);
        return newPosition;
    },

    stopDrag: function(e, ui) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            overlay.save({x: ui.position.left, y: ui.position.top});
        }
    },

    render: function() {
        this.$el.css({
            'z-index': this.zIndex,
            'margin': 0,
            'padding': 0,
            'position': 'absolute',
            'background-color': 'transparent',
            'display': 'block',
            'cursor': 'all-scroll',
            'height': 'auto',
            'pointer-events' : (PerfectPixel.get('overlayLocked')) ? 'none' : 'auto'
        });
        this.updateOverlay();

        this.$el.draggable({ drag: this.drag, stop: this.stopDrag, start: this.startDrag });

        return this;
    },

    unrender: function() {
        $(this.el).remove();
    }
});