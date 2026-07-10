output "jenkins_controller_url" {
  value = "http://${aws_instance.jenkins_controller.public_ip}:8080"
}

output "jenkins_agent_public_ip" {
  value = aws_instance.jenkins_agent.public_ip
}

output "jenkins_agent_private_ip" {
  value = aws_instance.jenkins_agent.private_ip
}

output "sonarqube_url" {
  value = "http://${aws_instance.sonarqube.public_ip}:9000"
}

output "prometheus_url" {
  value = "http://${aws_instance.monitoring.public_ip}:9090"
}

output "grafana_url" {
  value = "http://${aws_instance.monitoring.public_ip}:3000"
}

output "kubernetes_node_public_ip" {
  value = try(aws_instance.kubernetes_node[0].public_ip, null)
}

output "ssh_examples" {
  value = {
    jenkins_controller = "ssh ubuntu@${aws_instance.jenkins_controller.public_ip}"
    jenkins_agent      = "ssh ubuntu@${aws_instance.jenkins_agent.public_ip}"
    sonarqube          = "ssh ubuntu@${aws_instance.sonarqube.public_ip}"
    monitoring         = "ssh ubuntu@${aws_instance.monitoring.public_ip}"
    kubernetes_node    = try("ssh ubuntu@${aws_instance.kubernetes_node[0].public_ip}", null)
  }
}
