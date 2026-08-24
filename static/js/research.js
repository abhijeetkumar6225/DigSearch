document.addEventListener("DOMContentLoaded", () => {

  // =========================================================
  // DOM ELEMENTS
  // =========================================================

  const queryInput = document.getElementById("researchQuery");
  const charCount = document.getElementById("charCount");
  const researchBtn = document.getElementById("researchBtn");

  const inputView = document.getElementById("researchInputView");
  const loadingView = document.getElementById("loadingView");
  const reportView = document.getElementById("reportView");

  const errorBox = document.getElementById("errorBox");
  const errorMessage = document.getElementById("errorMessage");

  const retryBtn = document.getElementById("retryBtn");
  const newResearchBtn = document.getElementById("newResearchBtn");

  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const reportTitle = document.getElementById("reportTitle");
  const reportQuery = document.getElementById("reportQuery");
  const reportContent = document.getElementById("reportContent");
  const sourcesList = document.getElementById("sourcesList");

  const loadingMessage = document.getElementById("loadingMessage");


  // =========================================================
  // CHECK PAGE
  // =========================================================

  if (!queryInput) {
    console.error(
      "DigSearch: researchQuery element not found."
    );

    return;
  }


  // =========================================================
  // STATE
  // =========================================================

  let lastQuery = "";
  let lastReportText = "";


  // =========================================================
  // CHARACTER COUNT
  // =========================================================

  queryInput.addEventListener(
    "input",
    () => {

      charCount.textContent =
        `${queryInput.value.length} / 10000`;

    }
  );


  // =========================================================
  // SUGGESTIONS
  // =========================================================

  document
    .querySelectorAll(".suggestion")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          queryInput.value =
            button.dataset.query || "";

          queryInput.dispatchEvent(
            new Event("input")
          );

          queryInput.focus();

        }
      );

    });


  // =========================================================
  // RESEARCH BUTTON
  // =========================================================

  researchBtn.addEventListener(
    "click",
    () => startResearch()
  );


  // =========================================================
  // CTRL + ENTER
  // =========================================================

  queryInput.addEventListener(
    "keydown",
    event => {

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
      ) {

        event.preventDefault();

        startResearch();

      }

    }
  );


  // =========================================================
  // RETRY
  // =========================================================

  retryBtn.addEventListener(
    "click",
    () => {

      if (lastQuery) {
        startResearch(lastQuery);
      }

    }
  );


  // =========================================================
  // NEW RESEARCH
  // =========================================================

  newResearchBtn.addEventListener(
    "click",
    () => {

      reportView.classList.add("hidden");

      errorBox.classList.add("hidden");

      inputView.classList.remove("hidden");

      queryInput.value = "";

      queryInput.dispatchEvent(
        new Event("input")
      );

      queryInput.focus();

    }
  );


  // =========================================================
  // COPY REPORT
  // =========================================================

  copyBtn.addEventListener(
    "click",
    async () => {

      if (!lastReportText) {
        return;
      }

      try {

        await navigator.clipboard.writeText(
          lastReportText
        );

        copyBtn.textContent = "Copied";

        setTimeout(
          () => {
            copyBtn.textContent = "Copy";
          },
          1500
        );

      } catch {

        showError(
          "Unable to copy the report."
        );

      }

    }
  );


  // =========================================================
  // DOWNLOAD REPORT
  // =========================================================

  downloadBtn.addEventListener(
    "click",
    () => {

      if (!lastReportText) {
        return;
      }

      const blob = new Blob(
        [lastReportText],
        {
          type: "text/markdown;charset=utf-8"
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "digsearch-report.md";

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);

    }
  );


  // =========================================================
  // START RESEARCH
  // =========================================================

  async function startResearch(
    forcedQuery = null
  ) {

    const query = (
      forcedQuery ||
      queryInput.value
    ).trim();


    // -------------------------------------------------------
    // EMPTY QUERY
    // -------------------------------------------------------

    if (!query) {

      showError(
        "Please enter a research question."
      );

      return;

    }


    // -------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------

    if (
      !window.DigSearchAuth ||
      !window.DigSearchAuth.requireAuth
    ) {

      showError(
        "Authentication system is not loaded."
      );

      console.error(
        "DigSearchAuth is unavailable."
      );

      return;

    }


    const authenticated =
      await window.DigSearchAuth.requireAuth();


    if (!authenticated) {
      return;
    }


    // -------------------------------------------------------
    // SAVE QUERY
    // -------------------------------------------------------

    lastQuery = query;


    // -------------------------------------------------------
    // LOADING UI
    // -------------------------------------------------------

    hideAll();

    loadingView.classList.remove(
      "hidden"
    );

    loadingMessage.textContent =
      "Your question is being investigated by the DigSearch multi-agent research pipeline.";

    researchBtn.disabled = true;


    try {

      // -----------------------------------------------------
      // GET CLERK TOKEN
      // -----------------------------------------------------

      const token =
        await window.DigSearchAuth.getToken();


      if (!token) {

        throw new Error(
          "Unable to obtain authentication token."
        );

      }


      // -----------------------------------------------------
      // API REQUEST
      // -----------------------------------------------------

      const response =
        await fetch(
          "/api/research",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${token}`

            },

            body: JSON.stringify({

              query: query

            })

          }
        );


      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      const data =
        await response
          .json()
          .catch(() => ({}));


      // -----------------------------------------------------
      // UNAUTHORIZED
      // -----------------------------------------------------

      if (response.status === 401) {

        showError(
          "Your session has expired. Please login again."
        );

        return;

      }


      // -----------------------------------------------------
      // OTHER ERRORS
      // -----------------------------------------------------

      if (
        !response.ok ||
        data.success === false
      ) {

        throw new Error(
          data.error ||
          "Something went wrong while researching."
        );

      }


      // -----------------------------------------------------
      // RENDER RESULT
      // -----------------------------------------------------

      renderReport(
        data,
        query
      );


    } catch (error) {

      console.error(
        "Research error:",
        error
      );

      loadingView.classList.add(
        "hidden"
      );

      errorBox.classList.remove(
        "hidden"
      );

      errorMessage.textContent =
        error.message ||
        "Unable to connect to DigSearch.";


    } finally {

      researchBtn.disabled = false;

    }

  }


  // =========================================================
  // RENDER REPORT
  // =========================================================

  function renderReport(
    data,
    query
  ) {

    hideAll();

    reportView.classList.remove(
      "hidden"
    );


    // =======================================================
    // PIPELINE RESULT
    // =======================================================

    const result =
      data.result || {};


    reportQuery.textContent =
      query;


    reportTitle.textContent =
      "Research Report";


    // =======================================================
    // IMPORTANT:
    //
    // Your pipeline.py returns:
    //
    // state["report"]
    // state["feedback"]
    // state["search_results"]
    // state["scraped_content"]
    //
    // Therefore we display result.report.
    // =======================================================

    const content =
      result.report ||
      result.content ||
      result.answer ||
      result.summary ||
      data.report ||
      data.content ||
      "";


    // =======================================================
    // SAVE RAW REPORT
    // =======================================================

    lastReportText =
      typeof content === "string"
        ? content
        : JSON.stringify(
          content,
          null,
          2
        );


    // =======================================================
    // DISPLAY REPORT
    // =======================================================

    reportContent.innerHTML =
      formatResearchContent(
        content
      );


    // =======================================================
    // SOURCES
    // =======================================================

    renderSources(
      result.sources ||
      data.sources ||
      []
    );


    // =======================================================
    // OPTIONAL CRITIC FEEDBACK
    // =======================================================

    if (result.feedback) {

      console.log(
        "Critic feedback:",
        result.feedback
      );

      renderCriticReport(
        result.feedback
      );

    } else {

      console.warn(
        "No critic feedback returned by API."
      );

    }

  }


  // =========================================================
  // FORMAT CONTENT
  // =========================================================

  function formatResearchContent(
    content
  ) {

    if (!content) {

      return `
        <p class="muted">
          The research pipeline returned
          no displayable report.
        </p>
      `;

    }


    if (
      typeof content !== "string"
    ) {

      return `
        <pre>
${escapeHtml(
        JSON.stringify(
          content,
          null,
          2
        )
      )}
        </pre>
      `;

    }


    return content

      .split(/\n{2,}/)

      .map(block => {

        const text =
          block.trim();


        if (!text) {
          return "";
        }


        if (
          text.startsWith("### ")
        ) {

          return `
            <h3>
              ${escapeHtml(
            text.slice(4)
          )}
            </h3>
          `;

        }


        if (
          text.startsWith("## ")
        ) {

          return `
            <h2>
              ${escapeHtml(
            text.slice(3)
          )}
            </h2>
          `;

        }


        if (
          text.startsWith("# ")
        ) {

          return `
            <h1>
              ${escapeHtml(
            text.slice(2)
          )}
            </h1>
          `;

        }


        if (
          /^[-*]\s/.test(text)
        ) {

          const items =
            text
              .split("\n")
              .filter(
                line =>
                  /^[-*]\s/.test(line)
              )
              .map(
                line =>
                  `<li>${escapeHtml(
                    line.replace(
                      /^[-*]\s/,
                      ""
                    )
                  )}</li>`
              )
              .join("");


          return `<ul>${items}</ul>`;

        }


        return `
          <p>
            ${escapeHtml(text)
            .replace(
              /\n/g,
              "<br>"
            )}
          </p>
        `;

      })

      .join("");

  }


  // =========================================================
  // SOURCES
  // =========================================================

  function renderSources(
    sources
  ) {

    if (
      !Array.isArray(sources) ||
      sources.length === 0
    ) {

      sourcesList.innerHTML = `
        <p class="muted">
          Sources are included in the
          research pipeline output.
        </p>
      `;

      return;

    }


    sourcesList.innerHTML =
      sources
        .map(source => {

          if (
            typeof source === "string"
          ) {

            return `
              <a
                class="source-card"
                href="${safeUrl(source)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>
                  ${escapeHtml(source)}
                </strong>
              </a>
            `;

          }


          const url =
            source.url ||
            source.link ||
            "#";

          const title =
            source.title ||
            source.name ||
            "Research source";

          const domain =
            source.domain ||
            extractDomain(url);

          const snippet =
            source.snippet ||
            source.description ||
            "";


          return `
            <a
              class="source-card"
              href="${safeUrl(url)}"
              target="_blank"
              rel="noopener noreferrer"
            >

              <strong>
                ${escapeHtml(title)}
              </strong>

              <span class="source-domain">
                ${escapeHtml(domain)}
              </span>

              ${snippet
              ? `
                    <div class="source-snippet">
                      ${escapeHtml(snippet)}
                    </div>
                  `
              : ""
            }

            </a>
          `;

        })
        .join("");

  }

  // =========================================================
// CRITIC REPORT
// =========================================================

function renderCriticReport(feedback) {

  const criticContainer =
    document.getElementById(
      "critic-report-content"
    );

  const criticScore =
    document.getElementById(
      "critic-score"
    );


  // -------------------------------------------------------
  // Check container
  // -------------------------------------------------------

  if (!criticContainer) {

    console.error(
      "critic-report-content element not found."
    );

    return;

  }


  // -------------------------------------------------------
  // Convert feedback to string
  // -------------------------------------------------------

  let criticText = "";


  if (
    typeof feedback === "string"
  ) {

    criticText = feedback;

  }

  else if (
    feedback &&
    typeof feedback.content === "string"
  ) {

    criticText = feedback.content;

  }

  else {

    criticText =
      JSON.stringify(
        feedback,
        null,
        2
      );

  }


  console.log(
    "Rendering critic report:",
    criticText
  );


  // -------------------------------------------------------
  // Extract score
  // Example:
  //
  // Score: 7/10
  // Score: 8.5/10
  // -------------------------------------------------------

  const scoreMatch =
    criticText.match(
      /Score\s*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i
    );


  if (
    scoreMatch &&
    criticScore
  ) {

    criticScore.textContent =
      scoreMatch[1];

  }


  // -------------------------------------------------------
  // Render critic content
  // -------------------------------------------------------

  criticContainer.innerHTML = `

    <div class="critic-markdown">

      ${formatCriticContent(
        criticText
      )}

    </div>

  `;

}

// =========================================================
// FORMAT CRITIC CONTENT
// =========================================================

function formatCriticContent(
  content
) {

  if (!content) {

    return `
      <p class="muted">
        No critic review was returned.
      </p>
    `;

  }


  return content

    .split(/\n{2,}/)

    .map(block => {

      const text =
        block.trim();


      if (!text) {
        return "";
      }


      // ---------------------------------------------------
      // H1
      // ---------------------------------------------------

      if (
        text.startsWith("# ")
      ) {

        return `
          <h1>
            ${escapeHtml(
              text.slice(2)
            )}
          </h1>
        `;

      }


      // ---------------------------------------------------
      // H2
      // ---------------------------------------------------

      if (
        text.startsWith("## ")
      ) {

        return `
          <h2>
            ${escapeHtml(
              text.slice(3)
            )}
          </h2>
        `;

      }


      // ---------------------------------------------------
      // H3
      // ---------------------------------------------------

      if (
        text.startsWith("### ")
      ) {

        return `
          <h3>
            ${escapeHtml(
              text.slice(4)
            )}
          </h3>
        `;

      }


      // ---------------------------------------------------
      // BULLET LIST
      // ---------------------------------------------------

      const lines =
        text.split("\n");


      const bulletLines =
        lines.filter(
          line =>
            /^\s*[-*]\s+/.test(
              line
            )
        );


      if (
        bulletLines.length > 0 &&
        bulletLines.length === lines.length
      ) {

        return `
          <ul>

            ${bulletLines
              .map(
                line => `
                  <li>
                    ${escapeHtml(
                      line.replace(
                        /^\s*[-*]\s+/,
                        ""
                      )
                    )}
                  </li>
                `
              )
              .join("")}

          </ul>
        `;

      }


      // ---------------------------------------------------
      // NORMAL PARAGRAPH
      // ---------------------------------------------------

      return `
        <p>
          ${escapeHtml(text)
            .replace(
              /\n/g,
              "<br>"
            )}
        </p>
      `;

    })

    .join("");

}


  // =========================================================
  // HIDE ALL
  // =========================================================

  function hideAll() {

    inputView.classList.add(
      "hidden"
    );

    loadingView.classList.add(
      "hidden"
    );

    reportView.classList.add(
      "hidden"
    );

    errorBox.classList.add(
      "hidden"
    );

  }


  // =========================================================
  // ERROR
  // =========================================================

  function showError(
    message
  ) {

    loadingView.classList.add(
      "hidden"
    );

    errorBox.classList.remove(
      "hidden"
    );

    errorMessage.textContent =
      message;

  }


  // =========================================================
  // ESCAPE HTML
  // =========================================================

  function escapeHtml(
    value
  ) {

    return String(value)

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }


  // =========================================================
  // SAFE URL
  // =========================================================

  function safeUrl(
    value
  ) {

    try {

      const url =
        new URL(
          value,
          window.location.origin
        );


      if (
        ![
          "http:",
          "https:"
        ].includes(
          url.protocol
        )
      ) {

        return "#";

      }


      return url.href;

    } catch {

      return "#";

    }

  }


  // =========================================================
  // DOMAIN
  // =========================================================

  function extractDomain(
    value
  ) {

    try {

      return new URL(
        value
      ).hostname;

    } catch {

      return "";

    }

  }

});

function switchResultTab(tab) {
  // Get all tabs
  const tabs = document.querySelectorAll(".result-tab");

  // Get all result panels
  const panels = document.querySelectorAll(".result-panel");


  // Remove active state from every tab
  tabs.forEach(button => {
    button.classList.remove("active");
  });


  // Hide every result panel
  panels.forEach(panel => {
    panel.classList.remove("active");
  });


  // Activate the selected tab
  const selectedTab = document.querySelector(
    `.result-tab[data-tab="${tab}"]`
  );

  if (selectedTab) {
    selectedTab.classList.add("active");
  }


  // Show the selected panel
  const selectedPanel = document.getElementById(
    `${tab}-result`
  );

  if (selectedPanel) {
    selectedPanel.classList.add("active");
  }
}