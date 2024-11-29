.PHONY: all aws-login pulumi-login stack-init pulumi-up

all: aws-login pulumi-login stack-init pulumi-up

aws-login:
	@echo Configuring AWS CLI
	aws configure

pulumi-login:
	@echo Logging into Pulumi
	pulumi login

stack-init:
	@echo Initializing or selecting Pulumi stack
	pulumi stack select new-2 || pulumi stack init new-2

pulumi-up:
	@echo Running Pulumi up
	pulumi up -y