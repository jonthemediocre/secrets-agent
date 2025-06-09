# RULE TYPE: Always
# FILE PATTERNS: **/agents/**/*.py, **/lib/**/agents/**/*.py

## DGM Bridge Agent Pattern - Darwin Gödel Machine Integration

### Core Principles
- **Empirical Optimization**: Replace formal proofs with benchmark-driven fitness evaluation
- **Benchmark Integration**: Support SWE-bench, Polyglot, and framework-internal benchmarks
- **Performance Delta Tracking**: Log all fitness improvements/degradations with context
- **Variant Archival**: Preserve successful agent variants for evolution lineage
- **State Lifecycle Compliance**: Follow Rule 915 agent state management patterns

### Required Components

#### 1. Benchmark Types Enum
```python
class BenchmarkType(Enum):
    SWE_BENCH = "swe_bench"
    POLYGLOT = "polyglot"
    VANTA_INTERNAL = "vanta_internal"  # or framework_internal
    CODE_GENERATION = "code_gen"
    REASONING = "reasoning"
```

#### 2. Performance Tracking Dataclasses
```python
@dataclass
class BenchmarkResult:
    benchmark_type: BenchmarkType
    score: float
    max_score: float
    execution_time: float
    memory_usage: int
    error_count: int
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    
    @property
    def fitness_score(self) -> float:
        """Normalized fitness score (0.0 to 1.0) with penalties"""
        base_score = self.score / self.max_score if self.max_score > 0 else 0.0
        time_penalty = min(0.1, self.execution_time / 300.0)
        error_penalty = min(0.2, self.error_count * 0.05)
        return max(0.0, base_score - time_penalty - error_penalty)

@dataclass
class AgentVariant:
    variant_id: str
    parent_id: Optional[str]
    mutation_type: str
    code_diff: str
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    benchmark_results: List[BenchmarkResult] = field(default_factory=list)
    survival_score: float = 0.0
    generation: int = 0
```

#### 3. DGM Bridge Agent Base Class
```python
class DGMBridgeAgent(UAPAgentBase):  # or your framework's base agent
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.role = "Fitness Evaluator"
        self.archetype = "DGM/Empirical"
        
        # Required components
        self.symbolic_memory = SymbolicTraceMemory()
        self.genesis_operator = GenesisOperator()  # or equivalent
        
        # Benchmark configuration
        self.benchmark_config = config.get("benchmarks", {
            "swe_bench": {"enabled": True, "weight": 0.4},
            "polyglot": {"enabled": True, "weight": 0.3},
            "framework_internal": {"enabled": True, "weight": 0.3}
        })
        
        # Evolution parameters
        self.max_variants_per_generation = config.get("max_variants", 10)
        self.survival_threshold = config.get("survival_threshold", 0.6)
        self.archive_path = Path(config.get("archive_path", "./data/dgm_archive"))
        
        # State tracking
        self.generation_counter = 0
        self.variant_archive: Dict[str, AgentVariant] = {}
        self.fitness_history: List[Dict[str, float]] = []
```

### Required Methods

#### 1. Fitness Evaluation (Core DGM Method)
```python
async def evaluate_variant_fitness(self, variant: AgentVariant) -> float:
    """Run comprehensive benchmark evaluation - MUST implement"""
    total_weighted_score = 0.0
    total_weight = 0.0
    
    for benchmark_name, config in self.benchmark_config.items():
        if not config.get("enabled", False):
            continue
            
        try:
            result = await self._run_benchmark(BenchmarkType(benchmark_name), variant)
            variant.benchmark_results.append(result)
            
            weight = config.get("weight", 1.0)
            total_weighted_score += result.fitness_score * weight
            total_weight += weight
            
        except Exception as e:
            self.logger.error(f"Benchmark {benchmark_name} failed: {e}")
            # Penalty for failed benchmarks
            total_weighted_score += 0.0 * config.get("weight", 1.0)
            total_weight += config.get("weight", 1.0)
    
    fitness = total_weighted_score / total_weight if total_weight > 0 else 0.0
    variant.survival_score = fitness
    
    # Update performance metrics
    variant.performance_metrics.update({
        "fitness_score": fitness,
        "generation": self.generation_counter,
        "evaluation_timestamp": time.time()
    })
    
    return fitness
```

