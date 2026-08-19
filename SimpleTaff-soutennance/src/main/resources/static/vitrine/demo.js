let currentStep = 1;
function showStep(step) {
  currentStep = step;
  document
    .querySelectorAll(".step-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".step-content")
    .forEach((c) => c.classList.add("hidden"));

  document.getElementById(`btn-${step}`).classList.add("active");
  document.getElementById(`step-${step}-content`).classList.remove("hidden");
}

function nextStep() {
  let next = currentStep + 1;
  if (next > 5) next = 1;
  showStep(next);
}

// Demo Pricing functions
function updateDemoPricing() {
  const slider = document.getElementById("demo-agent-slider");
  const agentVal = document.getElementById("demo-agent-val");
  const formulaBadge = document.getElementById("demo-formula-badge");
  const priceVal = document.getElementById("demo-price-val");

  const count = parseInt(slider.value);
  agentVal.textContent = `${count} agent${count > 1 ? "s" : ""}`;

  if (count <= 30) {
    formulaBadge.textContent = "Formule Starter";
    priceVal.textContent = "49 000 FCFA";
  } else if (count <= 150) {
    formulaBadge.textContent = "Formule Pro";
    priceVal.textContent = "120 000 FCFA";
  } else {
    formulaBadge.textContent = "Formule Enterprise";
    priceVal.textContent = "Sur devis";
  }
}

function generateDemoQuote() {
  const companyName = document.getElementById("demo-company").value.trim();
  if (!companyName) {
    alert("Veuillez entrer le nom de votre entreprise.");
    return;
  }
  document.getElementById("demo-quote-form").classList.add("hidden");
  document.getElementById("demo-quote-result").classList.remove("hidden");
}

function downloadDemoQuoteTxt() {
  const companyName =
    document.getElementById("demo-company").value.trim() || "Entreprise Démo";
  const slider = document.getElementById("demo-agent-slider");
  const count = slider.value;
  const formulaBadge =
    document.getElementById("demo-formula-badge").textContent;
  const priceVal = document.getElementById("demo-price-val").textContent;

  let pdfText = `====================================================\n`;
  pdfText += `       DEVIS ESTIMATIF DE SIMULATION - SIMPLETTAFF   \n`;
  pdfText += `====================================================\n`;
  pdfText += `Numéro : DEVIS-DEMO-9918\n`;
  pdfText += `Date   : ${new Date().toLocaleDateString("fr-FR")}\n\n`;
  pdfText += `Entreprise Cliente : ${companyName}\n\n`;
  pdfText += `Configuration simulée :\n`;
  pdfText += `  - Formule choisie : ${formulaBadge}\n`;
  pdfText += `  - Effectif d'agents estimés : ${count} agents\n`;
  pdfText += `  - Statut : Validation requise par le service commercial\n\n`;
  pdfText += `----------------------------------------------------\n`;
  pdfText += `COUT MENSUEL SIMULÉ : ${priceVal} / mois\n`;
  pdfText += `----------------------------------------------------\n\n`;
  pdfText += `Ce document est une simulation interactive.\n`;
  pdfText += `SimpleTaff Platform - www.simpletaff.ci\n`;
  pdfText += `====================================================\n`;

  const blob = new Blob([pdfText], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `devis_simulation_${companyName.toLowerCase().replace(/\s+/g, "_")}.txt`;
  link.click();
}
