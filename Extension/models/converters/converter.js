/**
 * Created with JetBrains PhpStorm.
 * User: alexeybelozerov
 * Date: 3/21/13
 * Time: 12:40 AM
 * To change this template use File | Settings | File Templates.
 */

var Converter = {

    LEGACY_VERSION_NUM: "1.22",

    /**
     * Apply converter needed to current data storage
     */
    apply: function() {
        try
        {
            console.log('Converter apply'); // TODO remove
            if(this._isConversionRequired())
            {
                trackEvent("system", "convert_version", null, this._getCurrentExtensionVersion());
                this._convert();
            }
        }
        catch(e)
        {
            console.log("Converter failed: " + e.toString());
            if (ExtOptions.debugMode == true)
                throw e;
        }
    },

    _isConversionRequired: function() {
        return this._getCurrentExtensionVersion() != this._getCurrentDataVersion();
    },

    _getCurrentExtensionVersion: function() {
        return ExtOptions.version;
    },

    _getCurrentDataVersion: function() {
        var instanceId = localStorage["perfectpixel"];
        var instanceData = localStorage["perfectpixel-" + instanceId];
        if(!instanceId && !instanceData)
            return this.LEGACY_VERSION_NUM;
        else
            return $.parseJSON(instanceData).version;
    },

    _convert: function() {
        var currentDataVersion = this._getCurrentDataVersion();
        var targetDataVersion = this._getCurrentExtensionVersion();

        switch(currentDataVersion) {
            case this.LEGACY_VERSION_NUM:
                VersionConverterFromLegacy.convert(currentDataVersion, targetDataVersion);
                break;
            default:
                break;
        }
    }

};
