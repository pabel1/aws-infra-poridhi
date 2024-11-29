// require("dotenv").config();
const config = require("./config");
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// VPC Configuration
const vpc = new aws.ec2.Vpc("main-vpc", {
  cidrBlock: config.vpc.cidrBlock,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    ...config.tags,
    Name: "main-vpc",
  },
});

// Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("main-igw", {
  vpcId: vpc.id,
  tags: {
    ...config.tags,
    Name: "main-igw",
  },
});

// Public Subnets (Multiple for High Availability)
const publicSubnets = [];
const privateSubnets = [];

// Create multiple public and multiple private subnets in different AZs
const availabilityZones = config.vpc.availabilityZones;
availabilityZones.forEach((az, index) => {
  const publicSubnet = new aws.ec2.Subnet(`public-subnet-${index + 1}`, {
    vpcId: vpc.id,
    cidrBlock: config.vpc.publicSubnets[index],
    availabilityZone: az,
    mapPublicIpOnLaunch: true,
    tags: {
      ...config.tags,
      Name: `public-subnet-${index + 1}`,
    },
  });
  publicSubnets.push(publicSubnet);

  const privateSubnet = new aws.ec2.Subnet(`private-subnet-${index + 1}`, {
    vpcId: vpc.id,
    cidrBlock: config.vpc.privateSubnets[index],
    availabilityZone: az,
    tags: {
      ...config.tags,
      Name: `private-subnet-${index + 1}`,
    },
  });
  privateSubnets.push(privateSubnet);
});

// Public Route Table
const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: internetGateway.id,
    },
  ],
  tags: {
    ...config.tags,
    Name: "public-rt",
  },
});

// Associate Public Subnets with Route Table
publicSubnets.forEach((subnet, index) => {
  new aws.ec2.RouteTableAssociation(`public-rt-association-${index + 1}`, {
    subnetId: subnet.id,
    routeTableId: publicRouteTable.id,
  });
});

// NAT Gateways for Private Subnets in public subnet
const natGateways = publicSubnets.map((subnet, index) => {
  const natEip = new aws.ec2.Eip(`nat-eip-${index + 1}`, {
    vpc: true,
    tags: {
      ...config.tags,
      Name: `nat-eip-${index + 1}`,
    },
  });

  return new aws.ec2.NatGateway(`nat-gateway-${index + 1}`, {
    allocationId: natEip.id,
    subnetId: subnet.id,
    tags: {
      ...config.tags,
      Name: `nat-gateway-${index + 1}`,
    },
  });
});

// Private Route Tables with NAT Gateway
const privateRouteTables = natGateways.map((natGateway, index) => {
  const privateRouteTable = new aws.ec2.RouteTable(`private-rt-${index + 1}`, {
    vpcId: vpc.id,
    routes: [
      {
        cidrBlock: "0.0.0.0/0",
        natGatewayId: natGateway.id,
      },
    ],
    tags: {
      ...config.tags,
      Name: `private-rt-${index + 1}`,
    },
  });

  // Associate Private Subnet with Route Table
  new aws.ec2.RouteTableAssociation(`private-rt-association-${index + 1}`, {
    subnetId: privateSubnets[index].id,
    routeTableId: privateRouteTable.id,
  });

  return privateRouteTable;
});

// Security Groups
const frontendSecurityGroup = new aws.ec2.SecurityGroup("frontend-sg", {
  vpcId: vpc.id,
  description: "Security group for frontend instances",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...config.tags,
    Name: "frontend-sg",
  },
});

const backendSecurityGroup = new aws.ec2.SecurityGroup("backend-sg", {
  vpcId: vpc.id,
  description: "Security group for backend instances",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 4000,
      toPort: 4000,
      securityGroupIds: [frontendSecurityGroup.id],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...config.tags,
    Name: "backend-sg",
  },
});

const mongoSecurityGroup = new aws.ec2.SecurityGroup("mongo-sg", {
  vpcId: vpc.id,
  description: "Security group for MongoDB instances",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 27017,
      toPort: 27017,
      securityGroupIds: [backendSecurityGroup.id],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...config.tags,
    Name: "mongo-sg",
  },
});

