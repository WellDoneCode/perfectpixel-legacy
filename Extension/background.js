﻿/*

Copyright 2011-2012 Alex Belozerov, Ilya Stepanov

This file is part of PerfectPixel.

PerfectPixel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

PerfectPixel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.

*/

//    PPFileManager.Init(function () {
//            PPFileManager._DeleteAllFiles();
//    });

var settings = new Store("settings", {
    "storageCompatibilityMode": false,
    "debugMode": false,
    "compactLayersSection": false,
    "customCssCode": '',
    "enableHotkeys": true
});

$(document).ready(function () {
    if (!settings.get("debugMode")) {
        if (!window.console) window.console = {};
        var methods = ["log", "debug", "warn", "info"];
        for (var i = 0; i < methods.length; i++) {
            console[methods[i]] = function () { };
        }
    }
});


// For debug add these lines to manifest
//  "content_scripts": [{
//      "matches": ["<all_urls>"],
//	  "css": [ "style.css", "jquery-ui.css" ],
//      "js": [ "jquery-1.6.2.min.js", "jquery-ui.js", "pp-shared.js", "storage/pp-storage-localStorage.js", "storage/pp-storage-filesystem.js", "pp-content.js"]
//  }]
    
//React when a browser action's icon is clicked.
chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.insertCSS(tab.id, { file: "style.css" });
    chrome.tabs.insertCSS(tab.id, { file: "jquery-ui.css" });
    if (settings.get("compactLayersSection")) chrome.tabs.insertCSS(tab.id, { file: "compact-layers-section.css" });
    var customCssCode = settings.get("customCssCode");
    if (customCssCode) chrome.tabs.insertCSS(tab.id, { code: customCssCode});
    chrome.tabs.executeScript(null, { file: "jquery-1.6.2.min.js" }, function () {
        chrome.tabs.executeScript(null, { file: "jquery-ui.js" }, function () {
            chrome.tabs.executeScript(null, { file: "pp-shared.js" }, function () {
                chrome.tabs.executeScript(null, { file: "storage/pp-storage-filesystem.js" }, function () {
                    chrome.tabs.executeScript(null, { file: "storage/pp-storage-localStorage.js" }, function () {
                        chrome.tabs.executeScript(null, { file: "pp-content.js" }, function () {
                            chrome.tabs.executeScript(null, { code: "togglePanel();" });
                        });
                    });
                });
            });
        });
    });
});

chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {

        // Event listener for settings
        if (request.type == PP_RequestType.GetExtensionOptions) {
            sendResponse(settings.toObject());
        }

        // Event listener for file operations
        if (request.type == PP_RequestType.GETFILE
        || request.type == PP_RequestType.ADDFILE
        || request.type == PP_RequestType.DELETEFILE) {

            PPFileManager.Init(function (responseArgs) {
                if (request.type == PP_RequestType.GETFILE) {
                    // GETFILE handler

                    var fileName = request.fileName;

                    PPFileManager.GetFile(fileName, function (ppFile) {
                        sendPPFileResponse(ppFile, sendResponse);
                    });
                }
                else if (request.type == PP_RequestType.ADDFILE) {
                    // ADDFILE handler

                    var ppFile = new PPFile();
                    ppFile.ArrayBuffer = stringToBuffer(request.fileData);
                    ppFile.Name = request.fileName;
                    ppFile.MimeType = request.fileType;

                    PPFileManager.SaveFile(ppFile, function (ppFileOut) {
                        sendPPFileResponse(ppFileOut, sendResponse);
                    });
                }
                else if (request.type == PP_RequestType.DELETEFILE) {
                    // DELETEFILE handler

                    var fileName = request.fileName;

                    PPFileManager.DeleteFile(fileName, function () {
                        sendResponse({
                            status: "OK"
                        });
                    });
                }
                else
                    sendPPFileResponse(responseArgs, sendResponse);
            });
        }
    }
);

function sendPPFileResponse(ppFile, sendResponse) {
    if (ppFile instanceof PPFile)
        sendResponse(
        {
            status: "OK",
            fileName: ppFile.Name,
            fileType: ppFile.MimeType,
            arrayBuffer: bufferToString(ppFile.ArrayBuffer)
        });
    else if (ppFile) {
        sendResponse(
        {
            status: "FAIL",
            message: ppFile.message,
            showToUser: ppFile.showToUser
        });
    }
    else
        sendResponse(
        {
            status: "FAIL"
        });
}
