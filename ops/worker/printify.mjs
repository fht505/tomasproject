// Printify API client — real endpoints only, no mock mode.
// Docs: https://developers.printify.com/
// Every function throws on non-2xx; nothing fabricates data.

const BASE = 'https://api.printify.com/v1';

export function makeClient(token) {
  if (!token) throw new Error('PRINTIFY_API_TOKEN is not set');

  async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'perpetua-orbital-ops',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`printify ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
    }
    return text ? JSON.parse(text) : null;
  }

  return {
    // --- account / shops ---
    shops: () => call('GET', '/shops.json'),

    // --- catalog (blueprints = product types, providers print them) ---
    blueprints: () => call('GET', '/catalog/blueprints.json'),
    blueprint: (id) => call('GET', `/catalog/blueprints/${id}.json`),
    providers: (blueprintId) =>
      call('GET', `/catalog/blueprints/${blueprintId}/print_providers.json`),
    // the per-blueprint list often omits location; this one carries it, and
    // location decides transit time for every US buyer
    allProviders: () => call('GET', '/catalog/print_providers.json'),
    variants: (blueprintId, providerId) =>
      call('GET', `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`),
    shipping: (blueprintId, providerId) =>
      call('GET', `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/shipping.json`),

    // --- artwork upload (url or base64 contents) ---
    uploadImageByUrl: (fileName, url) =>
      call('POST', '/uploads/images.json', { file_name: fileName, url }),
    uploadImageB64: (fileName, contentsB64) =>
      call('POST', '/uploads/images.json', { file_name: fileName, contents: contentsB64 }),

    // --- products (created as DRAFTS in Printify; publish is separate) ---
    createProduct: (shopId, product) =>
      call('POST', `/shops/${shopId}/products.json`, product),
    getProduct: (shopId, productId) =>
      call('GET', `/shops/${shopId}/products/${productId}.json`),
    listProducts: (shopId, page = 1) =>
      call('GET', `/shops/${shopId}/products.json?page=${page}`),
    // rollback. On a product that was already published this also removes the
    // Etsy listing, which is why unstage refuses published items without --force.
    deleteProduct: (shopId, productId) =>
      call('DELETE', `/shops/${shopId}/products/${productId}.json`),
    unpublishProduct: (shopId, productId) =>
      call('POST', `/shops/${shopId}/products/${productId}/unpublish.json`, {}),
    // publish pushes the product to the connected Etsy store
    // (rate limit: 200 publishes / 30 minutes)
    publishProduct: (shopId, productId, opts = {}) =>
      call('POST', `/shops/${shopId}/products/${productId}/publish.json`, {
        title: true, description: true, images: true,
        variants: true, tags: true, keyFeatures: true, shipping_template: true,
        ...opts,
      }),

    // --- the numbers that end up on the station HUD ---
    orders: (shopId, page = 1) =>
      call('GET', `/shops/${shopId}/orders.json?page=${page}`),
    order: (shopId, orderId) =>
      call('GET', `/shops/${shopId}/orders/${orderId}.json`),
  };
}
