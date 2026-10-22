const champ = document.querySelector("#prenom");
const bouton = document.querySelector("#bouton-recherche");
const resultat = document.querySelector("#resultat");
const lignes = document.querySelectorAll(".carte-amis .ligne");

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

  let dejaAffiche = false;
  let barreLibre = null;
  for (const ligne of lignes) {
    if (ligne.textContent === recherche) {
      dejaAffiche = true;
    } else if (ligne.textContent === "" && barreLibre === null) {
      barreLibre = ligne;
    }
  }

  if (!estTrouve) {
    resultat.textContent = "Aucun ami trouvé avec ce prénom. 😢";
  } else if (dejaAffiche) {
    resultat.textContent = recherche + " est déjà dans ta liste.";
  } else if (barreLibre === null) {
    resultat.textContent = "Ta liste d'amis est pleine.";
  } else {
    barreLibre.textContent = recherche;
    resultat.textContent = "Ami trouvé : " + recherche + " ! 🎉";
  }
});