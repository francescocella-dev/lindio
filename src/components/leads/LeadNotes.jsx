import { useState } from "react";
import { formatDateTime } from "../../utils/formatDate.js";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Textarea from "../ui/Textarea.jsx";

function getLatestNote(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return null;
  }

  return notes[0];
}

export default function LeadNotes({ lead, onUpdate }) {
  const [note, setNote] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const notes = Array.isArray(lead.notes) ? lead.notes : [];
  const latestNote = getLatestNote(notes);

  function addNote() {
    const text = note.trim();

    if (!text) return;

    onUpdate({
      ...lead,
      notes: [
        {
          date: new Date().toISOString(),
          text
        },
        ...notes
      ]
    });

    setNote("");
    setIsHistoryOpen(true);
  }

  return (
    <Card title="Note e storico" className="notes-panel compact-notes detail-card-order-5">
      <div className="notes-intro">
        <p>Aggiungi aggiornamenti, telefonate fatte, informazioni ricevute o decisioni prese.</p>
      </div>

      <div className="notes-composer">
        <Textarea
          label="Nuova nota"
          value={note}
          onChange={setNote}
          placeholder="Esempio: cliente richiamato, inviate foto su WhatsApp..."
        />

        <Button variant="secondary" type="button" onClick={addNote}>
          Aggiungi nota
        </Button>
      </div>

      <section className="notes-history-panel">
        <button
          className="notes-history-toggle"
          type="button"
          onClick={() => setIsHistoryOpen((current) => !current)}
        >
          <div>
            <strong>Registro note</strong>
            <span>
              {notes.length === 0
                ? "Nessuna nota inserita"
                : `${notes.length} ${notes.length === 1 ? "nota salvata" : "note salvate"}`}
            </span>
          </div>

          <span className={`notes-history-chevron ${isHistoryOpen ? "notes-history-chevron-open" : ""}`}>
            ›
          </span>
        </button>

        {!isHistoryOpen && latestNote && (
          <div className="notes-latest-preview">
            <small>Ultima nota · {formatDateTime(latestNote.date)}</small>
            <p>{latestNote.text}</p>
          </div>
        )}

        {isHistoryOpen && (
          <>
            {notes.length > 0 ? (
              <div className="notes-history-scroll">
                <div className="notes-list improved-notes-list">
                  {notes.map((item, index) => (
                    <article key={`${item.date}-${index}`} className="note-item">
                      <small>{formatDateTime(item.date)}</small>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state notes-empty">
                <strong>Nessuna nota ancora inserita</strong>
                <p>Quando aggiungi una nota, comparirà nel registro attività della richiesta.</p>
              </div>
            )}
          </>
        )}
      </section>
    </Card>
  );
}