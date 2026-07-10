# DevOps Framework Terraform Infrastructure

This Terraform project creates AWS infrastructure for this DevOps framework:

- Jenkins Controller EC2
- Jenkins Agent EC2
- SonarQube EC2
- Prometheus + Grafana EC2
- Optional single Kubernetes/k3s node EC2
- VPC, public subnet, internet gateway, route table
- Security group for Jenkins, SonarQube, Prometheus, Grafana, app ports, and SSH

## Important cost note

This creates multiple EC2 instances. It is not free-tier only. For learning, you can reduce cost by disabling the Kubernetes node or using smaller instances, but SonarQube and Jenkins agents usually need more memory.

## Before running

Make sure you have:

1. AWS CLI configured:

```bash
aws configure
```

2. Terraform installed:

```bash
terraform -v
```

3. SSH key available:

```bash
ls ~/.ssh/id_rsa.pub
```

If you do not have one:

```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

## Usage

Copy the example variables file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit this file:

```bash
nano terraform.tfvars
```

Recommended: replace `0.0.0.0/0` with your public IP:

```hcl
allowed_ssh_cidr = "YOUR_PUBLIC_IP/32"
allowed_web_cidr = "YOUR_PUBLIC_IP/32"
```

Then run:

```bash
terraform init
terraform plan
terraform apply
```

## Access URLs

After apply, Terraform prints:

- Jenkins Controller: `http://JENKINS_CONTROLLER_IP:8080`
- SonarQube: `http://SONARQUBE_IP:9000`
- Prometheus: `http://MONITORING_IP:9090`
- Grafana: `http://MONITORING_IP:3000`

## Get Jenkins initial password

SSH into Jenkins controller:

```bash
ssh ubuntu@JENKINS_CONTROLLER_PUBLIC_IP
```

Then run:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

## Connect Jenkins Agent

In Jenkins UI:

```text
Manage Jenkins → Nodes → New Node → Permanent Agent
```

Use:

```text
Remote root directory: /home/ubuntu/jenkins
Launch method: SSH
Host: Jenkins agent private IP from Terraform output
Credentials: SSH private key
Label: docker-agent
```

## SonarQube login

Open SonarQube:

```text
http://SONARQUBE_IP:9000
```

Default login:

```text
admin / admin
```

Create a token and save it in Jenkins credentials.

## Grafana login

Open Grafana:

```text
http://MONITORING_IP:3000
```

Default login:

```text
admin / admin
```

## Destroy infrastructure

When done, destroy to avoid AWS charges:

```bash
terraform destroy
```
