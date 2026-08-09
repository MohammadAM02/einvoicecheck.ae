import type { ReactNode } from 'react';

export function ToolPageHeader(props: {
  eyebrow?: string;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <header className="tool-page-header">
      {props.eyebrow ? <p className="tool-page-header__eyebrow">{props.eyebrow}</p> : null}
      <h1>{props.title}</h1>
      <p className="tool-page-header__description">{props.description}</p>
    </header>
  );
}

export type WorkflowStepStatus = 'complete' | 'current' | 'upcoming';

export function WorkflowStepper(props: {
  label: string;
  steps: Array<{ label: string; status: WorkflowStepStatus }>;
}): React.ReactElement {
  return (
    <ol className="workflow-stepper" aria-label={props.label}>
      {props.steps.map((step, index) => (
        <li
          className={`workflow-stepper__step is-${step.status}`}
          aria-current={step.status === 'current' ? 'step' : undefined}
          key={`${index}-${step.label}`}
        >
          <span className="workflow-stepper__marker" aria-hidden="true">
            {step.status === 'complete' ? '✓' : index + 1}
          </span>
          <span className="workflow-stepper__label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function NextActionPanel(props: {
  title: string;
  description?: string;
  children?: ReactNode;
  testId?: string;
}): React.ReactElement {
  return (
    <section
      className="next-action-panel"
      aria-label={props.title}
      data-testid={props.testId}
    >
      <div className="next-action-panel__body">
        <strong>{props.title}</strong>
        {props.description ? <p>{props.description}</p> : null}
      </div>
      {props.children ? <div className="next-action-panel__actions">{props.children}</div> : null}
    </section>
  );
}
