/**
 * Browser polyfills for Node.js globals required by @solana/web3.js,
 * @solana/spl-token and the Solana wallet adapters.
 *
 * This module must be imported before any Solana code runs (see main.tsx),
 * so `Buffer` and `global` are guaranteed to exist when the wallet connects
 * and balances are fetched.
 */
import { Buffer } from "buffer";

const globalRef = globalThis as unknown as {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
};

if (typeof globalRef.Buffer === "undefined") {
  globalRef.Buffer = Buffer;
}

if (typeof globalRef.global === "undefined") {
  globalRef.global = globalThis;
}
