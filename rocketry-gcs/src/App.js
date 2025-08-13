import React, { useState, useEffect, useMemo, createContext, useContext, useReducer } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ========== STATE MANAGEMENT ==========

// Centralized state structure
const initialState = {
  mission: {
    isActive: false,
    missionTime: 0,
    flightPhase: 'PRELAUNCH',
    packetCount: 0
  },
  telemetry: {
    current: null,
    history: [],
    maxHistoryLength: 200
  },
  system: {
    signalStrength: 95,
    range: 2.4,
    lastUpdate: null
  },
  checklist: {
    items: {},
    totalItems: 11
  }
};

// Action types
const ActionTypes = {
  START_MISSION: 'START_MISSION',
  STOP_MISSION: 'STOP_MISSION',
  RESET_MISSION: 'RESET_MISSION',
  UPDATE_TELEMETRY: 'UPDATE_TELEMETRY',
  UPDATE_MISSION_TIME: 'UPDATE_MISSION_TIME',
  UPDATE_CHECKLIST: 'UPDATE_CHECKLIST',
  UPDATE_SYSTEM_STATUS: 'UPDATE_SYSTEM_STATUS'
};

// State reducer
const telemetryReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.START_MISSION:
      return {
        ...state,
        mission: {
          ...state.mission,
          isActive: true,
          missionTime: 0,
          packetCount: 0
        },
        telemetry: {
          ...state.telemetry,
          history: []
        }
      };

    case ActionTypes.STOP_MISSION:
      return {
        ...state,
        mission: {
          ...state.mission,
          isActive: false
        }
      };

    case ActionTypes.RESET_MISSION:
      return {
        ...state,
        mission: {
          isActive: false,
          missionTime: 0,
          flightPhase: 'PRELAUNCH',
          packetCount: 0
        },
        telemetry: {
          ...state.telemetry,
          current: null,
          history: []
        }
      };

    case ActionTypes.UPDATE_TELEMETRY:
      return {
        ...state,
        telemetry: {
          ...state.telemetry,
          current: action.payload,
          history: [
            ...state.telemetry.history.slice(-(state.telemetry.maxHistoryLength - 1)),
            action.payload
          ]
        },
        system: {
          ...state.system,
          lastUpdate: new Date().toISOString()
        }
      };

    case ActionTypes.UPDATE_MISSION_TIME:
      return {
        ...state,
        mission: {
          ...state.mission,
          missionTime: action.payload.missionTime,
          flightPhase: action.payload.flightPhase,
          packetCount: action.payload.packetCount
        }
      };

    case ActionTypes.UPDATE_CHECKLIST:
      return {
        ...state,
        checklist: {
          ...state.checklist,
          items: {
            ...state.checklist.items,
            [action.payload.index]: action.payload.checked
          }
        }
      };

    case ActionTypes.UPDATE_SYSTEM_STATUS:
      return {
        ...state,
        system: {
          ...state.system,
          ...action.payload
        }
      };

    default:
      return state;
  }
};

// Context for state management
const TelemetryContext = createContext();

// Custom hook for using telemetry context
const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};

// ========== TELEMETRY LOGIC ==========

// Flight phase definitions with clear transitions
const FLIGHT_PHASES = {
  PRELAUNCH: { duration: 30, name: 'Pre-Launch', color: 'text-blue-600' },
  LAUNCH: { duration: 10, name: 'Launch', color: 'text-orange-500' },
  ASCENT: { duration: 45, name: 'Ascent', color: 'text-yellow-500' },
  APOGEE: { duration: 5, name: 'Apogee', color: 'text-purple-500' },
  SEPARATION: { duration: 2, name: 'Separation', color: 'text-red-500' },
  DESCENT: { duration: 120, name: 'Descent', color: 'text-blue-500' },
  IMPACT: { duration: 5, name: 'Impact', color: 'text-gray-500' }
};

// Get current flight phase based on mission time
const getFlightPhase = (missionTime) => {
  let totalTime = 0;
  for (const [phase, config] of Object.entries(FLIGHT_PHASES)) {
    totalTime += config.duration;
    if (missionTime < totalTime) {
      return phase;
    }
  }
  return 'IMPACT';
};

