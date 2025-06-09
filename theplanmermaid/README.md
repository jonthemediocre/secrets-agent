# 📊 **THE PLAN MERMAID** 
*Architectural Visualization Collection*

## 🎯 **OVERVIEW**

This folder contains all **Mermaid diagrams** that visualize the complete autonomous agent system architecture, governance frameworks, and operational flows. These diagrams serve as the visual blueprint for the entire **VANTA** system.

---

## 📁 **DIAGRAM INVENTORY**

### **🏗️ Core Architecture**

#### **`agent_system_architecture.mmd`** 
*Complete Dual-Protocol Agent System*
- **22+ Components** across MCP, A2A, and Cross-Protocol layers
- **Protocol Boundaries** clearly delineated 
- **Autonomous Cascade Controller** integrated
- **Value System** with 10 symbolic vectors
- **Governance Integration** with external framework reference

**Key Features:**
- 🔧 **MCP Protocol Layer**: AGENT, TOOL, TRACE, VAULT, ARCHETYPE, IFA, SIM, MYTH
- 🌐 **A2A Protocol Layer**: A2A, TASKFLOW, UAPGEN, INTENT, BUILDER  
- 🔄 **Cross-Protocol Layer**: RULES, VALID, KEB, META, IDENTITY, DELTA, ADAPT, GENESIS, VALUE, NLI
- ⚡ **Autonomous Coding**: CASCADE_CONTROLLER with dependency management
- 📊 **Value System**: COHERENCE, COMPRESSION, GENERATIVITY, ADAPTIVITY, etc.

#### **`governance_architecture.mmd`**
*3-Level Governance Framework*
- **Level 1**: Global Master Rules (Immutable Foundation)
- **Level 2**: Development/Mutation Governance  
- **Level 3**: Runtime Governance & Autonomous Intelligence
- **Comprehensive Policy Flow** from universal laws to runtime decisions

**Key Features:**
- 📜 **Master Rule Engine**: Immutable global constraints
- 🏗️ **Development Governance**: Quality gates, mutation control, evolution patterns
- 🚀 **Runtime Governance**: Autonomous decisions, self-modification, real-time adaptation
- 🛡️ **Compliance Systems**: Monitoring, validation, enforcement mechanisms

---

## 🎨 **VISUAL STYLING GUIDE**

### **Color Coding System**

#### **Protocol Layers**
- **🔧 MCP Protocol**: Blue tones (`#e8f4fa`, `#0277bd`) - Individual agent capabilities
- **🌐 A2A Protocol**: Green/Yellow tones (`#f9fbe7`, `#afb42b`) - Multi-agent coordination  
- **🔄 Cross-Protocol**: Purple/Pink tones (`#f3e5f5`, `#7c43bd`) - Shared infrastructure

#### **Component Types**
- **Core Components**: Bold borders (`stroke-width:4px`) - AGENT, TRACE, KEB
- **Infrastructure**: Thick borders (`stroke-width:3.5px`) - KEB, META, GENESIS
- **Services**: Medium borders (`stroke-width:3px`) - TOOL, A2A, TASKFLOW  
- **Support**: Thin borders (`stroke-width:2.5px`) - VALID, IFA, SIM

#### **Special Indicators**
- **Autonomous Coding**: Orange (`#fff3e0`, `#e65100`) with dashed borders
- **Value System**: Gold (`#fffde7`, `#c6a700`) - Universal attractors
- **Governance**: Purple (`#f8f4ff`, `#512da8`) with dashed borders - External references

---

## 🔧 **USAGE INSTRUCTIONS**

### **Viewing Diagrams**
```bash
# Navigate to diagram folder
cd theplanmermaid/

# View in VS Code with Mermaid Preview
code agent_system_architecture.mmd

# Or use online Mermaid editor
# Copy content and paste into: https://mermaid.live/
```

### **Updating Diagrams**
1. **Edit source .mmd files** in this folder
2. **Test rendering** in Mermaid Live Editor
3. **Update documentation** if architecture changes
4. **Sync with code implementation** in `autonomous_cascade_engine.py`

### **Exporting Diagrams**
```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export to PNG
mmdc -i agent_system_architecture.mmd -o architecture.png

# Export to SVG  
mmdc -i governance_architecture.mmd -o governance.svg
```

---

## 📋 **DIAGRAM MAINTENANCE**

### **Update Triggers**
- **New Component Addition**: Update architecture diagram + dependencies
- **Protocol Changes**: Modify protocol boundaries and communication flows
- **Governance Updates**: Sync with `master_rules.yaml` changes
- **Value System Evolution**: Adjust symbolic vector connections

### **Validation Checklist**
- [ ] **All components** have clear protocol assignments
- [ ] **Dependencies** accurately reflect implementation
- [ ] **Styling** follows color coding standards  
- [ ] **External references** point to correct files
- [ ] **Flow directions** match actual system behavior

### **Version Control**
- **Track changes** to architectural decisions
- **Document reasoning** for component additions/removals
- **Maintain backward compatibility** visualization
- **Archive major version** diagrams in `archive/` subfolder

---

## 🔗 **INTEGRATION POINTS**

### **References in Code**
- **`autonomous_cascade_engine.py`**: Component registry matches diagram components
- **`master_rules.yaml`**: Protocol architecture section aligns with diagram layers
- **`README_DOMINO_MODE.md`**: Architecture descriptions reference these diagrams

### **External References**
- **Main Documentation**: Points to these diagrams for visual understanding
- **API Documentation**: Links to specific component visualizations
- **Governance Framework**: References governance diagram for policy visualization

---

## 🚀 **FUTURE DIAGRAM PLANS**

### **Planned Additions**
- **`sequence_diagrams/`**: Subfolder for interaction sequences
- **`deployment_architecture.mmd`**: Infrastructure and deployment topology
- **`data_flow_diagrams.mmd`**: Information flow across components
- **`security_model.mmd`**: Trust boundaries and security controls

### **Enhancement Roadmap**
- **Interactive Diagrams**: Clickable components linking to documentation
- **Auto-Generated Updates**: Sync diagrams with code changes
- **Multi-Format Export**: PNG, SVG, PDF for different use cases
- **3D Visualizations**: Advanced architectural views

---

## 📞 **SUPPORT**

### **Issues & Questions**
- **Diagram Rendering Problems**: Check Mermaid syntax and browser compatibility
- **Architecture Questions**: Reference main system documentation
- **Update Requests**: Submit issues with clear architectural reasoning

### **Tools & Resources**
- **Mermaid Documentation**: https://mermaid-js.github.io/mermaid/
- **Live Editor**: https://mermaid.live/
- **VS Code Extension**: Mermaid Preview
- **CLI Tool**: @mermaid-js/mermaid-cli

---

**📊 THE PLAN MERMAID: Where complex systems become crystal clear through the power of visual architecture! 🎯** 