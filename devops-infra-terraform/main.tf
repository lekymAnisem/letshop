provider "aws" {
  region = var.aws_region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-subnet"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_key_pair" "main" {
  key_name   = "${local.name_prefix}-key"
  public_key = file(pathexpand(var.public_key_path))

  tags = local.common_tags
}

resource "aws_security_group" "devops" {
  name        = "${local.name_prefix}-devops-sg"
  description = "Security group for DevOps framework servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "Jenkins"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "SonarQube"
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Prometheus"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Grafana"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Application HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Application HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Backend app port"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Kubernetes API / k3s"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_web_cidr]
  }

  ingress {
    description = "Allow all internal traffic between DevOps servers"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-devops-sg"
  })
}

resource "aws_instance" "jenkins_controller" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type_controller
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.devops.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true
  user_data                   = file("${path.module}/install_jenkins_controller.sh")

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-jenkins-controller"
    Role = "jenkins-controller"
  })
}

resource "aws_instance" "jenkins_agent" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type_agent
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.devops.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true
  user_data                   = file("${path.module}/install_jenkins_agent.sh")

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-jenkins-agent"
    Role = "jenkins-agent"
  })
}

resource "aws_instance" "sonarqube" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type_sonarqube
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.devops.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true
  user_data                   = file("${path.module}/install_sonarqube.sh")

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-sonarqube"
    Role = "sonarqube"
  })
}

resource "aws_instance" "monitoring" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type_monitoring
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.devops.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true
  user_data                   = file("${path.module}/install_monitoring.sh")

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-monitoring"
    Role = "monitoring"
  })
}

resource "aws_instance" "kubernetes_node" {
  count                       = var.create_kubernetes_node ? 1 : 0
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type_kubernetes
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.devops.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true

  user_data = <<-EOF
#!/bin/bash
set -eux
apt-get update -y
apt-get install -y curl git docker.io
systemctl enable docker
systemctl start docker
curl -sfL https://get.k3s.io | sh -
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown -R ubuntu:ubuntu /home/ubuntu/.kube
EOF

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kubernetes-node"
    Role = "kubernetes"
  })
}
