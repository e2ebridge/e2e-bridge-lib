# e2e-bridge-lib

Node.js library allowing interaction with E2E Bridge.

## Features

* xUML, Node.js, and Java Services
    * deploy
    * remove
    * start
    * stop
    * view / set service preferences
* xUML Services only
    * kill
* Node.js Services only
    * pack
* E2E Bridge
    * Users
        * create
        * delete
    * User groups
        * create
        * delete

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
