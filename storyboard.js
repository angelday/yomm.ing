// You On My Mind storyboard controller for index-anim.html.
//
// The story plays by itself. JavaScript decides *when* each beat happens;
// storyboard.css decides how every state looks and moves. A beat only patches
// data attributes on the stage and, optionally, the text. The controller never
// measures or positions anything.
(function storyboard() {
  "use strict";

  const stage = document.getElementById("storyboard");
  if (!stage) {
    return;
  }

  const COPY = {
    thinking: "Let someone know\nyou’re thinking\nabout them",
    wordless: "Without words,\nsounds, emojis,\npings or heartbeats",
    pick: "Pick someone from\nyour friends",
    hold: "Hold their avatar...",
    liveCount: "As long as you do,\nthey’ll see a live count.",
    call: "It’s like a phone call –\nminus the call.",
    // Followed by animated dots, as on the current landing page.
    final: "Because it matters\nsometimes",
  };

  // Timings are first guesses, tuned by feel. Text and picture take turns: a
  // line is read before the picture it describes changes, and a new point of
  // view is seen for a moment before its line appears.
  //
  // Before the count and after the release, `after` is milliseconds after the
  // previous beat. During the hold, `at` is story-clock milliseconds since the
  // count started; the count on screen reads N from N−1 s until N s, so count 4
  // starts at 3000.
  const INTRO = [
    { name: "thinkingStill", after: 0, set: { guy: "think" } },
    { name: "thinkingCopy", after: 1000, copy: COPY.thinking },
    { name: "wordlessCopy", after: 2600, copy: COPY.wordless },
    { name: "guyChecksPhone", after: 2200, set: { guy: "hold" } },
    { name: "guyKneels", after: 1500, set: { guy: "kneel" }, copy: "" },
    // The kneel is an in-between frame, held briefly.
    { name: "guySits", after: 550, set: { guy: "sit" } },
    { name: "enterPhonePov", after: 1000, set: { guy: "pov" }, needsLaterArt: true },
    { name: "pickCopy", after: 1200, copy: COPY.pick },
    { name: "handArrives", after: 1500, set: { guyHand: "point" } },
    { name: "holdCopy", after: 1200, copy: COPY.hold },
    // Nobody clicks: after a beat on “Hold their avatar”, his finger presses,
    // holds, and her avatar grows in two equal steps.
    { name: "press", after: 1200, set: { guyHand: "tap" } },
    { name: "avatarRises", after: 700, set: { guyBase: "zooming" } },
    { name: "sessionFills", after: 700, set: { guyBase: "session" } },
    // Her face fills his screen for half a second before the count starts at 1;
    // “Hold their avatar” stays up until then.
    { name: "countStarts", after: 500, set: { counter: "on" }, copy: "", startsHold: true },
  ];

  const HOLD = [
    // She arrives at count 4, already looking at her buzzing phone.
    { name: "recipientAppears", at: 3000, set: { split: "on", girl: "reach", blink: "on" } },
    { name: "recipientPov", at: 6000, set: { girl: "pov", blink: "off" } },
    { name: "liveCountCopy", at: 8000, copy: COPY.liveCount },
    // Then nothing moves but the seconds...
    { name: "callCopy", at: 11500, copy: COPY.call },
    // ...until the line leaves and the counter runs on its own.
    { name: "callCopyClears", at: 15500, copy: "" },
    // She reaches, thinks, and draws back.
    { name: "recipientReaches", at: 17000, set: { girlHand: "point" } },
    { name: "recipientRetracts", at: 21400, set: { girlHand: "fist" } },
    { name: "recipientPutsPhoneDown", at: 24000, set: { girl: "read" } },
    // He holds on alone for about three seconds after she puts the phone down;
    // before the count turns 28.
    { name: "release", at: 26900, set: { guyHand: "point", guyBase: "zooming" }, freezeCount: true },
  ];

  const OUTRO = [
    { name: "rosterReturns", after: 380, set: { guyBase: "avatars" } },
    { name: "handRetracts", after: 700, set: { guyHand: "out" } },
    // The summary arrives while his point of view is still open.
    { name: "summaryToast", after: 800, set: { toast: "on" }, say: "You’ve been on his mind for 27 seconds." },
    { name: "povCloses", after: 2500, set: { guy: "end", toast: "off" } },
    // The closing circle takes about a second; then both are held for 1.5.
    { name: "brandAppears", after: 2500, set: { cloud: "on" }, say: "You On My Mind." },
    { name: "finalLine", after: 2000, set: { line: "on" }, finalLine: true },
    // Half a second after the line has finished streaming in.
    { name: "brandSettles", after: 1100, set: { guy: "smile", girl: "smile" } },
    // The presentation is over: Skip gives way to the download section.
    { name: "siteLinksAppear", after: 800, set: { links: "on" } },
  ];

  // The last frame, complete: where the story ends, and where Skip and
  // reduced motion go directly.
  const FINAL_STATE = {
    guy: "smile",
    guyBase: "avatars",
    guyHand: "out",
    girl: "smile",
    girlHand: "out",
    blink: "off",
    split: "on",
    counter: "off",
    toast: "off",
    cloud: "on",
    line: "on",
    links: "on",
  };
  const FINAL_WORDS = "You On My Mind. Because it matters sometimes…";

  const liveRegion = stage.querySelector("[data-live]");
  const copyLines = Array.from(stage.querySelectorAll("[data-copy-line]"));
  const finalLine = stage.querySelector("[data-final-line]");
  const counters = Array.from(stage.querySelectorAll("[data-counter-value]"));
  const images = Array.from(stage.querySelectorAll("img"));
  const skipButton = document.querySelector("[data-skip]");
  const siteFooter = document.querySelector("[data-site-footer]");

  let phase = "loading"; // loading | intro | hold | outro | done
  let beatIndex = 0;
  let lastBeatAt = 0;
  let countStartedAt = 0;
  let shownCount = 1;
  let countFrozen = false;
  let laterArtReady = false;
  let copyIndex = 0;
  let hiddenSince = 0;
  let pausedTotal = 0;

  // Story time stops while the tab is hidden, so beats never pile up on return.
  const storyNow = () => performance.now() - pausedTotal;

  document.addEventListener("visibilitychange", function trackHiddenTime() {
    if (document.hidden) {
      hiddenSince = performance.now();
    } else if (hiddenSince) {
      pausedTotal += performance.now() - hiddenSince;
      hiddenSince = 0;
    }
  });

  function apply(state) {
    Object.keys(state).forEach(function setAttribute(key) {
      stage.dataset[key] = state[key];
    });
  }

  function announce(text) {
    liveRegion.textContent = text.replace(/\s*\n\s*/g, " ");
  }

  // Streamed-text pieces: longer than a letter, shorter than most words.
  function pieces(word) {
    if (word.length <= 4) {
      return [word];
    }
    const parts = [];
    for (let start = 0; start < word.length; start += 3) {
      parts.push(word.slice(start, start + 3));
    }
    if (parts[parts.length - 1].length === 1) {
      parts[parts.length - 2] += parts.pop();
    }
    return parts;
  }

  // Fills an element with one span per piece; CSS staggers their reveal by
  // each span's --t. Without streaming, the text simply appears.
  function reveal(element, text, stream = true) {
    const fragment = document.createDocumentFragment();
    let tokenIndex = 0;
    text.split("\n").forEach(function addLine(lineText, lineIndex) {
      if (lineIndex > 0) {
        fragment.appendChild(document.createElement("br"));
      }
      if (!stream) {
        fragment.appendChild(document.createTextNode(lineText));
        return;
      }
      lineText.split(" ").forEach(function addWord(word, wordIndex) {
        if (wordIndex > 0) {
          fragment.appendChild(document.createTextNode(" "));
        }
        pieces(word).forEach(function addPiece(piece) {
          const token = document.createElement("span");
          token.className = "token";
          token.style.setProperty("--t", String(tokenIndex));
          token.textContent = piece;
          fragment.appendChild(token);
          tokenIndex += 1;
        });
      });
    });
    element.replaceChildren(fragment);
    announce(text);
  }

  // The final line ends in three dots that appear one at a time, then start
  // over, as on the current landing page. They are not part of the stream.
  function showFinalLine(stream) {
    reveal(finalLine, COPY.final, stream);
    const ellipsis = document.createElement("span");
    ellipsis.className = "ellipsis";
    ellipsis.setAttribute("aria-hidden", "true");
    for (let dot = 0; dot < 3; dot += 1) {
      ellipsis.appendChild(document.createElement("span")).textContent = ".";
    }
    finalLine.appendChild(ellipsis);
  }

  // Two stacked copy lines: the outgoing one fades as a whole while the
  // incoming one waits, then streams in.
  function showCopy(text) {
    const outgoing = copyLines.find(function isActive(line) {
      return line.classList.contains("is-active");
    });
    if (outgoing) {
      outgoing.classList.remove("is-active");
    }
    if (!text) {
      return;
    }
    copyIndex = 1 - copyIndex;
    const line = copyLines[copyIndex];
    line.classList.toggle("is-following", Boolean(outgoing));
    reveal(line, text);
    line.classList.add("is-active");
  }

  function fire(beat) {
    if (beat.set) {
      apply(beat.set);
    }
    if ("copy" in beat) {
      showCopy(beat.copy);
    }
    if (beat.finalLine) {
      showFinalLine(true);
    }
    if (beat.say) {
      announce(beat.say);
    }
    if (beat.freezeCount) {
      countFrozen = true;
    }
  }

  function renderCount(elapsed) {
    if (countFrozen) {
      return;
    }
    const count = Math.floor(elapsed / 1000) + 1;
    if (count === shownCount) {
      return;
    }
    shownCount = count;
    counters.forEach(function write(counter) {
      counter.textContent = String(count);
    });
  }

  function tick() {
    if (phase === "done") {
      return;
    }
    const now = storyNow();

    if (phase === "hold") {
      const elapsed = now - countStartedAt;
      while (beatIndex < HOLD.length && elapsed >= HOLD[beatIndex].at) {
        fire(HOLD[beatIndex]);
        beatIndex += 1;
      }
      renderCount(elapsed);
      if (beatIndex === HOLD.length) {
        phase = "outro";
        beatIndex = 0;
        lastBeatAt = now;
      }
    } else {
      const beats = phase === "intro" ? INTRO : OUTRO;
      while (beatIndex < beats.length) {
        const beat = beats[beatIndex];
        if (now < lastBeatAt + beat.after || (beat.needsLaterArt && !laterArtReady)) {
          break;
        }
        fire(beat);
        beatIndex += 1;
        lastBeatAt = now;
        if (beat.startsHold) {
          phase = "hold";
          beatIndex = 0;
          countStartedAt = now;
          break;
        }
      }
      if (phase === "outro" && beatIndex === beats.length) {
        phase = "done";
        return;
      }
    }

    window.requestAnimationFrame(tick);
  }

  // Skip ends the story on its last frame at once. Transitions are held off
  // for the cut and allowed again two frames later, while the download
  // section, outside the stage, fades in as usual.
  function skipToEnd() {
    if (phase === "done") {
      return;
    }
    phase = "done";
    stage.classList.add("is-cutting");
    showCopy("");
    apply(FINAL_STATE);
    showFinalLine(false);
    announce(FINAL_WORDS);
    if (document.activeElement === skipButton) {
      siteFooter.querySelector("a").focus({ preventScroll: true });
    }
    window.requestAnimationFrame(function afterCut() {
      window.requestAnimationFrame(function allowTransitions() {
        stage.classList.remove("is-cutting");
      });
    });
  }

  skipButton.addEventListener("click", skipToEnd);

  // The final line stays in the markup for pages without JavaScript; here it
  // starts empty and streams in at the end.
  finalLine.replaceChildren();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply(FINAL_STATE);
    showFinalLine(false);
    announce(FINAL_WORDS);
    phase = "done";
    return;
  }

  function decodeAll(list) {
    return Promise.all(list.map(function decode(image) {
      return image.decode().catch(function ignore() { });
    }));
  }

  const opening = images.filter(function isOpening(image) {
    return image.hasAttribute("data-first");
  });
  const later = images.filter(function isLater(image) {
    return !image.hasAttribute("data-first");
  });

  // Start once the opening poses are ready; the rest decodes while the
  // opening plays, and the phone view waits for it if it is still loading.
  decodeAll(opening).then(function startStory() {
    decodeAll(later).then(function markLaterReady() {
      laterArtReady = true;
    });
    // Skipped before the story could start.
    if (phase !== "loading") {
      return;
    }
    phase = "intro";
    beatIndex = 0;
    lastBeatAt = storyNow();
    window.requestAnimationFrame(tick);
  });
})();
