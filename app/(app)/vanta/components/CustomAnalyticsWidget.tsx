'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CogIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CustomAnalyticsWidgetProps {
  isActive?: boolean;
  onWidgetUpdate?: (widgetConfig: WidgetConfig) => void;
}

interface WidgetConfig {
  widgetId: string;
  type: string;
  title: string;
  configuration: {
    chartType?: string;
    timeRange?: string;
    metric?: string;
    aggregation?: string;
    threshold?: number;
    refreshInterval?: number;
  };
  dimensions: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  filters?: {
    secretTypes?: string[];
    riskLevels?: string[];
    timeRange?: string;
  };
}

interface WidgetTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  defaultConfig: Partial<WidgetConfig>;
  preview?: string;
}

const widgetTemplates: WidgetTemplate[] = [
  {
    id: 'risk-trend-chart',
    name: 'Risk Trend Chart',
    type: 'chart',
    description: 'Monitor risk score trends over time with predictive forecasting',
    defaultConfig: {
      type: 'chart',
      configuration: {
        chartType: 'line',
        timeRange: '24h',
        metric: 'risk_score',
        refreshInterval: 60000
      },
      dimensions: { width: 400, height: 250, x: 0, y: 0 }
    }
  },
  {
    id: 'anomaly-counter',
    name: 'Anomaly Counter',
    type: 'metric',
    description: 'Display current anomaly count with trend indicators',
    defaultConfig: {
      type: 'metric',
      configuration: {
        aggregation: 'count',
        metric: 'anomalies',
        refreshInterval: 30000
      },
      dimensions: { width: 200, height: 150, x: 0, y: 0 }
    }
  },
  {
    id: 'compliance-gauge',
    name: 'Compliance Gauge',
    type: 'gauge',
    description: 'Visual gauge showing compliance score with thresholds',
    defaultConfig: {
      type: 'gauge',
      configuration: {
        metric: 'compliance_score',
        threshold: 0.9,
        refreshInterval: 300000
      },
      dimensions: { width: 200, height: 200, x: 0, y: 0 }
    }
  },
  {
    id: 'alert-table',
    name: 'Alert Table',
    type: 'table',
    description: 'Tabular view of recent security alerts and violations',
    defaultConfig: {
      type: 'table',
      configuration: {
        timeRange: '24h',
        metric: 'alerts',
        refreshInterval: 60000
      },
      dimensions: { width: 400, height: 300, x: 0, y: 0 }
    }
  },
  {
    id: 'forecast-chart',
    name: 'Forecast Chart',
    type: 'chart',
    description: 'Predictive analytics chart with confidence intervals',
    defaultConfig: {
      type: 'chart',
      configuration: {
        chartType: 'line',
        timeRange: '7d',
        metric: 'access_frequency',
        refreshInterval: 3600000
      },
      dimensions: { width: 600, height: 300, x: 0, y: 0 }
    }
  },
  {
    id: 'heatmap-widget',
    name: 'Security Heatmap',
    type: 'heatmap',
    description: 'Temporal heatmap showing security events by time and type',
    defaultConfig: {
      type: 'heatmap',
      configuration: {
        timeRange: '7d',
        metric: 'security_events',
        refreshInterval: 300000
      },
      dimensions: { width: 500, height: 250, x: 0, y: 0 }
    }
  }
];

const chartTypes = [
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' }
];

const timeRanges = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' }
];

const metrics = [
  { value: 'risk_score', label: 'Risk Score' },
  { value: 'access_frequency', label: 'Access Frequency' },
  { value: 'compliance_score', label: 'Compliance Score' },
  { value: 'anomalies', label: 'Anomalies' },
  { value: 'security_events', label: 'Security Events' },
  { value: 'rotation_rate', label: 'Rotation Rate' }
];

