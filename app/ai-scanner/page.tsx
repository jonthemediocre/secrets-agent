'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { 
  Brain, 
  Search, 
  Shield, 
  Code, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  FileText,
  Database,
  Lock,
  Zap,
  GitBranch,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface ScanResult {
  scanId: string
  projectPath: string
  scanTime: string
  archetype: {
    type: string
    confidence: number
    evidence: string[]
    suggestedAgents: string[]
  }
  symbolicPatterns: Array<{
    id: string
    type: string
    pattern: string
    confidence: number
    riskLevel: string
    suggestions: string[]
  }>
  securityFindings: Array<{
    type: string
    severity: string
    file: string
    description: string
    suggestion: string
  }>
  aiSuggestions: Array<{
    category: string
    priority: number
    description: string
    implementation: string[]
  }>
  metrics: {
    codeQuality: number
    securityScore: number
    maintainabilityIndex: number
    technicalDebt: number
  }
  summary: {
    totalPatterns: number
    totalSuggestions: number
    totalSecurityFindings: number
    highRiskPatterns: number
    criticalSecurityFindings: number
  }
}

interface RecentScan {
  scanId: string
  projectPath: string
  scanTime: string
  archetype: string
  metrics: {
    codeQuality: number
    securityScore: number
  }
  summary: {
    patterns: number
    suggestions: number
    securityFindings: number
  }
}

