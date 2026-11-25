
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS = {
  Placed: "Placed",
  Accepted: "Accepted",
  Preparing: "Preparing",
  "Ready for Pickup": "Ready for Pickup",
  "Out for Delivery": "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

const NEXT = {
  Placed: ["Accepted", "Accept order"],
  Accepted: ["Preparing", "Start preparing"],
  Preparing: ["Ready for Pickup", "Mark ready for pickup"],
};

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export default function Manager() {
  const navigate = useNavigate();
  const DB = window.DB;
  const session = DB?.getSession?.();

  const registeredUser = session
    ? DB.findUser(session.email, "manager")
    : null;

  const restaurant =
    session?.restaurant ||
    registeredUser?.restaurant ||
    registeredUser?.restaurantId ||
    "";

  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [deliveryMode, setDeliveryMode] = useState("eazypezy");

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("Main Course");
  const [itemPrice, setItemPrice] = useState("");
  const [itemType, setItemType] = useState("veg");
  const [itemImage, setItemImage] = useState("");

  // Inline editing states
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState("veg");
  const [editImage, setEditImage] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState("percent");
  const [couponValue, setCouponValue] = useState("");

  const [message, setMessage] = useState("");

  function refresh() {
    if (!DB || !restaurant) return;

    setOrders(
      DB.getOrders().filter((o) => o.restaurant === restaurant)
    );

    setMenu(
      DB.getMenu().filter((i) => i.restaurant === restaurant)
    );

    setCoupons(
      DB.getCoupons().filter(
        (c) => c.scope === "restaurant" && c.restaurant === restaurant
      )
    );

    const settings = DB.getSettings();
    setDeliveryMode(
      settings.deliveryModes?.[restaurant] || "eazypezy"
    );
  }

  useEffect(() => {
    if (!session || session.role !== "manager") {
      navigate("/");
      return;
    }

    refresh();

    const timer = setInterval(refresh, 2500);
    window.addEventListener("storage", refresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function logout() {
    DB.clearSession();
    navigate("/");
  }

  function updateDeliveryMode(value) {
    const settings = DB.getSettings();
    settings.deliveryModes = settings.deliveryModes || {};
    settings.deliveryModes[restaurant] = value;
    DB.saveSettings(settings);
    setDeliveryMode(value);
    setMessage("Delivery mode updated for new orders.");
  }

  function advanceStatus(order) {
    const next = NEXT[order.status];
    if (!next) return;

    DB.updateOrder(order.id, { status: next[0] });
    refresh();
  }

  function dispatchRestaurantOrder(order) {
    if (
      order.status !== "Ready for Pickup" ||
      deliveryMode !== "restaurant"
    ) return;

    DB.updateOrder(order.id, {
      status: "Out for Delivery",
      deliveryPartnerEmail: "restaurant-owned",
    });

    refresh();
  }

  function continueWithAvailableItems(order) {
    const availableItems = order.items.filter((item) => {
      const current = DB.getMenu().find((m) => m.id === item.id);
      return !current || current.available !== false;
    });

    if (!availableItems.length) {
      cancelOrder(order.id);
      return;
    }

    const subtotal = availableItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const gst = Math.round(subtotal * 0.05);

    const updated = {
      ...order,
      items: availableItems,
      subtotal,
      gst,
      total: subtotal + gst + Number(order.deliveryFee || 0),
    };

    const allOrders = DB.getOrders().map((o) =>
      o.id === order.id ? updated : o
    );

    DB.saveOrders(allOrders);
    refresh();
  }

  function cancelOrder(id) {
    if (!window.confirm("Cancel this order?")) return;

    DB.updateOrder(id, { status: "Cancelled" });
    refresh();
  }

  function addMenuItem(event) {
    event.preventDefault();

    const price = Number(itemPrice);

    if (!itemName.trim() || !price || price < 1 || !itemImage.trim()) {
      setMessage("Please enter valid dish details.");
      return;
    }

    const restaurantInfo = DB.getRestaurantInfo(restaurant);

    const newItem = {
      id: "m_" + Date.now(),
      restaurant,
      name: itemName.trim(),
      price,
      type: itemType,
      category: itemCategory.trim() || "Main Course",
      image: itemImage.trim(),
      bannerImage: restaurantInfo?.bannerImage || "",
      rating: 4.5,
      available: true,
      rescueEligible: false,
      rescuePrice: Math.round(price / 2),
    };

    DB.saveMenu([...DB.getMenu(), newItem]);

    setItemName("");
    setItemCategory("Main Course");
    setItemPrice("");
    setItemType("veg");
    setItemImage("");
    setMessage("Menu item added successfully.");

    refresh();
  }

  // Open the inline editing form
  function editItem(item) {
    setEditingItem(item.id);
    setEditName(item.name || "");
    setEditPrice(String(item.price || ""));
    setEditCategory(item.category || "");
    setEditType(item.type || "veg");
    setEditImage(item.image || "");
    setMessage("");
  }

  // Save edited menu item
  function saveEditedItem(event) {
    event.preventDefault();

    const price = Number(editPrice);

    if (
      !editName.trim() ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setMessage("Please enter a valid dish name and price.");
      return;
    }

    const updatedMenu = DB.getMenu().map((item) => {
      if (String(item.id) === String(editingItem)) {
        return {
          ...item,
          name: editName.trim(),
          price,
          category: editCategory.trim() || "Main Course",
          type: editType,
          image: editImage.trim() || item.image,
          rescuePrice: Math.round(price / 2),
        };
      }

      return item;
    });

    DB.saveMenu(updatedMenu);

    setEditingItem(null);
    setMessage("Menu item updated successfully.");
    refresh();
  }

  function cancelEditing() {
    setEditingItem(null);
    setEditName("");
    setEditPrice("");
    setEditCategory("");
    setEditType("veg");
    setEditImage("");
  }

  function toggleAvailability(item) {
    const allMenu = DB.getMenu().map((m) =>
      String(m.id) === String(item.id)
        ? { ...m, available: m.available === false }
        : m
    );

    DB.saveMenu(allMenu);
    refresh();
  }

  function toggleRescue(item) {
    const allMenu = DB.getMenu().map((m) =>
      String(m.id) === String(item.id)
        ? {
            ...m,
            rescueEligible: !m.rescueEligible,
            rescuePrice: Math.round(m.price / 2),
          }
        : m
    );

    DB.saveMenu(allMenu);
    refresh();
  }

  function createCoupon(event) {
    event.preventDefault();

    const code = couponCode.trim().toUpperCase();
    const value = Number(couponValue);

    if (!code || !value || value < 1) {
      setMessage("Enter a valid coupon code and value.");
      return;
    }

    const allCoupons = DB.getCoupons();

    if (allCoupons.some((c) => c.code === code)) {
      setMessage("This coupon code already exists.");
      return;
    }

    const coupon = {
      code,
      type: couponType,
      value,
      min: 300,
      scope: "restaurant",
      restaurant,
      active: true,
      label:
        couponType === "percent"
          ? value + "% off at " + restaurant
          : money(value) + " off at " + restaurant,
    };

    DB.saveCoupons([...allCoupons, coupon]);

    setCouponCode("");
    setCouponValue("");
    setMessage("Coupon created successfully.");
    refresh();
  }

  function toggleCoupon(code) {
    const updated = DB.getCoupons().map((c) =>
      c.code === code ? { ...c, active: !c.active } : c
    );

    DB.saveCoupons(updated);
    refresh();
  }

  const today = new Date().toDateString();

  const todayOrders = orders.filter(
    (o) => new Date(o.placedAt).toDateString() === today
  );

  const preparing = orders.filter(
    (o) => ["Accepted", "Preparing"].includes(o.status)
  );

  const ready = orders.filter(
    (o) => o.status === "Ready for Pickup"
  );

  const sales = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.subtotal || 0), 0);

  const rating =
    menu.length > 0
      ? menu.reduce((sum, item) => sum + Number(item.rating || 4.5), 0) /
        menu.length
      : 0;

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#190D24",
      color: "#F5ECFA",
      fontFamily: "Arial, sans-serif",
    },
    nav: {
      background: "#2B1740",
      padding: "17px 5%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 12px #0000000b",
      flexWrap: "wrap",
      gap: 12,
    },
    brand: {
      fontSize: 24,
      fontWeight: 800,
      color: "#EADCF4",
    },
    button: {
      padding: "10px 16px",
      border: "none",
      borderRadius: 9,
      background: "#8D43C7",
      color: "#2B1740",
      cursor: "pointer",
      fontWeight: 600,
    },
    secondary: {
      padding: "9px 13px",
      border: "1px solid #4B2E622e1",
      borderRadius: 8,
      background: "#2B1740",
      color: "#EADCF4",
      cursor: "pointer",
      fontWeight: 600,
    },
    content: {
      maxWidth: 1250,
      margin: "auto",
      padding: "30px 5%",
    },
    card: {
      background: "#2B1740",
      border: "1px solid #4B2E62",
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 4px 15px #00000008",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
      gap: 15,
      margin: "24px 0",
    },
    input: {
      width: "100%",
      padding: 12,
      border: "1px solid #4B2E625df",
      borderRadius: 8,
      marginTop: 7,
      boxSizing: "border-box",
    },
    muted: {
      color: "#C1A9D0",
      fontSize: 13,
    },
  };

  if (!session || session.role !== "manager") return null;

  if (!restaurant) {
    return (
      <div className="ez-manager-shell" style={styles.page}>
        <nav style={styles.nav}>
          <div style={styles.brand}>Eazypezy.</div>
          <button style={styles.secondary} onClick={logout}>Log out</button>
        </nav>
        <div style={styles.content}>
          <div style={styles.card}>
            <h2>Restaurant not linked</h2>
            <p>
              This Manager account does not have a restaurant assigned.
              Please use a registered demo Manager account or correct the
              restaurant assignment in the account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ez-manager-shell" style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.brand}>Eazypezy.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <span>Hi, {session.name?.split(" ")[0]}</span>
          <button style={styles.secondary} onClick={logout}>Log out</button>
        </div>
      </nav>

      <main style={styles.content}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 15, flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "#C1A9D0", fontWeight: 700, letterSpacing: 2 }}>
              RESTAURANT CONTROL
            </p>
            <h1 style={{ margin: "5px 0" }}>Manager dashboard</h1>
            <p style={styles.muted}>Managing {restaurant}</p>
          </div>

          <div>
            <label>Delivery mode</label>
            <select
              style={styles.input}
              value={deliveryMode}
              onChange={(e) => updateDeliveryMode(e.target.value)}
            >
              <option value="eazypezy">Eazypezy delivery network</option>
              <option value="restaurant">Restaurant-owned delivery</option>
            </select>
          </div>
        </div>

        {message && (
          <div style={{ ...styles.card, marginTop: 15, color: "#8D43C7" }}>
            {message}
            <button
              style={{ ...styles.secondary, marginLeft: 15 }}
              onClick={() => setMessage("")}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={styles.grid}>
          {[
            ["Today's orders", todayOrders.length],
            ["Preparing", preparing.length],
            ["Ready for pickup", ready.length],
            ["Restaurant sales", money(sales)],
            ["Menu rating", "★ " + rating.toFixed(1)],
          ].map(([label, value]) => (
            <div style={styles.card} key={label}>
              <p style={styles.muted}>{label}</p>
              <h2 style={{ margin: "8px 0", color: "#8D43C7" }}>{value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            ["orders", "Orders"],
            ["menu", "Menu"],
            ["offers", "Coupons & offers"],
          ].map(([id, label]) => (
            <button
              key={id}
              style={{
                ...styles.button,
                background: tab === id ? "#8D43C7" : "#43205B",
                color: tab === id ? "#2B1740" : "#EADCF4",
              }}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <section>
            <h2>Restaurant orders</h2>

            {orders.length === 0 ? (
              <div style={styles.card}>
                <h3>No orders yet</h3>
                <p style={styles.muted}>
                  Customer orders from {restaurant} will appear here.
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const unavailable = order.items.filter((item) => {
                  const current = DB.getMenu().find((m) => m.id === item.id);
                  return current && current.available === false;
                });

                return (
                  <div
                    style={{ ...styles.card, marginBottom: 15 }}
                    key={order.id}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <h3>Order #{order.id.slice(-5)}</h3>
                        <p style={styles.muted}>
                          Customer: {order.customerName}
                        </p>
                      </div>
                      <strong style={{ color: "#8D43C7" }}>
                        {STATUS[order.status] || order.status}
                      </strong>
                    </div>

                    <p>
                      {order.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                    </p>

                    <p style={styles.muted}>
                      {order.address} · {money(order.total)}
                    </p>

                    <p style={styles.muted}>
                      {new Date(order.placedAt).toLocaleString()}
                    </p>

                    {unavailable.length > 0 && (
                      <div style={{ background: "#39204F", padding: 12, borderRadius: 8 }}>
                        <strong>Unavailable items:</strong>{" "}
                        {unavailable.map((i) => i.name).join(", ")}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                          <button style={styles.secondary} onClick={() => continueWithAvailableItems(order)}>
                            Continue with remaining
                          </button>
                          <button style={styles.secondary} onClick={() => cancelOrder(order.id)}>
                            Cancel order
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 15 }}>
                      {NEXT[order.status] ? (
                        <button style={styles.button} onClick={() => advanceStatus(order)}>
                          {NEXT[order.status][1]}
                        </button>
                      ) : order.status === "Ready for Pickup" && deliveryMode === "restaurant" ? (
                        <button style={styles.button} onClick={() => dispatchRestaurantOrder(order)}>
                          Dispatch restaurant partner
                        </button>
                      ) : (
                        <span style={styles.muted}>
                          {order.status === "Delivered"
                            ? "Order completed"
                            : order.status === "Cancelled"
                            ? "Order cancelled"
                            : "Waiting for delivery partner"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {tab === "menu" && (
          <section>
            <h2>Add a menu item</h2>

            <form onSubmit={addMenuItem} style={{ ...styles.card, marginBottom: 20 }}>
              <div style={styles.grid}>
                <label>
                  Dish name
                  <input style={styles.input} value={itemName} onChange={(e) => setItemName(e.target.value)} required />
                </label>

                <label>
                  Category
                  <input style={styles.input} value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} />
                </label>

                <label>
                  Price
                  <input style={styles.input} type="number" min="1" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required />
                </label>

                <label>
                  Food type
                  <select style={styles.input} value={itemType} onChange={(e) => setItemType(e.target.value)}>
                    <option value="veg">Veg</option>
                    <option value="nonveg">Non-veg</option>
                  </select>
                </label>

                <label>
                  Image URL
                  <input style={styles.input} type="url" value={itemImage} onChange={(e) => setItemImage(e.target.value)} required />
                </label>
              </div>

              <button type="submit" style={styles.button}>Add menu item</button>
            </form>

            <h2>Your menu ({menu.length})</h2>

            {menu.map((item) => (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    ...styles.card,
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: 75, height: 65, objectFit: "cover", borderRadius: 9 }}
                  />

                  <div style={{ flex: 1, minWidth: 130 }}>
                    <strong>{item.name}</strong>
                    <p style={styles.muted}>
                      {item.category} · {money(item.price)}
                    </p>
                    <span style={{ color: item.available === false ? "#b54747" : "#36845a" }}>
                      {item.available === false ? "Unavailable" : "Available"}
                    </span>
                  </div>

                  <button
                    type="button"
                    style={styles.secondary}
                    onClick={() => editingItem === item.id ? cancelEditing() : editItem(item)}
                  >
                    {editingItem === item.id ? "Close editor" : "Edit"}
                  </button>

                  <button type="button" style={styles.secondary} onClick={() => toggleAvailability(item)}>
                    {item.available === false ? "Enable" : "Disable"}
                  </button>

                  <button type="button" style={styles.secondary} onClick={() => toggleRescue(item)}>
                    {item.rescueEligible ? "Disable rescue" : "Enable rescue"}
                  </button>
                </div>

                {editingItem === item.id && (
                  <form
                    onSubmit={saveEditedItem}
                    style={{ ...styles.card, marginTop: 10 }}
                  >
                    <h3 style={{ marginTop: 0 }}>Edit menu item</h3>

                    <div style={styles.grid}>
                      <label>
                        Dish name
                        <input
                          style={styles.input}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Price
                        <input
                          style={styles.input}
                          type="number"
                          min="1"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Category
                        <input
                          style={styles.input}
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                        />
                      </label>

                      <label>
                        Food type
                        <select
                          style={styles.input}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                        >
                          <option value="veg">Veg</option>
                          <option value="nonveg">Non-veg</option>
                        </select>
                      </label>

                      <label>
                        Image URL
                        <input
                          style={styles.input}
                          type="url"
                          value={editImage}
                          onChange={(e) => setEditImage(e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="submit" style={styles.button}>
                        Save changes
                      </button>

                      <button
                        type="button"
                        style={styles.secondary}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </section>
        )}

        {tab === "offers" && (
          <section>
            <h2>Create restaurant coupon</h2>

            <form onSubmit={createCoupon} style={{ ...styles.card, marginBottom: 20 }}>
              <div style={styles.grid}>
                <label>
                  Coupon code
                  <input style={styles.input} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="SPICE25" required />
                </label>

                <label>
                  Discount type
                  <select style={styles.input} value={couponType} onChange={(e) => setCouponType(e.target.value)}>
                    <option value="percent">Percentage</option>
                    <option value="flat">Flat amount</option>
                  </select>
                </label>

                <label>
                  Discount value
                  <input style={styles.input} type="number" min="1" value={couponValue} onChange={(e) => setCouponValue(e.target.value)} required />
                </label>
              </div>

              <p style={styles.muted}>Minimum order value: ₹300</p>
              <button type="submit" style={styles.button}>Create coupon</button>
            </form>

            <h2>Your coupons</h2>

            {coupons.length === 0 ? (
              <div style={styles.card}>No restaurant coupons created yet.</div>
            ) : (
              coupons.map((coupon) => (
                <div
                  key={coupon.code}
                  style={{
                    ...styles.card,
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{coupon.code}</strong>
                    <p style={styles.muted}>{coupon.label}</p>
                    <span>{coupon.active ? "Active" : "Disabled"}</span>
                  </div>

                  <button style={styles.secondary} onClick={() => toggleCoupon(coupon.code)}>
                    {coupon.active ? "Disable" : "Enable"}
                  </button>
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}
