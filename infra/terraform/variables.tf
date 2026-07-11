variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Deployment environment used for resource naming"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "letshop"
}

variable "ubuntu_ami_id" {
  description = "Ubuntu AMI ID for EC2 instances"
  type        = string
  default     = "ami-06259b63260eddc13"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs. EKS needs at least two subnets in different availability zones."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair for SSH access"
  type        = string
  default     = "/Users/admin/Downloads/my-Key"
}

variable "admin_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the EC2 servers"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "monitoring_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access Grafana, Prometheus, and optional Alertmanager"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "monitoring_instance_type" {
  description = "EC2 instance type for the monitoring server"
  type        = string
  default     = "c7i-flex.large"
}

variable "monitoring_root_volume_size" {
  description = "Root EBS volume size in GB for the monitoring server"
  type        = number
  default     = 8
}

variable "prometheus_enabled" {
  description = "Whether to install Prometheus on the monitoring server"
  type        = bool
  default     = true
}

variable "prometheus_version" {
  description = "Prometheus version to install"
  type        = string
  default     = "2.51.2"
}

variable "grafana_enabled" {
  description = "Whether to install Grafana on the monitoring server"
  type        = bool
  default     = true
}

variable "grafana_admin_password" {
  description = "Optional Grafana admin password. Leave empty to use Grafana's default first-login flow."
  type        = string
  sensitive   = true
  default     = ""
}

variable "alertmanager_enabled" {
  description = "Whether to install and expose Alertmanager on port 9093"
  type        = bool
  default     = false
}

variable "alertmanager_version" {
  description = "Alertmanager version to install when alertmanager_enabled is true"
  type        = string
  default     = "0.27.0"
}

variable "ecr_backend_name" {
  description = "Name for the backend ECR repository (defaults to {app_name}-{environment}-backend)"
  type        = string
  default     = ""
}

variable "ecr_frontend_name" {
  description = "Name for the frontend ECR repository (defaults to {app_name}-{environment}-frontend)"
  type        = string
  default     = ""
}

variable "ecr_image_tag_mutability" {
  description = "ECR image tag mutability: MUTABLE or IMMUTABLE"
  type        = string
  default     = "MUTABLE"
}

variable "ecr_scan_on_push" {
  description = "Whether to scan ECR images on push"
  type        = bool
  default     = true
}

variable "ecr_force_delete" {
  description = "Whether Terraform can delete ECR repositories even if they contain images"
  type        = bool
  default     = true
}

variable "eks_enabled" {
  description = "Whether to create the EKS cluster and managed worker nodes for backend/frontend workloads"
  type        = bool
  default     = true
}

variable "eks_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "eks_public_access_cidr_blocks" {
  description = "CIDR blocks allowed to reach the public EKS API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS managed worker nodes"
  type        = list(string)
  default     = ["c7i-flex.large"]
}

variable "eks_node_capacity_type" {
  description = "Capacity type for EKS managed worker nodes"
  type        = string
  default     = "ON_DEMAND"
}

variable "eks_node_disk_size" {
  description = "Disk size in GB for EKS worker nodes"
  type        = number
  default     = 20
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 3
}
