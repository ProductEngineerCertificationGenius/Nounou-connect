import { useState } from "react";
import { useEnregistrerAvis } from "../../hooks/useData";
import Avatar from "./Avatar";

export default function RatingModal({ nounou, onClose }) {
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const { mutate, isPending, isSuccess } = useEnregistrerAvis();

  const submit = (e) => {
    e.preventDefault();
    mutate({ nounouId: nounou.id, note, commentaire });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 lg:rounded-2xl">
        {isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-display text-lg">Merci pour votre avis</p>
            <p className="text-sm text-ink/60">
              Votre note aide les autres familles à choisir en confiance.
            </p>
            <button onClick={onClose} className="btn-secondary mt-2">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col items-center gap-4 text-center">
            <Avatar name={nounou.nom} size={48} />
            <div>
              <p className="font-display text-lg">Noter l'expérience</p>
              <p className="text-sm text-ink/60">avec {nounou.nom}</p>
            </div>
            <div className="flex gap-1 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setNote(n)}
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  className={n <= note ? "text-gold" : "text-line"}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Laisser un commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
            <div className="flex w-full gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Plus tard
              </button>
              <button type="submit" className="btn-primary" disabled={isPending}>
                {isPending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
