import "./chunk-EWTE5DHJ.js";

// node_modules/minimal-shared/dist/utils/index.js
var p = (r) => {
  let e = r.split("?")[1];
  return e ? new URLSearchParams(e).toString().length > 0 : false;
};
function a(r) {
  return r !== "/" && r.endsWith("/") ? r.slice(0, -1) : r;
}
function T(r, e) {
  return a(r) === a(e);
}
function f(r) {
  try {
    let e = new URL(r, window.location.origin);
    return a(e.pathname);
  } catch {
    return r;
  }
}
function g(r) {
  return r.startsWith("http");
}
function w(r) {
  return (e) => {
    if (r.length !== 0) for (let t of r) t && (typeof t == "function" ? t(e) : "current" in t && (t.current = e));
  };
}
var d = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
function $(r) {
  return r ? `"${r}", ${d}` : d;
}
function C(r) {
  let e = parseFloat(r);
  return Math.round(e * 16);
}
function A(r) {
  if (typeof r != "number" || isNaN(r)) throw new Error(`Invalid pixel value: ${r}`);
  return `${r / 16}rem`;
}
function h(r) {
  if (!r) throw new Error("Hex color is undefined!");
  if (!/^#[0-9A-F]{6}$/i.test(r)) throw new Error(`Invalid hex color: ${r}`);
  let e = parseInt(r.substring(1, 3), 16), t = parseInt(r.substring(3, 5), 16), n = parseInt(r.substring(5, 7), 16);
  return `${e} ${t} ${n}`;
}
function P(r) {
  let e = {};
  return Object.entries(r).forEach(([t, n]) => {
    n && (e[`${t}Channel`] = h(n));
  }), { ...r, ...e };
}
function E(r, e = 1) {
  if (!r) throw new Error("[Alpha]: Color is undefined!");
  if (r.startsWith("#") || r.startsWith("rgb") || r.startsWith("rgba") || !r.includes("var") && r.includes("Channel")) throw new Error([`[Alpha]: Unsupported color format "${r}"`, "Supported formats are:", '- RGB channels: "0 184 217"', '- CSS variables with "Channel" prefix: "var(--palette-common-blackChannel, #000000)"', "Unsupported formats are:", '- Hex: "#00B8D9"', '- RGB: "rgb(0, 184, 217)"', '- RGBA: "rgba(0, 184, 217, 1)"'].join(`
`));
  return `rgba(${r} / ${e})`;
}
function N(r, e) {
  return !r || !e.length || typeof r != "object" ? false : e.every((t) => t in r);
}
function V() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (r) => {
    let e = Math.random() * 16 | 0;
    return (r === "x" ? e : e & 3 | 8).toString(16);
  });
}
function U(r, e) {
  let t = r ? Array.isArray(r) ? r : [r] : [], n = Object.entries(e || {}).filter(([o, i]) => i !== void 0 && i !== false).map(([o, i]) => Array.isArray(i) ? i[0] ? i[1] : "" : i ? o : "").filter(Boolean);
  return [...t.filter(Boolean), ...n].join(" ");
}
function L(r) {
  if (!r || typeof r != "string") return console.warn("Invalid cookie key provided"), null;
  try {
    let e = `${r}=`, o = decodeURIComponent(document.cookie).split("; ").find((c) => c.startsWith(e));
    if (!o) return null;
    let i = o.substring(e.length);
    try {
      return JSON.parse(i);
    } catch {
      return i;
    }
  } catch (e) {
    return console.error("Error retrieving cookie:", e), null;
  }
}
function j(r, e, t) {
  if (!r || typeof r != "string") {
    console.error("Invalid cookie key provided");
    return;
  }
  let { daysUntilExpiration: n = 0, sameSite: o = "Strict", secure: i = false, path: c = "/", domain: u } = t ?? {};
  try {
    let s = encodeURIComponent(typeof e == "string" ? e : JSON.stringify(e)), l = [`${r}=${s}`, `path=${c}`, o && `SameSite=${o}`, i && "Secure", u && `domain=${u}`];
    if (n > 0) {
      let m = new Date(Date.now() + n * 24 * 60 * 60 * 1e3);
      l.push(`expires=${m.toUTCString()}`);
    }
    document.cookie = l.filter(Boolean).join("; ");
  } catch (s) {
    console.error("Error setting cookie:", s);
  }
}
function F(r, e) {
  if (!r || typeof r != "string") {
    console.error("Invalid cookie key provided");
    return;
  }
  let { path: t = "/", domain: n } = e ?? {};
  try {
    let o = [`${r}=`, "expires=Thu, 01 Jan 1970 00:00:00 GMT", `path=${t}`, n && `domain=${n}`, "Secure"];
    document.cookie = o.filter(Boolean).join("; ");
  } catch (o) {
    console.error("Error removing cookie:", o);
  }
}
function J(r, e, t = true) {
  let n = a(r), o = p(e);
  if (e.startsWith("#") || g(e)) return false;
  if (t || o) {
    let u = n.includes(e), s = f(e);
    return u || o && s === n;
  }
  return n === e;
}
function G(r, e) {
  if (!y()) return e ?? null;
  let t = localStorage.getItem(r);
  if (t !== "undefined") {
    if (t) try {
      return JSON.parse(t);
    } catch {
      return t ?? e ?? null;
    }
    return e ?? null;
  }
}
function H(r, e) {
  try {
    let t = JSON.stringify(e);
    window.localStorage.setItem(r, t);
  } catch (t) {
    console.error("Error while setting storage:", t);
  }
}
function K(r) {
  try {
    window.localStorage.removeItem(r);
  } catch (e) {
    console.error("Error while removing from storage:", e);
  }
}
function y() {
  try {
    let r = "__some_random_key_you_are_not_going_to_use__";
    return window.localStorage.setItem(r, r), window.localStorage.removeItem(r), true;
  } catch {
    return false;
  }
}
function x(r, e = "") {
  return r == null || typeof r == "number" && Number.isNaN(r) ? e : r.toString();
}
function b(r) {
  let t = x(r).replace(/[^0-9.]/g, ""), [n, ...o] = t.split(".");
  return o.length > 0 ? `${n}.${o.join("")}` : n;
}
function S(r, e = "") {
  if (r == null || typeof r == "number" && Number.isNaN(r)) return e;
  let t = parseFloat(r.toString());
  return Number.isNaN(t) ? e : t;
}
var z = { onChange: b, onBlur: S, value: x };
export {
  P as createPaletteChannel,
  L as getCookie,
  G as getStorage,
  N as hasKeys,
  p as hasParams,
  h as hexToRgbChannel,
  J as isActiveLink,
  T as isEqualPath,
  g as isExternalLink,
  y as localStorageAvailable,
  U as mergeClasses,
  w as mergeRefs,
  A as pxToRem,
  C as remToPx,
  F as removeCookie,
  a as removeLastSlash,
  f as removeParams,
  K as removeStorage,
  j as setCookie,
  $ as setFont,
  H as setStorage,
  z as transformNumber,
  x as transformValue,
  S as transformValueOnBlur,
  b as transformValueOnChange,
  V as uuidv4,
  E as varAlpha
};
//# sourceMappingURL=minimal-shared_utils.js.map
