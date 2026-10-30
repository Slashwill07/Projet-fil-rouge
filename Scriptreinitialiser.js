const formulaire = document.querySelector("#formulaire");
const champMotdepasse = document.querySelector("#motdepasse");
const champConfirmation = document.querySelector("#confirmation");
const bouton = document.querySelector("#enregistrer");
const resultat = document.querySelector("#resultat");
 
// Le lien reçu par e-mail ouvre cette page avec une session temporaire :
// supabase-js la lit dans l'adresse. Sans session, le lien est invalide ou expiré.
(async () => {
  const { data: { session } } = await client.auth.getSession();
 
  if (!session) {
    formulaire.style.display = "none";
    resultat.textContent =
      "Ce lien est invalide ou a expiré. Retourne à la connexion et clique de nouveau sur « Mot de passe oublié ».";
  }
})();
 
formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const motdepasse = champMotdepasse.value;
 
  if (motdepasse.length < 8) {
    resultat.textContent = "Le mot de passe doit avoir au moins 8 caractères.";
    return;
  }
 
  if (motdepasse !== champConfirmation.value) {
    resultat.textContent = "Les deux mots de passe ne sont pas identiques.";
    return;
  }
 
  bouton.disabled = true;
 
  const { error } = await client.auth.updateUser({ password: motdepasse });
 
  bouton.disabled = false;
 
  if (error) {
    resultat.textContent = "Impossible de changer le mot de passe : " + error.message;
    return;
  }
 
  resultat.textContent = "Mot de passe changé !";
  window.location.href = "Connexion.html";
});