
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const STATUS = [
  "Placed",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered"
];

function Customer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const initialSearch = searchParams.get("search") || "";
  const DB = window.DB;
  const session = DB?.getSession();

  const restaurants = DB ? DB.getRestaurants() : [];
  const menuItems = DB ? DB.getMenu() : [];

  const [selectedRestaurant, setSelectedRestaurant] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [priceLimit, setPriceLimit] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [fastDelivery, setFastDelivery] = useState(false);

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eazy_guest_cart") || "[]"); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem("eazy_guest_cart") || "[]").length > 0; } catch { return false; }
  });

  useEffect(() => { localStorage.setItem("eazy_guest_cart", JSON.stringify(cart)); }, [cart]);
  const [address, setAddress] = useState("");

  const [orders, setOrders] = useState(() =>
    DB ? DB.getOrders().filter(o => o.customerEmail === session?.email) : []
  );

  // EAZYAI STATES
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTab, setAiTab] = useState("recommend");
  const [budget, setBudget] = useState(300);
  const [budgetResults, setBudgetResults] = useState([]);

  // GROUP VOTING STATES
  const [groups, setGroups] = useState(() => DB ? DB.getGroups() : []);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [newFood, setNewFood] = useState("");

  const [mood, setMood] = useState("Comfort food");
  const [diet, setDiet] = useState("all");

  const filteredMenu = useMemo(() => {
    const filteredMenu = menuItems.filter(item => {
      const available = item.available !== false;

      const restaurantMatch =
        selectedRestaurant === "all" ||
        item.restaurant === selectedRestaurant;

      const searchMatch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.restaurant.toLowerCase().includes(search.toLowerCase());

      const typeMatch = filter === "all" || item.type === filter;
      const categoryMatch = !categoryFilter || (() => {
        const cat = categoryFilter.toLowerCase();
        const n = item.name.toLowerCase();
        if (cat.includes("biryani")) return /biryani/.test(n);
        if (cat.includes("starter")) return /starter|kebab|tikka|65|momo|spring roll|nugget|wings|manchurian|crispy corn|pakora|cutlet/i.test(n);
        if (cat.includes("dessert")) return /cake|brownie|sweet|dessert|gulab|rasmalai|cheesecake|mousse|tiramisu|donut|waffle|pancake|kulfi|tart|churros|ice cream|payasam|firni|kesari|boorelu/i.test(n);
        if (cat.includes("south")) return /dosa|idli|vada|uttapam|pessarattu|tiffin|sambar/i.test(n);
        if (cat.includes("chinese")) return /noodle|fried rice|chow mein|pad thai|momo|dim sum|manchurian|spring roll/i.test(n);
        if (cat.includes("burger")) return /burger/i.test(n);
        if (cat.includes("pizza")) return /pizza/i.test(n);
        if (cat.includes("beverage")) return /coffee|tea|juice|smoothie|shake|lassi|mocha|espresso|cold brew|cappuccino|americano|frappe|lemonade|milk|bubble tea/i.test(n);
        if (cat.includes("bread")) return /naan|roti|paratha|chapati|rumali/i.test(n);
        if (cat.includes("rice")) return /rice|pulihora|pulao|meals|thali/i.test(n);
        if (cat.includes("snack")) return /fries|samosa|puri|pav|roll|maggie|maggi|bhel|tikki|snack|toast|chaat|bajji|street food/i.test(n);
        if (cat.includes("healthy")) return /salad|bowl|quinoa|avocado|protein|healthy|vegetable|chickpea|tofu/i.test(n);
        return n.includes(cat.replace(/s$/, ""));
      })();
      const priceMatch = priceLimit === "all" || item.price <= Number(priceLimit);
      const deliveryMinutes = /Dosa House|Cafe Terra|Green Bowl Cafe/.test(item.restaurant) ? 25 : 35;
      const deliveryMatch = !fastDelivery || deliveryMinutes <= 25;
      return available && restaurantMatch && searchMatch && typeMatch && categoryMatch && priceMatch && deliveryMatch;
    });
    if (sortBy === "price-low") filteredMenu.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") filteredMenu.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") filteredMenu.sort((a, b) => Number(b.rating || 4.2) - Number(a.rating || 4.2));
    if (sortBy === "fast") filteredMenu.sort((a, b) => (/Dosa House|Cafe Terra|Green Bowl Cafe/.test(a.restaurant) ? 25 : 35) - (/Dosa House|Cafe Terra|Green Bowl Cafe/.test(b.restaurant) ? 25 : 35));
    return filteredMenu;
  }, [menuItems, selectedRestaurant, search, filter, categoryFilter, priceLimit, sortBy, fastDelivery]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const delivery = cart.length ? 30 : 0;
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + delivery + gst;

  // REFRESH ORDERS AND GROUP VOTES
  useEffect(() => {
    const refresh = () => {
      const currentSession = DB.getSession();

      setOrders(
        DB.getOrders().filter(
          order => order.customerEmail === currentSession?.email
        )
      );

      setGroups(DB.getGroups());
    };

    const interval = setInterval(refresh, 2000);
    window.addEventListener("storage", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, [DB]);

  function addToCart(item) {
    if (cart.length && cart[0].restaurant !== item.restaurant) {
      alert("You can order from only one restaurant at a time.");
      return;
    }

    setCart(previous => {
      const existing = previous.find(x => x.id === item.id);

      if (existing) {
        return previous.map(x =>
          x.id === item.id
            ? { ...x, quantity: x.quantity + 1 }
            : x
        );
      }

      return [...previous, { ...item, quantity: 1 }];
    });
  }

  function clearCart() {
    setCart([]);
    localStorage.setItem("eazy_guest_cart", "[]");
  }

  function changeQuantity(id, amount) {
    setCart(previous =>
      previous
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  function placeOrder() {
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    if (!address.trim()) {
      alert("Please enter your delivery address.");
      return;
    }

    const currentSession = DB.getSession();

    if (!currentSession || currentSession.role !== "customer") {
      alert("Please log in to complete checkout. Your cart is saved.");
      navigate("/login");
      return;
    }

    const order = {
      id: "ord_" + Date.now(),
      customerEmail: currentSession.email,
      customerName: currentSession.name,
      restaurant: cart[0].restaurant,

      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.price,
        qty: item.quantity,
        image: item.image
      })),

      subtotal,
      discount: 0,
      deliveryFee: delivery,
      gst,
      total: grandTotal,
      address: address.trim(),
      status: "Placed",
      deliveryPartnerEmail: null,
      rejectedBy: [],
      placedAt: new Date().toISOString(),
      estimatedMinutes: 40,
      foodRatings: {},
      deliveryRating: null,
      rescueOrder: false,
      deliveryMode:
        (DB.getSettings().deliveryModes || {})[
          cart[0].restaurant
        ] || "eazypezy"
    };

    DB.addOrder(order);

    const payments = DB.getPayments();

    payments.push({
      id: "pay_" + Date.now(),
      orderId: order.id,
      restaurant: order.restaurant,
      restaurantAmount: Math.round(order.subtotal * 0.8),
      deliveryAmount: Math.round(order.deliveryFee * 0.6),
      platformAmount:
        order.total -
        Math.round(order.subtotal * 0.8) -
        Math.round(order.deliveryFee * 0.6),
      status: "captured"
    });

    DB.savePayments(payments);

    setOrders(DB.getOrders().filter(
      item => item.customerEmail === currentSession.email
    ));

    setCart([]);
    localStorage.removeItem("eazy_guest_cart");
    setAddress("");
    setCartOpen(false);

    alert("Order placed successfully!");
    document.getElementById("tracking")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  // ORDER TRACKING
  function getStatusIndex(status) {
    return STATUS.indexOf(status);
  }

  function logout() {
    DB.clearSession();
    navigate("/");
  }

  // EAZYAI: FOOD RECOMMENDATIONS
  function getRecommendations() {
    let keywords = [];

    if (mood === "Spicy") {
      keywords = ["spice", "chilli", "tikka", "curry"];
    } else if (mood === "Fast food") {
      keywords = ["pizza", "burger", "fries", "roll"];
    } else if (mood === "Sweet craving") {
      keywords = ["cake", "brownie", "sweet", "dessert"];
    } else if (mood === "Light food") {
      keywords = ["salad", "soup", "bowl", "oats"];
    } else {
      keywords = ["butter", "biryani", "dosa", "paneer"];
    }

    let results = menuItems.filter(item => {
      const dietMatch =
        diet === "all" || item.type === diet;

      const moodMatch = keywords.some(word =>
        item.name.toLowerCase().includes(word)
      );

      return dietMatch && item.available !== false && moodMatch;
    });

    if (!results.length) {
      results = menuItems.filter(item =>
        (diet === "all" || item.type === diet) &&
        item.available !== false
      );
    }

    return results.slice(0, 6);
  }

  // EAZYAI: BUDGET PLANNER
  function findBudgetMeals() {
    const limit = Number(budget);

    if (!limit || limit < 50) {
      alert("Enter a budget of at least ₹50.");
      return;
    }

    const candidates = menuItems
      .filter(item => item.available !== false && item.price <= limit)
      .sort((a, b) => a.price - b.price);

    let best = null;

    for (const first of candidates) {
      for (const second of candidates) {
        if (
          first.id !== second.id &&
          first.restaurant === second.restaurant
        ) {
          const total = first.price + second.price;

          if (total <= limit && (!best || total > best.total)) {
            best = { items: [first, second], total };
          }
        }
      }
    }

    if (best) {
      setBudgetResults(best.items);
    } else if (candidates.length) {
      setBudgetResults([candidates[candidates.length - 1]]);
    } else {
      setBudgetResults([]);
    }
  }

  // EAZYAI: FOOD RESCUE
  const rescueActive = new Date().getHours() === 21;

  const rescueItems = menuItems.filter(
    item => item.rescueEligible && item.available !== false
  );

  function addRescueToCart(item) {
    if (!rescueActive) {
      alert("Food Rescue is available from 9 PM to 10 PM.");
      return;
    }

    const rescueItem = {
      ...item,
      price: item.rescuePrice
    };

    addToCart(rescueItem);
  }

  // GROUP VOTING
  function saveGroupData(updatedGroups) {
    DB.saveGroups(updatedGroups);
    setGroups(updatedGroups);
  }

  function createGroup() {
    if (!session?.email) { alert("Log in to create a group."); navigate("/login"); return; }
    if (!groupName.trim()) {
      alert("Enter a group name.");
      return;
    }

    const code = "EAZY" + Math.random().toString(36).slice(2, 7).toUpperCase();

    const group = {
      id: "g_" + Date.now(),
      code,
      name: groupName.trim(),
      owner: session?.email || "guest",
      members: session?.email ? [session.email] : [],
      options: [],
      closed: false
    };

    const updated = [group, ...DB.getGroups()];

    saveGroupData(updated);
    setActiveGroup(group.id);
    setGroupName("");

    alert("Group created! Share this code: " + code);
  }

  function joinGroup() {
    const code = groupCode.trim().toUpperCase();

    const updated = DB.getGroups();
    const group = updated.find(g => g.code === code);

    if (!group) {
      alert("Invalid group code.");
      return;
    }

    if (!group.members) group.members = [];

    if (!session?.email) { alert("Log in to join a group."); navigate("/login"); return; }
    if (!group.members.includes(session.email)) {
      group.members.push(session.email);
    }

    saveGroupData(updated);
    setActiveGroup(group.id);
    setGroupCode("");
  }

  function addGroupFood() {
    if (!newFood.trim() || !activeGroup) return;

    const updated = DB.getGroups();
    const group = updated.find(g => g.id === activeGroup);

    if (!session?.email || !group || group.owner !== session.email) {
      alert("Only the group creator can add food items.");
      return;
    }

    if (!group.options) group.options = [];

    group.options.push({
      id: "food_" + Date.now(),
      name: newFood.trim(),
      votes: []
    });

    saveGroupData(updated);
    setNewFood("");
  }

  function toggleVote(groupId, optionId) {
    const updated = DB.getGroups();
    const group = updated.find(g => g.id === groupId);

    if (!group) return;

    if (!session?.email || !group.members?.includes(session.email)) {
      alert("Join this group before voting.");
      return;
    }

    const option = group.options?.find(
      item => item.id === optionId
    );

    if (!option) return;

    if (!Array.isArray(option.votes)) {
      option.votes = [];
    }

    if (option.votes.includes(session?.email)) {
      option.votes = option.votes.filter(
        email => email !== session.email
      );
    } else {
      option.votes.push(session.email);
    }

    saveGroupData(updated);
  }

  const myGroups = session?.email ? groups.filter(group =>
    group.members?.includes(session.email) ||
    group.owner === session.email
  ) : [];

  const currentGroup = groups.find(
    group => group.id === activeGroup
  );

  function logoutButton() {
    if (!session) { navigate("/login"); return; }
    logout();
  }

  return (
    <div className="ez-customer-shell" style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.brand}>
          Eazypezy<span style={{ color: "#F08A35" }}>.</span>
        </div>

        <div style={styles.navActions}>
          <button style={styles.navButton}
            onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>
            Discover
          </button>

          <button style={styles.navButton}
            onClick={() => document.getElementById("tracking")?.scrollIntoView({ behavior: "smooth" })}>
            Tracking
          </button>

          <button style={styles.aiButton} onClick={() => setAiOpen(true)}>
            EazyAI
          </button>

          <button style={styles.cartButton} onClick={() => setCartOpen(true)}>
            Cart ({cartCount})
          </button>

          <button style={styles.navButton} onClick={logoutButton}>
            {session ? "Log out" : "Log in"}
          </button>
        </div>
      </nav>

      <main>
        <section id="discover" style={styles.hero}>
          <p style={styles.eyebrow}>EAT BETTER. CHOOSE EASIER.</p>

          <h1 style={styles.heading}>
            What are you <span style={{ color: "#F08A35" }}>craving</span> today?
          </h1>

          <p style={styles.description}>
            Discover local kitchens, explore delicious dishes
            and build your perfect order.
          </p>

          <input
            style={styles.search}
            placeholder="Search dishes or restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={styles.filters}>
            {["all", "veg", "nonveg"].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  ...styles.filterButton,
                  background: filter === type ? "#EADCF4" : "#2B1740",
                  color: filter === type ? "#2B1740" : "#EADCF4"
                }}
              >
                {type === "all" ? "All" : type === "veg" ? "Veg" : "Non-veg"}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.content}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "0 0 16px" }}>
            <select style={styles.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Food category">
              <option value="">All categories</option>{["Starters","Biryanis","Pizza","Burgers","South Indian","Chinese","Desserts","Beverages","Breads","Rice & Meals","Snacks","Healthy"].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select style={styles.select} value={priceLimit} onChange={e => setPriceLimit(e.target.value)} aria-label="Price filter">
              <option value="all">Any price</option><option value="150">Under ₹150</option><option value="200">Under ₹200</option><option value="300">Under ₹300</option>
            </select>
            <select style={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort results">
              <option value="recommended">Sort: Recommended</option><option value="fast">Fastest delivery</option><option value="price-low">Price: Low to high</option><option value="price-high">Price: High to low</option><option value="rating">Top rated</option>
            </select>
            <button style={styles.clearButton} onClick={() => {setCategoryFilter("");setPriceLimit("all");setSortBy("recommended");setFastDelivery(false);setFilter("all");setSelectedRestaurant("all");setSearch("");}}>Reset all</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {["all","veg","nonveg"].map(type => <button key={type} onClick={() => setFilter(type)} style={{ ...styles.filterButton, background: filter===type ? "#F08A35" : "#2B1740", color: filter===type ? "#29123C" : "#EADCF4", borderColor: "#5B3974" }}>{type=== "all" ? "All food" : type === "veg" ? "Pure veg" : "Non-veg"}</button>)}
            <button onClick={() => setFastDelivery(v => !v)} style={{ ...styles.filterButton, background: fastDelivery ? "#F08A35" : "#2B1740", color: fastDelivery ? "#29123C" : "#EADCF4", borderColor: "#5B3974" }}>⚡ Fast delivery {fastDelivery ? "✓" : ""}</button>
          </div>
          <div style={styles.sectionHeader}>
            <h2>Explore restaurants</h2>

            <select
              style={styles.select}
              value={selectedRestaurant}
              onChange={e => setSelectedRestaurant(e.target.value)}
            >
              <option value="all">All restaurants</option>
              {restaurants.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={styles.restaurantList}>
            {restaurants.map(restaurant => (
              <button
                key={restaurant}
                style={styles.restaurantButton}
                onClick={() => navigate(`/restaurant/${encodeURIComponent(restaurant)}`)}
              >
                {restaurant}
              </button>
            ))}
          </div>

          <div style={styles.sectionHeader}>
            <div>
              <h2>Popular near you</h2>
              <p style={styles.muted}>{filteredMenu.length} dishes found</p>
            </div>

            <button style={styles.clearButton}
              onClick={() => {
                setSelectedRestaurant("all");
                setFilter("all");
                setSearch("");
              }}>
              Clear filters
            </button>
          </div>

          <div style={styles.foodGrid}>
            {filteredMenu.map(item => (
              <article key={item.id} style={styles.foodCard}>
                <img src={item.image} alt={item.name} style={{ ...styles.foodImage, cursor: "pointer" }} onClick={() => navigate(`/food/${encodeURIComponent(item.id)}`)} />

                <div style={styles.foodContent}>
                  <span style={styles.foodType}>
                    {item.type === "veg" ? "● Veg" : "● Non-veg"}
                  </span>

                  <h3 style={{ cursor: "pointer" }} onClick={() => navigate(`/food/${encodeURIComponent(item.id)}`)}>{item.name}</h3>
                  <p style={styles.muted}>{item.restaurant}</p>

                  <div style={styles.priceRow}>
                    <strong>₹{item.price}</strong>
                    <button style={styles.addButton} onClick={() => addToCart(item)}>
                      + Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredMenu.length === 0 && (
            <p style={styles.empty}>No dishes found.</p>
          )}
        </section>

        {/* ORDER TRACKING */}
        <section id="tracking" style={styles.content}>
          <h2 style={styles.sectionTitle}>Order Tracking</h2>
          <p style={styles.muted}>Track the latest status of your orders.</p>

          {orders.length === 0 ? (
            <p style={styles.empty}>No orders to track yet.</p>
          ) : (
            orders.map(order => {
              const index = getStatusIndex(order.status);

              return (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderHeader}>
                    <div>
                      <h3>Order #{order.id.slice(-5)}</h3>
                      <p style={styles.muted}>{order.restaurant}</p>
                    </div>

                    <strong style={styles.orderStatus}>
                      {order.status}
                    </strong>
                  </div>

                  <p>Delivery address: {order.address}</p>

                  <p style={styles.muted}>
                    {new Date(order.placedAt).toLocaleString()}
                  </p>

                  {order.status === "Cancelled" ? (
                    <p style={styles.cancelled}>This order was cancelled.</p>
                  ) : (
                    <div style={styles.trackList}>
                      {STATUS.map((status, i) => (
                        <div key={status} style={styles.trackStep}>
                          <div style={{
                            ...styles.trackCircle,
                            background: i <= index ? "#26834a" : "#4B2E62"
                          }}>
                            {i <= index ? "✓" : i + 1}
                          </div>

                          <span style={{
                            color: i <= index ? "#26834a" : "#888",
                            fontWeight: i === index ? "bold" : "normal"
                          }}>
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.orderTotal}>
                    Total: ₹{Number(order.total).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* EAZYAI */}
      {aiOpen && (
        <div style={styles.overlay} onClick={() => setAiOpen(false)}>
          <div style={styles.aiPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <div>
                <h2>EazyAI</h2>
                <p style={styles.muted}>Your smart food assistant</p>
              </div>
              <button style={styles.closeButton} onClick={() => setAiOpen(false)}>×</button>
            </div>

            <div style={styles.aiTabs}>
              {[
                ["recommend", "Recommendations"],
                ["budget", "Budget Planner"],
                ["group", "Group Voting"],
                ["rescue", "Food Rescue"]
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAiTab(id)}
                  style={{
                    ...styles.aiTab,
                    background: aiTab === id ? "#EADCF4" : "#f4edf5",
                    color: aiTab === id ? "#2B1740" : "#EADCF4"
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {aiTab === "recommend" && (
              <div style={styles.aiContent}>
                <h3>AI Food Recommendations</h3>
                <p style={styles.muted}>Choose your food mood and preference.</p>

                <label style={styles.fieldLabel}>Food mood</label>
                <select style={styles.fullInput} value={mood} onChange={e => setMood(e.target.value)}>
                  <option>Comfort food</option>
                  <option>Spicy</option>
                  <option>Fast food</option>
                  <option>Sweet craving</option>
                  <option>Light food</option>
                </select>

                <label style={styles.fieldLabel}>Food preference</label>
                <select style={styles.fullInput} value={diet} onChange={e => setDiet(e.target.value)}>
                  <option value="all">All</option>
                  <option value="veg">Vegetarian</option>
                  <option value="nonveg">Non-vegetarian</option>
                </select>

                <h3>Recommended dishes</h3>

                {getRecommendations().map(item => (
                  <div key={item.id} style={styles.resultRow}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.muted}>{item.restaurant} · ₹{item.price}</p>
                    </div>
                    <button style={styles.smallAdd} onClick={() => addToCart(item)}>Add</button>
                  </div>
                ))}
              </div>
            )}

            {aiTab === "budget" && (
              <div style={styles.aiContent}>
                <h3>Budget Planner</h3>
                <p style={styles.muted}>Find a meal that fits your budget.</p>

                <label style={styles.fieldLabel}>Your budget (₹)</label>
                <input
                  type="number"
                  min="50"
                  style={styles.fullInput}
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                />

                <button style={styles.primaryButton} onClick={findBudgetMeals}>
                  Find my meal
                </button>

                {budgetResults.map(item => (
                  <div key={item.id} style={styles.resultRow}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.muted}>{item.restaurant} · ₹{item.price}</p>
                    </div>
                    <button style={styles.smallAdd} onClick={() => addToCart(item)}>Add</button>
                  </div>
                ))}

                {budgetResults.length > 0 && (
                  <p style={styles.muted}>
                    Meal total: ₹{budgetResults.reduce((sum, item) => sum + item.price, 0)}
                  </p>
                )}
              </div>
            )}

            {aiTab === "group" && (
              <div style={styles.aiContent}>
                <h3>Group Voting</h3>
                <p style={styles.muted}>Create a group or join using a group code.</p>

                <label style={styles.fieldLabel}>Create group</label>
                <input
                  style={styles.fullInput}
                  placeholder="Group name"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />

                <button style={styles.primaryButton} onClick={createGroup}>
                  Create group
                </button>

                <label style={styles.fieldLabel}>Join group with code</label>
                <input
                  style={styles.fullInput}
                  placeholder="Enter group code"
                  value={groupCode}
                  onChange={e => setGroupCode(e.target.value)}
                />

                <button style={styles.primaryButton} onClick={joinGroup}>
                  Join group
                </button>

                <h3>Your groups</h3>

                {myGroups.map(group => (
                  <button
                    key={group.id}
                    style={styles.groupSelect}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    {group.name} · {group.code || "Old group"}
                  </button>
                ))}

                {currentGroup && (
                  <div style={styles.groupBox}>
                    <h3>{currentGroup.name}</h3>
                    <p style={styles.groupCode}>
                      Group code: {currentGroup.code || "Old group"}
                    </p>
                    <p style={styles.muted}>
                      Members: {currentGroup.members?.length || 1}
                    </p>

                    {currentGroup.owner === session?.email && (
                      <>
                        <label style={styles.fieldLabel}>Add a food item</label>
                        <select
                          style={styles.fullInput}
                          value={newFood}
                          onChange={e => setNewFood(e.target.value)}
                        >
                          <option value="">Choose a menu item</option>
                          {menuItems.map(item => (
                            <option key={item.id} value={item.name}>
                              {item.name}
                            </option>
                          ))}
                        </select>

                        <button style={styles.primaryButton} onClick={addGroupFood}>
                          Add food option
                        </button>
                      </>
                    )}

                    {(currentGroup.options || []).map(option => {
                      const votes = Array.isArray(option.votes)
                        ? option.votes
                        : [];

                      const voted = votes.includes(session?.email);

                      return (
                        <div key={option.id || option.name} style={styles.voteRow}>
                          <div>
                            <strong>{option.name}</strong>
                            <p style={styles.muted}>{votes.length} votes</p>
                          </div>

                          <button
                            style={{
                              ...styles.voteButton,
                              background: voted ? "#26834a" : "#EADCF4"
                            }}
                            onClick={() => toggleVote(currentGroup.id, option.id)}
                          >
                            {voted ? "Unvote" : "Vote"} · {votes.length}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {aiTab === "rescue" && (
              <div style={styles.aiContent}>
                <h3>Food Rescue</h3>

                <p style={styles.muted}>
                  {rescueActive
                    ? "Rescue is live! Eligible dishes are available at discounted prices."
                    : "Food Rescue opens from 9 PM to 10 PM."}
                </p>

                {rescueItems.map(item => (
                  <div key={item.id} style={styles.resultRow}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.muted}>{item.restaurant}</p>
                      <strong style={styles.rescuePrice}>
                        ₹{item.rescuePrice}
                      </strong>
                      <span style={styles.oldPrice}> ₹{item.price}</span>
                    </div>

                    <button
                      style={styles.smallAdd}
                      disabled={!rescueActive}
                      onClick={() => addRescueToCart(item)}
                    >
                      Rescue
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CART */}
      {cartOpen && (
        <div style={styles.overlay} onClick={() => setCartOpen(false)}>
          <aside style={styles.drawer} onClick={e => e.stopPropagation()}>
            <div style={styles.drawerHeader}>
              <h2>Your Cart</h2>
              <button style={styles.closeButton} onClick={() => setCartOpen(false)}>×</button>
            </div>

            {!cart.length ? (
              <p style={styles.empty}>Your cart is empty.</p>
            ) : (
              <>
                <p style={styles.muted}>Restaurant: {cart[0].restaurant}</p>

                {cart.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.muted}>₹{item.price} each</p>
                    </div>

                    <div style={styles.quantity}>
                      <button onClick={() => changeQuantity(item.id, -1)}>−</button>
                      <strong>{item.quantity}</strong>
                      <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}

                <div style={styles.bill}>
                  <div style={styles.billRow}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                  <div style={styles.billRow}><span>Delivery</span><span>₹{delivery.toFixed(2)}</span></div>
                  <div style={styles.billRow}><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
                  <hr />
                  <div style={styles.billRow}><strong>Total</strong><strong>₹{grandTotal.toFixed(2)}</strong></div>
                </div>

                <div style={{ background: "#f4edf8", color: "#6b4a8b", borderRadius: 10, padding: "12px", margin: "14px 0", fontSize: 13 }}>🚚 Estimated delivery: <strong>35–45 minutes</strong><div style={{ fontSize: 11, marginTop: 4, opacity: .8 }}>Demo estimate · shown before order confirmation</div></div>
                <label style={styles.fieldLabel}>Delivery Address</label>
                <textarea
                  style={styles.addressInput}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter your complete delivery address"
                />

                <button style={styles.primaryButton} onClick={placeOrder}>
                  Place Order · ₹{grandTotal.toFixed(2)}
                </button>

                <button style={styles.clearCart} onClick={clearCart}>
                  Clear cart
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#2B1740",
    color: "#EADCF4",
    fontFamily: "Arial, sans-serif"
  },
  nav: {
    background: "#2B1740",
    padding: "16px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 2px 10px #0000000c",
    flexWrap: "wrap",
    gap: 12
  },
  brand: { fontSize: 25, fontWeight: "bold" },
  navActions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  navButton: { border: "none", background: "transparent", color: "#EADCF4", padding: 10, cursor: "pointer" },
  aiButton: { background: "#F08A35", color: "#29123C", border: "none", borderRadius: 8, padding: "11px 18px", cursor: "pointer" },
  cartButton: { background: "#EADCF4", color: "#29123C", border: "none", borderRadius: 8, padding: "11px 18px", cursor: "pointer" },
  hero: { padding: "65px 7%", background: "linear-gradient(120deg, #EADCF4, #29123C)" },
  eyebrow: { color: "#F08A35", fontWeight: "bold", letterSpacing: 2 },
  heading: { fontSize: "clamp(32px, 5vw, 52px)", margin: "15px 0" },
  description: { lineHeight: 1.7, color: "#C1A9D0" },
  search: { width: "100%", maxWidth: 550, padding: 15, marginTop: 20, border: "1px solid #4B2E62", borderRadius: 9, fontSize: 15, boxSizing: "border-box" },
  filters: { display: "flex", gap: 10, marginTop: 15 },
  filterButton: { border: "1px solid #EADCF4", padding: "9px 20px", borderRadius: 20, cursor: "pointer" },
  content: { padding: "35px 5%" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap", margin: "25px 0 18px" },
  muted: { color: "#C1A9D0", fontSize: 13 },
  select: { padding: 11, borderRadius: 8, border: "1px solid #4B2E62", background: "#2B1740" },
  restaurantList: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 },
  restaurantButton: { padding: "12px 18px", background: "#2B1740", border: "1px solid #4B2E62", borderRadius: 9, cursor: "pointer", color: "#EADCF4" },
  clearButton: { padding: 10, background: "#2B1740", border: "1px solid #4B2E62", borderRadius: 8, cursor: "pointer" },
  foodGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 },
  foodCard: { background: "#2B1740", borderRadius: 12, overflow: "hidden", boxShadow: "0 3px 12px #0000000b" },
  foodImage: { width: "100%", height: 165, objectFit: "cover" },
  foodContent: { padding: 15 },
  foodType: { fontSize: 12, color: "#38844c" },
  priceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  addButton: { background: "#F08A35", color: "#29123C", border: "none", padding: "9px 17px", borderRadius: 7, cursor: "pointer" },
  empty: { textAlign: "center", padding: 30, color: "#C1A9D0" },
  sectionTitle: { marginBottom: 8 },
  orderCard: { background: "#2B1740", padding: 20, borderRadius: 12, marginTop: 18, boxShadow: "0 3px 12px #0000000b" },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  orderStatus: { color: "#26834a" },
  trackList: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: 25, overflowX: "auto", paddingBottom: 10 },
  trackStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 85, textAlign: "center", fontSize: 12 },
  trackCircle: { width: 28, height: 28, borderRadius: "50%", color: "#F5ECFA", display: "grid", placeItems: "center", fontSize: 12 },
  orderTotal: { textAlign: "right", fontWeight: "bold", marginTop: 18 },
  cancelled: { color: "#b33", fontWeight: "bold" },
  overlay: { position: "fixed", inset: 0, background: "#0008", zIndex: 20, display: "flex", justifyContent: "flex-end" },
  drawer: { background: "#2B1740", width: "min(430px, 100%)", height: "100%", overflowY: "auto", padding: 24, boxSizing: "border-box" },
  aiPanel: { background: "#2B1740", width: "min(650px, 100%)", height: "100%", overflowY: "auto", padding: 24, boxSizing: "border-box" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  closeButton: { border: "none", background: "transparent", fontSize: 30, cursor: "pointer" },
  cartItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: "1px solid #4B2E62" },
  quantity: { display: "flex", gap: 12, alignItems: "center" },
  bill: { marginTop: 25, padding: 15, background: "#2B1740", borderRadius: 10 },
  billRow: { display: "flex", justifyContent: "space-between", margin: "12px 0" },
  fieldLabel: { display: "block", margin: "16px 0 7px", fontWeight: "bold", fontSize: 14 },
  addressInput: { width: "100%", minHeight: 85, padding: 12, border: "1px solid #4B2E62", borderRadius: 8, boxSizing: "border-box", resize: "vertical" },
  primaryButton: { width: "100%", padding: 13, background: "#F08A35", color: "#29123C", border: "none", borderRadius: 8, cursor: "pointer", marginTop: 12 },
  clearCart: { width: "100%", padding: 13, background: "#EADCF4", color: "#F5ECFA", border: "none", borderRadius: 8, cursor: "pointer", marginTop: 10 },
  aiTabs: { display: "flex", flexWrap: "wrap", gap: 8, margin: "22px 0" },
  aiTab: { border: "none", padding: "10px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13 },
  aiContent: { background: "#2B1740", borderRadius: 12, padding: 18, marginTop: 12 },
  fullInput: { width: "100%", padding: 12, border: "1px solid #4B2E62", borderRadius: 8, boxSizing: "border-box", background: "#2B1740" },
  resultRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#2B1740", padding: 12, borderRadius: 9, marginTop: 10 },
  smallAdd: { background: "#F08A35", color: "#F5ECFA", border: "none", borderRadius: 7, padding: "9px 15px", cursor: "pointer" },
  groupSelect: { display: "block", width: "100%", textAlign: "left", padding: 12, background: "#2B1740", border: "1px solid #4B2E62", borderRadius: 8, marginTop: 8, cursor: "pointer" },
  groupBox: { background: "#2B1740", border: "1px solid #4B2E62", borderRadius: 10, padding: 15, marginTop: 15 },
  groupCode: { background: "#190D24", padding: 10, borderRadius: 7, fontWeight: "bold", letterSpacing: 1 },
  voteRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderTop: "1px solid #4B2E62", padding: "12px 0" },
  voteButton: { color: "#F5ECFA", border: "none", borderRadius: 7, padding: "9px 12px", cursor: "pointer" },
  rescuePrice: { color: "#26834a", fontWeight: "bold" },
  oldPrice: { color: "#888", textDecoration: "line-through", fontSize: 13 }
};

export default Customer;
