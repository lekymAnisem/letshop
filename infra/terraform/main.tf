provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.app_name}-${var.environment}"
  common_tags = {
    Application = var.app_name
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
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}${count.index == 0 ? "a" : "b"}"

  tags = merge(local.common_tags, {
    Name                                             = "${local.name_prefix}-public-subnet-${count.index + 1}"
    "kubernetes.io/cluster/${local.name_prefix}-eks" = "shared"
    "kubernetes.io/role/elb"                         = 1
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
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "monitoring" {
  name        = "${local.name_prefix}-monitoring-sg"
  description = "Security group for monitoring server (Prometheus, Grafana)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_allowed_cidr_blocks
  }

  ingress {
    description = "Prometheus UI"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = var.monitoring_allowed_cidr_blocks
  }

  ingress {
    description = "Grafana UI"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.monitoring_allowed_cidr_blocks
  }

  dynamic "ingress" {
    for_each = var.alertmanager_enabled ? [1] : []
    content {
      description = "Alertmanager UI"
      from_port   = 9093
      to_port     = 9093
      protocol    = "tcp"
      cidr_blocks = var.monitoring_allowed_cidr_blocks
    }
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-monitoring-sg"
  })
}

resource "aws_key_pair" "main" {
  key_name   = "${local.name_prefix}-key"
  public_key = file(pathexpand("${var.ssh_key_name}.pub"))

  tags = local.common_tags
}

resource "aws_instance" "monitoring" {
  ami                         = var.ubuntu_ami_id
  instance_type               = var.monitoring_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.monitoring.id]
  key_name                    = aws_key_pair.main.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.monitoring_root_volume_size
    volume_type = "gp3"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-monitoring"
    Role = "monitoring"
  })
}

resource "aws_ecr_repository" "backend" {
  name                 = var.ecr_backend_name != "" ? var.ecr_backend_name : "${local.name_prefix}-backend"
  image_tag_mutability = var.ecr_image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.ecr_scan_on_push
  }

  force_delete = var.ecr_force_delete

  tags = local.common_tags
}

resource "aws_ecr_repository" "frontend" {
  name                 = var.ecr_frontend_name != "" ? var.ecr_frontend_name : "${local.name_prefix}-frontend"
  image_tag_mutability = var.ecr_image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.ecr_scan_on_push
  }

  force_delete = var.ecr_force_delete

  tags = local.common_tags
}

resource "aws_eks_cluster" "main" {
  count    = var.eks_enabled ? 1 : 0
  name     = "${local.name_prefix}-eks"
  role_arn = aws_iam_role.eks[0].arn
  version  = var.eks_version

  vpc_config {
    subnet_ids              = aws_subnet.public[*].id
    endpoint_private_access = false
    endpoint_public_access  = true
    public_access_cidrs     = var.eks_public_access_cidr_blocks
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks"
  })
}

resource "aws_iam_role" "eks" {
  count = var.eks_enabled ? 1 : 0
  name  = "${local.name_prefix}-eks-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_policy" {
  count      = var.eks_enabled ? 1 : 0
  role       = aws_iam_role.eks[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource" {
  count      = var.eks_enabled ? 1 : 0
  role       = aws_iam_role.eks[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
}

resource "aws_iam_role" "eks_nodes" {
  count = var.eks_enabled ? 1 : 0
  name  = "${local.name_prefix}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  count      = var.eks_enabled ? 1 : 0
  role       = aws_iam_role.eks_nodes[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni" {
  count      = var.eks_enabled ? 1 : 0
  role       = aws_iam_role.eks_nodes[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_ecr" {
  count      = var.eks_enabled ? 1 : 0
  role       = aws_iam_role.eks_nodes[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "main" {
  count           = var.eks_enabled ? 1 : 0
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${local.name_prefix}-eks-nodes"
  node_role_arn   = aws_iam_role.eks_nodes[0].arn
  subnet_ids      = aws_subnet.public[*].id

  instance_types = var.eks_node_instance_types
  capacity_type  = var.eks_node_capacity_type
  disk_size      = var.eks_node_disk_size

  scaling_config {
    min_size     = var.eks_node_min_size
    desired_size = var.eks_node_desired_size
    max_size     = var.eks_node_max_size
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks-nodes"
  })
}
