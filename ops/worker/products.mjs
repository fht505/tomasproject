// The five product types this batch sells, and what we plan to charge.
//
// Shared deliberately: gen-listings.mjs builds listings from this, and
// `ops.mjs catalog` prices the real Printify base costs against it. If those
// two ever disagreed about the price of a tee, the margin guard would be
// protecting a number nobody was actually selling at.
//
// `count` is how many listings of that type BATCH-01 contains — used to say
// how much of the batch a missing blueprint would take with it.

export const PRODUCTS = {
  candle: { type: 'candle_9oz', price: 28.95, blueprintHint: 'scented candle 9oz', count: 12 },
  tee: { type: 'tee_bella_3001', price: 23.95, blueprintHint: 'Bella+Canvas 3001', count: 20 },
  // 35.95, not 34.95: Etsy's US Free Shipping Guarantee triggers at $35 and a
  // sweatshirt is the one item in this batch that sells alone above it.
  sweatshirt: { type: 'sweatshirt_gildan_18000', price: 35.95, blueprintHint: 'Gildan 18000', count: 2 },
  mug: { type: 'mug_11oz', price: 17.95, blueprintHint: 'ceramic mug 11oz', count: 4 },
  tote: { type: 'tote', price: 19.95, blueprintHint: 'cotton tote', count: 2 },
};

// product type -> the family label intake.mjs sizes print masters by
export const TYPE_TO_KEY = Object.fromEntries(
  Object.entries(PRODUCTS).map(([key, p]) => [p.type, key]));
