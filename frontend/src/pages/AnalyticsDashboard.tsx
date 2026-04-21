import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
// @ts-ignore
import { getAnalyticsData } from '../interview_module/api/interviewService';

// Icons
const IconCalendar = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
  </svg>
);
const IconStar = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);
const IconActivity = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3h2v18H3V3zm6 8h2v10H9V11zm6-4h2v14h-2V7zm6 5h2v9h-2v-9z"/>
  </svg>
);
const IconTrendingUp = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconFilter = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// Custom Dropdown for filters
const CustomSelect = ({ value, options, onChange, activeColor }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectedLabel = options.find((o: any) => o.value === value)?.label || 'Select...';

  return (
    <div style={{ position: 'relative', zIndex: 100 }} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0b0e14',
          border: `1px solid ${isOpen ? activeColor : 'rgba(255,255,255,0.1)'}`,
          color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 12,
          padding: '10px 18px', cursor: 'pointer', whiteSpace: 'nowrap'
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ color: '#7586a1', display: 'flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <IconChevronDown />
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, minWidth: '100%',
          background: '#111622', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden', zIndex: 9999
        }}>
          {options.map((opt: any) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                color: value === opt.value ? '#fff' : '#aaa',
                background: value === opt.value ? `${activeColor}20` : 'transparent',
                borderLeft: `2px solid ${value === opt.value ? activeColor : 'transparent'}`,
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom bar chart cursor
const CustomBarCursor = (props: any) => {
  const { x, y, width, height } = props;
  const barWidth = width * 0.4;
  const barX = x + (width * 0.3); 

  return (
    <rect 
      x={barX} 
      y={y} 
      width={barWidth} 
      height={height} 
      fill="rgba(255,255,255,0.05)" 
      rx={8} 
    />
  );
};


const GlowTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const role = payload[0]?.payload?.role;
  return (
    <div style={{
      background: 'rgba(11,14,20,0.97)', border: '1px solid rgba(255,255,255,0.12)',
      padding: '16px 20px', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
    }}>
      <p style={{ color: '#7586a1', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px 0' }}>{label}</p>
      {role && <p style={{ color: '#aab', fontSize: 12, margin: '0 0 12px 0', fontStyle: 'italic' }}>{role}</p>}
      {payload.map((e: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, boxShadow: `0 0 8px ${e.color}` }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{e.name}:</span>
          <span style={{ color: e.color, fontSize: 24, fontWeight: 900, fontFamily: 'monospace' }}>{Number(e.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

// KPI card
const KPICard = ({ title, value, color, icon }: any) => (
  <div
    style={{
      background: '#111622', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 18, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
      position: 'relative', overflow: 'hidden', transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.borderColor = `${color}40`;
      e.currentTarget.style.boxShadow = `0 12px 30px ${color}15`;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ position: 'absolute', bottom: -30, right: -30, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.05, pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: -10, right: -10, width: 40, height: 40, borderRadius: '50%', background: color, opacity: 0.1, pointerEvents: 'none' }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: '#7586a1', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>{title}</p>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    </div>
    <h4 style={{ fontSize: 32, fontWeight: 900, color, margin: 0, fontFamily: 'monospace', position: 'relative', zIndex: 1 }}>{value}</h4>
  </div>
);

// Chart Container
const ChartSection = ({ title, dotColor, controls, height = 400, children }: any) => (
  <div className="bg-[#111622]/80 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 shadow-2xl mt-8">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
        <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}` }} />
        {title}
      </h3>
      {controls}
    </div>
    <div style={{ height, width: '100%' }}>
      {children}
    </div>
  </div>
);

// toggle btns
const ToggleGroup = ({ options, active, onSelect }: any) => (
  <div style={{ display: 'flex', background: '#0b0e14', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
    {options.map(({ id, label, color1 }: any) => (
      <button
        key={id}
        onClick={() => onSelect(id)}
        style={{
          padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700,
          background: active === id ? '#111622' : 'transparent',
          color: active === id ? color1 : '#7586a1',
          transition: 'all 0.2s'
        }}
      >
        {label}
      </button>
    ))}
  </div>
);

// Metrics configurations
const trajectoryMetricConfig: Record<string, { label: string; color1: string; color2: string }> = {
  overallScore: { label: 'Overall',       color1: '#00f2fe', color2: '#7b4fff' },
  techScore:    { label: 'Technical',     color1: '#7b4fff', color2: '#d422eb' },
  commScore:    { label: 'Communication', color1: '#d422eb', color2: '#ff6b6b' },
};

const roleMetricConfig: Record<string, { label: string; color1: string; color2: string }> = {
  overallScore: { label: 'Overall',     color1: '#00f2fe', color2: '#7b4fff' },
  techScore:    { label: 'Technical',   color1: '#7b4fff', color2: '#d422eb' },
  commScore:    { label: 'Behavioural', color1: '#d422eb', color2: '#ff6b6b' },
};

// Behavioral line graph
const BEHAVIORAL_LINES = [
  { dataKey: 'confidence',  name: 'Confidence',   color: '#00f2fe' },
  { dataKey: 'nervousness', name: 'Nervousness',  color: '#ff0844' },
  { dataKey: 'engagement',  name: 'Engagement',   color: '#d422eb' },
];

// Interactive radar chart
const InteractiveRadar = ({ title, traits, color }: {
  title: string;
  traits: { label: string; val: number }[];
  color: string;
}) => {
  const [activeTrait, setActiveTrait] = useState<number | null>(null);
  const n = traits.length;
  const size = 340, center = size / 2, radius = 110;

  const getCoords = (val: number, i: number, radScale = 1) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: center + (val / 10) * radius * radScale * Math.cos(angle),
      y: center + (val / 10) * radius * radScale * Math.sin(angle),
    };
  };
  const axisEnd = (i: number) => getCoords(10, i);
  const labelPos = (i: number) => getCoords(13.5, i);
  const points = traits.map((d, i) => `${getCoords(d.val, i).x},${getCoords(d.val, i).y}`).join(' ');

  return (
    <div style={{
      background: '#111622', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 24, padding: '28px 20px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          boxShadow: `0 0 8px ${color}`, display: 'inline-block',
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        <h3 style={{ color: '#a0aab2', fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>{title}</h3>
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={`rg-${title.replace(/\s/g,'')}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0}    />
          </radialGradient>
        </defs>

        {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
          <polygon
            key={scale}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            points={traits.map((_, i) => `${getCoords(10, i, scale).x},${getCoords(10, i, scale).y}`).join(' ')}
          />
        ))}

        {traits.map((_, i) => (
          <line key={i} x1={center} y1={center} x2={axisEnd(i).x} y2={axisEnd(i).y}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        ))}

        <polygon
          points={points}
          fill={`url(#rg-${title.replace(/\s/g,'')})`}
          stroke={color}
          strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 8px ${color}70)` }}
        />

        {traits.map((d, i) => {
          const pt   = getCoords(d.val, i);
          const lp   = labelPos(i);
          const active = activeTrait === i;
          return (
            <g key={i}
              onMouseEnter={() => setActiveTrait(i)}
              onMouseLeave={() => setActiveTrait(null)}
              style={{ cursor: 'crosshair' }}
            >
              <circle cx={pt.x} cy={pt.y} r={22} fill="transparent" />
              <circle
                cx={pt.x} cy={pt.y} r={active ? 8 : 5}
                fill="#fff"
                style={{
                  filter: `drop-shadow(0 0 6px ${color})`,
                  transition: 'r 0.15s',
                }}
              />
              <text
                x={lp.x} y={lp.y}
                fill={active ? '#fff' : '#a0aab2'}
                fontSize={10}
                fontWeight={800}
                letterSpacing={1.5}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ transition: 'fill 0.15s' }}
              >
                {d.label}
              </text>
              {active && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={pt.x - 24} y={pt.y - 36}
                    width={48} height={24}
                    rx={7}
                    fill="#0b0e14"
                    stroke={color}
                    strokeWidth={1.5}
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                  />
                  <text
                    x={pt.x} y={pt.y - 23}
                    fill="#fff"
                    fontSize={13}
                    fontWeight={900}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="monospace"
                  >
                    {d.val.toFixed(1)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {traits.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setActiveTrait(i)}
            onMouseLeave={() => setActiveTrait(null)}
            style={{
              padding: '5px 12px', borderRadius: 20, cursor: 'default',
              background: activeTrait === i ? `${color}25` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeTrait === i ? color : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 800, color: '#7586a1', letterSpacing: 1, textTransform: 'uppercase' }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color, fontFamily: 'monospace' }}>{d.val.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Strengths & Weaknesses Panel
const StrengthsWeaknessesPanel = ({ allMetrics }: { allMetrics: { name: string; value: number; category: string }[] }) => {
  const sorted    = [...allMetrics].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 3);
  const weaknesses= sorted.slice(-3).reverse();

  const MetricRow = ({ item, isStrength }: { item: typeof strengths[0]; isStrength: boolean }) => {
    const color = isStrength ? '#00f2fe' : '#ff0844';

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${isStrength ? 'rgba(0,242,254,0.1)' : 'rgba(255,8,68,0.1)'}`,
        borderRadius: 16, padding: '16px 20px',
        transition: 'transform 0.2s, background 0.2s',
        cursor: 'default',
      }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.background = isStrength ? 'rgba(0,242,254,0.05)' : 'rgba(255,8,68,0.05)';
        }}
        onMouseOut={e  => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color, fontSize: 16, fontWeight: 900, fontFamily: 'monospace',
          boxShadow: `0 0 10px ${color}30`
        }}>
          {item.value.toFixed(1)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{item.name}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7586a1', textTransform: 'uppercase', letterSpacing: 1 }}>{item.category}</div>
        </div>
        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${(item.value / 10) * 100}%`, height: '100%', borderRadius: 3,
            background: color, boxShadow: `0 0 8px ${color}80`
          }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
      marginTop: 32,
    }}>
      <div style={{
        background: 'rgba(17,22,34,0.8)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00f2fe', boxShadow: '0 0 10px #00f2fe', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>EXCELLING AT</h3>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#00f2fe',
            background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.2)',
            borderRadius: 8, padding: '4px 10px', letterSpacing: 1
          }}>TOP 3</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {strengths.map((item, i) => <MetricRow key={i} item={item} isStrength={true} />)}
        </div>
      </div>

      <div style={{
        background: 'rgba(17,22,34,0.8)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff0844', boxShadow: '0 0 10px #ff0844', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>NEEDS WORK</h3>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#ff0844',
            background: 'rgba(255,8,68,0.1)', border: '1px solid rgba(255,8,68,0.2)',
            borderRadius: 8, padding: '4px 10px', letterSpacing: 1
          }}>BOTTOM 3</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {weaknesses.map((item, i) => <MetricRow key={i} item={item} isStrength={false} />)}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard
const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [role, setRole] = useState('all');
  const [primaryMetric, setPrimaryMetric] = useState('overallScore');
  const [roleMetric, setRoleMetric]       = useState('overallScore');
  const [dynamicRoles, setDynamicRoles] = useState<string[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await getAnalyticsData(timeframe, role);
        if (res && res.data) {
          setData(res.data);
          if (role === 'all') {
            const unique = Array.from(new Set(res.data.map((d: any) => d.role).filter(Boolean))) as string[];
            setDynamicRoles(unique);
          }
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Analytics fetch error:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeframe, role]);

  const avg = (key: string) => {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((s, d) => s + (Number(d[key]) || 0), 0);
    return sum / data.length;
  };

  const techRadarTraits = [
    { label: 'RELEVANCE',  val: avg('relevance')    },
    { label: 'JOB FIT',   val: avg('jobAlignment')  },
    { label: 'STRUCTURE',  val: avg('structure')     },
    { label: 'JARGON',     val: avg('jargon')        },
    { label: 'LOGIC',      val: avg('logic')         },
  ];
  const personalityTraits = [
    { label: 'OPENNESS',   val: avg('openness')          },
    { label: 'CONSCIENT.', val: avg('conscientiousness')  },
    { label: 'EXTRAVERS.', val: avg('extraversion')       },
    { label: 'AGREEABLE',  val: avg('agreeableness')      },
    { label: 'NEURO.',     val: avg('neuroticism')        },
  ];
  const speechTraits = [
    { label: 'FLUENCY',   val: avg('fluency')      },
    { label: 'PACING',    val: avg('pacing')        },
    { label: 'TONE',      val: avg('tone')          },
    { label: 'PAUSES',    val: avg('pauseControl')  },
    { label: 'FILLERS',   val: avg('fillerWords')   },
  ];

  const allMetricsPool = [
    { name: 'Relevance',        value: avg('relevance'),         category: 'Technical'    },
    { name: 'Job Alignment',    value: avg('jobAlignment'),      category: 'Technical'    },
    { name: 'Structure',        value: avg('structure'),         category: 'Technical'    },
    { name: 'Jargon',           value: avg('jargon'),            category: 'Technical'    },
    { name: 'Logic',            value: avg('logic'),             category: 'Technical'    },
    { name: 'Openness',         value: avg('openness'),          category: 'Personality'  },
    { name: 'Conscientious.',   value: avg('conscientiousness'), category: 'Personality'  },
    { name: 'Extraversion',     value: avg('extraversion'),      category: 'Personality'  },
    { name: 'Agreeableness',    value: avg('agreeableness'),     category: 'Personality'  },
    { name: 'Neuroticism',      value: avg('neuroticism'),       category: 'Personality'  },
    { name: 'Fluency',          value: avg('fluency'),           category: 'Speech'       },
    { name: 'Pacing',           value: avg('pacing'),            category: 'Speech'       },
    { name: 'Tone',             value: avg('tone'),              category: 'Speech'       },
    { name: 'Pause Control',    value: avg('pauseControl'),      category: 'Speech'       },
    { name: 'Filler Words',     value: avg('fillerWords'),       category: 'Speech'       },
    { name: 'Confidence',       value: avg('confidence'),        category: 'Behavioral'   },
    { name: 'Engagement',       value: avg('engagement'),        category: 'Behavioral'   },
  ];

  const totalInterviews = data.length;
  const peakScore       = totalInterviews > 0 ? Math.max(...data.map(d => Number(d.overallScore) || 0)) : 0;
  const last3           = data.slice(-3);
  const movingAvg       = last3.length > 0 ? last3.reduce((a, b) => a + (Number(b.overallScore) || 0), 0) / last3.length : 0;
  const firstScore      = data.length > 0 ? (Number(data[0].overallScore) || 0) : 0;
  const improvement     = peakScore - firstScore;

  const roleAverages = Object.entries(
    data.reduce((acc: any, curr) => {
      const key = curr.role || 'Unspecified';
      if (!acc[key]) acc[key] = { sum: 0, count: 0 };
      const val = Number(curr[roleMetric]);
      acc[key].sum   += isNaN(val) ? (Number(curr.overallScore) || 0) : val;
      acc[key].count += 1;
      return acc;
    }, {})
  ).map(([roleName, stats]: any) => ({
    name:  String(roleName).replace(' Developer', ' Dev').replace(' Engineer', ' Eng'),
    score: stats.count > 0 ? stats.sum / stats.count : 0,
  }));

  const roleOptions = [
    { value: 'all', label: 'All Job Roles' },
    ...dynamicRoles.map(r => ({ value: r, label: r }))
  ];

  const tmc = trajectoryMetricConfig[primaryMetric];
  const rmc = roleMetricConfig[roleMetric];

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white pt-28 pb-10 px-6 font-sans relative">

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#00f2fe]/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#d422eb]/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-[#111622]/40 backdrop-blur-sm p-8 rounded-[2rem] border border-white/5 relative z-[200]">
          
          <div>
            <h1
              className="text-4xl md:text-6xl font-black mb-3"
              style={{
                lineHeight: '1.2', paddingBottom: '0.1em',
                background: 'linear-gradient(90deg, #00f2fe 0%, #d422eb 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}
            >
              Performance Analytics
            </h1>
            <p className="text-[#7586a1] text-lg font-bold tracking-wide">
              Comprehensive multimodal metrics and growth monitoring.
            </p>
          </div>

          <div className="flex flex-col items-end gap-6 w-full lg:w-auto relative z-[200]">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 rounded-xl bg-[#ff0844]/20 text-[#ff0844] border border-[#ff0844]/40 font-bold tracking-widest text-sm hover:bg-[#ff0844]/40 hover:text-white hover:border-[#ff0844]/60 transition-all uppercase"
            >
              Exit
            </button>

            <div className="flex flex-wrap gap-4 justify-end items-center">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-[#7586a1] font-bold text-sm">
                <IconFilter /> Global Filters
              </div>
              <CustomSelect
                value={timeframe}
                onChange={setTimeframe}
                activeColor="#00f2fe"
                options={[
                  { value: 'all', label: 'All Time History' },
                  { value: '30', label: 'Last 30 Days' },
                  { value: '7', label: 'Last 7 Days' },
                ]}
              />
              <CustomSelect
                value={role}
                onChange={setRole}
                activeColor="#d422eb"
                options={roleOptions}
              />
            </div>
          </div>
        </div>

        {/*KPI Cards*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="Total Sessions"    value={totalInterviews.toString()}     color="#00f2fe" icon={<IconCalendar />} />
          <KPICard title="Peak Score"        value={peakScore.toFixed(1)}           color="#a07ae0" icon={<IconStar />} />
          <KPICard title="Momentum"          value={movingAvg.toFixed(1)}           color="#d422eb" icon={<IconActivity />} />
          <KPICard title="Total Improvement" value={`+${improvement.toFixed(1)}`}  color="#29d4d4" icon={<IconTrendingUp />} />
        </div>

        {/*Growth Graph*/}
        <ChartSection
          title="GROWTH GRAPH"
          dotColor={tmc.color1}
          height={400}
          controls={
            <ToggleGroup
              options={Object.entries(trajectoryMetricConfig).map(([id, cfg]) => ({ id, label: cfg.label, color1: cfg.color1 }))}
              active={primaryMetric}
              onSelect={setPrimaryMetric}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trajAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={tmc.color1} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tmc.color2} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date"    stroke="#7586a1" tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} dy={10} />
              <YAxis domain={[0, 10]} stroke="#7586a1" tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 'bold' }} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip content={<GlowTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
              <Area
                type="monotone"
                name={`${tmc.label} Score`}
                dataKey={primaryMetric}
                stroke={tmc.color1}
                strokeWidth={4}
                fill="url(#trajAreaFill)"
                activeDot={{ r: 8, stroke: '#111622', strokeWidth: 3, fill: tmc.color1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        {/*Role Comparison bar chart*/}
        <ChartSection
          title="ROLE COMPARISON"
          dotColor={rmc.color1}
          height={340}
          controls={
            <ToggleGroup
              options={Object.entries(roleMetricConfig).map(([id, cfg]) => ({ id, label: cfg.label, color1: cfg.color1 }))}
              active={roleMetric}
              onSelect={setRoleMetric}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roleAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="30%">
              <defs>
                {roleAverages.map((_, idx) => (
                  <linearGradient key={idx} id={`barGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={rmc.color1} stopOpacity={1}   />
                    <stop offset="100%" stopColor={rmc.color2} stopOpacity={0.65} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#7586a1"
                tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 700 }}
                tickLine={false} axisLine={false} dy={10}
              />
              <YAxis
                domain={[0, 10]}
                stroke="#7586a1"
                tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 700 }}
                tickLine={false} axisLine={false} dx={-10}
              />
              <Tooltip content={<GlowTooltip />} cursor={<CustomBarCursor />} />
              <Bar dataKey="score" name={`Avg ${rmc.label} Score`} radius={[8, 8, 0, 0]} activeBar={{ fillOpacity: 0.7, stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1 }}>
                {roleAverages.map((_, idx) => (
                  <Cell key={idx} fill={`url(#barGrad-${idx})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        {/*Behavioral Signals line chart*/}
        <ChartSection
          title="BEHAVIORAL SIGNALS"
          dotColor="#00f2fe"
          height={340}
          controls={
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {BEHAVIORAL_LINES.map(bl => (
                <div key={bl.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: bl.color, boxShadow: `0 0 8px ${bl.color}80` }} />
                  <span style={{ color: '#7586a1', fontSize: 12, fontWeight: 700 }}>{bl.name}</span>
                </div>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#7586a1" tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} dy={10} />
              <YAxis domain={[0, 10]} stroke="#7586a1" tick={{ fill: '#7586a1', fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip content={<GlowTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
              {BEHAVIORAL_LINES.map(bl => (
                <Line key={bl.dataKey} type="monotone" dataKey={bl.dataKey} name={bl.name}
                  stroke={bl.color} strokeWidth={3} dot={false}
                  activeDot={{ r: 7, stroke: '#111622', strokeWidth: 2, fill: bl.color }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>

        {/*Performance Metrics*/}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a07ae0', boxShadow: '0 0 10px #a07ae0', display: 'inline-block' }} />
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 3, margin: 0 }}>METRICS DEEP DIVE</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <InteractiveRadar title="Tech Competencies"  traits={techRadarTraits}   color="#00f2fe" />
            <InteractiveRadar title="Personality Traits" traits={personalityTraits} color="#a07ae0" />
            <InteractiveRadar title="Speech Dynamics"    traits={speechTraits}      color="#d422eb" />
          </div>
        </div>

        {/*Strengths & Weaknesses Panel*/}
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#29d4d4', boxShadow: '0 0 10px #29d4d4', display: 'inline-block' }} />
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 3, margin: 0 }}>PERFORMANCE SPECTRUM</h3>
          </div>
          <StrengthsWeaknessesPanel allMetrics={allMetricsPool} />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.85); }
          }
        `}</style>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;