var AWS = require('aws-sdk');
var Promise = require('bluebird');

// Attempt to load the credentials via the ec2 metadata
AWS.config.credentials = new AWS.EC2MetadataCredentials();

function elb(args) {
  this.args = parseOptions(args);
}

elb.prototype.init = function() {
  return this._getRegion().bind(this).then(function(region) {
    this._endpoint(region);
    this._elb(elb);

    return this;
  });
};

elb.prototype._getRegion = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    if (that.args.region) return resolve(that.args.region);

    var metadataService = new AWS.MetadataService();

    metadataService.request('/latest/meta-data/placement/availability-zone', function(err, zone) {
      if (err) reject(Error('Error retrieving availability zone from instance metadata'));

      // Assuming "us-east-1d", we want to trim off the last "-1d" of the availability zone to get the region.
      resolve(zone.slice(0, -1));
    });
  });
};

elb.prototype._endpoint = function(region) {
  if (region !== undefined) {
    this.args.endpoint = 'https://elb.'+ region +'.amazonaws.com';
  }

  return this.args.endpoint;
};

elb.prototype._elb = function(elb) {
  if (elb !== undefined) {
    this.elb = new AWS.ELB(this.args);
  }

  return this.elb;
}

elb.prototype.getInstanceId = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    if (that.args.instanceId) return resolve(that.args.instanceId);

    var metadataService = new AWS.MetadataService();
    var self = this;

    metadataService.request('/latest/meta-data/instance-id', function(err, id) {
      if (err) reject(Error('Error retrieving instance ID from instance metadata'));

      resolve(id);
    });
  });
};

elb.prototype.registerInstance = function() {
  var registerAsync = Promise.promisify(this.elb.registerInstancesWithLoadBalancer, this.elb);

  return this.getInstanceId().bind(this)
          .then(function(id) {
            return generateInstanceParams(id, this.args.elbName);
          }).then(registerAsync);
};

elb.prototype.deregisterInstance = function() {
  var deregisterAsync = Promise.promisify(this.elb.deregisterInstancesFromLoadBalancer, this.elb);

  return this.getInstanceId().bind(this)
          .then(function(id) {
            return generateInstanceParams(id, this.args.elbName);
          }).then(deregisterAsync);
};

/**
 * Private
 */
function parseOptions(env) {
  var args = {};

  if (env.ELB_NAME) {
    args.elbName = env.ELB_NAME;
  } else {
    throw Error('ELB Name is required');
  }

  if (env.AWS_ACCESS_KEY) args.accessKeyId = env.AWS_ACCESS_KEY;
  if (env.AWS_SECRET_KEY) args.secretAccessKey = env.AWS_SECRET_KEY;
  if (env.AWS_REGION) args.region = env.AWS_REGION;
  if (env.INSTANCE_ID) args.instanceId = env.INSTANCE_ID;

  return args;
}

function generateInstanceParams(id, elbName) {
  return {
    Instances: [{ InstanceId: id }],
    LoadBalancerName: elbName
  };
}

module.exports = function(args) {
  return new elb(args);
};
