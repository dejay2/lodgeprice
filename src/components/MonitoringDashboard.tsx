/**
 * Monitoring Dashboard Component
 * Displays logging statistics, performance metrics, and system health
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoggingService } from '@/lib/logging/LoggingService';
import { performanceMonitor } from '@/lib/logging/PerformanceMonitor';
import { databaseLogger } from '@/lib/logging/DatabaseLogger';
import type { IMonitoringStats, IPerformanceMetrics, IStoredLogEntry, LogLevel } from '@/lib/logging/types';
import { LOG_LEVEL_VALUES } from '@/lib/logging/config';

interface MonitoringDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ 
  isOpen = true, 
  onClose 
}) => {
  const [stats, setStats] = useState<IMonitoringStats | null>(null);
  const [slowOperations, setSlowOperations] = useState<IPerformanceMetrics[]>([]);
  const [recentLogs, setRecentLogs] = useState<IStoredLogEntry[]>([]);
  const [dbStats, setDbStats] = useState<{ totalQueries: number; averageTime: number; slowQueries: any[] } | null>(null);
  const [currentLogLevel, setCurrentLogLevel] = useState<LogLevel>('INFO');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(() => {
    const loggingService = LoggingService.getInstance();
    
    // Get logging statistics
    setStats(loggingService.getStats());
    
    // Get recent logs from localStorage
    setRecentLogs(loggingService.getStoredLogs());
    
    // Get performance metrics
    setSlowOperations(performanceMonitor.getSlowOperations());
    
    // Get database statistics
    setDbStats(databaseLogger.getStats());
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (isOpen && autoRefresh) {
      fetchMonitoringData();
      const interval = setInterval(fetchMonitoringData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh, refreshInterval, fetchMonitoringData]);

  // Clear logs handler
  const handleClearLogs = useCallback(() => {
    LoggingService.getInstance().clearStoredLogs();
    performanceMonitor.clearMetrics();
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Change log level handler
  const handleLogLevelChange = useCallback((level: LogLevel) => {
    LoggingService.getInstance().setLogLevel(level);
    setCurrentLogLevel(level);
  }, []);

  // Toggle performance monitoring
  const handleTogglePerformanceMonitoring = useCallback(() => {
    if (performanceMonitor.isEnabled()) {
      performanceMonitor.disable();
    } else {
      performanceMonitor.enable();
    }
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  if (!isOpen) return null;

  // Calculate average metrics
  const avgMetrics = performanceMonitor.getAverageMetrics();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Monitoring Dashboard</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="bg-gray-100 p-4 border-b flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Refresh interval:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="rounded border-gray-300 text-sm"
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Log level:</label>
            <select
              value={currentLogLevel}
              onChange={(e) => handleLogLevelChange(e.target.value as LogLevel)}
              className="rounded border-gray-300 text-sm"
            >
              {Object.keys(LOG_LEVEL_VALUES).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchMonitoringData}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Refresh Now
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Clear Logs
          </button>

          <button
            onClick={handleTogglePerformanceMonitoring}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            {performanceMonitor.isEnabled() ? 'Disable' : 'Enable'} Performance
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Statistics Grid */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalLogs || 0}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{stats?.errorCount || 0}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-yellow-600">{stats?.warningCount || 0}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{dbStats?.totalQueries || 0}</div>
              <div className="text-sm text-gray-600">DB Queries</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Operation</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Count</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Avg Duration</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Max Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(avgMetrics).map(([operation, metrics]) => (
                    <tr key={operation} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{operation}</td>
                      <td className="px-4 py-2 text-sm">{metrics.count}</td>
                      <td className="px-4 py-2 text-sm">{metrics.avgDuration.toFixed(2)}ms</td>
                      <td className="px-4 py-2 text-sm">{metrics.maxDuration.toFixed(2)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slow Operations */}
          {slowOperations.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-red-600">Slow Operations</h3>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Operation</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Duration</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Threshold</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slowOperations.slice(0, 10).map((op, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{op.operation}</td>
                        <td className="px-4 py-2 text-sm text-red-600 font-medium">
                          {op.duration.toFixed(2)}ms
                        </td>
                        <td className="px-4 py-2 text-sm">{op.threshold}ms</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(op.startTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Logs */}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3">Recent Logs</h3>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto">
              {recentLogs.slice(0, 20).map((log, index) => (
                <div key={index} className="mb-2">
                  <span className={`font-bold ${
                    log.level === 'ERROR' ? 'text-red-400' :
                    log.level === 'WARN' ? 'text-yellow-400' :
                    log.level === 'INFO' ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="text-gray-500 ml-2">{log.timestamp}</span>
                  <span className="text-white ml-2">{log.message}</span>
                  {log.data && (
                    <div className="text-gray-400 ml-8 mt-1">
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Database Statistics */}
          {dbStats && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">Database Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-xl font-bold">{dbStats.totalQueries}</div>
                  <div className="text-sm text-gray-600">Total Queries</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-xl font-bold">{dbStats.averageTime.toFixed(2)}ms</div>
                  <div className="text-sm text-gray-600">Avg Query Time</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-xl font-bold">{dbStats.slowQueries.length}</div>
                  <div className="text-sm text-gray-600">Slow Queries</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;