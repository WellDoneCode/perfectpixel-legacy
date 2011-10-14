/// <reference path="vs/chrome_extensions.js" />

// -----------------------------------
// PPOverlay - abstraction for overlay
// -----------------------------------
var PPOverlay = function () {
    this.Id;
    this.Url = null;
    this.Width = 0;
    this.Height = 0;

    // Position
    this.X = 50;
    this.Y = 50;
    this.Opacity = 0.5;
}


// ----------------------------------------------
// GlobalStorage - for storing really global data
// ----------------------------------------------
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