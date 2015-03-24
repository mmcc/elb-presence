var rewire = require('rewire');
var sinon = require('sinon');

var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var expect = chai.expect;
var elb = rewire('../../lib/elb');

describe('elb', function() {
  describe('#initialization', function() {
    it('throws an error if elb name is not included', function() {
      var args = {
        AWS_ACCESS_KEY: '1234',
        AWS_SECRET_KEY: '5678'
      };

      expect(elb.bind(this, args)).to.throw(Error);
    });

    it('returns a new instance of an elb client', function() {
      var args = {
        ELB_NAME: 'sweet-elb-thing',
        AWS_ACCESS_KEY: '1234',
        AWS_SECRET_KEY: '5678'
      };

      var client = elb(args);
      expect(client.args.elbName).to.equal(args.ELB_NAME);
      expect(client.args.accessKeyId).to.equal(args.AWS_ACCESS_KEY);
      expect(client.args.secretAccessKey).to.equal(args.AWS_SECRET_KEY);
    });
  });

  describe('#init', function() {
    var elbStub, elbInstanceStub;

    before(function() {
      elbInstanceStub = sinon.spy();
      elbStub = elb.__set__({
        AWS: {
          ELB: elbInstanceStub,
          MetadataService: function() {
            return {
              request: function(path, cb) {
                return cb(null, 'us-east-1d');
              }
            };
          }
        }
      });
    });

    after(function() {
      elbStub();
    });

    it('returns an elb client', function(done) {
      var args = {
        ELB_NAME: 'sweet-elb-thing',
        AWS_ACCESS_KEY: '1234',
        AWS_SECRET_KEY: '5678'
      };

      var client = elb(args);

      return client.init().then(function(lb) {
        expect(elbInstanceStub.called).to.be.true;
        done();
      });
    });
  });

  describe('#getInstanceId', function() {
    var elbStub;
    var instanceId1 = 'a-1234';

    var args = {
      INSTANCE_ID: instanceId1,
      ELB_NAME: 'sweet-elb-thing',
      AWS_ACCESS_KEY: '1234',
      AWS_SECRET_KEY: '5678'
    };

    before(function() {});

    afterEach(function() {
      elbStub();
      args.INSTANCE_ID = null;
    });

    it('returns the instanceId included', function() {
      elbStub = elb.__set__({
        AWS: {
          ELB: function(){},
          MetadataService: function() {
            return {
              request: function(path, cb) {
                return cb(null, instanceId1);
              }
            };
          }
        }
      });

      args.INSTANCE_ID = instanceId1;

      var client = elb(args);

      return expect(client.getInstanceId()).to.eventually.equal(instanceId1);
    });

    it('returns the instance ID from metadata', function() {
      var instanceId2 = 'z-1234';
      args.INSTANCE_ID = instanceId2;

      var client = elb(args);

      return expect(client.getInstanceId()).to.eventually.equal(instanceId2);
    });

    it('returns an error if metadata retrieval fails', function() {
      elbStub = elb.__set__({
        AWS: {
          ELB: function(){},
          MetadataService: function() {
            return {
              request: function(path, cb) {
                return cb('the world is ending');
              }
            };
          }
        }
      });

      var client = elb(args);

      return expect(client.getInstanceId()).to.eventually.be.rejectedWith('Error retrieving instance ID from instance metadata');
    });
  });

  describe('#registerInstance', function() {
    var elbStub, instanceId;

    var args = {
      ELB_NAME: 'sweet-elb-thing',
      AWS_ACCESS_KEY: '1234',
      AWS_SECRET_KEY: '5678',
      AWS_REGION: 'us-east-1'
    };

    before(function() {
      elbStub = elb.__set__({
        AWS: {
          ELB: function() {
            return {
              registerInstancesWithLoadBalancer: function(params, cb) {
                return cb(null, { Instances: [{ InstanceId: instanceId }]});
              }
            };
          }
        }
      });
    });

    it('Registers an instance with the elb', function() {
      instanceId = args.INSTANCE_ID = 'cool-alright';
      var client = elb(args);

      return expect(client.init().then(client.registerInstance)).to.eventually.be.an('object');
    });
  });

  describe('#deregisterInstance', function() {
    var elbStub, instanceId;

    var args = {
      ELB_NAME: 'sweet-elb-thing',
      AWS_ACCESS_KEY: '1234',
      AWS_SECRET_KEY: '5678',
      AWS_REGION: 'us-east-1'
    };

    before(function() {
      elbStub = elb.__set__({
        AWS: {
          ELB: function() {
            return {
              deregisterInstancesFromLoadBalancer: function(params, cb) {
                return cb(null, { Instances: [{ InstanceId: instanceId }]});
              }
            };
          }
        }
      });
    });

    it('Registers an instance with the elb', function() {
      instanceId = args.INSTANCE_ID = 'cool-alright';
      var client = elb(args);

      return expect(client.init().then(client.deregisterInstance)).to.eventually.be.an('object');
    });
  });
});
