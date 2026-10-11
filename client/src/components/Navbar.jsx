function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 50px",
        backgroundColor: "#0d6efd",
        color: "white",
      }}
    >
      <h2>🚑 MedAI Connect</h2>

      <div>
        <button style={{ marginRight: "10px" }}>
          User Login
        </button>

        <button>
          Hospital Login
        </button>
      </div>
    </nav>
  );
}

export default Navbar;