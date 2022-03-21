const { app, BrowserWindow } = require("electron");
const fs = require("fs");
var simhashJs = require("simhash-js")
var simhash = new simhashJs.SimHash();
let mainWindow;

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    app.quit();
});
const requestMap = new Map()

function createFile(requestId) {
    const {params, response, request} = requestMap.get(requestId)
    console.log(params,response,request);
    const modifyPath = params.response.url
        .replace(/http(s)?:\/\//gi, "")
        .replace()
        .split("/")
        .reverse();
    const folder = modifyPath.pop();
    modifyPath.reverse();
    const mth = (request.request.method || "").toLowerCase()+'-'
    const fnParts = modifyPath.join("__").split("?")
    const body = request?.request?.postData
    const bodyHash = body? simhash.hash(JSON.stringify(body)):''
    const queryHash = fnParts[1]?simhash.hash(fnParts[1]):''
    let fileName = `${mth}-${fnParts[0]}${bodyHash!==''||queryHash!==''?'-hash'+bodyHash+queryHash: ''}.json`;
    if (!fs.existsSync(`./mock/${folder}`)) {
        fs.mkdirSync(`./mock/${folder}`);
    }

    const queryPart = (fnParts[1]? [...new URLSearchParams(fnParts[1]).entries()]:[]).reduce((acc, cur)=>{
        acc+= `"${cur[0]}" :"${cur[1]}",`
        return acc
    },'').replace(/,$/ig, "")
    fs.writeFile(
        `./mock/${folder}/${fileName}`,
        `{
                "predicates": [
                  {
                    "contains": {
                      "method": "${request.request.method}",
                      "path": "${modifyPath.join("/").split('?')[0]}"
                      ${queryPart!==''?',"query":{'+queryPart+'}':'' }
                    }
                  }
                  ${body? ',{"equals":{"body":'+body+' }}': ''}
                ],
                "responses": [
                  {
                    "is": {
                      "statusCode": ${params.response.status},
                      "headers": {
                        "Content-Type": "application/json;charset=UTF-8",
                        "Status": 200
                      },
                      "body": ${response.body}
                    }
                  }
                ]
              }`,
        () => {
            fs.appendFile('./mock/index.ejs', `<% include ./${folder}/${fileName} %>\r\n`, function (err) {
                if (err) throw err;
                console.log('Saved!');
            });
        }
    );
}

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on("ready", function () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        frame: true,
        webPreferences: { nodeIntegration: true },
    });

    // and load the index.html of the app.
    mainWindow.loadFile('./start-page/index.html')

    try {
        mainWindow.webContents.debugger.attach("1.3");
    } catch (err) {
        console.log("Debugger attach failed: ", err);
    }

    mainWindow.webContents.debugger.on("detach", (event, reason) => {
        console.log("Debugger detached due to: ", reason);
    });

    mainWindow.webContents.debugger.on("message", (event, method, params) => {
        if (method === "Network.requestWillBeSent") {
            if(requestMap.has(params.requestId)){
                requestMap.get(params.requestId)['request'] = params
            }else{
                requestMap.set(params.requestId, {
                    request: params
                })
            }
            if(Object.keys(requestMap.get(params.requestId)).length === 3){
                createFile(params.requestId)
            }
        }
        if (method === "Network.responseReceived") {
            if (params.type === "XHR") {
                mainWindow.webContents.debugger
                    .sendCommand("Network.getResponseBody", {
                        requestId: params.requestId,
                    })
                    .then(function (response) {
                        if(requestMap.has(params.requestId)){
                            requestMap.get(params.requestId)['response'] = response
                            requestMap.get(params.requestId)['params'] = params
                        }else{
                            requestMap.set(params.requestId, {
                                response: response,
                                params: params
                            })
                        }
                        if(Object.keys(requestMap.get(params.requestId)).length === 3){
                            createFile(params.requestId)
                        }
                    });
            }
        }
    });

    mainWindow.webContents.debugger.sendCommand("Network.enable");

    // Emitted when the window is closed.
    mainWindow.on("closed", function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});