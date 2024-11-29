# Pulumi AWS Infrastructure Setup Guide

## This document explains how to configure and deploy AWS infrastructure using Pulumi with the provided Makefile and Pulumi program.

# Prerequisites

# Installed Tools:

Node.js (for Pulumi and dependencies)
Pulumi CLI
AWS CLI
Make

# Configured Tools:

AWS CLI must be authenticated and configured with a valid profile.
Pulumi CLI should be installed and configured.

# Environment Variables:

# Ensure the following environment variables are set either in a .env file or in your shell:

makefile

Customize the config.js file with your desired CIDR blocks, availability zones, instance types, etc.

# Steps to Deploy

1. Clone the Repository
   Clone the repository containing the Pulumi configuration files and Makefile.

git clone <repository-url>
cd <repository-folder> 2. Install Node.js Dependencies
Install all required dependencies for Pulumi.

```bash
npm install
```

# 3. Authenticate AWS CLI

Run the following command to configure AWS CLI with access to your AWS account.

```bash
make aws-login
```

# This will prompt you for:

AWS Access Key ID
AWS Secret Access Key
Default region name
Default output format

# 4. Log into Pulumi

Authenticate Pulumi with your account.

```bash
make pulumi-login
```

If not using the Makefile, manually run:

# 5. Initialize or Select Pulumi Stack

Select the existing stack or create a new one.

```bash
make stack-init
```

# The stack name used is new-2. Modify this in the Makefile if required.

# 6. Run Pulumi Up

Deploy the infrastructure using Pulumi.

```bash
make pulumi-up
```

This command will:

Validate your Pulumi program.
Display the changes that will be applied to your AWS infrastructure.
Deploy resources such as VPC, subnets, security groups, instances, and load balancers.
Pulumi will prompt you to confirm the changes. If you want to skip confirmation, use the -y flag as in the Makefile.

# 7. Verify Deployment

After successful deployment, Pulumi will output the following:

VPC ID
Public Subnet IDs
Private Subnet IDs
Frontend Instance IDs
Backend Instance IDs
Mongo Instance IDs
ALB DNS Name
Use these outputs to verify that your infrastructure was created successfully.

# Key Infrastructure Components

VPC:

Main Virtual Private Cloud with custom CIDR block.
Includes public and private subnets in multiple availability zones for high availability.
Internet Gateway & NAT Gateways:

Internet Gateway for public subnets.
NAT Gateways for private subnets to access the internet.
Security Groups:

Frontend SG: Allows HTTP/HTTPS traffic.
Backend SG: Allows traffic from the frontend security group.
MongoDB SG: Allows traffic from the backend security group.
EC2 Instances:

Frontend, backend, and MongoDB instances deployed in their respective subnets.
Application Load Balancer (ALB):

Distributes traffic to the frontend and backend target groups.

# Project Structure:

aws-infra/

# ├── package.json

# ├── package-lock.json

# ├── Pulumi.yaml

# ├── Pulumi.dev.yaml

# ├── index.js

# ├── config.js

# └── README.md

# └── .env
