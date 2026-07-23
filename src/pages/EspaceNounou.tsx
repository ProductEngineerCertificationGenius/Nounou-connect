// src/pages/EspaceNounou.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Star,
  MapPin,
  CheckCircle,
  Clock,
  Heart,
  FileText,
  Calendar,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/useAuthStore";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getErrorMessage } from "../lib/errorHandler";

// ================================================================
// Réécriture complète, branchée sur la table réelle `nounous`.
//
// Suppression majeure par rapport au design d'origine : l'écran
// "profil en attente de validation par une agence" a été retiré. Ce
// n'était pas un simple manque de données à brancher — c'est un flux
// incompatible avec notre architecture réelle. Chez Noah, la nounou
// s'inscrivait librement puis attendait qu'une agence la "récupère".
// Chez nous, c'est l'inverse strict : `nounous.agence_id` est NOT NULL
// (cf. cahier des charges §6), donc une nounou n'existe dans la base
// QUE si une agence l'a déjà ajoutée à son vivier. Au moment où elle
// peut se connecter ici, elle est nécessairement déjà rattachée — il
// n'y a jamais d'état "en attente" à afficher.
//
// Champs retirés (absents de notre schéma) : `prenom` (seul `nom`
// existe), `competences` (seul `langues` existe), `verifiee` (pas de
// colonne de vérification). `famillesAidees` est désormais un vrai
// compte (nombre de demandes assignées à elle avec statut='Assignée'),
// pas un chiffre inventé.
//
// Ajout : onglet "Mes demandes" (n'existait pas du tout auparavant —
// la nounou n'avait aucun moyen de voir les familles qui lui sont
// assignées). S'appuie sur la policy RLS `demandes_select_nounou_assignee`
// et sur `menages_select_via_demande` (0007_calibrage_affichage.sql),
// déjà posées côté base pour ce cas précis — seul l'écran manquait.
// ================================================================

type Tab = "profil" | "demandes";

interface DemandeNounou {
  id: string;
  quartier: string;
  besoin: string;
  temps: string;
  logement: string;
  statut: string;
  date: string;
  menage?: { nom: string } | null;
}

