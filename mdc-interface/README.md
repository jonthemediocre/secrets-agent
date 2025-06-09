# MDC Rule Management Interface

A modern, comprehensive web interface for managing **Markdown with Context (MDC) rules**. This Next.js application provides a beautiful, intuitive dashboard for creating, validating, monitoring, and managing your MDC rules with world-class UX.

## ✨ Features

### 🎛️ **Comprehensive Dashboard**
- **Real-time system health monitoring** with live status indicators
- **Interactive charts and visualizations** for rule distribution and folder health
- **Quick action panels** for common operations
- **Recent activity tracking** with detailed logs
- **Responsive design** that works beautifully on all devices

### 📋 **Rule Management**
- **Browse and search** through all rules with advanced filtering
- **Category-based organization** (core, language, framework, testing, etc.)
- **Rule type filtering** (always, auto, agent, manual)
- **Detailed rule editor** with syntax highlighting
- **Validation status indicators** with error/warning details

### 🔍 **Validation & Health**
- **Real-time validation** with comprehensive error reporting
- **Health score tracking** across all rules and folders
- **Auto-fix capabilities** for common issues
- **Validation history** and trend analysis
- **Batch validation** operations

### 🤖 **Intelligent Tools**
- **AI-powered rule generation** from natural language prompts
- **Smart rule migration** from legacy formats
- **Bulk operations** for managing multiple rules
- **Automatic categorization** and metadata extraction

### 👀 **Monitoring & Analytics**
- **Live file system monitoring** with change detection
- **Performance metrics** and system resource tracking
- **Activity logs** with detailed action history
- **Health diagnostics** with automated issue detection

### 🎨 **Modern UI/UX**
- **Clean, modern design** following best practices
- **Smooth animations** and micro-interactions
- **Accessibility-first** with WCAG compliance
- **Dark/light theme support** (coming soon)
- **Mobile-responsive** with touch-friendly interactions

## 🏗️ Architecture

### Frontend (Next.js 14)
```
mdc-interface/
├── app/                    # Next.js App Router
│   ├── mdc/               # MDC dashboard routes
│   │   ├── page.tsx       # Main dashboard
│   │   ├── layout.tsx     # MDC layout with navigation
│   │   ├── rules/         # Rule management pages
│   │   ├── validate/      # Validation interface
│   │   ├── monitoring/    # Monitoring dashboard
│   │   └── tools/         # Tool interfaces
│   ├── layout.tsx         # Root layout
│   ├── providers.tsx      # React Query & context providers
│   └── globals.css        # Global styles with design system
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utilities and helpers
│   └── utils.ts         # Common utility functions
└── api/                  # Backend API integration
```

### Backend (FastAPI)
```
api/
└── mdc-backend.py        # FastAPI server connecting to Python tools
```

### Integration with Python Tools
The interface seamlessly integrates with all 5 core MDC tools:
- **Rule Validator** (`mdc_rule_validator.py`)
- **Rule Generator** (`mdc_rule_generator.py`) 
- **Folder Structure Setup** (`setup_folder_structure.py`)
- **Migration Script** (`mdc_migration_script.py`)
- **Monitoring Agent** (`mdc_monitoring_agent.py`)
- **Master Control** (`mdc_master_control.py`)

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm/yarn
- **Python 3.8+** with pip
- **MDC tools** already set up in `.cursor/tools/`

### 1. Install Dependencies

```bash
# Frontend dependencies
cd mdc-interface
npm install

# Backend dependencies  
pip install fastapi uvicorn pydantic python-multipart
```

### 2. Start the Backend API

```bash
# From the mdc-interface directory
python api/mdc-backend.py
```

The API will start on `http://localhost:8000` with docs at `http://localhost:8000/api/docs`

### 3. Start the Frontend

```bash
# In a new terminal, from mdc-interface directory
npm run dev
```

The interface will be available at `http://localhost:3000`

### 4. Access the MDC Dashboard

Navigate to `http://localhost:3000/mdc` to see the full MDC management interface.

## 📊 Dashboard Overview

### Main Dashboard (`/mdc`)
- **System health overview** with real-time metrics
- **Rule statistics** with visual breakdowns
- **Quick actions** for common tasks
- **Recent activity** feed
- **System status** indicators

