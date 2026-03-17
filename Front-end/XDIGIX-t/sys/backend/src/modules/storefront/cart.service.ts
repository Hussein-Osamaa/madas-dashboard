/**
 * CartService — manages storefront shopping-cart sessions.
 *
 * All operations are keyed by `cartToken` (a UUID stored in the browser's
 * sessionStorage under `xd-cart-{tenantId}`).  No authentication is needed;
 * the token is the sole credential.
 */
import { v4 as uuidv4 } from 'uuid';
import { CartSession, ICartItem } from '../../schemas/cart-session.schema';

const CART_TTL_HOURS = 24;

function cartExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + CART_TTL_HOURS);
  return d;
}

/** Computed view returned to the storefront. */
export interface CartView {
  cartToken: string;
  items:     ICartItem[];
  itemCount: number;
  subtotal:  number;
  currency:  string;
}

function buildView(session: {
  cartToken: string;
  items:     ICartItem[];
  currency:  string;
}): CartView {
  const items = session.items ?? [];
  return {
    cartToken: session.cartToken,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal:  items.reduce((s, i) => s + i.price * i.quantity, 0),
    currency:  session.currency,
  };
}

/** Get or initialise an empty cart for the given token. */
export async function getCart(
  cartToken: string | undefined,
  tenantId:   string,
  businessId: string,
  currency:   string = 'SAR',
): Promise<CartView> {
  if (cartToken) {
    const session = await CartSession.findOne({ cartToken, tenantId }).lean();
    if (session) return buildView(session as { cartToken: string; items: ICartItem[]; currency: string });
  }
  // Return an empty cart (don't persist until first add)
  const token = cartToken ?? uuidv4();
  return buildView({ cartToken: token, items: [], currency });
}

/** Add or increment a product in the cart.  Creates the cart if it doesn't exist. */
export async function addToCart(
  cartToken:   string | undefined,
  tenantId:    string,
  businessId:  string,
  item: {
    productId:  string;
    variantId?: string;
    name:       string;
    price:      number;
    imageUrl?:  string;
    quantity?:  number;
  },
  currency: string = 'SAR',
): Promise<CartView> {
  const token = cartToken ?? uuidv4();
  const qty = Math.max(1, item.quantity ?? 1);

  let session = await CartSession.findOne({ cartToken: token, tenantId });

  if (!session) {
    session = await CartSession.create({
      cartToken:  token,
      tenantId,
      businessId,
      currency,
      items:     [],
      expiresAt: cartExpiresAt(),
    });
  }

  const existingIdx = session.items.findIndex(
    i => i.productId === item.productId && (i.variantId ?? '') === (item.variantId ?? '')
  );

  if (existingIdx >= 0) {
    session.items[existingIdx].quantity += qty;
  } else {
    session.items.push({
      productId:  item.productId,
      variantId:  item.variantId,
      name:       item.name,
      price:      item.price,
      imageUrl:   item.imageUrl,
      quantity:   qty,
    });
  }

  // Refresh TTL on every mutation
  session.expiresAt = cartExpiresAt();
  await session.save();

  return buildView(session);
}

/** Remove a single item (by productId + optional variantId) from the cart. */
export async function removeFromCart(
  cartToken:  string,
  tenantId:   string,
  productId:  string,
  variantId?: string,
): Promise<CartView> {
  const session = await CartSession.findOne({ cartToken, tenantId });
  if (!session) {
    return buildView({ cartToken, items: [], currency: 'SAR' });
  }
  session.items = session.items.filter(
    i => !(i.productId === productId && (i.variantId ?? '') === (variantId ?? ''))
  );
  session.expiresAt = cartExpiresAt();
  await session.save();
  return buildView(session);
}

/** Update quantity for a specific item.  quantity <= 0 removes the item. */
export async function updateCartItem(
  cartToken:  string,
  tenantId:   string,
  productId:  string,
  variantId:  string | undefined,
  quantity:   number,
): Promise<CartView> {
  const session = await CartSession.findOne({ cartToken, tenantId });
  if (!session) return buildView({ cartToken, items: [], currency: 'SAR' });

  const idx = session.items.findIndex(
    i => i.productId === productId && (i.variantId ?? '') === (variantId ?? '')
  );
  if (idx >= 0) {
    if (quantity <= 0) {
      session.items.splice(idx, 1);
    } else {
      session.items[idx].quantity = quantity;
    }
  }
  session.expiresAt = cartExpiresAt();
  await session.save();
  return buildView(session);
}

/** Clear all items from the cart. */
export async function clearCart(cartToken: string, tenantId: string): Promise<CartView> {
  const session = await CartSession.findOne({ cartToken, tenantId });
  if (!session) return buildView({ cartToken, items: [], currency: 'SAR' });
  session.items    = [];
  session.expiresAt = cartExpiresAt();
  await session.save();
  return buildView(session);
}