// Generate realistic telemetry data
const generateTelemetryData = (missionTime, phase) => {
  const noise = (scale = 1) => (Math.random() - 0.5) * 2 * scale;
  
  // Calculate altitude based on realistic flight physics
  let altitude = 0;
  switch(phase) {
    case 'LAUNCH':
      const launchTime = missionTime - 30;
      altitude = Math.pow(launchTime / 10, 2.2) * 200 + noise(2);
      break;
    case 'ASCENT':
      const ascentTime = missionTime - 40;
      altitude = 200 + (800 * (ascentTime / 45)) - Math.pow((ascentTime / 45), 2.5) * 300 + noise(5);
      break;
    case 'APOGEE':
      altitude = 1000 + noise(3);
      break;
    case 'SEPARATION':
      altitude = 1000 + noise(4);
      break;
    case 'DESCENT':
      const descentTime = missionTime - 92;
      altitude = Math.max(0, 1000 - (descentTime * descentTime * 0.12) + noise(8));
      break;
    default:
      altitude = 0 + noise(0.5);
  }

  return {
    // Core mission data
    teamId: 'ASI-DTU',
    timestamp: new Date().toISOString(),
    missionTime,
    packetCount: Math.floor(missionTime * 10),
    
    // Primary sensors
    altitude: Math.max(0, altitude),
    pressure: 101325 - (altitude * 12) + noise(15),
    temperature: 15 - (altitude * 0.0065) + noise(1),
    voltage: Math.max(10.5, 12.6 - (missionTime * 0.008) + noise(0.15)),
    
    // GNSS data
    gnss: {
      time: new Date().toISOString(),
      latitude: 28.7041 + (noise(0.001)),
      longitude: 77.1025 + (noise(0.001)),
      altitude: altitude,
      satellites: Math.max(4, Math.floor(8 + noise(2)))
    },
    
    // IMU data
    acceleration: {
      x: noise(phase === 'LAUNCH' ? 25 : 3),
      y: noise(phase === 'LAUNCH' ? 25 : 3),
      z: phase === 'LAUNCH' ? 18 + noise(8) : -9.8 + noise(2)
    },
    
    gyroscope: {
      x: noise(phase === 'ASCENT' ? 80 : 15),
      y: noise(phase === 'ASCENT' ? 80 : 15),
      z: noise(phase === 'ASCENT' ? 120 : 20)
    },
    
    // Flight state
    flightPhase: phase,
    
    // Derived data
    velocity: phase === 'ASCENT' ? 50 + noise(10) : phase === 'DESCENT' ? -30 + noise(8) : noise(5)
  };
};

// ========== COMPONENTS ==========

// Status indicator with consistent styling
const StatusIndicator = ({ status, label, size = 'sm' }) => {
  const statusConfig = {
    good: { color: 'bg-green-500', text: 'text-green-700' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-700' },
    critical: { color: 'bg-red-500', text: 'text-red-700' },
    inactive: { color: 'bg-gray-400', text: 'text-gray-600' }
  };

  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <div className="flex items-center space-x-2">
      <div className={`rounded-full ${config.color} ${sizes[size]} animate-pulse`}></div>
      <span className={`text-sm font-medium ${config.text}`}>{label}</span>
    </div>
  );
};

