let helper = require('./helper');
let nock = require('nock');
const path = require('path');
const _ = require('lodash');
const async = require('async');
const fs = require('fs');

describe("Deployment", function() {
    let scope;
    const basePath = '/bridge/rest/services';

    function createBodyCheck(filename, contentType) {
        if(!contentType) {
            contentType = 'application/zip';
        }

        const dataLen = filename.length + contentType.length;

        const exp =
            '^-*.*\r\n' +
            `Content-Disposition: form-data; name="uploadFile"; filename="${_.escapeRegExp(filename)}"\r\n` +
            `Content-Type: ${_.escapeRegExp(contentType)}\r\n` +
            '\r\n' +
            'PK$';

        return function checkBody(body) {
            const rx = new RegExp(exp);
            const bodyStr = Buffer.from(body, 'hex').toString('utf-8', 0, 138 + dataLen);
            return rx.test(bodyStr);
        };
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    describe("of an xUML service", function() {

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            async.parallel(
                [
                    cb => helper
                        .makeBridgeInstance()
                        .removeXUMLService(helper.xUmlServiceInstance, cb),
                    cb => helper
                        .makeBridgeInstance()
                        .removeXUMLService(`${helper.xUmlServiceInstance}-second`, cb)
                ],
                function() {
                    done();
                });
        });

        const repository = path.resolve(__dirname, `data/${helper.xUmlServiceInstance}.rep`);
        const checkBody = createBodyCheck(helper.xUmlServiceInstance + '.rep');

        it('works', function(done) {
            scope.post(basePath, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('fails if service exists', function(done) {
            const errorMessage = `Instance '${helper.xUmlServiceInstance}' exists!`;
            scope.post(basePath, checkBody)
                .reply(500, {
                    status: '500',
                    message: errorMessage
                });

            helper.makeBridgeInstance().deployService(
                repository,
                function(err) {
                    expect(err['error']).toBeDefined();
                    expect(err['error']['message']).toContain(errorMessage);
                    expect(err['error']['status']).toEqual('500');
                    expect(err['errorType']).toEqual('Bridge error');
                    scope.done();
                    done();
                }
            );
        });

        it('overwrites existing service', function(done) {
            scope.post(`${basePath}?overwrite=true&overwritePrefs=true`, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {
                    overwrite: true,
                    overwritePrefs: true
                },
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('can be retrieved', function(done) {

            // note: this is a valid, empty zip file
            const zip = Buffer.from([
                0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

            scope.get(`${basePath}/xuml/${helper.xUmlServiceInstance}/repository`)
                .reply(200, zip);

            helper.makeBridgeInstance().getXUMLServiceRepository(
                helper.xUmlServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    expect(Buffer.isBuffer(res)).toBeTruthy();
                    expect(res.indexOf(Buffer.from([0x50, 0x4b]))).toEqual(0); // 'PK' magic
                    expect(res.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBeTruthy(); // central directory
                    scope.done();
                    done();
                }
            );
        });

        it('can be removed', function(done) {
            scope.delete(`${basePath}/xuml/${helper.xUmlServiceInstance}`)
                .reply(200, undefined);

            helper.makeBridgeInstance().removeXUMLService(
                helper.xUmlServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });
    });

    describe("of a Node.js service", function() {

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            async.parallel(
                [
                    cb => helper
                        .makeBridgeInstance()
                        .removeNodeService(helper.nodeJsServiceInstance, cb),
                    cb => helper
                        .makeBridgeInstance()
                        .removeNodeService(`${helper.nodeJsServiceInstance}-second`, cb)
                ],
                function() {
                    done();
                });

        });

        const repository = path.resolve(__dirname, `data/${helper.nodeJsServiceInstance}.zip`);
        const checkBody = createBodyCheck(helper.nodeJsServiceInstance + '.zip');

        it('works', function(done) {
            scope.post(basePath, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('fails if service exists', function(done) {
            const errorMessage = `Node.js service '${helper.nodeJsServiceInstance}' already exists.`;
            scope.post(basePath, checkBody)
                .reply(500, {
                    status: '500',
                    message: errorMessage
                });

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err['error']).toBeDefined();
                    expect(err['error']['message']).toContain(errorMessage);
                    expect(err['error']['status']).toEqual('500');
                    expect(err['errorType']).toEqual('Bridge error');
                    scope.done();
                    done();
                }
            );
        });

        it('uses different instance name', function(done) {
            scope.post(`${basePath}?instanceName=${helper.nodeJsServiceInstance}-second`, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {instanceName: `${helper.nodeJsServiceInstance}-second`},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('can be removed', function(done) {
            scope.delete(`${basePath}/nodejs/${helper.nodeJsServiceInstance}`)
                .reply(200, undefined);

            helper.makeBridgeInstance().removeNodeService(
                helper.nodeJsServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('works from directory', function(done) {

            const directory = path.resolve(__dirname, `data/${helper.nodeJsServiceInstance}`);
            const contentType = 'application/octet-stream';

            const exp =
                '^-*.*\r\n' +
                `Content-Disposition: form-data; name="uploadFile"; filename="NodeService-0\\.0\\.1\\.zip.*"\r\n` +
                `Content-Type: ${_.escapeRegExp(contentType)}\r\n` +
                '\r\n' +
                'PK.*';

            function checkBody(body) {
                const rx = new RegExp(exp);
                const bodyStr = Buffer.from(body, 'hex').toString('utf-8', 0, 220);
                return rx.test(bodyStr);
            }

            scope.post(basePath, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                directory,
                {},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('works from stream', function(done) {
            scope.post(basePath + '?overwrite=true', createBodyCheck('repository.zip'))
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                fs.readFileSync(repository),
                {overwrite: true},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('errors if repository does not exist', function(done) {

            const repository = path.resolve(__dirname, 'data/i-am-not-here');

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err).toBeTruthy();
                    expect(err['errorType']).toEqual('Filesystem error');
                    scope.done();
                    done();
                }
            );
        });
    });

    describe("of a java service", function() {

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            helper.makeBridgeInstance().removeJavaService(
                helper.javaServiceInstance,
                function() {
                    done();
                });
        });

        const repository = path.resolve(__dirname, `data/${helper.javaServiceInstance}.jar`);
        const checkBody =
            createBodyCheck(helper.javaServiceInstance + '.jar', 'application/java-archive');

        it('works', function(done) {
            scope.post(basePath, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('fails if service exists', function(done) {
            const errorMessage = `Java service '${helper.javaServiceInstance}' already exists.`;
            scope.post(basePath, checkBody)
                .reply(500, {
                    status: '500',
                    message: errorMessage
                });

            helper.makeBridgeInstance().deployService(
                repository,
                {},
                function(err) {
                    expect(err['error']).toBeDefined();
                    expect(err['error']['message']).toContain(errorMessage);
                    expect(err['error']['status']).toEqual('500');
                    expect(err['errorType']).toEqual('Bridge error');
                    scope.done();
                    done();
                }
            );
        });

        it('overwrites existing service', function(done) {
            scope.post(`${basePath}?overwrite=true&overwritePrefs=true`, checkBody)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                repository,
                {
                    overwrite: true,
                    overwritePrefs: true
                },
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it('can be removed', function(done) {
            scope.delete(`${basePath}/java/${helper.javaServiceInstance}`)
                .reply(200, undefined);

            helper.makeBridgeInstance().removeJavaService(
                helper.javaServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });
    });
});
