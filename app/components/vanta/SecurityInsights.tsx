'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Brain,
  Target,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface SecurityInsight {
  insightId: string;
  type: 'anomaly' | 'trend' | 'pattern' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actionable: boolean;
  data: any;
}

interface SecurityMetrics {
  riskAssessment: {
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      factor: string;
      score: number;
      weight: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    recommendations: string[];
  };
  anomalyDetection: {
    totalAnomalies: number;
    recentAnomalies: Array<{
      id: string;
      type: string;
      severity: string;
      description: string;
      timestamp: Date;
      resolved: boolean;
    }>;
    patterns: Array<{
      pattern: string;
      frequency: number;
      riskLevel: number;
    }>;
  };
  complianceAnalysis: {
    overallScore: number;
    frameworks: Array<{
      name: string;
      score: number;
      status: 'compliant' | 'non_compliant' | 'partially_compliant';
      gaps: string[];
    }>;
    auditReadiness: number;
  };
  predictiveModeling: {
    breachPrediction: {
      riskScore: number;
      timeframe: string;
      confidence: number;
      factors: string[];
    };
    rotationOptimization: {
      recommendations: Array<{
        secretId: string;
        priority: number;
        reason: string;
        suggestedDate: Date;
      }>;
    };
    accessForecasting: {
      predictions: Array<{
        metric: string;
        predictedValue: number;
        timeframe: string;
        confidence: number;
      }>;
    };
  };
}

