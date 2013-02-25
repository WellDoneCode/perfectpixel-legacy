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

var PanelView = Backbone.View.extend({
    el: $('body'),

    events: {
        'click .chromeperfectpixel-showHideBtn': 'toggleOverlayShown',
        'click .chromeperfectpixel-lockBtn': 'toggleOverlayLocked',
        'click #chromeperfectpixel-origin-controls button': 'originButtonClick',
        'change #chromeperfectpixel-opacity': 'changeOpacity',
        'change #chromeperfectpixel-scale': 'changeScale',
        'dblclick #chromeperfectpixel-panel-header': 'panelHeaderDoubleClick'
    },

    initialize: function(options) {
        _.bindAll(this);
        PerfectPixel.bind('change', this.update);
        PerfectPixel.overlays.bind('add', this.appendOverlay);
        PerfectPixel.overlays.bind('remove', this.update);
        PerfectPixel.overlays.bind('change', this.update);
        this.render();
    },

    appendOverlay: function(overlay) {
        var itemView = new OverlayItemView({
            model: overlay
        });
        $('#chromeperfectpixel-layers').append(itemView.render().el);
        this.update();
    },

    upload: function(file) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            return;
        }

        $('#chromeperfectpixel-progressbar-area').show();

        var overlay = new Overlay();
        overlay.uploadFile(file, $.proxy(function() {
            $('#chromeperfectpixel-progressbar-area').hide();
            this._bindFileUploader({rebind: true});
            PerfectPixel.overlays.add(overlay);
        }, this));
    },

    toggleOverlayShown: function() {
        PerfectPixel.toggleOverlayShown();
    },

    toggleOverlayLocked: function() {
        PerfectPixel.toggleOverlayLocked();
    },

    originButtonClick: function(e) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var button = $(e.currentTarget);
            var axis = button.data('axis');
            var offset = button.data('offset');
            if (axis == "x") {
                overlay.set('x', overlay.get('x') - offset);
            } else if (axis == "y") {
                overlay.set('y', overlay.get('y') - offset);
            }
        }
    },

    changeOpacity: function(e) {
        if ($(e.currentTarget).is(":disabled")) { // chrome bug if version < 15.0; opacity input isn't actually disabled
            return;
        }
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var value = $(e.currentTarget).val();
            overlay.set('opacity', Number(value).toFixed(1));
        }
    },

    changeScale: function(e) {
        trackEvent("scale", e.type, value * 10);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var value = $(e.currentTarget).val();
            overlay.set('scale', Number(value).toFixed(1));
        }
    },

    panelHeaderDoubleClick: function(e) {
        trackEvent($(e.currentTarget).attr('id').replace("chromeperfectpixel-", ""), event.type);

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
        } else {
            body.addClass('collapsed');
            body.data('state', {
                height: body.innerHeight(),
                paddingBottom: body.css('padding-bottom'),
                right: panel.css('right')
            });
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
    },

    update: function() {
        if (PerfectPixel.get('overlayShown')) {
            if (!this.overlayView) {
                this.overlayView = new OverlayView({
                    model: PerfectPixel.getCurrentOverlay()
                });
                this.$el.append(this.overlayView.render().el);
            }
            this.$('.chromeperfectpixel-showHideBtn span').text('Hide');
        } else {
            if (this.overlayView) {
                this.overlayView.unrender();
                delete this.overlayView;
            }
            this.$('.chromeperfectpixel-showHideBtn span').text('Show');
        }

        if (this.overlayView) {
            this.overlayView.setLocked(PerfectPixel.get('overlayLocked'));
        }

        var isNoOverlays = (PerfectPixel.overlays.size() == 0);
        this.$('.chromeperfectpixel-showHideBtn span').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn span').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn span').text(PerfectPixel.get('overlayLocked') ? 'Unlock' : 'Lock');
        this.$('#chromeperfectpixel-origin-controls button').button({ disabled: isNoOverlays });
        this.$('input').not('input[type=file]').attr('disabled', function() {
            return isNoOverlays;
        });

        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            this.$('#chromeperfectpixel-coordX').val(overlay.get('x'));
            this.$('#chromeperfectpixel-coordY').val(overlay.get('y'));
            this.$('#chromeperfectpixel-opacity').val(overlay.get('opacity'));
        } else {
            this.$('#chromeperfectpixel-coordX').val('');
            this.$('#chromeperfectpixel-coordY').val('');
            this.$('#chromeperfectpixel-opacity').val(0.5);
        }
    },

    render: function() {
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
                    '<button id="chromeperfectpixel-ymore" data-axis="y" data-offset="-1">&darr;</button>' +
                    '<button id="chromeperfectpixel-yless" data-axis="y" data-offset="1">&uarr;</button>' +
                    '<button id="chromeperfectpixel-xless" data-axis="x" data-offset="1">&larr;</button>' +
                    '<button id="chromeperfectpixel-xmore" data-axis="x" data-offset="-1">&rarr;</button>' +
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

            this.$el.append(panelHtml);

            $('#chromeperfectpixel-fakefile').bind('click', function (e) {
                //trackEvent("layer", "add", PPStorage.GetOverlaysCount() + 1);
                $(this).parent().find('input[type=file]').click();
            });
            this._bindFileUploader();

//            $('#chromeperfectpixel-layers input[name="chromeperfectpixel-selectedLayer"]').live('click', function (e) {
//                // Live handler called.
//                //trackEvent("layer", "select");
//                var overlayId = $(this).parents('.chromeperfectpixel-layer').data('Id');
//                Controller.setCurrentLayer(overlayId);
//            });

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
//
//            // TODO need to be fixed, doesn't work now
//            $('.chromeperfectpixel-coords').change("keypress", function (e) {
//                var id = $(this).attr("id");
//                trackEvent("coords", id.replace("chromeperfectpixel-", ""));
//
//                if (e.which == 13) {
//                    Controller.coordsKeyPressed(id, $(this).val());
//                }
//            });

            // make panel draggable
            $('#chromeperfectpixel-panel').draggable({
                handle: "#chromeperfectpixel-panel-header",
                stop: function (event, ui) {
                    // change left to right
                    if ($(this).css('left')) {
                        $(this).css('right', ($(document.body).innerWidth() - $(this).offset().left - $(this).outerWidth()).toString() + 'px');
                        $(this).css('left', '');
                    }
                }
            });

            $('#chromeperfectpixel-panel button').button();
            this.update();

            // Global hotkeys on
            if (ExtOptions.enableHotkeys) {
                $(document.body).attr('data-chromeperfectpixel-oldonkeydown', document.body.onkeydown);
                document.body.onkeydown = Controller.onKeyDown;
            }
        }
    },

    destroy: function() {
        //Global hotkeys off
        if (ExtOptions.enableHotkeys) {
            var oldonkeydown = $(document.body).attr('data-chromeperfectpixel-oldonkeydown');
            if (!oldonkeydown) {
                oldonkeydown = null;
            }
            document.body.onkeydown = oldonkeydown;
            $(document.body).removeAttr('data-chromeperfectpixel-oldonkeydown');
        }

        if ($('#chromeperfectpixel-panel').length > 0) {
            $('#chromeperfectpixel-panel').remove();
        }
    },

    /**
     *
     * @param [options]
     * @param [options.rebind]
     * @private
     */
    _bindFileUploader: function(options) {
        var uploader = $('#chromeperfectpixel-fileUploader');
        if (options && options.rebind) {
            // Hack Clear file upload
            uploader.unbind('change');
            uploader.parent().html(uploader.parent().html());
        }
        var self = this;
        uploader.bind('change', function () {
            self.upload(this.files[0]);
        });
    }
});

