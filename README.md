# e2e-console-lib

Node.js library allowing interaction with E2E Console.

## Features

* E2E Bridge and Node.js Services
    * deploy
    * remove
    * start
    * stop
* E2E Bridge Services only
    * kill

## Installation
``` bash
$ npm install e2e-console-lib
```

## Usage example

``` javascript
var E2EConsole = require('e2e-console-lib');
var consoleInstance = new E2EConsole('localhost', 8080, 'admin', 'admin');

consoleInstance.startBridgeService('PurchaseOrderExample', function(error){
    if(error) {
        console.error('Error occured: ' + error.errorType);
    } else {
        console.log('Startup done.');
    }
});
```
