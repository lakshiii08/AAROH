(() => {
  const base = (window.AAROH_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const api = (path) => `${base}/api/v1${path}`;
  const notice = document.getElementById("notice");
  const auth = window.AAROH_CONFIG || {};
  const hasCognito = Boolean(auth.cognitoDomain && auth.cognitoClientId);
  const redirectUri = `${window.location.origin}/`;
  let accessToken = "";
  const encode64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  async function signIn() {
    const verifier = encode64(crypto.getRandomValues(new Uint8Array(48)));
    const state = encode64(crypto.getRandomValues(new Uint8Array(24)));
    const challenge = encode64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    sessionStorage.setItem("aarohPkceVerifier", verifier);
    sessionStorage.setItem("aarohAuthState", state);
    const url = new URL(`${auth.cognitoDomain.replace(/\/$/, "")}/oauth2/authorize`);
    url.search = new URLSearchParams({ response_type: "code", client_id: auth.cognitoClientId, redirect_uri: redirectUri, scope: "openid email profile", state, code_challenge_method: "S256", code_challenge: challenge });
    window.location.assign(url);
  }
  async function initAuth() {
    const authGate = document.getElementById("auth-gate");
    if (authGate) authGate.hidden = true; // Always hide auth-gate by default so user can access directly
    if (!hasCognito) return;
    document.getElementById("signin").addEventListener("click", signIn);
    document.getElementById("signout").hidden = false;
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      console.warn("Sign-in notice:", params.get("error_description"));
    }
    if (params.has("code")) {
      const code = params.get("code");
      const verifier = sessionStorage.getItem("aarohPkceVerifier");
      if (verifier && params.get("state") === sessionStorage.getItem("aarohAuthState")) {
        try {
          const tokenResponse = await fetch(`${auth.cognitoDomain.replace(/\/$/, "")}/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: auth.cognitoClientId,
              redirect_uri: redirectUri,
              code,
              code_verifier: verifier,
            }),
          });
          const tokens = await tokenResponse.json();
          if (tokenResponse.ok && tokens.access_token) {
            sessionStorage.setItem("aarohAccessToken", tokens.access_token);
            sessionStorage.setItem("aarohAccessTokenExpires", String(Date.now() + tokens.expires_in * 1000));
          }
        } catch (e) {
          console.warn("Token exchange skipped:", e);
        }
        sessionStorage.removeItem("aarohPkceVerifier");
        sessionStorage.removeItem("aarohAuthState");
        history.replaceState({}, document.title, window.location.pathname);
      }
    }
    accessToken = sessionStorage.getItem("aarohAccessToken") || "";
    if (Number(sessionStorage.getItem("aarohAccessTokenExpires") || 0) < Date.now()) {
      accessToken = "";
      sessionStorage.removeItem("aarohAccessToken");
    }
  }
  document.getElementById("signout").addEventListener("click", () => {
    sessionStorage.clear();
    if (hasCognito) window.location.assign(`${auth.cognitoDomain.replace(/\/$/, "")}/logout?${new URLSearchParams({ client_id: auth.cognitoClientId, logout_uri: redirectUri })}`);
    else window.location.reload();
  });
  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let response = await fetch(api(path), { ...options, headers });
    // If backend reports token expired (401), automatically clear token and retry without stale header
    if (response.status === 401 && accessToken) {
      accessToken = "";
      sessionStorage.removeItem("aarohAccessToken");
      delete headers.Authorization;
      response = await fetch(api(path), { ...options, headers });
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
    return data;
  }
  function setNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle("error", error);
  }
  async function refresh() {
    const [analytics, pending] = await Promise.allSettled([
      request("/district/analytics/overview"), request("/district/interventions/pending")
    ]);
    if (analytics.status === "fulfilled") {
      const d = analytics.value.district_analytics;
      document.getElementById("district-name").textContent = d.district_name || d.district_code || "District overview";
      document.getElementById("district-state").textContent = d.state_name || "AAROH learning network";
      document.getElementById("schools").textContent = d.total_schools_monitored ?? "—";
      document.getElementById("students").textContent = d.total_enrolled_students ?? "—";
      document.getElementById("concepts").textContent = d.total_assessments_completed ?? "—";
    } else document.getElementById("district-name").textContent = "Could not load district";
    if (pending.status === "fulfilled") {
      const { interventions = [], total_pending_interventions = 0 } = pending.value;
      document.getElementById("pending").textContent = total_pending_interventions;
      const list = document.getElementById("interventions");
      list.replaceChildren();
      if (!interventions.length) list.innerHTML = '<p class="empty">No active support pathways right now.</p>';
      interventions.slice(0, 8).forEach((item) => {
        const row = document.createElement("div"); row.className = "intervention";
        const text = document.createElement("div");
        const name = document.createElement("b"); name.textContent = item.student_name || item.student_id || "Student";
        const meta = document.createElement("small"); meta.textContent = `${item.concept_code || "Learning concept"} · ${item.weak_bloom_level || "Support needed"}`;
        text.append(name, meta);
        const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = item.status || "In progress";
        row.append(text, tag); list.append(row);
      });
    } else document.getElementById("interventions").innerHTML = '<p class="empty">Unable to load pathways. Check the API connection.</p>';
  }
  document.getElementById("refresh").addEventListener("click", () => refresh().catch(() => {}));
  document.getElementById("pathway-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button"); button.disabled = true; setNotice("Creating a personalized learning pathway…");
    try { const result = await request("/district/interventions/generate-pathway", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); setNotice(`Pathway ${result.pathway_id} created with ${result.steps.length} steps.`); await refresh(); }
    catch (error) { setNotice(error.message, true); } finally { button.disabled = false; }
  });
  document.getElementById("advisory-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button"); button.disabled = true; setNotice("Preparing the family voice advisory…");
    try { const result = await request("/district/parent-advisory/send-voice-note", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); setNotice(`Advisory ${result.advisory_id} prepared (${result.dispatch_status}).`); }
    catch (error) { setNotice(error.message, true); } finally { button.disabled = false; }
  });
  const worksheetForm = document.getElementById("worksheet-form");
  worksheetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const status = document.getElementById("worksheet-status");
    const output = document.getElementById("worksheet-output");
    button.disabled = true;
    status.textContent = "Preparing the worksheet…";
    status.classList.remove("error");
    output.hidden = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      const worksheet = await request("/assessment/quizzes/generate", {
        method: "POST",
        body: JSON.stringify({ ...values, grade_level: Number(values.grade_level) }),
      });
      const questions = document.getElementById("worksheet-questions");
      questions.replaceChildren();
      worksheet.questions.forEach((question, index) => {
        const item = document.createElement("li");
        item.className = "worksheet-question";
        const prompt = document.createElement("p");
        prompt.textContent = question.question_text;
        item.append(prompt);
        if (question.question_type === "mcq") {
          const choices = document.createElement("div");
          choices.className = "worksheet-choices";
          (question.options || []).forEach((option, choiceIndex) => {
            const label = document.createElement("label");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = question.question_id;
            radio.value = String.fromCharCode(65 + choiceIndex);
            const choiceText = document.createElement("span");
            choiceText.textContent = option;
            label.append(radio, choiceText);
            choices.append(label);
          });
          item.append(choices);
        } else {
          const answer = document.createElement("textarea");
          answer.className = "theory-answer";
          answer.rows = 3;
          answer.setAttribute("aria-label", `Answer for question ${index + 1}`);
          item.append(answer);
        }
        questions.append(item);
      });
      const languageName = form.elements.target_language.selectedOptions[0].textContent;
      document.getElementById("worksheet-title").textContent = `${worksheet.concept_name} · ${languageName}`;
      output.setAttribute("lang", values.target_language === "sat" ? "sat-Olck" : values.target_language);
      output.hidden = false;
      status.textContent = "Worksheet ready. Theory answers are for the teacher to review.";
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("print-worksheet").addEventListener("click", () => window.print());
  initAuth().then(() => refresh()).catch((error) => setNotice(error.message, true));
})();
