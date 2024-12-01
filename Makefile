.PHONY: all aws-login pulumi-login stack-init pulumi-up key-pair 

# Configuration
KEY_NAME ?= exam
KEY_PATH := $(HOME)/.aws/keys/$(KEY_NAME).pem
STACK_NAME ?= new-4
OS := $(shell uname -s)

# Default target
all: key-pair aws-login pulumi-login stack-init pulumi-up

# Create AWS Key Pair with cross-platform support
key-pair:
	@echo "Checking/Creating AWS Key Pair: $(KEY_NAME)"
	@mkdir -p $(dir $(KEY_PATH))
	@if ! aws ec2 describe-key-pairs --key-names $(KEY_NAME) > /dev/null 2>&1; then \
		aws ec2 create-key-pair \
			--key-name $(KEY_NAME) \
			--query 'KeyMaterial' \
			--output text > $(KEY_PATH); \
		chmod 400 $(KEY_PATH); \
		echo "Key pair $(KEY_NAME) created successfully at $(KEY_PATH)"; \
	else \
		echo "Key pair $(KEY_NAME) already exists"; \
	fi

# AWS Login with optional profile support
aws-login:
	@echo "Configuring AWS CLI"
	@if [ -z "$(AWS_PROFILE)" ]; then \
		aws configure; \
	else \
		echo "Using AWS Profile: $(AWS_PROFILE)"; \
		aws configure --profile $(AWS_PROFILE); \
	fi

# Pulumi Login with optional backend
pulumi-login:
	@echo "Logging into Pulumi"
	@if [ -z "$(PULUMI_BACKEND_URL)" ]; then \
		pulumi login; \
	else \
		pulumi login $(PULUMI_BACKEND_URL); \
	fi

# Stack initialization or selection
stack-init:
	@echo "Initializing or selecting Pulumi stack: $(STACK_NAME)"
	pulumi stack select $(STACK_NAME) || pulumi stack init $(STACK_NAME)

# Pulumi up with optional destroy option and dependency installation
pulumi-up:
	@echo "Installing Pulumi dependencies"
	# npm install @pulumi/pulumi @pulumi/aws
	
	@echo "Running Pulumi up"
	@if [ "$(DESTROY)" = "true" ]; then \
		pulumi destroy -y; \
	else \
		pulumi up -y; \
	fi

# Clean up Pulumi stack and key pair
clean:
	@echo "Cleaning up Pulumi stack and key pair"
	pulumi stack rm $(STACK_NAME) -y
	@if aws ec2 describe-key-pairs --key-names $(KEY_NAME) > /dev/null 2>&1; then \
		aws ec2 delete-key-pair --key-name $(KEY_NAME); \
		rm -f $(KEY_PATH); \
		echo "Deleted key pair $(KEY_NAME)"; \
	fi

# Help target to show available commands
help:
	@echo "Available targets:"
	@echo "  all         : Run full setup (key-pair, aws-login, pulumi-login, stack-init, pulumi-up)"
	@echo "  key-pair    : Create AWS key pair if not exists"
	@echo "  aws-login   : Configure AWS CLI"
	@echo "  pulumi-login: Log into Pulumi"
	@echo "  stack-init  : Initialize or select Pulumi stack"
	@echo "  pulumi-up   : Deploy infrastructure"
	@echo "  clean       : Remove Pulumi stack and key pair"
	@echo ""
	@echo "Optional environment variables:"
	@echo "  KEY_NAME          : Custom key pair name (default: exam)"
	@echo "  AWS_PROFILE       : Specify AWS profile to use"
	@echo "  PULUMI_BACKEND_URL: Specify custom Pulumi backend"
	@echo "  STACK_NAME        : Custom Pulumi stack name (default: new-4)"
	@echo "  DESTROY=true      : Destroy infrastructure instead of creating"
	@echo ""
	@echo "Examples:"
	@echo "  make                    # Full deployment"
	@echo "  make KEY_NAME=mykey     # Use custom key name"
	@echo "  make DESTROY=true       # Destroy infrastructure"
	@echo "  make AWS_PROFILE=myaws  # Use specific AWS profile"