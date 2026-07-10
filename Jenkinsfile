pipeline {
    agent any

    environment {
        AWS_REGION      = "ap-southeast-2"
        APP_NAME        = "letshop"
        ENVIRONMENT     = "production"
        ECR_BACKEND     = "${APP_NAME}-${ENVIRONMENT}-backend"
        ECR_FRONTEND    = "${APP_NAME}-${ENVIRONMENT}-frontend"
        EKS_CLUSTER     = "${APP_NAME}-${ENVIRONMENT}-eks"
        K8S_NAMESPACE   = "letshop"
        IMAGE_TAG       = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-token',
                    url: 'https://github.com/lekymAnisem/letshop.git'
            }
        }


        stage('SonarQube Analysis') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            withSonarQubeEnv('SonarQube') {
                                sh '''
                                    $SCANNER_HOME/bin/sonar-scanner \
                                        -Dsonar.projectKey=letshop-backend \
                                        -Dsonar.projectName="LetShop Backend"
                                '''
                            }
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            withSonarQubeEnv('SonarQube') {
                                sh '''
                                    $SCANNER_HOME/bin/sonar-scanner \
                                        -Dsonar.projectKey=letshop-frontend \
                                        -Dsonar.projectName="LetShop Frontend"
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'SonarQube'
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm install'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('TypeScript Check') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'npm run typecheck'
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npx tsc -b --noEmit'
                        }
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Trivy FS Scan') {
            steps {
                sh 'trivy fs . --format table > trivy-fs.txt || true'
            }
        }





        stage('Login to ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} |
                    docker login --username AWS --password-stdin \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                """
            }
        }

        stage('Build & Push Backend') {
            steps {
                script {
                    def ecrUri = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}"

                    sh """
                        docker build -t ${ECR_BACKEND}:${IMAGE_TAG} \
                            -t ${ECR_BACKEND}:latest ./backend

                        docker tag ${ECR_BACKEND}:${IMAGE_TAG} ${ecrUri}:${IMAGE_TAG}
                        docker tag ${ECR_BACKEND}:latest    ${ecrUri}:latest

                        docker push ${ecrUri}:${IMAGE_TAG}
                        docker push ${ecrUri}:latest
                    """
                }
            }
        }

        stage('Build & Push Frontend') {
            steps {
                script {
                    def ecrUri = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}"

                    sh """
                        docker build \
                            --build-arg VITE_API_URL=http://letshop-backend:5000/api \
                            -t ${ECR_FRONTEND}:${IMAGE_TAG} \
                            -t ${ECR_FRONTEND}:latest ./frontend

                        docker tag ${ECR_FRONTEND}:${IMAGE_TAG} ${ecrUri}:${IMAGE_TAG}
                        docker tag ${ECR_FRONTEND}:latest    ${ecrUri}:latest

                        docker push ${ecrUri}:${IMAGE_TAG}
                        docker push ${ecrUri}:latest
                    """
                }
            }
        }

        stage('Deploy to EKS') {
            steps {
                script {
                    sh """
                        aws eks update-kubeconfig --name ${EKS_CLUSTER} --region ${AWS_REGION}

                        sed -i "s|\${ECR_BACKEND_IMAGE}|${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:${IMAGE_TAG}|g" \
                            infra/k8s/backend-deployment.yaml

                        sed -i "s|\${ECR_FRONTEND_IMAGE}|${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}:${IMAGE_TAG}|g" \
                            infra/k8s/frontend-deployment.yaml

                        kubectl apply -f infra/k8s/namespace.yaml
                        kubectl apply -f infra/k8s/configmap.yaml
                        kubectl apply -f infra/k8s/secrets.yaml
                        kubectl apply -f infra/k8s/backend-deployment.yaml
                        kubectl apply -f infra/k8s/frontend-deployment.yaml
                        kubectl apply -f infra/k8s/ingress.yaml

                        kubectl rollout status deployment/letshop-backend -n ${K8S_NAMESPACE}
                        kubectl rollout status deployment/letshop-frontend -n ${K8S_NAMESPACE}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Deployment succeeded: backend/frontend v${BUILD_NUMBER}"
        }
        failure {
            echo "Pipeline failed for build ${BUILD_NUMBER}"
        }
    }
}
