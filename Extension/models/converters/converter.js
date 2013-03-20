/**
 * Created with JetBrains PhpStorm.
 * User: alexeybelozerov
 * Date: 3/21/13
 * Time: 12:40 AM
 * To change this template use File | Settings | File Templates.
 */

var Converter = {

    /**
     * Apply converter needed to current storage
     */
    apply: function() {
        // TODO obtain current and target versions
        var currentVersion = 1.22;
        var targetVersion = 1.5;
        if(currentVersion == targetVersion)
            return;

        this._apply(currentVersion, targetVersion);
    },

    _apply: function(currentVersion, targetVersion) {
        switch(targetVersion) {
            case 1.5:
            {
                switch(currentVersion) {
                    case 1.22:
                        VersionConverter_122_15.convert();
                        break;
                    default:
                        break;
                }
            }
                break;
            default:
                break;
        }
    }

};
