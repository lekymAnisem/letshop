pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    tools {
        jdk 'jdk21'
        nodejs 'node20'
    }

    environment {
        AWS_REGION   = 'ap-southeast-2'
        AWS_CREDS_ID = 'aws-creds'

        APP_NAME    = 'letshop'
        ENVIRONMENT = 'dev'

        ECR_BACKEND  = "${APP_NAME}-${ENVIRONMENT}-backend"
        ECR_FRONTEND = "${APP_NAME}-${ENVIRONMENT}-frontend"
        EKS_CLUSTER  = 'letshop-dev-eks'

        K8S_NAMESPACE = 'letshop'
        IMAGE_TAG     = "${BUILD_NUMBER}"

        SONAR_SERVER = 'Sonarserver'
        SONAR_TOOL   = 'SonarQube'
    }

    stages {
        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-token',
                    url: 'https://github.com/lekymAnisem/letshop.git'
            }
        }

        stage('Verify Project Structure') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    echo "Current workspace:"
                    pwd

                    echo "Repository contents:"
                    ls -la

                    test -d backend || { echo "ERROR: backend directory was not found"; exit 1; }
                    test -d frontend || { echo "ERROR: frontend directory was not found"; exit 1; }
                    test -f backend/package.json || { echo "ERROR: backend/package.json was not found"; exit 1; }
                    test -f frontend/package.json || { echo "ERROR: frontend/package.json was not found"; exit 1; }
                    test -d infra/k8s || { echo "ERROR: infra/k8s directory was not found"; exit 1; }
                    test -f infra/k8s/namespace.yaml || { echo "ERROR: infra/k8s/namespace.yaml was not found"; exit 1; }
                    test -f infra/k8s/backend-deployment.yaml || { echo "ERROR: infra/k8s/backend-deployment.yaml was not found"; exit 1; }
                    test -f infra/k8s/frontend-deployment.yaml || { echo "ERROR: infra/k8s/frontend-deployment.yaml was not found"; exit 1; }
                '''
            }
        }

        stage('Verify Required Tools') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    echo "Node version:"
                    node --version

                    echo "NPM version:"
                    npm --version

                    echo "Java version:"
                    java -version

                    echo "Docker version:"
                    docker --version

                    echo "AWS CLI version:"
                    aws --version

                    echo "kubectl version:"
                    kubectl version --client

                    echo "Trivy version:"
                    trivy --version
                '''
            }
        }

        stage('Initialize AWS') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    script {
                        env.AWS_ACCOUNT_ID = sh(
                            script: '''#!/usr/bin/env bash
                                set -euo pipefail

                                aws sts get-caller-identity \
                                    --query Account \
                                    --output text
                            ''',
                            returnStdout: true
                        ).trim()

                        if (!env.AWS_ACCOUNT_ID) {
                            error('Unable to retrieve AWS account ID')
                        }

                        env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                        env.BACKEND_IMAGE = "${env.ECR_REGISTRY}/${env.ECR_BACKEND}:${env.IMAGE_TAG}"
                        env.FRONTEND_IMAGE = "${env.ECR_REGISTRY}/${env.ECR_FRONTEND}:${env.IMAGE_TAG}"

                        echo "AWS account ID detected: ${env.AWS_ACCOUNT_ID}"
                        echo "AWS region: ${env.AWS_REGION}"
                        echo "Backend image: ${env.BACKEND_IMAGE}"
                        echo "Frontend image: ${env.FRONTEND_IMAGE}"
                    }
                }
            }
        }

        stage('Verify ECR Repositories') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail

                        aws ecr describe-repositories \
                            --repository-names "$ECR_BACKEND" \
                            --region "$AWS_REGION" >/dev/null

                        aws ecr describe-repositories \
                            --repository-names "$ECR_FRONTEND" \
                            --region "$AWS_REGION" >/dev/null

                        echo "Verified ECR repositories:"
                        echo "- $ECR_BACKEND"
                        echo "- $ECR_FRONTEND"
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if [ -f package-lock.json ]; then
                                    npm ci
                                else
                                    npm install
                                fi
                            '''
                        }
                    }
                }

                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if [ -f package-lock.json ]; then
                                    npm ci
                                else
                                    npm install
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('TypeScript Check') {
            parallel {
                stage('Backend TypeScript') {
                    steps {
                        dir('backend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if npm pkg get scripts.typecheck | grep -vq null; then
                                    npm run typecheck
                                elif [ -x node_modules/.bin/tsc ]; then
                                    npx --no-install tsc --noEmit
                                else
                                    echo "TypeScript check is not configured for backend. Skipping."
                                fi
                            '''
                        }
                    }
                }

                stage('Frontend TypeScript') {
                    steps {
                        dir('frontend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if npm pkg get scripts.typecheck | grep -vq null; then
                                    npm run typecheck
                                elif [ -x node_modules/.bin/tsc ]; then
                                    npx --no-install tsc -b --noEmit
                                else
                                    echo "TypeScript check is not configured for frontend. Skipping."
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Run Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if npm pkg get scripts.test | grep -vq null; then
                                    npm test
                                else
                                    echo "No backend test script configured. Skipping."
                                fi
                            '''
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                if npm pkg get scripts.test | grep -vq null; then
                                    npm test
                                else
                                    echo "No frontend test script configured. Skipping."
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('SonarQube Backend Analysis') {
            steps {
                script {
                    def scannerHome = tool(
                        name: env.SONAR_TOOL,
                        type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    )

                    dir('backend') {
                        withSonarQubeEnv(env.SONAR_SERVER) {
                            sh """#!/usr/bin/env bash
                                set -euo pipefail

                                echo "SonarScanner location: ${scannerHome}"

                                "${scannerHome}/bin/sonar-scanner" \\
                                    -Dsonar.projectKey=letshop-backend \\
                                    -Dsonar.projectName="LetShop Backend" \\
                                    -Dsonar.sources=src \\
                                    -Dsonar.sourceEncoding=UTF-8 \\
                                    -Dsonar.exclusions="node_modules/**,dist/**,coverage/**"
                            """
                        }
                    }
                }
            }
        }

        stage('Backend Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('SonarQube Frontend Analysis') {
            steps {
                script {
                    def scannerHome = tool(
                        name: env.SONAR_TOOL,
                        type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    )

                    dir('frontend') {
                        withSonarQubeEnv(env.SONAR_SERVER) {
                            sh """#!/usr/bin/env bash
                                set -euo pipefail

                                echo "SonarScanner location: ${scannerHome}"

                                "${scannerHome}/bin/sonar-scanner" \\
                                    -Dsonar.projectKey=letshop-frontend \\
                                    -Dsonar.projectName="LetShop Frontend" \\
                                    -Dsonar.sources=src \\
                                    -Dsonar.sourceEncoding=UTF-8 \\
                                    -Dsonar.exclusions="node_modules/**,dist/**,coverage/**"
                            """
                        }
                    }
                }
            }
        }

        stage('Frontend Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy File System Scan') {
            steps {
                sh '''#!/usr/bin/env bash
                    set +e

                    trivy fs \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-fs.txt \
                        .

                    trivy_exit_code=$?
                    echo "Trivy file-system scan exit code: ${trivy_exit_code}"

                    exit 0
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'trivy-fs.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Login to ECR') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                        docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"
                    '''
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    backend_uri="${ECR_REGISTRY}/${ECR_BACKEND}"

                    docker build \
                        --tag "${backend_uri}:${IMAGE_TAG}" \
                        --tag "${backend_uri}:latest" \
                        ./backend
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    frontend_uri="${ECR_REGISTRY}/${ECR_FRONTEND}"

                    docker build \
                        --build-arg VITE_API_URL=/api \
                        --tag "${frontend_uri}:${IMAGE_TAG}" \
                        --tag "${frontend_uri}:latest" \
                        ./frontend
                '''
            }
        }

        stage('Trivy Backend Image Scan') {
            steps {
                sh '''#!/usr/bin/env bash
                    set +e

                    trivy image \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-backend-image.txt \
                        "$BACKEND_IMAGE"

                    trivy_exit_code=$?
                    echo "Trivy backend image scan exit code: ${trivy_exit_code}"

                    exit 0
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'trivy-backend-image.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Trivy Frontend Image Scan') {
            steps {
                sh '''#!/usr/bin/env bash
                    set +e

                    trivy image \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-frontend-image.txt \
                        "$FRONTEND_IMAGE"

                    trivy_exit_code=$?
                    echo "Trivy frontend image scan exit code: ${trivy_exit_code}"

                    exit 0
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'trivy-frontend-image.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Push Backend Image') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    backend_uri="${ECR_REGISTRY}/${ECR_BACKEND}"

                    docker push "${backend_uri}:${IMAGE_TAG}"
                    docker push "${backend_uri}:latest"
                '''
            }
        }

        stage('Push Frontend Image') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    frontend_uri="${ECR_REGISTRY}/${ECR_FRONTEND}"

                    docker push "${frontend_uri}:${IMAGE_TAG}"
                    docker push "${frontend_uri}:latest"
                '''
            }
        }

        stage('Configure EKS Access') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    withEnv(["KUBECONFIG=${env.WORKSPACE}/.kube/config"]) {
                        sh '''#!/usr/bin/env bash
                            set -euo pipefail

                            mkdir -p "$(dirname "$KUBECONFIG")"
                            rm -f "$KUBECONFIG"

                            aws sts get-caller-identity

                            aws eks update-kubeconfig \
                                --name "$EKS_CLUSTER" \
                                --region "$AWS_REGION" \
                                --kubeconfig "$KUBECONFIG"

                            echo "Current Kubernetes context:"
                            kubectl config current-context

                            kubectl cluster-info
                            kubectl get nodes
                        '''
                    }
                }
            }
        }

        stage('Render Kubernetes Manifests') {
            steps {
                sh '''#!/usr/bin/env bash
                    set -euo pipefail

                    rm -rf rendered-k8s
                    mkdir -p rendered-k8s

                    cp infra/k8s/*.yaml rendered-k8s/

                    sed -i \
                        "s|\\${ECR_BACKEND_IMAGE}|${BACKEND_IMAGE}|g" \
                        rendered-k8s/backend-deployment.yaml

                    sed -i \
                        "s|\\${ECR_FRONTEND_IMAGE}|${FRONTEND_IMAGE}|g" \
                        rendered-k8s/frontend-deployment.yaml

                    echo "Rendered backend image:"
                    grep -n "image:" rendered-k8s/backend-deployment.yaml

                    echo "Rendered frontend image:"
                    grep -n "image:" rendered-k8s/frontend-deployment.yaml
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    withEnv(["KUBECONFIG=${env.WORKSPACE}/.kube/config"]) {
                        sh '''#!/usr/bin/env bash
                            set -euo pipefail

                            test -f "$KUBECONFIG" || {
                                echo "ERROR: KUBECONFIG was not found at $KUBECONFIG"
                                exit 1
                            }

                            kubectl apply -f rendered-k8s/namespace.yaml

                            if [ -f rendered-k8s/configmap.yaml ]; then
                                kubectl apply -f rendered-k8s/configmap.yaml
                            fi

                            if [ -f rendered-k8s/secrets.yaml ]; then
                                echo "WARNING: Applying rendered-k8s/secrets.yaml. Avoid committing plaintext secrets to Git."
                                kubectl apply -f rendered-k8s/secrets.yaml
                            fi

                            kubectl apply -f rendered-k8s/backend-deployment.yaml
                            kubectl apply -f rendered-k8s/frontend-deployment.yaml

                            if [ -f rendered-k8s/backend-service.yaml ]; then
                                kubectl apply -f rendered-k8s/backend-service.yaml
                            fi

                            if [ -f rendered-k8s/frontend-service.yaml ]; then
                                kubectl apply -f rendered-k8s/frontend-service.yaml
                            fi

                            if [ -f rendered-k8s/ingress.yaml ]; then
                                kubectl apply -f rendered-k8s/ingress.yaml
                            fi
                        '''
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    withEnv(["KUBECONFIG=${env.WORKSPACE}/.kube/config"]) {
                        timeout(time: 10, unit: 'MINUTES') {
                            sh '''#!/usr/bin/env bash
                                set -euo pipefail

                                test -f "$KUBECONFIG" || {
                                    echo "ERROR: KUBECONFIG was not found at $KUBECONFIG"
                                    exit 1
                                }

                                kubectl rollout status \
                                    deployment/letshop-backend \
                                    --namespace "$K8S_NAMESPACE" \
                                    --timeout=600s

                                kubectl rollout status \
                                    deployment/letshop-frontend \
                                    --namespace "$K8S_NAMESPACE" \
                                    --timeout=600s

                                echo "Pods:"
                                kubectl get pods \
                                    --namespace "$K8S_NAMESPACE" \
                                    -o wide

                                echo "Services:"
                                kubectl get services \
                                    --namespace "$K8S_NAMESPACE"

                                echo "Ingress:"
                                kubectl get ingress \
                                    --namespace "$K8S_NAMESPACE"
                            '''
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployment succeeded: backend/frontend version ${BUILD_NUMBER}"
        }

        failure {
            echo "Pipeline failed for build ${BUILD_NUMBER}"

            script {
                withAWS(credentials: env.AWS_CREDS_ID, region: env.AWS_REGION) {
                    withEnv(["KUBECONFIG=${env.WORKSPACE}/.kube/config"]) {
                        sh '''#!/usr/bin/env bash
                            set +e

                            if [ -f "$KUBECONFIG" ]; then
                                echo "Pods:"
                                kubectl get pods \
                                    --namespace "$K8S_NAMESPACE" \
                                    -o wide 2>/dev/null || true

                                echo "Recent events:"
                                kubectl get events \
                                    --namespace "$K8S_NAMESPACE" \
                                    --sort-by=.metadata.creationTimestamp \
                                    2>/dev/null | tail -50 || true
                            else
                                echo "Kubeconfig was not created; skipping Kubernetes diagnostics."
                            fi
                        '''
                    }
                }
            }
        }

        always {
            archiveArtifacts(
                artifacts: 'rendered-k8s/*.yaml',
                allowEmptyArchive: true
            )

            script {
                if (env.ECR_REGISTRY?.trim()) {
                    sh '''#!/usr/bin/env bash
                        set +e

                        docker logout "$ECR_REGISTRY" 2>/dev/null || true
                    '''
                }

                sh '''#!/usr/bin/env bash
                    set +e

                    rm -rf .kube
                    docker image prune -f >/dev/null 2>&1 || true
                '''
            }
        }
    }
}
