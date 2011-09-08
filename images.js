// -------------------------------
// PPImage - abstraction for image
// -------------------------------
var PPImage = function () {
    this.Url = null;
    this.Width = 0;
    this.Height = 0;
}

// --------------------------------------------------------------------
// PPStogare - place where images are stored permanently. Static object
// --------------------------------------------------------------------
var PPStorage = new function () {

    // -------------------------------
    // Get PPImage object from storage
    // -------------------------------
    this.GetImage = function () {
        var imageData = localStorage["imageData"];
        var width = localStorage["imageWidth"];
        var height = localStorage["imageHeight"];

        if (imageData == null)
            return null;

        var image = new PPImage();
        image.Url = imageData;
        image.Width = width;
        image.Height = height;
        return image;
    };

    // --------------------------------
    // Save PPImage object into storage
    // --------------------------------
    this.SaveImage = function (image) {
        if (!(image instanceof PPImage))
            alert("Object of type PPImage should be provided");

        localStorage["imageData"] = null;
        localStorage["imageData"] = image.Url;
        localStorage["imageWidth"] = image.Width;
        localStorage["imageHeight"] = image.Height;
    };

    // -------------------------------------------------
    // Create PPImage from file and save it into storage
    // -------------------------------------------------
    this.SaveImageFromFile = function (file, callback) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
        }

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                var newImage = new PPImage();
                newImage.Url = e.target.result;

                // Render thumbnail.
                var span = $('<span></span>').css('position', 'absolute').css('opacity', 0);
                var img = $('<img />').attr({
                    src: e.target.result,
                    title: theFile.name
                });
                span.append(img);
                $(document.body).append(span);

                img.load(function () {
                    newImage.Width = img[0].offsetWidth;
                    newImage.Height = img[0].offsetHeight;

                    PPStorage.SaveImage(newImage);

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
