export const QUARTIERS = [
  "Cocody",
  "Marcory",
  "Yopougon",
  "Adjamé",
  "Treichville",
  "Abobo",
  "Koumassi",
  "Plateau",
];

export const BESOINS = ["Garde d'enfants", "Aide ménagère", "Garde + ménage"];
export const TEMPS_TRAVAIL = ["Temps plein", "Temps partiel", "Ponctuel"];
export const LOGEMENT = ["Logée", "Non logée"];

export const AGENCES = [
  {
    id: "ag-1",
    nom: "Agence Étoile du Foyer",
    quartier: "Cocody",
    note: 4.6,
    nbAvis: 38,
    nbNounous: 12,
    telephone: "2250700000001",
    description:
      "Agence familiale active à Cocody depuis 2016, spécialisée dans la garde d'enfants.",
  },
  {
    id: "ag-2",
    nom: "Vivier Confiance",
    quartier: "Marcory",
    note: 4.3,
    nbAvis: 21,
    nbNounous: 8,
    telephone: "2250700000002",
    description: "Agence de placement de nounous et d'aides ménagères à Marcory.",
  },
  {
    id: "ag-3",
    nom: "Maison Sereine",
    quartier: "Yopougon",
    note: 4.9,
    nbAvis: 52,
    nbNounous: 15,
    telephone: "2250700000003",
    description: "Plus grand vivier de nounous certifiées de Yopougon.",
  },
];

export const NOUNOUS = [
  {
    id: "n-1",
    agenceId: "ag-1",
    nom: "Mariam T.",
    experience: "3 ans",
    langues: ["Français", "Dioula"],
    tarif: 50000,
    quartier: "Cocody",
    disponible: true,
    note: 4.8,
    avis: [
      { id: "r-1", note: 5, commentaire: "Très ponctuelle et attentionnée avec mes enfants." },
      { id: "r-2", note: 5, commentaire: "Nounou sérieuse, je recommande vivement." },
    ],
    historique: [
      { id: "h-1", date: "2026-03-12", menage: "Famille K.", statut: "Terminée" },
      { id: "h-2", date: "2026-05-02", menage: "Famille D.", statut: "En cours" },
    ],
  },
  {
    id: "n-2",
    agenceId: "ag-1",
    nom: "Fatou C.",
    experience: "5 ans",
    langues: ["Français", "Baoulé"],
    tarif: 65000,
    quartier: "Cocody",
    disponible: true,
    note: 4.5,
    avis: [{ id: "r-3", note: 4, commentaire: "Bonne expérience globale, communication facile." }],
    historique: [],
  },
  {
    id: "n-3",
    agenceId: "ag-3",
    nom: "Adjoua Y.",
    experience: "2 ans",
    langues: ["Français"],
    tarif: 40000,
    quartier: "Yopougon",
    disponible: false,
    note: 4.9,
    avis: [{ id: "r-4", note: 5, commentaire: "Excellente avec les tout-petits." }],
    historique: [],
  },
];

export const DEMANDES = [
  {
    id: "d-1",
    agenceId: "ag-1",
    menage: "Famille Koné",
    quartier: "Cocody",
    besoin: "Garde d'enfants",
    temps: "Temps plein",
    logement: "Non logée",
    statut: "En attente",
    date: "2026-07-18",
  },
  {
    id: "d-2",
    agenceId: "ag-1",
    menage: "Famille Bamba",
    quartier: "Cocody",
    besoin: "Aide ménagère",
    temps: "Temps partiel",
    logement: "Non logée",
    statut: "Assignée",
    date: "2026-07-15",
    nounouAssignee: "Fatou C.",
  },
];

export const RECHERCHES_HISTORIQUE = [
  { id: "s-1", date: "2026-07-10", quartier: "Cocody", besoin: "Garde d'enfants" },
  { id: "s-2", date: "2026-06-28", quartier: "Marcory", besoin: "Aide ménagère" },
];