export default function EspaceNounou() {
  const onLogout = useLogout();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  const { data: profil } = useQuery({
    queryKey: ["nounou", "profil", currentUser?.user_id],
    enabled: Boolean(currentUser?.user_id) && isSupabaseConfigured,
    queryFn: async () => {
      // Récupérer le userId depuis la session Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id;
      
      if (!authUserId) {
        throw new Error("Pas de session auth");
      }
      
      const { data, error } = await supabase
        .from("nounous")
        .select("*, agence:agences(nom)")
        .eq("user_id", authUserId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: nbFamillesAidees } = useQuery({
    queryKey: ["demandes", "nounou", profil?.id, "count"],
    enabled: Boolean(profil?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("demandes")
        .select("id", { count: "exact", head: true })
        .eq("nounou_assignee_id", profil!.id)
        .eq("statut", "Assignée");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: mesDemandes } = useQuery({
    queryKey: ["demandes", "nounou", profil?.id],
    enabled: Boolean(profil?.id) && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandes")
        .select("*, menage:menages(nom)")
        .eq("nounou_assignee_id", profil!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as DemandeNounou[];
    },
  });

  const toggleDisponible = useMutation({
    mutationFn: async () => {
      if (!profil) return;
      // .select() force Supabase à renvoyer les lignes modifiées.
      // Utile pour détecter un blocage RLS silencieux : dans ce cas
      // l'UPDATE "réussit" (pas d'erreur) mais ne touche aucune ligne,
      // et data ressort vide au lieu de contenir la ligne mise à jour.
      const { data, error } = await supabase
        .from("nounous")
        .update({ disponible: !profil.disponible })
        .eq("id", profil.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible de modifier la disponibilité (accès refusé par la base). Contactez votre agence."
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nounou", "profil", currentUser?.user_id] }),
    onError: (err) => alert(getErrorMessage(err)),
  });

  const initiales = (profil?.nom || "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const besoinLabels: Record<string, string> = {
    "Garde d'enfants": "👶",
    "Aide ménagère": "🧹",
    "Mixte (Garde + Ménage)": "👶🧹",
  };

  const renderProfil = () => (
    <>
      <section className="profile-section">
        <div className="profile-header">
          <div className="avatar-wrapper">
            {profil?.photo_url ? (
              <img src={profil.photo_url} alt={profil?.nom} />
            ) : (
              <div className="avatar-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24 }}>
                {initiales}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">
              <h1>{profil?.nom || "..."}</h1>
              <span className="role-badge">Nounou</span>
            </div>
            <div className="profile-meta">
              <span><Star size={16} fill="#F59E0B" color="#F59E0B" /> {profil?.note_moyenne ?? "—"}/5</span>
              <span><MapPin size={16} /> {profil?.quartier}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{profil?.experience || "Non renseigné"}</span>
            <span className="stat-label">Expérience</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{nbFamillesAidees ?? 0}</span>
            <span className="stat-label">Familles aidées</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{(profil?.tarif ?? 0).toLocaleString()}</span>
            <span className="stat-label">FCFA / jour</span>
          </div>
        </div>
      </section>

      <section className="statut-section">
        <div className="statut-card">
          <div className="statut-info">
            <span className="statut-icon">
              {profil?.disponible ? <CheckCircle size={24} /> : <Clock size={24} />}
            </span>
            <div>
              <span className="statut-label">Mon statut</span>
              <span className={`statut-value ${profil?.disponible ? "disponible" : "indisponible"}`}>
                {profil?.disponible ? "✅ Disponible" : "❌ Indisponible"}
              </span>
            </div>
          </div>
          <button className="btn-toggle-statut" onClick={() => toggleDisponible.mutate()} disabled={toggleDisponible.isPending}>
            {toggleDisponible.isPending ? "..." : profil?.disponible ? "Marquer indisponible" : "Marquer disponible"}
          </button>
        </div>
      </section>

      <section className="infos-section">
        <div className="info-card">
          <div className="info-card-header"><h3>Agence</h3></div>
          <p className="info-card-value">{profil?.agence?.nom || "—"}</p>
        </div>

        <div className="info-card">
          <div className="info-card-header"><h3>Langues</h3></div>
          <div className="info-card-tags">
            {(profil?.langues ?? []).map((l: string) => (
              <span key={l} className="tag">{l}</span>
            ))}
            {(profil?.langues ?? []).length === 0 && <span style={{ color: "#78716C", fontSize: 13 }}>Non renseigné</span>}
          </div>
        </div>
      </section>

      <div className="info-message">
        <Heart size={20} color="#C2614F" />
        <p>Pour modifier vos informations, contactez votre agence : <strong>{profil?.agence?.nom}</strong></p>
      </div>

      <button className="btn-logout" onClick={onLogout}><LogOut size={20} /> Se déconnecter</button>
    </>
  );

  const renderDemandes = () => (
    <section className="demandes-section">
      <h2 className="demandes-title">Mes demandes</h2>
      <p className="demandes-subtitle">Familles pour lesquelles votre agence vous a assignée</p>
      <div className="demandes-list">
        {(mesDemandes ?? []).map((d) => (
          <div key={d.id} className="demande-card">
            <div className="demande-card-header">
              <span className="demande-icon">{besoinLabels[d.besoin] || "📋"}</span>
              <div className="demande-content">
                <h4>{d.menage?.nom || "Famille"}</h4>
                <div className="demande-meta">
                  <span><MapPin size={12} /> {d.quartier}</span>
                  <span><Clock size={12} /> {d.temps}</span>
                  <span>🏠 {d.logement}</span>
                </div>
              </div>
              <span className={`demande-statut ${d.statut === "Assignée" ? "assignee" : "attente"}`}>
                {d.statut}
              </span>
            </div>
            <div className="demande-card-footer">
              <Calendar size={12} />
              <span>
                {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        ))}
        {(mesDemandes ?? []).length === 0 && (
          <p style={{ color: "#78716C", fontSize: 14 }}>Aucune demande pour le moment.</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="espace-nounou">
      <header className="nounou-header">
        <div className="header-left">
          <Logo size={28} />
          <span className="header-title">Nounou Connect</span>
        </div>
        <button className="btn-logout-header" onClick={onLogout}><LogOut size={20} /></button>
      </header>

      <main className="nounou-content">
        {activeTab === "profil" ? renderProfil() : renderDemandes()}
      </main>

      <nav className="bottom-nav">
        <button className={activeTab === "profil" ? "active" : ""} onClick={() => setActiveTab("profil")}>
          <div className={`nav-icon-wrapper ${activeTab === "profil" ? "active-icon" : ""}`}><User size={20} /></div>
          <span>Profil</span>
        </button>
        <button className={activeTab === "demandes" ? "active" : ""} onClick={() => setActiveTab("demandes")}>
          <div className={`nav-icon-wrapper ${activeTab === "demandes" ? "active-icon" : ""}`}><FileText size={20} /></div>
          <span>Demandes</span>
        </button>
      </nav>

      <style>{`
        .espace-nounou {
          min-height: 100vh;
          background: #FBF9F7;
          font-family: "Inter", sans-serif;
          padding-bottom: 80px;
        }

        .nounou-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid rgba(212, 184, 150, 0.12);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #4A3520;
        }

        .btn-logout-header {
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-logout-header:hover {
          background: #FEE2E2;
          color: #DC2626;
        }

        .nounou-content {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px 20px 20px;
        }

        .profile-section {
          background: #F5EDE6;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-wrapper img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .verify-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }

        .profile-info {
          flex: 1;
        }

        .profile-name {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .profile-name h1 {
          font-size: 20px;
          font-weight: 700;
          color: #4A3520;
          margin: 0;
        }

        .role-badge {
          font-size: 11px;
          font-weight: 600;
          background: #705334;
          color: white;
          padding: 2px 12px;
          border-radius: 50px;
        }

        .profile-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          color: #78716C;
          margin-top: 4px;
        }

        .profile-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #D1FAE5;
          color: #065F46;
          font-size: 11px;
          font-weight: 600;
          padding: 1px 10px;
          border-radius: 50px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: #705334;
        }

        .stat-label {
          display: block;
          font-size: 11px;
          color: #78716C;
          font-weight: 500;
          margin-top: 2px;
        }

        .statut-section {
          margin-bottom: 16px;
        }

        .statut-card {
          background: white;
          border-radius: 14px;
          padding: 16px 18px;
          border: 1px solid rgba(212, 184, 150, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .statut-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .statut-icon {
          color: #705334;
        }

        .statut-label {
          display: block;
          font-size: 12px;
          color: #78716C;
          font-weight: 500;
        }

        .statut-value {
          display: block;
          font-size: 15px;
          font-weight: 700;
        }

        .statut-value.disponible {
          color: #4A7C59;
        }

        .statut-value.indisponible {
          color: #E87A7A;
        }

        .btn-toggle-statut {
          padding: 8px 18px;
          border: 2px solid #F2D6D8;
          border-radius: 50px;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: #705334;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-toggle-statut:hover {
          background: #F2D6D8;
        }

        .infos-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(212, 184, 150, 0.08);
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .info-card-header svg {
          color: #C2614F;
        }

        .info-card-header h3 {
          font-size: 13px;
          font-weight: 600;
          color: #78716C;
          margin: 0;
        }

        .info-card-value {
          font-size: 15px;
          font-weight: 600;
          color: #1C1917;
          margin: 0;
        }

        .info-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          font-size: 12px;
          padding: 2px 12px;
          border-radius: 50px;
          background: #F5F0EB;
          color: #6B5E4F;
        }

        .tag.skill {
          background: #F2D6D8;
          color: #705334;
          font-weight: 500;
        }

        .info-message {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #F8EDEE;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(194, 97, 79, 0.12);
          margin-bottom: 16px;
        }

        .info-message p {
          font-size: 13px;
          color: #78716C;
          margin: 0;
          line-height: 1.5;
        }

        .info-message strong {
          color: #1C1917;
        }

        .btn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: transparent;
          border: 2px solid #FEE2E2;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: #DC2626;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .btn-logout:hover {
          background: #FEE2E2;
          border-color: #DC2626;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 12px 12px;
          border-top: 1px solid rgba(212, 184, 150, 0.08);
          box-shadow: 0 -4px 20px rgba(74, 53, 32, 0.04);
          z-index: 100;
        }

        .bottom-nav button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: transparent;
          border: none;
          color: #78716C;
          cursor: pointer;
          padding: 4px 16px;
          font-size: 10px;
          font-weight: 500;
          transition: all 0.2s;
          border-radius: 50px;
        }

        .bottom-nav button .nav-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .bottom-nav button.active {
          color: #705334;
        }

        .bottom-nav button.active .active-icon {
          background: #705334;
          color: white;
        }

        .bottom-nav button span {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .nounou-content {
            padding: 12px 14px 16px;
          }
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
          .profile-name {
            justify-content: center;
          }
          .profile-meta {
            justify-content: center;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          .stat-card:last-child {
            grid-column: span 2;
          }
          .statut-card {
            flex-direction: column;
            text-align: center;
          }
          .statut-info {
            flex-direction: column;
          }
          .btn-toggle-statut {
            width: 100%;
            justify-content: center;
          }
          .info-message {
            flex-direction: column;
            text-align: center;
          }
          .bottom-nav button {
            padding: 4px 12px;
          }
        }

        @media (min-width: 769px) {
          .nounou-content {
            max-width: 700px;
            padding: 20px 24px 24px;
          }
          .profile-header {
            gap: 24px;
          }
          .avatar-wrapper img {
            width: 100px;
            height: 100px;
          }
          .profile-name h1 {
            font-size: 24px;
          }
          .stats-grid {
            gap: 14px;
          }
          .stat-number {
            font-size: 28px;
          }
        }

        /* ============================================================ */
        /* MES DEMANDES                                                 */
        /* ============================================================ */
        .demandes-title { font-size: 20px; font-weight: 700; color: #1C1917; margin: 0 0 2px; }
        .demandes-subtitle { font-size: 13px; color: #78716C; margin: 0 0 16px; }
        .demandes-list { display: flex; flex-direction: column; gap: 12px; }
        .demande-card { background: white; border-radius: 14px; padding: 14px 16px; border: 1px solid rgba(212,184,150,0.15); box-shadow: 0 2px 8px rgba(28,25,23,0.04); }
        .demande-card-header { display: flex; align-items: flex-start; gap: 10px; }
        .demande-icon { font-size: 20px; flex-shrink: 0; }
        .demande-content { flex: 1; min-width: 0; }
        .demande-content h4 { font-size: 15px; font-weight: 700; color: #1C1917; margin: 0 0 4px; }
        .demande-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #78716C; }
        .demande-meta span { display: flex; align-items: center; gap: 3px; }
        .demande-statut { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 50px; white-space: nowrap; }
        .demande-statut.assignee { background: #E8F5E8; color: #4A7C59; }
        .demande-statut.attente { background: #F2D6D8; color: #C2614F; }
        .demande-card-footer { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #78716C; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F5F0EB; }
      `}</style>
    </div>
  );
}
