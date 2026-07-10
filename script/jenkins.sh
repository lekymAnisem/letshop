#!/bin/bash
# Jenkins installation on Ubuntu (updated)
# Based on official Jenkins docs: https://www.jenkins.io/doc/book/installing/linux/

set -e

echo "Updating package index..."
sudo apt update -y

echo "Installing Java 21 (required for Jenkins)..."
sudo apt install -y fontconfig openjdk-21-jre

echo "Adding Jenkins official repository..."
sudo mkdir -p /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

echo "Installing Jenkins LTS..."
sudo apt update -y
sudo apt install -y jenkins

echo "Jenkins installation complete!"
echo "Access it at: http://$(hostname -I | awk '{print $1}'):8080"
echo "Initial admin password: sudo cat /var/lib/jenkins/secr
