const formulaire = document.querySelector("#formulaire");
const champPrenom = document.querySelector("#prenom");
const champEmail = document.querySelector("#email");
const champMotdepasse = document.querySelector("#motdepasse");
const resultat = document.querySelector("#resultat");
const boutonInscription = document.querySelector("#inscription");
const boutonConnexion = document.querySelector("#connexion");
const sectionAvatars = document.querySelector("#sectionAvatars");

let modeInscription = false;
let avatarSelectionne = null;

// Afficher le choix d'avatar uniquement lors de l'inscription
boutonInscription.addEventListener("click", async () => {
  if (!modeInscription) {
    modeInscription = true;
    sectionAvatars.hidden = false;
    champPrenom.required = true;
    champMotdepasse.autocomplete = "new-password";
    boutonInscription.textContent = "Confirmer l'inscription";
    boutonConnexion.textContent = "Retour à la connexion";
    resultat.textContent = "Remplis tes informations et choisis un avatar.";
    return;
  }

  const prenom = champPrenom.value.trim();
  const email = champEmail.value.trim();
  const password = champMotdepasse.value;

  if (!prenom || !email || password.length < 8) {
    resultat.textContent =
      "Remplis ton prénom, ton e-mail et un mot de passe d'au moins 8 caractères.";
    return;
  }

  if (!avatarSelectionne) {
    resultat.textContent = "Choisis un avatar avant de créer ton compte.";
    return;
  }

  boutonInscription.disabled = true;

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          prenom,
          avatar: avatarSelectionne
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      localStorage.setItem("avatarUtilisateur", avatarSelectionne);
      localStorage.setItem("prenomUtilisateur", prenom);
      window.location.href = "accueil.html";
    } else {
      resultat.textContent =
        "Compte créé ! Vérifie tes e-mails pour confirmer ton adresse avant de te connecter.";
    }
  } catch (error) {
    resultat.textContent = "Inscription impossible : " + error.message;
  } finally {
    boutonInscription.disabled = false;
  }
});

// Sélectionner un avatar
for (let i = 1; i <= 10; i++) {
  const avatar = document.getElementById("avatar" + i);

  avatar.addEventListener("click", () => {
    avatarSelectionne = "avatar" + i;

    document.querySelectorAll("#choixAvatars img").forEach((image) => {
      image.style.border = "none";
    });

    avatar.style.border = "3px solid green";
  });

  avatar.style.cursor = "pointer";
}

// Connexion ou retour au mode connexion
boutonConnexion.addEventListener("click", async (event) => {
  if (modeInscription) {
    event.preventDefault();
    modeInscription = false;
    sectionAvatars.hidden = true;
    champPrenom.required = false;
    champMotdepasse.autocomplete = "current-password";
    avatarSelectionne = null;
    boutonInscription.textContent = "Créer mon compte";
    boutonConnexion.textContent = "Me connecter";
    resultat.textContent = "";
    return;
  }
});

// Connexion avec Supabase
formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = champEmail.value.trim();
  const password = champMotdepasse.value;

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const utilisateur = data.user;
    const prenom = utilisateur.user_metadata?.prenom;
    const avatar = utilisateur.user_metadata?.avatar;

    if (prenom) localStorage.setItem("prenomUtilisateur", prenom);
    if (avatar) localStorage.setItem("avatarUtilisateur", avatar);

    window.location.href = "accueil.html";
  } catch (error) {
    resultat.textContent = "Connexion impossible : " + error.message;
  }
})