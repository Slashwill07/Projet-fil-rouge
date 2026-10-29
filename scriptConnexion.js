const formulaire = document.querySelector("#formulaire");
const champPrenom = document.querySelector("#prenom");
const champMotdepasse = document.querySelector("#motdepasse");
const resultat = document.querySelector("#resultat");
const boutonInscription = document.querySelector("#inscription");

// "Éloïse " -> "eloise@messageskids.app"
function prenomVersEmail(prenom) {
  const propre = prenom
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return propre + "@messageskids.app";
}

// Création du compte -> page de choix d'avatar
boutonInscription.addEventListener("click", async () => {
  const prenom = champPrenom.value.trim();
  const password = champMotdepasse.value;

  if (!prenom || password.length < 8) {
    resultat.textContent =
      "Écris ton prénom et un mot de passe d'au moins 8 caractères.";
    return;
  }

  const email = prenomVersEmail(prenom);
  if (email === "@messageskids.app") {
    resultat.textContent = "Ton prénom doit contenir des lettres ou des chiffres.";
    return;
  }

  boutonInscription.disabled = true;

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { prenom } }
    });

    if (error) throw error;

    if (data.session) {
      window.location.href = "ChoixAvatar.html";
    } else {
      resultat.textContent =
        "Ce prénom est peut-être déjà pris, ou la confirmation par e-mail est encore activée dans Supabase.";
    }
  } catch (error) {
    resultat.textContent = "Inscription impossible : " + error.message;
  } finally {
    boutonInscription.disabled = false;
  }
});

// Connexion
formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = prenomVersEmail(champPrenom.value);
  const password = champMotdepasse.value;

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const avatar = data.user.user_metadata?.avatar;
    // Si le compte n'a pas encore d'avatar, on retourne le choisir
    window.location.href = avatar ? "accueil.html" : "ChoixAvatar.html";
  } catch (error) {
    resultat.textContent = "Prénom ou mot de passe incorrect.";
  }
});