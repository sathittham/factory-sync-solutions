export function AuthPanel() {
  return (
    <div className="relative h-full w-full">
      <img
        src="/fs-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-sky-950/60 dark:bg-[#041225]/80" />
    </div>
  );
}
