const formulaire = document.querySelector("#formulaire");
const champPrenom = document.querySelector("#prenom");
const champEmail = document.querySelector("#email");
const bouton = document.querySelector("#envoyer");
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
 
// Quand l'enfant clique sur le lien reçu par e-mail, il revient sur cette page
// avec une session : supabase-js la lit dans l'adresse, et on passe à la suite.
(async () => {
  const { data: { session } } = await client.auth.getSession();
  if (session) allerSuite(session.user);
})();
 
// On envoie le lien de connexion (le compte est créé si c'est la première fois)
formulaire.addEventListener("submit", async (event) => {
  event.preventDefault();
 
  const email = champEmail.value.trim();
  const prenom = champPrenom.value.trim();
 
  bouton.disabled = true;
 
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { prenom },                                          // sert à créer le profil
      emailRedirectTo: new URL("connexion.html", window.location.href).href
    }
  });
 
  bouton.disabled = false;
 
  if (error) {
    resultat.textContent = "Impossible d'envoyer le lien : " + error.message;
    return;
  }
 
  resultat.textContent =
    "Lien envoyé ! Ouvre ton e-mail (regarde aussi dans les indésirables) et clique sur le lien.";
});