#### 2. Evolution Cycle (Must Trigger CoE for Complex Actions)
```python
async def run_evolution_cycle(self) -> Dict[str, Any]:
    """Run complete DGM evolution cycle with CoE delegation"""
    cycle_start = time.time()
    self.generation_counter += 1
    
    # For complex/risky evolution actions, delegate to CoE
    if self.generation_counter % 10 == 0:  # Every 10th generation
        evolution_proposal = {
            "type": "dgm_meta_evolution",
            "context": {"generation": self.generation_counter, "fitness_history": self.fitness_history},
            "proposal": "meta_parameter_optimization",
            "requester_agent": self.__class__.__name__
        }
        # Trigger CoE review instead of direct action
        await self.message_bus.publish("coe_review_request", evolution_proposal)
        return {"status": "delegated_to_coe", "proposal_id": evolution_proposal}
    
    # Standard evolution cycle
    variants = await self._generate_variants()
    fitness_scores = []
    
    for variant in variants:
        fitness = await self.evaluate_variant_fitness(variant)
        fitness_scores.append(fitness)
        await self.archive_successful_variant(variant)
    
    # Generate statistics
    generation_stats = {
        "generation": self.generation_counter,
        "total_variants": len(variants),
        "avg_fitness": sum(fitness_scores) / len(fitness_scores) if fitness_scores else 0.0,
        "max_fitness": max(fitness_scores) if fitness_scores else 0.0,
        "survivors": len([f for f in fitness_scores if f >= self.survival_threshold]),
        "execution_time": time.time() - cycle_start,
        "timestamp": time.time()
    }
    
    self.fitness_history.append(generation_stats)
    return generation_stats
```

#### 3. Variant Archival with Symbolic Memory Integration
```python
async def archive_successful_variant(self, variant: AgentVariant):
    """Archive successful variants with symbolic compression"""
    if variant.survival_score >= self.survival_threshold:
        # Persist to file system
        archive_file = self.archive_path / f"variant_{variant.variant_id}.json"
        variant_data = {
            "variant_id": variant.variant_id,
            "parent_id": variant.parent_id,
            "mutation_type": variant.mutation_type,
            "code_diff": variant.code_diff,
            "performance_metrics": variant.performance_metrics,
            "benchmark_results": [
                {
                    "benchmark_type": r.benchmark_type.value,
                    "score": r.score,
                    "fitness_score": r.fitness_score,
                    "details": r.details,
                    "timestamp": r.timestamp
                }
                for r in variant.benchmark_results
            ],
            "survival_score": variant.survival_score,
            "generation": variant.generation
        }
        
        with open(archive_file, 'w') as f:
            json.dump(variant_data, f, indent=2)
        
        # Update symbolic memory
        await self.symbolic_memory.store_compressed_trace(
            f"dgm_variant_{variant.variant_id}",
            {
                "type": "dgm_successful_variant",
                "fitness": variant.survival_score,
                "generation": variant.generation,
                "mutations": variant.mutation_type,
                "benchmark_summary": {
                    r.benchmark_type.value: r.fitness_score 
                    for r in variant.benchmark_results
                }
            }
        )
```

### Integration Requirements

1. **Symbolic Memory Integration**: Must use enhanced SymbolicTraceMemory with performance delta logging
2. **State Management**: Follow Rule 915 agent state lifecycle patterns
3. **CoE Delegation**: Use Rule 1015 CoE delegation for complex evolution actions
4. **Task Schema**: Follow Rule 1018 task data schema for all agent communications

### Benchmark Implementation Requirements

Each DGM Bridge Agent MUST implement:
- `_run_swe_bench(variant)` - Software engineering benchmark
- `_run_polyglot_bench(variant)` - Multi-language programming benchmark  
- `_run_framework_internal_bench(variant)` - Framework-specific integration tests

### Examples

✅ **Good**: Proper DGM Bridge Agent
```python
class MyDGMBridgeAgent(DGMBridgeAgent):
    async def _run_swe_bench(self, variant: AgentVariant) -> BenchmarkResult:
        # Actual SWE-bench integration
        score = await self.swe_bench_runner.evaluate(variant.code_diff)
        return BenchmarkResult(
            benchmark_type=BenchmarkType.SWE_BENCH,
            score=score.total_score,
            max_score=100.0,
            execution_time=score.execution_time,
            memory_usage=score.memory_usage,
            error_count=score.error_count,
            details=score.test_results
        )
```

❌ **Bad**: Missing DGM integration
```python
class RegularAgent(BaseAgent):
    def evaluate_code(self, code):
        # No benchmark integration, no fitness tracking
        return "looks good"
```

### File Structure Requirements
```
project/
├── agents/
│   ├── dgm/
│   │   ├── __init__.py
│   │   ├── bridge_agent.py          # DGMBridgeAgent implementation
│   │   ├── variant_generator.py     # DGMVariantGenerator
│   │   └── archive_manager.py       # DGMArchiveManager
├── benchmarks/
│   ├── swe_bench_runner.py
│   ├── polyglot_runner.py
│   └── internal_benchmarks.py
├── rituals/
│   └── dgm_collapse_loop.rulΣ.yaml  # Evolution ritual configuration
└── data/
    └── dgm_archive/                 # Variant archive storage
```

### Validation Checklist
- [ ] DGMBridgeAgent inherits from framework base agent class
- [ ] Implements all three required benchmark types
- [ ] Uses symbolic memory for performance delta logging
- [ ] Follows agent state lifecycle management (Rule 915)
- [ ] Delegates complex actions to CoE (Rule 1015)
- [ ] Archives successful variants with proper compression
- [ ] Tracks fitness evolution across generations
- [ ] Implements proper error handling and logging 