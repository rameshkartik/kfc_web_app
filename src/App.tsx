import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ShoppingBasket, Menu, X, ArrowRight, Trash2, Minus, Plus, ShieldCheck, Truck, Clock3, Leaf } from "lucide-react";

type Category = "Mutton" | "Chicken";
type Product = { slug: string; name: string; category: Category; description: string; cuts: string[]; weights: number[]; image: string };
type CartItem = { key: string; slug: string; cut: string; grams: number; quantity: number };
const products: Product[] = [
  { slug: "fresh-mutton", name: "Fresh Mutton", category: "Mutton", description: "Choose a cut and weight. Final prices and availability will be published once the catalogue is configured.", cuts: ["Curry cut", "Boneless"], weights: [250, 500, 1000], image: "/mutton.svg" },
  { slug: "fresh-chicken", name: "Fresh Chicken", category: "Chicken", description: "Choose a cut and weight. Final prices and availability will be published once the catalogue is configured.", cuts: ["Curry cut", "Boneless"], weights: [250, 500, 1000], image: "/chicken.svg" },
];
const zones = ["Singanallur", "GV Residency", "Krishna Colony", "MGR Nagar"];
function findProduct(slug: string) { return products.find(p => p.slug === slug); }
function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { const v = JSON.parse(localStorage.getItem("kfc-cart-v1") || "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem("kfc-cart-v1", JSON.stringify(cart)); }, [cart]);
  const add = (slug: string, cut: string, grams: number) => {
    const key = [slug, cut, grams].join("|");
    setCart(items => items.some(x => x.key === key) ? items.map(x => x.key === key ? { ...x, quantity: x.quantity + 1 } : x) : [...items, { key, slug, cut, grams, quantity: 1 }]);
  };
  const change = (key: string, delta: number) => setCart(items => items.map(x => x.key === key ? { ...x, quantity: x.quantity + delta } : x).filter(x => x.quantity > 0));
  const remove = (key: string) => setCart(items => items.filter(x => x.key !== key));
  return { cart, add, change, remove, count: cart.reduce((n, x) => n + x.quantity, 0) };
}
type CartState = ReturnType<typeof useCart>;
const CartContext = createContext<CartState | null>(null);
function cartState() { const value = useContext(CartContext); if (!value) throw Error("Cart unavailable"); return value; }
function Layout({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false);
  const { count } = cartState();
  const items = [["/", "Home"], ["/shop", "Shop"], ["/my-orders", "My Orders"], ["/contact", "Contact"]];
  return <><div className="announcement">FRESH CUTS. FRESHLY DELIVERED. · COIMBATORE</div>
    <header className="site-header"><div className="container header-inner"><Link className="brand" to="/"><span className="brand-mark">K</span><span>KOVAI <strong>FRESH CUTS</strong><small>Fresh cuts. Freshly delivered.</small></span></Link><nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">{items.map(([path, label]) => <NavLink key={path} onClick={() => setMenu(false)} to={path}>{label}</NavLink>)}<Link className="cart-link" to="/cart" onClick={() => setMenu(false)}><ShoppingBasket size={19}/> Cart <span className="count">{count}</span></Link></nav><button className="menu-toggle" aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></header>
    <main>{children}</main><footer className="footer"><div className="container footer-grid"><div><h3>KOVAI FRESH CUTS</h3><p>Fresh Cuts. Freshly Delivered.</p><p>Pre-order fresh mutton and chicken for doorstep delivery in selected Coimbatore areas.</p></div><div><h4>Explore</h4><Link to="/shop">Shop</Link><Link to="/track">Track order</Link><Link to="/contact">Contact</Link></div><div><h4>Information</h4><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/refund-policy">Refund policy</Link><Link to="/shipping-policy">Delivery policy</Link></div></div><div className="container footer-bottom">© {new Date().getFullYear()} Kovai Fresh Cuts · Service details and prices pending confirmation</div></footer></>;
}
function Note({ children }: { children: React.ReactNode }) { return <div className="notice" role="status">{children}</div>; }
function Home() { return <><section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow">COIMBATORE · PRE-ORDER DELIVERY</span><h1>Fresh cuts.<br/><em>Freshly delivered.</em></h1><p>Choose your preferred mutton or chicken cuts. Order ahead for scheduled doorstep delivery.</p><div className="hero-actions"><Link className="btn" to="/shop">Explore fresh cuts <ArrowRight size={18}/></Link><Link className="btn secondary" to="/contact">Delivery areas</Link></div><p className="fine-print">Delivery schedule, cutoff and pricing will be announced soon.</p></div><div className="hero-visual"><div className="hero-tile"><img src="/mutton.svg" alt="Illustrated mutton category"/></div><div className="hero-tile offset"><img src="/chicken.svg" alt="Illustrated chicken category"/></div><span className="hero-stamp">PRE-ORDER<br/>FRESH</span></div></div></section><section className="container section"><div className="section-head"><div><span className="eyebrow">WHAT WE OFFER</span><h2>Pick your fresh cut</h2></div><Link className="text-link" to="/shop">View all <ArrowRight size={17}/></Link></div><div className="product-grid">{products.map(p => <ProductCard key={p.slug} product={p}/>)}</div></section><section className="cream-band"><div className="container"><div className="section-head"><div><span className="eyebrow">THE SIMPLE WAY</span><h2>Freshness made easy</h2></div></div><div className="features"><div><ShoppingBasket/><h3>Choose your cuts</h3><p>Browse mutton and chicken and select your preferred cut and weight.</p></div><div><Clock3/><h3>Pre-order ahead</h3><p>Orders will follow a published delivery schedule and cutoff time.</p></div><div><Truck/><h3>Doorstep delivery</h3><p>Delivery is planned for selected Coimbatore neighbourhoods.</p></div></div></div></section></>; }
function ProductCard({ product: p }: { product: Product }) { return <article className="product-card"><Link to={`/products/${p.slug}`}><div className="product-img"><img src={p.image} alt={`Illustration for ${p.name}`}/><span className="category-tag">{p.category}</span></div></Link><div className="product-body"><h3>{p.name}</h3><p>{p.cuts.join(" · ")}</p><div className="product-foot"><span className="price-placeholder">Price coming soon</span><Link className="small-btn" to={`/products/${p.slug}`}>Select <ArrowRight size={15}/></Link></div></div></article>; }
function Shop() { const [filter, setFilter] = useState("All"); return <div className="container page"><span className="eyebrow">FRESH CUTS</span><h1>Shop our selection</h1><p className="lead">Discover your preferred cuts. Ordering opens after catalogue prices and delivery slots are configured.</p><div className="tabs">{["All", "Mutton", "Chicken"].map(t => <button className={filter === t ? "selected" : ""} onClick={() => setFilter(t)} key={t}>{t}</button>)}</div><div className="product-grid">{products.filter(p => filter === "All" || filter === p.category).map(p => <ProductCard key={p.slug} product={p}/>)}</div></div>; }
function Detail() { const { slug } = useParams(); const p = findProduct(slug || ""); const [cut, setCut] = useState("Curry cut"); const [grams, setGrams] = useState(500); const navigate = useNavigate(); const { add } = cartState(); if (!p) return <NotFound/>; return <div className="container page"><Link className="back" to="/shop">← Back to shop</Link><div className="detail-grid"><div className="detail-image"><img src={p.image} alt={`Illustration for ${p.name}`}/></div><div><span className="eyebrow">{p.category} · PRE-ORDER</span><h1>{p.name}</h1><p className="lead">{p.description}</p><label className="field-label" htmlFor="cut">Cut type</label><select id="cut" value={cut} onChange={e => setCut(e.target.value)}>{p.cuts.map(c => <option key={c}>{c}</option>)}</select><p className="field-label">Choose weight</p><div className="tabs">{p.weights.map(g => <button key={g} className={grams === g ? "selected" : ""} onClick={() => setGrams(g)}>{g === 1000 ? "1 kg" : g + " g"}</button>)}</div><Note>Prices and availability have not been published. You can create a draft cart, but checkout is disabled until live prices and delivery rules are configured.</Note><button className="btn" onClick={() => { add(p.slug, cut, grams); navigate("/cart"); }}>Add to draft cart <ArrowRight size={17}/></button></div></div></div>; }
function Cart() { const { cart, change, remove } = cartState(); return <div className="container page"><span className="eyebrow">YOUR SELECTION</span><h1>Shopping cart</h1>{cart.length === 0 ? <div className="empty"><ShoppingBasket size={42}/><h2>Your cart is empty</h2><p>Start by choosing fresh mutton or chicken.</p><Link className="btn" to="/shop">Browse products</Link></div> : <div className="checkout-grid"><div className="cart-items">{cart.map(x => { const p = findProduct(x.slug); return <div className="cart-row" key={x.key}><img src={p?.image} alt="" /><div className="grow"><h3>{p?.name}</h3><p>{x.cut} · {x.grams === 1000 ? "1 kg" : x.grams + " g"}</p><span className="muted">Price pending</span></div><div className="quantity"><button aria-label="Decrease quantity" onClick={() => change(x.key,-1)}><Minus size={14}/></button><span>{x.quantity}</span><button aria-label="Increase quantity" onClick={() => change(x.key,1)}><Plus size={14}/></button></div><button className="icon-btn" aria-label="Remove item" onClick={() => remove(x.key)}><Trash2 size={18}/></button></div>; })}</div><aside className="summary"><h2>Order summary</h2><p>Subtotal <strong>Pending prices</strong></p><p>Delivery fee <strong>Pending zone</strong></p><hr/><Note>Live checkout will only proceed after the backend confirms product prices and delivery availability.</Note><Link className="btn" to="/checkout">Continue to checkout</Link><Link className="text-link" to="/shop">Continue shopping</Link></aside></div>}</div>; }
type BackendVariant = {id:string;cut_type:string;weight_grams:number;price_paise:number};
type BackendProduct = {slug:string;name:string;product_variants:BackendVariant[]};
type BackendZone = {id:string;name:string;postal_codes:string[];fee_paise:number};
type BackendSlot = {id:string;zone_id:string;delivery_date:string;start_time:string;end_time:string};
type Catalogue = {products:BackendProduct[];zones:BackendZone[];slots:BackendSlot[]};
const apiBase = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\\/$/,"");
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
async function backend(path:string, body?:unknown) {
  if(!apiBase || !anonKey) throw Error("Online ordering is not configured yet.");
  const response=await fetch(apiBase+"/functions/v1/"+path,{
    method:body?"POST":"GET",
    headers:{"Content-Type":"application/json",apikey:anonKey,Authorization:"Bearer "+anonKey},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const result=await response.json();
  if(!response.ok) throw Error(result.error || "Request failed");
  return result;
}
type RazorpayInstance = {open:()=>void};
type RazorpayConstructor = new (options:Record<string,unknown>)=>RazorpayInstance;
declare global {interface Window {Razorpay?:RazorpayConstructor}}
async function loadRazorpay() {
  if(window.Razorpay) return;
  await new Promise<void>((resolve,reject)=>{
    const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";
    script.onload=()=>resolve();script.onerror=()=>reject(Error("Payment gateway could not be loaded"));document.head.appendChild(script);
  });
}
function Checkout() {
 const {cart}=cartState();
 const [catalogue,setCatalogue]=useState<Catalogue|null>(null);
 const [status,setStatus]=useState("Loading live catalogue…");
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState("");const [phone,setPhone]=useState("");
 const [address,setAddress]=useState("");const [postal,setPostal]=useState("");
 const [zone,setZone]=useState("");const [slot,setSlot]=useState("");
 const [reference,setReference]=useState("");const [confirmed,setConfirmed]=useState(false);
 const [key,setKey]=useState(()=>crypto.randomUUID());
 useEffect(()=>{backend("catalogue").then((result:Catalogue)=>{setCatalogue(result);setStatus("");}).catch((err:Error)=>setStatus(err.message));},[]);
 const zones=catalogue?.zones || [];
 const slots=(catalogue?.slots||[]).filter(s=>s.zone_id===zone);
 const items=cart.map(x=>{
  const p=catalogue?.products.find(p=>p.slug===x.slug);
  const v=p?.product_variants.find(v=>v.cut_type===x.cut && v.weight_grams===x.grams);
  return {...x,name:p?.name,variant:v};
 });
 const ready=items.length>0 && items.every(x=>x.variant) && Boolean(zone) && Boolean(slot) && !busy && !!catalogue;
 const subtotal=items.reduce((sum,x)=>sum+(x.variant?.price_paise||0)*x.quantity,0);
 const fee=zones.find(z=>z.id===zone)?.fee_paise||0;
 async function submit(e:React.FormEvent) {
  e.preventDefault();if(!ready)return;
  setBusy(true);setStatus("");
  try {
   const result=await backend("create-order",{customer_name:name,phone,address_line:address,postal_code:postal,zone_id:zone,slot_id:slot,idempotency_key:key,items:items.map(x=>({variant_id:x.variant!.id,quantity:x.quantity}))});
   setReference(result.reference);
   await loadRazorpay();
   if(!window.Razorpay)throw Error("Payment gateway unavailable");
   const checkout=new window.Razorpay({
    key:result.key_id,amount:result.amount_paise,currency:"INR",
    name:"Kovai Fresh Cuts",description:"Fresh cuts pre-order",
    order_id:result.provider_order_id,
    prefill:{name,contact:phone},
    handler:async (payment:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>{
     try{const confirmation=await backend("verify-payment",payment);
      if(confirmation.status==="confirmed"){setConfirmed(true);setStatus("Payment verified. Your order is confirmed.");setKey(crypto.randomUUID());}
      else setStatus("Payment received; confirmation is pending reconciliation. Contact support with your reference.");
     }catch{setStatus("Payment verification is pending. Do not pay again. Contact support using your order reference.");}
    },
    modal:{ondismiss:()=>setStatus("Payment not completed. Your order is not confirmed.")},
    theme:{color:"#24643f"}
   });
   checkout.open();
  } catch(err){setStatus(err instanceof Error?err.message:"Unable to create order");}
  finally{setBusy(false);}
 }
 if(confirmed)return <div className="container page narrow"><h1>Order confirmed</h1><Note>{status}</Note><p>Your order reference: <strong>{reference}</strong></p></div>;
 return <div className="container page narrow"><span className="eyebrow">SECURE CHECKOUT</span><h1>Checkout</h1>
 {status&&<Note>{status}{reference&&<> Reference: <strong>{reference}</strong></>}</Note>}
 {!cart.length?<Link to="/shop" className="btn">Shop products</Link>:<form onSubmit={submit} className="checkout-form">
  <label className="field-label" htmlFor="checkout-name">Full name</label><input id="checkout-name" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/>
  <label className="field-label" htmlFor="checkout-phone">Mobile number</label><input id="checkout-phone" required pattern="[0-9]{10}" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)}/>
  <label className="field-label" htmlFor="checkout-address">Delivery address</label><textarea id="checkout-address" required minLength={10} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)}/>
  <label className="field-label" htmlFor="checkout-postal">PIN code</label><input id="checkout-postal" required pattern="[0-9]{6}" inputMode="numeric" value={postal} onChange={e=>setPostal(e.target.value)}/>
  <label className="field-label" htmlFor="checkout-zone">Delivery area</label><select id="checkout-zone" required value={zone} onChange={e=>{setZone(e.target.value);setSlot("");}}><option value="">Select delivery area</option>{zones.map(z=><option value={z.id} key={z.id}>{z.name}</option>)}</select>
  <label className="field-label" htmlFor="checkout-slot">Delivery slot</label><select id="checkout-slot" required value={slot} onChange={e=>setSlot(e.target.value)}><option value="">Select delivery slot</option>{slots.map(s=><option key={s.id} value={s.id}>{s.delivery_date} · {s.start_time}–{s.end_time}</option>)}</select>
  <div className="panel"><h2>Order summary</h2>{items.map(x=><p key={x.key}>{x.name||x.slug} · {x.cut} · {x.grams}g × {x.quantity} — {x.variant?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(x.variant.price_paise*x.quantity/100):"Unavailable"}</p>)}<hr/><p>Subtotal: ₹{(subtotal/100).toFixed(2)}</p><p>Delivery: ₹{(fee/100).toFixed(2)}</p><strong>Total: ₹{((subtotal+fee)/100).toFixed(2)}</strong></div>
  <button type="submit" className="btn" disabled={!ready}>{busy?"Processing…":"Proceed to secure payment"}</button>
  {!ready&&<p className="muted">Checkout requires a published catalogue, valid product variants and an available delivery slot.</p>}
 </form>}</div>;
}
function Contact() { const wa = import.meta.env.VITE_PUBLIC_BUSINESS_WHATSAPP as string | undefined; return <div className="container page narrow"><span className="eyebrow">WE'RE LOCAL</span><h1>Contact & delivery areas</h1><p className="lead">We're preparing fresh doorstep delivery in selected Coimbatore areas.</p><div className="panel"><h2>Proposed service areas</h2><div className="zone-list">{zones.map(z => <span key={z}>{z}</span>)}</div><p className="muted">Exact streets, postal codes, delivery fees, dates and cutoff times are yet to be confirmed.</p>{wa && <a className="btn" href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>}</div></div>; }
function Policies({ kind }: { kind: string }) { const headings: Record<string,string> = { privacy:"Privacy policy", terms:"Terms & conditions", "refund-policy":"Cancellation & refund policy", "shipping-policy":"Delivery policy" }; return <div className="container page narrow"><h1>{headings[kind]}</h1><Note>This policy is awaiting business-owner and legal review. No final operational terms have been published.</Note><p>For questions about ordering and delivery, please <Link to="/contact">contact Kovai Fresh Cuts</Link>.</p></div>; }
function PrivateOrders({ title }: { title: string }) { return <div className="container page narrow"><h1>{title}</h1><Note>Secure access is not enabled yet. Customer orders will be displayed only after identity or order-reference verification is implemented.</Note><Link to="/shop" className="btn">Explore products</Link></div>; }
function Admin() { return <div className="container page narrow"><h1>Staff dashboard</h1><Note>Admin access is disabled until Supabase Auth, staff roles and database Row Level Security are configured. No customer or order data is exposed.</Note></div>; }
function NotFound() { return <div className="container page narrow"><h1>Page not found</h1><Link to="/" className="btn">Go home</Link></div>; }
export default function App() {
  const c = useCart();
  return <CartContext.Provider value={c}><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/products/:slug" element={<Detail/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/orders/confirmation" element={<PrivateOrders title="Order confirmation"/>}/><Route path="/track" element={<PrivateOrders title="Track order"/>}/><Route path="/my-orders" element={<PrivateOrders title="My orders"/>}/><Route path="/contact" element={<Contact/>}/>{["privacy","terms","refund-policy","shipping-policy"].map(kind => <Route key={kind} path={`/${kind}`} element={<Policies kind={kind}/>}/>)}{["/admin", "/admin/login", "/admin/orders", "/admin/products", "/admin/delivery", "/admin/settings"].map(path => <Route key={path} path={path} element={<Admin/>}/>)}<Route path="*" element={<NotFound/>}/></Routes></Layout></CartContext.Provider>;
}
