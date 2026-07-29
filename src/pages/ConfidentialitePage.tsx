import LegalPageShell, { LegalSection } from "./LegalPageShell";

export default function ConfidentialitePage() {
  return (
    <LegalPageShell title="Confidentialité" updatedAt="26 juillet 2026">
      <LegalSection title="1. Données collectées">
        <p>
          Nous collectons les informations que vous nous fournissez
          directement : nom, numéro de téléphone, ville, informations de
          profil (agence, nounou, ménage) ainsi que vos échanges liés aux
          demandes de mise en relation.
        </p>
      </LegalSection>

      <LegalSection title="2. Utilisation des données">
        <p>— Créer et gérer votre compte.</p>
        <p>— Mettre en relation les ménages et les agences.</p>
        <p>— Vous contacter au sujet de vos demandes.</p>
        <p>— Améliorer la sécurité et la qualité du service.</p>
      </LegalSection>

      <LegalSection title="3. Partage des données">
        <p>
          Vos informations de profil sont visibles par les utilisateurs
          concernés par une mise en relation (par exemple une agence
          consultant une demande de garde d'enfants). Nous ne vendons
          jamais vos données à des tiers.
        </p>
      </LegalSection>

      <LegalSection title="4. Conservation des données">
        <p>
          Vos données sont conservées le temps nécessaire à l'utilisation
          de votre compte. Vous pouvez demander leur suppression à tout
          moment.
        </p>
      </LegalSection>

      <LegalSection title="5. Sécurité">
        <p>
          Nous mettons en œuvre des mesures raisonnables pour protéger vos
          données contre l'accès non autorisé, la perte ou la divulgation.
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger ou demander leur
          suppression depuis votre espace personnel ou en nous contactant
          directement.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Pour toute question relative à cette politique de
          confidentialité, contactez-nous via WhatsApp ou le formulaire de
          contact de l'application.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
