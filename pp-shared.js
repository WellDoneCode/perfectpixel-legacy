/// <reference path="vs/chrome_extensions.js" />

var GlobalStorage = new function () {

    this.get_CurrentOverlayId = function () {
        if (localStorage["currentOverlayId"] == "null")
            return null;
        return localStorage["currentOverlayId"];
    }

    this.set_CurrentOverlayId = function (val) {
        if (val != null)
            localStorage["currentOverlayId"] = val;
        else
            localStorage.removeItem("currentOverlayId");

    }

}