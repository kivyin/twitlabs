function StarfleetDelta({ className = "", size = 220 }) {
  return (
    <img
      className={className}
      src="/starfleet-command-emblem.png"
      width={size}
      height={size}
      alt="Starfleet Command"
      draggable={false}
    />
  );
}

export default StarfleetDelta;
