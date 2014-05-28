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
    screenBordersElementId: 'chromeperfectpixel-window',
    panelUpdatedFirstTime: true,

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
        'dblclick #chromeperfectpixel-panel-header': 'panelHeaderDoubleClick',
        'click #chromeperfectpixel-closeNotification': 'closeCurrentNotification'
    },

    initialize: function(options) {
        _.bindAll(this);
        PerfectPixel.bind('change', this.update);
        PerfectPixel.overlays.bind('add', this.appendOverlay);
        PerfectPixel.overlays.bind('remove', this.update);
        PerfectPixel.overlays.bind('change', this.update);
        PerfectPixel.overlays.bind('reset', this.reloadOverlays);
        PerfectPixel.notificationModel.on('change:currentNotification', this.updateNotification);

        var view = this;
        chrome.extension.sendMessage({ type: PP_RequestType.getTabId }, function(res) {
            view.model = new Panel({id:res.tabId});
            view.model.fetch();
            view.listenTo(view.model, 'change', view.updatePanel);

            view.render();

            PerfectPixel.fetch();
            PerfectPixel.overlays.fetch();
        });
    },

    updatePanel: function(obj){
        this.$el.toggleClass('hidden', obj.attributes.hidden);
        this.$el.toggleClass('vertical', obj.attributes.vertical);
        if(!this.panelUpdatedFirstTime)
        {
            this.$el.addClass('collapsing');
            this.$el.toggleClass('collapsed', obj.attributes.collapsed, {
                duration: 250,
                complete: $.proxy(function() {
                    this.$el.removeClass('collapsing');
                }, this)
            });
        }
        else
        {
            this.$el.toggleClass('collapsed', obj.attributes.collapsed);
        }

        var position = obj.attributes.position;
        this.$el.css(position);
        for(var index in position) {
            if (position[index] == 0) this.$el.addClass('attached-' + index)
        }
        this.panelUpdatedFirstTime = false;
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
                PerfectPixel.moveCurrentOverlay({x: overlay.get('x') - offset});
            } else if (axis == "y") {
                PerfectPixel.moveCurrentOverlay({y: overlay.get('y') - offset});
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
                    var currentValue = PerfectPixel.moveCurrentOverlay({x: value});
                    input.val(currentValue.x || '');
                    break;
                case 'y':
                    var currentValue = PerfectPixel.moveCurrentOverlay({y: value});
                    input.val(currentValue.y || '');
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
            var input = this.$(e.currentTarget);
            var value = input.val();
            var returnValue = PerfectPixel.changeCurrentOverlayOpacity({opacity: Number(value).toFixed(1)});
            input.val(returnValue.opacity || 1);
        }
    },

    onOpacityChanged: function(e) {
        trackEvent("opacity", e.type, e.currentTarget.value * 100); // GA tracks only integers not floats
    },

    changeScale: function(e) {
        var input = this.$(e.currentTarget);
        var value = input.val();
        trackEvent("scale", e.type, value * 10);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var returnValue = PerfectPixel.scaleCurrentOverlay({scale: Number(value).toFixed(1)});
            input.val(returnValue.scale || 1);
        }
    },

    panelHeaderDoubleClick: function(e) {
        trackEvent(this.$(e.currentTarget).attr('id').replace("chromeperfectpixel-", ""), e.type);

        this.model.toggleCollapsed();
    },

    closeCurrentNotification: function(e){
        var myNotify = PerfectPixel.notificationModel.getCurrentNotification();
        trackEvent("notification", "close", null, myNotify.get("id"));
        PerfectPixel.notificationModel.closeCurrentNotification();
    },

    keyDown: function(e) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            if (!$(e.target).is('input')) {
              var distance = e.shiftKey ? this.fastMoveDistance : 1;
              if (e.which == 37) { // left
                  PerfectPixel.moveCurrentOverlay({x: overlay.get('x') - distance});
              }
              else if (e.which == 38) { // up
                  PerfectPixel.moveCurrentOverlay({y: overlay.get('y') - distance});
              }
              else if (e.which == 39) { // right
                  PerfectPixel.moveCurrentOverlay({x: overlay.get('x') + distance});
              }
              else if (e.which == 40) { // down
                  PerfectPixel.moveCurrentOverlay({y: overlay.get('y') + distance});
              }
            }
            else if (e.altKey && e.which == 83) { // Alt + s
                PerfectPixel.toggleOverlayShown();
            }
            else if (e.altKey && e.which == 67) { // Alt + c
                PerfectPixel.toggleOverlayLocked();
            }
            else if (e.altKey && e.which == 72) { // Alt + H
                this.model.toggleHidden();
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
            this.$('.chromeperfectpixel-showHideBtn span').text(chrome.i18n.getMessage('hide'));
            this.$('.chromeperfectpixel-min-showHideBtn').text('v');
        } else {
            if (this.overlayView) {
                this.overlayView.unrender();
                delete this.overlayView;
            }
            this.$('.chromeperfectpixel-showHideBtn span').text(chrome.i18n.getMessage('show'));
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
        this.$('.chromeperfectpixel-lockBtn span').text(
            PerfectPixel.get('overlayLocked')
                ? chrome.i18n.getMessage('unlock')
                : chrome.i18n.getMessage('lock'));
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

    updateNotification: function() {
        var myNotify = PerfectPixel.notificationModel.getCurrentNotification(),
            box = $('#chromeperfectpixel-notification-box'),
            textDiv = $('#chromeperfectpixel-notification-text'),
            button = $('#chromeperfectpixel-closeNotification');
        if (myNotify) {
            textDiv.html(myNotify.getText());
            button.data("id", myNotify.get("id"));
            trackEvent("notification", "show", null, myNotify.get("id"));
            box.show();
        } else {
            box.hide();
        }
    },

    togglePanelShown: function(){
        $('#chromeperfectpixel-panel').toggle();
        var new_state = $('#chromeperfectpixel-panel').is(':visible') ? 'open' : 'hidden';
        chrome.extension.sendMessage({type: PP_RequestType.PanelStateChange, state: new_state});
    },

    render: function() {
        $('body').append(this.$el).append('<div id="' + this.screenBordersElementId + '"/>');
        this.$el.css('background', 'url(' + chrome.extension.getURL('images/noise.jpg') + ')');
        this.$el.addClass(chrome.i18n.getMessage("panel_css_class"));

        var panelHtml =
            '<div id="chromeperfectpixel-panel-header">' +
            '<div id="chromeperfectpixel-header-logo" style="background:url(' + chrome.extension.getURL("images/icons/16.png") + ') center center no-repeat;"></div>' +
            '<h1>' + chrome.i18n.getMessage("extension_name_short") + '</h1>' +
            '</div>' +
            '<div id="chromeperfectpixel-min-buttons">' +
            '<div class="chromeperfectpixel-min-showHideBtn"></div>' +
            '<div class="chromeperfectpixel-min-lockBtn"></div>' +
            '</div>' +
            '<div id="chromeperfectpixel-panel-body">' +

            '<div id="chromeperfectpixel-notification-box">' +
            '<div id="chromeperfectpixel-notification-text"></div>' +
            '<div id="chromeperfectpixel-closeNotification">x</div>' +
            '</div>' +

            '<div id="chromeperfectpixel-section">'+
            '<div id="chromeperfectpixel-section-opacity">' +
            '<span>' + chrome.i18n.getMessage("opacity") + ':</span>' +
            '<input type="range" id="chromeperfectpixel-opacity" min="0" max="1" step="0.01" value="0.5" />' +
            '</div>' +

            '<div id="chromeperfectpixel-section-origin">' +
            '<span>' + chrome.i18n.getMessage("origin") + ':</span>' +
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

            '<div>' + chrome.i18n.getMessage("layers") + ':</div>' +
            '<div id="chromeperfectpixel-section-scale">' +
            '<div id="chromeperfectpixel-section-scale-label">' + chrome.i18n.getMessage("scale") + ':</div>' +
            '<input type="number" id="chromeperfectpixel-scale" value="1.0" size="3" min="0.1" max="10" step="0.1"/>' +
            '</div>' +
            '<div id="chromeperfectpixel-layers"></div>' +

            '<div id="chromeperfectpixel-progressbar-area" style="display: none">' + chrome.i18n.getMessage("loading")  + '...</div>' +

            '<div id="chromeperfectpixel-buttons">' +
            '<button class="chromeperfectpixel-showHideBtn" title="Hotkey: Alt + S" style="margin-right: 5px; float:left;">' + chrome.i18n.getMessage("show") + '</button>' +
            '<button class="chromeperfectpixel-lockBtn" title="Hotkey: Alt + C" style="margin-right: 5px; float:left;">' + chrome.i18n.getMessage("lock") + '</button>' +
            '<div id="chromeperfectpixel-upload-area">' +
            '<button id="chromeperfectpixel-fakefile">' + chrome.i18n.getMessage("add_new_layer") + '</button>' +
            '<span><input id="chromeperfectpixel-fileUploader" type="file" accept="image/*" /></span>' +
            '</div>' +
            '</div>' +
            '</div>'+
            '</div>';

        this.$el.append(panelHtml);

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
        var panelModel = this.model;
        var view = this;
        this.$el.draggable({
            handle: "#chromeperfectpixel-panel-header",
            snap: "#" + this.screenBordersElementId,
            snapMode: "inner",
            scroll: false,
            stop: function( event, ui ) {
                var $window = $(window),
                    screenWidth = $window.width(),
                    screenHeight = $('#' + view.screenBordersElementId).height(),
                    $panel = $(event.target),
                    position = {
                        left: ui.position.left,
                        top: ui.position.top,
                        right: screenWidth - (ui.position.left + $panel.width()),
                        bottom: screenHeight - (ui.position.top + $panel.height())
                    },
                    outOfBoundaries = false,
                    new_params = {};

                for(var index in position) {
                    var val = position[index];
                    if (val < 0) {
                        outOfBoundaries = true;
                        position[index] = 0;
                    }
                }
                position.right == 0 ? position.left = 'auto' : position.right = 'auto';
                position.bottom == 0 ? position.top = 'auto' : position.bottom = 'auto';

                new_params.position = position;

                if (outOfBoundaries && ! panelModel.get('collapsed')) {
                    new_params.collapsed = true;
                    new_params.auto_collapsed = true;
                }

                if ((position.top == 0 || position.bottom == 0) && (position.left != 0 && position.right != 0)){
                    new_params.vertical = false;
                }
                else if ((position.left == 0 || position.right == 0) && (position.top != 0 && position.bottom != 0)){
                    new_params.vertical = true;
                }

                if (panelModel.get('collapsed') && panelModel.get('auto_collapsed')
                    && position.top != 0 && position.right != 0 && position.bottom != 0 && position.left != 0){
                    new_params.collapsed = false;
                    new_params.auto_collapsed = false;
                }

                panelModel.save(new_params)
            },
            start: function(){
                $("#chromeperfectpixel-panel")
                    .css({bottom:'auto',right: 'auto'})
                    .removeClass('attached-top attached-left attached-right attached-bottom');
            }
        });

        this.updatePanel(this.model);

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
        $('#' + this.screenBordersElementId).remove();
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
        if (this.$el.find('.chromeperfectpixel-delete').size() == 0){
            var checkbox = $('<input type=radio name="chromeperfectpixel-selectedLayer" />');
            this.$el.append(checkbox);

            var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>'));
            deleteBtn.button(); // apply css
            this.$el.append(deleteBtn);
        }

        this.model.image.getThumbnailUrlAsync($.proxy(function(thumbUrl) {
            thumbUrl && this.$el.css({'background-image':  'url(' + thumbUrl  + ')'});
        }, this));

        return this;
    },

    unrender: function() {
        this.$el.remove();
    },

    remove: function() {
        var deleteLayerConfirmationMessage = chrome.i18n.getMessage('are_you_sure_you_want_to_delete_layer');
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
            PerfectPixel.moveCurrentOverlay({x: ui.position.left, y: ui.position.top});
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
