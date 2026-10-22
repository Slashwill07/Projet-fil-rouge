const formulaire = document.querySelector("form");
const prenom = document.querySelector("#prenom");

formulaire.addEventListener("submit", async function (event) {
  event.preventDefault();

  const valeur = prenom.value;

  const { data } = await client.from("amis").select("*").eq("prenom", valeur);
  if (data.length === 0) {
    await client.from("utilisateurs").insert([{ prenom: valeur }]);
  }

  window.location.href = "accueil.html";
});

