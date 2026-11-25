
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN");

const STATUS_COLORS = {
  "Ready for Pickup": "#b7791f",
  "Out for Delivery": "#3568a8",
  Delivered: "#36845a",
  Cancelled: "#b54747",
};

export default function Delivery() {
  const navigate = useNavigate();
  const DB = window.DB;
  const session = DB?.getSession?.();

  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("available");

  function refresh() {
    if (!DB || !session) return;
    setOrders([...DB.getOrders()]);
  }

  useEffect(() => {
    if (!session || session.role !== "delivery") {
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

  const available = orders.filter(
    (o) =>
      o.status === "Ready for Pickup" &&
      o.deliveryMode !== "restaurant" &&
      !o.deliveryPartnerEmail &&
      !(o.rejectedBy || []).includes(session?.email)
  );

  const mine = orders.filter(
    (o) =>
      o.deliveryPartnerEmail === session?.email &&
      !["Delivered", "Cancelled"].includes(o.status)
  );

  const history = orders.filter(
    (o) =>
      o.deliveryPartnerEmail === session?.email &&
      ["Delivered", "Cancelled"].includes(o.status)
  );

  const allMine = orders.filter(
    (o) => o.deliveryPartnerEmail === session?.email
  );

  const earnings = allMine
    .filter((o) => o.status === "Delivered")
    .reduce(
      (sum, o) => sum + Math.round(Number(o.deliveryFee || 30) * 0.6),
      0
    );

  function acceptDelivery(id) {
    const order = DB.getOrders().find((o) => o.id === id);

    if (
      !order ||
      order.status !== "Ready for Pickup" ||
      order.deliveryPartnerEmail
    ) {
      setMessage("This delivery is no longer available.");
      refresh();
      return;
    }

    DB.updateOrder(id, {
      deliveryPartnerEmail: session.email,
      status: "Out for Delivery",
      deliveryAcceptedAt: new Date().toISOString(),
    });

    setMessage("Delivery accepted successfully.");
    refresh();
  }

  function rejectDelivery(id) {
    const allOrders = DB.getOrders();
    const order = allOrders.find((o) => o.id === id);

    if (!order) return;

    order.rejectedBy = order.rejectedBy || [];

    if (!order.rejectedBy.includes(session.email)) {
      order.rejectedBy.push(session.email);
    }

    DB.saveOrders(allOrders);
    setMessage("Delivery request rejected.");
    refresh();
  }

  function completeDelivery(id) {
    const order = DB.getOrders().find((o) => o.id === id);

    if (
      !order ||
      order.deliveryPartnerEmail !== session.email ||
      order.status !== "Out for Delivery"
    ) {
      setMessage("Unable to complete this delivery.");
      refresh();
      return;
    }

    DB.updateOrder(id, {
      status: "Delivered",
      deliveredAt: new Date().toISOString(),
    });

    setMessage("Order marked as delivered.");
    refresh();
  }

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
      flexWrap: "wrap",
      gap: 12,
      boxShadow: "0 2px 12px #0000000b",
    },
    brand: {
      fontSize: 24,
      fontWeight: 800,
      color: "#EADCF4",
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
      marginBottom: 15,
      boxShadow: "0 4px 15px #00000008",
    },
    button: {
      padding: "10px 16px",
      border: "none",
      borderRadius: 8,
      background: "#8D43C7",
      color: "#2B1740",
      cursor: "pointer",
      fontWeight: 600,
    },
    secondary: {
      padding: "9px 14px",
      border: "1px solid #4B2E622e1",
      borderRadius: 8,
      background: "#2B1740",
      color: "#EADCF4",
      cursor: "pointer",
      fontWeight: 600,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
      gap: 15,
      margin: "25px 0",
    },
    muted: {
      color: "#C1A9D0",
      fontSize: 13,
    },
  };

  function deliveryCard(order, isAvailable) {
    const estimatedEarning = Math.round(
      Number(order.deliveryFee || 30) * 0.6
    );

    return (
      <div style={styles.card} key={order.id}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 8px" }}>
              Order #{String(order.id).slice(-5)}
            </h3>
            <strong>{order.restaurant}</strong>
          </div>

          <strong
            style={{
              color: STATUS_COLORS[order.status] || "#8D43C7",
            }}
          >
            {order.status}
          </strong>
        </div>

        <p>{order.items?.map((i) => `${i.name} × ${i.qty}`).join(", ")}</p>

        <p style={styles.muted}>
          <strong>Pickup:</strong> {order.restaurant}
        </p>

        <p style={styles.muted}>
          <strong>Drop:</strong> {order.address}
        </p>

        <p style={styles.muted}>
          Estimated distance: {2 + (String(order.id).length % 8)} km
        </p>

        <p>
          <strong>Estimated earnings: {money(estimatedEarning)}</strong>
        </p>

        {isAvailable ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={styles.button}
              onClick={() => acceptDelivery(order.id)}
            >
              Accept delivery
            </button>

            <button
              style={styles.secondary}
              onClick={() => rejectDelivery(order.id)}
            >
              Reject
            </button>
          </div>
        ) : order.status === "Out for Delivery" ? (
          <button
            style={styles.button}
            onClick={() => completeDelivery(order.id)}
          >
            Mark as delivered
          </button>
        ) : (
          <span style={styles.muted}>
            {order.status === "Delivered"
              ? "Delivery completed"
              : "Order cancelled"}
          </span>
        )}
      </div>
    );
  }

  if (!session || session.role !== "delivery") return null;

  return (
    <div className="ez-delivery-shell" style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.brand}>Eazypezy.</div>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <span>Hi, {session.name?.split(" ")[0]}</span>
          <button style={styles.secondary} onClick={logout}>
            Log out
          </button>
        </div>
      </nav>

      <main style={styles.content}>
        <p style={{ color: "#C1A9D0", fontWeight: 700, letterSpacing: 2 }}>
          DELIVERY NETWORK
        </p>

        <h1>Delivery Partner Dashboard</h1>
        <p style={styles.muted}>
          Choose your delivery requests and manage your deliveries.
        </p>

        {message && (
          <div style={styles.card}>
            {message}
            <button
              style={{ ...styles.secondary, marginLeft: 12 }}
              onClick={() => setMessage("")}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={styles.grid}>
          {[
            ["Available requests", available.length],
            ["Active deliveries", mine.length],
            ["Delivered orders", allMine.filter((o) => o.status === "Delivered").length],
            ["Total earnings", money(earnings)],
          ].map(([label, value]) => (
            <div style={styles.card} key={label}>
              <p style={styles.muted}>{label}</p>
              <h2 style={{ color: "#8D43C7", margin: 0 }}>{value}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {[
            ["available", "New requests"],
            ["mine", "My deliveries"],
            ["history", "Delivery history"],
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

        {tab === "available" && (
          <section>
            <h2>New delivery requests ({available.length})</h2>
            {available.length ? (
              available.map((o) => deliveryCard(o, true))
            ) : (
              <div style={styles.card}>
                No open requests right now. New restaurant-ready orders will
                appear here.
              </div>
            )}
          </section>
        )}

        {tab === "mine" && (
          <section>
            <h2>My active deliveries ({mine.length})</h2>
            {mine.length ? (
              mine.map((o) => deliveryCard(o, false))
            ) : (
              <div style={styles.card}>
                You have no active deliveries. Accept a new request to begin.
              </div>
            )}
          </section>
        )}

        {tab === "history" && (
          <section>
            <h2>Delivery history ({history.length})</h2>
            {history.length ? (
              history.map((o) => deliveryCard(o, false))
            ) : (
              <div style={styles.card}>
                Your completed and cancelled deliveries will appear here.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
