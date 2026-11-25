import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Landing.css";

const categories = [
  { name: "Starters", emoji: "🥘", fallback: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", match: /starter|kebab|tikka|65|momo|spring roll|nugget|wings|manchurian|crispy corn|pakora|cutlet/i },
  { name: "Biryanis", emoji: "🍛", fallback: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80", match: /biryani/i },
  { name: "Pizza", emoji: "🍕", fallback: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80", match: /pizza/i },
  { name: "Burgers", emoji: "🍔", fallback: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80", match: /burger/i },
  { name: "South Indian", emoji: "🥞", fallback: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80", match: /dosa|idli|vada|uttapam|pessarattu|tiffin|sambar/i },
  { name: "Chinese", emoji: "🥡", fallback: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80", match: /noodle|wok|fried rice|chow mein|pad thai|momo|dim sum|manchurian/i },
  { name: "Desserts", emoji: "🍰", fallback: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80", match: /cake|brownie|sweet|dessert|gulab|rasmalai|cheesecake|mousse|tiramisu|donut|waffle|pancake|kulfi|tart|churros|ice cream|payasam|firni|kesari|boorelu/i },
  { name: "Beverages", emoji: "🥤", fallback: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80", match: /coffee|tea|juice|smoothie|shake|lassi|mocha|espresso|cold brew|cappuccino|americano|frappe|lemonade|milk|bubble tea/i },
  { name: "Breads", emoji: "🫓", fallback: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80", match: /naan|roti|paratha|chapati|rumali/i },
  { name: "Rice & Meals", emoji: "🍚", fallback: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", match: /rice|pulihora|pulao|meals|thali/i },
  { name: "Snacks", emoji: "🍟", fallback: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80", match: /fries|samosa|puri|pav|roll|maggie|maggi|bhel|tikki|snack|toast|chaat|bajji|street food/i },
  { name: "Healthy", emoji: "🥗", fallback: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", match: /salad|bowl|quinoa|avocado|protein|healthy|vegetable|chickpea|tofu/i },
];

function pickCategoryImage(menu, regex) {
  return menu.find((item) => regex.test(item.name))?.image || "";
}


export default function Landing() {
  const navigate = useNavigate();
  const DB = window.DB;
  const menu = DB?.getMenu?.() || [];
  const [search, setSearch] = useState("");
  const categoryImages = useMemo(() => categories.map((category) => ({ ...category, image: pickCategoryImage(menu, category.match) || category.fallback })), [menu]);
  const openCustomer = (categoryName = "", query = "") => {
    const params = new URLSearchParams();
    if (categoryName) params.set("category", categoryName);
    if (query) params.set("search", query);
    navigate(`/customer${params.toString() ? `?${params.toString()}` : ""}`);
  };
  return <div className="ez-home">
    <header className="ez-home-header">
      <Link className="ez-home-logo" to="/">eazypezy<span>✦</span></Link>
      <nav><a href="#categories">Categories</a><a href="#about">About</a><button onClick={() => navigate("/login")}>Eazy AI</button></nav>
      <div className="ez-home-actions"><Link to="/login">Log in</Link><Link className="signup" to="/signup">Sign up</Link></div>
    </header>
    <main>
      <section className="ez-home-hero">
        <div className="ez-home-hero-copy">
          <span className="ez-home-eyebrow">GOOD FOOD, GOOD MOOD ✦</span>
          <h1>Cravings<br/>deserve <em>better.</em></h1>
          <p>Find the food you love, explore your cravings, and make today a little more delicious.</p>
          <div className="ez-home-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && openCustomer("", search)} placeholder="Search dishes, flavours, cravings..."/><button onClick={() => openCustomer("", search)}>Explore ↗</button></div>
          <div className="ez-home-cta"><button className="primary" onClick={() => openCustomer()}>Explore food <span>↗</span></button><Link to="/login">Meet Eazy AI ✨</Link></div>
          <div className="ez-home-note"><span>✦</span> Discover your next favourite bite</div>
        </div>
        <div className="ez-home-hero-art">
          <img className="hero-food" src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=85" alt="Delicious Indian food spread"/>
          <div className="hero-float"><span>🍽️</span><div><b>Something delicious</b><small>Just around the corner</small></div></div>
          <div className="hero-sticker">MADE FOR<br/>YOUR CRAVINGS</div>
        </div>
      </section>
      <section className="ez-home-categories" id="categories">
        <div className="categories-heading"><span>EXPLORE YOUR FAVOURITES</span><h2>What are you craving?</h2><p>Pick a category and find something delicious.</p></div>
        <div className="ez-home-category-grid">{categoryImages.map((category) => <button key={category.name} className="ez-home-category" onClick={() => openCustomer(category.name)}>
          <span className="category-image-wrap">{category.image ? <img src={category.image} alt={category.name} loading="lazy"/> : <span className="category-emoji">{category.emoji}</span>}</span><b>{category.name}</b>
        </button>)}</div>
        <button className="browse-all" onClick={() => openCustomer()}>Browse all food <span>→</span></button>
      </section>
      <section className="ez-home-ai" id="about"><div><span>YOUR FOOD COMPANION</span><h2>Not sure what to eat?<br/><em>Ask Eazy AI.</em></h2><p>Tell Eazy AI your mood, budget or craving and discover your next meal.</p><button onClick={() => navigate("/login")}>Explore Eazy AI ✦</button></div><div className="ai-card-preview"><div className="ai-preview-icon">✦</div><b>Hey, hungry human!</b><p>What are we craving today?</p><div className="ai-preview-chips"><span>🌶️ Something spicy</span><span>💸 Under ₹200</span><span>🥗 Light & healthy</span></div></div></section>
    </main>
    <footer className="ez-home-footer"><Link className="ez-home-logo" to="/">eazypezy<span>✦</span></Link><p>Good food. Good mood. A little joy, delivered.</p><small>© 2026 Eazypezy · Hackathon demo project</small></footer>
  </div>;
}
