// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileLinks = document.querySelectorAll(".mobile-link");

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener("click", () => {
    if (mobileMenu.classList.contains("hidden")) {
      mobileMenu.classList.remove("hidden");
      mobileMenu.classList.add("flex");
    } else {
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.remove("flex");
    }
  });

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.remove("flex");
    });
  });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document
      .querySelector(a.getAttribute("href"))
      ?.scrollIntoView({ behavior: "smooth" });
  });
});
// Intersection observer for fade-up animations on scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("fade-up");
    });
  },
  { threshold: 0.1 },
);
document.querySelectorAll(".card-hover").forEach((el) => observer.observe(el));

// Devis Simulator Logic
const agentSlider = document.getElementById("agent-slider");
const agentCountVal = document.getElementById("agent-count-val");
const recommendedBadge = document.getElementById("recommended-badge");
const estimatedCost = document.getElementById("estimated-cost");
const modalSummary = document.getElementById("modal-summary");

function updatePricing() {
  const count = parseInt(agentSlider.value);
  agentCountVal.textContent = `${count} agent${count > 1 ? "s" : ""}`;

  let formula = "";
  let price = "";
  if (count <= 30) {
    formula = "Formule Starter";
    price = "49 000 FCFA";
  } else if (count <= 150) {
    formula = "Formule Pro";
    price = "120 000 FCFA";
  } else {
    formula = "Formule Enterprise";
    price = "Sur devis";
  }

  recommendedBadge.textContent = formula;
  estimatedCost.textContent = price;
  modalSummary.textContent = `${formula} (${count} agents) - ${price}/mois`;
}

if (agentSlider) {
  agentSlider.addEventListener("input", updatePricing);
  updatePricing();
}

// Modal Operations
const devisModal = document.getElementById("devis-modal");
function openDevisModal() {
  devisModal.classList.remove("hidden");
  setTimeout(() => {
    devisModal.classList.remove("opacity-0");
  }, 50);
}
function closeDevisModal() {
  devisModal.classList.add("opacity-0");
  setTimeout(() => {
    devisModal.classList.add("hidden");
    document.getElementById("devis-form").classList.remove("hidden");
    document.getElementById("devis-success").classList.add("hidden");
  }, 300);
}
function submitDevis(event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value;
  document.getElementById("success-email").textContent = email;
  document.getElementById("success-cost").textContent =
    estimatedCost.textContent;

  document.getElementById("devis-form").classList.add("hidden");
  document.getElementById("devis-success").classList.remove("hidden");
}
function downloadMockDevisPdf(e) {
  e.preventDefault();
  const companyName =
    document.querySelector('#devis-form input[type="text"]').value ||
    "Votre Entreprise";
  const agentCount = agentSlider.value;
  const cost = estimatedCost.textContent;
  const formula = recommendedBadge.textContent;

  let pdfText = `====================================================\n`;
  pdfText += `               DEVIS OFFICIEL - SIMPLETTAFF          \n`;
  pdfText += `====================================================\n`;
  pdfText += `Numéro : DEVIS-2026-0042\n`;
  pdfText += `Date   : ${new Date().toLocaleDateString("fr-FR")}\n`;
  pdfText += `Validité : 30 jours\n\n`;
  pdfText += `Destinataire :\n`;
  pdfText += `  Entreprise : ${companyName}\n\n`;
  pdfText += `Détails de l'offre :\n`;
  pdfText += `  - Formule : ${formula}\n`;
  pdfText += `  - Capacité : Jusqu'à ${agentCount} agents gérés\n`;
  pdfText += `  - Hébergement & Support inclus\n`;
  pdfText += `  - Configuration initiale : Offerte (Frais d'installation : 0 FCFA)\n\n`;
  pdfText += `----------------------------------------------------\n`;
  pdfText += `TOTAL MENSUEL : ${cost} / mois HT\n`;
  pdfText += `----------------------------------------------------\n\n`;
  pdfText += `Merci pour votre confiance.\n`;
  pdfText += `SimpleTaff Platform - www.simpletaff.ci\n`;
  pdfText += `====================================================\n`;

  const blob = new Blob([pdfText], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `devis_simpletaff_${companyName.toLowerCase().replace(/\s+/g, "_")}.txt`;
  link.click();
}
