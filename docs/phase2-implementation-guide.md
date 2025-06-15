# Phase-2 Optimization Implementation Guide

_Last updated: 2025-06-15_

## 1. Purpose
Phase-2 introduces high-impact performance optimizations for the backend Azure Functions runtime while **avoiding external infrastructure costs**. The goal is to reach sub-200 ms P99 latency under 50 concurrent users using only in-memory techniques.

## 2. Key Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| Phase-2 Optimization Middleware | `backend/src/middleware/phase2-optimization.middleware.ts` | Adds caching, compression, deduplication, metrics with one-line wrapper (`quickOptimize`, `performanceOptimize`, `lightweightOptimize`). |
| Enhanced Multi-Level Cache | `backend/src/optimizations/enhanced-multi-level-cache.ts` | L1/L2/L3 in-memory cache tiers with analytics. |
| Phase-2 Orchestrator | `backend/src/optimizations/phase2-orchestrator.ts` | Singleton that aggregates metrics and coordinates optimizers. |
| Demo Function | `backend/src/functions/phase2-demo/index.ts` | Smoke-test endpoint returning orchestrator metrics. |
| Admin Function | `backend/src/functions/admin-phase2/index.ts` | Admin-only endpoint (GET metrics, DELETE cache). |
| Autocannon Perf Script | `backend/perf/phase2-perf.js` | Executes load test & enforces latency budget in CI. |

## 3. Usage

### 3.1 Wrap a Function
```ts
import { quickOptimize } from "../../middleware/phase2-optimization.middleware";

app.http("trips-list", {
  methods: ["GET"],
  route: "trips",
  handler: quickOptimize(myHandler),
});
```

### 3.2 Runtime Configuration
| Env Var | Default | Description |
|---------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OpenTelemetry. |
| `CACHE_TTL` | `300000` | Override default cache TTL (ms). |
| `PERF_LATENCY_MS` | `150` | CI latency gate (ms). |

## 4. Admin API

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/phase2` | `admin` | Returns current performance metrics. |
| DELETE | `/api/admin/phase2` | `admin` | Clears all in-memory cache tiers. |

Example response:
```json
{
  "success": true,
  "data": {
    "totalRequests": 4321,
    "averageResponseTime": 83,
    "cacheHitRate": 0.86,
    "memoryUsage": 142_312_448,
    "lastUpdated": "2025-06-15T18:02:11.220Z"
  }
}
```

## 5. CI Performance Gate
The GitHub workflow (`.github/workflows/quality-gate.yml`) now contains a **perf-test** job that:
1. Builds & starts Functions host via `npm run func:start:ci`.
2. Waits for port 7071 (60 s timeout).
3. Executes `npm run perf:phase2` which hits `/api/phase2-demo` with **50 VUs for 30 s**.
4. Fails the pipeline if average latency exceeds **150 ms**.

## 6. Extension Points
* **Redis migration:** Implement `ICacheAdapter` and register Redis-backed cache; orchestrator remains unchanged.
* **Predictive cache warming:** Plug algorithm into `Phase2PerformanceOrchestrator.setupPerformanceMonitoring()` hook.

## 7. Troubleshooting
| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| Perf test fails (>150 ms) | cache disabled, high cold-start, heavy DB query | Verify `quickOptimize` applied, increase cache TTL, profile queries. |
| Admin DELETE returns 403 | Missing admin role | Authenticate as super-admin user. |
| OTLP exporter error | Package not installed in dev | Set `OTEL_ENABLED=false` locally or install exporter package. |

---
For detailed design rationale refer to ADR `docs/adr/2025-06-15-thin-controller-and-telemetry.md`. 