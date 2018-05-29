let helper = require('./helper');
let nock = require('nock');

describe( "Resources", function() {
    let scope;
    function resourceUriPath(resourceType, tail) {
        return `/bridge/rest/xuml/${resourceType}${tail}`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    describe('type', function() {
        describe("'resource'", function () {

            function endpoint(tail) {
                return resourceUriPath('resource', tail);
            }

            it("can be listed", function (done) {

                const response = {
                    "file": [
                        {
                            "name": "memcheck-bridge_CryptExample.supp",
                            "date": "2017-11-06 13:48:32",
                            "href": `${helper.base}/bridge/rest/xuml/resource/memcheck-bridge_CryptExample.supp`,
                            "fileSize": "1 KB"
                        },
                        {
                            "name": "idea.log",
                            "date": "2017-09-26 15:45:24",
                            "href": `${helper.base}/bridge/rest/xuml/resource/idea.log`,
                            "fileSize": "990 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLResourceResources(function (err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list.file)).toBeTruthy();
                    list.file.forEach(function(f) {
                        expect(f.name).toBeDefined();
                        expect(f.date).toBeDefined();
                        expect(f.href).toEqual(`${helper.base}/bridge/rest/xuml/resource/${f.name}`);
                        expect(f.fileSize).toBeDefined();
                    });
                    scope.done();
                    done();
                });
            });
        });

        describe("'java'", function () {

            function endpoint(tail) {
                return resourceUriPath('java', tail);
            }

            it("can be listed", function (done) {

                const response = {
                    "file": [
                        {
                            "name": "jndi.jar",
                            "date": "2017-03-15 10:07:35",
                            "href": `${helper.base}/bridge/rest/xuml/java/jndi.jar`,
                            "fileSize": "98 KB"
                        },
                        {
                            "name": "jms.jar",
                            "date": "2017-03-15 10:07:35",
                            "href": `${helper.base}/bridge/rest/xuml/java/jms.jar`,
                            "fileSize": "26 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLJavaResources(function (err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list.file)).toBeTruthy();
                    list.file.forEach(function(f) {
                        expect(f.name).toBeDefined();
                        expect(f.date).toBeDefined();
                        expect(f.href).toEqual(`${helper.base}/bridge/rest/xuml/java/${f.name}`);
                        expect(f.fileSize).toBeDefined();
                    });
                    scope.done();
                    done();
                });
            });
        });

        describe("'xslt'", function () {

            function endpoint(tail) {
                return resourceUriPath('xslt', tail);
            }

            it("can be listed", function (done) {

                const response = {
                    "file": [
                        {
                            "name": "identity.zip",
                            "date": "2018-05-29 15:30:49",
                            "href": `${helper.base}/bridge/rest/xuml/xslt/identity.zip`,
                            "fileSize": "1 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLXsltResources(function (err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list.file)).toBeTruthy();
                    list.file.forEach(function(f) {
                        expect(f.name).toBeDefined();
                        expect(f.date).toBeDefined();
                        expect(f.href).toEqual(`${helper.base}/bridge/rest/xuml/xslt/${f.name}`);
                        expect(f.fileSize).toBeDefined();
                    });
                    scope.done();
                    done();
                });
            });
        });
    });
});
