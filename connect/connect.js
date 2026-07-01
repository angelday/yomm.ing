const APP_STORE_URL = "https://apps.apple.com/";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;

const parameters = new URLSearchParams(window.location.search);
const pathCode = window.location.pathname.split("/").filter(Boolean)[1] ?? null;
const queryCode = parameters.get("code");
const suppliedCode = queryCode ?? pathCode;
const isPreview = suppliedCode === "preview" || suppliedCode === null;
const friendCode = TOKEN_PATTERN.test(suppliedCode ?? "") ? suppliedCode : null;
const isInvalid = parameters.get("invalid") === "1" || (!isPreview && friendCode === null);
const friendName = parameters.get("name");

const connectState = document.querySelector("#connect-state");
const invalidState = document.querySelector("#invalid-state");

if (isInvalid) {
  connectState.hidden = true;
  invalidState.hidden = false;
} else {
  const invitationURL = friendCode
    ? `https://yomm.ing/connect/${friendCode}${friendName ? "?name=" + encodeURIComponent(friendName) : ""}`
    : "https://yomm.ing/connect/preview";

  const appStoreLink = document.querySelector("#app-store-link");
  const qrCodeElement = document.querySelector("#qr-code");

  appStoreLink.href = APP_STORE_URL;

  const qr = qrcode(0, "M");
  qr.addData(invitationURL);
  qr.make();
  qrCodeElement.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
}
