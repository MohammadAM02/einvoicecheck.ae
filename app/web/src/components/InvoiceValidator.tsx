import { BatchValidator } from './BatchValidator';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';

export function InvoiceValidator() {
  return (
    <div className="tool">
      <ValidatorWorkspace context="tool" />
      <details className="batch-panel">
        <summary>Batch validation</summary>
        <BatchValidator />
      </details>
    </div>
  );
}
