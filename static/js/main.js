document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
});
/* * Wait until Clerk has loaded. */
// window.addEventListener("load", async function () { try { await Clerk.load(); console.log("Clerk loaded successfully"); /* * DOM elements */ const loginBtn = document.getElementById("loginBtn"); const userButton = document.getElementById("userButton"); const researchQuery = document.getElementById("researchQuery"); const researchBtn = document.getElementById("researchBtn"); const authMessage = document.getElementById("authMessage"); /* * ================================================= * UPDATE UI * ================================================= */ function updateAuthUI() { if (Clerk.isSignedIn) { /* * User is logged in */ loginBtn.style.display = "none"; userButton.style.display = "block"; researchQuery.disabled = false; researchBtn.disabled = false; authMessage.textContent = "You are ready to research"; /* * Mount Clerk user button */ Clerk.mountUserButton(userButton); } else { /* * User is NOT logged in */ loginBtn.style.display = "block"; userButton.style.display = "none"; researchQuery.disabled = true; researchBtn.disabled = true; authMessage.textContent = "Login to start researching"; } } /* * ================================================= * LOGIN * ================================================= */ loginBtn.addEventListener("click", function () { Clerk.openSignIn(); }); /* * ================================================= * AUTH STATE CHANGES * ================================================= */ Clerk.addListener(function () { updateAuthUI(); }); /* * Initial UI */ updateAuthUI(); /* * ================================================= * RESEARCH * ================================================= */ researchBtn.addEventListener("click", async function () { /* * Extra frontend protection */ if (!Clerk.isSignedIn) { Clerk.openSignIn(); return; } const query = researchQuery.value.trim(); if (!query) { alert("Please enter a research question."); return; } /* * Show loading */ document.getElementById("loading").style.display = "block"; document.getElementById("resultSection").style.display = "none"; researchBtn.disabled = true; try { /* * Get Clerk session token */ const token = await Clerk.session.getToken(); /* * Send request to Flask */ const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ query: query, depth: "deep", mode: "research" }) }); const data = await response.json(); if (!response.ok) { throw new Error(data.error || "Research request failed."); } /* * Display result */ const result = document.getElementById("researchResult"); if (typeof data.result === "object") { result.innerHTML = `<pre>${JSON.stringify(data.result, null, 2)}</pre>`; } else { result.innerHTML = data.result; } document.getElementById("resultSection").style.display = "block"; } catch (error) { console.error(error); alert(error.message || "Something went wrong."); } finally { document.getElementById("loading").style.display = "none"; researchBtn.disabled = !Clerk.isSignedIn; } }); } catch (error) { console.error("Clerk initialization failed:", error); } });

document.addEventListener(
  "DOMContentLoaded",
  () => {

    document
      .querySelectorAll(".protected-research")
      .forEach(button => {

        button.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            /*
             * Ask Clerk whether the user
             * is authenticated.
             */

            const authenticated =
              await window.DigSearchAuth.requireAuth();


            /*
             * User didn't login.
             */

            if (!authenticated) {

              return;

            }


            /*
             * User successfully authenticated.
             */

            window.location.href =
              "/research";

          }
        );

      });

  }
);