// Data card with improved styling
const DataCard = ({ title, value, unit, status = 'good', trend }) => {
  const statusColors = {
    good: 'border-green-300 bg-green-50',
    warning: 'border-yellow-300 bg-yellow-50',
    critical: 'border-red-300 bg-red-50'
  };

  return (
    <div className={`border-2 ${statusColors[status]} rounded-xl p-4 shadow-sm`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-xs text-gray-600 uppercase tracking-wide font-semibold">{title}</h4>
        {trend && (
          <span className={`text-sm font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'}
          </span>
        )}
      </div>
      <div className="flex items-end space-x-1">
        <span className="text-2xl font-mono font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-600 mb-1 font-medium">{unit}</span>
      </div>
    </div>
  );
};

// Enhanced chart component
const TelemetryChart = ({ data, dataKey, title, color = '#3B82F6', height = 120, unit = '' }) => {
  const chartData = data.slice(-50);
  
  const getValue = (item) => {
    if (typeof dataKey === 'string') {
      return item[dataKey];
    }
    return dataKey.reduce((obj, key) => obj?.[key], item);
  };
  
  const values = chartData.map(getValue).filter(v => v !== undefined && !isNaN(v));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm text-gray-700 uppercase tracking-wide font-semibold">{title}</h4>
        <div className="text-xs text-gray-500 font-mono">
          <span className="text-red-500">↓{minValue.toFixed(1)}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-green-500">↑{maxValue.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3,3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="missionTime" 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={{ stroke: '#D1D5DB' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#D1D5DB' }}
              tickLine={{ stroke: '#D1D5DB' }}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value.toFixed(2)} ${unit}`, title]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Multi-axis acceleration chart
const AccelerationChart = ({ data, height = 120 }) => {
  const chartData = data.slice(-50).map(d => ({
    missionTime: d.missionTime,
    'X-Axis': d.acceleration.x,
    'Y-Axis': d.acceleration.y,
    'Z-Axis': d.acceleration.z
  }));

  const allValues = chartData.flatMap(d => [d['X-Axis'], d['Y-Axis'], d['Z-Axis']]).filter(v => !isNaN(v));
  const minValue = allValues.length > 0 ? Math.min(...allValues) : -10;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 10;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm text-gray-700 uppercase tracking-wide font-semibold">3-Axis Acceleration</h4>
        <div className="text-xs text-gray-500 font-mono">
          <span className="text-red-500">↓{minValue.toFixed(1)}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-green-500">↑{maxValue.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3,3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="missionTime" 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#D1D5DB' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#D1D5DB' }}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line type="monotone" dataKey="X-Axis" stroke="#EF4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Y-Axis" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Z-Axis" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Safety checklist with state management
const SafetyChecklist = () => {
  const { state, dispatch } = useTelemetry();
  
  const checklistItems = [
    'Battery voltage check (>11V)',
    'Communication link established',
    'GNSS lock acquired (≥4 satellites)',
    'Sensors responding normally',
    'Ground station antenna elevated',
    'Launch pad angle verified (80°-85°)',
    'Recovery system armed',
    'Flight software ready',
    'Payload separation tested',
    'Emergency procedures reviewed',
    'Team ready for launch'
  ];

  const toggleItem = (index) => {
    dispatch({
      type: ActionTypes.UPDATE_CHECKLIST,
      payload: { index, checked: !state.checklist.items[index] }
    });
  };

  const completedCount = Object.values(state.checklist.items).filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Pre-Launch Checklist</h3>
        <div className="text-sm text-gray-600 font-semibold">
          {completedCount}/{checklistItems.length}
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {checklistItems.map((item, index) => (
          <label key={index} className="flex items-center space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={state.checklist.items[index] || false}
              onChange={() => toggleItem(index)}
              className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className={`text-sm font-medium transition-colors ${
              state.checklist.items[index] ? 'text-green-700 line-through' : 'text-gray-700 group-hover:text-gray-900'
            }`}>
              {item}
            </span>
          </label>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex justify-between text-sm font-semibold mb-2">
          <span className="text-gray-600">Completion Status:</span>
          <span className={completionPercentage === 100 ? 'text-green-600' : 'text-blue-600'}>
            {completionPercentage}%
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Mission control panel
const MissionControlPanel = () => {
  const { state, dispatch } = useTelemetry();

  const exportTelemetryData = () => {
    if (!state.telemetry.current) return;
    
    const data = state.telemetry.current;
    const csvHeaders = [
      'TEAM_ID', 'TIME_STAMPING', 'PACKET_COUNT', 'ALTITUDE', 'PRESSURE', 'TEMP', 
      'VOLTAGE', 'GNSS_TIME', 'GNSS_LATITUDE', 'GNSS_LONGITUDE', 'GNSS_ALTITUDE', 
      'GNSS_SATS', 'ACCELEROMETER_DATA_X', 'ACCELEROMETER_DATA_Y', 'ACCELEROMETER_DATA_Z',
      'GYRO_SPIN_RATE_X', 'GYRO_SPIN_RATE_Y', 'GYRO_SPIN_RATE_Z', 'FLIGHT_SOFTWARE_STATE'
    ];
    
    const csvData = [
      data.teamId,
      data.missionTime,
      data.packetCount,
      data.altitude.toFixed(1),
      data.pressure.toFixed(0),
      data.temperature.toFixed(1),
      data.voltage.toFixed(2),
      data.gnss.time,
      data.gnss.latitude.toFixed(4),
      data.gnss.longitude.toFixed(4),
      data.gnss.altitude.toFixed(1),
      data.gnss.satellites,
      data.acceleration.x.toFixed(2),
      data.acceleration.y.toFixed(2),
      data.acceleration.z.toFixed(2),
      data.gyroscope.x.toFixed(1),
      data.gyroscope.y.toFixed(1),
      data.gyroscope.z.toFixed(1),
      data.flightPhase
    ];
    
    const csv = [csvHeaders.join(','), csvData.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Flight_ASI-DTU_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startMission = () => dispatch({ type: ActionTypes.START_MISSION });
  const stopMission = () => dispatch({ type: ActionTypes.STOP_MISSION });
  const resetMission = () => dispatch({ type: ActionTypes.RESET_MISSION });

  // Status helpers
  const getSystemStatus = (value, min, max) => {
    if (value < min || value > max) return 'critical';
    if (value < min * 1.1 || value > max * 0.9) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Mission Control</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={startMission}
            disabled={state.mission.isActive}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
          >
            START MISSION
          </button>
          <button
            onClick={stopMission}
            disabled={!state.mission.isActive}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
          >
            STOP MISSION
          </button>
          <button
            onClick={resetMission}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
          >
            RESET
          </button>
          <button
            onClick={exportTelemetryData}
            disabled={!state.telemetry.current}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
          >
            EXPORT CSV
          </button>
        </div>
        
        <div className="space-y-4">
          <StatusIndicator 
            status={state.mission.isActive ? 'good' : 'inactive'} 
            label="Telemetry Link" 
            size="md" 
          />
          <StatusIndicator 
            status={getSystemStatus(state.telemetry.current?.gnss?.satellites || 0, 4, 12)} 
            label="GNSS Signal" 
            size="md" 
          />
          <StatusIndicator 
            status={getSystemStatus(state.telemetry.current?.voltage || 12.6, 11, 13)} 
            label="Battery Status" 
            size="md" 
          />
        </div>
      </div>
      
      <SafetyChecklist />
    </div>
  );
};

// Main dashboard component
const Dashboard = () => {
  const { state } = useTelemetry();
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentData = state.telemetry.current;
  const phaseConfig = FLIGHT_PHASES[state.mission.flightPhase] || FLIGHT_PHASES.PRELAUNCH;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-6 m-4 mb-2 rounded-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-bold text-gray-900">GROUND CONTROL STATION</h1>
            <div className="text-lg text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg">
              TEAM ASI-DTU
            </div>
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <div className="text-sm text-gray-500 font-medium">Mission Time</div>
              <div className="text-2xl font-mono font-bold text-gray-900">{formatTime(state.mission.missionTime)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 font-medium">Flight Phase</div>
              <div className={`text-lg font-bold ${phaseConfig.color}`}>
                {phaseConfig.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 font-medium">Packets</div>
              <div className="text-lg font-mono font-bold text-gray-900">
                {state.mission.packetCount}
              </div>
            </div>
            <StatusIndicator 
              status={state.mission.isActive ? 'good' : 'inactive'} 
              label="System Active" 
              size="lg" 
            />
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 mx-4 mb-4">
        {/* Left column - Telemetry cards and sensors */}
        <div className="col-span-3 flex flex-col space-y-4">
          {/* Primary telemetry */}
          <div className="grid grid-cols-2 gap-3">
            <DataCard
              title="Altitude"
              value={currentData?.altitude.toFixed(1) || '0.0'}
              unit="m"
              status={currentData?.altitude > 1100 ? 'warning' : 'good'}
            />
            <DataCard
              title="Velocity"
              value={currentData?.velocity.toFixed(1) || '0.0'}
              unit="m/s"
              status="good"
            />
            <DataCard
              title="Temperature"
              value={currentData?.temperature.toFixed(1) || '15.0'}
              unit="°C"
              status="good"
            />
            <DataCard
              title="Pressure"
              value={(currentData?.pressure || 101325).toFixed(0)}
              unit="Pa"
              status="good"
            />
            <DataCard
              title="Battery"
              value={currentData?.voltage.toFixed(2) || '12.60'}
              unit="V"
              status={currentData?.voltage < 11 ? 'critical' : currentData?.voltage < 11.5 ? 'warning' : 'good'}
            />
            <DataCard
              title="Satellites"
              value={currentData?.gnss?.satellites || '0'}
              unit="count"
              status={currentData?.gnss?.satellites < 4 ? 'warning' : 'good'}
            />
          </div>

          {/* GNSS and sensor details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">GNSS & Sensors</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Position</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Latitude:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.gnss?.latitude.toFixed(4) || '28.7041'}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Longitude:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.gnss?.longitude.toFixed(4) || '77.1025'}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">GNSS Alt:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.gnss?.altitude.toFixed(1) || '0.0'} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Satellites:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.gnss?.satellites || '0'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Acceleration</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">X-Axis:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.acceleration.x.toFixed(2) || '0.00'} m/s²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Y-Axis:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.acceleration.y.toFixed(2) || '0.00'} m/s²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Z-Axis:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {currentData?.acceleration.z.toFixed(2) || '-9.80'} m/s²
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location visualization */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Location Map</h3>
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 h-36 flex items-center justify-center border-2 border-blue-200">
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 to-blue-100/30 rounded-xl"></div>
              <div className="relative z-10 text-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mx-auto animate-pulse mb-3 shadow-lg"></div>
                <div className="text-xs text-gray-600 font-semibold">Current Position</div>
                <div className="text-xs font-mono font-bold text-gray-900 mt-2 bg-white/80 px-2 py-1 rounded">
                  {currentData?.gnss?.latitude.toFixed(3) || '28.704'}, {currentData?.gnss?.longitude.toFixed(3) || '77.103'}
                </div>
                <div className="text-xs text-gray-600 font-medium mt-1">
                  Alt: {currentData?.gnss?.altitude.toFixed(0) || '0'} m
                </div>
              </div>
              
              {/* Grid overlay for map appearance */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-6 grid-rows-4 h-full w-full">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border border-gray-400"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center column - Charts */}
        <div className="col-span-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <TelemetryChart
              data={state.telemetry.history}
              dataKey="altitude"
              title="Altitude"
              color="#3B82F6"
              unit="m"
            />
            <TelemetryChart
              data={state.telemetry.history}
              dataKey="temperature"
              title="Temperature"
              color="#EF4444"
              unit="°C"
            />
            <TelemetryChart
              data={state.telemetry.history}
              dataKey="voltage"
              title="Battery Voltage"
              color="#F59E0B"
              unit="V"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4 flex-1">
            <TelemetryChart
              data={state.telemetry.history}
              dataKey="pressure"
              title="Atmospheric Pressure"
              color="#10B981"
              unit="Pa"
            />
            <TelemetryChart
              data={state.telemetry.history.map(d => ({ ...d, gnssAlt: d.gnss.altitude }))}
              dataKey="gnssAlt"
              title="GNSS Altitude"
              color="#8B5CF6"
              unit="m"
            />
            <AccelerationChart data={state.telemetry.history} />
          </div>
        </div>

        {/* Right column - Mission control */}
        <div className="col-span-3 flex flex-col">
          <MissionControlPanel />
        </div>
      </div>

      {/* Footer status bar */}
      <div className="bg-white border-t border-gray-200 shadow-sm p-4 m-4 mt-2 rounded-xl">
        <div className="flex justify-between items-center text-sm">
          <div className="flex space-x-8">
            <div>
              <span className="text-gray-600 font-medium">Packets: </span>
              <span className="text-gray-900 font-mono font-bold">{state.mission.packetCount}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Signal: </span>
              <span className="text-green-600 font-bold">{state.system.signalStrength}%</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Range: </span>
              <span className="text-gray-900 font-bold">{state.system.range} km</span>
            </div>
          </div>
          
          <div className="flex space-x-6">
            <StatusIndicator status="good" label="Navigation" />
            <StatusIndicator status="good" label="Communication" />
            <StatusIndicator status="good" label="Power" />
            <StatusIndicator status="good" label="Payload" />
          </div>
          
          <div className="text-gray-600 font-medium">
            {new Date().toLocaleTimeString()} IST
          </div>
        </div>
      </div>
    </div>
  );
};

// Telemetry Provider with simulation logic
const TelemetryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(telemetryReducer, initialState);

  // Main simulation effect
  useEffect(() => {
    if (!state.mission.isActive) return;

    const interval = setInterval(() => {
      const newMissionTime = state.mission.missionTime + 1;
      const newFlightPhase = getFlightPhase(newMissionTime);
      const newPacketCount = state.mission.packetCount + 1;

      // Update mission timing
      dispatch({
        type: ActionTypes.UPDATE_MISSION_TIME,
        payload: {
          missionTime: newMissionTime,
          flightPhase: newFlightPhase,
          packetCount: newPacketCount
        }
      });

      // Generate and update telemetry data
      const telemetryData = generateTelemetryData(newMissionTime, newFlightPhase);
      dispatch({
        type: ActionTypes.UPDATE_TELEMETRY,
        payload: telemetryData
      });

      // Update system status
      dispatch({
        type: ActionTypes.UPDATE_SYSTEM_STATUS,
        payload: {
          signalStrength: Math.max(85, 95 + Math.sin(newMissionTime / 10) * 10),
          range: 2.4 + (telemetryData.altitude / 1000) * 1.5
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.mission.isActive, state.mission.missionTime, state.mission.packetCount]);

  return (
    <TelemetryContext.Provider value={{ state, dispatch }}>
      {children}
    </TelemetryContext.Provider>
  );
};

// Main App component
const App = () => {
  return (
    <TelemetryProvider>
      <Dashboard />
    </TelemetryProvider>
  );
};

export default App;