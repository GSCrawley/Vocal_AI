/**
 * Stub file created in Task 0 for downstream integrations.
 *
 * This file will eventually contain:
 * 1. normalizePythonOutput() — transforms the flat output from Python's singing_metrics job
 *    into the nested SingingMetricsResult shape.
 * 2. findWeakestMetric() — uses the normalized SingingMetricsResult and user's active SingingGoal
 *    to identify the single metric to focus coaching on for a given attempt.
 *
 * These implementations will be fleshed out in future tasks (e.g. Task 7A, Task 9).
 */

import type { SingingMetricsResult, SingingMetricKey } from '@voice/shared-types';

/**
 * Transforms the flat SingingMetricsResult from the Python processor into the normalized shape.
 * (STUB)
 */
export function normalizePythonOutput(_raw: any): SingingMetricsResult {
  // To be implemented in a future task (e.g. Task 7A)
  throw new Error("normalizePythonOutput is not implemented yet");
}

/**
 * Given a normalized SingingMetricsResult and a goal, identifies the weakest metric.
 * (STUB)
 */
export function findWeakestMetric(_result: SingingMetricsResult, _goal: string): SingingMetricKey {
  // To be implemented in a future task
  throw new Error("findWeakestMetric is not implemented yet");
}
