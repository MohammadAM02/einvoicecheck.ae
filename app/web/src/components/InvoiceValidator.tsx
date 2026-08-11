import { BatchValidator } from './BatchValidator';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';

export function InvoiceValidator() {
  return (
    <div className="validator-station">
      <div className="validator-station__canvas">
        <ValidatorWorkspace context="tool" />
      </div>
      <details className="batch-panel validator-station__batch">
        <summary>Need to inspect a batch?</summary>
        <BatchValidator />
      </details>
    </div>
  );
}
