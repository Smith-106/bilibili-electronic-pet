#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install dependencies
install_deps() {
    print_message "Installing dependencies..." "$YELLOW"
    npm ci
    print_message "Dependencies installed" "$GREEN"
}

# Generate Prisma client
generate_prisma() {
    print_message "Generating Prisma client..." "$YELLOW"
    npx prisma generate
    print_message "Prisma client generated" "$GREEN"
}

# Build application
build() {
    print_message "Building application..." "$YELLOW"
    npm run build
    if [ $? -eq 0 ]; then
        print_message "Build successful" "$GREEN"
    else
        print_message "Build failed" "$RED"
        exit 1
    fi
}

# Run tests
test() {
    print_message "Running tests..." "$YELLOW"
    npm test
    if [ $? -eq 0 ]; then
        print_message "All tests passed" "$GREEN"
    else
        print_message "Tests failed" "$RED"
        exit 1
    fi
}

# Run database migrations
migrate() {
    print_message "Running database migrations..." "$YELLOW"
    npx prisma migrate deploy
    if [ $? -eq 0 ]; then
        print_message "Migrations completed" "$GREEN"
    else
        print_message "Migration failed" "$RED"
        exit 1
    fi
}

# Build Docker image
docker_build() {
    print_message "Building Docker image..." "$YELLOW"
    docker build -t bilibili-pet-backend:latest .
    if [ $? -eq 0 ]; then
        print_message "Docker image built" "$GREEN"
    else
        print_message "Docker build failed" "$RED"
        exit 1
    fi
}

# Deploy with Docker Compose
docker_compose_deploy() {
    print_message "Deploying with Docker Compose..." "$YELLOW"
    docker-compose up -d
    if [ $? -eq 0 ]; then
        print_message "Deployment successful" "$GREEN"
        print_message "Application running at http://localhost:3000" "$GREEN"
    else
        print_message "Deployment failed" "$RED"
        exit 1
    fi
}

# Deploy to Kubernetes
kubernetes_deploy() {
    print_message "Deploying to Kubernetes..." "$YELLOW"
    kubectl apply -f kubernetes.yml
    if [ $? -eq 0 ]; then
        print_message "Kubernetes deployment successful" "$GREEN"
        kubectl get pods -n bilibili-pet
    else
        print_message "Kubernetes deployment failed" "$RED"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install      Install dependencies"
    echo "  generate     Generate Prisma client"
    echo "  build        Build application"
    echo "  test         Run tests"
    echo "  migrate      Run database migrations"
    echo "  docker       Build Docker image"
    echo "  compose      Deploy with Docker Compose"
    echo "  k8s          Deploy to Kubernetes"
    echo "  all          Run all steps (install, generate, build, test)"
    echo "  deploy       Full deployment (docker, compose)"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 build"
    echo "  $0 deploy"
}

# Main script
case "${1:-help}" in
    install)
        install_deps
        ;;
    generate)
        generate_prisma
        ;;
    build)
        build
        ;;
    test)
        test
        ;;
    migrate)
        migrate
        ;;
    docker)
        docker_build
        ;;
    compose)
        docker_compose_deploy
        ;;
    k8s)
        kubernetes_deploy
        ;;
    all)
        install_deps
        generate_prisma
        build
        test
        print_message "All steps completed successfully" "$GREEN"
        ;;
    deploy)
        docker_build
        docker_compose_deploy
        ;;
    help|*)
        show_help
        ;;
esac
