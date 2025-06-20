import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

// Dynamically import OTLP exporter only in production to avoid bundling issues in local dev
let OtlpTraceExporter:
  | typeof import('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter
  | undefined;
if (process.env.NODE_ENV === 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    OtlpTraceExporter = require('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('OTLP exporter package not found; falling back to console exporter');
  }
}

let sdk: NodeSDK | undefined;

export function initializeTelemetry() {
  if (process.env.OTEL_ENABLED !== 'true') {
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry disabled via OTEL_ENABLED env var');
    return;
  }

  if (sdk) return; // already initialized

  const exporter =
    process.env.NODE_ENV === 'production' && OtlpTraceExporter
      ? new OtlpTraceExporter({
          // Endpoint can be configured via OTEL_EXPORTER_OTLP_ENDPOINT env var
        })
      : new ConsoleSpanExporter();

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'vcarpool-backend',
    }),
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    // Start the SDK (may return promise in newer versions)
    void (sdk as any).start();
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry initialized');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('OpenTelemetry initialization failed', err);
  }
}
