const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create a VPC with improved network configuration
const vpc = new aws.ec2.Vpc("my-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Name: "my-vpc",
    Environment: "Production",
  },
});

exports.vpcId = vpc.id;

// Create public subnet with more specific configuration
const publicSubnet = new aws.ec2.Subnet("public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "ap-southeast-1a",
  mapPublicIpOnLaunch: true,
  tags: {
    Name: "my-public-subnet",
    Type: "Public",
  },
});

exports.publicSubnetId = publicSubnet.id;

// Create a private subnet
const privateSubnet = new aws.ec2.Subnet("private-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: "ap-southeast-1a",
  tags: {
    Name: "my-private-subnet",
    Type: "Private",
  },
});
exports.privateSubnetId = privateSubnet.id;

// Internet gateway with improved tagging
const igw = new aws.ec2.InternetGateway("internet-gateway", {
  vpcId: vpc.id,
  tags: {
    Name: "my-internet-gateway",
    Description: "Internet Gateway for VPC",
  },
});

exports.igwId = igw.id;

// Public route table with more descriptive configuration
const publicRouteTable = new aws.ec2.RouteTable("public-route-table", {
  vpcId: vpc.id,
  tags: {
    Name: "my-public-route-table",
    Description: "Route table for public subnets",
  },
});

// Route for internet gateway
const route = new aws.ec2.Route("igw-route", {
  routeTableId: publicRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  gatewayId: igw.id,
});

// Public route table association
const routeTableAssociation = new aws.ec2.RouteTableAssociation(
  "public-route-table-association",
  {
    subnetId: publicSubnet.id,
    routeTableId: publicRouteTable.id,
  }
);

exports.publicRouteTableId = publicRouteTable.id;

// Elastic IP with improved configuration
const eip = new aws.ec2.Eip("nat-eip", {
  vpc: true,
  tags: {
    Name: "NAT Gateway EIP",
    Description: "Elastic IP for NAT Gateway",
  },
  // Add these options to make the EIP more robust
  publicIpv4Pool: "amazon", // Use Amazon's default IP pool
});
// NAT Gateway with improved error handling
const natGateway = new aws.ec2.NatGateway("nat-gateway", {
  subnetId: publicSubnet.id,
  allocationId: eip.id,
  tags: {
    Name: "my-nat-gateway",
    Description: "NAT Gateway for private subnet internet access",
  },
  // Optional: Add a dependency to ensure EIP is fully created first
  opts: { dependsOn: [eip] },
});
exports.natGatewayId = natGateway.id;

// Private route table
const privateRouteTable = new aws.ec2.RouteTable("private-route-table", {
  vpcId: vpc.id,
  tags: {
    Name: "my-private-route-table",
    Description: "Route table for private subnets",
  },
});

// Private route via NAT Gateway
const privateRoute = new aws.ec2.Route("nat-route", {
  routeTableId: privateRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  natGatewayId: natGateway.id,
});

// Private route table association
const privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(
  "private-route-table-association",
  {
    subnetId: privateSubnet.id,
    routeTableId: privateRouteTable.id,
  }
);

exports.privateRouteTableId = privateRouteTable.id;

// Frontend Security Group with more comprehensive rules
const frontendSecurityGroup = new aws.ec2.SecurityGroup("frontend-sg", {
  vpcId: vpc.id,
  description: "Allow HTTP/HTTPS traffic for frontend",
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
    Name: "Frontend Security Group",
    Description: "Controls frontend network access",
  },
});

// Backend Security Group with more specific configuration
const backendSecurityGroup = new aws.ec2.SecurityGroup("backend-sg", {
  vpcId: vpc.id,
  description: "Allow traffic to backend services",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 4007,
      toPort: 4007,
      securityGroups: [frontendSecurityGroup.id],
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
    Name: "Backend Security Group",
    Description: "Controls backend network access",
  },
});

// Database Security Group with enhanced security
const dbSecurityGroup = new aws.ec2.SecurityGroup("db-sg", {
  vpcId: vpc.id,
  description: "Allow MongoDB access from backend",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 27017,
      toPort: 27017,
      securityGroups: [backendSecurityGroup.id],
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
    Name: "MongoDB Security Group",
    Description: "Controls database network access",
  },
});

