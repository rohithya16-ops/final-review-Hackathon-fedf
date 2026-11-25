import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const roleInfo = {
  customer: { title: "Welcome back", subtitle: "Sign in to order from your favourite kitchens." },
  manager: { title: "Manager sign in", subtitle: "Manage your restaurant, menu and orders." },
  delivery: { title: "Delivery partner sign in", subtitle: "Sign in to manage your deliveries." },
  admin: { title: "Admin sign in", subtitle: "Manage the Eazypezy platform." },
};
const roles = [
  { id: "customer", label: "Customer" },
  { id: "manager", label: "Manager" },
  { id: "delivery", label: "Delivery" },
  { id: "admin", label: "Admin" },
];
const foodImages = [
  { src: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&q=80", alt: "Biryani" },
  { src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80", alt: "Salad bowl" },
  { src: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=80", alt: "Drink" },
  { src: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=200&q=80", alt: "Samosa" },
];

export default function Auth({ initialMode = "login" }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("customer");
  const [isSignup, setIsSignup] = useState(initialMode === "signup");
  const [splashVisible, setSplashVisible] = useState(true);
  const [authVisible, setAuthVisible] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setAuthVisible(true), 350);
    const hideTimer = setTimeout(() => setSplashVisible(false), 800);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  const DB = window.DB;
  const restaurants = role === "manager" && DB ? DB.getRestaurants() : [];


  function switchMode(signup) {
    setIsSignup(signup);
    setMessage({ text: "", type: "" });
    setLoginIdentifier(""); setLoginPassword("");
    setSignupName(""); setSignupUsername(""); setSignupEmail(""); setSignupPassword(""); setRestaurantId("");
  }
  function changeRole(newRole) {
    setRole(newRole);
    switchMode(false);
  }

  function handleLogin(event) {
    event.preventDefault();
    setMessage({ text: "", type: "" });
    if (!DB) return setMessage({ text: "We couldn't load account services. Please refresh and try again.", type: "error" });
    const identifier = loginIdentifier.trim().toLowerCase();
    if (role === "admin" && identifier === "admin@eazypezy.com" && loginPassword === "admin123") {
      const admin = { id: "admin", name: "Eazypezy Admin", email: identifier, username: "admin", role: "admin" };
      DB.setSession(admin); navigate("/admin"); return;
    }
    const users = DB.getUsers?.() || [];
    const user = users.find((u) => u.role === role && [u.email, u.username, u.name].some((v) => String(v || "").trim().toLowerCase() === identifier));
    if (!user) {
      setMessage({ text: "We couldn't find an account with those details. Please create an account first.", type: "error", action: "signup" });
      return;
    }
    if (user.password !== loginPassword) {
      setMessage({ text: "That password doesn't match this account. Please try again.", type: "error" });
      return;
    }
    DB.setSession(user);
    navigate(`/${role}`);
  }

  function handleSignup(event) {
    event.preventDefault();
    setMessage({ text: "", type: "" });
    if (!DB) return setMessage({ text: "We couldn't load account services. Please refresh and try again.", type: "error" });
    if (role === "admin") return setMessage({ text: "Admin accounts are managed by the platform and cannot be created here.", type: "error" });
    const name = signupName.trim();
    const username = signupUsername.trim().toLowerCase();
    const email = signupEmail.trim().toLowerCase();
    if (!name || !username || !email || !signupPassword) return setMessage({ text: "Please complete all required fields.", type: "error" });
    if (!/^[a-z0-9._-]{3,20}$/.test(username)) return setMessage({ text: "Username must be 3–20 characters and use letters, numbers, dots, underscores or hyphens.", type: "error" });
    if (signupPassword.length < 6) return setMessage({ text: "Use a password with at least 6 characters.", type: "error" });
    const users = DB.getUsers?.() || [];
    const duplicate = users.some((u) => (u.role === role && String(u.email || "").trim().toLowerCase() === email) || String(u.username || "").trim().toLowerCase() === username || (!u.username && String(u.name || "").trim().toLowerCase() === username));
    if (duplicate) return setMessage({ text: "An account with this email or username already exists. Please sign in instead.", type: "error", action: "login" });
    if (role === "manager" && !restaurantId) return setMessage({ text: "Please select a restaurant before creating your account.", type: "error" });
    const user = { id: Date.now().toString(), name, username, email, password: signupPassword, role };
    if (role === "manager") user.restaurantId = restaurantId;
    DB.addUser(user);
    // Signup intentionally does not create a session or open a dashboard.
    setSignupName(""); setSignupUsername(""); setSignupEmail(""); setSignupPassword(""); setRestaurantId("");
    setMessage({ text: "Your account has been created successfully. Your signup details have been cleared. Please sign in to continue.", type: "success", action: "login" });
  }

  return (
    <>
      {splashVisible && <div id="splashScreen" className={`splash-screen ${authVisible ? "splash-exit" : ""}`} aria-label="Eazypezy loading">
        <div className="splash-logo-wrap"><img className="splash-logo" src="/assets/logo.png" alt="Eazypezy logo" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling.classList.add("show"); }} /><div className="splash-fallback">Eazypezy<span>.</span></div></div><div className="splash-line"/><p>Food, made easy.</p>
      </div>}
      <main className={`auth-wrap ${!authVisible ? "auth-hidden" : "auth-enter"}`} id="authApp">
        <section className="auth-hero" aria-label="Eazypezy introduction">
          <img id="heroPhoto" src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85" alt="A spread of delicious food" />
          <div className="brand">Eazypezy<span>.</span></div>
          <div className="hero-copy">
            <div className="hero-kicker"><span className="hero-kicker-dot"/> FOOD THAT FITS YOUR MOMENT</div>
            <h1>One kitchen, one road, one doorstep.</h1>
            <p>Eazypezy connects the people who cook, the people who deliver, and the people who are hungry — all in one easy experience.</p>
            <div className="dish-strip" id="dishStrip">{foodImages.map((food) => <div className="dish-chip" key={food.alt}><img src={food.src} alt={food.alt}/></div>)}</div>
          </div>
          <div className="hero-foot"><div><b>240+</b> menu favourites</div><div><b>4 roles</b> one platform</div><div><b>Made easy</b> every order</div></div>
          <div className="hero-orange-glow" aria-hidden="true"/>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-top"><div className="auth-brand-mini">Eazypezy<span>.</span></div><span className="auth-secure"><span/> Secure account</span></div>
            <div className="role-tabs" id="roleTabs" aria-label="Choose account type">{roles.map((item) => <button type="button" key={item.id} className={`role-tab ${role === item.id ? "active" : ""}`} onClick={() => changeRole(item.id)}>{item.label}</button>)}</div>
            {!isSignup ? (
              <form id="loginForm" onSubmit={handleLogin}>
                <div className="auth-heading"><div className="auth-eyebrow">YOUR EAZYPEZY ACCOUNT</div><h2>{roleInfo[role].title}</h2><p className="sub">{roleInfo[role].subtitle}</p></div>
                {message.text && <div className={`auth-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}{message.action === "signup" && <button type="button" className="message-link" onClick={() => switchMode(true)}>Create account</button>}</div>}
                <div className="field"><label htmlFor="loginIdentifier">Email or username</label><input type="text" id="loginIdentifier" autoComplete="username" required placeholder="Enter email or username" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)}/><small>Use the email or username you registered with.</small></div>
                <div className="field"><label htmlFor="loginPassword">Password</label><div className="password-input-wrap"><input type={showLoginPassword ? "text" : "password"} id="loginPassword" autoComplete="current-password" required placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}/><button className="password-toggle" type="button" onClick={() => setShowLoginPassword((v) => !v)} aria-label={showLoginPassword ? "Hide password" : "Show password"}>{showLoginPassword ? "Hide" : "Show"}</button></div></div>
                <button type="submit" className="btn btn-primary btn-block auth-submit">Sign in <span aria-hidden="true">→</span></button>
                {role !== "admin" && <p className="switch-line">Don't have an account? <button type="button" onClick={() => switchMode(true)}>Sign up</button></p>}
                <div className="demo-hint">{role === "admin" ? <>Demo admin: <code>admin@eazypezy.com / admin123</code></> : "Your account is private. Sign in with your registered credentials."}</div>
              </form>
            ) : (
              <form id="signupForm" onSubmit={handleSignup}>
                <div className="auth-heading"><div className="auth-eyebrow">JOIN THE EAZYPEZY COMMUNITY</div><h2>Create your account</h2><p className="sub">A few details and you're ready to get started.</p></div>
                {message.text && <div className={`auth-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}{message.action === "login" && <button type="button" className="message-link" onClick={() => switchMode(false)}>Go to login</button>}</div>}
                <div className="field"><label htmlFor="signupName">Full name</label><input type="text" id="signupName" autoComplete="name" required placeholder="Enter your full name" value={signupName} onChange={(e) => setSignupName(e.target.value)}/></div>
                <div className="field"><label htmlFor="signupUsername">Username</label><input type="text" id="signupUsername" autoComplete="username" required minLength={3} maxLength={20} placeholder="Choose a username" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)}/><small>3–20 characters. Letters, numbers, dot, underscore or hyphen.</small></div>
                <div className="field"><label htmlFor="signupEmail">Email address</label><input type="email" id="signupEmail" autoComplete="email" required placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}/></div>
                <div className="field"><label htmlFor="signupPassword">Password</label><div className="password-input-wrap"><input type={showSignupPassword ? "text" : "password"} id="signupPassword" autoComplete="new-password" required minLength={6} placeholder="Create a password (6+ characters)" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}/><button className="password-toggle" type="button" onClick={() => setShowSignupPassword((v) => !v)} aria-label={showSignupPassword ? "Hide password" : "Show password"}>{showSignupPassword ? "Hide" : "Show"}</button></div></div>
                {role === "manager" && <div className="field" id="managerRestaurantField"><label htmlFor="signupRestaurant">Restaurant assignment</label><select id="signupRestaurant" required value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}><option value="">Choose your restaurant</option>{restaurants.map((restaurant) => <option key={restaurant} value={restaurant}>{restaurant}</option>)}</select></div>}
                <button type="submit" className="btn btn-primary btn-block auth-submit">Create account <span aria-hidden="true">→</span></button>
                <p className="switch-line">Already registered? <button type="button" onClick={() => switchMode(false)}>Go to login</button></p>
                <div className="demo-hint">Creating an account won't sign you in automatically. Please sign in after signup.</div>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
