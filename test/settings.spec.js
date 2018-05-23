let helper = require('./helper');
let nock = require('nock');

function makeChangedSettings(settings, changes) {
    // this will crash beautifully if setting not found. It's OK in test.
    const result = JSON.parse(JSON.stringify(settings)); // deep copy
    Object.keys(changes).forEach(c => {
        result.find( s => s.id === c ).currentValue = '' + changes[c]
    });
    return result;
}

describe( "Settings module", function() {
    let scope;
    const serviceUriPath = `/bridge/rest/services/xuml/${helper.serviceInstance}`;
    const serviceUri = `${helper.base}/${serviceUriPath}`;

    const links = [
        {
            "rel": "self",
            "href": `${serviceUri}/settings`
        },
        {
            "rel": "http://e2e.ch/bridge/service",
            "href": serviceUri
        }
    ];

    const settings = [
        {
            "id": "StringTestValue",
            "label": "StringTestValue: ",
            "section": "Settings / Deployment Macros",
            "currentValue": "initial Value",
            "originalValueInModel": "no value"
        },
        {
            "id": "BooleanTestValue",
            "label": "BooleanTestValue: ",
            "section": "Settings / Deployment Macros",
            "currentValue": "true",
            "originalValueInModel": "no value"
        },
        {
            "id": "IntegerTestValue",
            "label": "IntegerTestValue: ",
            "section": "Settings / Deployment Macros",
            "currentValue": "100",
            "originalValueInModel": "no value"
        }
    ];

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can query", function(done){

        helper.skipIntegration();

        scope.get(`${serviceUriPath}/settings`)
             .reply(200, {
                 "service": helper.serviceInstance,
                 "link": links,
                 "setting": settings
             });

        helper.makeBridgeInstance().getXUMLServiceSettings(helper.serviceInstance, function(err, res) {
            expect(err).toBeFalsy();

            expect(res.setting).toEqual(settings);

            scope.done();
            done();
        });
    });

    it("can change string value", function(done){

        helper.skipIntegration();

        const changes = {"StringTestValue": "new value"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(`${serviceUriPath}/settings`)
             .reply(200, {
                 "service": helper.serviceInstance,
                 "link": links,
                 "setting": settings
             });

        scope.put(`${serviceUriPath}/settings`, { "setting": [ { "id": "StringTestValue", "currentValue": "new value" } ] } )
             .reply(200, undefined);

        scope.get(`${serviceUriPath}/settings`)
             .reply(200, {
                 "service": helper.serviceInstance,
                 "link": links,
                 "setting": settingsAfter
             });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.serviceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res.setting).toEqual(settingsAfter);

                scope.done();
                done();
            }
        );
    });

    it("can change boolean value", function(done){

        helper.skipIntegration();

        const changes = {"BooleanTestValue": "false"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settings
            });

        scope.put(`${serviceUriPath}/settings`, { "setting": [ { "id": "BooleanTestValue", "currentValue": "false" } ] } )
            .reply(200, undefined);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.serviceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res.setting).toEqual(settingsAfter);

                scope.done();
                done();
            }
        );
    });

    it("can change integer value", function(done){

        helper.skipIntegration();

        const changes = {"IntegerTestValue": "42"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settings
            });

        scope.put(`${serviceUriPath}/settings`, { "setting": [ { "id": "IntegerTestValue", "currentValue": "42" } ] } )
            .reply(200, undefined);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.serviceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res.setting).toEqual(settingsAfter);

                scope.done();
                done();
            }
        );
    });

    it("can change multiple values", function(done){

        helper.skipIntegration();

        const changes = {
            "BooleanTestValue": "false",
            "IntegerTestValue": "128",
            "StringTestValue": "gugus"
        };
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settings
            });

        scope.put(`${serviceUriPath}/settings`, {
            "setting": [
                { "id": "BooleanTestValue", "currentValue": "false" },
                { "id": "IntegerTestValue", "currentValue": "128" },
                { "id": "StringTestValue", "currentValue": "gugus" }
            ]
        } )
            .reply(200, undefined);

        scope.get(`${serviceUriPath}/settings`)
            .reply(200, {
                "service": helper.serviceInstance,
                "link": links,
                "setting": settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.serviceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res.setting).toEqual(settingsAfter);

                scope.done();
                done();
            }
        );
    });
});
