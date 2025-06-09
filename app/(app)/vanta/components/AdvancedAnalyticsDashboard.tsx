'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  EyeIcon,
  CpuChipIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AdvancedAnalyticsDashboardProps {
  isActive?: boolean;
}

interface Dashboard {
  dashboardId: string;
  name: string;
  description: string;
  category: string;
  widgets: Widget[];
}

interface Widget {
  widgetId: string;
  type: string;
  title: string;
  configuration: any;
  dimensions: any;
}

interface StreamData {
  timestamp: Date;
  [key: string]: any;
}

interface ForecastData {
  timestamp: string;
  predictedValue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  trend: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  isActive = true
}) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>('security-overview');
  const [widgetData, setWidgetData] = useState<{ [key: string]: any }>({});
  const [streamData, setStreamData] = useState<{ [key: string]: StreamData[] }>({});
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // Fetch dashboards and initialize data
  useEffect(() => {
    if (isActive) {
      fetchDashboards();
      fetchMetrics();
      if (realTimeUpdates) {
        const interval = setInterval(() => {
          updateRealTimeData();
        }, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
      }
    }
  }, [isActive, realTimeUpdates]);

  // Fetch widget data when dashboard changes
  useEffect(() => {
    if (selectedDashboard && dashboards.length > 0) {
      fetchWidgetData();
    }
  }, [selectedDashboard, dashboards]);

  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/vanta/analytics?action=dashboards');
      const data = await response.json();
      setDashboards(data);
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/vanta/analytics?action=metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchWidgetData = async () => {
    try {
      setLoading(true);
      const dashboard = dashboards.find(d => d.dashboardId === selectedDashboard);
      if (!dashboard) return;

      const widgetPromises = dashboard.widgets.map(async (widget) => {
        const response = await fetch(`/api/vanta/analytics?action=widget_data&id=${getWidgetDataKey(widget.title)}`);
        const data = await response.json();
        return { [widget.widgetId]: data };
      });

      const results = await Promise.all(widgetPromises);
      const combined = Object.assign({}, ...results);
      setWidgetData(combined);
    } catch (error) {
      console.error('Failed to fetch widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRealTimeData = async () => {
    try {
      // Fetch real-time stream data
      const streamResponse = await fetch('/api/vanta/analytics?action=stream_data&id=security-metrics');
      const streamData = await streamResponse.json();
      
      setStreamData(prev => ({
        ...prev,
        'security-metrics': streamData.data?.slice(-20) || []
      }));

      // Update specific widgets with new data
      await fetchWidgetData();
    } catch (error) {
      console.error('Failed to update real-time data:', error);
    }
  };

  const getWidgetDataKey = (title: string): string => {
    const keyMap: { [key: string]: string } = {
      'Risk Score Trend': 'risk-trend',
      'Active Anomalies': 'anomaly-count',
      'Current Threat Level': 'threat-level',
      'Compliance Score Trend': 'compliance-score',
      'Recent Violations': 'violation-alerts',
      'Access Volume Forecast': 'access-forecast',
      'Rotation Recommendations': 'rotation-optimizer'
    };
    return keyMap[title] || 'risk-trend';
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderWidget = (widget: Widget, data: any) => {
    if (!data) return <div>Loading...</div>;

    switch (widget.type) {
      case 'chart':
        return renderChart(widget, data);
      case 'metric':
        return renderMetric(widget, data);
      case 'gauge':
        return renderGauge(widget, data);
      case 'table':
        return renderTable(widget, data);
      default:
        return <div>Unknown widget type</div>;
    }
  };

  const renderChart = (widget: Widget, data: any) => {
    const chartType = widget.configuration?.chartType || 'line';
    
    if (data.datasets) {
      // Multi-dataset chart (like access forecast)
      const chartData = data.labels?.map((label: string, index: number) => ({
        time: formatTimestamp(label),
        ...data.datasets.reduce((acc: any, dataset: any) => {
          acc[dataset.label] = dataset.data[index];
          return acc;
        }, {})
      })) || [];

      return (
        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.datasets.map((dataset: any, index: number) => (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.datasets.map((dataset: any, index: number) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  strokeDasharray={dataset.borderDash ? "5 5" : "0"}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      );
    }

    // Simple data array
    if (Array.isArray(data)) {
      const chartData = data.map((value, index) => ({
        index,
        value
      }));

      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return <div>No chart data available</div>;
  };

  const renderMetric = (widget: Widget, data: any) => {
    const { value, change, trend, unit, historical } = data;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
            </div>
            {change !== undefined && (
              <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {Math.abs(change)} from last period
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${
            trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="w-6 h-6" />
            ) : (
              <ArrowTrendingDownIcon className="w-6 h-6" />
            )}
          </div>
        </div>
        
        {historical && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={historical.map((val: number, idx: number) => ({ value: val, index: idx }))}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const renderGauge = (widget: Widget, data: any) => {
    const { value, min, max, threshold, unit, status, level } = data;
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {value}{unit}
          </div>
          <Badge variant={status === 'normal' ? 'secondary' : 'destructive'}>
            {level?.toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-sm text-gray-500">
            <span>{min}{unit}</span>
            <span>Threshold: {threshold}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg text-center ${
          status === 'normal' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status === 'normal' ? (
            <CheckCircleIcon className="w-5 h-5 mx-auto mb-1" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5 mx-auto mb-1" />
          )}
          <div className="text-sm font-medium">
            {status === 'normal' ? 'Normal Range' : 'Attention Required'}
          </div>
        </div>
      </div>
    );
  };

  const renderTable = (widget: Widget, data: any) => {
    if (!data.rows || !Array.isArray(data.rows)) {
      return <div>No table data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 5).map((row: any, index: number) => (
              <tr key={index} className="border-b">
                <td className="p-2">
                  {formatTimestamp(row.timestamp)}
                </td>
                <td className="p-2">
                  <Badge variant="outline">{row.type}</Badge>
                </td>
                <td className="p-2 text-xs">
                  {row.description || row.reason}
                </td>
                <td className="p-2">
                  <Badge 
                    variant={
                      row.severity === 'high' ? 'destructive' : 
                      row.severity === 'medium' ? 'default' : 'secondary'
                    }
                  >
                    {row.severity}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const currentDashboard = dashboards.find(d => d.dashboardId === selectedDashboard);

  if (!isActive) {
    return (
      <div className="p-6 text-center text-gray-500">
        <CpuChipIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Advanced Analytics dashboard is not active</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Advanced Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Predictive dashboards with real-time insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={realTimeUpdates ? "default" : "outline"}
            size="sm"
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
          >
            <BoltIcon className="w-4 h-4 mr-2" />
            Real-time
          </Button>
          
          <Badge variant="secondary" className="px-3 py-1">
            <EyeIcon className="w-4 h-4 mr-1" />
            Live
          </Badge>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Forecast Accuracy</p>
                <p className="text-2xl font-bold">
                  {(metrics.performance?.forecastAccuracy * 100 || 87).toFixed(1)}%
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Latency</p>
                <p className="text-2xl font-bold">
                  {metrics.performance?.averageLatency || 35}ms
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Quality</p>
                <p className="text-2xl font-bold">
                  {(metrics.performance?.dataQuality * 100 || 94).toFixed(1)}%
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Dashboards</p>
                <p className="text-2xl font-bold">
                  {metrics.usage?.activeDashboards || 3}
                </p>
              </div>
              <ChartPieIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Selector */}
      <div className="flex space-x-2 border-b">
        {dashboards.map((dashboard) => (
          <button
            key={dashboard.dashboardId}
            onClick={() => setSelectedDashboard(dashboard.dashboardId)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedDashboard === dashboard.dashboardId
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {dashboard.name}
          </button>
        ))}
      </div>

      {/* Dashboard Content */}
      {currentDashboard && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentDashboard.name}
            </h2>
            <p className="text-gray-600 mt-1">
              {currentDashboard.description}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-gray-100 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDashboard.widgets.map((widget) => (
                <Card key={widget.widgetId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderWidget(widget, widgetData[widget.widgetId])}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Real-time Stream Data */}
      {realTimeUpdates && streamData['security-metrics'] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BoltIcon className="w-5 h-5 mr-2" />
              Real-time Security Metrics
            </CardTitle>
            <CardDescription>
              Live streaming data from security adapters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart 
                data={streamData['security-metrics']?.slice(-20).map((item, index) => ({
                  time: index,
                  riskScore: item.riskScore * 100,
                  accessCount: item.accessCount,
                  anomalyScore: item.anomalyScore * 100
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="riskScore" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Risk Score (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="accessCount" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Access Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="anomalyScore" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Anomaly Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 