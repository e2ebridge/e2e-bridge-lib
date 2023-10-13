# e2e-bridge-lib

Node.js library allowing interaction with E2E Bridge.

## Features

* xUML, Node.js, and Java Services
    * deploy
    * list all services / all services of given type
    * query status
    * remove
    * start
    * stop
    * view / set service preferences
    * view / set service settings
    
* xUML Services only
    * extended information
    * kill
    * list model notes
* Node.js Services only
    * pack

## Installation
``` bash
$ npm install e2e-bridge-lib
```

## Usage example

``` javascript
var E2EBridge = require('e2e-bridge-lib');
var bridgeInstance = new E2EBridge('https', localhost', 8080, 'admin', 'admin');

bridgeInstance.startXUMLService('PurchaseOrderExample', function(error){
    if(error) {
        console.error('Error occured: ' + error.errorType);
    } else {
        console.log('Startup done.');
    }
});
```
