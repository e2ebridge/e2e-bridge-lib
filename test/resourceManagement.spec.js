let helper = require('./helper');
let nock = require('nock');
const fs = require('fs');
const path = require('path');
const streamBuffers = require('stream-buffers');
const unzip = require('unzipper');

describe('Resources', function() {
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

        const uploadBodyRegexp = new RegExp([
            /^-*.*\r\n/,
            /Content-Disposition: form-data; name="uploadFile"; filename="gugus.txt"\r\n/,
            /Content-Type: text\/plain/,
            /\r\n/,
            /\r\n/,
            /Gugus!\r\n/,
            /-*.*--/,
            /\r\n$/
        ].map(r => r.source).join(''));

        describe("'resource'", function() {

            function endpoint(tail) {
                return resourceUriPath('resource', tail);
            }

            beforeAll(function(done) {
                if(!helper.integrationEnabled()) {
                    return done();
                }

                helper.makeBridgeInstance().deleteXUMLResourceResources(
                    'gugus.txt',
                    (/*err, res*/) => done());
            });

            it('can be uploaded', function(done) {
                scope.post(endpoint(''), uploadBodyRegexp)
                    .reply(200, undefined);

                helper.makeBridgeInstance().uploadXUMLResourceResources(
                    'Gugus!',
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });

            it('can be downloaded', function(done) {
                const response = fs.readFileSync(path.resolve(__dirname, 'data/gugus.txt.zip'));

                scope.get(endpoint('/gugus.txt'))
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLResourceResources(
                    'gugus.txt',
                    function(err, res) {
                        expect(err).toBeFalsy();
                        expect(Buffer.isBuffer(res)).toBeTruthy();
                        const zipBuffer = new streamBuffers.ReadableStreamBuffer();
                        zipBuffer.put(res);
                        zipBuffer.stop();
                        zipBuffer.pipe(unzip.Parse())
                            .on('entry', entry => {
                                if(entry.path === 'gugus.txt') {
                                    const entryStream = new streamBuffers.WritableStreamBuffer();
                                    entryStream.on('close', () => {
                                        const str = entryStream.getContentsAsString('utf-8');
                                        expect(str).toEqual('Gugus!');
                                    });
                                } else {
                                    fail(`Unexpected entry: ${entry.path}`);
                                    entry.autodrain();
                                }
                            })
                            .on('close', () => done());
                        scope.done();
                    });
            });

            it('can be listed', function(done) {

                const response = {
                    "file": [
                        {
                            "name": "gugus.txt",
                            "date": "2017-09-26 15:45:24",
                            "href": `/bridge/rest/xuml/resource/gugus.txt`,
                            "fileSize": "1 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLResourceResources(function(err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list['file'])).toBeTruthy();
                    const gugus = list['file'].find(e => e['name'] === 'gugus.txt');
                    expect(gugus).toBeDefined();
                    expect(gugus['date']).toBeDefined();
                    expect(gugus['href']).toMatch(/.*\/bridge\/rest\/xuml\/resource\/gugus\.txt$/);
                    expect(gugus['fileSize']).toEqual('1 KB');
                    scope.done();
                    done();
                });
            });

            it('can be deleted', function(done) {
                scope.delete(endpoint('/gugus.txt'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().deleteXUMLResourceResources(
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });

            it('can be uploaded from stream', function(done) {
                scope.post(endpoint(''), uploadBodyRegexp)
                    .reply(200, undefined);

                helper.makeBridgeInstance().uploadXUMLResourceResources(
                    fs.createReadStream(path.resolve(__dirname, 'data/gugus.txt')),
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });
        });

        describe("'java'", function() {

            function endpoint(tail) {
                return resourceUriPath('java', tail);
            }

            beforeAll(function(done) {
                if(!helper.integrationEnabled()) {
                    return done();
                }

                helper.makeBridgeInstance().deleteXUMLJavaResources(
                    'gugus.txt',
                    (/*err, res*/) => done());
            });

            it('can be uploaded', function(done) {
                scope.post(endpoint(''), uploadBodyRegexp)
                    .reply(200, undefined);

                helper.makeBridgeInstance().uploadXUMLJavaResources(
                    'Gugus!',
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });

            it('can be downloaded', function(done) {
                const response = fs.readFileSync(path.resolve(__dirname, 'data/gugus.txt.zip'));

                scope.get(endpoint('/gugus.txt'))
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLJavaResources(
                    'gugus.txt',
                    function(err, res) {
                        expect(err).toBeFalsy();
                        expect(Buffer.isBuffer(res)).toBeTruthy();
                        const zipBuffer = new streamBuffers.ReadableStreamBuffer();
                        zipBuffer.put(res);
                        zipBuffer.stop();
                        zipBuffer.pipe(unzip.Parse())
                            .on('entry', entry => {
                                if(entry.path === 'gugus.txt') {
                                    const entryStream = new streamBuffers.WritableStreamBuffer();
                                    entryStream.on('close', () => {
                                        const str = entryStream.getContentsAsString('utf-8');
                                        expect(str).toEqual('Gugus!');
                                    });
                                } else {
                                    fail(`Unexpected entry: ${entry.path}`);
                                    entry.autodrain();
                                }
                            })
                            .on('close', () => done());
                        scope.done();
                    });
            });

            it('can be listed', function(done) {

                const response = {
                    "file": [
                        {
                            "name": "gugus.txt",
                            "date": "2017-09-26 15:45:24",
                            "href": `/bridge/rest/xuml/java/gugus.txt`,
                            "fileSize": "1 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLJavaResources(function(err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list['file'])).toBeTruthy();
                    const gugus = list['file'].find(e => e['name'] === 'gugus.txt');
                    expect(gugus).toBeDefined();
                    expect(gugus['date']).toBeDefined();
                    expect(gugus['href']).toMatch(/.*\/bridge\/rest\/xuml\/java\/gugus\.txt$/);
                    expect(gugus['fileSize']).toEqual('1 KB');
                    scope.done();
                    done();
                });
            });

            it('can be deleted', function(done) {
                scope.delete(endpoint('/gugus.txt'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().deleteXUMLJavaResources(
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });
        });

        describe("'xslt'", function() {

            function endpoint(tail) {
                return resourceUriPath('xslt', tail);
            }

            beforeAll(function(done) {
                if(!helper.integrationEnabled()) {
                    return done();
                }

                helper.makeBridgeInstance().deleteXUMLXsltResources(
                    'gugus.txt',
                    (/*err, res*/) => done());
            });

            it('can be uploaded', function(done) {
                scope.post(endpoint(''), uploadBodyRegexp)
                    .reply(200, undefined);

                helper.makeBridgeInstance().uploadXUMLXsltResources(
                    'Gugus!',
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });

            it('can be downloaded', function(done) {
                const response = fs.readFileSync(path.resolve(__dirname, 'data/gugus.txt.zip'));

                scope.get(endpoint('/gugus.txt'))
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLXsltResources(
                    'gugus.txt',
                    function(err, res) {
                        expect(err).toBeFalsy();
                        expect(Buffer.isBuffer(res)).toBeTruthy();
                        const zipBuffer = new streamBuffers.ReadableStreamBuffer();
                        zipBuffer.put(res);
                        zipBuffer.stop();
                        zipBuffer.pipe(unzip.Parse())
                            .on('entry', entry => {
                                if(entry.path === 'gugus.txt') {
                                    const entryStream = new streamBuffers.WritableStreamBuffer();
                                    entryStream.on('close', () => {
                                        const str = entryStream.getContentsAsString('utf-8');
                                        expect(str).toEqual('Gugus!');
                                    });
                                } else {
                                    fail(`Unexpected entry: ${entry.path}`);
                                    entry.autodrain();
                                }
                            })
                            .on('close', () => done());
                        scope.done();
                    });
            });

            it('can be listed', function(done) {

                const response = {
                    "file": [
                        {
                            "name": "gugus.txt",
                            "date": "2017-09-26 15:45:24",
                            "href": `/bridge/rest/xuml/xslt/gugus.txt`,
                            "fileSize": "1 KB"
                        }
                    ]
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLXsltResources(function(err, list) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(list['file'])).toBeTruthy();
                    const gugus = list['file'].find(e => e['name'] === 'gugus.txt');
                    expect(gugus).toBeDefined();
                    expect(gugus['date']).toBeDefined();
                    expect(gugus['href']).toMatch(/.*\/bridge\/rest\/xuml\/xslt\/gugus\.txt$/);
                    expect(gugus['fileSize']).toEqual('1 KB');
                    scope.done();
                    done();
                });
            });

            it('can be deleted', function(done) {
                scope.delete(endpoint('/gugus.txt'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().deleteXUMLXsltResources(
                    'gugus.txt',
                    function(err) {
                        expect(err).toBeFalsy();
                        scope.done();
                        done();
                    });
            });
        });
    });
});
