
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DB = window.DB;

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("restaurants");
  const [refresh, setRefresh] = useState(0);
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");

  const session = DB?.getSession?.();

  const users = DB?.getUsers?.() || [];
  const menu = DB?.getMenu?.() || [];
  const orders = DB?.getOrders?.() || [];
  const restaurants = DB?.getRestaurants?.() || [];
  const payments = DB?.getPayments?.() || [];
  const coupons = DB?.getCoupons?.() || [];

  const money = (amount) =>
    "₹" + Number(amount || 0).toLocaleString("en-IN");

  useEffect(() => {
    const update = () => setRefresh((v) => v + 1);
    window.addEventListener("storage", update);
    const timer = setInterval(update, 3000);

    return () => {
      window.removeEventListener("storage", update);
      clearInterval(timer);
    };
  }, []);

  if (!session || session.role !== "admin") {
    return (
      <div style={styles.message}>
        Admin session not found. Please log in again.
        <br />
        <button style={styles.button} onClick={() => {
          navigate("/");
        }}>
          Go to Login
        </button>
      </div>
    );
  }

  function togglePlatform(couponCode) {
    const all = DB.getCoupons();
    const coupon = all.find((c) => c.code === couponCode);

    if (coupon) {
      coupon.active = !coupon.active;
      DB.saveCoupons(all);
      setRefresh((v) => v + 1);
    }
  }

  function addCoupon(e) {
    e.preventDefault();

    const couponCode = code.trim().toUpperCase();
    const all = DB.getCoupons();

    if (!couponCode || !value || Number(value) <= 0) {
      alert("Enter valid coupon details.");
      return;
    }

    if (all.some((c) => c.code === couponCode)) {
      alert("Coupon already exists.");
      return;
    }

    const amount = Number(value);

    all.push({
      code: couponCode,
      type,
      value: amount,
      min: 300,
      scope: "platform",
      active: true,
      label:
        type === "percent"
          ? amount + "% off across Eazypezy"
          : money(amount) + " off across Eazypezy",
    });

    DB.saveCoupons(all);
    setCode("");
    setValue("");
    setRefresh((v) => v + 1);
  }

  const platformCoupons = coupons.filter(
    (c) => c.scope === "platform"
  );

  const platformRevenue = payments.reduce(
    (sum, p) => sum + Number(p.platformAmount || 0),
    0
  );

  const tabs = [
    ["restaurants", "Restaurants"],
    ["people", "People"],
    ["promos", "Platform Offers"],
    ["finance", "Payments"],
  ];

  return (
    <div className="ez-admin-shell" style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          Eazypezy<span style={{ color: "#A45DE0" }}>.</span>
        </div>

        <div style={styles.headerRight}>
          <span>Admin Dashboard</span>
          <span>Hi, {session.name?.split(" ")[0]}</span>
          <button
            style={styles.logout}
            onClick={() => {
              DB.clearSession();
              navigate("/");
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.heading}>
          <div>
            <div style={styles.eyebrow}>ADMINISTRATION</div>
            <h1 style={styles.title}>Platform overview</h1>
            <p style={styles.subtitle}>
              Manage restaurants, people, offers and payments.
            </p>
          </div>
        </div>

        <div style={styles.stats}>
          <Stat title="Restaurants" value={restaurants.length} />
          <Stat
            title="Customers"
            value={users.filter((u) => u.role === "customer").length}
          />
          <Stat
            title="Delivery Partners"
            value={users.filter((u) => u.role === "delivery").length}
          />
          <Stat title="Orders" value={orders.length} />
          <Stat title="Platform Revenue" value={money(platformRevenue)} />
        </div>

        <div style={styles.tabs}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                ...styles.tab,
                ...(tab === id ? styles.activeTab : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "restaurants" && (
          <section>
            <h2 style={styles.sectionTitle}>Registered Restaurants</h2>

            {restaurants.length === 0 ? (
              <Empty text="No restaurants registered yet." />
            ) : (
              <div style={styles.grid}>
                {restaurants.map((restaurant) => {
                  const info = DB.getRestaurantInfo(restaurant) || {};
                  const dishes = menu.filter(
                    (item) => item.restaurant === restaurant
                  );
                  const restaurantOrders = orders.filter(
                    (order) => order.restaurant === restaurant
                  );

                  return (
                    <div key={restaurant} style={styles.card}>
                      {info.bannerImage && (
                        <img
                          src={info.bannerImage}
                          alt={restaurant}
                          style={styles.restaurantImage}
                        />
                      )}

                      <div style={styles.cardContent}>
                        <h3>{restaurant}</h3>
                        <p style={styles.muted}>
                          Rating: {info.rating || "N/A"} · {dishes.length} dishes
                          · {restaurantOrders.length} orders
                        </p>

                        <div style={styles.details}>
                          <span>
                            Available:{" "}
                            {dishes.filter(
                              (d) => d.available !== false
                            ).length}
                          </span>
                          <span>
                            Rescue-ready:{" "}
                            {dishes.filter((d) => d.rescueEligible).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "people" && (
          <section>
            <h2 style={styles.sectionTitle}>Customers</h2>

            {users.filter((u) => u.role === "customer").length === 0 ? (
              <Empty text="No customers registered yet." />
            ) : (
              users
                .filter((u) => u.role === "customer")
                .map((u) => (
                  <Person
                    key={u.email}
                    name={u.name}
                    email={u.email}
                  />
                ))
            )}

            <h2 style={{ ...styles.sectionTitle, marginTop: 30 }}>
              Delivery Partners
            </h2>

            {users.filter((u) => u.role === "delivery").length === 0 ? (
              <Empty text="No delivery partners registered yet." />
            ) : (
              users
                .filter((u) => u.role === "delivery")
                .map((u) => (
                  <Person
                    key={u.email}
                    name={u.name}
                    email={u.email}
                    extra={
                      orders.filter(
                        (o) =>
                          o.deliveryPartnerEmail === u.email &&
                          o.status === "Delivered"
                      ).length + " delivered"
                    }
                  />
                ))
            )}
          </section>
        )}

        {tab === "promos" && (
          <section>
            <h2 style={styles.sectionTitle}>Create Platform Coupon</h2>

            <form onSubmit={addCoupon} style={styles.form}>
              <label style={styles.label}>Coupon Code</label>
              <input
                style={styles.input}
                placeholder="Example: EAZY20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />

              <label style={styles.label}>Discount Type</label>
              <select
                style={styles.input}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="percent">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>

              <label style={styles.label}>Discount Value</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                placeholder="Enter discount"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />

              <button style={styles.button} type="submit">
                Create Coupon
              </button>
            </form>

            <h2 style={styles.sectionTitle}>Platform Offers</h2>

            {platformCoupons.length === 0 ? (
              <Empty text="No platform coupons created yet." />
            ) : (
              platformCoupons.map((coupon) => (
                <div key={coupon.code} style={styles.coupon}>
                  <div>
                    <strong>{coupon.code}</strong>
                    <p style={styles.muted}>
                      {coupon.label} · Platform-wide
                    </p>
                    <span
                      style={{
                        color: coupon.active ? "#15803d" : "#dc2626",
                      }}
                    >
                      {coupon.active ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <button
                    style={styles.outlineButton}
                    onClick={() => togglePlatform(coupon.code)}
                  >
                    {coupon.active ? "Disable" : "Enable"}
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "finance" && (
          <section>
            <h2 style={styles.sectionTitle}>Payment Records</h2>

            {payments.length === 0 ? (
              <Empty text="No payment records yet." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Restaurant</th>
                      <th>Restaurant Amount</th>
                      <th>Delivery Amount</th>
                      <th>Platform Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.slice(0, 50).map((p, index) => (
                      <tr key={p.orderId || index}>
                        <td>#{String(p.orderId).slice(-5)}</td>
                        <td>{p.restaurant}</td>
                        <td>{money(p.restaurantAmount)}</td>
                        <td>{money(p.deliveryAmount)}</td>
                        <td>{money(p.platformAmount)}</td>
                        <td>
                          <span style={styles.status}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.muted}>{title}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Person({ name, email, extra }) {
  return (
    <div style={styles.person}>
      <strong>{name}</strong>
      <div style={styles.muted}>
        {email} {extra ? " · " + extra : ""}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#190D24",
    color: "#F5ECFA",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#2B1740",
    padding: "16px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 15,
    boxShadow: "0 2px 10px #0000000a",
  },
  brand: { fontSize: 25, fontWeight: 800 },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    fontSize: 14,
  },
  logout: {
    border: "1px solid #4B2E62",
    background: "#2B1740",
    padding: "9px 15px",
    borderRadius: 8,
    cursor: "pointer",
  },
  container: { maxWidth: 1200, margin: "auto", padding: "30px 20px" },
  heading: { marginBottom: 25 },
  eyebrow: {
    color: "#A45DE0",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
  },
  title: { fontSize: 30, margin: "8px 0" },
  subtitle: { color: "#C1A9D0", margin: 0 },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    background: "#2B1740",
    padding: 18,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  statValue: { fontSize: 25 },
  muted: { color: "#C1A9D0", fontSize: 13, margin: "7px 0" },
  tabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    borderBottom: "1px solid #4B2E62",
    marginBottom: 25,
  },
  tab: {
    padding: "12px 18px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#C1A9D0",
    fontWeight: 600,
  },
  activeTab: {
    color: "#A45DE0",
    borderBottom: "3px solid #A45DE0",
  },
  sectionTitle: { fontSize: 20, marginBottom: 18 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: 18,
  },
  card: {
    background: "#2B1740",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #4B2E62",
  },
  restaurantImage: { width: "100%", height: 150, objectFit: "cover" },
  cardContent: { padding: 16 },
  details: { display: "flex", gap: 18, fontSize: 13, marginTop: 12 },
  person: {
    background: "#2B1740",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  form: {
    background: "#2B1740",
    padding: 20,
    borderRadius: 12,
    maxWidth: 450,
    marginBottom: 30,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: 600 },
  input: {
    padding: 12,
    border: "1px solid #4B2E62",
    borderRadius: 8,
    fontSize: 14,
    width: "100%",
  },
  button: {
    background: "#A45DE0",
    color: "#2B1740",
    border: "none",
    padding: 12,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginTop: 8,
  },
  outlineButton: {
    background: "#2B1740",
    border: "1px solid #A45DE0",
    color: "#A45DE0",
    borderRadius: 8,
    padding: "8px 13px",
    cursor: "pointer",
  },
  coupon: {
    background: "#2B1740",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#2B1740",
    fontSize: 13,
    minWidth: 750,
  },
  status: {
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 9px",
    borderRadius: 20,
  },
  empty: {
    background: "#2B1740",
    padding: 25,
    borderRadius: 10,
    color: "#C1A9D0",
    textAlign: "center",
  },
  message: { padding: 40, textAlign: "center" },
};
