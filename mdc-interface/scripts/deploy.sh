#!/bin/bash

# MDC Interface Deployment Script
# Automates the setup and deployment of the complete MDC Rule Management Interface

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TOOLS_DIR="$PROJECT_ROOT/../.cursor/tools"
RULES_DIR="$PROJECT_ROOT/../.cursor/rules"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check Python
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3.8+ from https://python.org/"
        exit 1
    fi
    
    # Check pip
    if ! command_exists pip; then
        print_error "pip is not installed. Please install pip for Python package management."
        exit 1
    fi
    
    # Check if MDC tools exist
    if [ ! -d "$TOOLS_DIR" ]; then
        print_error "MDC tools directory not found at $TOOLS_DIR"
        print_error "Please ensure the MDC tools are properly installed first."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install Node.js dependencies
    cd "$PROJECT_ROOT"
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install fastapi uvicorn pydantic python-multipart python-jose[cryptography] passlib[bcrypt]
    
    # Install additional dependencies that might be missing
    pip install schedule watchdog pyyaml requests aiofiles
    
    print_success "Dependencies installed successfully"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create environment file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        print_status "Creating .env.local file..."
        cat > "$PROJECT_ROOT/.env.local" << EOF
# MDC Interface Environment Variables
MDC_API_URL=http://localhost:8000
MDC_RULES_PATH=$RULES_DIR
NEXT_PUBLIC_MDC_API_URL=http://localhost:8000
EOF
        print_success "Environment file created"
    else
        print_warning ".env.local already exists, skipping creation"
    fi
    
    # Ensure rules directory exists
    mkdir -p "$RULES_DIR"
    print_success "Rules directory ensured at $RULES_DIR"
}

# Function to validate MDC tools
validate_tools() {
    print_status "Validating MDC tools..."
    
    local required_tools=(
        "mdc_rule_validator.py"
        "mdc_rule_generator.py"
        "setup_folder_structure.py"
        "mdc_migration_script.py"
        "mdc_monitoring_agent.py"
        "mdc_master_control.py"
    )
    
    for tool in "${required_tools[@]}"; do
        if [ ! -f "$TOOLS_DIR/$tool" ]; then
            print_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Test the master control tool
    print_status "Testing MDC tools..."
    cd "$TOOLS_DIR"
    if python3 mdc_master_control.py status > /dev/null 2>&1; then
        print_success "MDC tools are working correctly"
    else
        print_warning "MDC tools test returned warnings, but continuing..."
    fi
}

# Function to build the application
build_application() {
    print_status "Building the application..."
    
    cd "$PROJECT_ROOT"
    
    # Build Next.js application
    print_status "Building Next.js application..."
    npm run build
    
    print_success "Application built successfully"
}

# Function to test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Start backend API in background
    print_status "Starting backend API for testing..."
    cd "$PROJECT_ROOT"
    python3 api/mdc-backend.py &
    API_PID=$!
    
    # Wait for API to start
    sleep 5
    
    # Test API health
    if curl -s http://localhost:8000/api/health > /dev/null; then
        print_success "Backend API is responding"
    else
        print_error "Backend API failed to start properly"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop the test API
    kill $API_PID 2>/dev/null || true
    
    print_success "Deployment test completed successfully"
}

# Function to start services
start_services() {
    print_status "Starting MDC services..."
    
    cd "$PROJECT_ROOT"
    
    # Create start script
    cat > start-mdc.sh << 'EOF'
#!/bin/bash

# Start script for MDC Rule Management Interface
echo "🚀 Starting MDC Rule Management Interface..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $API_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend API
echo "📡 Starting backend API on port 8000..."
python3 api/mdc-backend.py &
API_PID=$!

# Wait for API to start
sleep 3

# Start frontend
echo "🌐 Starting frontend on port 3000..."
npm run start &
FRONTEND_PID=$!

echo "✅ Services started successfully!"
echo "📊 Dashboard: http://localhost:3000/mdc"
echo "📖 API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for services
wait
EOF
    
    chmod +x start-mdc.sh
    
    print_success "Start script created: start-mdc.sh"
    print_status "You can now run './start-mdc.sh' to start all services"
}

# Function to create development script
create_dev_script() {
    print_status "Creating development script..."
    
    cd "$PROJECT_ROOT"
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash

# Development script for MDC Rule Management Interface
echo "🔧 Starting MDC Interface in development mode..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping development services..."
    kill $API_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend API in development mode
echo "📡 Starting backend API in development mode..."
python3 api/mdc-backend.py &
API_PID=$!

# Wait for API to start
sleep 3

# Start frontend in development mode
echo "🌐 Starting frontend in development mode..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Development services started!"
echo "📊 Dashboard: http://localhost:3000/mdc"
echo "📖 API Docs: http://localhost:8000/api/docs"
echo "🔄 Hot reload enabled for both frontend and backend"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for services
wait
EOF
    
    chmod +x start-dev.sh
    
    print_success "Development script created: start-dev.sh"
}

# Function to display final instructions
display_instructions() {
    print_success "🎉 MDC Rule Management Interface deployed successfully!"
    echo ""
    echo "📋 Quick Start Guide:"
    echo "===================="
    echo ""
    echo "🔧 Development mode:"
    echo "   ./start-dev.sh"
    echo ""
    echo "🚀 Production mode:"
    echo "   ./start-mdc.sh"
    echo ""
    echo "📊 Dashboard URL:"
    echo "   http://localhost:3000/mdc"
    echo ""
    echo "📖 API Documentation:"
    echo "   http://localhost:8000/api/docs"
    echo ""
    echo "📁 Rules Directory:"
    echo "   $RULES_DIR"
    echo ""
    echo "🔧 Tools Directory:"
    echo "   $TOOLS_DIR"
    echo ""
    echo "⚙️ Features Available:"
    echo "   ✅ Real-time dashboard with health monitoring"
    echo "   ✅ Rule browser with search and filtering"
    echo "   ✅ Rule validation with auto-fix capabilities"
    echo "   ✅ AI-powered rule generation"
    echo "   ✅ System monitoring and activity logs"
    echo "   ✅ Comprehensive tool integration"
    echo ""
    echo "📚 For more information, see README.md"
    echo ""
    print_success "Happy rule management! 🎯"
}

# Main deployment function
main() {
    echo "🏗️  MDC Rule Management Interface Deployment"
    echo "============================================="
    echo ""
    
    check_prerequisites
    install_dependencies
    setup_environment
    validate_tools
    build_application
    test_deployment
    start_services
    create_dev_script
    display_instructions
}

# Handle command line arguments
case "${1:-}" in
    "--help"|"-h")
        echo "MDC Interface Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dev          Setup for development only"
        echo "  --prod         Setup for production only"
        echo ""
        echo "Default: Full setup (development + production)"
        exit 0
        ;;
    "--dev")
        print_status "Setting up development environment only..."
        check_prerequisites
        install_dependencies
        setup_environment
        validate_tools
        create_dev_script
        echo ""
        print_success "Development setup complete! Run './start-dev.sh' to start."
        ;;
    "--prod")
        print_status "Setting up production environment only..."
        check_prerequisites
        install_dependencies
        setup_environment
        validate_tools
        build_application
        test_deployment
        start_services
        echo ""
        print_success "Production setup complete! Run './start-mdc.sh' to start."
        ;;
    *)
        main
        ;;
esac 