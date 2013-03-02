/*

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
    "classicLayersSection": false,
    "customCssCode": '',
    "rememberPanelOpenClosedState": false,
    "enableDeleteLayerConfirmationMessage": true,
    "enableHotkeys": true,
    "enableStatistics": true
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26666773-2']);

$(document).ready(function () {
    if (!settings.get("debugMode")) {
        if (!window.console) window.console = {};
        var methods = ["log", "debug", "warn", "info"];
        for (var i = 0; i < methods.length; i++) {
            console[methods[i]] = function () { };
        }
    }

    if (settings.get("enableStatistics")) {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        //ga.src = 'https://ssl.google-analytics.com/u/ga_debug.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    }
});

// here we store panel' state for every tab
var PP_state = [];

// For debug add these lines to manifest
//  "content_scripts": [{
//      "matches": ["<all_urls>"],
//	  "css": [ "style.css", "jquery-ui.css" ],
//      "js": [ "jquery-1.6.2.min.js", "jquery-ui.js", "pp-shared.js", "storage/pp-storage-localStorage.js", "storage/pp-storage-filesystem.js", "pp-content.js"]
//  }]

function togglePanel(){
    chrome.tabs.executeScript(null, { code: "togglePanel();" });
}

function injectIntoTab(tabId, execute_after_scripts_injected){
    if (settings.get("enableStatistics")) {
        _gaq.push(['_trackPageview']); // Tracking
    }

    chrome.tabs.insertCSS(tabId, { file: "style.css" });
    chrome.tabs.insertCSS(tabId, { file: "jquery-ui.css" });
    if (!settings.get("classicLayersSection")) chrome.tabs.insertCSS(tabId, { file: "compact-layers-section.css" });
    var customCssCode = settings.get("customCssCode");
    if (customCssCode) chrome.tabs.insertCSS(tabId, { code: customCssCode});
    chrome.tabs.executeScript(null, { file: "jquery-1.6.2.min.js" }, function () {
        chrome.tabs.executeScript(null, { file: "jquery-ui.js" }, function () {
            chrome.tabs.executeScript(null, { file: "pp-shared.js" }, function () {
                chrome.tabs.executeScript(null, { file: "3rd Party/canvas-to-blob.min.js" }, function () {
                    chrome.tabs.executeScript(null, { file: "storage/imagetools.js" }, function () {
                        chrome.tabs.executeScript(null, { file: "storage/pp-storage-filesystem.js" }, function () {
                            chrome.tabs.executeScript(null, { file: "storage/pp-storage-localStorage.js" }, function () {
                                chrome.tabs.executeScript(null, { file: "pp-content.js" }, function () {
                                    if (typeof(execute_after_scripts_injected) == 'function'){
                                        execute_after_scripts_injected();
                                    } else {
                                        togglePanel();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status != 'loading') return;
    function change_icon_and_popup(icon, popup){
        chrome.browserAction.setPopup({tabId: tabId, popup: popup})
        chrome.browserAction.setIcon({path:chrome.extension.getURL(icon), tabId:tabId })
    }
    var disabled_icon = 'icons/icon_disabled.png';

    if (tab.url.match(/chrome:/)){
        change_icon_and_popup(disabled_icon,'popups/chrome-protocol-not-allowed.html')
    }
    else {
        chrome.extension.isAllowedFileSchemeAccess(function(isAllowedAccess){
            if (isAllowedAccess){
                change_icon_and_popup('icons/icon.png','')
            }
            else if(tab.url.match(/file:\//)){
                change_icon_and_popup(disabled_icon,'popups/file-scheme-access-not-allowed.html')
            }
        })
    }
});

//React when a browser' action icon is clicked.
chrome.browserAction.onClicked.addListener(function (tab) {
    var pp_tab_state = PP_state[tab.id];
    if (! pp_tab_state || pp_tab_state == 'closed'){
        PP_state[tab.id] = 'open';
        injectIntoTab(tab.id);
    }
    else {
        PP_state[tab.id] = 'closed';
        togglePanel();
    }
});

// On tab (re)load check if we need to open panel
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    var pp_tab_state = PP_state[tabId];
    if (!settings.get('rememberPanelOpenClosedState')){
        // we need to set this to 'closed' to prevent issue with page reloading while panel is opened
        PP_state[tabId] = 'closed';
        return;
    }
    else if (! pp_tab_state || pp_tab_state == 'closed') {
        return;
    }
    if (changeInfo.status === 'complete') { //this means that tab was loaded
        if (! PP_state[tabId]) PP_state[tabId] = 'open';
        var last_word;
        if (PP_state[tabId] == 'collapsed'){
            last_word = function(){chrome.tabs.executeScript(null, { code: "createPanel('collapsed');" })};
        }
        injectIntoTab(tabId, last_word);
    }
});

chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {

        // Event listener for settings
        if (request.type == PP_RequestType.GetExtensionOptions) {
            sendResponse(settings.toObject());
        }

        // Event listener for tracking
        if (request.type == PP_RequestType.TrackEvent) {
            var senderId = String(request.senderId);
            var eventType = String(request.eventType);
            var integerValue = Number(request.integerValue);
            var stringValue = request.stringValue !== undefined ? String(request.stringValue) : request.stringValue;

            if (settings.get("enableStatistics")) {
                var params = ['_trackEvent', senderId, eventType];

                if (integerValue && !isNaN(integerValue) && isFinite(integerValue)) {
                    // push all values
                    params.push(stringValue);
                    params.push(Math.round(integerValue));
                }
                else if (stringValue && stringValue !== undefined) {
                    // push all except integer value which is null
                    params.push(stringValue);
                }

                _gaq.push(params);
            }

            sendResponse(true);
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
                    // array can be sent as request.fileName
                    var fileName = request.fileName;

                    PPFileManager.DeleteFiles(fileName, function () {
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

chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type == PP_RequestType.PanelStateChange){
            if (sender.tab){
                console.log(sender.tab.id, request.state);
                PP_state[sender.tab.id] = request.state;
            }
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
