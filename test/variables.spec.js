let helper = require('./helper');
let nock = require('nock');

describe("Variables", function() {
    let scope;
    const endpoint = '/bridge/rest/xuml/variables';

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be listed", function(done) {

        const response = {
            "link": [
                {
                    "rel": "self",
                    "href": `${helper.base}${endpoint}`
                }
            ],
            "variable": [
                {
                    "name": "tempDir",
                    "value": "/tmp"
                },
                {
                    "name": "rootWorkDir",
                    "value": "./work"
                }
            ]
        };

        scope.get(endpoint)
            .reply(200, response);

        helper.makeBridgeInstance().listXUMLVariables(function(err, list) {
            expect(err).toBeFalsy();
            expect(Array.isArray(list['variable'])).toBeTruthy();
            list['variable'].forEach(function(f) {
                expect(f.name).toBeDefined();
                expect(f.value).toBeDefined();
            });
            scope.done();
            done();
        });
    });
});