// Frontend Instances
const frontendInstances = publicSubnets.map((subnet, index) => {
  return new aws.ec2.Instance(`frontend-instance-${index + 1}`, {
    instanceType: config.frontend.instanceType,
    ami: config.frontend.ami,
    subnetId: subnet.id,
    vpcSecurityGroupIds: [frontendSecurityGroup.id],
    keyName: config.ec2.keyName,
    tags: {
      ...config.tags,
      Name: `frontend-instance-${index + 1}`,
    },
  });
});

// Backend Instances
const backendInstances = privateSubnets.map((subnet, index) => {
  return new aws.ec2.Instance(`backend-instance-${index + 1}`, {
    instanceType: config.backend.instanceType,
    ami: config.backend.ami,
    subnetId: subnet.id,
    vpcSecurityGroupIds: [backendSecurityGroup.id],
    keyName: config.ec2.keyName,
    tags: {
      ...config.tags,
      Name: `backend-instance-${index + 1}`,
    },
  });
});

// MongoDB Instances
const mongoInstances = privateSubnets.map((subnet, index) => {
  return new aws.ec2.Instance(`mongo-instance-${index + 1}`, {
    instanceType: config.mongodb.instanceType,
    ami: config.mongodb.ami,
    subnetId: subnet.id,
    vpcSecurityGroupIds: [mongoSecurityGroup.id],
    keyName: config.ec2.keyName,
    tags: {
      ...config.tags,
      Name: `mongo-instance-${index + 1}`,
    },
  });
});

// Target Groups
const frontendTargetGroup = new aws.lb.TargetGroup("frontend-tg", {
  port: 80,
  protocol: "HTTP",
  vpcId: vpc.id,
  healthCheck: {
    path: "/",
    protocol: "HTTP",
    matcher: "200",
    interval: 30,
    timeout: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 2,
  },
  tags: {
    ...config.tags,
    Name: "frontend-tg",
  },
});

const backendTargetGroup = new aws.lb.TargetGroup("backend-tg", {
  port: config.backend.port,
  protocol: "HTTP",
  vpcId: vpc.id,
  healthCheck: {
    path: config.backend.healthCheckPath,
    protocol: "HTTP",
    matcher: "200",
    interval: 30,
    timeout: 5,
    healthyThreshold: 2,
    unhealthyThreshold: 2,
  },
  tags: {
    ...config.tags,
    Name: "backend-tg",
  },
});

// Attach Instances to Target Groups
frontendInstances.forEach((instance, index) => {
  new aws.lb.TargetGroupAttachment(`frontend-tg-attachment-${index + 1}`, {
    targetGroupArn: frontendTargetGroup.arn,
    targetId: instance.id,
    port: 80,
  });
});

backendInstances.forEach((instance, index) => {
  new aws.lb.TargetGroupAttachment(`backend-tg-attachment-${index + 1}`, {
    targetGroupArn: backendTargetGroup.arn,
    targetId: instance.id,
    port: config.backend.port,
  });
});

// Application Load Balancer
const applicationLoadBalancer = new aws.lb.LoadBalancer("main-alb", {
  internal: false,
  loadBalancerType: "application",
  securityGroups: [frontendSecurityGroup.id],
  subnets: publicSubnets.map((subnet) => subnet.id),
  tags: {
    ...config.tags,
    Name: "main-alb",
  },
});

// ALB Listeners
const frontendListener = new aws.lb.Listener("frontend-listener", {
  loadBalancerArn: applicationLoadBalancer.arn,
  port: 80,
  protocol: "HTTP",
  defaultActions: [
    {
      type: "forward",
      targetGroupArn: frontendTargetGroup.arn,
    },
  ],
});

const backendListener = new aws.lb.Listener("backend-listener", {
  loadBalancerArn: applicationLoadBalancer.arn,
  port: config.backend.port,
  protocol: "HTTP",
  defaultActions: [
    {
      type: "forward",
      targetGroupArn: backendTargetGroup.arn,
    },
  ],
});

// Exports
exports.vpcId = vpc.id;
exports.publicSubnetIds = publicSubnets.map((subnet) => subnet.id);
exports.privateSubnetIds = privateSubnets.map((subnet) => subnet.id);
exports.frontendInstanceIds = frontendInstances.map((instance) => instance.id);
exports.backendInstanceIds = backendInstances.map((instance) => instance.id);
exports.mongoInstanceIds = mongoInstances.map((instance) => instance.id);
exports.albDnsName = applicationLoadBalancer.dnsName;