export default function AIScannerPage() {
  const [projectPath, setProjectPath] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)
  
  // Scan options
  const [includeAI, setIncludeAI] = useState(true)
  const [includeDependencies, setIncludeDependencies] = useState(true)
  const [includeRules, setIncludeRules] = useState(true)
  const [generateSuggestions, setGenerateSuggestions] = useState(true)

  useEffect(() => {
    loadRecentScans()
  }, [])

  const loadRecentScans = async () => {
    try {
      const response = await fetch('/api/ai-scan?action=list_scans')
      const data = await response.json()
      if (data.success) {
        setRecentScans(data.data)
      }
    } catch (error) {
      console.error('Failed to load recent scans:', error)
    }
  }

  const handleScan = async () => {
    if (!projectPath.trim()) {
      alert('Please enter a project path')
      return
    }

    setIsScanning(true)
    setScanResult(null)

    try {
      const response = await fetch('/api/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: projectPath.trim(),
          includeAI,
          includeDependencies,
          includeRules,
          generateSuggestions
        })
      })

      const data = await response.json()

      if (data.success) {
        setScanResult(data.data)
        setSelectedScanId(data.data.scanId)
        alert('AI scan completed successfully!')
        loadRecentScans()
      } else {
        alert(data.error || 'Scan failed')
      }
    } catch (error) {
      alert('Failed to perform scan')
      console.error('Scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const loadScanResult = async (scanId: string) => {
    try {
      const response = await fetch(`/api/ai-scan?action=get_scan&scanId=${scanId}`)
      const data = await response.json()
      if (data.success) {
        setScanResult(data.data)
        setSelectedScanId(scanId)
      }
    } catch (error) {
      alert('Failed to load scan result')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getMetricColor = (value: number, reverse = false) => {
    if (reverse) {
      if (value >= 70) return 'text-red-600'
      if (value >= 40) return 'text-yellow-600'
      return 'text-green-600'
    } else {
      if (value >= 80) return 'text-green-600'
      if (value >= 60) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Project Scanner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Advanced symbolic pattern detection and intelligent project analysis
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Next-Gen Analysis Engine
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              New Scan
            </CardTitle>
            <CardDescription>
              Perform AI-powered project analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectPath">Project Path</Label>
              <Input
                id="projectPath"
                type="text"
                placeholder="/path/to/your/project"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Scan Options</Label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Pattern Detection</span>
                <Switch checked={includeAI} onCheckedChange={setIncludeAI} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Dependency Analysis</span>
                <Switch checked={includeDependencies} onCheckedChange={setIncludeDependencies} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Rule Extraction</span>
                <Switch checked={includeRules} onCheckedChange={setIncludeRules} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Suggestions</span>
                <Switch checked={generateSuggestions} onCheckedChange={setGenerateSuggestions} />
              </div>
            </div>

            <Button 
              onClick={handleScan} 
              disabled={isScanning || !projectPath.trim()}
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Start AI Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              View and analyze previous scan results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No scans available. Run your first AI scan!
              </div>
            ) : (
              <div className="space-y-3">
                {recentScans.slice(0, 6).map((scan) => (
                  <div
                    key={scan.scanId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScanId === scan.scanId 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => loadScanResult(scan.scanId)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate">
                          {scan.projectPath.split('/').pop() || scan.projectPath}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(scan.scanTime).toLocaleString()} • {scan.archetype}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {scan.summary.patterns}P
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {scan.summary.suggestions}S
                        </Badge>
                        {scan.summary.securityFindings > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {scan.summary.securityFindings}F
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Code Quality</p>
                    <p className={`text-2xl font-bold ${getMetricColor(scanResult.metrics.codeQuality)}`}>
                      {scanResult.metrics.codeQuality}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <Progress value={scanResult.metrics.codeQuality} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Score</p>
                    <p className={`text-2xl font-bold ${getMetricColor(scanResult.metrics.securityScore)}`}>
                      {scanResult.metrics.securityScore}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <Progress value={scanResult.metrics.securityScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintainability</p>
                    <p className={`text-2xl font-bold ${getMetricColor(scanResult.metrics.maintainabilityIndex)}`}>
                      {scanResult.metrics.maintainabilityIndex}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <Progress value={scanResult.metrics.maintainabilityIndex} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Technical Debt</p>
                    <p className={`text-2xl font-bold ${getMetricColor(scanResult.metrics.technicalDebt, true)}`}>
                      {scanResult.metrics.technicalDebt}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <Progress value={scanResult.metrics.technicalDebt} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
              <TabsTrigger value="archetype">Architecture</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Patterns</span>
                      <Badge variant="secondary">{scanResult.summary.totalPatterns}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>AI Suggestions</span>
                      <Badge variant="secondary">{scanResult.summary.totalSuggestions}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Security Findings</span>
                      <Badge variant={scanResult.summary.totalSecurityFindings > 0 ? "destructive" : "secondary"}>
                        {scanResult.summary.totalSecurityFindings}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>High Risk Patterns</span>
                      <Badge variant={scanResult.summary.highRiskPatterns > 0 ? "destructive" : "secondary"}>
                        {scanResult.summary.highRiskPatterns}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scanResult.summary.criticalSecurityFindings > 0 && (
                      <Button variant="destructive" size="sm" className="w-full justify-start">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Fix {scanResult.summary.criticalSecurityFindings} Critical Issues
                      </Button>
                    )}
                    {scanResult.aiSuggestions.length > 0 && (
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Zap className="mr-2 h-4 w-4" />
                        Apply Top AI Suggestions
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <GitBranch className="mr-2 h-4 w-4" />
                      Create Improvement Branch
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Symbolic Patterns
                  </CardTitle>
                  <CardDescription>
                    AI-detected patterns and architectural elements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scanResult.symbolicPatterns.map((pattern) => (
                      <div key={pattern.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{pattern.type}</Badge>
                              <Badge className={getSeverityColor(pattern.riskLevel)}>
                                {pattern.riskLevel}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {Math.round(pattern.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2">
                              {pattern.pattern}
                            </p>
                            <div className="space-y-1">
                              {pattern.suggestions.map((suggestion, idx) => (
                                <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                  • {suggestion}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Findings
                  </CardTitle>
                  <CardDescription>
                    Security vulnerabilities and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scanResult.securityFindings.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <p className="text-lg font-medium text-green-600">No security issues found!</p>
                      <p className="text-gray-600 dark:text-gray-400">Your project appears to be secure.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scanResult.securityFindings.map((finding, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(finding.severity)}>
                                {finding.severity}
                              </Badge>
                              <Badge variant="outline">{finding.type}</Badge>
                            </div>
                            <span className="text-sm text-gray-500">{finding.file}</span>
                          </div>
                          <p className="text-sm mb-2">{finding.description}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            💡 {finding.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Suggestions
                  </CardTitle>
                  <CardDescription>
                    Intelligent recommendations for improvement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scanResult.aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{suggestion.category}</Badge>
                            <Badge variant="secondary">Priority {suggestion.priority}</Badge>
                          </div>
                        </div>
                        <h4 className="font-medium mb-2">{suggestion.description}</h4>
                        <div className="space-y-1">
                          {suggestion.implementation.map((step, stepIdx) => (
                            <p key={stepIdx} className="text-sm text-gray-600 dark:text-gray-400">
                              {stepIdx + 1}. {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="archetype" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Project Architecture
                  </CardTitle>
                  <CardDescription>
                    Detected project type and suggested improvements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Detected Archetype</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {scanResult.archetype.type}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {Math.round(scanResult.archetype.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Evidence</h4>
                      <div className="space-y-1">
                        {scanResult.archetype.evidence.map((evidence, idx) => (
                          <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                            • {evidence}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Suggested Agents</h4>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.archetype.suggestedAgents.map((agent, idx) => (
                          <Badge key={idx} variant="outline">
                            {agent}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
} 