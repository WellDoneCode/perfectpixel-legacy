// -----------------------------------
// PPOverlay - abstraction for overlay
// -----------------------------------
var PPOverlay = function () {
    this.Url = null;
    this.Width = 0;
    this.Height = 0;

    this.X = 0;
    this.Y = 0;
    this.Opacity = 1;
}

// --------------------------------------------------------------------
// PPStogare - place where images are stored permanently. Static object
// --------------------------------------------------------------------
var PPStorage = new function () {

    // -------------------------------
    // Get PPOverlay object from storage
    // -------------------------------
    this.GetOverlay = function () {
        var overlayAsStr = localStorage["overlay0"];
        if (overlayAsStr == null)
            return null;
        var overlay = JSON.parse(overlayAsStr);
        return overlay;
    };

    // ----------------------------------
    // Save PPOverlay object into storage
    // ----------------------------------
    this.SaveOverlay = function (overlay) {
        if (!(overlay instanceof PPOverlay))
            alert("Object of type PPOverlay should be provided");

        localStorage["overlay0"] = JSON.stringify(overlay);
    };

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

                    PPStorage.SaveOverlay(overlay);

                    span.remove();
                    callback();
                });
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
    };

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
