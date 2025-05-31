#!/usr/bin/env python3
"""
Project Scanner for Integration Analysis
Scans project directories to analyze structure, dependencies, and integration potential
"""

import os
import json
import yaml
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

class ProjectScanner:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.analysis = {
            "project_name": self.project_path.name,
            "path": str(self.project_path),
            "structure": {},
            "technologies": {},
            "integration_points": {},
            "recommendations": {},
            "compatibility": {}
        }
    
    def scan_structure(self):
        """Scan directory structure and identify key components"""
        structure = {}
        
        # Key directories to analyze
        key_dirs = [
            "src", "app", "components", "lib", "utils", "services", 
            "agents", "workflows", "api", "config", "docs", "tests",
            ".cursor", "uap", "scripts", "templates"
        ]
        
        for root, dirs, files in os.walk(self.project_path):
            rel_path = os.path.relpath(root, self.project_path)
            if rel_path == ".":
                rel_path = "root"
            
            # Filter out node_modules and other noise
            if any(ignore in root for ignore in [
                "node_modules", ".git", ".next", "dist", "build", 
                "__pycache__", "venv", "env"
            ]):
                continue
                
            structure[rel_path] = {
                "directories": [d for d in dirs if not d.startswith('.')],
                "files": files,
                "key_files": self._identify_key_files(files),
                "file_count": len(files)
            }
        
        self.analysis["structure"] = structure
        return structure
    
    def _identify_key_files(self, files: List[str]) -> List[str]:
        """Identify important configuration and entry files"""
        key_patterns = [
            r'package\.json', r'requirements\.txt', r'Cargo\.toml',
            r'README\.md', r'README\.txt', r'CHANGELOG\.md',
            r'\.env.*', r'config\.(js|ts|yaml|json)',
            r'docker.*', r'\.dockerfile',
            r'\.uap\.yaml', r'\.mdc$', r'manifest\.yaml',
            r'index\.(js|ts|py|html)', r'main\.(js|ts|py)',
            r'app\.(js|ts|py)', r'server\.(js|ts|py)',
            r'.*\.config\.(js|ts|yaml|json)'
        ]
        
        key_files = []
        for file in files:
            for pattern in key_patterns:
                if re.search(pattern, file, re.IGNORECASE):
                    key_files.append(file)
                    break
        
        return key_files
    
    def analyze_technologies(self):
        """Detect technologies, frameworks, and dependencies"""
        tech = {
            "languages": set(),
            "frameworks": set(),
            "databases": set(),
            "cloud_services": set(),
            "ai_services": set(),
            "tools": set()
        }
        
        # Check package.json for Node.js projects
        package_json = self.project_path / "package.json"
        if package_json.exists():
            try:
                with open(package_json) as f:
                    data = json.load(f)
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    tech["languages"].add("JavaScript/TypeScript")
                    self._analyze_npm_dependencies(deps, tech)
            except Exception as e:
                print(f"Error reading package.json: {e}")
        
        # Check requirements.txt for Python projects
        requirements = self.project_path / "requirements.txt"
        if requirements.exists():
            tech["languages"].add("Python")
            try:
                with open(requirements) as f:
                    for line in f:
                        if line.strip() and not line.startswith("#"):
                            tech["tools"].add(line.split("==")[0].split(">=")[0].strip())
            except Exception as e:
                print(f"Error reading requirements.txt: {e}")
        
        # Check for specific configuration files
        self._check_framework_configs(tech)
        
        # Convert sets to lists for JSON serialization
        self.analysis["technologies"] = {k: list(v) for k, v in tech.items()}
        return self.analysis["technologies"]
    
    def _analyze_npm_dependencies(self, deps: Dict[str, str], tech: Dict[str, set]):
        """Analyze NPM dependencies to identify frameworks and tools"""
        framework_mapping = {
            "react": "React",
            "next": "Next.js", 
            "nuxt": "Nuxt.js",
            "vue": "Vue.js",
            "angular": "Angular",
            "svelte": "Svelte",
            "express": "Express.js",
            "fastify": "Fastify",
            "nestjs": "NestJS"
        }
        
        database_mapping = {
            "mongodb": "MongoDB",
            "mongoose": "MongoDB",
            "prisma": "Prisma ORM",
            "sequelize": "Sequelize",
            "typeorm": "TypeORM",
            "redis": "Redis",
            "firebase": "Firebase"
        }
        
        ai_mapping = {
            "openai": "OpenAI",
            "@google/generative-ai": "Google Gemini",
            "langchain": "LangChain",
            "@anthropic-ai/sdk": "Anthropic Claude",
            "replicate": "Replicate"
        }
        
        for dep in deps.keys():
            dep_lower = dep.lower()
            
            # Check frameworks
            for key, name in framework_mapping.items():
                if key in dep_lower:
                    tech["frameworks"].add(name)
            
            # Check databases
            for key, name in database_mapping.items():
                if key in dep_lower:
                    tech["databases"].add(name)
            
            # Check AI services
            for key, name in ai_mapping.items():
                if key in dep_lower:
                    tech["ai_services"].add(name)
            
            # Check cloud services
            if any(cloud in dep_lower for cloud in ["aws", "azure", "gcp", "vercel", "netlify"]):
                tech["cloud_services"].add(dep)
    
    def _check_framework_configs(self, tech: Dict[str, set]):
        """Check for framework-specific configuration files"""
        config_files = {
            "next.config.js": "Next.js",
            "nuxt.config.js": "Nuxt.js", 
            "vue.config.js": "Vue.js",
            "angular.json": "Angular",
            "svelte.config.js": "Svelte",
            "tailwind.config.js": "TailwindCSS",
            "firebase.json": "Firebase",
            "vercel.json": "Vercel",
            "docker-compose.yml": "Docker",
            "Dockerfile": "Docker"
        }
        
        for config_file, framework in config_files.items():
            if (self.project_path / config_file).exists():
                tech["frameworks"].add(framework)
    
    def analyze_integration_points(self):
        """Identify potential integration points and compatibility"""
        integration = {
            "cursor_integration": False,
            "uap_agents": [],
            "mdc_rules": [],
            "secret_management": False,
            "workflow_automation": False,
            "ai_capabilities": [],
            "deployment_pipeline": False
        }
        
        # Check for Cursor integration
        cursor_dir = self.project_path / ".cursor"
        if cursor_dir.exists():
            integration["cursor_integration"] = True
            
            # Check for MDC rules
            rules_dir = cursor_dir / "rules"
            if rules_dir.exists():
                for file in rules_dir.rglob("*.mdc"):
                    integration["mdc_rules"].append(str(file.relative_to(self.project_path)))
        
        # Check for UAP agents
        for uap_file in self.project_path.rglob("*.uap.yaml"):
            integration["uap_agents"].append(str(uap_file.relative_to(self.project_path)))
        
        # Check for secret management
        secret_indicators = [".env", ".vault.yaml", "secrets.yaml", "vault.json"]
        for indicator in secret_indicators:
            if list(self.project_path.rglob(indicator)):
                integration["secret_management"] = True
                break
        
        # Check for workflow automation
        workflow_indicators = ["n8n", "zapier", "workflow", "automation"]
        for root, dirs, files in os.walk(self.project_path):
            for item in dirs + files:
                if any(indicator in item.lower() for indicator in workflow_indicators):
                    integration["workflow_automation"] = True
                    break
        
        # Check for AI capabilities
        ai_files = list(self.project_path.rglob("*ai*")) + list(self.project_path.rglob("*llm*"))
        for ai_file in ai_files:
            if ai_file.is_file() and ai_file.suffix in [".js", ".ts", ".py", ".yaml"]:
                integration["ai_capabilities"].append(str(ai_file.relative_to(self.project_path)))
        
        # Check for deployment pipeline
        deploy_indicators = ["deploy", "ci", "cd", "pipeline", "github/workflows", ".gitlab-ci"]
        for indicator in deploy_indicators:
            if list(self.project_path.rglob(f"*{indicator}*")):
                integration["deployment_pipeline"] = True
                break
        
        self.analysis["integration_points"] = integration
        return integration
    
    def generate_recommendations(self):
        """Generate integration recommendations based on analysis"""
        recommendations = {
            "merger_score": 0,  # 0-100 scale
            "integration_opportunities": [],
            "potential_conflicts": [],
            "synergies": [],
            "action_items": []
        }
        
        tech = self.analysis["technologies"]
        integration = self.analysis["integration_points"]
        
        # Calculate merger score
        score = 0
        
        # Technology compatibility
        if "React" in tech["frameworks"] or "Next.js" in tech["frameworks"]:
            score += 20  # Good frontend compatibility
        
        if any(ai in tech["ai_services"] for ai in ["OpenAI", "Google Gemini", "Anthropic Claude"]):
            score += 25  # AI integration potential
        
        if integration["cursor_integration"]:
            score += 20  # Already Cursor compatible
        
        if integration["secret_management"]:
            score += 15  # Secret management synergy
        
        if integration["workflow_automation"]:
            score += 10  # Workflow synergy
        
        if integration["ai_capabilities"]:
            score += 10  # AI capability synergy
        
        recommendations["merger_score"] = min(score, 100)
        
        # Generate specific recommendations
        if recommendations["merger_score"] >= 70:
            recommendations["action_items"].append("STRONG MERGER CANDIDATE - High synergy potential")
        elif recommendations["merger_score"] >= 50:
            recommendations["action_items"].append("GOOD INTEGRATION CANDIDATE - Consider strategic partnership")
        else:
            recommendations["action_items"].append("LIMITED SYNERGY - Evaluate independent development")
        
        # Identify specific opportunities
        if "Next.js" in tech["frameworks"]:
            recommendations["integration_opportunities"].append("Next.js compatibility with Secrets Agent frontend")
        
        if integration["ai_capabilities"]:
            recommendations["synergies"].append("AI capabilities can enhance UAP agent intelligence")
        
        if integration["workflow_automation"]:
            recommendations["synergies"].append("Workflow automation aligns with UAP agent orchestration")
        
        self.analysis["recommendations"] = recommendations
        return recommendations
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """Run complete project analysis"""
        print(f"Scanning project: {self.project_path}")
        
        self.scan_structure()
        print("✅ Structure analysis complete")
        
        self.analyze_technologies()
        print("✅ Technology analysis complete")
        
        self.analyze_integration_points()
        print("✅ Integration analysis complete")
        
        self.generate_recommendations()
        print("✅ Recommendations generated")
        
        return self.analysis
    
    def save_analysis(self, output_file: Optional[str] = None):
        """Save analysis to JSON file"""
        if output_file is None:
            output_file = f"{self.analysis['project_name']}_analysis.json"
        
        with open(output_file, 'w') as f:
            json.dump(self.analysis, f, indent=2)
        
        print(f"✅ Analysis saved to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Scan project for integration analysis")
    parser.add_argument("project_path", help="Path to project directory")
    parser.add_argument("-o", "--output", help="Output file for analysis results")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.project_path):
        print(f"Error: Project path '{args.project_path}' does not exist")
        return 1
    
    scanner = ProjectScanner(args.project_path)
    analysis = scanner.run_full_analysis()
    
    if args.verbose:
        print("\n" + "="*50)
        print("ANALYSIS SUMMARY")
        print("="*50)
        print(f"Project: {analysis['project_name']}")
        print(f"Technologies: {', '.join(analysis['technologies']['frameworks'])}")
        print(f"Merger Score: {analysis['recommendations']['merger_score']}/100")
        print(f"Integration Points: {len(analysis['integration_points']['uap_agents'])} UAP agents found")
        print(f"Cursor Integration: {'Yes' if analysis['integration_points']['cursor_integration'] else 'No'}")
        print("\nTop Recommendations:")
        for item in analysis['recommendations']['action_items']:
            print(f"  • {item}")
    
    scanner.save_analysis(args.output)
    
    return 0

if __name__ == "__main__":
    exit(main()) 