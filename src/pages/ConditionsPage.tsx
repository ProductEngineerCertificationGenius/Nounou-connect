import LegalPageShell, { LegalSection } from "./LegalPageShell";

export default function ConditionsPage() {
  return (
    <LegalPageShell title="Conditions" updatedAt="26 juillet 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions régissent l'utilisation de la plateforme
          Nounou Connect, qui met en relation des familles, des agences et
          des professionnelles de la garde d'enfants et du ménage à
          domicile.
        </p>
      </LegalSection>

      <LegalSection title="2. Inscription">
        <p>
          L'inscription est ouverte aux familles, agences et
          professionnelles majeures. Chaque utilisateur s'engage à fournir
          des informations exactes et à jour lors de la création de son
          profil.
        </p>
      </LegalSection>

      <LegalSection title="3. Rôle de la plateforme">
        <p>
          Nounou Connect met en relation les utilisateurs mais n'intervient
          pas dans la relation contractuelle (recrutement, rémunération,
          conditions de travail) qui se noue directement entre la famille
          et l'agence ou la professionnelle.
        </p>
      </LegalSection>

      <LegalSection title="4. Utilisation de la plateforme">
        <p>
          Chaque utilisateur s'engage à utiliser la plateforme de bonne foi,
          à ne pas publier de contenu trompeur ou frauduleux, et à respecter
          les autres utilisateurs.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilités">
        <p>
          Les agences sont responsables de la vérification des profils
          qu'elles proposent. Nounou Connect ne saurait être tenu
          responsable des accords conclus entre une famille et une agence
          ou une professionnelle.
        </p>
      </LegalSection>

      <LegalSection title="6. Résiliation">
        <p>
          Tout utilisateur peut supprimer son compte à tout moment depuis
          son espace personnel. Nounou Connect se réserve le droit de
          suspendre un compte en cas de non-respect des présentes
          conditions.
        </p>
      </LegalSection>

      <LegalSection title="7. Modification des conditions">
        <p>
          Ces conditions peuvent être mises à jour. Les utilisateurs seront
          informés de tout changement significatif via l'application.
        </p>
      </LegalSection>

      <LegalSection title="8. Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit ivoirien. Tout
          litige sera soumis aux juridictions compétentes.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
