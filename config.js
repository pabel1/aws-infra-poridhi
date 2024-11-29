// exports.config = {
//   project: {
//     name: "aws-infra",
//     environment: "dev",
//   },
//   vpc: {
//     cidrBlock: "10.0.0.0/16",
//     publicSubnet: "10.0.1.0/24",
//     privateSubnet: "10.0.2.0/24",
//     availabilityZone: "ap-south-1a",
//   },
//   tags: {
//     environment: "dev",
//     managedBy: "pulumi",
//   },
//   ec2: {
//     instanceType: "t2.micro",
//     ami: "ami-0f5ee92e2d63afc18",
//     keyName: "your-key-pair-name",
//   },
// };

module.exports = {
  tags: {
    Environment: "Production",
    Project: "MyWebApp",
  },
  vpc: {
    cidrBlock: "10.0.0.0/16",
    availabilityZones: ["ap-southeast-1a"],
    publicSubnets: ["10.0.1.0/24"],
    privateSubnets: ["10.0.10.0/24"],
  },
  ec2: {
    keyName: "my-ssh-key",
  },
  frontend: {
    instanceType: "t2.micro",
    ami: "ami-0c55b159cbfafe1f0",
  },
  backend: {
    instanceType: "t2.micro",
    ami: "ami-0c55b159cbfafe1f0",
    port: 3000,
    healthCheckPath: "/health",
  },
  mongodb: {
    instanceType: "t2.micro",
    ami: "ami-0c55b159cbfafe1f0",
  },
};
