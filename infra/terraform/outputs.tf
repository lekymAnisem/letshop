output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "ecr_backend_url" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.backend.name}"
}

output "ecr_frontend_url" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${aws_ecr_repository.frontend.name}"
}

output "monitoring_public_ip" {
  value = aws_instance.monitoring.public_ip
}

output "eks_cluster_name" {
  value = var.eks_enabled ? aws_eks_cluster.main[0].name : null
}

output "eks_cluster_endpoint" {
  value = var.eks_enabled ? aws_eks_cluster.main[0].endpoint : null
}

output "eks_node_group_name" {
  value = var.eks_enabled ? aws_eks_node_group.main[0].node_group_name : null
}
