// Chuka Student Marketplace - student sign-in UI (email code).
// Depends on: api.js (authStart/authVerify/authLogout). The page works fine signed out.

let currentUser = null; // { email } when signed in, otherwise null
let pendingAfterSignIn = null; // function to run once the student signs in (e.g. reopen a product)

function signInEls() {
  return {
    overlay: document.getElementById("signInModalOverlay"),
    emailForm: document.getElementById("signInEmailForm"),
    codeForm: document.getElementById("signInCodeForm"),
    email: document.getElementById("signInEmail"),
    code: document.getElementById("signInCode"),
    emailError: document.getElementById("signInEmailError"),
    codeError: document.getElementById("signInCodeError"),
    sent: document.getElementById("signInSent")
  };
}

function setFormError(el, message) {
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function setSignInStep(step) {
  const { emailForm, codeForm, email, code } = signInEls();
  emailForm.hidden = step !== "email";
  codeForm.hidden = step !== "code";
  (step === "email" ? email : code).focus();
}

function openSignInModal(trigger, afterSignIn) {
  const { overlay, emailError, codeError, code } = signInEls();
  if (!overlay) return;
  if (typeof sharedMode !== "undefined" && !sharedMode) {
    showToast("Sign-in needs the shared marketplace, which is not connected right now.", "info");
    return;
  }
  pendingAfterSignIn = typeof afterSignIn === "function" ? afterSignIn : null;
  rememberFocus(trigger instanceof Element ? trigger : null);
  setFormError(emailError, "");
  setFormError(codeError, "");
  code.value = "";
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  setSignInStep("email");
}

function closeSignInModal() {
  const { overlay } = signInEls();
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  pendingAfterSignIn = null;
  restoreFocus();
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  btn.disabled = busy;
  if (busy) btn.setAttribute("aria-busy", "true");
  else btn.removeAttribute("aria-busy");
  const span = btn.querySelector("span");
  if (span && label) span.textContent = label;
}

function renderAccountUI() {
  const signedIn = !!currentUser;
  const name = signedIn ? currentUser.email : "Guest";
  const note = signedIn ? (currentUser.student ? "Verified Chuka student" : "Signed in") : "Browsing as guest";
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("accountUserName", name);
  set("accountUserNote", note);
  set("mobileProfileName", name);
  set("mobileProfileNote", note);
  set("mobileSignInLabel", signedIn ? "Sign out" : "Sign in");

  const signIn = document.getElementById("accountSignInBtn");
  const signOut = document.getElementById("accountSignOutBtn");
  if (signIn) signIn.hidden = signedIn;
  if (signOut) signOut.hidden = !signedIn;

  const avatar = document.querySelector(".mobile-profile-avatar");
  if (avatar) avatar.textContent = signedIn ? currentUser.email[0].toUpperCase() : "G";

  // The sell form nudges guests to sign in (only meaningful when the shared backend is on).
  const note2 = document.getElementById("postSignInNote");
  if (note2) note2.hidden = signedIn || (typeof sharedMode !== "undefined" && !sharedMode);
}

async function signOut() {
  await authLogout();
  currentUser = null;
  renderAccountUI();
  await loadListings(); // contact numbers are hidden again
  showToast("You have been signed out.", "info");
}

function handleAccountAuthButton(trigger) {
  if (currentUser) signOut();
  else openSignInModal(trigger);
}

function initAccountUI() {
  const { overlay, emailForm, codeForm, email, code, emailError, codeError, sent } = signInEls();
  if (!overlay) return;

  document.getElementById("closeSignInBtn").addEventListener("click", closeSignInModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSignInModal(); });

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", (e) => { e.preventDefault(); fn(e.currentTarget); });
  };
  bind("accountSignInBtn", (el) => { closeAccountMenu(); openSignInModal(el); });
  bind("accountSignOutBtn", () => { closeAccountMenu(); signOut(); });
  bind("postSignInLink", (el) => { closePostModal(); openSignInModal(el, () => openPostModal()); });
  bind("signInBackBtn", () => setSignInStep("email"));

  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormError(emailError, "");
    const value = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFormError(emailError, "Enter a valid email address.");
      email.focus();
      return;
    }
    const btn = document.getElementById("signInEmailBtn");
    setBusy(btn, true, "Sending…");
    const res = await authStart(value);
    setBusy(btn, false, "Email me a code");
    if (!res.ok) {
      setFormError(emailError, res.message || (res.error === "not_configured"
        ? "Sign-in is not set up yet. Please try again later."
        : "Could not send the code. Please try again."));
      return;
    }
    sent.textContent = `We sent a 6-digit code to ${value}. It expires in 10 minutes. Check your spam folder if you do not see it.`;
    setSignInStep("code");
  });

  codeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormError(codeError, "");
    const digits = code.value.replace(/\D/g, "");
    if (digits.length !== 6) {
      setFormError(codeError, "Enter the 6-digit code from your email.");
      code.focus();
      return;
    }
    const btn = document.getElementById("signInCodeBtn");
    setBusy(btn, true, "Checking…");
    const res = await authVerify(email.value.trim(), digits);
    setBusy(btn, false, "Sign in");
    if (!res.ok) {
      setFormError(codeError, res.message || "Could not sign you in. Please try again.");
      code.select();
      return;
    }
    const after = pendingAfterSignIn;
    currentUser = res.data.user;
    pendingAfterSignIn = null;
    closeSignInModal();
    renderAccountUI();
    await loadListings(); // reload so contact numbers and "mine" flags appear
    showToast("Signed in. Welcome!", "success");
    if (after) after();
  });
}
