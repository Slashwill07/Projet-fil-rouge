
console.log("Bonjour");

for (i = 1; i <= 10; i++) {
  avatarCourant = "avatar" + i
  document.getElementById(avatarCourant).addEventListener("click", () => {
  definirAvatar(avatarCourant);
  });
  i++
}


/*let avatarUtilisateur;*/
let avatar1 = document.querySelector("#avatar1");
let avatar2 = document.querySelector("#avatar2");
let avatar3 = document.querySelector("#avatar3");
let avatar4 = document.querySelector("#avatar4");
let avatar5 = document.querySelector("#avatar5");
let avatar6 = document.querySelector("#avatar6");
let avatar7 = document.querySelector("#avatar7");
let avatar8 = document.querySelector("#avatar8");
let avatar9 = document.querySelector("#avatar9");
let avatar10 = document.querySelector("#avatar10");

function definirAvatar(avatar) {
  //let avatarUtilisateur = avatar;
  localStorage.setItem("avatarUtilisateur", avatar);
  alert("fonction definirAvatar utilisee");
}