variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "devops-framework"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH to the instances. Replace with your public IP /32."
  type        = string
  default     = "0.0.0.0/0"
}

variable "allowed_web_cidr" {
  description = "CIDR allowed to access web dashboards. Replace with your public IP /32 for better security."
  type        = string
  default     = "0.0.0.0/0"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR block"
  type        = string
  default     = "10.10.1.0/24"
}

variable "instance_type_controller" {
  description = "Jenkins controller instance type"
  type        = string
  default     = "t3.small"
}

variable "instance_type_agent" {
  description = "Jenkins agent instance type"
  type        = string
  default     = "c7i-flex.large"
}


variable "instance_type_monitoring" {
  description = "Prometheus/Grafana instance type"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 30
}

variable "create_kubernetes_node" {
  description = "Create one EC2 node for lightweight Kubernetes/k3s/minikube experimentation"
  type        = bool
  default     = true
}

variable "instance_type_kubernetes" {
  description = "Kubernetes node instance type"
  type        = string
  default     = "c7i-flex.large"
}

variable "public_key_path" {
  description = "Path to your local public SSH key, ~/Users/admin/Downloads/my-Key.pem
  type        = string
  default     = "~/Users/admin/Downloads/my-Key.pem"
}
