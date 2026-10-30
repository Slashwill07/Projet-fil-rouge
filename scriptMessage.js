let listeConversations = document.querySelector("#conversations");
let titreConversation = document.querySelector("#titre-conversation");
let fil = document.querySelector("#fil");
const formulaireMessage = document.querySelector("#form-message");
const champMessage = document.querySelector("#texte-message");
const statutMessage = document.querySelector("#statut-message");

document.getElementById("listeConversations").addEventListener("click", () => {
  changerConversation(conversation);
});

document.getElementById("titreConversation")
});


document.getElementById("champMessage").addEventListener("click", () => {
  envoyerMessage(champMessage);
});

async function changerConversation(nouvelleConversation) {
  titreConversation = nouvelleConversation.titre-conv;

}

async function envoyerMessage(texte) {
  formulaireMessage.
}