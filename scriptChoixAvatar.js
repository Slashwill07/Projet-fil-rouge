// Enregistre l'avatar choisi dans la table profils.
async function choisirAvatar(nomAvatar) {
  const { data: { user } } = await client.auth.getUser();
 
  if (!user) {
    window.location.href = "Connexion.html";
    return;
  }
 
  const { error } = await client.from("profils").upsert({
    id: user.id,
    prenom: user.user_metadata?.prenom || "Ami",
    avatar: nomAvatar
  });
 
  if (error) {
    console.error(error);
    alert("Impossible d'enregistrer ton avatar : " + error.message);
    return;
  }
 
  window.location.href = "Message.html";
}
 
// Une seule boucle pour les 10 avatars (id = avatar1 ... avatar10)
document.querySelectorAll("input[type='image']").forEach((image) => {
  image.addEventListener("click", (event) => {
    event.preventDefault(); // empêche l'envoi du formulaire
    choisirAvatar(image.id);
  });
});
//Questions pour le prof : 
//1. Est-ce que le fait que le lien vers les images soit local à mon ordi c'est problématique ? 
// qu'est-ce qu'y faut faire sinon ?
//2. adresse mail obligatoire ? c'est plus simple donc go utiliser ça
//3. Est-ce qu'on est obligés de garder mot de passe ou pas ?