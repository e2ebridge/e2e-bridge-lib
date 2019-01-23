let helper = require('./helper');
let nock = require('nock');

describe("Groups", function() {
    let scope;
    const endpoint = function(id) { return '/bridge/rest/groups' + (id ? ('/' + id) : ''); };

    const gugus = {
        "id": "Gugus",
        "name": "The never-seen creatures",
        "role": "USER",
        "members": []
    };

    const response = {
        "link": [
            {
                "rel": "self",
                "href": `${helper.base}${endpoint}`
            }
        ],
        "group": [gugus]
    };

    const gugus2 = {
        "id": "Gugus",
        "name": "Our heroes",
        "role": "MODELER",
        "members": []
    };

    const response2 = {
        "link": [
            {
                "rel": "self",
                "href": `${helper.base}${endpoint}`
            }
        ],
        "group": [gugus2]
    };

    beforeEach(function() {
        scope = nock(helper.base);
    });

    beforeAll(function(done) {
        if(!helper.integrationEnabled()) {
            return done();
        }
        helper.makeBridgeInstance().removeGroup('Gugus', function() { done(); });
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be listed", function(done) {

        scope.get(endpoint())
            .reply(200, response);

        helper.makeBridgeInstance().listGroups(function(err, list) {
            expect(err).toBeFalsy();
            expect(Array.isArray(list['group'])).toBeTruthy();
            list['group'].forEach(function(f) {
                expect(f.id).toBeDefined();
                expect(f.name).toBeDefined();
                expect(f.role).toBeDefined();
                expect(Array.isArray(f.members)).toBeTruthy();
            });
            scope.done();
            done();
        });
    });

    it("can be created", function(done) {

        scope.post(endpoint('Gugus') + '?name=The%20never-seen%20creatures&role=USER')
            .reply(200, {});

        helper.makeBridgeInstance().createGroup(
            gugus,
            function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
    });

    it("can be retrieved", function(done) {

        scope.get(endpoint('Gugus'))
            .reply(200, response);

        helper.makeBridgeInstance().getGroup(
            'Gugus',
            function(err, res) {
                    expect(err).toBeFalsy();
                    expect(res['group'][0]).toEqual(gugus);
                    scope.done();
                    done();
                });
    });

    it("can be modified", function(done) {

        scope.put(endpoint('Gugus') + '?name=Our%20heroes&role=MODELER')
            .reply(200, {});
        scope.get(endpoint('Gugus'))
            .reply(200, response2);

        let instance = helper.makeBridgeInstance();
        instance.modifyGroup(
            gugus2,
            function(err) {
                expect(err).toBeFalsy();
                instance.getGroup(
                    'Gugus',
                    function(err, res) {
                        expect(err).toBeFalsy();
                        expect(res['group'][0]).toEqual(gugus2);
                        scope.done();
                        done();
                    });
            });
    });

    it("can be deleted", function(done) {

        scope.delete(endpoint('Gugus'))
            .reply(200, {});

        helper.makeBridgeInstance().removeGroup(
            'Gugus',
            function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
    });


});
