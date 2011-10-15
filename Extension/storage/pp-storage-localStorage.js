// Depend on pp-shared.js (PPOverlay class)

// --------------------------------------------------------------------
// PPStogare - place where images are stored permanently. Static object
// --------------------------------------------------------------------
var PPStorage_localStorage = function () {

    // -------------------------------
    // Get all PPOverlays from storage
    // -------------------------------
    this.GetOverlays = function (callback) {
        var overlaysCount = this.GetOverlaysCount();
        var overlays = [];
        for (var i = 0; i < overlaysCount; i++) {
            overlays[i] = this.GetOverlay(i);
        }
        callback(overlays);
    }

    // -------------------------------
    // Get PPOverlay object from storage
    // -------------------------------
    this.GetOverlay = function (id, callback) {
        var overlayDataAsStr = localStorage["overlay" + id + "_data"];
        var overlayPositionAsStr = localStorage["overlay" + id + "_position"];
        if (overlayDataAsStr == null || overlayPositionAsStr == null)
            return null;
        var overlayData = JSON.parse(overlayDataAsStr);
        var overlayPosition = JSON.parse(overlayPositionAsStr);

        var overlay = new PPOverlay();
        overlay.Id = id;
        overlay.Width = overlayData.Width;
        overlay.Height = overlayData.Height;
        overlay.Url = overlayData.Url;
        overlay.X = overlayPosition.X;
        overlay.Y = overlayPosition.Y;
        overlay.Opacity = overlayPosition.Opacity;

        if (callback)
            callback(overlay);
        else
            return overlay;
    };

    // ----------------------------------
    // Save PPOverlay object into storage
    // ----------------------------------
    this.SaveOverlay = function (overlay) {
        if (!(overlay instanceof PPOverlay))
            alert("Object of type PPOverlay should be provided");

        if (!overlay.Id) {
            // New overlay
            overlay.Id = this.GetOverlaysCount();
        }

        var overlayData = { Url: overlay.Url, Height: overlay.Height, Width: overlay.Width };
        var overlayPosition = { X: overlay.X, Y: overlay.Y, Opacity: overlay.Opacity };

        try {
            localStorage["overlay" + overlay.Id + "_data"] = JSON.stringify(overlayData);
            localStorage["overlay" + overlay.Id + "_position"] = JSON.stringify(overlayPosition);
        } catch (e) {
            if (e.name == "QUOTA_EXCEEDED_ERR") { //data wasn't successfully saved due to quota exceed
                alert('Image cannot be uploaded because there are no free space. Please remove other layers or try to upload image with less size');
                return null;
            }
            throw e;
        }
        return overlay;
    };

    this.UpdateOverlayPosition = function (overlayId, newPosition) {
        localStorage["overlay" + overlayId + "_position"] = JSON.stringify(newPosition);
    }

    // ----------------------------------
    // Delete overlay from storage
    // ----------------------------------
    this.DeleteOverlay = function (overlayId, callback) {
        var overlaysCount = this.GetOverlaysCount();

        for (var i = overlayId; i < overlaysCount - 1; i++) {
            // use temp variables to prevent QUOTA_EXCEEDED_ERR during copy
            var dataToCopy = localStorage["overlay" + (i + 1) + "_data"];
            var positionToCopy = localStorage["overlay" + (i + 1) + "_position"];

            localStorage.removeItem("overlay" + (i + 1) + "_data");
            localStorage.removeItem("overlay" + (i + 1) + "_position");

            localStorage["overlay" + i + "_data"] = dataToCopy;
            localStorage["overlay" + i + "_position"] = positionToCopy;
        }

        localStorage.removeItem("overlay" + (overlaysCount - 1) + "_data");
        localStorage.removeItem("overlay" + (overlaysCount - 1) + "_position");
        callback();
    }

    // ---------------------------------------------------
    // Create PPOverlay from file and save it into storage
    // ---------------------------------------------------
    this.SaveOverlayFromFile = function (file, callback) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                var overlay = new PPOverlay();
                overlay.Url = e.target.result;

                // Render invisible thumbnail to obtain image width and height.
                var span = $('<span></span>').css('position', 'absolute').css('opacity', 0);
                var img = $('<img />').attr({
                    src: e.target.result,
                    title: theFile.name
                });
                span.append(img);
                $(document.body).append(span);

                img.load(function () {
                    overlay.Width = img[0].offsetWidth;
                    overlay.Height = img[0].offsetHeight;

                    overlay = PPStorage.SaveOverlay(overlay);

                    span.remove();
                    callback(overlay);
                });
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
    };

    // ---------------------------------------------------
    // Get count of overlays stored
    // ---------------------------------------------------
    this.GetOverlaysCount = function () {
        var count = 0;
        while (localStorage["overlay" + count + "_data"]) {
            count++;
        }
        return count;
    }

};
//            var getBase64Image = function (img) {
//                // Create an empty canvas element
//                var canvas = document.createElement("canvas");
//                canvas.width = img.width;
//                canvas.height = img.height;

//                // Copy the image contents to the canvas
//                var ctx = canvas.getContext("2d");
//                ctx.drawImage(img, 0, 0);

//                // Get the data-URL formatted image
//                // Firefox supports PNG and JPEG. You could check img.src to
//                // guess the original format, but be aware the using "image/jpg"
//                // will re-encode the image.
//                var dataURL = canvas.toDataURL("image/jpg");

//                return dataURL;
//            }
