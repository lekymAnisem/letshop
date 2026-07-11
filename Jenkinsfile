pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
    }

    tools {
        jdk 'jdk21'
        nodejs 'node20'
    }

    environment {
        AWS_REGION    = 'ap-southeast-2'
        APP_NAME      = 'letshop'
        ENVIRONMENT   = 'production'

        ECR_BACKEND   = "${APP_NAME}-${ENVIRONMENT}-backend"
        ECR_FRONTEND  = "${APP_NAME}-${ENVIRONMENT}-frontend"
        EKS_CLUSTER   = "letshop-dev-eks"

        K8S_NAMESPACE = 'letshop'
        IMAGE_TAG     = "${BUILD_NUMBER}"

        // Jenkins configuration names
        SONAR_SERVER  = 'sonar-scanner'
        SONAR_TOOL    = 'SonarQube'
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
                sh '''
                    set -e

                    echo "Current workspace:"
                    pwd

                    echo "Repository contents:"
                    ls -la

                    test -d backend || {
                        echo "ERROR: backend directory was not found"
                        exit 1
                    }

                    test -d frontend || {
                        echo "ERROR: frontend directory was not found"
                        exit 1
                    }

                    test -f backend/package.json || {
                        echo "ERROR: backend/package.json was not found"
                        exit 1
                    }

                    test -f frontend/package.json || {
                        echo "ERROR: frontend/package.json was not found"
                        exit 1
                    }

                    test -d infra/k8s || {
                        echo "ERROR: infra/k8s directory was not found"
                        exit 1
                    }
                '''
            }
        }

        stage('Verify Required Tools') {
            steps {
                sh '''
                    set -e

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
                script {
                    env.AWS_ACCOUNT_ID = sh(
                        script: '''
                            aws sts get-caller-identity \
                                --query Account \
                                --output text
                        ''',
                        returnStdout: true
                    ).trim()

                    if (!env.AWS_ACCOUNT_ID) {
                        error('Unable to retrieve AWS account ID')
                    }

                    echo "AWS account ID detected: ${env.AWS_ACCOUNT_ID}"
                    echo "AWS region: ${env.AWS_REGION}"
                }
            }
        }

        stage('Ensure ECR Repositories') {
            steps {
                sh '''
                    set -e

                    aws ecr describe-repositories \
                        --repository-names "$ECR_BACKEND" \
                        --region "$AWS_REGION" >/dev/null 2>&1 || \
                    aws ecr create-repository \
                        --repository-name "$ECR_BACKEND" \
                        --image-scanning-configuration scanOnPush=true \
                        --region "$AWS_REGION"

                    aws ecr describe-repositories \
                        --repository-names "$ECR_FRONTEND" \
                        --region "$AWS_REGION" >/dev/null 2>&1 || \
                    aws ecr create-repository \
                        --repository-name "$ECR_FRONTEND" \
                        --image-scanning-configuration scanOnPush=true \
                        --region "$AWS_REGION"
                '''
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh '''
                                set -e

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
                            sh '''
                                set -e

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
                            sh '''
                                set -e

                                if npm run | grep -q "typecheck"; then
                                    npm run typecheck
                                else
                                    npx tsc --noEmit
                                fi
                            '''
                        }
                    }
                }

                stage('Frontend TypeScript') {
                    steps {
                        dir('frontend') {
                            sh '''
                                set -e

                                if npm run | grep -q "typecheck"; then
                                    npm run typecheck
                                else
                                    npx tsc -b --noEmit
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
                            sh '''
                                set -e

                                if npm run | grep -q "test"; then
                                    npm test
                                else
                                    echo "No backend test script configured"
                                fi
                            '''
                        }
                    }
                }

                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh '''
                                set -e

                                if npm run | grep -q "test"; then
                                    npm test
                                else
                                    echo "No frontend test script configured"
                                fi
                            '''
                        }
                    }
                }
            }
        }

        /*
         * Run SonarQube scans sequentially.
         *
         * Running them in parallel can cause Jenkins to associate
         * waitForQualityGate() with the wrong SonarQube task.
         */
        stage('SonarQube Backend Analysis') {
            steps {
                script {
                    def scannerHome = tool(
                        name: env.SONAR_TOOL,
                        type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    )

                    dir('backend') {
                        withSonarQubeEnv(env.SONAR_SERVER) {
                            sh """
                                set -e

                                echo "SonarScanner location: ${scannerHome}"

                                "${scannerHome}/bin/sonar-scanner" \
                                    -Dsonar.projectKey=letshop-backend \
                                    -Dsonar.projectName="LetShop Backend" \
                                    -Dsonar.sources=src \
                                    -Dsonar.sourceEncoding=UTF-8 \
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
                            sh """
                                set -e

                                echo "SonarScanner location: ${scannerHome}"

                                "${scannerHome}/bin/sonar-scanner" \
                                    -Dsonar.projectKey=letshop-frontend \
                                    -Dsonar.projectName="LetShop Frontend" \
                                    -Dsonar.sources=src \
                                    -Dsonar.sourceEncoding=UTF-8 \
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
                sh '''
                    set +e

                    trivy fs \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-fs.txt \
                        .

                    TRIVY_EXIT_CODE=$?

                    echo "Trivy file-system scan exit code: $TRIVY_EXIT_CODE"

                    # Do not fail the pipeline during the initial setup.
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
                sh '''
                    set -e

                    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

                    aws ecr get-login-password \
                        --region "$AWS_REGION" |
                    docker login \
                        --username AWS \
                        --password-stdin "$ECR_REGISTRY"
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                    set -e

                    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                    BACKEND_URI="${ECR_REGISTRY}/${ECR_BACKEND}"

                    docker build \
                        --tag "${BACKEND_URI}:${IMAGE_TAG}" \
                        --tag "${BACKEND_URI}:latest" \
                        ./backend
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                    set -e

                    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                    FRONTEND_URI="${ECR_REGISTRY}/${ECR_FRONTEND}"

                    docker build \
                        --build-arg VITE_API_URL=/api \
                        --tag "${FRONTEND_URI}:${IMAGE_TAG}" \
                        --tag "${FRONTEND_URI}:latest" \
                        ./frontend
                '''
            }
        }

        stage('Trivy Backend Image Scan') {
            steps {
                sh '''
                    set +e

                    BACKEND_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:${IMAGE_TAG}"

                    trivy image \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-backend-image.txt \
                        "$BACKEND_IMAGE"

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
                sh '''
                    set +e

                    FRONTEND_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}:${IMAGE_TAG}"

                    trivy image \
                        --format table \
                        --severity HIGH,CRITICAL \
                        --output trivy-frontend-image.txt \
                        "$FRONTEND_IMAGE"

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
                sh '''
                    set -e

                    BACKEND_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}"

                    docker push "${BACKEND_URI}:${IMAGE_TAG}"
                    docker push "${BACKEND_URI}:latest"
                '''
            }
        }

        stage('Push Frontend Image') {
            steps {
                sh '''
                    set -e

                    FRONTEND_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}"

                    docker push "${FRONTEND_URI}:${IMAGE_TAG}"
                    docker push "${FRONTEND_URI}:latest"
                '''
            }
        }

        stage('Configure EKS Access') {
            steps {
                sh '''
                    set -e

                    aws eks update-kubeconfig \
                        --name "$EKS_CLUSTER" \
                        --region "$AWS_REGION"

                    kubectl cluster-info
                    kubectl get nodes
                '''
            }
        }

        stage('Render Kubernetes Manifests') {
            steps {
                sh '''
                    set -e

                    BACKEND_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:${IMAGE_TAG}"
                    FRONTEND_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}:${IMAGE_TAG}"

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
                sh '''
                    set -e

                    kubectl apply -f rendered-k8s/namespace.yaml

                    if [ -f rendered-k8s/configmap.yaml ]; then
                        kubectl apply -f rendered-k8s/configmap.yaml
                    fi

                    if [ -f rendered-k8s/secrets.yaml ]; then
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

        stage('Verify Deployment') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    sh '''
                        set -e

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

    post {
        success {
            echo "Deployment succeeded: backend/frontend version ${BUILD_NUMBER}"
        }

        failure {
            echo "Pipeline failed for build ${BUILD_NUMBER}"

            sh '''
                kubectl get pods \
                    --namespace "$K8S_NAMESPACE" \
                    -o wide 2>/dev/null || true

                kubectl get events \
                    --namespace "$K8S_NAMESPACE" \
                    --sort-by=.metadata.creationTimestamp 2>/dev/null | \
                    tail -50 || true
            '''
        }

        always {
            archiveArtifacts(
                artifacts: 'rendered-k8s/*.yaml',
                allowEmptyArchive: true
            )

            sh '''
                docker logout \
                    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" \
                    2>/dev/null || true
            '''
        }
    }
}