export const CustomAnalyticsWidget: React.FC<CustomAnalyticsWidgetProps> = ({
  isActive = true,
  onWidgetUpdate
}) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    // Load existing widgets from localStorage or API
    loadSavedWidgets();
  }, []);

  const loadSavedWidgets = () => {
    try {
      const saved = localStorage.getItem('custom-analytics-widgets');
      if (saved) {
        setWidgets(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved widgets:', error);
    }
  };

  const saveWidgets = (updatedWidgets: WidgetConfig[]) => {
    try {
      localStorage.setItem('custom-analytics-widgets', JSON.stringify(updatedWidgets));
      setWidgets(updatedWidgets);
    } catch (error) {
      console.error('Failed to save widgets:', error);
    }
  };

  const createWidgetFromTemplate = (template: WidgetTemplate) => {
    const newWidget: WidgetConfig = {
      widgetId: `widget-${Date.now()}`,
      title: template.name,
      ...template.defaultConfig,
      type: template.type,
      configuration: {
        ...template.defaultConfig.configuration,
        refreshInterval: template.defaultConfig.configuration?.refreshInterval || 60000
      },
      dimensions: template.defaultConfig.dimensions || { width: 400, height: 250, x: 0, y: 0 },
      filters: {
        secretTypes: ['all'],
        riskLevels: ['all'],
        timeRange: '24h'
      }
    } as WidgetConfig;

    const updatedWidgets = [...widgets, newWidget];
    saveWidgets(updatedWidgets);
    setShowTemplates(false);
    
    // Notify parent component
    if (onWidgetUpdate) {
      onWidgetUpdate(newWidget);
    }
  };

  const updateWidget = (updatedWidget: WidgetConfig) => {
    const updatedWidgets = widgets.map(w => 
      w.widgetId === updatedWidget.widgetId ? updatedWidget : w
    );
    saveWidgets(updatedWidgets);
    setIsEditing(false);
    setEditingWidget(null);
    
    if (onWidgetUpdate) {
      onWidgetUpdate(updatedWidget);
    }
  };

  const deleteWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.widgetId !== widgetId);
    saveWidgets(updatedWidgets);
  };

  const duplicateWidget = (widget: WidgetConfig) => {
    const duplicated: WidgetConfig = {
      ...widget,
      widgetId: `widget-${Date.now()}`,
      title: `${widget.title} (Copy)`,
      dimensions: {
        ...widget.dimensions,
        x: widget.dimensions.x + 20,
        y: widget.dimensions.y + 20
      }
    };
    
    const updatedWidgets = [...widgets, duplicated];
    saveWidgets(updatedWidgets);
  };

  const renderWidgetEditor = () => {
    if (!editingWidget) return null;

    return (
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Widget: {editingWidget.title}</DialogTitle>
            <DialogDescription>
              Customize your analytics widget configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Basic Settings</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Widget Title</Label>
                  <Input
                    value={editingWidget.title}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      title: e.target.value
                    })}
                    placeholder="Enter widget title"
                  />
                </div>
                
                <div>
                  <Label>Refresh Interval (ms)</Label>
                  <Input
                    type="number"
                    value={editingWidget.configuration.refreshInterval || 60000}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      configuration: {
                        ...editingWidget.configuration,
                        refreshInterval: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Chart-specific Settings */}
            {editingWidget.type === 'chart' && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Chart Settings</Label>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Chart Type</Label>
                    <Select
                      value={editingWidget.configuration.chartType}
                      onValueChange={(value) => setEditingWidget({
                        ...editingWidget,
                        configuration: {
                          ...editingWidget.configuration,
                          chartType: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chartTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Time Range</Label>
                    <Select
                      value={editingWidget.configuration.timeRange}
                      onValueChange={(value) => setEditingWidget({
                        ...editingWidget,
                        configuration: {
                          ...editingWidget.configuration,
                          timeRange: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRanges.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Metric</Label>
                    <Select
                      value={editingWidget.configuration.metric}
                      onValueChange={(value) => setEditingWidget({
                        ...editingWidget,
                        configuration: {
                          ...editingWidget.configuration,
                          metric: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metrics.map(metric => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Gauge-specific Settings */}
            {editingWidget.type === 'gauge' && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Gauge Settings</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Metric</Label>
                    <Select
                      value={editingWidget.configuration.metric}
                      onValueChange={(value) => setEditingWidget({
                        ...editingWidget,
                        configuration: {
                          ...editingWidget.configuration,
                          metric: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metrics.map(metric => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingWidget.configuration.threshold || 0.9}
                      onChange={(e) => setEditingWidget({
                        ...editingWidget,
                        configuration: {
                          ...editingWidget.configuration,
                          threshold: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dimensions */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Dimensions</Label>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Width</Label>
                  <Input
                    type="number"
                    value={editingWidget.dimensions.width}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      dimensions: {
                        ...editingWidget.dimensions,
                        width: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Height</Label>
                  <Input
                    type="number"
                    value={editingWidget.dimensions.height}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      dimensions: {
                        ...editingWidget.dimensions,
                        height: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label>X Position</Label>
                  <Input
                    type="number"
                    value={editingWidget.dimensions.x}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      dimensions: {
                        ...editingWidget.dimensions,
                        x: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label>Y Position</Label>
                  <Input
                    type="number"
                    value={editingWidget.dimensions.y}
                    onChange={(e) => setEditingWidget({
                      ...editingWidget,
                      dimensions: {
                        ...editingWidget.dimensions,
                        y: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <XMarkIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={() => updateWidget(editingWidget)}>
              <CheckIcon className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (!isActive) {
    return (
      <div className="p-6 text-center text-gray-500">
        <CogIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Widget customization is not active</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Custom Analytics Widgets
          </h2>
          <p className="text-gray-600 mt-1">
            Create and customize your analytics dashboard widgets
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowTemplates(true)}
            className="flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Widget Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choose Widget Template</DialogTitle>
            <DialogDescription>
              Select a template to add to your dashboard
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgetTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => createWidgetFromTemplate(template)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="outline">{template.type}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Widgets */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Custom Widgets ({widgets.length})</h3>
        
        {widgets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CogIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">No custom widgets created yet</p>
              <Button onClick={() => setShowTemplates(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Your First Widget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map((widget) => (
              <Card key={widget.widgetId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                    <Badge variant="outline">{widget.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div><strong>Metric:</strong> {widget.configuration.metric}</div>
                      <div><strong>Refresh:</strong> {widget.configuration.refreshInterval}ms</div>
                      <div><strong>Size:</strong> {widget.dimensions.width}×{widget.dimensions.height}</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWidget(widget);
                          setIsEditing(true);
                        }}
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateWidget(widget)}
                      >
                        Copy
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteWidget(widget.widgetId)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Widget Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{widgets.length}</div>
              <div className="text-sm text-gray-600">Total Widgets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {widgets.filter(w => w.type === 'chart').length}
              </div>
              <div className="text-sm text-gray-600">Charts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {widgets.filter(w => w.type === 'metric').length}
              </div>
              <div className="text-sm text-gray-600">Metrics</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {widgets.filter(w => w.type === 'gauge').length}
              </div>
              <div className="text-sm text-gray-600">Gauges</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Editor */}
      {renderWidgetEditor()}
    </div>
  );
}; 