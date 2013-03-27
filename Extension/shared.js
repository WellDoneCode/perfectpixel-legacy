/*
 * Copyright 2011-2013 Alex Belozerov, Ilya Stepanov
 * 
 * This file is part of PerfectPixel.
 * 
 * PerfectPixel is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PerfectPixel is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.
 */

// ----------------------------------------------
// GlobalStorage - for storing really global data
// ----------------------------------------------
var GlobalStorage = new function () {
    this.getOptions = function () {
        var options = {};
        try {
            options = JSON.parse(localStorage['options']);
        } catch (e) {
            console.log('Error loading options from localStorage: object not set');
        }

        return options;
    };

    this.setOptions = function (newOptions) {
        var index = 0;
        if (newOptions) {
            var options = this.getOptions();
            
            for (var attrname in newOptions) { 
                options[attrname] = newOptions[attrname]; 
            }

            localStorage['options'] = JSON.stringify(options);

            return options;
        } else {
            localStorage.removeItem('options');
            return {};
        }
    }
};

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
    this.TrackEvent = "TRACKEVENT"; // Google Analytics
    this.ADDFILE = "ADDFILE";
    this.GETFILE = "GETFILE";
    this.DELETEFILE = "DELETEFILE";
    this.PanelStateChange = "PANELSTATECHANGE";
};