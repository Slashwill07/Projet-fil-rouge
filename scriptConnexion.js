const formulaire = document.querySelector("#formulaire");
const champPrenom = document.querySelector("#prenom");
const champEmail = document.querySelector("#email");
const champMotdepasse = document.querySelector("#motdepasse");
const boutonConnexion = document.querySelector("#connexion");
const boutonInscription = document.querySelector("#inscription");
const boutonOublie = document.querySelector("#oublie");
const resultat = document.querySelector("#resultat");
 
// Va vers le choix d'avatar si l'utilisateur n'en a pas encore, sinon vers les messages
async function allerSuite(user) {
  const { data: profil } = await client
    .from("profils")
    .select("avatar")
    .eq("id", user.id)
    .single();
 
  window.location.href = profil && profil.avatar ? "Message.html" : "ChoixAvatar.html";
}
 
// Déjà connecté sur cet appareil ? On saute cette page.
(async () => {
  const { data: { session } } = await client.auth.getSession();
  if (session) allerSuite(session.user);
})();
 
// Se connecter : e-mail + mot de passe
formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const email = champEmail.value.trim();
  const password = champMotdepasse.value;
 
  if (!password) {
    resultat.textContent = "Entre ton mot de passe.";
    return;
  }
 
  boutonConnexion.disabled = true;
 
  const { data, error } = await client.auth.signInWithPassword({ email, password });
 
  boutonConnexion.disabled = false;
 
  if (error) {
    resultat.textContent = "Connexion impossible : " + error.message;
    return;
  }
 
  allerSuite(data.user);
});
 
// Créer un compte : prénom + e-mail + mot de passe
boutonInscription.addEventListener("click", async () => {
  const prenom = champPrenom.value.trim();
  const email = champEmail.value.trim();
  const password = champMotdepasse.value;
 
  if (!prenom || !email || password.length < 8) {
    resultat.textContent =
      "Pour créer un compte, remplis ton prénom, ton e-mail et un mot de passe d'au moins 8 caractères.";
    return;
  }
 
  boutonInscription.disabled = true;
 
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { prenom },   // le trigger SQL s'en sert pour créer le profil
      emailRedirectTo: new URL("Connexion.html", window.location.href).href
    }
  });
 
  boutonInscription.disabled = false;
 
  if (error) {
    resultat.textContent = "Inscription impossible : " + error.message;
    return;
  }
 
  // Pas de session = Supabase attend la confirmation par e-mail
  if (!data.session) {
    resultat.textContent =
      "Compte créé ! Ouvre ton e-mail et clique sur le lien de confirmation, puis connecte-toi.";
    return;
  }
 
  window.location.href = "ChoixAvatar.html";
});
 
// Mot de passe oublié : on envoie un lien vers la page de réinitialisation
boutonOublie.addEventListener("click", async () => {
  const email = champEmail.value.trim();
 
  if (!email) {
    resultat.textContent = "Écris d'abord ton e-mail, puis clique sur « Mot de passe oublié ».";
    return;
  }
 
  boutonOublie.disabled = true;
 
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("reinitialiser.html", window.location.href).href
  });
 
  boutonOublie.disabled = false;
 
  if (error) {
    resultat.textContent = "Impossible d'envoyer le lien : " + error.message;
    return;
  }
 
  resultat.textContent =
    "Si cet e-mail a un compte, un lien vient d'être envoyé. Ouvre-le pour choisir un nouveau mot de passe.";
});