// MongoDB Instance with more robust setup
const dbInstance = new aws.ec2.Instance("mongodb-instance", {
  ami: "ami-047126e50991d067b",
  instanceType: "t2.micro",
  subnetId: privateSubnet.id,
  keyName: "exam",
  securityGroups: [dbSecurityGroup.id],
  userData: `#!/bin/bash
# Enhanced MongoDB installation script
set -e

# Update system and install dependencies
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get install -y wget gnupg

# Import MongoDB GPG key with error handling
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add - || {
  echo "Failed to import MongoDB GPG key"
  exit 1
}

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB with retry mechanism
max_attempts=3
attempt=0
while [ $attempt -lt $max_attempts ]; do
  sudo apt-get update && sudo apt-get install -y mongodb-org && break
  attempt=$((attempt+1))
  echo "Installation attempt $attempt failed. Retrying..."
  sleep 5
done

# Configure MongoDB for better security
sudo sed -i 's/^  bindIp: 127.0.0.1/  bindIp: 0.0.0.0/' /etc/mongod.conf
sudo sed -i 's/^#security:/security:\n  authorization: enabled/' /etc/mongod.conf

# Start and enable MongoDB
sudo systemctl restart mongod
sudo systemctl enable mongod

# Wait for MongoDB to start
sleep 10

# Create MongoDB user and database with error handling
mongosh <<EOF
use admin
try {
  db.createUser({
    user: "mongouser",
    pwd: "mongopassword",
    roles: [
      { role: "readWrite", db: "todo_db" }
    ]
  });
  print("User created successfully");
} catch (error) {
  print("Error creating user: " + error);
  throw error;
}
EOF
  `,
  tags: {
    Name: "MongoDB",
    Purpose: "Todo App Database",
  },
});

// Backend Instances with improved configuration
const backendInstances = [0, 1, 2].map(
  (i) =>
    new aws.ec2.Instance(`backend-${i}`, {
      ami: "ami-047126e50991d067b",
      instanceType: "t2.micro",
      subnetId: privateSubnet.id,
      keyName: "exam",
      securityGroups: [backendSecurityGroup.id],
      userData: `#!/bin/bash
# Improved backend deployment script
set -e

sudo apt-get update -y
sudo apt-get install -y docker.io

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Pull and run backend container with comprehensive environment variables
sudo docker run -d \
    --name todo-backend-${i} \
    --restart unless-stopped \
    -p 4007:4007 \
    -e DB_HOST=${dbInstance.privateIp} \
    -e DB_PORT=27017 \
    -e DB_USER=mongouser \
    -e DB_PASSWORD=mongopassword \
    -e DB_NAME=todo_db \
    -e JWT_SECRET=$(openssl rand -base64 32) \
    pabel1/todo-backend:latest
      `,
      tags: {
        Name: `Backend-${i}`,
        Type: "Todo App Backend",
      },
    })
);

// NGINX Load Balancer with enhanced configuration
const nginxInstance = new aws.ec2.Instance("nginx-load-balancer", {
  ami: "ami-047126e50991d067b",
  instanceType: "t2.micro",
  subnetId: publicSubnet.id,
  keyName: "exam",
  securityGroups: [frontendSecurityGroup.id],
  userData: `#!/bin/bash
# Comprehensive Nginx Load Balancer setup
sudo apt-get update -y
sudo apt-get install -y nginx

# Create advanced Nginx configuration
cat <<'EOT' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    upstream backend {
        least_conn;
        server ${backendInstances[0].privateIp}:4007;
        server ${backendInstances[1].privateIp}:4007;
        server ${backendInstances[2].privateIp}:4007;
        keepalive 32;
    }

    server {
        listen 80;
        listen [::]:80;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOT

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
  `,
  tags: {
    Name: "Nginx-Load-Balancer",
    Purpose: "Backend Load Balancing",
  },
});

// Frontend Instance with improved deployment
const frontendInstance = new aws.ec2.Instance("frontend", {
  ami: "ami-047126e50991d067b",
  instanceType: "t2.micro",
  subnetId: publicSubnet.id,
  keyName: "exam",
  securityGroups: [frontendSecurityGroup.id],
  userData: `#!/bin/bash
# Enhanced frontend deployment script
set -e

sudo apt-get update -y
sudo apt-get install -y docker.io nginx

# Enable and start services
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl enable nginx

# Run frontend container
sudo docker run -d \
    --name todo-frontend \
    --restart unless-stopped \
    -p 3030:3000 \
    pabel1/todo-app-frontend:latest

# Configure Nginx as a reverse proxy
cat <<'EOT' > /etc/nginx/sites-available/frontend
server {
    listen 80;
    listen [::]:80;

    location / {
        proxy_pass http://localhost:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOT

# Enable configuration
ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
  `,
  tags: {
    Name: "Frontend",
    Type: "Todo App Frontend",
  },
});

// Comprehensive outputs
exports.vpcDetails = {
  id: vpc.id,
  publicSubnetId: publicSubnet.id,
  privateSubnetId: privateSubnet.id,
};

exports.databaseDetails = {
  host: dbInstance.privateIp,
  port: 27017,
  user: "mongouser",
  databaseName: "todo_db",
};

exports.instanceDetails = {
  frontendPublicIp: frontendInstance.publicIp,
  nginxLoadBalancerIp: nginxInstance.publicIp,
  backendInstanceIps: backendInstances.map((instance) => instance.privateIp),
};