var OverlayItemView = Backbone.View.extend({
    tagName: 'label',
    className: 'chromeperfectpixel-layer',

    events: {
        'click .chromeperfectpixel-delete':  'remove'
    },

    initialize: function(){
        _.bindAll(this);

        this.model.bind('change', this.render);
        this.model.bind('remove', this.unrender);
    },

    render: function() {
        var thumbHeight = 50;
        var coeff = this.model.get('height') / thumbHeight;
        var thumbWidth = Math.ceil(this.model.get('width') / coeff);

        var checkbox = $('<input type=radio name="chromeperfectpixel-selectedLayer" />');
        this.$el.append(checkbox);

        if (!ExtOptions.classicLayersSection) {
            this.$el.css({'background-image':  'url(' + this.model.get('url')  + ')'});
        } else {
            var thumb = $('<img />', {
                class: 'chromeperfectpixel-thumb',
                src: this.model.get('url'),
                css: {
                    width: thumbWidth + 'px',
                    height: thumbHeight + 'px'
                }
            });
            this.$el.append($('<div class="chromeperfectpixel-thumbwrapper"></div>').append(thumb));
        }

        var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>'));
        deleteBtn.button(); // apply css
        this.$el.append(deleteBtn);

        return this;
    },

    unrender: function() {
        this.$el.remove();
    },

    remove: function() {
        this.model.destroy();
    }
});

var OverlayView = Backbone.View.extend({
    tagName: 'img',
    className: 'chromeperfectpixel-overlay',
    id: 'chromeperfectpixel-overlay_3985123731465987',
    zIndex: 2147483646,

    events: {
        'mousewheel': 'mousewheel'
    },

    initialize: function(){
        _.bindAll(this);

        this.model.bind('change', this.updateOverlay);
        this.model.bind('remove', this.unrender);
    },

    updateOverlay: function() {
        var width = this.model.get('width') * this.model.get('scale');
        this.$el.attr('src', this.model.get('url'))
            .css('width', width + 'px')
            .css('left', this.model.get('x') + 'px')
            .css('top', this.model.get('y') + 'px')
            .css('opacity', this.model.get('opacity'));
    },

    setLocked: function(value) {
        this.$el.css('pointer-events', value ? 'none' : 'auto');
    },

    mousewheel: function(e) {
        if (e.originalEvent.wheelDelta < 0) {
            this.model.set('opacity', Number(this.model.get('opacity')) - 0.05);
        } else {
            this.model.set('opacity', Number(this.model.get('opacity')) + 0.05);
        }
        e.stopPropagation();
        e.preventDefault();
    },

    drag: function(e, ui) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            overlay.set('x', ui.position.left);
            overlay.set('y', ui.position.top);
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

        this.$el.draggable({ stop: this.drag });

        return this;
    },

    unrender: function() {
        $(this.el).remove();
    }
});