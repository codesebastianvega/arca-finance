import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "#090B0A",
        color: "#F4F7F5",
        display: "flex",
        minHeight: "100dvh",
        padding: "32px 24px",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 420, textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            alignItems: "center",
            background: "#1A1E1C",
            border: "1px solid #4A3520",
            borderRadius: 28,
            color: "#D89C56",
            display: "flex",
            fontSize: 52,
            height: 96,
            justifyContent: "center",
            margin: "0 auto 28px",
            width: 96,
          }}
        >
          ✦
        </div>
        <p style={{ color: "#C68A45", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Arca con Nova
        </p>
        <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: "12px 0" }}>Estás sin conexión</h1>
        <p style={{ color: "#A9B2AD", fontSize: 14, lineHeight: 1.7, margin: "0 auto 28px" }}>
          Tus datos financieros privados no se guardan en el modo offline. Cuando recuperes internet podrás volver a consultar y registrar movimientos con seguridad.
        </p>
        <Link
          href="/app"
          style={{
            background: "#C68A45",
            borderRadius: 16,
            color: "#15110C",
            display: "inline-block",
            fontSize: 14,
            fontWeight: 800,
            padding: "14px 22px",
            textDecoration: "none",
          }}
        >
          Intentar nuevamente
        </Link>
      </section>
    </main>
  );
}
