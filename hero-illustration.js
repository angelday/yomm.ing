const heroIllustration = document.querySelector(".hero-illustration");
const heroStage = document.querySelector(".hero-stage");
const welcomeCta = document.querySelector(".welcome-cta");

if (heroIllustration) {
  const interactionSurface = heroStage || heroIllustration;
  const poseDelays = {
    phoneToKneel: 650,
    kneelToComfort: 325,
    reverseStep: 300,
  };
  const poseTimers = [];
  let currentPose = heroIllustration.dataset.pose;

  const clearPoseTimers = () => {
    poseTimers.splice(0).forEach((timer) => window.clearTimeout(timer));
  };

  const setWelcomeCtaVisibility = (isVisible) => {
    if (!welcomeCta) {
      return;
    }

    welcomeCta.classList.toggle("is-visible", isVisible);
    welcomeCta.setAttribute("aria-hidden", String(!isVisible));
    welcomeCta.tabIndex = isVisible ? 0 : -1;
  };

  const showPose = (pose) => {
    currentPose = pose;
    heroIllustration.dataset.pose = pose;
    setWelcomeCtaVisibility(pose === "comfort");
  };

  const showThoughtfulPose = () => {
    clearPoseTimers();
    showPose("thoughtful");
  };

  const startPhoneSequence = () => {
    clearPoseTimers();
    showPose("phone");
    poseTimers.push(window.setTimeout(() => {
      showPose("kneel");
    }, poseDelays.phoneToKneel));
    poseTimers.push(window.setTimeout(() => {
      showPose("comfort");
    }, poseDelays.phoneToKneel + poseDelays.kneelToComfort));
  };

  const reversePhoneSequence = () => {
    if (currentPose === "thoughtful") {
      return;
    }

    clearPoseTimers();

    const reverseSteps = {
      phone: [["thoughtful", poseDelays.reverseStep]],
      kneel: [
        ["phone", poseDelays.reverseStep],
        ["thoughtful", poseDelays.reverseStep * 2],
      ],
      comfort: [
        ["kneel", poseDelays.reverseStep],
        ["phone", poseDelays.reverseStep * 2],
        ["thoughtful", poseDelays.reverseStep * 3],
      ],
    };

    reverseSteps[currentPose].forEach(([pose, delay]) => {
      poseTimers.push(window.setTimeout(() => {
        showPose(pose);
      }, delay));
    });
  };

  const resetWhenInactive = () => {
    if (heroIllustration.getAttribute("aria-pressed") !== "true") {
      setWelcomeCtaVisibility(false);
      reversePhoneSequence();
    }
  };

  interactionSurface.addEventListener("pointerenter", startPhoneSequence);
  interactionSurface.addEventListener("pointerleave", resetWhenInactive);
  interactionSurface.addEventListener("focusin", (event) => {
    if (event.target === heroIllustration) {
      startPhoneSequence();
    }
  });
  interactionSurface.addEventListener("focusout", (event) => {
    if (!interactionSurface.contains(event.relatedTarget)) {
      resetWhenInactive();
    }
  });

  heroIllustration.addEventListener("click", () => {
    const isPhonePose = heroIllustration.getAttribute("aria-pressed") === "true";
    heroIllustration.setAttribute("aria-pressed", String(!isPhonePose));
    heroIllustration.setAttribute(
      "aria-label",
      isPhonePose ? "Show yommguy looking at his phone" : "Show yommguy's thoughtful pose"
    );

    if (isPhonePose) {
      showThoughtfulPose();
    } else {
      startPhoneSequence();
    }
  });
}
