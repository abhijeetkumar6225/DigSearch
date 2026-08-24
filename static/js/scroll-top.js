document.addEventListener("DOMContentLoaded", () => {

  const scrollButton =
    document.getElementById("scrollTopButton");

  const progressCircle =
    document.getElementById("scrollProgress");

  if (!scrollButton || !progressCircle) {
    return;
  }


  // =========================================================
  // CIRCLE SETUP
  // =========================================================

  const radius = 21;

  const circumference =
    2 * Math.PI * radius;

  progressCircle.style.strokeDasharray =
    circumference;

  progressCircle.style.strokeDashoffset =
    circumference;


  // =========================================================
  // UPDATE SCROLL PROGRESS
  // =========================================================

  function updateScrollProgress() {

    const scrollTop =
      window.scrollY;

    const documentHeight =
      document.documentElement.scrollHeight;

    const viewportHeight =
      window.innerHeight;


    const scrollableHeight =
      documentHeight - viewportHeight;


    let progress = 0;

    if (scrollableHeight > 0) {

      progress =
        scrollTop / scrollableHeight;

    }


    progress =
      Math.min(
        Math.max(progress, 0),
        1
      );


    // Update circular progress
    progressCircle.style.strokeDashoffset =
      circumference * (1 - progress);


    // =====================================================
    // SHOW / HIDE BUTTON
    // =====================================================

    if (scrollTop > 150) {

      scrollButton.classList.add("visible");

    } else {

      scrollButton.classList.remove("visible");

    }

  }


  // =========================================================
  // SCROLL TO TOP
  // =========================================================

  scrollButton.addEventListener(
    "click",
    () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );


  // =========================================================
  // SCROLL EVENT
  // =========================================================

  window.addEventListener(
    "scroll",
    updateScrollProgress,
    {
      passive: true
    }
  );


  // Initial state
  updateScrollProgress();

});