export default function SecurityInsights() {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [insights, setInsights] = useState<SecurityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch security analytics
      const analyticsResponse = await fetch('/api/vanta?action=security_analytics');
      const analyticsData = await analyticsResponse.json();
      
      // Fetch insights
      const insightsResponse = await fetch('/api/vanta?action=security_insights');
      const insightsData = await insightsResponse.json();
      
      setSecurityMetrics(analyticsData);
      setInsights(insightsData.insights || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSecurityData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low': return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high': return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'pattern': return <Eye className="h-4 w-4" />;
      case 'prediction': return <Brain className="h-4 w-4" />;
      case 'recommendation': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading Security Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Security Analytics Error</AlertTitle>
        <AlertDescription className="text-red-700">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSecurityData}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!securityMetrics) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Security Analytics Unavailable</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Security analytics data is not available. Please check the VANTA Framework status.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Insights</h1>
            <p className="text-gray-600">AI-Powered Security Analytics & Risk Assessment</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSecurityData}
            disabled={refreshing}
          >
            {refreshing ? (
              <Activity className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className={`h-4 w-4 ${getSeverityColor(securityMetrics.riskAssessment.riskLevel)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSeverityColor(securityMetrics.riskAssessment.riskLevel)}`}>
              {Math.round(securityMetrics.riskAssessment.overallScore * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Risk Level: {securityMetrics.riskAssessment.riskLevel.toUpperCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {securityMetrics.anomalyDetection.totalAnomalies}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics.anomalyDetection.recentAnomalies.filter(a => !a.resolved).length} unresolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(securityMetrics.complianceAnalysis.overallScore * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Audit Readiness: {Math.round(securityMetrics.complianceAnalysis.auditReadiness * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breach Risk</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(securityMetrics.predictiveModeling.breachPrediction.riskScore * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics.predictiveModeling.breachPrediction.timeframe} forecast
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <Card key={insight.insightId} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getInsightIcon(insight.type)}
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(insight.severity)}
                        <Badge variant="outline" className="capitalize">
                          {insight.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                        <span>•</span>
                        <span>{formatTimestamp(insight.timestamp)}</span>
                      </div>
                      {insight.actionable && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Actionable
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No security insights available at this time.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    The AI analysis engine is continuously monitoring for security patterns and anomalies.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
                <CardDescription>
                  Weighted analysis of security risk factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {securityMetrics.riskAssessment.factors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{factor.factor}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {Math.round(factor.score * 100)}%
                        </span>
                        {factor.trend === 'increasing' && (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        )}
                        {factor.trend === 'decreasing' && (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        {factor.trend === 'stable' && (
                          <div className="w-4 h-4 bg-gray-400 rounded-full" />
                        )}
                      </div>
                    </div>
                    <Progress value={factor.score * 100} />
                    <div className="text-xs text-gray-500">
                      Weight: {Math.round(factor.weight * 100)}%
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Recommendations</CardTitle>
                <CardDescription>
                  AI-generated recommendations to reduce security risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityMetrics.riskAssessment.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Anomalies</CardTitle>
                <CardDescription>
                  Security anomalies detected by AI monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityMetrics.anomalyDetection.recentAnomalies.map((anomaly) => (
                    <div key={anomaly.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {anomaly.resolved ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                        )}
                        <div>
                          <p className="font-medium">{anomaly.type}</p>
                          <p className="text-sm text-gray-600">{anomaly.description}</p>
                          <p className="text-xs text-gray-500">{formatTimestamp(anomaly.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSeverityBadge(anomaly.severity)}
                        {anomaly.resolved && (
                          <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Patterns</CardTitle>
                <CardDescription>
                  Identified patterns in security anomalies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityMetrics.anomalyDetection.patterns.map((pattern, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{pattern.pattern}</p>
                        <p className="text-sm text-gray-600">Frequency: {pattern.frequency}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getSeverityColor(
                          pattern.riskLevel > 0.7 ? 'high' : pattern.riskLevel > 0.4 ? 'medium' : 'low'
                        )}`}>
                          Risk: {Math.round(pattern.riskLevel * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Frameworks</CardTitle>
                <CardDescription>
                  Compliance status across regulatory frameworks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {securityMetrics.complianceAnalysis.frameworks.map((framework, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{framework.name}</span>
                      <Badge className={
                        framework.status === 'compliant' ? 'bg-green-100 text-green-800' :
                        framework.status === 'partially_compliant' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {framework.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <Progress value={framework.score * 100} />
                    <div className="text-sm text-gray-600">
                      Score: {Math.round(framework.score * 100)}%
                    </div>
                    {framework.gaps.length > 0 && (
                      <div className="text-xs text-red-600">
                        Gaps: {framework.gaps.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Readiness</CardTitle>
                <CardDescription>
                  Overall readiness for compliance audits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-green-600">
                    {Math.round(securityMetrics.complianceAnalysis.auditReadiness * 100)}%
                  </div>
                  <p className="text-gray-600">Audit Ready</p>
                </div>
                <Progress value={securityMetrics.complianceAnalysis.auditReadiness * 100} className="mb-4" />
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Compliance Status</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your secrets management system maintains high compliance standards across 
                    all monitored frameworks.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Breach Prediction</CardTitle>
                <CardDescription>
                  AI-powered security breach risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getSeverityColor(
                    securityMetrics.predictiveModeling.breachPrediction.riskScore > 0.7 ? 'critical' :
                    securityMetrics.predictiveModeling.breachPrediction.riskScore > 0.4 ? 'high' : 'medium'
                  )}`}>
                    {Math.round(securityMetrics.predictiveModeling.breachPrediction.riskScore * 100)}%
                  </div>
                  <p className="text-gray-600">Breach Risk</p>
                  <p className="text-sm text-gray-500">
                    {securityMetrics.predictiveModeling.breachPrediction.timeframe} forecast
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confidence</span>
                    <span>{Math.round(securityMetrics.predictiveModeling.breachPrediction.confidence * 100)}%</span>
                  </div>
                  <Progress value={securityMetrics.predictiveModeling.breachPrediction.confidence * 100} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Risk Factors:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {securityMetrics.predictiveModeling.breachPrediction.factors.map((factor, index) => (
                      <li key={index}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rotation Optimization</CardTitle>
                <CardDescription>
                  AI recommendations for secret rotation scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityMetrics.predictiveModeling.rotationOptimization.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">Secret: {rec.secretId}</span>
                        <Badge className={
                          rec.priority > 8 ? 'bg-red-100 text-red-800' :
                          rec.priority > 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          Priority: {rec.priority}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                      <p className="text-xs text-gray-500">
                        Suggested: {new Date(rec.suggestedDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Access Forecasting</CardTitle>
                <CardDescription>
                  Predicted access patterns and usage trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {securityMetrics.predictiveModeling.accessForecasting.predictions.map((prediction, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{prediction.metric}</span>
                        <LineChart className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {prediction.predictedValue}
                      </div>
                      <div className="text-xs text-gray-600">
                        {prediction.timeframe} • {Math.round(prediction.confidence * 100)}% confidence
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 