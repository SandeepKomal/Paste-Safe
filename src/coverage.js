// @ts-check
// Fake samples for the coverage card. The page runs the real detector on them,
// so the card always describes the code that is running, misses included.
// Key-shaped samples are joined from two halves so secret scanners don't flag this file.

/**
 * @typedef {object} Sample
 * @property {string} name   what kind of secret this is
 * @property {string} text   a fake line containing it
 * @property {string} secret the part that must not reach the AI
 * @property {boolean} gap   true when the detector is known not to catch it
 */

/** @type {readonly Sample[]} */
export const SAMPLES = Object.freeze([
  { name: "AWS access key", text: "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", secret: "AKIAIOSFODNN7EXAMPLE", gap: false },
  { name: "Stripe secret key", text: `STRIPE_KEY=${"sk_" + "live_4eC39HqLyjWDarjtT1zdp7dc"}`, secret: "sk_" + "live_4eC39HqLyjWDarjtT1zdp7dc", gap: false },
  { name: "GitHub token", text: `token: ${"gh" + "p_R2d2C3poBb8Lk4Mn6Pq8Rs0Tu2Vw4Xy6Za8b"}`, secret: "gh" + "p_R2d2C3poBb8Lk4Mn6Pq8Rs0Tu2Vw4Xy6Za8b", gap: false },
  { name: "AI provider key", text: `OPENAI_API_KEY=${"sk-" + "proj-Xr4mPl3K3yN0tR3alAbCdEf12"}`, secret: "sk-" + "proj-Xr4mPl3K3yN0tR3alAbCdEf12", gap: false },
  { name: "JWT", text: "Authorization: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vIn0.ZmFrZS1zaWduYXR1cmU", secret: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vIn0.ZmFrZS1zaWduYXR1cmU", gap: false },
  { name: "Password in a URL", text: "postgres://app:Hunter2Pass@db.example.com/shop", secret: "Hunter2Pass", gap: false },
  { name: "Password setting", text: "DB_PASSWORD=correct-horse-battery", secret: "correct-horse-battery", gap: false },
  { name: "Email address", text: "alert sent to jane.doe@example.com", secret: "jane.doe@example.com", gap: false },
  { name: "IP address", text: "timeout from 10.20.4.17", secret: "10.20.4.17", gap: false },
  { name: "Vault token", text: `VAULT_TOKEN=${"hv" + "s.CAESIJ1oD3x9vZ2k8pQwErTyUiOp"}`, secret: "hv" + "s.CAESIJ1oD3x9vZ2k8pQwErTyUiOp", gap: false },
  { name: "Kubeconfig client key", text: "client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVk=", secret: "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVk=", gap: false },
  { name: "Password flag", text: "docker login -u ci --password Hunter2Pass", secret: "Hunter2Pass", gap: false },
  { name: "Password hash", text: "admin:$2b$12$KIXQ8z3f9jR1mVq0aYp7.eG5nH2oL4wT6uS8bD0cF1gJ3kM5pQ7rS", secret: "$2b$12$KIXQ8z3f9jR1mVq0aYp7.eG5nH2oL4wT6uS8bD0cF1gJ3kM5pQ7rS", gap: false },
  { name: "Payment card", text: "card 4111 1111 1111 1111 declined", secret: "4111 1111 1111 1111", gap: false },
  { name: "Person's name", text: "approved by Priya Sharma", secret: "Priya Sharma", gap: true },
  { name: "Company name", text: "customer: Northwind Traders", secret: "Northwind Traders", gap: true },
  { name: "Password in plain prose", text: "I logged in with hunter2 again", secret: "hunter2", gap: true },
]);
