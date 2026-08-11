export type HomepageValidatorHandoff = {
  source: 'homepage';
  xml: string;
  fileName?: string;
};

let pendingHomepageHandoff: HomepageValidatorHandoff | null = null;

export function setHomepageValidatorHandoff(handoff: HomepageValidatorHandoff): void {
  pendingHomepageHandoff = handoff;
}

export function consumeHomepageValidatorHandoff(): HomepageValidatorHandoff | null {
  const handoff = pendingHomepageHandoff;
  pendingHomepageHandoff = null;
  return handoff;
}
