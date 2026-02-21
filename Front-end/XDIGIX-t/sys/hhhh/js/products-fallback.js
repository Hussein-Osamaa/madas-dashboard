// Fallback non-module version
console.log("Fallback products script loaded");

// Check if Firebase is available globally
if (typeof firebase !== "undefined") {
  console.log("Firebase available globally");
} else {
  console.log("Firebase not available globally");
}

// Basic DOM check
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in fallback script");

  const elements = ["productsGrid", "productModal", "addProductBtn"];
  elements.forEach((id) => {
    const element = document.getElementById(id);
    console.log(`${id}: ${element ? "FOUND" : "NOT FOUND"}`);
  });
});

// Test function
window.testFallbackScript = function () {
  alert("Fallback script is working!");
  console.log("Fallback test function called");
};
