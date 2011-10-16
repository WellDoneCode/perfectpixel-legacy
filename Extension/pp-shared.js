/// <reference path="vs/chrome_extensions.js" />
/// <reference path="vs/webkit_console.js" />

// -----------------------------------
// PPOverlay - abstraction for overlay
// -----------------------------------
var PPOverlay = function () {
    this.Id = 0;
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

// Converts any ArrayBuffer to a string
//  (a comma-separated list of ASCII ordinals,
//  NOT a string of characters from the ordinals
//  in the buffer elements)
function bufferToString(buf) {
    var view = new Uint8Array(buf);
    return Array.prototype.join.call(view, ",");
}

// Converts a comma-separated ASCII ordinal string list
//  back to an ArrayBuffer (see note for bufferToString())
function stringToBuffer(str) {
    var arr = str.split(",")
      , view = new Uint8Array(arr);
    return view.buffer;
}

// --------------------------------------------------------------
// PP_RequestType - enum for content script -> extension requests
// --------------------------------------------------------------
var PP_RequestType = new function () {
    this.GetExtensionOptions = "GETEXTOPTIONS";
    this.ADDFILE = "ADDFILE";
    this.GETFILE = "GETFILE";
    this.DELETEFILE = "DELETEFILE";
};