### Rule Management (`/mdc/rules`)
- **Rule browser** with search and filtering
- **Category navigation** by folder structure
- **Rule editor** with validation
- **Bulk operations** interface

### Validation (`/mdc/validate`)
- **Validation dashboard** with health scores
- **Error/warning reports** with details
- **Auto-fix interface** for common issues
- **Validation history** and trends

### Monitoring (`/mdc/monitoring`)
- **Live system monitor** with real-time updates
- **Activity logs** with detailed tracking
- **Performance metrics** and diagnostics
- **Health alerts** and notifications

### Tools (`/mdc/tools`)
- **Rule generator** with AI assistance
- **Migration tools** for legacy rules
- **Bulk operations** for batch processing
- **System utilities** and diagnostics

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary-50: #eff6ff    /* Light blue backgrounds */
--primary-500: #3b82f6   /* Primary blue */
--primary-600: #2563eb   /* Darker blue for buttons */

/* Status Colors */
--success-500: #22c55e   /* Success green */
--warning-500: #f59e0b   /* Warning orange */  
--error-500: #ef4444     /* Error red */

/* Rule Type Colors */
--always: #ef4444        /* Red for always rules */
--auto: #3b82f6          /* Blue for auto rules */
--agent: #9333ea         /* Purple for agent rules */
--manual: #f59e0b        /* Orange for manual rules */
```

### Typography
- **Font Family**: Inter (system font with excellent readability)
- **Code Font**: Fira Code (for rule content and technical text)
- **Scale**: Carefully tuned for optimal hierarchy

### Components
- **Cards**: Clean, elevated surfaces with subtle shadows
- **Buttons**: Multiple variants with loading states
- **Badges**: Color-coded status and type indicators
- **Charts**: Interactive visualizations with Chart.js
- **Forms**: Accessible inputs with validation states

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Backend
python api/mdc-backend.py  # Start FastAPI server
```

### Environment Variables

```bash
# Frontend (.env.local)
MDC_API_URL=http://localhost:8000
MDC_RULES_PATH=.cursor/rules

# Backend
MDC_RULES_PATH=.cursor/rules  # Path to rules directory
```

### Code Structure

The interface follows modern React patterns:
- **App Router** for file-based routing
- **Server Components** where possible for performance
- **React Query** for data fetching and caching
- **TypeScript** throughout for type safety
- **Tailwind CSS** for styling with design system
- **Framer Motion** for smooth animations

## 🔧 Configuration

### API Integration
The frontend connects to the FastAPI backend which provides:
- **Rule CRUD operations** with validation
- **Real-time statistics** and health monitoring  
- **Tool integration** with all Python scripts
- **File system operations** with proper error handling

### Customization
- **Theme colors** in `tailwind.config.js`
- **API endpoints** in environment variables
- **Monitoring intervals** configurable per component
- **Chart configurations** in dashboard components

## 📱 Mobile Support

The interface is fully responsive with:
- **Mobile navigation** with collapsible sidebar
- **Touch-friendly interactions** and buttons
- **Optimized layouts** for small screens
- **Progressive Web App** capabilities (coming soon)

## 🔒 Security

- **CORS protection** with configurable origins
- **Input validation** on all forms and API calls
- **Error boundary** handling for graceful failures
- **Secure file operations** with path validation

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Docker Deployment (Coming Soon)
- Containerized setup for easy deployment
- Environment-specific configurations
- Health checks and monitoring

## 🎯 Roadmap

### Phase 1 - Core Interface ✅
- [x] Dashboard with real-time metrics
- [x] Rule browser and management
- [x] Validation interface
- [x] Tool integration

### Phase 2 - Enhanced Features 🚧
- [ ] Advanced search with full-text indexing
- [ ] Rule templates and snippets
- [ ] Collaborative editing features
- [ ] Advanced analytics and reporting

### Phase 3 - Enterprise Features 📋
- [ ] User authentication and authorization
- [ ] Team collaboration features
- [ ] Audit logs and compliance tracking
- [ ] Advanced monitoring and alerting

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes** following the code style
4. **Add tests** for new functionality
5. **Submit a pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Next.js team** for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for the beautiful icon set
- **Chart.js** for the interactive charts
- **FastAPI** for the high-performance backend framework

---

**Built with ❤️ for the MDC community**

For questions, issues, or feature requests, please open an issue on GitHub. 