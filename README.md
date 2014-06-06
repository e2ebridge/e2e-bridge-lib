# e2e-bridge-lib

Node.js library allowing interaction with E2E Bridge.

## Features

* xUML and Node.js Services
    * pack
    * deploy
    * remove
    * start
    * stop
* xUML Services only
    * kill

## Installation
``` bash
$ npm install e2e-bridge-lib
```

## Usage example

``` javascript
var E2EBridge = require('e2e-bridge-lib');
var bridgeInstance = new E2EBridge('localhost', 8080, 'admin', 'admin');

bridgeInstance.startXUMLService('PurchaseOrderExample', function(error){
    if(error) {
        console.error('Error occured: ' + error.errorType);
    } else {
        console.log('Startup done.');
    }
});
```
