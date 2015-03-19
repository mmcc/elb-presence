var AWS = require('aws-sdk');
var Promise = require('bluebird');

function elb(args) {
  this.args = parseOptions(args);
  this.elb = new AWS.ELB(this.args);
}

elb.prototype._getRegion = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    if (that.args.region) return resolve(that.args.region);

    var metadataService = new AWS.MetadataService();
    var self = this;

    metadataService.request('/latest/meta-data/placement/availability-zone', function(err, zone) {
      if (err) reject(Error('Error retrieving availability zone from instance metadata'));

      // Assuming "us-east-1d", we want to trim off the last "-1d" of the availability zone to get the region.
      resolve(zone.slice(0, -1));
    });
  });
};

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
            var params = {
              Instances: [{ InstanceId: id }],
              LoadBalancerName: this.args.elbName
            };

            var self = this;
            return registerAsync(params);
          }).then(function(data) {
            return data;
          });
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

module.exports = function(args) {
  return new elb(args);
};
