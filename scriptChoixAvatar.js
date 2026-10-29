let avatar1 = document.querySelector("#avatar1");
document.getElementById("avatar1").addEventListener("click", () => {
  definirAvatar(avatar1);
});
let avatar2 = document.querySelector("#avatar2");
document.getElementById("avatar2").addEventListener("click", () => {
  definirAvatar(avatar2);
});
let avatar3 = document.querySelector("#avatar3");
document.getElementById("avatar3").addEventListener("click", () => {
  definirAvatar(avatar3);
});
let avatar4 = document.querySelector("#avatar4");
document.getElementById("avatar4").addEventListener("click", () => {
  definirAvatar(avatar4);
});
let avatar5 = document.querySelector("#avatar5");
document.getElementById("avatar5").addEventListener("click", () => {
  definirAvatar(avatar5);
});
let avatar6 = document.querySelector("#avatar6");
document.getElementById("avatar6").addEventListener("click", () => {
  definirAvatar(avatar6);
});
let avatar7 = document.querySelector("#avatar7");
document.getElementById("avatar7").addEventListener("click", () => {
  definirAvatar(avatar7);
});
let avatar8 = document.querySelector("#avatar8");
document.getElementById("avatar8").addEventListener("click", () => {
  definirAvatar(avatar8);
});
let avatar9 = document.querySelector("#avatar9");
document.getElementById("avatar9").addEventListener("click", () => {
  definirAvatar(avatar9);
});
let avatar10 = document.querySelector("#avatar10");
document.getElementById("avatar10").addEventListener("click", () => {
  definirAvatar(avatar10);
});

console.log("Bonjour");

/*for (i = 1; i <= 10; i++) {
  avatarCourant = "avatar" + i
  console.log(avatarCourant);
  document.getElementById(avatarCourant).addEventListener("click", () => {
  definirAvatar(avatarCourant);
  });
}*/


/*let avatarUtilisateur;*/


async function definirAvatar(avatar) {
  //let avatarUtilisateur = avatar;
  const valeur = avatar.src;
  console.log(avatar);
  const { data } = await client.from("avatars").select("*").eq("avatar", valeur);
  if (data.length === 0) {
    await client.from("avatars").insert([{ avatar: valeur }]);
  }
  localStorage.setItem("avatarUtilisateur", avatar);
  console.log("fonction definirAvatar utilisee");
}

//Questions pour le prof : 
//1. Est-ce que le fait que le lien vers les images soit local à mon ordi c'est problématique ? 
// qu'est-ce qu'y faut faire sinon ?
//2. Est-ce qu'on est obligés de garder mot de passe ou pas ?