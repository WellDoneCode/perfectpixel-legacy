// SAMPLE
this.manifest = {
    "name": "PerfectPixel by WellDoneCode",
    "icon": "../../images/icons/30.png",
    "settings": [
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get('debug'),
            "name": "debugMode",
            "type": "checkbox",
            "label": this.i18n.get('enable_debug_mode')
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get('supported_by_ad'),
            "name": "disableSupportedByAd",
            "type": "checkbox",
            "label": this.i18n.get('disable_supported_by_ad')
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get('mouse_and_keyboard'),
            "name": "enableHotkeys",
            "type": "checkbox",
            "label": this.i18n.get('enable_hotkeys')
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get('mouse_and_keyboard'),
            "name": "enableMousewheelOpacity",
            "type": "checkbox",
            "label": this.i18n.get('enable_mousewheel_opacity')
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("behavior"),
            "name": "rememberPanelOpenClosedState",
            "type": "checkbox",
            "label": this.i18n.get("remember_panel_state")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("behavior"),
            "name": "enableDeleteLayerConfirmationMessage",
            "type": "checkbox",
            "label": this.i18n.get("enable_confirmation_message")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("behavior"),
            "name": "allowPositionChangeWhenLocked",
            "type": "checkbox",
            "label": this.i18n.get("allow_position_change_when_locked")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("behavior"),
            "name": "allowHotkeysPositionChangeWhenLocked",
            "type": "checkbox",
            "label": this.i18n.get("allow_hotkeys_position_change_when_locked")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("new_layer_behavior"),
            "name": "NewLayerMoveToScrollPosition",
            "type": "checkbox",
            "label": this.i18n.get("place_to_current_scroll_position")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("new_layer_behavior"),
            "name": "NewLayerMakeActive",
            "type": "checkbox",
            "label": this.i18n.get("make_active")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("new_layer_behavior"),
            "name": "NewLayerShow",
            "type": "checkbox",
            "label": this.i18n.get("show")
        },
        {
            "tab": this.i18n.get('general'),
            "group": this.i18n.get("new_layer_behavior"),
            "name": "NewLayerUnlock",
            "type": "checkbox",
            "label": this.i18n.get("unlock")
        },
        {
            "tab": this.i18n.get("general"),
            "group": this.i18n.get("statistics"),
            "name": "enableStatistics",
            "type": "checkbox",
            "label": this.i18n.get("send_anonymous_statistics_to_developers")
        },
        {
            "tab": this.i18n.get('appearance'),
            "group": this.i18n.get("design"),
            "name": "customCssCode",
            "type": "textarea",
            "label": this.i18n.get("custom_css_code")
        }
//    "alignment": [
//        [
//            "username",
//            "password"
//        ],
//        [
//            "noti_volume",
//            "sound_volume"
//        ]
    ]
};
