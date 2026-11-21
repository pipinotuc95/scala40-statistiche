// Partite di Scala 40 trascritte dai fogli scritti a mano.
//
// Ogni partita ha:
//   id         codice unico (data + lettera, es. "2022-03-05-a")
//   data       AAAA-MM-GG
//   giocatori  le sigle scritte in testa alle colonne, nell'ordine del foglio
//   mani       una riga per mano, con i punti nello stesso ordine dei giocatori
//   note       facoltativo
//
// Vince chi finisce la partita con MENO punti.
// Una mano da 100 punti = il giocatore non è riuscito ad aprire.

// Sigla scritta sul foglio -> nome completo mostrato sul sito.
window.NOMI = {
  DA: "Daniela",
  FRA: "Francesca",
  MI: "Michele",
  MA: "Mauro",
  CE: "Cesare"
};

window.PARTITE = [
  {
    id: "2022-03-05-a",
    data: "2022-03-05",
    giocatori: ["FRA", "MI", "DA"],
    mani: [
      [5, 0, 8],
      [12, 43, 0],
      [5, 2, 0],
      [0, 31, 16],
      [7, 0, 2],
      [4, 3, 0],
      [9, 0, 6],
      [0, 21, 20],
      [27, 42, 0],
      [0, 2, 21],
      [8, 0, 100],
      [0, 2, 3],
      [33, 0, 29],
      [2, 2, 0],
      [0, 8, 22]
    ]
  }
];
