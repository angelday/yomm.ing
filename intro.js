// The value proposition, in the same order and on the same beat as the app's
// signed-out screen. Autoplay only for now: no swipe, no controls.
const VALUE_PROPOSITION_LINES = [
  "Let someone know\nyou’re thinking\nabout them",
  "Without words,\nsounds, emojis,\npings or heartbeats",
  "When you’re far,\njust hold\ntheir avatar",
  "As long as you do,\nthey’ll receive\na live count",
  "They can join in,\ntoo",
  "You can even think\nabout someone\nsecretly",
  "You On My Mind",
];

const VALUE_PROPOSITION_INTERVAL_MS = 3600;
// Matches the transition in styles.css: the outgoing line finishes leaving
// before the incoming one is placed on the right.
const VALUE_PROPOSITION_SLIDE_MS = 260;

(function cycleValueProposition() {
  const target = document.getElementById("value-proposition");
  if (!target || VALUE_PROPOSITION_LINES.length < 2) {
    return;
  }

  // A line that changes under you is exactly what this setting is for.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let index = 0;
  window.setInterval(function advance() {
    index = (index + 1) % VALUE_PROPOSITION_LINES.length;
    const line = VALUE_PROPOSITION_LINES[index];

    target.classList.add("is-leaving");

    window.setTimeout(function arrive() {
      target.textContent = line;

      // Placed on the right with the transition suppressed, so the jump across
      // is never seen; the next frame drops the class and it slides in.
      target.classList.remove("is-leaving");
      target.classList.add("is-arriving");

      window.requestAnimationFrame(function settle() {
        window.requestAnimationFrame(function release() {
          target.classList.remove("is-arriving");
        });
      });
    }, VALUE_PROPOSITION_SLIDE_MS);
  }, VALUE_PROPOSITION_INTERVAL_MS);
})();
