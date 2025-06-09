# RULE TYPE: Always
# FILE PATTERNS: **/core/**/*.py, **/lib/**/core/**/*.py, **/memory/**/*.py

## Enhanced Symbolic Trace Memory with DGM Integration

### Core Principles
- **Δ-Compression**: Use symbolic compression for trace storage efficiency
- **Performance Delta Logging**: Track all fitness improvements/degradations
- **Multi-Type Traces**: Support various trace types (symbolic ops, performance, benchmarks)
- **Persistent Storage**: Use SQLite for critical trace persistence
- **Compression Statistics**: Track compression ratios and storage efficiency

### Required Components

#### 1. Trace Types Enum
```python
class TraceType(Enum):
    SYMBOLIC_OPERATION = "symbolic_op"
    PERFORMANCE_DELTA = "perf_delta"
    FITNESS_EVOLUTION = "fitness_evo"
    BENCHMARK_RESULT = "benchmark"
    MUTATION_PATTERN = "mutation"
    COLLAPSE_EVENT = "collapse"
    BREAKTHROUGH = "breakthrough"
    META_EVOLUTION = "meta_evo"
```

#### 2. Performance Delta Tracking
```python
@dataclass
class PerformanceDelta:
    """Performance change measurement for DGM evolution tracking"""
    metric_name: str
    old_value: float
    new_value: float
    delta_magnitude: float
    delta_direction: str  # "improvement", "degradation", "neutral"
    confidence: float
    context: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    
    @property
    def improvement_ratio(self) -> float:
        """Calculate improvement as a ratio"""
        if self.old_value == 0:
            return float('inf') if self.new_value > 0 else 0.0
        return self.new_value / self.old_value

@dataclass
class CompressedTrace:
    """Compressed symbolic trace with metadata"""
    trace_id: str
    trace_type: TraceType
    compressed_data: bytes
    compression_ratio: float
    original_size: int
    metadata: Dict[str, Any]
    timestamp: float
    retention_priority: float = 1.0  # Higher = keep longer
```

#### 3. Enhanced Symbolic Memory Base Class
```python
class SymbolicTraceMemory:
    """Enhanced Symbolic Trace Memory with DGM Performance Tracking"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Storage configuration
        self.max_memory_traces = self.config.get("max_memory_traces", 10000)
        self.compression_threshold = self.config.get("compression_threshold", 1024)
        self.retention_days = self.config.get("retention_days", 30)
        
        # Performance tracking
        self.performance_history: Dict[str, List[PerformanceDelta]] = {}
        self.fitness_evolution: List[Dict[str, Any]] = []
        self.benchmark_archive: Dict[str, Any] = {}
        
        # In-memory storage
        self.memory_traces: Dict[str, CompressedTrace] = {}
        self.trace_index: Dict[TraceType, List[str]] = {t: [] for t in TraceType}
        
        # Persistent storage
        self.db_path = Path(self.config.get("db_path", "./data/symbolic_traces.db"))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
        
        # Compression statistics
        self.compression_stats = {
            "total_compressions": 0,
            "total_original_size": 0,
            "total_compressed_size": 0,
            "avg_compression_ratio": 0.0
        }
```

### Required Methods

#### 1. Core Trace Storage with Compression
```python
async def store_compressed_trace(self, trace_id: str, data: Any, 
                               trace_type: TraceType = TraceType.SYMBOLIC_OPERATION,
                               metadata: Optional[Dict[str, Any]] = None) -> CompressedTrace:
    """Store data with symbolic compression - MUST implement"""
    
    # Serialize data
    if isinstance(data, dict):
        serialized = json.dumps(data, separators=(',', ':'))
    elif isinstance(data, str):
        serialized = data
    else:
        serialized = str(data)
    
    original_data = serialized.encode('utf-8')
    original_size = len(original_data)
    
    # Apply compression if size exceeds threshold
    if original_size > self.compression_threshold:
        compressed_data = zlib.compress(original_data, level=9)
        compression_ratio = len(compressed_data) / original_size
    else:
        compressed_data = original_data
        compression_ratio = 1.0
    
    # Create compressed trace
    trace = CompressedTrace(
        trace_id=trace_id,
        trace_type=trace_type,
        compressed_data=compressed_data,
        compression_ratio=compression_ratio,
        original_size=original_size,
        metadata=metadata or {},
        timestamp=time.time()
    )
    
    # Store in memory and update indices
    self.memory_traces[trace_id] = trace
    self.trace_index[trace_type].append(trace_id)
    
    # Update compression statistics
    self._update_compression_stats(original_size, len(compressed_data), compression_ratio)
    
    # Persist critical traces immediately
    if trace.retention_priority > 0.8:
        await self._persist_trace(trace)
    
    return trace
```

