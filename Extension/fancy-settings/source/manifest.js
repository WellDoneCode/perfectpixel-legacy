// SAMPLE
this.manifest = {
    "name": "PerfectPixel by WellDoneCode",
    "icon": "../../images/icons/30.png",
    "settings": [
        {
            "tab": "General",
            "group": "Debug",
            "name": "debugMode",
            "type": "checkbox",
            "label": "DEBUG mode"
        },
        {
            "tab": "General",
            "group": "Mouse and Keyboard",
            "name": "enableHotkeys",
            "type": "checkbox",
            "label": "Enable Hotkeys<br/><br/>Hotkeys list:<br/> Alt + S - Show/Hide overlay<br/> Alt + C - Lock/Unlock overlay<br/> ↑  - Move overlay up<br/> ↓  - Move overlay down<br/> ← - Move overlay left<br/> → - Move overlay right<br/> Shift + ↑, ↓, ←, → - Move overlay with 10x speed"
        },
        {
            "tab": "General",
            "group": "Behavior",
            "name": "rememberPanelOpenClosedState",
            "type": "checkbox",
            "label": "Remember panel state<br>When enabled panel will be re-opened when you browse to another page or reload current if it was opened before that."
        },
        {
            "tab": "General",
            "group": "Behavior",
            "name": "enableDeleteLayerConfirmationMessage",
            "type": "checkbox",
            "label": "Enable confirmation messages<br>Confirmation message will appear when you attempt to delete layer."
        },
        {
            "tab": "General",
            "group": "Statistics",
            "name": "enableStatistics",
            "type": "checkbox",
            "label": "Send anonymous statistics to developers"
        },
        {
            "tab": "Appearance",
            "group": "Design",
            "name": "customCssCode",
            "type": "textarea",
            "label": "Custom CSS Code"
        }
//        {
//            "tab": i18n.get("information"),
//            "group": i18n.get("login"),
//            "name": "username",
//            "type": "text",
//            "label": i18n.get("username"),
//            "text": i18n.get("x-characters")
//        },
//        {
//            "tab": i18n.get("information"),
//            "group": i18n.get("login"),
//            "name": "password",
//            "type": "text",
//            "label": i18n.get("password"),
//            "text": i18n.get("x-characters-pw"),
//            "masked": true
//        },
//        {
//            "tab": i18n.get("information"),
//            "group": i18n.get("login"),
//            "name": "myDescription",
//            "type": "description",
//            "text": i18n.get("description")
//        },
//        {
//            "tab": i18n.get("information"),
//            "group": i18n.get("logout"),
//            "name": "myCheckbox",
//            "type": "checkbox",
//            "label": i18n.get("enable")
//        },
//        {
//            "tab": i18n.get("information"),
//            "group": i18n.get("logout"),
//            "name": "myButton",
//            "type": "button",
//            "label": i18n.get("disconnect"),
//            "text": i18n.get("logout")
//        },
//        {
//            "tab": "Details",
//            "group": "Sound",
//            "name": "noti_volume",
//            "type": "slider",
//            "label": "Notification volume:",
//            "max": 1,
//            "min": 0,
//            "step": 0.01,
//            "display": true,
//            "displayModifier": function (value) {
//                return (value * 100).floor() + "%";
//            }
//        },
//        {
//            "tab": "Details",
//            "group": "Sound",
//            "name": "sound_volume",
//            "type": "slider",
//            "label": "Sound volume:",
//            "max": 100,
//            "min": 0,
//            "step": 1,
//            "display": true,
//            "displayModifier": function (value) {
//                return value + "%";
//            }
//        },
//        {
//            "tab": "Details",
//            "group": "Food",
//            "name": "myPopupButton",
//            "type": "popupButton",
//            "label": "Soup 1 should be:",
//            "options": {
//                "groups": [
//                    "Hot", "Cold",
//                ],
//                "values": [
//                    {
//                        "value": "hot",
//                        "text": "Very hot",
//                        "group": "Hot",
//                    },
//                    {
//                        "value": "Medium",
//                        "group": 1,
//                    },
//                    {
//                        "value": "Cold",
//                        "group": 2,
//                    },
//                    ["Non-existing"]
//                ],
//            },
//        },
//        {
//            "tab": "Details",
//            "group": "Food",
//            "name": "myListBox",
//            "type": "listBox",
//            "label": "Soup 2 should be:",
//            "options": [
//                ["hot", "Hot and yummy"],
//                ["cold"]
//            ]
//        },
//        {
//            "tab": "Details",
//            "group": "Food",
//            "name": "myRadioButtons",
//            "type": "radioButtons",
//            "label": "Soup 3 should be:",
//            "options": [
//                ["hot", "Hot and yummy"],
//                ["cold"]
//            ]
//        }
//    ],
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
