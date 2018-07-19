let helper = require('./helper');
let nock = require('nock');
const path = require('path');
const async = require('async');

describe('Service listing', function() {
    let scope;

    function endpoint(type) {
        return '/bridge/rest/services' + (type
                                          ? ('/' + type)
                                          : '');
    }

    const xUMLService = {
        name: helper.xUmlServiceInstance,
        type: 'xUML',
        status: 'Stopped',
        href: `/services/xuml/${helper.xUmlServiceInstance}`
    };

    const nodeService = {
        name: helper.nodeJsServiceInstance,
        type: 'NodeJs',
        status: 'Stopped',
        href: `/services/nodejs/${helper.nodeJsServiceInstance}`
    };

    const javaService = {
        name: helper.javaServiceInstance,
        type: 'Java',
        status: 'Stopped',
        href: `/services/java/${helper.javaServiceInstance}`
    };

    function checkService(service, list) {
        const found = list.find(s => s['name'] === service['name'] && s['type'] === service['type']);
        expect(found).toBeTruthy();
        expect(found['status']).toBeDefined();
        expect(found['href']).toMatch(new RegExp('.*' + service['href'] + '$'));
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    beforeAll(function(done) {
        if(!helper.integrationEnabled()) {
            return done();
        }

        const xUMLRepo = path.resolve(__dirname, `data/${helper.xUmlServiceInstance}.rep`);
        const nodeRepo = path.resolve(__dirname, `data/${helper.nodeJsServiceInstance}.zip`);
        const javaRepo = path.resolve(__dirname, `data/${helper.javaServiceInstance}.jar`);
        const instance = helper.makeBridgeInstance();
        const opts = {overwrite: true, overwritePrefs: true};

        async.parallel([
            cb => instance.deployService(xUMLRepo, opts, cb),
            cb => instance.deployService(nodeRepo, opts, cb),
            cb => instance.deployService(javaRepo, opts, cb)
        ], () => done());
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it('can list all services', function(done) {

        const listResponse = {service: [xUMLService, nodeService, javaService]};

        scope.get(endpoint())
            .reply(200, listResponse);

        helper.makeBridgeInstance().listAllServices(
            function(err, list) {
                expect(err).toBeFalsy();
                expect(Array.isArray(list['service'])).toBeTruthy();
                listResponse['service'].forEach(s => checkService(s, list['service']));
                scope.done();
                done();
            });
    });

    it('can list xUML services', function(done) {

        const listResponse = {service: [xUMLService]};

        scope.get(endpoint('xuml'))
            .reply(200, listResponse);

        helper.makeBridgeInstance().listXUMLServices(
            function(err, list) {
                expect(err).toBeFalsy();
                expect(Array.isArray(list['service'])).toBeTruthy();
                listResponse['service'].forEach(s => checkService(s, list['service']));
                scope.done();
                done();
            });
    });

    it('can list Node.js services', function(done) {

        const listResponse = {service: [nodeService]};

        scope.get(endpoint('nodejs'))
            .reply(200, listResponse);

        helper.makeBridgeInstance().listNodeServices(
            function(err, list) {
                expect(err).toBeFalsy();
                expect(Array.isArray(list['service'])).toBeTruthy();
                listResponse['service'].forEach(s => checkService(s, list['service']));
                scope.done();
                done();
            });
    });

    it('can list java services', function(done) {

        const listResponse = {service: [javaService]};

        scope.get(endpoint('java'))
            .reply(200, listResponse);

        helper.makeBridgeInstance().listJavaServices(
            function(err, list) {
                expect(err).toBeFalsy();
                expect(Array.isArray(list['service'])).toBeTruthy();
                listResponse['service'].forEach(s => checkService(s, list['service']));
                scope.done();
                done();
            });
    });
});