#### 2. Performance Delta Logging (DGM Core Feature)
```python
async def log_performance_delta(self, metric_name: str, old_value: float, 
                              new_value: float, context: Optional[Dict[str, Any]] = None,
                              confidence: float = 1.0) -> PerformanceDelta:
    """Log performance change for DGM evolution tracking - MUST implement"""
    
    delta_magnitude = abs(new_value - old_value)
    
    # Determine direction
    if new_value > old_value:
        delta_direction = "improvement"
    elif new_value < old_value:
        delta_direction = "degradation"
    else:
        delta_direction = "neutral"
    
    # Create performance delta
    perf_delta = PerformanceDelta(
        metric_name=metric_name,
        old_value=old_value,
        new_value=new_value,
        delta_magnitude=delta_magnitude,
        delta_direction=delta_direction,
        confidence=confidence,
        context=context or {}
    )
    
    # Store in memory
    if metric_name not in self.performance_history:
        self.performance_history[metric_name] = []
    self.performance_history[metric_name].append(perf_delta)
    
    # Persist to database
    await self._persist_performance_delta(perf_delta)
    
    # Create compressed trace for the delta
    await self.store_compressed_trace(
        f"perf_delta_{metric_name}_{perf_delta.timestamp}",
        {
            "metric": metric_name,
            "old_value": old_value,
            "new_value": new_value,
            "delta_magnitude": delta_magnitude,
            "direction": delta_direction,
            "improvement_ratio": perf_delta.improvement_ratio,
            "confidence": confidence,
            "context": context
        },
        TraceType.PERFORMANCE_DELTA,
        {"metric_name": metric_name, "priority": "high"}
    )
    
    return perf_delta
```

#### 3. Specialized DGM Logging Methods
```python
async def log_fitness_evolution(self, generation: int, fitness_data: Dict[str, Any]):
    """Log fitness evolution data for DGM tracking"""
    evolution_entry = {
        "generation": generation,
        "timestamp": time.time(),
        **fitness_data
    }
    
    self.fitness_evolution.append(evolution_entry)
    
    await self.store_compressed_trace(
        f"fitness_evo_gen_{generation}",
        evolution_entry,
        TraceType.FITNESS_EVOLUTION,
        {"generation": generation, "priority": "high"}
    )

async def log_benchmark_result(self, benchmark_id: str, result_data: Dict[str, Any]):
    """Log benchmark results with compression"""
    self.benchmark_archive[benchmark_id] = {
        "timestamp": time.time(),
        **result_data
    }
    
    await self.store_compressed_trace(
        f"benchmark_{benchmark_id}",
        result_data,
        TraceType.BENCHMARK_RESULT,
        {"benchmark_id": benchmark_id, "priority": "medium"}
    )

async def log_breakthrough(self, breakthrough_id: str, breakthrough_data: Dict[str, Any]):
    """Log breakthrough events with highest priority"""
    await self.store_compressed_trace(
        f"breakthrough_{breakthrough_id}",
        {
            "event_type": "breakthrough",
            "timestamp": time.time(),
            **breakthrough_data
        },
        TraceType.BREAKTHROUGH,
        {"breakthrough_id": breakthrough_id, "priority": "critical"}
    )
```

### Database Schema Requirements

#### 1. Traces Table
```sql
CREATE TABLE IF NOT EXISTS traces (
    trace_id TEXT PRIMARY KEY,
    trace_type TEXT NOT NULL,
    compressed_data BLOB NOT NULL,
    compression_ratio REAL NOT NULL,
    original_size INTEGER NOT NULL,
    metadata TEXT NOT NULL,
    timestamp REAL NOT NULL,
    retention_priority REAL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_traces_type_time 
ON traces(trace_type, timestamp);
```

#### 2. Performance Deltas Table
```sql
CREATE TABLE IF NOT EXISTS performance_deltas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    old_value REAL NOT NULL,
    new_value REAL NOT NULL,
    delta_magnitude REAL NOT NULL,
    delta_direction TEXT NOT NULL,
    confidence REAL NOT NULL,
    context TEXT NOT NULL,
    timestamp REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_metric_time 
ON performance_deltas(metric_name, timestamp);
```

### Integration Requirements

1. **DGM Bridge Agent Integration**: Must be used by all DGM Bridge Agents for performance tracking
2. **Compression Efficiency**: Target 70%+ compression ratios for trace storage
3. **Performance Monitoring**: Track all fitness improvements/degradations with context
4. **Retention Management**: Implement priority-based retention for critical traces

### Examples

✅ **Good**: Proper DGM Symbolic Memory Usage
```python
# DGM Bridge Agent using symbolic memory correctly
class MyDGMAgent(DGMBridgeAgent):
    async def evaluate_variant_fitness(self, variant):
        old_fitness = variant.survival_score
        new_fitness = await self._calculate_fitness(variant)
        
        # Log performance delta
        await self.symbolic_memory.log_performance_delta(
            "variant_fitness",
            old_fitness,
            new_fitness,
            context={
                "variant_id": variant.variant_id,
                "generation": self.generation_counter,
                "benchmark_results": len(variant.benchmark_results)
            }
        )
        
        return new_fitness
```

❌ **Bad**: Missing performance tracking
```python
class BadAgent(BaseAgent):
    def update_fitness(self, old_val, new_val):
        # No symbolic memory, no delta tracking
        self.fitness = new_val
```

### Configuration Requirements

#### 1. Memory Configuration
```python
config = {
    "max_memory_traces": 10000,
    "compression_threshold": 1024,
    "retention_days": 30,
    "db_path": "./data/symbolic_traces.db"
}
```

#### 2. Compression Targets
- Target compression ratio: 0.3 (70% compression)
- Memory usage threshold: 90% before persistence
- Critical trace immediate persistence: retention_priority > 0.8

### Validation Checklist
- [ ] Implements all required TraceType enum values
- [ ] Has performance delta logging functionality
- [ ] Uses SQLite for persistent storage
- [ ] Tracks compression statistics
- [ ] Implements priority-based retention
- [ ] Has proper database schema with indices
- [ ] Logs fitness evolution for DGM agents
- [ ] Supports benchmark result archival
- [ ] Implements breakthrough event logging 