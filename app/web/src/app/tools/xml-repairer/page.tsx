import { permanentRedirect } from 'next/navigation';

/**
 * Retired standalone XML Repairer (Part B). Old links must not dead-end:
 * permanently redirect to the main Validator, which owns the only remaining
 * repair surface (Validator-integrated safe repair behind an explicit action).
 */
export default function XmlRepairerRedirect() {
  permanentRedirect('/tools/uae-e-invoice-validator');
}
