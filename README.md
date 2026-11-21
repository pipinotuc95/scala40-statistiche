# Scala 40 – Statistiche

Sito statico (GitHub Pages) con le statistiche delle partite di Scala 40 di casa:
classifica, vittorie, media punti per mano, vittorie nel tempo, record, testa a testa
e il dettaglio mano per mano di ogni partita. Vince chi chiude con meno punti.

## Aggiungere partite

Le partite sono in `partite.js`, trascritte dalle foto dei fogli scritti a mano.
Ogni partita è un blocco con `id`, `data` (AAAA-MM-GG), `giocatori` (le sigle del foglio)
e `mani` (una riga per mano, punti nello stesso ordine dei giocatori).
Dopo il push il sito si aggiorna da solo in un minuto circa.

## File

- `index.html` – pagina, grafici e calcoli (nessuna libreria esterna)
- `partite.js` – i dati
