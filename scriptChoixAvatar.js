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

console.log("Bonjour");

for (i = 1; i <= 10; i++) {
  avatarCourant = "avatar" + i
  console.log(avatarCourant);
  document.getElementById(avatarCourant).addEventListener("click", () => {
  definirAvatar(avatarCourant);
  });
}


/*let avatarUtilisateur;*/


async function definirAvatar(avatar) {
  //let avatarUtilisateur = avatar;
  const valeur = avatar.value;
  const { data } = await client.from("avatars").select("*").eq("avatar", valeur);
  if (data.length === 0) {
    await client.from("avatars").insert([{ avatar: valeur }]);
  }
  localStorage.setItem("avatarUtilisateur", avatar);
  console.log("fonction definirAvatar utilisee");
}