# elb-presence ![travis-ci](https://travis-ci.org/mmcc/elb-presence.svg?branch=master)
Node ELB Presence service based on [CoreOS elb-presence](https://github.com/coreos/elb-presence). For the most part usage is identical, but this will use the metadata API for access tokens and region if possible.

## Usage

### Docker

If the instance has an associated IAM roles with permission to register / deregister with ELB, you can simply pass the ELB name via an environment variable.

```
docker run --rm --name example-presence -e ELB_NAME=ExampleLoadBalancer quay.io/mmcc/elb-presence
```

Or you can pass whatever configuration you'd like as environment variables, just as you would with [CoreOS elb-presence](https://github.com/coreos/elb-presence).

```
docker run --rm --name example-presence -e AWS_ACCESS_KEY=AKIAIBC5MW3ONCW6J2XQ -e AWS_SECRET_KEY=qxB5k7GhwZNweuRleclFGcvsqGnjVvObW5ZMKb2V -e AWS_REGION=us-east-1 -e ELB_NAME=ExampleLoadBalancer quay.io/mmcc/elb-presence
```

**Note**: If you don't include a region, the module will attempt to infer it from the AvailabilityZone in the metadata.

### Fleet

Again, just like the CoreOS version, but potentially with fewer environment variables

```
[Unit]
Description=Example Presence Service
BindsTo=my-service@%i.service

[Service]
TimeoutStartSec=0
ExecStartPre=-/usr/bin/docker kill %p-%i
ExecStartPre=-/usr/bin/docker rm %p-%i
ExecStartPre=/usr/bin/docker pull quay.io/mmcc/elb-presence:latest
ExecStart=/usr/bin/docker run --rm --name %p-%i -e ELB_NAME=ExampleLoadBalancer quay.io/mmcc/elb-presence
ExecStop=/usr/bin/docker stop %p-%i

[X-Fleet]
MachineOf=my-service@%i.service
```
