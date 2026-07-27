import LegalPageShell, { LegalSection } from "./LegalPageShell";

export default function AProposPage() {
  return (
    <LegalPageShell title="À propos" updatedAt="26 juillet 2026">
      <LegalSection title="Notre mission">
        <p>
          Nounou Connect met en relation les familles, les agences et les
          professionnelles de la garde d'enfants et du ménage à domicile.
          Notre objectif : rendre la recherche d'une nounou ou d'une aide
          ménagère de confiance simple, rapide et transparente.
        </p>
      </LegalSection>

      <LegalSection title="Comment ça marche">
        <p>
          Une famille dépose une demande précisant ses besoins (garde
          d'enfants, ménage, disponibilités). Les agences partenaires
          proposent des profils de nounous ou d'employées de maison
          vérifiés. La famille échange ensuite directement avec l'agence
          pour finaliser la mise en relation.
        </p>
      </LegalSection>

      <LegalSection title="Nos engagements">
        <p>— Vérification des profils par les agences partenaires.</p>
        <p>— Mise en relation gratuite pour les familles.</p>
        <p>— Un espace dédié pour chaque profil : agence, nounou et ménage.</p>
      </LegalSection>

      <LegalSection title="Nous contacter">
        <p>
          Une question, une suggestion ou besoin d'aide ? Écrivez-nous sur
          WhatsApp, notre canal de contact privilégié, ou via le formulaire
          de contact de l'application.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
