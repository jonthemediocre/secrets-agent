#!/usr/bin/env node
/**
 * MCP Compliance Validator
 * Ensures all TypeScript files follow MCP agent-callable patterns
 * Extended for UAP Level 2 rules: hooks, manifests, mutation mode
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ValidationResult {
  file: string
  isCompliant: boolean
  violations: string[]
  exports: string[]
  hasMcpPassive: boolean
  uapFeatures: {
    hasHooks: boolean
    hasManifest: boolean
    hasMutation: boolean
  }
}

interface ValidationSummary {
  totalFiles: number
  compliantFiles: number
  violations: ValidationResult[]
  passiveFiles: number
  uapCompliance: {
    hooksSupport: number
    manifestSupport: number
    mutationSupport: number
  }
}

class MCPValidator {
  private readonly excludePaths = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**'
  ]

  async validateProject(projectPath: string): Promise<ValidationSummary> {
    console.log('🔍 Starting MCP + UAP compliance validation...')
    
    const tsFiles = await this.findTypeScriptFiles(projectPath)
    const results: ValidationResult[] = []

    for (const file of tsFiles) {
      const result = await this.validateFile(file)
      results.push(result)
    }

    const summary: ValidationSummary = {
      totalFiles: results.length,
      compliantFiles: results.filter(r => r.isCompliant).length,
      violations: results.filter(r => !r.isCompliant && !r.hasMcpPassive),
      passiveFiles: results.filter(r => r.hasMcpPassive).length,
      uapCompliance: {
        hooksSupport: results.filter(r => r.uapFeatures.hasHooks).length,
        manifestSupport: results.filter(r => r.uapFeatures.hasManifest).length,
        mutationSupport: results.filter(r => r.uapFeatures.hasMutation).length
      }
    }

    this.printSummary(summary)
    return summary
  }

  private async findTypeScriptFiles(projectPath: string): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx'
    ]

    const files: string[] = []
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore: this.excludePaths,
        absolute: true
      })
      files.push(...matches)
    }

    return files
  }

  private async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      const fileName = path.relative(process.cwd(), filePath)

      // Check for @mcpPassive annotation
      const hasMcpPassive = content.includes('@mcpPassive')

      if (hasMcpPassive) {
        return {
          file: fileName,
          isCompliant: true,
          violations: [],
          exports: [],
          hasMcpPassive: true,
          uapFeatures: {
            hasHooks: false,
            hasManifest: false,
            hasMutation: false
          }
        }
      }

      const violations: string[] = []
      const exports = this.extractExports(content)

      // Check for agent-callable exports
      const hasCallableExports = this.hasAgentCallableExports(content, exports)

      if (!hasCallableExports) {
        violations.push('No agent-callable functions or classes exported')
      }

      // Check for proper TypeScript patterns
      const typeViolations = this.checkTypeScriptPatterns(content)
      violations.push(...typeViolations)

      // UAP Feature Analysis
      const uapFeatures = this.analyzeUAPFeatures(content)

      // UAP-specific violations
      const uapViolations = this.checkUAPCompliance(content, fileName)
      violations.push(...uapViolations)

      return {
        file: fileName,
        isCompliant: violations.length === 0,
        violations,
        exports,
        hasMcpPassive: false,
        uapFeatures
      }

    } catch (error) {
      return {
        file: path.relative(process.cwd(), filePath),
        isCompliant: false,
        violations: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        exports: [],
        hasMcpPassive: false,
        uapFeatures: {
          hasHooks: false,
          hasManifest: false,
          hasMutation: false
        }
      }
    }
  }

  private extractExports(content: string): string[] {
    const exports: string[] = []
    
    // Match export patterns
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+(\w+)/g,
      /export\s+class\s+(\w+)/g,
      /export\s+const\s+(\w+)/g,
      /export\s+interface\s+(\w+)/g,
      /export\s+type\s+(\w+)/g,
      /export\s+default\s+(?:class\s+)?(\w+)/g
    ]

    for (const pattern of exportPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1])
      }
    }

    return exports
  }

  private hasAgentCallableExports(content: string, exports: string[]): boolean {
    // Check for function exports
    const functionExports = content.match(/export\s+(?:async\s+)?function/g)
    if (functionExports && functionExports.length > 0) return true

    // Check for class exports with methods
    const classMatches = content.match(/export\s+class\s+\w+[\s\S]*?{([\s\S]*?)}/g)
    if (classMatches) {
      for (const classMatch of classMatches) {
        if (classMatch.includes('async ') || classMatch.includes('function ')) {
          return true
        }
      }
    }

    // Check for MCP tool registration
    if (content.includes('mcpTool') || content.includes('MCP_TOOL')) {
      return true
    }

    // Check for callable object exports
    const callablePatterns = [
      /export\s+const\s+\w+\s*=\s*{[\s\S]*?(?:run|execute|call|handler)[\s\S]*?}/g
    ]

    for (const pattern of callablePatterns) {
      if (pattern.test(content)) return true
    }

    return false
  }

  private analyzeUAPFeatures(content: string): ValidationResult['uapFeatures'] {
    return {
      hasHooks: this.hasHookSupport(content),
      hasManifest: this.hasManifestSupport(content),
      hasMutation: this.hasMutationSupport(content)
    }
  }

  private hasHookSupport(content: string): boolean {
    const hookPatterns = [
      /hooks\.trigger/,
      /hooks\.register/,
      /HookManager/,
      /before_plan|after_plan|before_execute|after_execute/,
      /on_success|on_error/
    ]
    
    return hookPatterns.some(pattern => pattern.test(content))
  }

  private hasManifestSupport(content: string): boolean {
    const manifestPatterns = [
      /generate_manifest|export_manifest/,
      /UAPAgentManifest/,
      /symbolic_intent|agent_roles/,
      /\.manifest\./
    ]
    
    return manifestPatterns.some(pattern => pattern.test(content))
  }

  private hasMutationSupport(content: string): boolean {
    const mutationPatterns = [
      /def mutate\(|function mutate\(/,
      /mutation_trace|symbolic_delta/,
      /version_lineage/,
      /proposed_change/
    ]
    
    return mutationPatterns.some(pattern => pattern.test(content))
  }

  private checkUAPCompliance(content: string, fileName: string): string[] {
    const violations: string[] = []
    
    // Check if agent class lacks UAP features
    const isAgentFile = /agent/i.test(fileName) || content.includes('Agent')
    
    if (isAgentFile) {
      if (!this.hasHookSupport(content)) {
        violations.push('Agent class missing hook system support')
      }
      
      if (!this.hasManifestSupport(content)) {
        violations.push('Agent class missing manifest export capability')
      }
      
      // Mutation support is optional but recommended
      if (content.includes('mutate') && !this.hasMutationSupport(content)) {
        violations.push('Unsafe mutation implementation without version tracking')
      }
    }
    
    return violations
  }

  private checkTypeScriptPatterns(content: string): string[] {
    const violations: string[] = []

    // Check for proper type annotations on exported functions
    const functionExports = content.match(/export\s+(?:async\s+)?function\s+\w+\([^)]*\)/g)
    if (functionExports) {
      for (const func of functionExports) {
        if (!func.includes(':') && !func.includes('Promise<')) {
          violations.push('Exported function missing type annotations')
          break
        }
      }
    }

    // Check for JSDoc on exported functions
    const hasJSDoc = content.includes('/**') && content.includes('*/')
    if (functionExports && functionExports.length > 0 && !hasJSDoc) {
      violations.push('Missing JSDoc documentation for exported functions')
    }

    return violations
  }

  private printSummary(summary: ValidationSummary): void {
    console.log('\n📊 MCP + UAP Compliance Summary')
    console.log('─'.repeat(50))
    console.log(`Total files scanned: ${summary.totalFiles}`)
    console.log(`✅ Compliant files: ${summary.compliantFiles}`)
    console.log(`📝 Passive files (@mcpPassive): ${summary.passiveFiles}`)
    console.log(`❌ Violations: ${summary.violations.length}`)

    // UAP Feature Analysis
    console.log('\n🚀 UAP Feature Analysis:')
    console.log(`🪝 Hook support: ${summary.uapCompliance.hooksSupport} files`)
    console.log(`📋 Manifest support: ${summary.uapCompliance.manifestSupport} files`)
    console.log(`🧬 Mutation support: ${summary.uapCompliance.mutationSupport} files`)

    if (summary.violations.length > 0) {
      console.log('\n🚨 Violations Found:')
      console.log('─'.repeat(30))
      
      for (const violation of summary.violations) {
        console.log(`\n📄 ${violation.file}`)
        for (const v of violation.violations) {
          console.log(`   ❌ ${v}`)
        }
        if (violation.exports.length > 0) {
          console.log(`   📤 Exports: ${violation.exports.join(', ')}`)
        }
        
        // UAP Feature Status
        const features = violation.uapFeatures
        console.log(`   🚀 UAP: Hooks(${features.hasHooks ? '✅' : '❌'}) Manifest(${features.hasManifest ? '✅' : '❌'}) Mutation(${features.hasMutation ? '✅' : '❌'})`)
      }

      console.log('\n💡 To fix violations:')
      console.log('1. Add agent-callable exports (functions, classes with methods)')
      console.log('2. Include type annotations and JSDoc comments')
      console.log('3. Implement UAP features: hooks, manifests, mutation safety')
      console.log('4. Or mark as @mcpPassive for utility files')
    }

    const complianceRate = (summary.compliantFiles / summary.totalFiles) * 100
    const uapAdoptionRate = ((summary.uapCompliance.hooksSupport + summary.uapCompliance.manifestSupport) / (summary.totalFiles * 2)) * 100
    
    console.log(`\n🎯 MCP Compliance Rate: ${complianceRate.toFixed(1)}%`)
    console.log(`🚀 UAP Adoption Rate: ${uapAdoptionRate.toFixed(1)}%`)
    
    if (complianceRate === 100 && uapAdoptionRate >= 80) {
      console.log('🎉 Perfect MCP + UAP compliance! All files are agent-ready.')
    } else if (complianceRate >= 80) {
      console.log('✨ Good MCP compliance! Consider UAP feature adoption.')
    } else {
      console.log('⚠️  MCP compliance needs improvement.')
    }
  }
}

// CLI usage - Check if this file is being run directly
const isMainModule = process.argv[1] === __filename

if (isMainModule) {
  const validator = new MCPValidator()
  const projectPath = process.argv[2] || process.cwd()
  
  validator.validateProject(projectPath)
    .then(summary => {
      process.exit(summary.violations.length > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Validation failed:', error.message)
      process.exit(1)
    })
}

export { MCPValidator, ValidationResult, ValidationSummary } 