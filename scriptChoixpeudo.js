console.log("Bonjour");

let avatarSelectionne = null;

for (let i = 1; i <= 10; i++) {
  const avatarCourant = "avatar" + i;
  const elementAvatar = document.getElementById(avatarCourant);

  if (elementAvatar) {
    elementAvatar.style.cursor = "pointer";

    elementAvatar.addEventListener("click", () => {
      definirAvatar(avatarCourant);
    });
  }
}

function definirAvatar(avatar) {
  avatarSelectionne = avatar;

  localStorage.setItem("avatarUtilisateur", avatar);

  // Retirer la sélection précédente
  document.querySelectorAll("#choixAvatars img").forEach((image) => {
    image.style.border = "none";
  });

  // Mettre une bordure sur l'avatar choisi
  document.getElementById(avatar).style.border = "3px solid green";

  console.log("Avatar sélectionné :", avatar);
}

document.getElementById("formConnexion").addEventListener("submit", (event) => {
  event.preventDefault();

  const prenom = document.getElementById("prenom").value.trim();

  if (!prenom) {
    alert("Entre ton prénom !");
    return;
  }

  if (!avatarSelectionne) {
    alert("Choisis un avatar avant de continuer !");
    return;
  }

  localStorage.setItem("prenomUtilisateur", prenom);

  window.location.href = "accueil.html";
});
```
