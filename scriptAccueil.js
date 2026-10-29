const champ = document.querySelector("#prenom");
const bouton = document.querySelector("#bouton-recherche");
const resultat = document.querySelector("#resultat");
const liste = document.querySelector(".carte-amis .lignes");

// Les amis déjà ajoutés, relus depuis le navigateur
let mesAmis = JSON.parse(localStorage.getItem("mesAmis")) || [];

// Crée une nouvelle ligne (rond + barre bleue) pour un ami
function creerBarre(prenom) {
  const li = document.createElement("li");

  const pastille = document.createElement("button");
  pastille.type = "button";
  pastille.className = "pastille";
  pastille.setAttribute("aria-label", prenom);

  const ligne = document.createElement("button");
  ligne.type = "button";
  ligne.className = "ligne";
  ligne.setAttribute("aria-label", prenom);
  ligne.textContent = prenom;

  li.appendChild(pastille);
  li.appendChild(ligne);
  liste.appendChild(li);
}

// Écrit chaque ami dans une barre : les barres vides d'abord, puis de nouvelles
function afficherAmis() {
  const barres = liste.querySelectorAll(".ligne");
  mesAmis.forEach(function (prenom, i) {
    if (i < barres.length) {
      barres[i].textContent = prenom;
      barres[i].setAttribute("aria-label", prenom);
    } else {
      creerBarre(prenom);
    }
  });
}

bouton.addEventListener("click", async function () {
  const recherche = champ.value;

  const estVide = recherche === "";
  if (estVide) {
    resultat.textContent = "Écris un prénom pour chercher ton ami.";
    return;
  }

  const { data, error } = await client
    .from("amis")
    .select("*")
    .eq("prenom", recherche);

  if (error) {
    resultat.textContent = "Erreur de connexion à la base de données.";
    console.error(error);
    return;
  }

  const estTrouve = data.length > 0;

  if (!estTrouve) {
    resultat.textContent = "Aucun ami trouvé avec ce prénom. 😢";
  } else if (mesAmis.includes(recherche)) {
    resultat.textContent = recherche + " est déjà dans ta liste.";
  } else {
    mesAmis.push(recherche);
    localStorage.setItem("mesAmis", JSON.stringify(mesAmis));
    afficherAmis();
    liste.scrollTop = liste.scrollHeight; // descend pour montrer le nouvel ami
    resultat.textContent = "Ami trouvé : " + recherche + " ! 🎉";
  }
});

// Au chargement de la page, on réaffiche les amis déjà ajoutés
afficherAmis();